import { supabase } from "@/integrations/supabase/client";

type DocumentKind = "invoice" | "po" | "internal_po";

const rpcByKind = {
  invoice: "get_next_invoice_number",
  po: "get_next_po_number",
  internal_po: "get_next_internal_po_number",
} as const;

const settingsColumnByKind = {
  invoice: "next_invoice_number",
  po: "next_po_number",
  internal_po: "next_internal_po_number",
} as const;

const prefixByKind = {
  invoice: "INV",
  po: "PO",
  internal_po: "",
} as const;

export async function getNextDocumentNumber(kind: DocumentKind): Promise<string> {
  const { data, error } = await supabase.rpc(rpcByKind[kind] as any);
  if (!error && typeof data === "string" && data.trim()) return data;

  const column = settingsColumnByKind[kind];
  const { data: settings, error: settingsError } = await supabase
    .from("settings")
    .select(`id, ${column}`)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (settingsError) throw settingsError;

  const settingsRow = settings as any;
  const nextNumber = Number(settingsRow?.[column]);
  if (!settingsRow?.id || !Number.isFinite(nextNumber)) {
    throw error ?? new Error("Unable to assign a document number.");
  }

  const { error: updateError } = await supabase
    .from("settings")
    .update({ [column]: nextNumber + 1 } as any)
    .eq("id", settingsRow.id);

  if (updateError) throw updateError;

  const prefix = prefixByKind[kind];
  return prefix ? `${prefix}-${nextNumber}` : String(nextNumber);
}
