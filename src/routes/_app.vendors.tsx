import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { VendorDialog, type VendorForm } from "@/components/vendor-dialog";
import { formatCurrency } from "@/lib/format";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/vendors")({ component: VendorsPage });

function VendorsPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VendorForm | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const { data: v } = await supabase.from("vendors").select("*").order("company_name");
      const { data: bills } = await supabase.from("bills").select("vendor_id,total,status");
      const totals: Record<string, { spent: number; outstanding: number }> = {};
      (bills || []).forEach((r: any) => {
        if (!r.vendor_id) return;
        totals[r.vendor_id] = totals[r.vendor_id] || { spent: 0, outstanding: 0 };
        totals[r.vendor_id].spent += Number(r.total);
        if (r.status === "unpaid") totals[r.vendor_id].outstanding += Number(r.total);
      });
      return (v || []).map((x: any) => ({ ...x, totals: totals[x.id] || { spent: 0, outstanding: 0 } }));
    },
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return (data || []).filter((c: any) =>
      c.company_name.toLowerCase().includes(s) ||
      (c.contact_name || "").toLowerCase().includes(s) ||
      (c.email || "").toLowerCase().includes(s)
    );
  }, [data, search]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("vendors").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Vendor deleted"); qc.invalidateQueries({ queryKey: ["vendors"] }); }
  };

  return (
    <PageContainer>
      <PageHeader title="Vendors" description="Suppliers and contractors"
        action={<Button onClick={() => { setEditing(null); setOpen(true); }} style={{ background: "#997839", color: "white" }}><Plus className="h-4 w-4 mr-2" /> New Vendor</Button>} />

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search vendors…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card className="shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase">Company</th>
                <th className="px-4 py-3 text-left text-xs uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs uppercase">Phone</th>
                <th className="px-4 py-3 text-right text-xs uppercase">Total Spent</th>
                <th className="px-4 py-3 text-right text-xs uppercase">Outstanding</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr> :
              filtered.length === 0 ? <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">No vendors yet.</td></tr> :
              filtered.map((c: any) => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3"><Link to="/vendors/$id" params={{ id: c.id }} className="font-medium hover:text-primary">{c.company_name}</Link></td>
                  <td className="px-4 py-3">{c.contact_name || "—"}</td>
                  <td className="px-4 py-3">{c.email || "—"}</td>
                  <td className="px-4 py-3">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(c.totals.spent)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(c.totals.outstanding)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete {c.company_name}?</AlertDialogTitle><AlertDialogDescription>Cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove(c.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <VendorDialog key={editing?.id || "new"} open={open} onOpenChange={setOpen} initial={editing} />
    </PageContainer>
  );
}
