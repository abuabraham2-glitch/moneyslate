import * as React from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProductService = {
  id: string;
  name: string;
  default_description: string | null;
  default_price: number | null;
  default_cost: number | null;
};

export function ProductServiceCombobox({
  value, onPick, className,
}: {
  value: string | null | undefined;
  onPick: (item: ProductService | null) => void;
  className?: string;
}) {
  const qc = useQueryClient();

  const { data: items = [] } = useQuery<ProductService[]>({
    queryKey: ["products_services"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products_services")
        .select("id,name,default_description,default_price,default_cost")
        .eq("active", true)
        .order("sort_order")
        .order("name");
      return (data || []) as any;
    },
  });

  const selected = items.find((i) => i.id === value) || null;
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState(selected?.name || "");
  const [browsing, setBrowsing] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState<number>();

  React.useEffect(() => {
    if (!open) setQuery(items.find((i) => i.id === value)?.name || "");
  }, [value, items, open]);

  React.useEffect(() => {
    if (open && anchorRef.current) setWidth(anchorRef.current.offsetWidth);
  }, [open]);

  const q = browsing ? "" : query.trim().toLowerCase();
  const filtered = q ? items.filter((o) => o.name.toLowerCase().includes(q)) : items;
  const trimmed = query.trim();
  const hasExact = items.some((i) => i.name.toLowerCase() === trimmed.toLowerCase());
  const canCreate = !browsing && trimmed.length > 0 && !hasExact;

  React.useEffect(() => { setHighlight(0); }, [query, open, browsing]);

  const commit = (opt: ProductService) => {
    onPick(opt);
    setQuery(opt.name);
    setBrowsing(false);
    setOpen(false);
  };

  const createInline = async () => {
    const name = trimmed;
    if (!name) return;
    const { data, error } = await supabase
      .from("products_services")
      .insert({ name, type: "service" })
      .select("id,name,default_description,default_price,default_cost")
      .single();
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["products_services"] });
    commit(data as any);
  };

  const openAndBrowse = () => { setBrowsing(true); setOpen(true); };

  return (
    <Popover open={open} modal={false} onOpenChange={(v) => { setOpen(v); if (!v) setBrowsing(false); }}>
      <PopoverAnchor asChild>
        <div ref={anchorRef}>
          <Input
            value={browsing ? "" : query}
            placeholder={selected && browsing ? selected.name : "Select…"}
            className={cn("border-0 shadow-none h-9 px-2", className)}
            onChange={(e) => { setQuery(e.target.value); setBrowsing(false); setOpen(true); }}
            onFocus={openAndBrowse}
            onClick={openAndBrowse}
            onBlur={() => {
              const exact = items.find((o) => o.name.toLowerCase() === trimmed.toLowerCase());
              if (exact) commit(exact);
              else setQuery(selected?.name || "");
              setBrowsing(false);
            }}
            onKeyDown={(e) => {
              const total = filtered.length + (canCreate ? 1 : 0);
              if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHighlight((h) => Math.min(h + 1, total - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
              else if (e.key === "Enter") {
                e.preventDefault();
                if (!browsing && trimmed) {
                  if (highlight < filtered.length) commit(filtered[highlight]);
                  else if (canCreate) createInline();
                }
              }
              else if (e.key === "Tab") {
                if (open && !browsing && trimmed && highlight < filtered.length) {
                  commit(filtered[highlight]);
                }
              }
              else if (e.key === "Escape") { setOpen(false); setBrowsing(false); }
            }}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        side="bottom" align="start" sideOffset={4}
        style={width ? { width } : undefined}
        className="p-0 max-h-72 overflow-y-auto overscroll-contain z-[100]"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="py-1">

          {filtered.length === 0 && !canCreate && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No products found</div>
          )}
          {filtered.map((o, i) => (
            <button
              key={o.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); commit(o); }}
              onMouseEnter={() => setHighlight(i)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm",
                i === highlight ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                value === o.id && "font-medium",
              )}
            >
              {o.name}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); createInline(); }}
              onMouseEnter={() => setHighlight(filtered.length)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm flex items-center gap-1.5",
                highlight === filtered.length ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
              )}
            >
              <Plus className="h-3.5 w-3.5" /> Create "{trimmed}"
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
