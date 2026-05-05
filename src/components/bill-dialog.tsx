import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LineItemEditor, type LineItem } from "@/components/line-item-editor";
import { EntityCombobox } from "@/components/entity-combobox";
import { formatCurrency } from "@/lib/format";
import { logActivity } from "@/lib/activity";
import { getNextDocumentNumber } from "@/lib/document-number";
import { normalizeLineItemsForEditor, sanitizeLineItemsForSave } from "@/lib/line-items";
import { shouldAllowDialogClose } from "@/lib/dialog";

export type BillForm = {
  id?: string;
  bill_number?: string;
  vendor_id: string | null;
  bill_date: string;
  due_date?: string;
  linked_po_id?: string | null;
  notes?: string;
  status?: string;
};

export function BillDialog({
  open, onOpenChange, billId, prefill, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  billId?: string | null;
  /** Pre-fill bill from a PO (Convert to Bill) */
  prefill?: { vendor_id: string; linked_po_id: string; lines: LineItem[]; po_number?: string } | null;
  onSaved?: (info: { id: string; bill_number: string }) => void;
}) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState<BillForm>({ vendor_id: null, bill_date: today });
  const [lines, setLines] = useState<LineItem[]>([]);
  const [baseline, setBaseline] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors-mini"],
    queryFn: async () => (await supabase.from("vendors").select("id,company_name,email,payment_terms").order("company_name")).data || [],
  });

  const { data: receivedPOs = [] } = useQuery({
    queryKey: ["sent-pos", form.vendor_id],
    enabled: !!form.vendor_id,
    queryFn: async () => {
      const { data } = await supabase.from("purchase_orders").select("id,po_number,total").eq("vendor_id", form.vendor_id!).eq("status", "sent").order("created_at", { ascending: false });
      return data || [];
    },
  });

  useEffect(() => {
    if (!open) return;
    (async () => {
      if (billId) {
        const { data } = await supabase.from("bills").select("*").eq("id", billId).single();
        const { data: li } = await supabase.from("bill_line_items").select("*").eq("bill_id", billId).order("sort_order");
        if (data) {
          const f: BillForm = {
            id: data.id, bill_number: data.bill_number, vendor_id: data.vendor_id,
            bill_date: data.bill_date, due_date: data.due_date || "", linked_po_id: data.linked_po_id,
            notes: data.notes || "", status: data.status,
          };
          const normalizedLines = normalizeLineItemsForEditor((li || []).map((l: any) => ({ id: l.id, product_service_id: l.product_service_id, description: l.description, quantity: Number(l.quantity), unit_cost: Number(l.unit_cost), line_total: Number(l.line_total), sort_order: l.sort_order })), "unit_cost");
          setForm(f);
          setLines(normalizedLines);
          setBaseline(JSON.stringify({ f, li: normalizedLines }));
        }
      } else if (prefill) {
        const f: BillForm = { vendor_id: prefill.vendor_id, bill_date: today, linked_po_id: prefill.linked_po_id, notes: prefill.po_number ? `From ${prefill.po_number}` : "" };
        const normalizedLines = normalizeLineItemsForEditor(prefill.lines, "unit_cost");
        setForm(f);
        setLines(normalizedLines);
        setBaseline(JSON.stringify({ f, li: normalizedLines }));
      } else {
        const f: BillForm = { vendor_id: null, bill_date: today };
        const initialLines = normalizeLineItemsForEditor([], "unit_cost");
        setForm(f); setLines(initialLines);
        setBaseline(JSON.stringify({ f, li: initialLines }));
      }
    })();
  }, [open, billId, prefill]);

  const total = useMemo(() => lines.reduce((s, l) => s + Number(l.line_total || 0), 0), [lines]);

  const isDirty = JSON.stringify({ f: form, li: lines }) !== baseline;
  const tryClose = () => onOpenChange(false);
  const set = (k: keyof BillForm, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.vendor_id) { toast.error("Select a vendor"); return; }
    const linesToSave = sanitizeLineItemsForSave(lines, "unit_cost");
    if (linesToSave.length === 0) { toast.error("Add at least one line item"); return; }
    setSaving(true);
    try {
      let id = form.id;
      let bill_number = form.bill_number;
      if (!id && !bill_number) bill_number = await getNextDocumentNumber("bill");
      if (!bill_number) throw new Error("Unable to assign a bill number.");
      const payload: any = {
        vendor_id: form.vendor_id, bill_date: form.bill_date, due_date: form.due_date || null,
        linked_po_id: form.linked_po_id || null,
        notes: form.notes || null, total, status: form.status || "unpaid",
      };
      if (id) {
        const { error } = await supabase.from("bills").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("bills").insert({ ...payload, bill_number }).select().single();
        if (error) throw error;
        id = data.id;
        // If linked PO, flip its status to completed
        if (form.linked_po_id) {
          await supabase.from("purchase_orders").update({ status: "completed" }).eq("id", form.linked_po_id);
        }
      }
      await supabase.from("bill_line_items").delete().eq("bill_id", id!);
      if (linesToSave.length) {
        await supabase.from("bill_line_items").insert(linesToSave.map((l, i) => ({
          bill_id: id, product_service_id: l.product_service_id || null,
          description: l.description, quantity: l.quantity, unit_cost: l.unit_cost ?? 0, line_total: l.line_total, sort_order: i,
        })));
      }
      await logActivity(form.id ? "update" : "create", "bill", id!, `${form.id ? "Updated" : "Created"} bill ${bill_number}`);
      qc.invalidateQueries({ queryKey: ["bills"] });
      qc.invalidateQueries({ queryKey: ["purchase_orders"] });
      setForm((f) => ({ ...f, id, bill_number }));
      setLines(linesToSave);
      setBaseline(JSON.stringify({ f: { ...form, id, bill_number, status: payload.status }, li: linesToSave }));
      toast.success("Bill saved");
      onSaved?.({ id: id!, bill_number: bill_number! });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  const editing = !!form.id;
  const vendorOptions = vendors.map((v: any) => ({ id: v.id, label: v.company_name, sub: v.email || undefined }));
  const poOptions = (receivedPOs as any[]).map((p) => ({ id: p.id, label: p.po_number, sub: formatCurrency(Number(p.total)) }));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) tryClose(); else onOpenChange(true); }}>
      <DialogContent
        className="max-w-3xl max-h-[92vh] overflow-y-auto"
        hideCloseButton
        onPointerDownOutside={(e) => { if (!shouldAllowDialogClose(isDirty)) e.preventDefault(); }}
        onInteractOutside={(e) => { if (!shouldAllowDialogClose(isDirty)) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (!shouldAllowDialogClose(isDirty)) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle>{form.bill_number ? `Bill ${form.bill_number}` : "New Bill"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Vendor *</Label>
              <EntityCombobox value={form.vendor_id} onChange={(id) => { set("vendor_id", id); set("linked_po_id", null); }} options={vendorOptions} placeholder="Search vendor…" />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Linked PO (optional)</Label>
              <EntityCombobox value={form.linked_po_id || null} onChange={(id) => set("linked_po_id", id)} options={poOptions} placeholder={form.vendor_id ? "Search received POs…" : "Select vendor first"} />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Bill date</Label>
              <Input type="date" value={form.bill_date} onChange={(e) => set("bill_date", e.target.value)} />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Due date</Label>
              <Input type="date" value={form.due_date || ""} onChange={(e) => set("due_date", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5"><Label className="text-xs">Line items</Label>
            <LineItemEditor items={lines} onChange={setLines} priceLabel="Unit Cost" priceField="unit_cost" />
          </div>

          <div className="flex justify-end">
            <div className="w-72 flex justify-between py-2 border-t border-border font-semibold text-base">
              <span className="text-muted-foreground">Total</span><span className="tabular-nums">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="space-y-1.5"><Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={tryClose}>Cancel</Button>
          <Button disabled={saving} onClick={save}>{saving ? "Saving…" : "Save Bill"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
