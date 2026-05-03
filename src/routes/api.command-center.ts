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

            const { data: numRow } = await supabaseAdmin.rpc("get_next_invoice_number");
            const invoice_number = numRow as unknown as string;

            const lines = (body.line_items || []) as any[];
            const subtotal = lines.reduce((s, l) => s + Number(l.line_total ?? l.quantity * l.unit_price), 0);

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

            if (lines.length) {
              await supabaseAdmin.from("invoice_line_items").insert(lines.map((l, i) => ({
                invoice_id: inv.id,
                description: l.description,
                quantity: l.quantity,
                unit_price: l.unit_price,
                line_total: l.line_total ?? l.quantity * l.unit_price,
                sort_order: i,
              })));
            }
            return ok({ success: true, id: inv.id, invoice_number: inv.invoice_number });
          }

          if (action === "create_vendor_po") {
            const { data: vendor } = await supabaseAdmin.from("vendors").select("id").eq("external_id", body.vendor_external_id).maybeSingle();
            if (!vendor) return err("Vendor not found", 404);

            const { data: numRow } = await supabaseAdmin.rpc("get_next_po_number");
            const po_number = numRow as unknown as string;

            const lines = (body.line_items || []) as any[];
            const subtotal = lines.reduce((s, l) => s + Number(l.line_total ?? l.quantity * l.unit_cost), 0);

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

            if (lines.length) {
              await supabaseAdmin.from("po_line_items").insert(lines.map((l, i) => ({
                po_id: po.id,
                description: l.description,
                quantity: l.quantity,
                unit_cost: l.unit_cost,
                line_total: l.line_total ?? l.quantity * l.unit_cost,
                sort_order: i,
              })));
            }
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
