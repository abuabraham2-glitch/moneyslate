import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";
import { NumberInput } from "@/components/number-input";
import { ProductServiceCombobox } from "@/components/product-service-combobox";

export type LineItem = {
  id?: string;
  product_service_id?: string | null;
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
  const recalc = (row: LineItem): LineItem => {
    const qty = Number(row.quantity || 0);
    const price = Number((row as any)[priceField] || 0);
    return { ...row, line_total: +(qty * price).toFixed(2) };
  };
  const update = (idx: number, patch: Partial<LineItem>) => {
    const next = [...items];
    next[idx] = recalc({ ...next[idx], ...patch });
    onChange(next);
  };
  const add = () => onChange([...items, recalc({ description: "", quantity: 1, [priceField]: 0, line_total: 0 } as LineItem)]);
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  // Block Enter from doing anything in single-line numeric/combobox cells
  const blockEnter = (e: React.KeyboardEvent) => { if (e.key === "Enter") e.preventDefault(); };

  return (
    <div className="border border-border rounded-lg overflow-visible">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2 text-xs uppercase w-48">Product / Service</th>
            <th className="text-left px-3 py-2 text-xs uppercase">Description</th>
            <th className="text-right px-3 py-2 text-xs uppercase w-20">Qty</th>
            <th className="text-right px-3 py-2 text-xs uppercase w-28">{priceLabel}</th>
            <th className="text-right px-3 py-2 text-xs uppercase w-28">Total</th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={idx} className="border-t border-border align-top">
              <td className="px-1 py-1.5" onKeyDown={blockEnter}>
                <ProductServiceCombobox
                  value={it.product_service_id || null}
                  onPick={(ps) => {
                    if (!ps) return;
                    const patch: Partial<LineItem> = { product_service_id: ps.id };
                    if (!it.description) patch.description = ps.default_description || ps.name;
                    const defaultPrice = priceField === "unit_price" ? ps.default_price : ps.default_cost;
                    if (defaultPrice != null && !(it as any)[priceField]) {
                      (patch as any)[priceField] = Number(defaultPrice);
                    }
                    update(idx, patch);
                  }}
                />
              </td>
              <td className="px-2 py-1.5">
                <Textarea
                  value={it.description}
                  onChange={(e) => update(idx, { description: e.target.value })}
                  rows={1}
                  className="border-0 shadow-none focus-visible:ring-1 min-h-9 py-1.5 resize-y"
                />
              </td>
              <td className="px-2 py-1.5" onKeyDown={blockEnter}>
                <NumberInput
                  value={it.quantity}
                  onChange={(n) => update(idx, { quantity: n })}
                  className="border-0 shadow-none text-right focus-visible:ring-1"
                />
              </td>
              <td className="px-2 py-1.5" onKeyDown={blockEnter}>
                <NumberInput
                  value={(it as any)[priceField] ?? 0}
                  onChange={(n) => update(idx, { [priceField]: n } as any)}
                  className="border-0 shadow-none text-right focus-visible:ring-1"
                />
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">${(Number(it.line_total) || 0).toFixed(2)}</td>
              <td className="px-1 py-1"><Button variant="ghost" size="icon" onClick={() => remove(idx)}><X className="h-4 w-4 text-muted-foreground" /></Button></td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground text-sm">No line items</td></tr>}
        </tbody>
      </table>
      <div className="p-2 border-t border-border bg-muted/20">
        <Button variant="ghost" size="sm" onClick={add}><Plus className="h-4 w-4 mr-1" /> Add line</Button>
      </div>
    </div>
  );
}
