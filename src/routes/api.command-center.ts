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

const PRINT = "Print";
const SHARED_PRODUCTS = ["Setup Charge", "Screen", "Screen Change", "Film"] as const;
const ALL_PRODUCTS = [PRINT, ...SHARED_PRODUCTS] as const;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

type BuiltLine = {
  product_service_id: string;
  description: string | null;
  quantity: number;
  rate: number;
  line_total: number;
  sort_order: number;
};

type OrderItem = {
  item_name?: string | null;
  bottle_size?: string | null;
  bottle_color?: string | null;
  material?: string | null;
  bottle_type?: string | null;
  num_colors?: number | string | null;
  quantity?: number | string | null;
};

// Build the two-line Print description from an item's component fields.
// PO includes the client name on line 1; invoice does not.
function buildItemDescription(item: OrderItem, includeClient: boolean, clientName?: string | null): string {
  const detailParts = [item.bottle_size, item.bottle_color, item.material, item.bottle_type]
    .map((v) => (v == null ? "" : String(v).trim()))
    .filter(Boolean);
  let detail = detailParts.join(" ");
  const n = Number(item.num_colors);
  if (Number.isFinite(n) && n > 0) {
    detail = detail ? `${detail} - ${n} color print` : `${n} color print`;
  }
  const itemName = item.item_name == null ? "" : String(item.item_name).trim();
  const line1 = includeClient && clientName ? `${clientName} - ${itemName}` : itemName;
  return [line1, detail].filter(Boolean).join("\n");
}

// Normalize payload into an items array. New shape: body.items[]. Legacy shape:
// single line_description + order_quantity + num_colors -> wrapped as one item.
function getItems(body: any): { items: OrderItem[]; legacy: boolean } {
  if (Array.isArray(body.items) && body.items.length > 0) {
    return { items: body.items as OrderItem[], legacy: false };
  }
  return {
    items: [
      {
        item_name: body.line_description ?? "",
        num_colors: body.num_colors,
        quantity: body.order_quantity,
      },
    ],
    legacy: true,
  };
}

/**
 * Build all line items: one Print line per order item, then the 4 shared charge
 * lines (Setup Charge, Screen, Screen Change, Film) once, each qty 1.
 * rateField: "default_price" (invoice) or "default_cost" (PO).
 * forcePrintRateZero: true for invoices (Print price filled manually).
 * includeClient: true for PO (client name prefixes the Print line), false for invoice.
 * legacy: when true, Print description is the raw line_description verbatim (old behavior).
 */
async function buildLines(opts: {
  body: any;
  rateField: "default_price" | "default_cost";
  forcePrintRateZero: boolean;
  includeClient: boolean;
}): Promise<{ lines?: BuiltLine[]; error?: string }> {
  const { data: products, error: prodErr } = await supabaseAdmin
    .from("products_services")
    .select("id, name, default_price, default_cost")
    .in("name", ALL_PRODUCTS as unknown as string[]);
  if (prodErr) return { error: prodErr.message };

  const byName = new Map<string, any>();
  for (const p of products || []) byName.set(p.name, p);
  for (const name of ALL_PRODUCTS) {
    if (!byName.has(name)) return { error: `Product not found in Products & Services: ${name}` };
  }

  const rateOf = (name: string) => Number(byName.get(name)[opts.rateField] ?? 0) || 0;

  const { items, legacy } = getItems(opts.body);
  const clientName = opts.body.client_company_name ?? null;

  const lines: BuiltLine[] = [];
  let sort = 0;

  // One Print line per item.
  const printProduct = byName.get(PRINT);
  for (const item of items) {
    const qtyRaw = Number(item.quantity);
    const quantity = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : (legacy ? (Number(opts.body.order_quantity) || 1) : 0);
    const description = legacy
      ? (opts.body.line_description ?? null)
      : buildItemDescription(item, opts.includeClient, clientName);
    let rate = rateOf(PRINT);
    if (opts.forcePrintRateZero) rate = 0;
    lines.push({
      product_service_id: printProduct.id,
      description,
      quantity,
      rate,
      line_total: round2(quantity * rate),
      sort_order: sort++,
    });
  }

  // Shared charge lines: each qty 1, appended once.
  for (const name of SHARED_PRODUCTS) {
    const p = byName.get(name);
    const rate = rateOf(name);
    const quantity = 1;
    lines.push({
      product_service_id: p.id,
      description: null,
      quantity,
      rate,
      line_total: round2(quantity * rate),
      sort_order: sort++,
    });
  }

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
            if (typeof body.archived === "boolean") {
              payload.archived = body.archived;
            }
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

            const built = await buildLines({
              body,
              rateField: "default_price",
              forcePrintRateZero: true,
              includeClient: false,
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

            const built = await buildLines({
              body,
              rateField: "default_cost",
              forcePrintRateZero: false,
              includeClient: true,
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
