import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

export type LineItem = {
  id?: string;
  description: string;
  quantity: number;
  unit_price?: number;
  unit_cost?: number;
  line_total: number;
  sort_order?: number;
};

export function LineItemEditor({
  items,
  onChange,
  priceLabel = "Unit Price",
  priceField = "unit_price",
}: {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  priceLabel?: string;
  priceField?: "unit_price" | "unit_cost";
}) {
  const update = (idx: number, patch: Partial<LineItem>) => {
    const next = [...items];
    next[idx] = { ...next[idx], ...patch };
    const qty = Number(next[idx].quantity || 0);
    const price = Number((next[idx] as any)[priceField] || 0);
    next[idx].line_total = +(qty * price).toFixed(2);
    onChange(next);
  };
  const add = () => onChange([...items, { description: "", quantity: 1, [priceField]: 0, line_total: 0 } as LineItem]);
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2 text-xs uppercase">Description</th>
            <th className="text-right px-3 py-2 text-xs uppercase w-24">Qty</th>
            <th className="text-right px-3 py-2 text-xs uppercase w-32">{priceLabel}</th>
            <th className="text-right px-3 py-2 text-xs uppercase w-32">Total</th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={idx} className="border-t border-border">
              <td className="px-2 py-1.5"><Input value={it.description} onChange={(e) => update(idx, { description: e.target.value })} className="border-0 shadow-none focus-visible:ring-1" /></td>
              <td className="px-2 py-1.5"><Input type="number" step="0.01" value={it.quantity} onChange={(e) => update(idx, { quantity: Number(e.target.value) })} className="border-0 shadow-none text-right focus-visible:ring-1" /></td>
              <td className="px-2 py-1.5"><Input type="number" step="0.01" value={(it as any)[priceField] ?? 0} onChange={(e) => update(idx, { [priceField]: Number(e.target.value) } as any)} className="border-0 shadow-none text-right focus-visible:ring-1" /></td>
              <td className="px-3 py-1.5 text-right tabular-nums">${it.line_total.toFixed(2)}</td>
              <td className="px-1"><Button variant="ghost" size="icon" onClick={() => remove(idx)}><X className="h-4 w-4 text-muted-foreground" /></Button></td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground text-sm">No line items</td></tr>}
        </tbody>
      </table>
      <div className="p-2 border-t border-border bg-muted/20">
        <Button variant="ghost" size="sm" onClick={add}><Plus className="h-4 w-4 mr-1" /> Add line</Button>
      </div>
    </div>
  );
}
