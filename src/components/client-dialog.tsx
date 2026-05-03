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
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { PhoneInput } from "@/components/phone-input";
import { StateSelect } from "@/components/state-select";

export type ClientForm = {
  id?: string;
  company_name: string;
  contact_name?: string; contact_email?: string; contact_phone?: string;
  billing_street?: string; billing_city?: string; billing_state?: string; billing_zip?: string;
  shipping_street?: string; shipping_city?: string; shipping_state?: string; shipping_zip?: string;
  ap_contact_name?: string; ap_contact_email?: string; ap_contact_phone?: string;
  payment_terms?: string;
  notes?: string;
};

export function ClientDialog({
  open, onOpenChange, initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: ClientForm | null;
}) {
  const qc = useQueryClient();
  const initialForm = initial || { company_name: "", payment_terms: "Net 30" };
  const [form, setForm] = useState<ClientForm>(initialForm);
  const [baseline, setBaseline] = useState<ClientForm>(initialForm);
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

  const set = (k: keyof ClientForm, v: any) => setForm((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    if (!form.company_name.trim()) { toast.error("Company name is required"); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (editing) {
        const { error } = await supabase.from("clients").update(payload).eq("id", form.id!);
        if (error) throw error;
        await logActivity("update", "client", form.id!, `Updated client ${form.company_name}`);
        toast.success("Client updated");
      } else {
        const { data, error } = await supabase.from("clients").insert(payload).select().single();
        if (error) throw error;
        await logActivity("create", "client", data.id, `Added client ${form.company_name}`);
        toast.success("Client added");
      }
      qc.invalidateQueries({ queryKey: ["clients"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit Client" : "New Client"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <Field label="Company name *"><Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact name"><Input value={form.contact_name || ""} onChange={(e) => set("contact_name", e.target.value)} /></Field>
            <Field label="Payment terms"><Input value={form.payment_terms || ""} onChange={(e) => set("payment_terms", e.target.value)} placeholder="Net 30" /></Field>
            <Field label="Contact email"><Input type="email" value={form.contact_email || ""} onChange={(e) => set("contact_email", e.target.value)} /></Field>
            <Field label="Contact phone"><PhoneInput value={form.contact_phone || ""} onChange={(v) => set("contact_phone", v)} /></Field>
          </div>

          <Section title="Billing address">
            <Field label="Street"><Input value={form.billing_street || ""} onChange={(e) => set("billing_street", e.target.value)} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="City"><Input value={form.billing_city || ""} onChange={(e) => set("billing_city", e.target.value)} /></Field>
              <Field label="State"><StateSelect value={form.billing_state || ""} onChange={(v) => set("billing_state", v)} /></Field>
              <Field label="Zip"><Input value={form.billing_zip || ""} onChange={(e) => set("billing_zip", e.target.value)} /></Field>
            </div>
          </Section>

          <Section title="Shipping address">
            <Field label="Street"><Input value={form.shipping_street || ""} onChange={(e) => set("shipping_street", e.target.value)} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="City"><Input value={form.shipping_city || ""} onChange={(e) => set("shipping_city", e.target.value)} /></Field>
              <Field label="State"><StateSelect value={form.shipping_state || ""} onChange={(v) => set("shipping_state", v)} /></Field>
              <Field label="Zip"><Input value={form.shipping_zip || ""} onChange={(e) => set("shipping_zip", e.target.value)} /></Field>
            </div>
          </Section>

          <Section title="Accounts Payable contact">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name"><Input value={form.ap_contact_name || ""} onChange={(e) => set("ap_contact_name", e.target.value)} /></Field>
              <Field label="Phone"><PhoneInput value={form.ap_contact_phone || ""} onChange={(v) => set("ap_contact_phone", v)} /></Field>
              <div className="col-span-2"><Field label="Email"><Input type="email" value={form.ap_contact_email || ""} onChange={(e) => set("ap_contact_email", e.target.value)} /></Field></div>
            </div>
          </Section>

          <Field label="Notes"><Textarea value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} rows={2} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full text-left py-1">
        <ChevronDown className="h-4 w-4" /> {title}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}
