import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberInput } from "@/components/number-input";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  name: string;
  default_description: string | null;
  default_price: number | null;
  default_cost: number | null;
  type: "product" | "service";
  active: boolean;
};

export function ProductsServicesSettings() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Partial<Row>>({ name: "", type: "service" });

  const { data = [] } = useQuery<Row[]>({
    queryKey: ["products_services_admin"],
    queryFn: async () => {
      const { data } = await supabase.from("products_services").select("*").order("sort_order").order("name");
      return (data as any) || [];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["products_services_admin"] });
    qc.invalidateQueries({ queryKey: ["products_services"] });
  };

  const update = async (id: string, patch: Partial<Row>) => {
    const { error } = await supabase.from("products_services").update(patch).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    const { error } = await supabase.from("products_services").delete().eq("id", id);
    if (error) toast.error(error.message); else { refresh(); toast.success("Deleted"); }
  };
  const create = async () => {
    if (!draft.name?.trim()) { toast.error("Name required"); return; }
    const { error } = await supabase.from("products_services").insert({
      name: draft.name.trim(),
      default_description: draft.default_description || null,
      default_price: draft.default_price ?? null,
      default_cost: draft.default_cost ?? null,
      type: draft.type || "service",
    });
    if (error) { toast.error(error.message); return; }
    setDraft({ name: "", type: "service" });
    setAdding(false);
    refresh();
    toast.success("Added");
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Products & Services</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="h-4 w-4 mr-1" /> Add</Button>
      </CardHeader>
      <CardContent>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 text-xs uppercase">Name</th>
                <th className="text-left px-3 py-2 text-xs uppercase">Default description</th>
                <th className="text-right px-3 py-2 text-xs uppercase w-28">Price</th>
                <th className="text-right px-3 py-2 text-xs uppercase w-28">Cost</th>
                <th className="text-center px-3 py-2 text-xs uppercase w-20">Active</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {adding && (
                <tr className="border-t border-border bg-muted/20">
                  <td className="px-2 py-1.5"><Input value={draft.name || ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" /></td>
                  <td className="px-2 py-1.5"><Input value={draft.default_description || ""} onChange={(e) => setDraft({ ...draft, default_description: e.target.value })} /></td>
                  <td className="px-2 py-1.5"><NumberInput value={draft.default_price ?? 0} onChange={(n) => setDraft({ ...draft, default_price: n })} className="text-right" /></td>
                  <td className="px-2 py-1.5"><NumberInput value={draft.default_cost ?? 0} onChange={(n) => setDraft({ ...draft, default_cost: n })} className="text-right" /></td>
                  <td className="px-2 py-1.5 text-center">—</td>
                  <td className="px-1 py-1 text-right whitespace-nowrap">
                    <Button size="sm" onClick={create}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setDraft({ name: "", type: "service" }); }}>×</Button>
                  </td>
                </tr>
              )}
              {data.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-2 py-1.5"><Input defaultValue={r.name} onBlur={(e) => e.target.value !== r.name && update(r.id, { name: e.target.value })} className="border-0 shadow-none focus-visible:ring-1" /></td>
                  <td className="px-2 py-1.5"><Input defaultValue={r.default_description || ""} onBlur={(e) => update(r.id, { default_description: e.target.value || null })} className="border-0 shadow-none focus-visible:ring-1" /></td>
                  <td className="px-2 py-1.5"><NumberInput value={r.default_price ?? 0} onChange={(n) => update(r.id, { default_price: n })} className="border-0 shadow-none text-right focus-visible:ring-1" /></td>
                  <td className="px-2 py-1.5"><NumberInput value={r.default_cost ?? 0} onChange={(n) => update(r.id, { default_cost: n })} className="border-0 shadow-none text-right focus-visible:ring-1" /></td>
                  <td className="px-2 py-1.5 text-center">
                    <input type="checkbox" checked={r.active} onChange={(e) => update(r.id, { active: e.target.checked })} />
                  </td>
                  <td className="px-1 py-1"><Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button></td>
                </tr>
              ))}
              {data.length === 0 && !adding && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No items yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
