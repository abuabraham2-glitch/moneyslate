import { useEffect, useMemo, useState } from "react";
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
import { StateSelect } from "@/components/state-select";
import { formatCurrency } from "@/lib/format";
import { generatePDF } from "@/lib/pdf";
import { sendDocumentEmail } from "@/lib/send";
import { logActivity } from "@/lib/activity";

export type POForm = {
  id?: string;
  po_number?: string;
  vendor_id: string | null;
  issue_date: string;
  expected_delivery_date?: string;
  internal_po_number?: string;
  ship_to_name?: string; ship_to_street?: string; ship_to_city?: string; ship_to_state?: string; ship_to_zip?: string;
  notes?: string;
  status?: string;
};

export function POdialog({
  open, onOpenChange, poId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  poId?: string | null;
}) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState<POForm>({ vendor_id: null, issue_date: today });
  const [lines, setLines] = useState<LineItem[]>([]);
  const [baseline, setBaseline] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors-mini"],
    queryFn: async () => (await supabase.from("vendors").select("id,company_name,email,contact_name,phone,street,city,state,zip").order("company_name")).data || [],
  });
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("settings").select("*").limit(1).single()).data,
  });

  useEffect(() => {
    if (!open) return;
    (async () => {
      if (poId) {
        const { data } = await supabase.from("purchase_orders").select("*").eq("id", poId).single();
        const { data: li } = await supabase.from("po_line_items").select("*").eq("po_id", poId).order("sort_order");
        if (data) {
          const f: POForm = {
            id: data.id, po_number: data.po_number, vendor_id: data.vendor_id,
            issue_date: data.issue_date, expected_delivery_date: data.expected_delivery_date || "",
            internal_po_number: data.internal_po_number || "",
            ship_to_name: data.ship_to_name || "", ship_to_street: data.ship_to_street || "",
            ship_to_city: data.ship_to_city || "", ship_to_state: data.ship_to_state || "", ship_to_zip: data.ship_to_zip || "",
            notes: data.notes || "", status: data.status,
          };
          setForm(f);
          setLines((li || []).map((l: any) => ({ id: l.id, description: l.description, quantity: Number(l.quantity), unit_cost: Number(l.unit_cost), line_total: Number(l.line_total), sort_order: l.sort_order })));
          setBaseline(JSON.stringify({ f, li }));
        }
      } else {
        // Default ship-to from company address
        const addr = (settings?.company_address || "").split("\n");
        const f: POForm = {
          vendor_id: null, issue_date: today,
          ship_to_name: settings?.company_name || "",
          ship_to_street: addr[0] || "",
          ship_to_city: "", ship_to_state: "", ship_to_zip: "",
        };
        setForm(f);
        setLines([]);
        setBaseline(JSON.stringify({ f, li: [] }));
      }
    })();
  }, [open, poId, settings]);

  const subtotal = useMemo(() => lines.reduce((s, l) => s + Number(l.line_total || 0), 0), [lines]);
  const total = subtotal;

  const isDirty = JSON.stringify({ f: form, li: lines }) !== baseline;
  const tryClose = () => { if (isDirty && !confirm("Discard changes?")) return; onOpenChange(false); };
  const set = (k: keyof POForm, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const persist = async (statusOverride?: string): Promise<string | null> => {
    if (!form.vendor_id) { toast.error("Select a vendor"); return null; }
    if (lines.length === 0) { toast.error("Add at least one line item"); return null; }
    setSaving(true);
    try {
      let id = form.id;
      let po_number = form.po_number;
      const payload: any = {
        vendor_id: form.vendor_id, issue_date: form.issue_date,
        expected_delivery_date: form.expected_delivery_date || null,
        internal_po_number: form.internal_po_number || null,
        ship_to_name: form.ship_to_name || null, ship_to_street: form.ship_to_street || null,
        ship_to_city: form.ship_to_city || null, ship_to_state: form.ship_to_state || null, ship_to_zip: form.ship_to_zip || null,
        notes: form.notes || null,
        subtotal, total, status: statusOverride || form.status || "draft",
      };
      if (id) {
        const { error } = await supabase.from("purchase_orders").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data: numRow } = await supabase.rpc("get_next_po_number");
        po_number = numRow as unknown as string;
        const { data, error } = await supabase.from("purchase_orders").insert({ ...payload, po_number }).select().single();
        if (error) throw error;
        id = data.id;
      }
      await supabase.from("po_line_items").delete().eq("po_id", id!);
      if (lines.length) {
        await supabase.from("po_line_items").insert(lines.map((l, i) => ({
          po_id: id, description: l.description, quantity: l.quantity, unit_cost: l.unit_cost ?? 0, line_total: l.line_total, sort_order: i,
        })));
      }
      await logActivity(form.id ? "update" : "create", "po", id!, `${form.id ? "Updated" : "Created"} PO ${po_number}`);
      qc.invalidateQueries({ queryKey: ["purchase_orders"] });
      setForm((f) => ({ ...f, id, po_number }));
      return id!;
    } catch (e: any) {
      toast.error(e.message); return null;
    } finally { setSaving(false); }
  };

  const buildPdf = (po_number: string) => {
    const v = vendors.find((x: any) => x.id === form.vendor_id);
    return generatePDF({
      type: "po", number: po_number, issue_date: form.issue_date,
      expected_delivery_date: form.expected_delivery_date,
      internal_po_number: form.internal_po_number, notes: form.notes,
      subtotal, total,
      party: {
        name: v?.company_name || "", contact: v?.contact_name ?? undefined, email: v?.email ?? undefined, phone: v?.phone ?? undefined,
        street: v?.street ?? undefined, city: v?.city ?? undefined, state: v?.state ?? undefined, zip: v?.zip ?? undefined,
      },
      ship_to: {
        name: form.ship_to_name, street: form.ship_to_street,
        city: form.ship_to_city, state: form.ship_to_state, zip: form.ship_to_zip,
      },
      lines: lines.map((l) => ({ description: l.description, quantity: Number(l.quantity), price: Number(l.unit_cost ?? 0), total: Number(l.line_total) })),
    }, (settings || {}) as any);
  };

  const handleSaveDraft = async () => { const id = await persist(); if (id) { toast.success("Draft saved"); onOpenChange(false); } };
  const handlePreviewPdf = async () => {
    const id = await persist(); if (!id) return;
    const num = (form.po_number || "PO") as string;
    buildPdf(num).output("dataurlnewwindow");
  };
  const handleSend = async () => {
    const id = await persist("sent"); if (!id) return;
    const v = vendors.find((x: any) => x.id === form.vendor_id);
    const num = (await supabase.from("purchase_orders").select("po_number").eq("id", id).single()).data?.po_number || "PO";
    const pdf = buildPdf(num);
    const result = await sendDocumentEmail({
      type: "po", number: num, recipientEmail: v?.email, recipientName: v?.contact_name || v?.company_name,
      subject: `Purchase Order ${num} from ${settings?.company_name || ""}`.trim(),
      pdf, filename: `${num}.pdf`,
      extra: { expected_delivery_date: form.expected_delivery_date, total },
    });
    if (result.ok) {
      await supabase.from("purchase_orders").update({ date_sent: new Date().toISOString() }).eq("id", id);
      toast.success(result.skipped ? "PDF generated (no webhook configured)" : "PO sent");
      qc.invalidateQueries({ queryKey: ["purchase_orders"] });
      onOpenChange(false);
    } else {
      toast.error(`Send failed: ${(result as any).error || "Webhook returned " + (result as any).status}`);
    }
  };

  const editing = !!form.id;
  const vendorOptions = vendors.map((v: any) => ({ id: v.id, label: v.company_name, sub: v.email || undefined }));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) tryClose(); else onOpenChange(true); }}>
      <DialogContent
        className="max-w-4xl max-h-[92vh] overflow-y-auto"
        hideCloseButton
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{editing ? `PO ${form.po_number}` : "New Purchase Order"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Vendor *</Label>
              <EntityCombobox value={form.vendor_id} onChange={(id) => set("vendor_id", id)} options={vendorOptions} placeholder="Search vendor…" />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Internal PO #</Label>
              <Input value={form.internal_po_number || ""} onChange={(e) => set("internal_po_number", e.target.value)} />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Issue date</Label>
              <Input type="date" value={form.issue_date} onChange={(e) => set("issue_date", e.target.value)} />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Expected delivery</Label>
              <Input type="date" value={form.expected_delivery_date || ""} onChange={(e) => set("expected_delivery_date", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2 border border-border rounded-lg p-3">
            <p className="text-sm font-medium">Ship To</p>
            <div className="space-y-1.5"><Label className="text-xs">Name</Label>
              <Input value={form.ship_to_name || ""} onChange={(e) => set("ship_to_name", e.target.value)} />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Street</Label>
              <Input value={form.ship_to_street || ""} onChange={(e) => set("ship_to_street", e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">City</Label>
                <Input value={form.ship_to_city || ""} onChange={(e) => set("ship_to_city", e.target.value)} />
              </div>
              <div className="space-y-1.5"><Label className="text-xs">State</Label>
                <StateSelect value={form.ship_to_state || ""} onChange={(v) => set("ship_to_state", v)} />
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Zip</Label>
                <Input value={form.ship_to_zip || ""} onChange={(e) => set("ship_to_zip", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-1.5"><Label className="text-xs">Line items</Label>
            <LineItemEditor items={lines} onChange={setLines} priceLabel="Unit Cost" priceField="unit_cost" />
          </div>

          <div className="flex justify-end">
            <div className="w-72 space-y-1 text-sm">
              <div className="flex justify-between py-2 border-t border-border font-semibold text-base">
                <span className="text-muted-foreground">Total</span><span className="tabular-nums">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5"><Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={tryClose}>Cancel</Button>
          <Button variant="outline" disabled={saving} onClick={handleSaveDraft}>Save as Draft</Button>
          <Button variant="outline" disabled={saving} onClick={handlePreviewPdf}>Save & Preview PDF</Button>
          <Button disabled={saving} onClick={handleSend}>Send PO</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
