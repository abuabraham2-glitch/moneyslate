import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Search, MoreHorizontal, ArrowUp, ArrowDown, ArrowUpDown, Paperclip } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate } from "@/lib/format";
import { ExpenseDialog } from "@/components/expense-dialog";
import { toast } from "sonner";
import { cleanupMatchesForRecord } from "@/lib/reconciliation-cleanup";

export const Route = createFileRoute("/_app/expenses")({ component: ExpensesPage });

type SortKey = "expense_date" | "vendor_name" | "category" | "amount";

function ExpensesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("expense_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "expense_date" || k === "amount" ? "desc" : "asc"); }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => (await supabase.from("expenses").select("*, expense_categories(name)").order("expense_date", { ascending: false })).data || [],
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    const list = (data || []).filter((r: any) =>
      (r.vendor_name || "").toLowerCase().includes(s) ||
      (r.expense_categories?.name || "").toLowerCase().includes(s) ||
      (r.notes || "").toLowerCase().includes(s)
    );
    const dir = sortDir === "asc" ? 1 : -1;
    const get = (r: any) => {
      switch (sortKey) {
        case "vendor_name": return (r.vendor_name || "").toLowerCase();
        case "category": return (r.expense_categories?.name || "").toLowerCase();
        case "expense_date": return r.expense_date || "";
        case "amount": return Number(r.amount || 0);
      }
    };
    return [...list].sort((a, b) => {
      const av = get(a), bv = get(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [data, search, sortKey, sortDir]);

  const remove = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["expenses"] });
    toast.success("Deleted");
  };

  const openReceipt = async (path: string) => {
    const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 60);
    if (error || !data) { toast.error(error?.message || "Unable to open"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const edit = (id: string) => { setEditingId(id); setOpen(true); };

  return (
    <PageContainer>
      <PageHeader
        title="Expenses"
        description="Track business expenses for tax reporting"
        action={<Button onClick={() => { setEditingId(null); setOpen(true); }} style={{ background: "#997839", color: "white" }}><Plus className="h-4 w-4 mr-2" /> New Expense</Button>}
      />
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search expenses…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>
      <Card className="shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <SortTh label="Date" k="expense_date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label="Vendor" k="vendor_name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label="Category" k="category" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label="Amount" k="amount" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-right" />
                <Th>Payment</Th>
                <Th>Receipt</Th>
                <Th>Notes</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
                : filtered.length === 0 ? <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">No expenses yet. Click + New Expense to add one.</td></tr>
                : filtered.map((r: any) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <Td><button onClick={() => edit(r.id)} className="font-medium hover:text-primary">{formatDate(r.expense_date)}</button></Td>
                  <Td>{r.vendor_name || "—"}</Td>
                  <Td>{r.expense_categories?.name || "—"}</Td>
                  <Td className="text-right font-medium tabular-nums">{formatCurrency(r.amount)}</Td>
                  <Td>{r.payment_method || "—"}</Td>
                  <Td>{r.receipt_url ? <button onClick={() => openReceipt(r.receipt_url)} className="text-primary hover:underline inline-flex"><Paperclip className="h-4 w-4" /></button> : "—"}</Td>
                  <Td className="max-w-[240px] truncate text-muted-foreground">{r.notes || "—"}</Td>
                  <Td className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => edit(r.id)}>Edit</DropdownMenuItem>
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

      <ExpenseDialog key={editingId || "new"} open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingId(null); }} expenseId={editingId} />
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
