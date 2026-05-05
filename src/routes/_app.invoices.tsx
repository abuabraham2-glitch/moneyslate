import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Search, MoreHorizontal, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { InvoiceDialog } from "@/components/invoice-dialog";
import { MemoCell } from "@/components/memo-cell";
import { MarkPaidDialog } from "@/components/mark-paid-dialog";
import { generatePDF } from "@/lib/pdf";
import { logActivity } from "@/lib/activity";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/invoices")({ component: InvoicesPage });

type SortKey = "name" | "due_date" | "total" | "status";

function InvoicesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("due_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("*, client:clients(id,company_name)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    const list = (data || []).filter((r: any) =>
      r.invoice_number.toLowerCase().includes(s) ||
      (r.client?.company_name || "").toLowerCase().includes(s)
    );
    const dir = sortDir === "asc" ? 1 : -1;
    const get = (r: any) => {
      switch (sortKey) {
        case "name": return (r.client?.company_name || "").toLowerCase();
        case "due_date": return r.due_date || "";
        case "total": return Number(r.total || 0);
        case "status": return r.status || "";
      }
    };
    return [...list].sort((a, b) => {
      const av = get(a), bv = get(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [data, search, sortKey, sortDir]);

  const markPaid = async (id: string, info: { date_paid: string; payment_method: string; payment_notes?: string }) => {
    const { error } = await supabase.from("invoices").update({ status: "paid", ...info }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logActivity("paid", "invoice", id, "Marked invoice paid");
    qc.invalidateQueries({ queryKey: ["invoices"] });
    toast.success("Marked paid");
  };

  const downloadPdf = async (id: string) => {
    const { data: inv } = await supabase.from("invoices").select("*, client:clients(*)").eq("id", id).single();
    const { data: lines } = await supabase.from("invoice_line_items").select("*").eq("invoice_id", id).order("sort_order");
    const { data: settings } = await supabase.from("settings").select("*").limit(1).single();
    if (!inv) return;
    const c = inv.client;
    const pdf = generatePDF({
      type: "invoice", number: inv.invoice_number, issue_date: inv.issue_date, due_date: inv.due_date || undefined,
      client_po_number: inv.client_po_number || undefined, payment_terms: inv.payment_terms || undefined, notes: inv.notes || undefined,
      subtotal: Number(inv.subtotal), tax_amount: Number(inv.tax_amount), total: Number(inv.total),
      paidStamp: inv.status === "paid",
      party: {
        name: c?.company_name || "", contact: c?.contact_name ?? undefined, email: c?.contact_email ?? undefined, phone: c?.contact_phone ?? undefined,
        street: c?.billing_street ?? undefined, city: c?.billing_city ?? undefined, state: c?.billing_state ?? undefined, zip: c?.billing_zip ?? undefined,
      },
      lines: (lines || []).map((l: any) => ({ description: l.description, quantity: Number(l.quantity), price: Number(l.unit_price), total: Number(l.line_total) })),
    }, (settings || {}) as any);
    pdf.save(`${inv.invoice_number}.pdf`);
  };

  const duplicate = async (id: string) => {
    const { data: inv } = await supabase.from("invoices").select("*").eq("id", id).single();
    const { data: lines } = await supabase.from("invoice_line_items").select("*").eq("invoice_id", id).order("sort_order");
    if (!inv) return;
    const { data: numRow } = await supabase.rpc("get_next_invoice_number");
    const today = new Date().toISOString().slice(0, 10);
    const { data: copy, error } = await supabase.from("invoices").insert({
      invoice_number: numRow as unknown as string,
      client_id: inv.client_id, client_po_number: inv.client_po_number, payment_terms: inv.payment_terms,
      issue_date: today, due_date: inv.due_date, subtotal: inv.subtotal, tax_amount: inv.tax_amount, total: inv.total,
      notes: inv.notes, status: "draft",
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (lines && lines.length) {
      await supabase.from("invoice_line_items").insert(lines.map((l: any) => ({
        invoice_id: copy.id, description: l.description, quantity: l.quantity, unit_price: l.unit_price, line_total: l.line_total, sort_order: l.sort_order,
      })));
    }
    qc.invalidateQueries({ queryKey: ["invoices"] });
    toast.success("Duplicated");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this draft invoice?")) return;
    await supabase.from("invoice_line_items").delete().eq("invoice_id", id);
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["invoices"] });
    toast.success("Deleted");
  };

  const editInvoice = (id: string) => { setEditingId(id); setOpen(true); };

  return (
    <PageContainer>
      <PageHeader
        title="Invoices"
        description="Send invoices, track payments"
        action={<Button onClick={() => { setEditingId(null); setOpen(true); }} style={{ background: "#997839", color: "white" }}><Plus className="h-4 w-4 mr-2" /> New Invoice</Button>}
      />
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search invoices…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>
      <Card className="shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <Th>Client</Th><Th>Memo</Th><Th>Issued</Th><Th>Due</Th>
                <Th className="text-right">Amount</Th><Th>Status</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
                : filtered.length === 0 ? <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">No invoices yet.</td></tr>
                : filtered.map((r: any) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition-colors align-top">
                  <Td>
                    <button onClick={() => editInvoice(r.id)} className="font-medium hover:text-primary text-left">
                      {r.client?.company_name || "—"}
                    </button>
                    <div className="text-xs text-muted-foreground">{r.invoice_number}</div>
                  </Td>
                  <Td><MemoCell table="invoices" id={r.id} value={r.memo} onSaved={() => qc.invalidateQueries({ queryKey: ["invoices"] })} /></Td>
                  <Td>{formatDate(r.issue_date)}</Td>
                  <Td>{formatDate(r.due_date)}</Td>
                  <Td className="text-right font-medium tabular-nums">{formatCurrency(r.total)}</Td>
                  <Td><StatusBadge status={r.status} dueDate={r.due_date} /></Td>
                  <Td className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => editInvoice(r.id)}>Edit</DropdownMenuItem>
                        {r.status !== "paid" && <DropdownMenuItem onClick={() => setPayingId(r.id)}>Mark Paid</DropdownMenuItem>}
                        <DropdownMenuItem onClick={() => downloadPdf(r.id)}>Download PDF</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicate(r.id)}>Duplicate</DropdownMenuItem>
                        {r.status === "draft" && <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => remove(r.id)}>Delete</DropdownMenuItem>
                        </>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <InvoiceDialog key={editingId || "new"} open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingId(null); }} invoiceId={editingId} />
      <MarkPaidDialog
        open={!!payingId}
        onOpenChange={(v) => { if (!v) setPayingId(null); }}
        onConfirm={async (info) => { if (payingId) await markPaid(payingId, info); }}
        title="Mark Invoice Paid"
      />
    </PageContainer>
  );
}

function Th({ children, className = "" }: any) { return <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide ${className}`}>{children}</th>; }
function Td({ children, className = "" }: any) { return <td className={`px-4 py-3 ${className}`}>{children}</td>; }
