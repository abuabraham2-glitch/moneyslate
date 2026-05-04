import { supabase } from "@/integrations/supabase/client";

type DocumentKind = "invoice" | "po" | "bill";

const rpcByKind = {
  invoice: "get_next_invoice_number",
  po: "get_next_po_number",
  bill: "get_next_bill_number",
} as const;

const settingsColumnByKind = {
  invoice: "next_invoice_number",
  po: "next_po_number",
  bill: "next_bill_number",
} as const;

const prefixByKind = {
  invoice: "INV",
  po: "PO",
  bill: "BILL",
} as const;

export async function getNextDocumentNumber(kind: DocumentKind): Promise<string> {
  const { data, error } = await supabase.rpc(rpcByKind[kind]);
  if (!error && typeof data === "string" && data.trim()) return data;

  const column = settingsColumnByKind[kind];
  const { data: settings, error: settingsError } = await supabase
    .from("settings")
    .select(`id, ${column}`)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (settingsError) throw settingsError;

  const nextNumber = Number((settings as any)?.[column]);
  if (!settings?.id || !Number.isFinite(nextNumber)) {
    throw error ?? new Error("Unable to assign a document number.");
  }

  const { error: updateError } = await supabase
    .from("settings")
    .update({ [column]: nextNumber + 1 })
    .eq("id", settings.id);

  if (updateError) throw updateError;

  return `${prefixByKind[kind]}-${nextNumber}`;
}