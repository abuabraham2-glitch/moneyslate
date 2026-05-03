import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { logActivity } from "@/lib/activity";
import { PhoneInput } from "@/components/phone-input";
import { StateSelect } from "@/components/state-select";

export type VendorForm = {
  id?: string;
  company_name: string;
  contact_name?: string; email?: string; phone?: string;
  street?: string; city?: string; state?: string; zip?: string;
  payment_terms?: string;
  notes?: string;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

export function VendorDialog({
  open, onOpenChange, initial,
}: { open: boolean; onOpenChange: (v: boolean) => void; initial?: VendorForm | null }) {
  const qc = useQueryClient();
  const initialForm = initial || { company_name: "", payment_terms: "Net 30" };
  const [form, setForm] = useState<VendorForm>(initialForm);
  const [baseline, setBaseline] = useState<VendorForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const editing = !!initial?.id;

  useEffect(() => {
    const f = initial || { company_name: "", payment_terms: "Net 30" };
    setForm(f);
    setBaseline(f);
  }, [initial, open]);

  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const tryClose = () => {
    if (isDirty && !confirm("Discard changes?")) return;
    onOpenChange(false);
  };

  const set = <K extends keyof VendorForm>(k: K, v: VendorForm[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    if (!form.company_name.trim()) { toast.error("Company name is required"); return; }
    setSaving(true);
    try {
      const { id, company_name, contact_name, email, phone, street, city, state, zip, payment_terms, notes } = form;
      const payload = { company_name, contact_name, email, phone, street, city, state, zip, payment_terms, notes };
      if (editing) {
        const { error } = await supabase.from("vendors").update(payload).eq("id", id!);
        if (error) throw error;
        await logActivity("update", "vendor", id!, `Updated vendor ${company_name}`);
        toast.success("Vendor updated");
      } else {
        const { data, error } = await supabase.from("vendors").insert(payload).select().single();
        if (error) throw error;
        await logActivity("create", "vendor", data.id, `Added vendor ${form.company_name}`);
        toast.success("Vendor added");
      }
      qc.invalidateQueries({ queryKey: ["vendors"] });
      setBaseline(form);
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) tryClose(); else onOpenChange(true); }}>
      <DialogContent
        className="max-w-xl max-h-[90vh] overflow-y-auto"
        hideCloseButton
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader><DialogTitle>{editing ? "Edit Vendor" : "New Vendor"}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <Field label="Company name *">
            <Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact name"><Input value={form.contact_name || ""} onChange={(e) => set("contact_name", e.target.value)} /></Field>
            <Field label="Payment terms"><Input value={form.payment_terms || ""} onChange={(e) => set("payment_terms", e.target.value)} /></Field>
            <Field label="Email"><Input type="email" value={form.email || ""} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="Phone"><PhoneInput value={form.phone || ""} onChange={(v) => set("phone", v)} /></Field>
          </div>
          <Field label="Street"><Input value={form.street || ""} onChange={(e) => set("street", e.target.value)} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="City"><Input value={form.city || ""} onChange={(e) => set("city", e.target.value)} /></Field>
            <Field label="State"><StateSelect value={form.state || ""} onChange={(v) => set("state", v)} /></Field>
            <Field label="Zip"><Input value={form.zip || ""} onChange={(e) => set("zip", e.target.value)} /></Field>
          </div>
          <Field label="Notes"><Textarea rows={2} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={tryClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
