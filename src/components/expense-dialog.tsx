import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EntityCombobox } from "@/components/entity-combobox";
import { NumberInput } from "@/components/number-input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { shouldAllowDialogClose } from "@/lib/dialog";
import { logActivity } from "@/lib/activity";
import { Paperclip, X } from "lucide-react";

type ExpenseForm = {
  id?: string;
  expense_date: string;
  vendor_name: string;
  category_id: string;
  amount: number;
  payment_method: string;
  receipt_url: string;
  notes: string;
};

const PAYMENT_METHODS = ["Cash", "Check", "ACH", "Credit Card", "Other"];

export function ExpenseDialog({
  open, onOpenChange, expenseId, prefill, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  expenseId?: string | null;
  prefill?: Partial<ExpenseForm>;
  onSaved?: (id: string) => void;
}) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const blank: ExpenseForm = { expense_date: today, vendor_name: "", category_id: "", amount: 0, payment_method: "", receipt_url: "", notes: "" };

  const [form, setForm] = useState<ExpenseForm>(blank);
  const [baseline, setBaseline] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => (await supabase.from("expense_categories").select("id,name").order("sort_order").order("name")).data || [],
  });

  useEffect(() => {
    if (!open) return;
    (async () => {
      if (expenseId) {
        const { data } = await supabase.from("expenses").select("*").eq("id", expenseId).single();
        if (data) {
          const f: ExpenseForm = {
            id: data.id,
            expense_date: data.expense_date,
            vendor_name: data.vendor_name || "",
            category_id: data.category_id || "",
            amount: Number(data.amount || 0),
            payment_method: data.payment_method || "",
            receipt_url: data.receipt_url || "",
            notes: data.notes || "",
          };
          setForm(f);
          setBaseline(JSON.stringify(f));
        }
      } else {
        const f = { ...blank, expense_date: today, ...(prefill || {}) };
        setForm(f);
        setBaseline(JSON.stringify(f));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expenseId]);

  const isDirty = JSON.stringify(form) !== baseline;
  const set = <K extends keyof ExpenseForm>(k: K, v: ExpenseForm[K]) => setForm((p) => ({ ...p, [k]: v }));

  const categoryOptions = (categories as any[]).map((c) => ({ id: c.id, label: c.name }));

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("receipts").upload(path, file);
      if (error) throw error;
      set("receipt_url", path);
      toast.success("Receipt uploaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.expense_date) { toast.error("Date required"); return; }
    if (!form.vendor_name.trim()) { toast.error("Vendor required"); return; }
    if (!form.category_id) { toast.error("Category required"); return; }
    if (!form.amount || form.amount <= 0) { toast.error("Amount required"); return; }
    setSaving(true);
    try {
      const payload = {
        expense_date: form.expense_date,
        vendor_name: form.vendor_name.trim(),
        category_id: form.category_id,
        amount: form.amount,
        payment_method: form.payment_method || null,
        receipt_url: form.receipt_url || null,
        notes: form.notes || null,
      };
      let id = form.id;
      if (id) {
        const { error } = await supabase.from("expenses").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("expenses").insert(payload).select().single();
        if (error) throw error;
        id = data.id;
      }
      await logActivity(form.id ? "update" : "create", "expense", id!, `${form.id ? "Updated" : "Created"} expense for ${form.vendor_name}`);
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense saved");
      setBaseline(JSON.stringify(form));
      onSaved?.(id!);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onOpenChange(false); else onOpenChange(true); }}>
      <DialogContent
        className="max-w-2xl max-h-[92vh] overflow-y-auto"
        hideCloseButton
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => { if (!shouldAllowDialogClose(isDirty)) e.preventDefault(); }}
        onInteractOutside={(e) => { if (!shouldAllowDialogClose(isDirty)) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (!shouldAllowDialogClose(isDirty)) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit Expense" : "New Expense"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Date *</Label>
              <Input type="date" value={form.expense_date} onChange={(e) => set("expense_date", e.target.value)} />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Vendor / Company *</Label>
              <Input value={form.vendor_name} onChange={(e) => set("vendor_name", e.target.value)} placeholder="e.g. Acme Supplies" />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Category *</Label>
              <EntityCombobox
                value={form.category_id || null}
                onChange={(id) => set("category_id", id || "")}
                options={categoryOptions}
                placeholder="Select category…"
                emptyMessage="No categories found"
              />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Amount *</Label>
              <NumberInput value={form.amount} onChange={(n) => set("amount", n)} minDecimals={2} maxDecimals={2} placeholder="0.00" />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Payment Method</Label>
              <Select value={form.payment_method || undefined} onValueChange={(v) => set("payment_method", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Receipt</Label>
              {form.receipt_url ? (
                <div className="flex items-center gap-2 text-sm border border-input rounded-md px-3 h-9">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate flex-1">{form.receipt_url.split("/").pop()}</span>
                  <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => set("receipt_url", "")}><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <label
                  htmlFor="receipt-file-input"
                  className={`flex items-center gap-2 text-sm border border-input rounded-md px-3 h-9 cursor-pointer hover:bg-accent/40 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{uploading ? "Uploading…" : "Choose file…"}</span>
                  <input
                    id="receipt-file-input"
                    type="file"
                    className="sr-only"
                    disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
                  />
                </label>
              )}
            </div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional description…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={saving} onClick={save}>{saving ? "Saving…" : "Save Expense"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
