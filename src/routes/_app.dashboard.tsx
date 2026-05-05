import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function relativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const target = new Date(dateStr.length === 10 ? dateStr + "T00:00:00" : dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = new Date(target);
  t.setHours(0, 0, 0, 0);
  const diff = Math.round((t.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "today";
  if (diff === -1) return "yesterday";
  if (diff === 1) return "tomorrow";
  if (diff < 0 && diff >= -6) return `${-diff} days ago`;
  if (diff > 0 && diff <= 6) return `in ${diff} days`;
  if (diff > 6 && diff <= 13) return "in a week";
  if (diff < -6 && diff >= -13) return "a week ago";
  if (diff > 0) return `in ${Math.round(diff / 7)} weeks`;
  return `${Math.round(-diff / 7)} weeks ago`;
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
}

function Dashboard() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const user = session?.user;
  const meta = (user?.user_metadata as any) || {};
  const firstName = meta.first_name || meta.full_name?.split(" ")[0] || (user?.email ? user.email.split("@")[0] : "there");

  const now = new Date();
  const dateLine = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).replace(",", " ·");
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const { data: actions } = useQuery({
    queryKey: ["dash-actions"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const in14 = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

      const [draftsRes, billsRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("id, invoice_number, total, created_at, client:clients(company_name), invoice_line_items(id)")
          .eq("status", "draft")
          .order("created_at", { ascending: true }),
        supabase
          .from("bills")
          .select("id, total, due_date, vendor:vendors(company_name)")
          .eq("status", "unpaid")
          .not("due_date", "is", null)
          .lte("due_date", in14)
          .gte("due_date", today)
          .order("due_date", { ascending: true })
          .limit(1),
      ]);

      const drafts = (draftsRes.data || []).filter((i: any) => (i.invoice_line_items || []).length > 0);
      const sendable = drafts[0] || null;
      const bill = (billsRes.data || [])[0] || null;
      const allDrafts = draftsRes.data || [];

      return { sendable, bill, allDrafts };
    },
  });

  const { data: kpis } = useQuery({
    queryKey: ["dash-kpis"],
    queryFn: async () => {
      const start = new Date();
      start.setDate(1);
      const startStr = start.toISOString().slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);
      const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

      const [invMonth, billsMonth, expMonth, openInv, billsDue] = await Promise.all([
        supabase.from("invoices").select("total").gte("issue_date", startStr),
        supabase.from("bills").select("total").gte("bill_date", startStr),
        supabase.from("expenses").select("amount").gte("expense_date", startStr),
        supabase.from("invoices").select("total").neq("status", "paid"),
        supabase.from("bills").select("total").eq("status", "unpaid").gte("due_date", today).lte("due_date", in30),
      ]);

      const sum = (rows: any[] | null, key: string) => (rows || []).reduce((a, r) => a + Number(r[key] || 0), 0);
      return {
        revenue: sum(invMonth.data, "total"),
        expenses: sum(billsMonth.data, "total") + sum(expMonth.data, "amount"),
        openAR: sum(openInv.data, "total"),
        billsDue: sum(billsDue.data, "total"),
      };
    },
  });

  const items: React.ReactNode[] = [];

  if (actions?.sendable) {
    const inv: any = actions.sendable;
    items.push(
      <ActionItem
        key="send"
        title={`Send ${inv.invoice_number} to ${inv.client?.company_name || "client"}`}
        description={`Order completed ${relativeDate(inv.created_at)} · ${fmtMoney(Number(inv.total))}`}
        button={{ label: "Send", primary: true, onClick: () => navigate({ to: "/invoices/$id", params: { id: inv.id } }) }}
      />,
    );
  }

  if (actions?.bill) {
    const b: any = actions.bill;
    items.push(
      <ActionItem
        key="pay"
        dot
        title={`Pay ${b.vendor?.company_name || "vendor"} bill`}
        description={`Due ${relativeDate(b.due_date)} · ${fmtMoney(Number(b.total))}`}
        button={{ label: "Pay", onClick: () => navigate({ to: "/bills/$id", params: { id: b.id } }) }}
      />,
    );
  }

  if (actions?.allDrafts && actions.allDrafts.length > 0) {
    const drafts = actions.allDrafts;
    const numbers = drafts.slice(0, 3).map((d: any) => d.invoice_number).join(", ") + (drafts.length > 3 ? "…" : "");
    const oldest = drafts[0]?.created_at;
    items.push(
      <ActionItem
        key="review"
        title={`Review ${drafts.length} draft invoice${drafts.length === 1 ? "" : "s"}`}
        description={`${numbers} · waiting since ${relativeDate(oldest)}`}
        button={{ label: "Review", onClick: () => navigate({ to: "/invoices" }) }}
      />,
    );
  }

  return (
    <div style={{ background: "#232929", minHeight: "100%", padding: "32px 24px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif" }}>
        {/* Greeting */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#A39E96", letterSpacing: "0.5px" }}>{dateLine}</div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "#D8E5D2", margin: "4px 0 0" }}>
            {greeting}, {firstName}
          </h1>
        </div>

        {/* Hero */}
        {items.length === 0 ? (
          <div style={{ textAlign: "center", color: "#A39E96", fontSize: 14, padding: "40px 0" }}>All clear!</div>
        ) : (
          <div style={{ background: "#D8E5D2", borderRadius: 12, padding: 20, marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#232929" }}>
                {items.length} thing{items.length === 1 ? "" : "s"} need{items.length === 1 ? "s" : ""} your attention today
              </span>
              <span style={{ fontSize: 12, color: "#4A5A5A" }}>~{items.length * 3 + 1} min</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{items}</div>
          </div>
        )}

        {/* KPI strip */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: "#A39E96", marginBottom: 8, letterSpacing: "0.5px" }}>This month at a glance</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            <KpiCard label="Revenue" value={fmtMoney(kpis?.revenue ?? 0)} />
            <KpiCard label="Expenses" value={fmtMoney(kpis?.expenses ?? 0)} />
            <KpiCard label="Open AR" value={fmtMoney(kpis?.openAR ?? 0)} />
            <KpiCard label="Bills due" value={fmtMoney(kpis?.billsDue ?? 0)} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", paddingTop: 16 }}>
          <Link to="/reports" style={{ fontSize: 13, color: "#A39E96", textDecoration: "none" }}>
            See charts and reports →
          </Link>
        </div>
      </div>
    </div>
  );
}

function ActionItem({
  title,
  description,
  button,
  dot,
}: {
  title: string;
  description: string;
  button: { label: string; onClick: () => void; primary?: boolean };
  dot?: boolean;
}) {
  return (
    <div
      style={{
        background: "#C8D7C0",
        borderRadius: 8,
        padding: "12px 14px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, color: "#232929", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
          {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#997839", display: "inline-block" }} />}
          <span>{title}</span>
        </div>
        <div style={{ fontSize: 12, color: "#4A5A5A", marginTop: 2, marginLeft: dot ? 14 : 0 }}>{description}</div>
      </div>
      <button
        onClick={button.onClick}
        style={{
          fontSize: 13,
          padding: "6px 14px",
          borderRadius: 8,
          fontWeight: 500,
          cursor: "pointer",
          background: button.primary ? "#232929" : "transparent",
          color: button.primary ? "#D8E5D2" : "#232929",
          border: button.primary ? "none" : "0.5px solid rgba(35,41,41,0.3)",
          flexShrink: 0,
        }}
      >
        {button.label}
      </button>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#2D3838", borderRadius: 8, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: "#A39E96" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 500, color: "#D8E5D2", marginTop: 2 }}>{value}</div>
    </div>
  );
}
