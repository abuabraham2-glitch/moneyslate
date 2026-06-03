import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { EntityCombobox } from "@/components/entity-combobox";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Row = { id: string; name: string };

export function ExpenseCategoriesSettings() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [reassign, setReassign] = useState<{ id: string; name: string; count: number; target: string | null } | null>(null);
  const [reassigning, setReassigning] = useState(false);

  const { data = [] } = useQuery<Row[]>({
    queryKey: ["expense_categories_admin"],
    queryFn: async () => {
      const { data } = await supabase.from("expense_categories").select("id,name").order("sort_order").order("name");
      return (data as any) || [];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["expense_categories_admin"] });
    qc.invalidateQueries({ queryKey: ["expense-categories"] });
  };

  const update = async (id: string, patch: Partial<Row>) => {
    const { error } = await supabase.from("expense_categories").update(patch).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  };

  const create = async () => {
    const name = draftName.trim();
    if (!name) { toast.error("Name required"); return; }
    const { error } = await supabase.from("expense_categories").insert({ name });
    if (error) { toast.error(error.message); return; }
    setDraftName("");
    setAdding(false);
    refresh();
    toast.success("Added");
  };

  const onDeleteClick = async (row: Row) => {
    const { count, error } = await supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("category_id", row.id);
    if (error) { toast.error(error.message); return; }
    const n = count ?? 0;
    if (n === 0) {
      if (!confirm("Delete this category?")) return;
      const { error: delErr } = await supabase.from("expense_categories").delete().eq("id", row.id);
      if (delErr) { toast.error(delErr.message); return; }
      refresh();
      toast.success("Deleted");
      return;
    }
    setReassign({ id: row.id, name: row.name, count: n, target: null });
  };

  const doReassignAndDelete = async () => {
    if (!reassign || !reassign.target) return;
    setReassigning(true);
    const { error: updErr } = await supabase
      .from("expenses")
      .update({ category_id: reassign.target })
      .eq("category_id", reassign.id);
    if (updErr) {
      setReassigning(false);
      toast.error(updErr.message);
      return;
    }
    const { error: delErr } = await supabase.from("expense_categories").delete().eq("id", reassign.id);
    setReassigning(false);
    if (delErr) { toast.error(delErr.message); return; }
    const n = reassign.count;
    setReassign(null);
    refresh();
    toast.success(`Moved ${n} expense(s) and deleted category`);
  };

  const otherOptions = reassign
    ? data.filter((r) => r.id !== reassign.id).map((r) => ({ id: r.id, label: r.name }))
    : [];

  return (
    <>
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Expense Categories</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </CardHeader>
        <CardContent>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 text-xs uppercase">Name</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {adding && (
                  <tr className="border-t border-border bg-muted/20">
                    <td className="px-2 py-1.5">
                      <Input
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        placeholder="Name"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === "Enter") create(); }}
                      />
                    </td>
                    <td className="px-1 py-1 text-right whitespace-nowrap">
                      <Button size="sm" onClick={create}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setDraftName(""); }}>×</Button>
                    </td>
                  </tr>
                )}
                {data.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-2 py-1.5">
                      <Input
                        defaultValue={r.name}
                        onBlur={(e) => e.target.value !== r.name && e.target.value.trim() && update(r.id, { name: e.target.value.trim() })}
                        className="border-0 shadow-none focus-visible:ring-1"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <Button variant="ghost" size="icon" onClick={() => onDeleteClick(r)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && !adding && (
                  <tr><td colSpan={2} className="p-4 text-center text-muted-foreground">No categories yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!reassign} onOpenChange={(v) => { if (!v) setReassign(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign expenses</DialogTitle>
            <DialogDescription>
              {reassign ? `${reassign.count} expense(s) use "${reassign.name}". Choose a category to move them to before deleting.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <EntityCombobox
              value={reassign?.target ?? null}
              onChange={(id) => setReassign((s) => (s ? { ...s, target: id } : s))}
              options={otherOptions}
              placeholder="Select a category…"
              emptyMessage="No other categories. Create one first."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassign(null)} disabled={reassigning}>Cancel</Button>
            <Button onClick={doReassignAndDelete} disabled={!reassign?.target || reassigning}>
              {reassigning ? "Working…" : "Reassign & Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
