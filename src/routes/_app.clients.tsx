import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";

export const Route = createFileRoute("/_app/clients")({ component: ClientsPage });

type ClientRow = {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  archived: boolean;
  totals: { invoiced: number; outstanding: number };
};

function ClientsPage() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [selected, setSelected] = useState<ClientRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data: clients } = await supabase.from("clients").select("*").order("company_name");
      const { data: inv } = await supabase.from("invoices").select("client_id,total,status");
      const totals: Record<string, { invoiced: number; outstanding: number }> = {};
      (inv || []).forEach((r: any) => {
        if (!r.client_id) return;
        totals[r.client_id] = totals[r.client_id] || { invoiced: 0, outstanding: 0 };
        totals[r.client_id].invoiced += Number(r.total);
        if (r.status !== "paid") totals[r.client_id].outstanding += Number(r.total);
      });
      return (clients || []).map((c: any) => ({
        ...c,
        totals: totals[c.id] || { invoiced: 0, outstanding: 0 },
      })) as ClientRow[];
    },
  });

  const { data: peekInvoices } = useQuery({
    queryKey: ["client-peek", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices")
        .select("invoice_number,issue_date,total,status,due_date")
        .eq("client_id", selected!.id)
        .order("issue_date", { ascending: false })
        .limit(3);
      return data || [];
    },
  });

  const all = data || [];
  const activeCount = all.filter((c) => !c.archived).length;
  const archivedCount = all.filter((c) => c.archived).length;

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return all
      .filter((c) => (tab === "active" ? !c.archived : c.archived))
      .filter(
        (c) =>
          c.company_name.toLowerCase().includes(s) ||
          (c.contact_name || "").toLowerCase().includes(s) ||
          (c.contact_email || "").toLowerCase().includes(s),
      );
  }, [all, search, tab]);

  const pillBase: React.CSSProperties = {
    padding: "7px 16px",
    fontSize: 13,
    borderRadius: 9999,
    cursor: "pointer",
    border: "none",
  };
  const selectedPill: React.CSSProperties = { ...pillBase, background: "#D8E5D2", color: "#232929" };
  const unselectedPill: React.CSSProperties = { ...pillBase, background: "#2D3838", color: "#A39E96" };

  return (
    <PageContainer>
      <PageHeader title="Clients" description="Customers synced from the Command Center" />

      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          style={tab === "active" ? selectedPill : unselectedPill}
          onClick={() => setTab("active")}
        >
          Active ({activeCount})
        </button>
        <button
          type="button"
          style={tab === "archived" ? selectedPill : unselectedPill}
          onClick={() => setTab("archived")}
        >
          Archived ({archivedCount})
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="p-10 text-center text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center text-muted-foreground">No clients found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const outstanding = Number(c.totals.outstanding) || 0;
            return (
              <div
                key={c.id}
                onClick={() => setSelected(c)}
                className="block cursor-pointer"
                style={{
                  background: "#2D3838",
                  borderRadius: 12,
                  padding: "1rem 1.1rem",
                }}
              >
                <div style={{ fontSize: 17, fontWeight: 500, color: "#D8E5D2" }}>
                  {c.company_name}
                </div>
                <div style={{ fontSize: 13, color: "#A39E96", marginTop: 2 }}>
                  {c.contact_name || "—"}
                </div>
                <div style={{ borderTop: "0.5px solid #3a4646", margin: "12px 0 10px" }} />
                {c.contact_email ? (
                  <div style={{ fontSize: 13, color: "#D8E5D2" }}>{c.contact_email}</div>
                ) : (
                  <div style={{ fontSize: 13, color: "#A39E96" }}>No contact email</div>
                )}
                {c.contact_phone && (
                  <div style={{ fontSize: 13, color: "#A39E96", marginTop: 3 }}>
                    {c.contact_phone}
                  </div>
                )}
                {outstanding > 0 && (
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: "#E24B4A",
                      marginTop: 12,
                    }}
                  >
                    {formatCurrency(outstanding)} owed
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent
          className="border-0"
          style={{ maxWidth: 440, background: "#2D3838" }}
        >
          {selected && (
            <div className="flex flex-col gap-4">
              <div>
                <div style={{ fontSize: 22, fontWeight: 500, color: "#D8E5D2" }}>
                  {selected.company_name}
                </div>
                <div style={{ fontSize: 13, color: "#A39E96", marginTop: 2 }}>
                  {selected.contact_name || ""}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#A39E96",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Contact
                </div>
                <div style={{ fontSize: 13, color: "#D8E5D2" }}>
                  {selected.contact_email || "—"}
                </div>
                {selected.contact_phone && (
                  <div style={{ fontSize: 13, color: "#A39E96", marginTop: 2 }}>
                    {selected.contact_phone}
                  </div>
                )}
              </div>

              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#A39E96",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Recent Invoices
                </div>
                {peekInvoices && peekInvoices.length > 0 ? (
                  <div>
                    {peekInvoices.map((inv: any, idx: number) => {
                      const unpaid = inv.status !== "paid";
                      return (
                        <div
                          key={inv.invoice_number + idx}
                          className="flex items-center justify-between gap-3"
                          style={{
                            padding: "8px 0",
                            borderTop: idx === 0 ? "none" : "0.5px solid #3a4646",
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div style={{ fontSize: 13, color: "#D8E5D2" }}>
                              {inv.invoice_number}
                            </div>
                            <div style={{ fontSize: 12, color: "#A39E96" }}>
                              {formatDate(inv.issue_date)}
                            </div>
                            <StatusBadge status={inv.status} dueDate={inv.due_date} />
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: unpaid ? "#E24B4A" : "#D8E5D2",
                            }}
                          >
                            {formatCurrency(inv.total)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "#A39E96" }}>No invoices yet</div>
                )}
              </div>

              <Link
                to="/clients/$id"
                params={{ id: selected.id }}
                className="block w-full text-center"
                style={{
                  background: "#997839",
                  color: "#ffffff",
                  borderRadius: 8,
                  padding: "10px 16px",
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                View full details →
              </Link>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
