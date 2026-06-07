import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
  "Content-Type": "application/json",
};

const ok = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const err = (msg: string, status = 400) => ok({ success: false, error: msg }, status);

const STANDARD_PRODUCTS = ["Print", "Setup Charge", "Screen Change", "Film", "Screen"] as const;
type StandardProduct = (typeof STANDARD_PRODUCTS)[number];

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

type BuiltLine = {
  product_service_id: string;
  description: string | null;
  quantity: number;
  rate: number;
  line_total: number;
  sort_order: number;
};

/**
 * Build the 5 standard lines for an invoice or PO.
 * - rateField: "default_price" for invoices, "default_cost" for POs.
 * - For invoices, the Print line's rate is forced to 0 (caller fills in manually).
 * Returns { lines } on success, or { error } if any product name is missing.
 */
async function buildStandardLines(opts: {
  rateField: "default_price" | "default_cost";
  orderQuantity: number;
  numColors: number;
  lineDescription: string | null;
  forcePrintRateZero: boolean;
}): Promise<{ lines?: BuiltLine[]; error?: string }> {
  const { data: products, error: prodErr } = await supabaseAdmin
    .from("products_services")
    .select("id, name, default_price, default_cost")
    .in("name", STANDARD_PRODUCTS as unknown as string[]);
  if (prodErr) return { error: prodErr.message };

  const byName = new Map<string, any>();
  for (const p of products || []) byName.set(p.name, p);

  for (const name of STANDARD_PRODUCTS) {
    if (!byName.has(name)) {
      return { error: `Product not found in Products & Services: ${name}` };
    }
  }

  const printQty = Number.isFinite(opts.orderQuantity) && opts.orderQuantity > 0 ? opts.orderQuantity : 1;
  const screenChangeQty = Math.max(0, opts.numColors - 1);

  const qtyByName: Record<StandardProduct, number> = {
    "Print": printQty,
    "Setup Charge": 1,
    "Screen Change": screenChangeQty,
    "Film": 0,
    "Screen": 0,
  };

  const lines: BuiltLine[] = STANDARD_PRODUCTS.map((name, i) => {
    const p = byName.get(name);
    let rate = Number(p[opts.rateField] ?? 0) || 0;
    if (opts.forcePrintRateZero && name === "Print") rate = 0;
    const quantity = qtyByName[name];
    const line_total = round2(quantity * rate);
    return {
      product_service_id: p.id,
      description: name === "Print" ? (opts.lineDescription ?? null) : null,
      quantity,
      rate,
      line_total,
      sort_order: i,
    };
  });

  return { lines };
}

