import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
  "Content-Type": "application/json",
};

const ok = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const err = (msg: string, status = 400) => ok({ success: false, error: msg }, status);

// Read-only endpoint. Command Center calls this to check whether an invoice
// has been paid in Money Slate. Lookup is by invoice_number (which matches the
// number Command Center stores on the order as invoice_num).
export const Route = createFileRoute("/api/invoice-status")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        const apiKey = request.headers.get("x-api-key");
        if (!apiKey) return err("Missing X-API-Key header", 401);

        const { data: settings } = await supabaseAdmin
          .from("settings")
          .select("command_center_api_key")
          .limit(1)
          .single();
        if (!settings || settings.command_center_api_key !== apiKey) return err("Invalid API key", 401);

        const url = new URL(request.url);
        const invoiceNumber = (url.searchParams.get("invoice_number") || "").trim();
        if (!invoiceNumber) return err("invoice_number query parameter is required", 400);

        const { data: invoice, error } = await supabaseAdmin
          .from("invoices")
          .select("invoice_number, status, date_paid")
          .eq("invoice_number", invoiceNumber)
          .maybeSingle();
        if (error) return err(error.message, 500);
        if (!invoice) return err("Invoice not found", 404);

        return ok({
          success: true,
          invoice_number: invoice.invoice_number,
          paid: invoice.status === "paid",
          status: invoice.status,
          date_paid: invoice.date_paid,
        });
      },
    },
  },
});
