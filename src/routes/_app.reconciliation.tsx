import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { StatCard } from "@/components/stat-card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Undo2, Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ExpenseDialog } from "@/components/expense-dialog";

export const Route = createFileRoute("/_app/reconciliation")({ component: ReconciliationPage });

type BankTxn = {
  id: string;
  txn_date: string;
  description: string | null;
  amount: number;
  txn_type: "credit" | "debit";
  match_status: "unmatched" | "matched" | "ignored";
};

type MatchRow = {
  id: string;
  bank_txn_id: string;
  record_type: "invoice" | "bill" | "expense";
  record_id: string;
};

type Candidate = {
  id: string;
  type: "invoice" | "bill" | "expense";
  label: string;       // e.g. INV-1003 / bill_number / expense vendor name
  sub: string;         // client/vendor
  paid?: boolean;
  date: string;
  amount: number;
};

// Minimal CSV parser supporting quoted fields and escaped quotes.
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (field !== "" || cur.length) { cur.push(field); rows.push(cur); cur = []; field = ""; }
        if (c === "\r" && text[i + 1] === "\n") i++;
      } else field += c;
    }
  }
  if (field !== "" || cur.length) { cur.push(field); rows.push(cur); }
  return rows;
}

function parseDateMDY(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return null;
  }
  const [, mo, d, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function parseAmount(s: string): number | null {
  const cleaned = s.replace(/[$,\s+]/g, "");
  const n = Number(cleaned);
  if (isNaN(n)) return null;
  return n;
}

function ReconciliationPage() {
  const qc = useQueryClient();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [matchTxn, setMatchTxn] = React.useState<BankTxn | null>(null);
  const [overlapPrompt, setOverlapPrompt] = React.useState<{
    filename: string; overlap: number; total: number; resolve: (proceed: boolean) => void;
  } | null>(null);

  const { data: txns = [], isLoading } = useQuery({
    queryKey: ["bank_transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_transactions")
        .select("id, txn_date, description, amount, txn_type, match_status")
        .order("txn_date", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as BankTxn[];
    },
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["reconciliation_matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reconciliation_matches")
        .select("id, bank_txn_id, record_type, record_id");
      if (error) throw error;
      return data as MatchRow[];
    },
  });

  // Lookups for displaying match labels: invoice numbers / bill numbers / expense vendor names.
  const linkedIds = React.useMemo(() => {
    const inv: string[] = [], bil: string[] = [], exp: string[] = [];
    for (const m of matches) {
      if (m.record_type === "invoice") inv.push(m.record_id);
      else if (m.record_type === "bill") bil.push(m.record_id);
      else exp.push(m.record_id);
    }
    return { inv, bil, exp };
  }, [matches]);

  const { data: linkedLabels = {} } = useQuery({
    queryKey: ["reconciliation_linked_labels", linkedIds],
    queryFn: async () => {
      const out: Record<string, string> = {};
      if (linkedIds.inv.length) {
        const { data } = await supabase.from("invoices").select("id, invoice_number").in("id", linkedIds.inv);
        data?.forEach((r: any) => { out[`invoice:${r.id}`] = r.invoice_number; });
      }
      if (linkedIds.bil.length) {
        const { data } = await supabase.from("bills").select("id, bill_number").in("id", linkedIds.bil);
        data?.forEach((r: any) => { out[`bill:${r.id}`] = r.bill_number; });
      }
      if (linkedIds.exp.length) {
        const { data } = await supabase.from("expenses").select("id, vendor_name").in("id", linkedIds.exp);
        data?.forEach((r: any) => { out[`expense:${r.id}`] = r.vendor_name || "Expense"; });
      }
      return out;
    },
    enabled: matches.length > 0,
  });

  const matchesByTxn = React.useMemo(() => {
    const m: Record<string, MatchRow[]> = {};
    for (const r of matches) (m[r.bank_txn_id] ||= []).push(r);
    return m;
  }, [matches]);

  const summary = React.useMemo(() => {
    let u = 0, m = 0, i = 0;
    for (const t of txns) {
      if (t.match_status === "matched") m++;
      else if (t.match_status === "ignored") i++;
      else u++;
    }
    return { u, m, i };
  }, [txns]);

  const parseFileToInserts = async (file: File): Promise<any[]> => {
    const text = await file.text();
    const rows = parseCSV(text).filter((r) => r.some((c) => c && c.trim() !== ""));
    if (rows.length < 2) throw new Error(`${file.name}: CSV has no data rows`);
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idx = (name: string) => header.indexOf(name.toLowerCase());
    const iDate = idx("Date");
    const iPayee = idx("Payee");
    const iType = idx("Transaction Type");
    const iRef = idx("Reference");
    const iAmount = idx("Amount");
    if (iDate < 0 || iAmount < 0) throw new Error(`${file.name}: Missing Date or Amount column`);

    const batchId = crypto.randomUUID();
    const inserts: any[] = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const dateRaw = row[iDate]?.trim();
      const amtRaw = row[iAmount]?.trim();
      if (!dateRaw || !amtRaw) continue;
      const txn_date = parseDateMDY(dateRaw);
      const amt = parseAmount(amtRaw);
      if (!txn_date || amt === null) continue;
      const payee = iPayee >= 0 ? (row[iPayee] || "").trim() : "";
      const ref = iRef >= 0 ? (row[iRef] || "").trim() : "";
      const description = ref ? (payee ? `${payee} — ${ref}` : ref) : payee || null;
      const ttRaw = iType >= 0 ? (row[iType] || "").trim().toLowerCase() : "";
      let txn_type: "credit" | "debit";
      if (ttRaw === "receive") txn_type = "credit";
      else if (ttRaw === "spend") txn_type = "debit";
      else txn_type = amt >= 0 ? "credit" : "debit";
      inserts.push({
        txn_date,
        description,
        amount: Math.abs(amt),
        txn_type,
        match_status: "unmatched",
        imported_batch_id: batchId,
      });
    }
    return inserts;
  };

  const checkOverlap = async (inserts: any[]): Promise<{ overlap: number; total: number }> => {
    const total = inserts.length;
    if (!total) return { overlap: 0, total: 0 };
    const dates = Array.from(new Set(inserts.map((r) => r.txn_date)));
    const { data } = await supabase
      .from("bank_transactions")
      .select("txn_date, amount, description")
      .in("txn_date", dates);
    const existing = new Set(
      (data || []).map((r: any) => `${r.txn_date}|${Number(r.amount).toFixed(2)}|${r.description || ""}`),
    );
    let overlap = 0;
    for (const r of inserts) {
      const k = `${r.txn_date}|${Number(r.amount).toFixed(2)}|${r.description || ""}`;
      if (existing.has(k)) overlap++;
    }
    return { overlap, total };
  };

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    let totalImported = 0;
    let skipped = 0;
    try {
      for (const file of Array.from(files)) {
        let inserts: any[] = [];
        try {
          inserts = await parseFileToInserts(file);
        } catch (err: any) {
          toast.error(err?.message || `Failed to parse ${file.name}`);
          continue;
        }
        if (!inserts.length) {
          toast.error(`${file.name}: no valid rows`);
          continue;
        }
        const { overlap, total } = await checkOverlap(inserts);
        if (total > 0 && overlap / total >= 0.5) {
          const proceed = await new Promise<boolean>((resolve) => {
            setOverlapPrompt({ filename: file.name, overlap, total, resolve });
          });
          setOverlapPrompt(null);
          if (!proceed) { skipped++; continue; }
        }
        const { error } = await supabase.from("bank_transactions").insert(inserts);
        if (error) { toast.error(`${file.name}: ${error.message}`); continue; }
        totalImported += inserts.length;
      }
      if (totalImported > 0) {
        toast.success(`Imported ${totalImported} transaction${totalImported === 1 ? "" : "s"} across ${files.length} file${files.length === 1 ? "" : "s"}`);
      } else if (skipped === 0) {
        toast.error("No transactions imported");
      }
      qc.invalidateQueries({ queryKey: ["bank_transactions"] });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["bank_transactions"] });
    qc.invalidateQueries({ queryKey: ["reconciliation_matches"] });
  };

  const setIgnored = async (txn: BankTxn) => {
    const { error } = await supabase
      .from("bank_transactions")
      .update({ match_status: "ignored", matched_to_type: null, matched_to_id: null })
      .eq("id", txn.id);
    if (error) { toast.error(error.message); return; }
    toast.success(txn.txn_type === "credit" ? "Marked as Owner injection" : "Marked as Owner draw");
    invalidateAll();
  };

  const undo = async (txn: BankTxn) => {
    // Fetch the linked records first so we know which to un-reconcile.
    const { data: links, error: linkErr } = await supabase
      .from("reconciliation_matches")
      .select("record_type, record_id")
      .eq("bank_txn_id", txn.id);
    if (linkErr) { toast.error(linkErr.message); return; }

    const { error: delErr } = await supabase
      .from("reconciliation_matches")
      .delete()
      .eq("bank_txn_id", txn.id);
    if (delErr) { toast.error(delErr.message); return; }

    // Clear reconciled_at on every record that was linked (paid status untouched).
    const byType: Record<string, string[]> = { invoice: [], bill: [], expense: [] };
    for (const l of links || []) byType[l.record_type]?.push(l.record_id);
    const tableFor = { invoice: "invoices", bill: "bills", expense: "expenses" } as const;
    for (const t of ["invoice", "bill", "expense"] as const) {
      if (byType[t].length) {
        const { error } = await supabase
          .from(tableFor[t])
          .update({ reconciled_at: null })
          .in("id", byType[t]);
        if (error) { toast.error(error.message); return; }
      }
    }

    const { error } = await supabase
      .from("bank_transactions")
      .update({ match_status: "unmatched", matched_to_type: null, matched_to_id: null })
      .eq("id", txn.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Reverted to unmatched");
    invalidateAll();
  };


  return (
    <PageContainer>
      <PageHeader
        title="Reconciliation"
        description="Upload your bank statement and match transactions to your records."
        action={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              multiple
              className="hidden"
              onChange={(e) => { const fs = e.target.files; if (fs && fs.length) handleFiles(fs); }}
            />
            <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Uploading…" : "Upload bank statement (CSV)"}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <StatCard label="Unmatched" value={String(summary.u)} tone="warning" />
        <StatCard label="Matched" value={String(summary.m)} tone="success" />
        <StatCard label="Ignored" value={String(summary.i)} />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">Loading…</div>
          ) : txns.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No transactions yet — upload a bank statement to begin.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txns.map((t) => {
                  const isCredit = t.txn_type === "credit";
                  const sign = isCredit ? "+" : "−";
                  const ms = matchesByTxn[t.id] || [];

                  let statusDetail: React.ReactNode = null;
                  if (t.match_status === "matched") {
                    if (ms.length === 1) {
                      const k = `${ms[0].record_type}:${ms[0].record_id}`;
                      statusDetail = `Matched to ${linkedLabels[k] || "record"}`;
                    } else if (ms.length > 1) {
                      const allInv = ms.every((x) => x.record_type === "invoice");
                      if (allInv && ms.length <= 4) {
                        statusDetail = `Matched to ${ms.map((x) => linkedLabels[`invoice:${x.record_id}`] || "INV").join(", ")}`;
                      } else {
                        statusDetail = `Matched to ${ms.length} records`;
                      }
                    } else {
                      statusDetail = "Matched";
                    }
                  } else if (t.match_status === "ignored") {
                    statusDetail = isCredit ? "Owner injection" : "Owner draw";
                  }

                  return (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(t.txn_date)}</TableCell>
                      <TableCell className="max-w-[360px] truncate">{t.description || "—"}</TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium tabular-nums",
                          isCredit ? "text-success" : "text-destructive/80",
                        )}
                      >
                        {sign}
                        {formatCurrency(Number(t.amount))}
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">{t.txn_type}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <StatusBadge status={t.match_status} />
                          {statusDetail && (
                            <span className="text-xs text-muted-foreground">{statusDetail}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {t.match_status === "unmatched" ? (
                            <>
                              <Button size="sm" onClick={() => setMatchTxn(t)}>Match</Button>
                              <Button size="sm" variant="outline" onClick={() => setIgnored(t)}>
                                {isCredit ? "Owner injection" : "Owner draw"}
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => undo(t)}>
                              <Undo2 className="h-3.5 w-3.5 mr-1" />
                              Undo
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <MatchDialog
        txn={matchTxn}
        onClose={() => setMatchTxn(null)}
        onMatched={() => { setMatchTxn(null); invalidateAll(); }}
      />

      <Dialog open={!!overlapPrompt} onOpenChange={(v) => { if (!v && overlapPrompt) { overlapPrompt.resolve(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Possible duplicate import</DialogTitle>
            <DialogDescription>
              {overlapPrompt && (
                <>
                  <span className="font-medium">{overlapPrompt.filename}</span> looks like it may
                  already have been imported ({overlapPrompt.overlap} of {overlapPrompt.total} rows
                  match existing transactions). Import anyway?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => overlapPrompt?.resolve(false)}>Cancel</Button>
            <Button onClick={() => overlapPrompt?.resolve(true)}>Proceed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function MatchDialog({
  txn, onClose, onMatched,
}: {
  txn: BankTxn | null;
  onClose: () => void;
  onMatched: () => void;
}) {
  const open = !!txn;
  const isCredit = txn?.txn_type === "credit";
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);
  const [addingExpense, setAddingExpense] = React.useState(false);

  React.useEffect(() => { setSelected(new Set()); setAddingExpense(false); }, [txn?.id]);

  const onNewExpenseSaved = async (newId: string) => {
    if (!txn) return;
    try {
      const bankRef = txn.description || null;
      const { error: insErr } = await supabase.from("reconciliation_matches").insert({
        bank_txn_id: txn.id, record_type: "expense", record_id: newId, bank_reference: bankRef,
      });
      if (insErr) throw insErr;
      const { error: recErr } = await supabase
        .from("expenses")
        .update({ reconciled_at: new Date().toISOString() })
        .eq("id", newId);
      if (recErr) throw recErr;
      const { error: updErr } = await supabase
        .from("bank_transactions")
        .update({ match_status: "matched" })
        .eq("id", txn.id);
      if (updErr) throw updErr;
      toast.success("Matched to new expense");
      onMatched();
    } catch (e: any) {
      toast.error(e?.message || "Failed to auto-match new expense");
    }
  };

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["match_candidates", txn?.id, isCredit],
    queryFn: async (): Promise<Candidate[]> => {
      if (!txn) return [];
      if (isCredit) {
        const { data, error } = await supabase
          .from("invoices")
          .select("id, invoice_number, issue_date, total, status, client:clients(company_name)")
          .is("reconciled_at", null)
          .order("issue_date", { ascending: false });
        if (error) throw error;
        return (data || []).map((r: any) => ({
          id: r.id,
          type: "invoice",
          label: r.invoice_number,
          sub: r.client?.company_name || "—",
          paid: r.status === "paid",
          date: r.issue_date,
          amount: Number(r.total),
        }));
      } else {
        const [bills, expenses] = await Promise.all([
          supabase
            .from("bills")
            .select("id, bill_number, bill_date, total, status, vendor:vendors(company_name)")
            .is("reconciled_at", null)
            .order("bill_date", { ascending: false }),
          supabase
            .from("expenses")
            .select("id, vendor_name, expense_date, amount")
            .is("reconciled_at", null)
            .order("expense_date", { ascending: false }),
        ]);
        if (bills.error) throw bills.error;
        if (expenses.error) throw expenses.error;
        const b: Candidate[] = (bills.data || []).map((r: any) => ({
          id: r.id, type: "bill", label: r.bill_number,
          sub: r.vendor?.company_name || "—", paid: r.status === "paid",
          date: r.bill_date, amount: Number(r.total),
        }));
        const e: Candidate[] = (expenses.data || []).map((r: any) => ({
          id: r.id, type: "expense", label: r.vendor_name || "Expense",
          sub: "Expense",
          date: r.expense_date, amount: Number(r.amount),
        }));
        return [...b, ...e].sort((a, z) => z.date.localeCompare(a.date));
      }

    },
    enabled: open,
  });

  const selectedTotal = React.useMemo(() => {
    let sum = 0;
    for (const c of candidates) {
      if (selected.has(`${c.type}:${c.id}`)) sum += c.amount;
    }
    return sum;
  }, [selected, candidates]);

  const bankAmount = Number(txn?.amount || 0);
  const diff = +(bankAmount - selectedTotal).toFixed(2);
  const matches = Math.abs(diff) < 0.005 && selected.size > 0;

  const confirm = async () => {
    if (!txn || selected.size === 0) return;
    setSaving(true);
    try {
      const bankRef = txn.description || null;
      const chosen = candidates.filter((c) => selected.has(`${c.type}:${c.id}`));
      const rows = chosen.map((c) => ({
        bank_txn_id: txn.id,
        record_type: c.type,
        record_id: c.id,
        bank_reference: bankRef,
      }));
      const { error: insErr } = await supabase.from("reconciliation_matches").insert(rows);
      if (insErr) throw insErr;

      // Stamp reconciled_at on each linked record (grouped by table).
      const nowIso = new Date().toISOString();
      const byType: Record<string, string[]> = { invoice: [], bill: [], expense: [] };
      for (const c of chosen) byType[c.type].push(c.id);
      const tableFor = { invoice: "invoices", bill: "bills", expense: "expenses" } as const;
      for (const t of ["invoice", "bill", "expense"] as const) {
        if (byType[t].length) {
          const { error } = await supabase
            .from(tableFor[t])
            .update({ reconciled_at: nowIso })
            .in("id", byType[t]);
          if (error) throw error;
        }
      }

      const { error: updErr } = await supabase
        .from("bank_transactions")
        .update({ match_status: "matched" })
        .eq("id", txn.id);
      if (updErr) throw updErr;
      toast.success(`Matched to ${rows.length} record${rows.length === 1 ? "" : "s"}`);
      onMatched();
    } catch (e: any) {
      toast.error(e?.message || "Failed to confirm match");
    } finally {
      setSaving(false);
    }
  };


  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Match bank transaction</DialogTitle>
          <DialogDescription>
            {txn && (
              <span>
                {formatDate(txn.txn_date)} · {txn.description || "—"} ·{" "}
                <span className={cn("font-medium", isCredit ? "text-success" : "text-destructive/80")}>
                  {isCredit ? "+" : "−"}{formatCurrency(bankAmount)}
                </span>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          <div>
            <span className="text-muted-foreground">Selected: </span>
            <span className="font-medium tabular-nums">{formatCurrency(selectedTotal)}</span>
            <span className="text-muted-foreground"> / Bank: </span>
            <span className="font-medium tabular-nums">{formatCurrency(bankAmount)}</span>
          </div>
          {selected.size === 0 ? (
            <span className="text-xs text-muted-foreground">Select records to match</span>
          ) : matches ? (
            <span className="text-xs font-medium text-success">Matches ✓</span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Difference: {formatCurrency(Math.abs(diff))}
            </span>
          )}
        </div>

        <div className="max-h-[420px] overflow-y-auto -mx-1">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : candidates.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No unreconciled {isCredit ? "invoices" : "bills or expenses"} found.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {candidates.map((c) => {
                const key = `${c.type}:${c.id}`;
                const checked = selected.has(key);
                return (
                  <li key={key}>
                    <label className="flex items-center gap-3 px-2 py-2 cursor-pointer hover:bg-accent/40 rounded">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (v) next.add(key); else next.delete(key);
                            return next;
                          });
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{c.label}</span>
                          {!isCredit && (
                            <span className="text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-muted text-muted-foreground">
                              {c.type}
                            </span>
                          )}
                          {c.paid !== undefined && (
                            <span
                              className={cn(
                                "text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 border",
                                c.paid
                                  ? "bg-success/15 text-success border-success/30"
                                  : "bg-warning/15 text-warning border-warning/30",
                              )}
                            >
                              {c.paid ? "paid" : "unpaid"}
                            </span>
                          )}

                        </div>

                        <div className="text-xs text-muted-foreground truncate">
                          {c.sub} · {formatDate(c.date)}
                        </div>
                      </div>
                      <div className="font-medium tabular-nums">{formatCurrency(c.amount)}</div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {!isCredit && (
          <div className="border-t border-border pt-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setAddingExpense(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add as new expense
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={confirm} disabled={saving || selected.size === 0}>
            {saving ? "Saving…" : "Confirm match"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {txn && !isCredit && (
        <ExpenseDialog
          open={addingExpense}
          onOpenChange={setAddingExpense}
          prefill={{
            expense_date: txn.txn_date,
            amount: Number(txn.amount),
            vendor_name: txn.description || "",
            notes: txn.description || "",
          }}
          onSaved={onNewExpenseSaved}
        />
      )}
    </Dialog>
  );
}
