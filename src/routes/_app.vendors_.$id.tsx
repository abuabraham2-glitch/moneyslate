import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/vendors_/$id")({ component: VendorDetail });

function VendorDetail() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["vendor", id],
    queryFn: async () => {
      const [v, pos, bills] = await Promise.all([
        supabase.from("vendors").select("*").eq("id", id).single(),
        supabase.from("purchase_orders").select("*").eq("vendor_id", id).order("issue_date", { ascending: false }),
        supabase.from("bills").select("*").eq("vendor_id", id).order("bill_date", { ascending: false }),
      ]);
      return { vendor: v.data, pos: pos.data || [], bills: bills.data || [] };
    },
  });

  if (!data?.vendor) return <PageContainer>Loading…</PageContainer>;
  const v = data.vendor;
  const totalSpent = data.bills.reduce((s: number, b: any) => s + Number(b.total), 0);
  const outstanding = data.bills.filter((b: any) => b.status === "unpaid").reduce((s: number, b: any) => s + Number(b.total), 0);

  return (
    <PageContainer>
      <Link to="/vendors" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to vendors
      </Link>
      <PageHeader title={v.company_name} description={v.contact_name || ""} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="shadow-card"><CardHeader><CardTitle className="text-sm text-muted-foreground">Total Spent</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{formatCurrency(totalSpent)}</p></CardContent></Card>
        <Card className="shadow-card"><CardHeader><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{formatCurrency(outstanding)}</p></CardContent></Card>
        <Card className="shadow-card"><CardHeader><CardTitle className="text-sm text-muted-foreground">Payment Terms</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{v.payment_terms || "—"}</p></CardContent></Card>
      </div>

      <Card className="shadow-card mb-4">
        <CardHeader><CardTitle className="text-base">Purchase Orders</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40"><tr><th className="text-left px-4 py-2 text-xs uppercase">PO #</th><th className="text-left px-4 py-2 text-xs uppercase">Date</th><th className="text-left px-4 py-2 text-xs uppercase">Status</th><th className="text-right px-4 py-2 text-xs uppercase">Total</th></tr></thead>
            <tbody>
              {data.pos.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">None</td></tr>}
              {data.pos.map((p: any) => (
                <tr key={p.id} className="border-t"><td className="px-4 py-2"><Link to="/purchase-orders/$id" params={{ id: p.id }} className="font-medium hover:text-primary">{p.po_number}</Link></td><td className="px-4 py-2">{formatDate(p.issue_date)}</td><td className="px-4 py-2"><StatusBadge status={p.status} /></td><td className="px-4 py-2 text-right">{formatCurrency(p.total)}</td></tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Bills</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40"><tr><th className="text-left px-4 py-2 text-xs uppercase">Bill #</th><th className="text-left px-4 py-2 text-xs uppercase">Date</th><th className="text-left px-4 py-2 text-xs uppercase">Due</th><th className="text-left px-4 py-2 text-xs uppercase">Status</th><th className="text-right px-4 py-2 text-xs uppercase">Total</th></tr></thead>
            <tbody>
              {data.bills.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">None</td></tr>}
              {data.bills.map((b: any) => (
                <tr key={b.id} className="border-t"><td className="px-4 py-2"><Link to="/bills/$id" params={{ id: b.id }} className="font-medium hover:text-primary">{b.bill_number}</Link></td><td className="px-4 py-2">{formatDate(b.bill_date)}</td><td className="px-4 py-2">{formatDate(b.due_date)}</td><td className="px-4 py-2"><StatusBadge status={b.status} dueDate={b.due_date} /></td><td className="px-4 py-2 text-right">{formatCurrency(b.total)}</td></tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
