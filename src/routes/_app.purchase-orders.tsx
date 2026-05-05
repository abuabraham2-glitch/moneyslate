import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Search, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { POdialog } from "@/components/po-dialog";
import { BillDialog } from "@/components/bill-dialog";
import { generatePDF } from "@/lib/pdf";
import { logActivity } from "@/lib/activity";
import { toast } from "sonner";
import type { LineItem } from "@/components/line-item-editor";

export const Route = createFileRoute("/_app/purchase-orders")({ component: POPage });

function POPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [billOpen, setBillOpen] = useState(false);
  const [billPrefill, setBillPrefill] = useState<{ vendor_id: string; linked_po_id: string; lines: LineItem[]; po_number?: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["purchase_orders"],
    queryFn: async () => {
      const { data } = await supabase.from("purchase_orders").select("*, vendor:vendors(id,company_name)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return (data || []).filter((r: any) =>
      r.po_number.toLowerCase().includes(s) ||
      (r.vendor?.company_name || "").toLowerCase().includes(s)
    );
  }, [data, search]);

  const markSent = async (id: string) => {
    const { error } = await supabase.from("purchase_orders").update({ status: "sent", date_sent: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logActivity("send", "po", id, "Marked PO sent");
    qc.invalidateQueries({ queryKey: ["purchase_orders"] });
    toast.success("Marked sent");
  };

  const convertToBill = async (id: string) => {
    const { data: po } = await supabase.from("purchase_orders").select("*").eq("id", id).single();
    const { data: lines } = await supabase.from("po_line_items").select("*").eq("po_id", id).order("sort_order");
    if (!po || !po.vendor_id) return;
    setBillPrefill({
      vendor_id: po.vendor_id,
      linked_po_id: po.id,
      po_number: po.po_number,
      lines: (lines || []).map((l: any) => ({
        description: l.description, quantity: Number(l.quantity),
        unit_cost: Number(l.unit_cost), line_total: Number(l.line_total), sort_order: l.sort_order,
      })),
    });
    setBillOpen(true);
  };

  const downloadPdf = async (id: string) => {
    const { data: po } = await supabase.from("purchase_orders").select("*, vendor:vendors(*)").eq("id", id).single();
    const { data: lines } = await supabase.from("po_line_items").select("*").eq("po_id", id).order("sort_order");
    const { data: settings } = await supabase.from("settings").select("*").limit(1).single();
    if (!po) return;
    const v = po.vendor;
    const pdf = generatePDF({
      type: "po", number: po.po_number, issue_date: po.issue_date,
      expected_delivery_date: po.expected_delivery_date || undefined,
      internal_po_number: po.internal_po_number || undefined, notes: po.notes || undefined,
      subtotal: Number(po.subtotal), total: Number(po.total),
      party: {
        name: v?.company_name || "", contact: v?.contact_name ?? undefined, email: v?.email ?? undefined, phone: v?.phone ?? undefined,
        street: v?.street ?? undefined, city: v?.city ?? undefined, state: v?.state ?? undefined, zip: v?.zip ?? undefined,
      },
      ship_to: {
        name: po.ship_to_name ?? undefined, street: po.ship_to_street ?? undefined,
        city: po.ship_to_city ?? undefined, state: po.ship_to_state ?? undefined, zip: po.ship_to_zip ?? undefined,
      },
      lines: (lines || []).map((l: any) => ({ description: l.description, quantity: Number(l.quantity), price: Number(l.unit_cost), total: Number(l.line_total) })),
    }, (settings || {}) as any);
    pdf.save(`${po.po_number}.pdf`);
  };

  const duplicate = async (id: string) => {
    const { data: po } = await supabase.from("purchase_orders").select("*").eq("id", id).single();
    const { data: lines } = await supabase.from("po_line_items").select("*").eq("po_id", id).order("sort_order");
    if (!po) return;
    const { data: numRow } = await supabase.rpc("get_next_po_number");
    const today = new Date().toISOString().slice(0, 10);
    const { data: copy, error } = await supabase.from("purchase_orders").insert({
      po_number: numRow as unknown as string,
      vendor_id: po.vendor_id, internal_po_number: po.internal_po_number,
      issue_date: today, expected_delivery_date: po.expected_delivery_date,
      ship_to_name: po.ship_to_name, ship_to_street: po.ship_to_street, ship_to_city: po.ship_to_city, ship_to_state: po.ship_to_state, ship_to_zip: po.ship_to_zip,
      subtotal: po.subtotal, total: po.total, notes: po.notes, status: "draft",
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (lines && lines.length) {
      await supabase.from("po_line_items").insert(lines.map((l: any) => ({
        po_id: copy.id, description: l.description, quantity: l.quantity, unit_cost: l.unit_cost, line_total: l.line_total, sort_order: l.sort_order,
      })));
    }
    qc.invalidateQueries({ queryKey: ["purchase_orders"] });
    toast.success("Duplicated");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this draft PO?")) return;
    await supabase.from("po_line_items").delete().eq("po_id", id);
    const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["purchase_orders"] });
    toast.success("Deleted");
  };

  const edit = (id: string) => { setEditingId(id); setOpen(true); };

  return (
    <PageContainer>
      <PageHeader
        title="Purchase Orders"
        description="Send POs to vendors, convert to bills"
        action={<Button onClick={() => { setEditingId(null); setOpen(true); }} style={{ background: "#997839", color: "white" }}><Plus className="h-4 w-4 mr-2" /> New PO</Button>}
      />
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search purchase orders…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>
      <Card className="shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <Th>PO #</Th><Th>Vendor</Th><Th>Issue</Th><Th>Expected</Th>
                <Th className="text-right">Amount</Th><Th>Status</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
                : filtered.length === 0 ? <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">No purchase orders yet.</td></tr>
                : filtered.map((r: any) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <Td><button onClick={() => edit(r.id)} className="font-medium hover:text-primary">{r.po_number}</button></Td>
                  <Td>{r.vendor?.company_name || "—"}</Td>
                  <Td>{formatDate(r.issue_date)}</Td>
                  <Td>{formatDate(r.expected_delivery_date)}</Td>
                  <Td className="text-right font-medium tabular-nums">{formatCurrency(r.total)}</Td>
                  <Td><StatusBadge status={r.status} /></Td>
                  <Td className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => edit(r.id)}>Edit</DropdownMenuItem>
                        {r.status === "draft" && <DropdownMenuItem onClick={() => markSent(r.id)}>Mark Sent</DropdownMenuItem>}
                        {r.status === "sent" && <DropdownMenuItem onClick={() => convertToBill(r.id)}>Convert to Bill</DropdownMenuItem>}
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

      <POdialog key={editingId || "new"} open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingId(null); }} poId={editingId} />
      <BillDialog
        key={billPrefill?.linked_po_id || "no-bill"}
        open={billOpen}
        onOpenChange={(v) => { setBillOpen(v); if (!v) setBillPrefill(null); }}
        prefill={billPrefill}
      />
    </PageContainer>
  );
}

function Th({ children, className = "" }: any) { return <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide ${className}`}>{children}</th>; }
function Td({ children, className = "" }: any) { return <td className={`px-4 py-3 ${className}`}>{children}</td>; }
