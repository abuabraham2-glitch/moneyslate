import { supabase } from "@/integrations/supabase/client";

export type InvoiceDocumentRecord = Awaited<ReturnType<typeof fetchInvoiceDocument>>;
export type PODocumentRecord = Awaited<ReturnType<typeof fetchPODocument>>;

export async function fetchInvoiceDocument(id: string) {
  const [{ data: invoice, error: invoiceError }, { data: lines, error: linesError }, { data: settings, error: settingsError }] = await Promise.all([
    supabase.from("invoices").select("*, client:clients(*)").eq("id", id).single(),
    supabase
      .from("invoice_line_items")
      .select("*, product:products_services(name)")
      .eq("invoice_id", id)
      .order("sort_order"),
    supabase.from("settings").select("*").limit(1).single(),
  ]);

  if (invoiceError) throw invoiceError;
  if (linesError) throw linesError;
  if (settingsError) throw settingsError;

  return { invoice, lines: lines || [], settings };
}

export async function fetchPODocument(id: string) {
  const [{ data: po, error: poError }, { data: lines, error: linesError }, { data: settings, error: settingsError }] = await Promise.all([
    supabase.from("purchase_orders").select("*, vendor:vendors(*)").eq("id", id).single(),
    supabase
      .from("po_line_items")
      .select("*, product:products_services(name)")
      .eq("po_id", id)
      .order("sort_order"),
    supabase.from("settings").select("*").limit(1).single(),
  ]);

  if (poError) throw poError;
  if (linesError) throw linesError;
  if (settingsError) throw settingsError;

  return { po, lines: lines || [], settings };
}

export async function fetchBillDocument(id: string) {
  const [{ data: bill, error: billError }, { data: lines, error: linesError }, { data: settings, error: settingsError }] = await Promise.all([
    supabase.from("bills").select("*, vendor:vendors(*)").eq("id", id).single(),
    supabase
      .from("bill_line_items")
      .select("*, product:products_services(name)")
      .eq("bill_id", id)
      .order("sort_order"),
    supabase.from("settings").select("*").limit(1).single(),
  ]);

  if (billError) throw billError;
  if (linesError) throw linesError;
  if (settingsError) throw settingsError;

  return { bill, lines: lines || [], settings };
}