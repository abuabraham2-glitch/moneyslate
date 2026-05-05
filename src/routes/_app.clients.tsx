import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { ClientDialog, type ClientForm } from "@/components/client-dialog";
import { formatCurrency } from "@/lib/format";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/clients")({ component: ClientsPage });

function ClientsPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClientForm | null>(null);
  const qc = useQueryClient();

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
      return (clients || []).map((c: any) => ({ ...c, totals: totals[c.id] || { invoiced: 0, outstanding: 0 } }));
    },
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return (data || []).filter((c: any) =>
      c.company_name.toLowerCase().includes(s) ||
      (c.contact_name || "").toLowerCase().includes(s) ||
      (c.contact_email || "").toLowerCase().includes(s)
    );
  }, [data, search]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Client deleted"); qc.invalidateQueries({ queryKey: ["clients"] }); }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Clients"
        description="Manage customers and their billing details"
        action={
          <Button onClick={() => { setEditing(null); setOpen(true); }} style={{ background: "#997839", color: "white" }}>
            <Plus className="h-4 w-4 mr-2" /> New Client
          </Button>
        }
      />

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search clients…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card className="shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <Th>Company</Th><Th>Contact</Th><Th>Email</Th><Th>Phone</Th>
                <Th className="text-right">Invoiced</Th><Th className="text-right">Outstanding</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">No clients yet. Add your first one.</td></tr>
              ) : filtered.map((c: any) => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <Td>
                    <Link to="/clients/$id" params={{ id: c.id }} className="font-medium hover:text-primary">{c.company_name}</Link>
                  </Td>
                  <Td>{c.contact_name || "—"}</Td>
                  <Td>{c.contact_email || "—"}</Td>
                  <Td>{c.contact_phone || "—"}</Td>
                  <Td className="text-right">{formatCurrency(c.totals.invoiced)}</Td>
                  <Td className="text-right font-medium">{formatCurrency(c.totals.outstanding)}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {c.company_name}?</AlertDialogTitle>
                            <AlertDialogDescription>This cannot be undone. Linked invoices will block deletion.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove(c.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <ClientDialog key={editing?.id || "new"} open={open} onOpenChange={setOpen} initial={editing} />
    </PageContainer>
  );
}

function Th({ children, className = "" }: any) {
  return <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: any) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
