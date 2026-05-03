import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { logActivity } from "@/lib/activity";

export type VendorForm = {
  id?: string;
  company_name: string;
  contact_name?: string; email?: string; phone?: string;
  street?: string; city?: string; state?: string; zip?: string;
  payment_terms?: string;
  notes?: string;
};

export function VendorDialog({
  open, onOpenChange, initial,
}: { open: boolean; onOpenChange: (v: boolean) => void; initial?: VendorForm | null }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<VendorForm>(initial || { company_name: "", payment_terms: "Net 30" });
  const [saving, setSaving] = useState(false);
  const editing = !!initial?.id;
  const set = (k: keyof VendorForm, v: any) => setForm({ ...form, [k]: v });

  const save = async () => {
    if (!form.company_name.trim()) { toast.error("Company name is required"); return; }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("vendors").update(form).eq("id", form.id!);
        if (error) throw error;
        await logActivity("update", "vendor", form.id!, `Updated vendor ${form.company_name}`);
        toast.success("Vendor updated");
      } else {
        const { data, error } = await supabase.from("vendors").insert(form).select().single();
        if (error) throw error;
        await logActivity("create", "vendor", data.id, `Added vendor ${form.company_name}`);
        toast.success("Vendor added");
      }
      qc.invalidateQueries({ queryKey: ["vendors"] });
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const F = ({ label, k, type = "text" }: { label: string; k: keyof VendorForm; type?: string }) => (
    <div className="space-y-1.5"><Label className="text-xs">{label}</Label>
      <Input type={type} value={(form as any)[k] || ""} onChange={(e) => set(k, e.target.value)} /></div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit Vendor" : "New Vendor"}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5"><Label className="text-xs">Company name *</Label><Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Contact name" k="contact_name" />
            <F label="Payment terms" k="payment_terms" />
            <F label="Email" k="email" type="email" />
            <F label="Phone" k="phone" />
          </div>
          <F label="Street" k="street" />
          <div className="grid grid-cols-3 gap-3">
            <F label="City" k="city" /><F label="State" k="state" /><F label="Zip" k="zip" />
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Notes</Label><Textarea rows={2} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
