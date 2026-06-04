import { supabase } from "@/integrations/supabase/client";

export async function cleanupMatchesForRecord(recordType: "invoice" | "bill" | "expense", recordId: string) {
  const { data: rows } = await supabase
    .from("reconciliation_matches")
    .select("id, bank_txn_id")
    .eq("record_type", recordType)
    .eq("record_id", recordId);
  const bankIds = Array.from(new Set((rows || []).map((r: any) => r.bank_txn_id)));
  if (rows && rows.length) {
    await supabase
      .from("reconciliation_matches")
      .delete()
      .eq("record_type", recordType)
      .eq("record_id", recordId);
  }
  for (const b of bankIds) {
    const { count } = await supabase
      .from("reconciliation_matches")
      .select("id", { count: "exact", head: true })
      .eq("bank_txn_id", b);
    if (!count) {
      await supabase.from("bank_transactions").update({ match_status: "unmatched" }).eq("id", b);
    }
  }
}
