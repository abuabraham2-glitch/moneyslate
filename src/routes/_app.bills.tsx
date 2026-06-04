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
import { BillDialog } from "@/components/bill-dialog";
import { MarkPaidDialog } from "@/components/mark-paid-dialog";
import { generatePDF } from "@/lib/pdf";
import { logActivity } from "@/lib/activity";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/bills")({ component: BillsPage });

type SortKey = "vendor" | "bill_date" | "total" | "status";

function BillsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("bill_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "bill_date" ? "desc" : "asc"); }
  };


  const { data, isLoading } = useQuery({
    queryKey: ["bills"],
    queryFn: async () => {
      const { data } = await supabase.from("bills").select("*, vendor:vendors(id,company_name)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    const list = (data || []).filter((r: any) =>
      r.bill_number.toLowerCase().includes(s) ||
      (r.vendor?.company_name || "").toLowerCase().includes(s)
    );
    const dir = sortDir === "asc" ? 1 : -1;
    const get = (r: any) => {
      switch (sortKey) {
        case "vendor": return (r.vendor?.company_name || "").toLowerCase();
        case "bill_date": return r.bill_date || "";
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
    const { error } = await supabase.from("bills").update({ status: "paid", ...info }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logActivity("paid", "bill", id, "Marked bill paid");
    qc.invalidateQueries({ queryKey: ["bills"] });
    toast.success("Marked paid");
  };

  const markUnpaid = async (id: string) => {
    const { error } = await supabase
      .from("bills")
      .update({ status: "unpaid", date_paid: null, payment_method: null, payment_notes: null })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logActivity("updated", "bill", id, "Marked bill unpaid");
    qc.invalidateQueries({ queryKey: ["bills"] });
    toast.success("Marked unpaid");
  };


  const remove = async (id: string) => {
    if (!confirm("Delete this bill?")) return;
    await supabase.from("bill_line_items").delete().eq("bill_id", id);
    const { error } = await supabase.from("bills").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["bills"] });
    toast.success("Deleted");
  };

  const downloadPdf = async (id: string) => {
    const { data: bill } = await supabase.from("bills").select("*, vendor:vendors(*)").eq("id", id).single();
    const { data: lines } = await supabase.from("bill_line_items").select("*").eq("bill_id", id).order("sort_order");
    const { data: settings } = await supabase.from("settings").select("*").limit(1).single();
    if (!bill) return;
    const v = bill.vendor;
    const pdf = generatePDF({
      type: "bill", number: bill.bill_number, issue_date: bill.bill_date, due_date: bill.due_date || undefined,
      notes: bill.notes || undefined,
      subtotal: Number(bill.total), total: Number(bill.total),
      paidStamp: bill.status === "paid",
      paidStampColor: [220, 38, 38],
      party: {
        name: v?.company_name || "", contact: v?.contact_name ?? undefined, email: v?.email ?? undefined, phone: v?.phone ?? undefined,
        street: v?.street ?? undefined, city: v?.city ?? undefined, state: v?.state ?? undefined, zip: v?.zip ?? undefined,
      },
      lines: (lines || []).map((l: any) => ({ description: l.description, quantity: Number(l.quantity), price: Number(l.unit_cost), total: Number(l.line_total) })),
    }, (settings || {}) as any);
    pdf.save(`${bill.bill_number}.pdf`);
  };

  const edit = (id: string) => { setEditingId(id); setOpen(true); };

  return (
    <PageContainer>
      <PageHeader
        title="Bills"
        description="Track and pay vendor bills"
        action={<Button onClick={() => { setEditingId(null); setOpen(true); }} style={{ background: "#997839", color: "white" }}><Plus className="h-4 w-4 mr-2" /> New Bill</Button>}
      />
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search bills…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>
      <Card className="shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <Th>Bill #</Th>
                <SortTh label="Vendor" k="vendor" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label="Bill Date" k="bill_date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <Th>Due</Th>
                <SortTh label="Amount" k="total" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-right" />
                <SortTh label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
                : filtered.length === 0 ? <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">No bills yet.</td></tr>
                : filtered.map((r: any) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <Td><button onClick={() => edit(r.id)} className="font-medium hover:text-primary">{r.bill_number}</button></Td>
                  <Td>{r.vendor?.company_name || "—"}</Td>
                  <Td>{formatDate(r.bill_date)}</Td>
                  <Td>{formatDate(r.due_date)}</Td>
                  <Td className="text-right font-medium tabular-nums">{formatCurrency(r.total)}</Td>
                  <Td><StatusBadge status={r.status} dueDate={r.due_date} /></Td>
                  <Td className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => edit(r.id)}>Edit</DropdownMenuItem>
                        {r.status !== "paid" && <DropdownMenuItem onClick={() => setPayingId(r.id)}>Mark Paid</DropdownMenuItem>}
                        <DropdownMenuItem onClick={() => downloadPdf(r.id)}>Download PDF</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => remove(r.id)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <BillDialog key={editingId || "new"} open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingId(null); }} billId={editingId} />
      <MarkPaidDialog
        open={!!payingId}
        onOpenChange={(v) => { if (!v) setPayingId(null); }}
        onConfirm={async (info) => { if (payingId) await markPaid(payingId, info); }}
        title="Mark Bill Paid"
      />
    </PageContainer>
  );
}

function Th({ children, className = "" }: any) { return <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide ${className}`}>{children}</th>; }
function Td({ children, className = "" }: any) { return <td className={`px-4 py-3 ${className}`}>{children}</td>; }
function SortTh({ label, k, sortKey, sortDir, onSort, className = "" }: { label: string; k: SortKey; sortKey: SortKey; sortDir: "asc" | "desc"; onSort: (k: SortKey) => void; className?: string }) {
  const active = sortKey === k;
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide ${className}`}>
      <button type="button" onClick={() => onSort(k)} className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${active ? "text-foreground" : ""} ${className.includes("text-right") ? "ml-auto" : ""}`}>
        <span>{label}</span><Icon className="h-3 w-3" />
      </button>
    </th>
  );
}
