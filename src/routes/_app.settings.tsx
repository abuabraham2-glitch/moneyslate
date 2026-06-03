import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ProductsServicesSettings } from "@/components/products-services-settings";
import { ExpenseCategoriesSettings } from "@/components/expense-categories-settings";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("*").limit(1).single();
      return data;
    },
  });
  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (data) setForm(data); }, [data]);
  if (!form) return <PageContainer>Loading…</PageContainer>;

  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  const save = async () => {
    const { error } = await supabase.from("settings").update({
      company_name: form.company_name,
      company_address: form.company_address,
      company_phone: form.company_phone,
      company_email: form.company_email,
      default_payment_terms: form.default_payment_terms,
      default_tax_rate: form.default_tax_rate,
      next_invoice_number: form.next_invoice_number,
      next_po_number: form.next_po_number,
      email_webhook_url: form.email_webhook_url,
    }).eq("id", form.id);
    if (error) toast.error(error.message);
    else { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["settings"] }); }
  };

  const regenerateKey = async () => {
    const newKey = Array.from(crypto.getRandomValues(new Uint8Array(24))).map((b) => b.toString(16).padStart(2, "0")).join("");
    const { error } = await supabase.from("settings").update({ command_center_api_key: newKey }).eq("id", form.id);
    if (error) toast.error(error.message);
    else { setForm({ ...form, command_center_api_key: newKey }); toast.success("API key regenerated"); }
  };

  const copy = (val: string) => { navigator.clipboard.writeText(val); toast.success("Copied"); };
  const webhookUrl = `${window.location.origin}/api/command-center`;

  return (
    <PageContainer>
      <PageHeader title="Settings" description="Company info, defaults, integrations" action={<Button onClick={save}>Save changes</Button>} />

      <div className="space-y-4">
        <Card className="shadow-card"><CardHeader><CardTitle className="text-base">Company Info</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Field label="Name"><Input value={form.company_name || ""} onChange={(e) => set("company_name", e.target.value)} /></Field>
            <Field label="Email"><Input type="email" value={form.company_email || ""} onChange={(e) => set("company_email", e.target.value)} /></Field>
            <Field label="Phone"><Input value={form.company_phone || ""} onChange={(e) => set("company_phone", e.target.value)} /></Field>
            <div className="col-span-2"><Field label="Address"><Textarea rows={2} value={form.company_address || ""} onChange={(e) => set("company_address", e.target.value)} /></Field></div>
          </CardContent></Card>

        <Card className="shadow-card"><CardHeader><CardTitle className="text-base">Defaults</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Field label="Default payment terms"><Input value={form.default_payment_terms || ""} onChange={(e) => set("default_payment_terms", e.target.value)} /></Field>
            <Field label="Default tax rate (e.g. 0.08)"><Input type="number" step="0.0001" value={form.default_tax_rate ?? 0} onChange={(e) => set("default_tax_rate", Number(e.target.value))} /></Field>
          </CardContent></Card>

        <Card className="shadow-card"><CardHeader><CardTitle className="text-base">Numbering</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Field label="Next invoice #"><Input type="number" value={form.next_invoice_number} onChange={(e) => set("next_invoice_number", Number(e.target.value))} /></Field>
            <Field label="Next PO #"><Input type="number" value={form.next_po_number} onChange={(e) => set("next_po_number", Number(e.target.value))} /></Field>
          </CardContent></Card>

        <ProductsServicesSettings />
        <ExpenseCategoriesSettings />

        <Card className="shadow-card"><CardHeader><CardTitle className="text-base">Integrations</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="n8n email webhook URL">
              <Input value={form.email_webhook_url || ""} onChange={(e) => set("email_webhook_url", e.target.value)} placeholder="https://n8n.example.com/webhook/..." />
            </Field>
            <div>
              <Label className="text-xs">Command Center API key</Label>
              <div className="flex gap-2 mt-1.5">
                <Input value={form.command_center_api_key || ""} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copy(form.command_center_api_key)}><Copy className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={regenerateKey}><RefreshCw className="h-4 w-4" /></Button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Command Center webhook URL (POST here from Command Center)</Label>
              <div className="flex gap-2 mt-1.5">
                <Input value={webhookUrl} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copy(webhookUrl)}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardContent></Card>
      </div>
    </PageContainer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
