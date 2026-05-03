import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/clients_/$id")({ component: ClientDetail });

function ClientDetail() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const [client, invoices] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).single(),
        supabase.from("invoices").select("*").eq("client_id", id).order("issue_date", { ascending: false }),
      ]);
      return { client: client.data, invoices: invoices.data || [] };
    },
  });

  if (!data?.client) return <PageContainer>Loading…</PageContainer>;
  const c = data.client;
  const totalInvoiced = data.invoices.reduce((s: number, i: any) => s + Number(i.total), 0);
  const outstanding = data.invoices.filter((i: any) => i.status !== "paid").reduce((s: number, i: any) => s + Number(i.total), 0);

  return (
    <PageContainer>
      <Link to="/clients" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to clients
      </Link>
      <PageHeader title={c.company_name} description={c.contact_name || ""} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="shadow-card"><CardHeader><CardTitle className="text-sm text-muted-foreground">Total Invoiced</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{formatCurrency(totalInvoiced)}</p></CardContent></Card>
        <Card className="shadow-card"><CardHeader><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{formatCurrency(outstanding)}</p></CardContent></Card>
        <Card className="shadow-card"><CardHeader><CardTitle className="text-sm text-muted-foreground">Payment Terms</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{c.payment_terms || "—"}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{c.contact_name || "—"}</p>
            <p className="text-muted-foreground">{c.contact_email || "—"}</p>
            <p className="text-muted-foreground">{c.contact_phone || "—"}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Billing Address</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {c.billing_street ? <>{c.billing_street}<br />{c.billing_city}, {c.billing_state} {c.billing_zip}</> : "—"}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Invoice History</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr><th className="text-left px-4 py-2 text-xs uppercase">Number</th><th className="text-left px-4 py-2 text-xs uppercase">Date</th><th className="text-left px-4 py-2 text-xs uppercase">Due</th><th className="text-left px-4 py-2 text-xs uppercase">Status</th><th className="text-right px-4 py-2 text-xs uppercase">Total</th></tr>
            </thead>
            <tbody>
              {data.invoices.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No invoices yet</td></tr>}
              {data.invoices.map((i: any) => (
                <tr key={i.id} className="border-t border-border">
                  <td className="px-4 py-2"><Link to="/invoices/$id" params={{ id: i.id }} className="font-medium hover:text-primary">{i.invoice_number}</Link></td>
                  <td className="px-4 py-2">{formatDate(i.issue_date)}</td>
                  <td className="px-4 py-2">{formatDate(i.due_date)}</td>
                  <td className="px-4 py-2"><StatusBadge status={i.status} dueDate={i.due_date} /></td>
                  <td className="px-4 py-2 text-right">{formatCurrency(i.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
