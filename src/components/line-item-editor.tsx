import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";
import { NumberInput } from "@/components/number-input";
import { ProductServiceCombobox } from "@/components/product-service-combobox";
import {
  calculateLineItem,
  createEmptyLineItem,
  type EditableLineItem,
  type LineItemEditedField,
} from "@/lib/line-items";

export type LineItem = EditableLineItem;

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
  const update = (idx: number, patch: Partial<LineItem>, source: LineItemEditedField = "init") => {
    const next = [...items];
    next[idx] = calculateLineItem({ ...next[idx], ...patch }, priceField, source);
    onChange(next);
  };
  const add = () => onChange([...items, createEmptyLineItem(priceField)]);
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
                    if (!it.description && ps.default_description) patch.description = ps.default_description;
                    const defaultPrice = priceField === "unit_price" ? ps.default_price : ps.default_cost;
                    if (defaultPrice != null && !(it as any)[priceField]) {
                      (patch as any)[priceField] = Number(defaultPrice);
                    }
                    update(idx, patch, (patch as any)[priceField] != null ? priceField : "init");
                  }}
                />
              </td>
              <td className="px-2 py-1.5">
                <Textarea
                  value={it.description}
                  onChange={(e) => update(idx, { description: e.target.value })}
                  rows={1}
                  className="border-0 shadow-none focus-visible:ring-1 min-h-9 py-1.5"
                />
              </td>
              <td className="px-2 py-1.5" onKeyDown={blockEnter}>
                <NumberInput
                  value={it.quantity}
                  onChange={(n) => update(idx, { quantity: n }, "quantity")}
                  className="border-0 shadow-none text-right focus-visible:ring-1"
                />
              </td>
              <td className="px-2 py-1.5" onKeyDown={blockEnter}>
                <NumberInput
                  value={(it as any)[priceField] ?? 0}
                  onChange={(n) => update(idx, { [priceField]: n } as any, priceField)}
                  decimals={4}
                  className="border-0 shadow-none text-right focus-visible:ring-1"
                />
              </td>
              <td className="px-2 py-1.5" onKeyDown={blockEnter}>
                <NumberInput
                  value={it.line_total ?? 0}
                  onChange={(n) => update(idx, { line_total: n }, "line_total")}
                  decimals={2}
                  className="border-0 shadow-none text-right focus-visible:ring-1"
                />
              </td>
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
