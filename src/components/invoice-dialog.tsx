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
import { NumberInput } from "@/components/number-input";
import { addDaysFromTerms, formatCurrency } from "@/lib/format";
import { generatePDF } from "@/lib/pdf";
import { sendDocumentEmail } from "@/lib/send";
import { logActivity } from "@/lib/activity";
import { getNextDocumentNumber } from "@/lib/document-number";
import { normalizeLineItemsForEditor, sanitizeLineItemsForSave } from "@/lib/line-items";
import { shouldAllowDialogClose } from "@/lib/dialog";
import { PdfPreviewDialog } from "@/components/pdf-preview-dialog";

export type InvoiceForm = {
  id?: string;
  invoice_number?: string;
  client_id: string | null;
  issue_date: string;
  due_date: string;
  client_po_number?: string;
  payment_terms?: string;
  notes?: string;
  memo?: string;
  tax_amount: number;
  status?: string;
};

export function InvoiceDialog({
  open, onOpenChange, invoiceId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoiceId?: string | null;
}) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState<InvoiceForm>({
    client_id: null, issue_date: today, due_date: today, tax_amount: 0,
  });
  const [lines, setLines] = useState<LineItem[]>([]);
  const [baseline, setBaseline] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-mini"],
    queryFn: async () => (await supabase.from("clients").select("id,company_name,contact_email,payment_terms,billing_street,billing_city,billing_state,billing_zip,contact_name,contact_phone").order("company_name")).data || [],
  });
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("settings").select("*").limit(1).single()).data,
  });

  useEffect(() => {
    if (!open) return;
    (async () => {
      if (invoiceId) {
        const { data } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
        const { data: li } = await supabase.from("invoice_line_items").select("*").eq("invoice_id", invoiceId).order("sort_order");
        if (data) {
          const f: InvoiceForm = {
            id: data.id, invoice_number: data.invoice_number, client_id: data.client_id,
            issue_date: data.issue_date, due_date: data.due_date || data.issue_date,
            client_po_number: data.client_po_number || "", payment_terms: data.payment_terms || "",
            notes: data.notes || "", memo: (data as any).memo || "", tax_amount: Number(data.tax_amount || 0), status: data.status,
          };
          const normalizedLines = normalizeLineItemsForEditor((li || []).map((l: any) => ({ id: l.id, product_service_id: l.product_service_id, description: l.description, quantity: Number(l.quantity), unit_price: Number(l.unit_price), line_total: Number(l.line_total), sort_order: l.sort_order })), "unit_price");
          setForm(f);
          setLines(normalizedLines);
          setBaseline(JSON.stringify({ f, li: normalizedLines }));
        }
      } else {
        const f: InvoiceForm = { client_id: null, issue_date: today, due_date: today, tax_amount: 0, payment_terms: settings?.default_payment_terms || "Net 30" };
        setForm(f);
        const initialLines = normalizeLineItemsForEditor([], "unit_price");
        setLines(initialLines);
        setBaseline(JSON.stringify({ f, li: initialLines }));
      }
    })();
  }, [open, invoiceId]);

  const subtotal = useMemo(() => lines.reduce((s, l) => s + Number(l.line_total || 0), 0), [lines]);
  const total = subtotal + Number(form.tax_amount || 0);

  const isDirty = JSON.stringify({ f: form, li: lines }) !== baseline;
  const tryClose = () => onOpenChange(false);

  const set = (k: keyof InvoiceForm, v: any) => {
    setForm((p) => {
      const next = { ...p, [k]: v };
      if (k === "client_id") {
        const c = clients.find((c: any) => c.id === v);
        if (c?.payment_terms) {
          next.payment_terms = c.payment_terms;
          next.due_date = addDaysFromTerms(next.issue_date, c.payment_terms);
        }
      }
      if (k === "issue_date" && next.payment_terms) {
        next.due_date = addDaysFromTerms(v as string, next.payment_terms);
      }
      if (k === "payment_terms") {
        next.due_date = addDaysFromTerms(next.issue_date, v as string);
      }
      return next;
    });
  };

  const persist = async (statusOverride?: string): Promise<{ id: string; invoiceNumber: string } | null> => {
    if (!form.client_id) { toast.error("Select a client"); return null; }
    const linesToSave = sanitizeLineItemsForSave(lines, "unit_price");
    if (linesToSave.length === 0) { toast.error("Add at least one line item"); return null; }
    setSaving(true);
    try {
      let id = form.id;
      let invoice_number = form.invoice_number;
      if (!id && !invoice_number) invoice_number = await getNextDocumentNumber("invoice");
      if (!invoice_number) throw new Error("Unable to assign an invoice number.");
      const payload: any = {
        client_id: form.client_id,
        issue_date: form.issue_date,
        due_date: form.due_date,
        client_po_number: form.client_po_number || null,
        payment_terms: form.payment_terms || null,
        notes: form.notes || null,
        memo: form.memo || null,
        subtotal, tax_amount: Number(form.tax_amount || 0), total,
        status: statusOverride || form.status || "draft",
      };
      if (id) {
        const { error } = await supabase.from("invoices").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("invoices").insert({ ...payload, invoice_number }).select().single();
        if (error) throw error;
        id = data.id;
      }
      // replace line items
      await supabase.from("invoice_line_items").delete().eq("invoice_id", id!);
      if (linesToSave.length) {
        await supabase.from("invoice_line_items").insert(linesToSave.map((l, i) => ({
          invoice_id: id, product_service_id: l.product_service_id || null,
          description: l.description, quantity: l.quantity, unit_price: l.unit_price ?? 0,
          line_total: l.line_total, sort_order: i,
        })));
      }
      await logActivity(form.id ? "update" : "create", "invoice", id!, `${form.id ? "Updated" : "Created"} invoice ${invoice_number}`);
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setForm((f) => ({ ...f, id, invoice_number }));
      setLines(linesToSave);
      setBaseline(JSON.stringify({ f: { ...form, id, invoice_number, status: payload.status }, li: linesToSave }));
      return { id: id!, invoiceNumber: invoice_number };
    } catch (e: any) {
      toast.error(e.message); return null;
    } finally { setSaving(false); }
  };

  const handleSaveDraft = async () => { const result = await persist(); if (result) { toast.success("Draft saved"); onOpenChange(false); } };

  const buildPdf = (invoice_number: string) => {
    const c = clients.find((c: any) => c.id === form.client_id);
    return generatePDF({
      type: "invoice", number: invoice_number, issue_date: form.issue_date, due_date: form.due_date,
      client_po_number: form.client_po_number, payment_terms: form.payment_terms, notes: form.notes,
      subtotal, tax_amount: Number(form.tax_amount || 0), total,
      paidStamp: (form.status || "draft") === "paid",
      party: {
        name: c?.company_name || "", contact: c?.contact_name ?? undefined, email: c?.contact_email ?? undefined, phone: c?.contact_phone ?? undefined,
        street: c?.billing_street ?? undefined, city: c?.billing_city ?? undefined, state: c?.billing_state ?? undefined, zip: c?.billing_zip ?? undefined,
      },
      lines: lines.map((l) => ({ description: l.description, quantity: Number(l.quantity), price: Number(l.unit_price ?? 0), total: Number(l.line_total) })),
    }, (settings || {}) as any);
  };

  const handlePreviewPdf = async () => {
    const result = await persist();
    if (!result) return;
    const num = result.invoiceNumber;
    const pdf = buildPdf(num);
    setPreviewBlob(pdf.output("blob"));
    setPreviewOpen(true);
  };

  const handleSend = async () => {
    const persistResult = await persist("sent");
    if (!persistResult) return;
    const id = persistResult.id;
    const c = clients.find((c: any) => c.id === form.client_id);
    const num = (await supabase.from("invoices").select("invoice_number").eq("id", id).single()).data?.invoice_number || "INV";
    const pdf = buildPdf(num);
    const sendResult = await sendDocumentEmail({
      type: "invoice", number: num, recipientEmail: c?.contact_email, recipientName: c?.contact_name || c?.company_name,
      subject: `Invoice ${num} from ${settings?.company_name || ""}`.trim(),
      pdf, filename: `${num}.pdf`,
      extra: { due_date: form.due_date, total },
    });
    if (sendResult.ok) {
      await supabase.from("invoices").update({ date_sent: new Date().toISOString() }).eq("id", id);
      toast.success(sendResult.skipped ? "PDF generated (no webhook configured)" : "Invoice sent");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      onOpenChange(false);
    } else {
      toast.error(`Send failed: ${(sendResult as any).error || "Webhook returned " + (sendResult as any).status}`);
    }
  };

  const editing = !!form.id;
  const clientOptions = clients.map((c: any) => ({ id: c.id, label: c.company_name, sub: c.contact_email || undefined }));

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) tryClose(); else onOpenChange(true); }}>
      <DialogContent
        className="max-w-4xl max-h-[92vh] overflow-y-auto"
        hideCloseButton
        onPointerDownOutside={(e) => { if (!shouldAllowDialogClose(isDirty)) e.preventDefault(); }}
        onInteractOutside={(e) => { if (!shouldAllowDialogClose(isDirty)) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (!shouldAllowDialogClose(isDirty)) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle>{form.invoice_number ? `Invoice ${form.invoice_number}` : "New Invoice"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Client *</Label>
              <EntityCombobox value={form.client_id} onChange={(id) => set("client_id", id)} options={clientOptions} placeholder="Search client…" />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Client PO #</Label>
              <Input value={form.client_po_number || ""} onChange={(e) => set("client_po_number", e.target.value)} />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Issue date</Label>
              <Input type="date" value={form.issue_date} onChange={(e) => set("issue_date", e.target.value)} />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Due date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Payment terms</Label>
              <Input value={form.payment_terms || ""} onChange={(e) => set("payment_terms", e.target.value)} placeholder="Net 30" />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Tax amount</Label>
              <NumberInput value={form.tax_amount} onChange={(n) => set("tax_amount", n)} />
            </div>
          </div>

          <div className="space-y-1.5"><Label className="text-xs">Line items</Label>
            <LineItemEditor items={lines} onChange={setLines} priceLabel="Unit Price" priceField="unit_price" />
          </div>

          <div className="flex justify-end">
            <div className="w-72 space-y-1 text-sm">
              <Row label="Subtotal" value={formatCurrency(subtotal)} />
              <Row label="Tax" value={formatCurrency(form.tax_amount)} />
              <Row label="Total" value={formatCurrency(total)} bold />
            </div>
          </div>

          <div className="space-y-1.5"><Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} />
          </div>

          <div className="space-y-1.5"><Label className="text-xs">Memo (internal — not shown on PDF)</Label>
            <Textarea rows={2} value={form.memo || ""} onChange={(e) => set("memo", e.target.value)} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={tryClose}>Cancel</Button>
          <Button variant="outline" disabled={saving} onClick={handleSaveDraft}>Save as Draft</Button>
          <Button variant="outline" disabled={saving} onClick={handlePreviewPdf}>Save & Preview PDF</Button>
          <Button disabled={saving} onClick={handleSend}>Send Invoice</Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>
      <PdfPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={form.invoice_number ? `Preview ${form.invoice_number}` : "Preview Invoice"}
        blob={previewBlob}
        filename={`${form.invoice_number || "invoice"}.pdf`}
      />
    </>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${bold ? "border-t border-border pt-2 font-semibold text-base" : ""}`}>
      <span className="text-muted-foreground">{label}</span><span className="tabular-nums">{value}</span>
    </div>
  );
}
