import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/reconciliation")({ component: ReconciliationPage });

type BankTxn = {
  id: string;
  txn_date: string;
  description: string | null;
  amount: number;
  txn_type: "credit" | "debit";
  match_status: "unmatched" | "matched" | "ignored";
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

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text).filter((r) => r.some((c) => c && c.trim() !== ""));
      if (rows.length < 2) throw new Error("CSV has no data rows");
      const header = rows[0].map((h) => h.trim().toLowerCase());
      const idx = (name: string) => header.indexOf(name.toLowerCase());
      const iDate = idx("Date");
      const iPayee = idx("Payee");
      const iType = idx("Transaction Type");
      const iRef = idx("Reference");
      const iAmount = idx("Amount");
      if (iDate < 0 || iAmount < 0) throw new Error("Missing required Date or Amount column");

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
      if (!inserts.length) throw new Error("No valid rows found");
      const { error } = await supabase.from("bank_transactions").insert(inserts);
      if (error) throw error;
      toast.success(`Imported ${inserts.length} transaction${inserts.length === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["bank_transactions"] });
    } catch (e: any) {
      toast.error(e?.message || "Failed to parse CSV");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
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
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Uploading…" : "Upload bank statement (CSV)"}
            </Button>
          </>
        }
      />
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {txns.map((t) => {
                  const isCredit = t.txn_type === "credit";
                  const sign = isCredit ? "+" : "−";
                  const formatted = new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(Number(t.amount));
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(t.txn_date)}</TableCell>
                      <TableCell className="max-w-[480px] truncate">{t.description || "—"}</TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium tabular-nums",
                          isCredit ? "text-success" : "text-destructive/80",
                        )}
                      >
                        {sign}
                        {formatted}
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">{t.txn_type}</TableCell>
                      <TableCell><StatusBadge status={t.match_status} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
