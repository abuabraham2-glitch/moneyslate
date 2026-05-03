import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { DateRangeFilter, getPresetRange, type DateRange } from "@/components/date-range-filter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  TrendingUp, TrendingDown, DollarSign, FileText, AlertCircle, Receipt,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function Dashboard() {
  const [range, setRange] = useState<DateRange>(() => ({ preset: "this_month", ...getPresetRange("this_month") }));

  const { data: kpis } = useQuery({
    queryKey: ["dashboard-kpis", range.from, range.to],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const in14 = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

      const [revenue, paidBills, expenses, openInv, overdueInv, billsSoon] = await Promise.all([
        supabase.from("invoices").select("total").eq("status", "paid").gte("date_paid", range.from).lte("date_paid", range.to),
        supabase.from("bills").select("total").eq("status", "paid").gte("date_paid", range.from).lte("date_paid", range.to),
        supabase.from("expenses").select("amount").gte("expense_date", range.from).lte("expense_date", range.to),
        supabase.from("invoices").select("total").neq("status", "paid"),
        supabase.from("invoices").select("total").neq("status", "paid").lt("due_date", today),
        supabase.from("bills").select("total").eq("status", "unpaid").lte("due_date", in14).gte("due_date", today),
      ]);

      const sum = (rows: any[] | null, key: string) => (rows || []).reduce((a, r) => a + Number(r[key] || 0), 0);
      const rev = sum(revenue.data, "total");
      const exp = sum(paidBills.data, "total") + sum(expenses.data, "amount");
      return {
        revenue: rev,
        expenses: exp,
        net: rev - exp,
        outstanding: sum(openInv.data, "total"),
        overdue: sum(overdueInv.data, "total"),
        billsSoon: sum(billsSoon.data, "total"),
      };
    },
  });

  const { data: trend } = useQuery({
    queryKey: ["dashboard-trend"],
    queryFn: async () => {
      const start = new Date();
      start.setMonth(start.getMonth() - 11);
      start.setDate(1);
      const startStr = start.toISOString().slice(0, 10);
      const [inv, bills, exps] = await Promise.all([
        supabase.from("invoices").select("total,date_paid").eq("status", "paid").gte("date_paid", startStr),
        supabase.from("bills").select("total,date_paid").eq("status", "paid").gte("date_paid", startStr),
        supabase.from("expenses").select("amount,expense_date").gte("expense_date", startStr),
      ]);
      const months: Record<string, { month: string; revenue: number; expenses: number }> = {};
      for (let i = 0; i < 12; i++) {
        const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
        const key = d.toISOString().slice(0, 7);
        months[key] = { month: d.toLocaleDateString("en-US", { month: "short" }), revenue: 0, expenses: 0 };
      }
      (inv.data || []).forEach((r) => { const k = (r.date_paid || "").slice(0, 7); if (months[k]) months[k].revenue += Number(r.total); });
      (bills.data || []).forEach((r) => { const k = (r.date_paid || "").slice(0, 7); if (months[k]) months[k].expenses += Number(r.total); });
      (exps.data || []).forEach((r) => { const k = (r.expense_date || "").slice(0, 7); if (months[k]) months[k].expenses += Number(r.amount); });
      return Object.values(months);
    },
  });

  const { data: invStatus } = useQuery({
    queryKey: ["dashboard-inv-status"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase.from("invoices").select("status,due_date,total");
      const buckets = { paid: 0, sent: 0, overdue: 0, draft: 0 };
      (data || []).forEach((r: any) => {
        if (r.status === "paid") buckets.paid += Number(r.total);
        else if (r.status === "draft") buckets.draft += Number(r.total);
        else if (r.due_date && r.due_date < today) buckets.overdue += Number(r.total);
        else buckets.sent += Number(r.total);
      });
      return [
        { name: "Paid", value: buckets.paid, color: "var(--success)" },
        { name: "Sent", value: buckets.sent, color: "var(--warning)" },
        { name: "Overdue", value: buckets.overdue, color: "var(--destructive)" },
        { name: "Draft", value: buckets.draft, color: "var(--muted-foreground)" },
      ].filter((b) => b.value > 0);
    },
  });

  const { data: topClients } = useQuery({
    queryKey: ["dashboard-top-clients"],
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices")
        .select("total,client:clients(company_name)")
        .eq("status", "paid");
      const map: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        const name = r.client?.company_name || "—";
        map[name] = (map[name] || 0) + Number(r.total);
      });
      return Object.entries(map)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    },
  });

  const { data: activity } = useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: async () => {
      const { data } = await supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
  });

  const { data: upcomingInv } = useQuery({
    queryKey: ["dashboard-upcoming-inv"],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("id,invoice_number,total,due_date,client:clients(company_name)").neq("status", "paid").order("due_date").limit(7);
      return data || [];
    },
  });

  const { data: upcomingBills } = useQuery({
    queryKey: ["dashboard-upcoming-bills"],
    queryFn: async () => {
      const { data } = await supabase.from("bills").select("id,bill_number,total,due_date,vendor:vendors(company_name)").eq("status", "unpaid").order("due_date").limit(7);
      return data || [];
    },
  });

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description="Real-time view of your finances"
        action={<DateRangeFilter value={range} onChange={setRange} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Revenue" value={formatCurrency(kpis?.revenue)} tone="success" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Expenses" value={formatCurrency(kpis?.expenses)} tone="destructive" icon={<TrendingDown className="h-4 w-4" />} />
        <StatCard label="Net Profit" value={formatCurrency(kpis?.net)} tone={(kpis?.net ?? 0) >= 0 ? "success" : "destructive"} icon={<DollarSign className="h-4 w-4" />} />
        <StatCard label="Outstanding Invoices" value={formatCurrency(kpis?.outstanding)} hint="All open" icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Overdue Invoices" value={formatCurrency(kpis?.overdue)} tone="destructive" icon={<AlertCircle className="h-4 w-4" />} />
        <StatCard label="Bills Due Soon" value={formatCurrency(kpis?.billsSoon)} hint="Next 14 days" tone="warning" icon={<Receipt className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader><CardTitle className="text-base">Revenue vs Expenses · Last 12 months</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: any) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="revenue" fill="var(--success)" name="Revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="var(--destructive)" name="Expenses" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Invoice Status</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={invStatus || []} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {(invStatus || []).map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatCurrency(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Top Clients by Revenue</CardTitle></CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topClients || []} layout="vertical">
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={11} width={90} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="total" fill="var(--primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Upcoming Invoices</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(upcomingInv || []).length === 0 && <p className="text-sm text-muted-foreground">No open invoices</p>}
            {(upcomingInv || []).map((i: any) => (
              <div key={i.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                <div>
                  <p className="font-medium">{i.invoice_number}</p>
                  <p className="text-xs text-muted-foreground">{i.client?.company_name} · {formatDate(i.due_date)}</p>
                </div>
                <span className="font-medium">{formatCurrency(i.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Bills Due Soon</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(upcomingBills || []).length === 0 && <p className="text-sm text-muted-foreground">No bills due</p>}
            {(upcomingBills || []).map((b: any) => (
              <div key={b.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                <div>
                  <p className="font-medium">{b.bill_number}</p>
                  <p className="text-xs text-muted-foreground">{b.vendor?.company_name} · {formatDate(b.due_date)}</p>
                </div>
                <span className="font-medium">{formatCurrency(b.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card mt-6">
        <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
        <CardContent>
          {(activity || []).length === 0 && <p className="text-sm text-muted-foreground">No activity yet</p>}
          <div className="space-y-2">
            {(activity || []).map((a: any) => (
              <div key={a.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                <span>{a.description}</span>
                <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