export const Route = createFileRoute("/api/command-center")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        const apiKey = request.headers.get("x-api-key");
        if (!apiKey) return err("Missing X-API-Key header", 401);

        const { data: settings } = await supabaseAdmin.from("settings").select("command_center_api_key").limit(1).single();
        if (!settings || settings.command_center_api_key !== apiKey) return err("Invalid API key", 401);

        let body: any;
        try { body = await request.json(); } catch { return err("Invalid JSON body"); }

        const { action } = body || {};
        if (!action) return err("Missing 'action'");

        try {
          if (action === "create_customer") {
            const payload: any = {
              external_id: body.external_id,
              company_name: body.company_name,
              contact_name: body.contact_name,
              contact_email: body.contact_email,
              contact_phone: body.contact_phone,
              billing_street: body.billing_address?.street,
              billing_city: body.billing_address?.city,
              billing_state: body.billing_address?.state,
              billing_zip: body.billing_address?.zip,
              shipping_street: body.shipping_address?.street,
              shipping_city: body.shipping_address?.city,
              shipping_state: body.shipping_address?.state,
              shipping_zip: body.shipping_address?.zip,
              ap_contact_name: body.ap_contact?.name,
              ap_contact_email: body.ap_contact?.email,
              ap_contact_phone: body.ap_contact?.phone,
              payment_terms: body.payment_terms || "Net 30",
            };
            if (!payload.company_name || !payload.external_id) return err("company_name and external_id required");

            const { data: existing } = await supabaseAdmin.from("clients").select("id").eq("external_id", payload.external_id).maybeSingle();
            if (existing) {
              const { data, error } = await supabaseAdmin.from("clients").update(payload).eq("id", existing.id).select().single();
              if (error) return err(error.message, 500);
              return ok({ success: true, id: data.id, action: "updated" });
            } else {
              const { data, error } = await supabaseAdmin.from("clients").insert(payload).select().single();
              if (error) return err(error.message, 500);
              return ok({ success: true, id: data.id, action: "created" });
            }
          }

          if (action === "create_invoice") {
            const { data: client } = await supabaseAdmin.from("clients").select("id").eq("external_id", body.client_external_id).maybeSingle();
            if (!client) return err("Client not found", 404);

            const orderQuantity = Number(body.order_quantity ?? 1) || 1;
            const numColorsRaw = Number(body.num_colors);
            const numColors = Number.isFinite(numColorsRaw) && numColorsRaw > 0 ? numColorsRaw : 1;

            const built = await buildStandardLines({
              rateField: "default_price",
              orderQuantity,
              numColors,
              lineDescription: body.line_description ?? null,
              forcePrintRateZero: true,
            });
            if (built.error || !built.lines) return err(built.error || "Failed to build line items", 500);

            const subtotal = round2(built.lines.reduce((s, l) => s + l.line_total, 0));

            const { data: numRow } = await supabaseAdmin.rpc("get_next_invoice_number");
            const invoice_number = numRow as unknown as string;

            const { data: inv, error } = await supabaseAdmin.from("invoices").insert({
              invoice_number,
              client_id: client.id,
              client_po_number: body.client_po_number,
              due_date: body.due_date,
              payment_terms: body.payment_terms,
              subtotal,
              total: subtotal,
              status: "draft",
            }).select().single();
            if (error) return err(error.message, 500);

            const { error: liErr } = await supabaseAdmin.from("invoice_line_items").insert(
              built.lines.map((l) => ({
                invoice_id: inv.id,
                product_service_id: l.product_service_id,
                description: l.description,
                quantity: l.quantity,
                unit_price: l.rate,
                line_total: l.line_total,
                sort_order: l.sort_order,
              }))
            );
            if (liErr) return err(liErr.message, 500);

            return ok({ success: true, id: inv.id, invoice_number: inv.invoice_number });
          }

          if (action === "create_vendor_po") {
            const { data: vendor } = await supabaseAdmin.from("vendors").select("id").eq("external_id", body.vendor_external_id).maybeSingle();
            if (!vendor) return err("Vendor not found", 404);

            const orderQuantity = Number(body.order_quantity ?? 1) || 1;
            const numColorsRaw = Number(body.num_colors);
            const numColors = Number.isFinite(numColorsRaw) && numColorsRaw > 0 ? numColorsRaw : 1;

            const built = await buildStandardLines({
              rateField: "default_cost",
              orderQuantity,
              numColors,
              lineDescription: body.line_description ?? null,
              forcePrintRateZero: false,
            });
            if (built.error || !built.lines) return err(built.error || "Failed to build line items", 500);

            const subtotal = round2(built.lines.reduce((s, l) => s + l.line_total, 0));

            const { data: numRow } = await supabaseAdmin.rpc("get_next_po_number");
            const po_number = numRow as unknown as string;

            const { data: po, error } = await supabaseAdmin.from("purchase_orders").insert({
              po_number,
              vendor_id: vendor.id,
              internal_po_number: body.internal_po_number,
              expected_delivery_date: body.expected_delivery_date,
              ship_to_name: body.ship_to?.name,
              ship_to_street: body.ship_to?.street,
              ship_to_city: body.ship_to?.city,
              ship_to_state: body.ship_to?.state,
              ship_to_zip: body.ship_to?.zip,
              subtotal,
              total: subtotal,
              status: "draft",
            }).select().single();
            if (error) return err(error.message, 500);

            const { error: liErr } = await supabaseAdmin.from("po_line_items").insert(
              built.lines.map((l) => ({
                po_id: po.id,
                product_service_id: l.product_service_id,
                description: l.description,
                quantity: l.quantity,
                unit_cost: l.rate,
                line_total: l.line_total,
                sort_order: l.sort_order,
              }))
            );
            if (liErr) return err(liErr.message, 500);

            return ok({ success: true, id: po.id, po_number: po.po_number });
          }

          return err(`Unknown action: ${action}`);
        } catch (e: any) {
          return err(e?.message || "Internal error", 500);
        }
      },
    },
  },
});
