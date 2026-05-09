import * as React from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ComboOption = { id: string; label: string; sub?: string };

export function EntityCombobox({
  value, onChange, options, placeholder = "Search…", emptyMessage = "No results.",
}: {
  value?: string | null;
  onChange: (id: string | null) => void;
  options: ComboOption[];
  placeholder?: string;
  emptyMessage?: string;
}) {
  const selected = options.find((o) => o.id === value) || null;
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState(selected?.label || "");
  const [highlight, setHighlight] = React.useState(0);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState<number>();

  React.useEffect(() => {
    setQuery(options.find((o) => o.id === value)?.label || "");
  }, [value, options]);

  React.useEffect(() => {
    if (open && anchorRef.current) setWidth(anchorRef.current.offsetWidth);
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) => o.label.toLowerCase().includes(q) || (o.sub || "").toLowerCase().includes(q))
    : options;

  React.useEffect(() => { setHighlight(0); }, [query, open]);

  const commit = (opt: ComboOption) => {
    onChange(opt.id);
    setQuery(opt.label);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={anchorRef}>
          <Input
            value={query}
            placeholder={placeholder}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              const exact = options.find((o) => o.label.toLowerCase() === query.trim().toLowerCase());
              if (exact) commit(exact);
              else setQuery(selected?.label || "");
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
              else if (e.key === "Enter") { e.preventDefault(); if (filtered[highlight]) commit(filtered[highlight]); }
              else if (e.key === "Escape") { setOpen(false); }
            }}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        side="bottom" align="start" sideOffset={4}
        style={width ? { width } : undefined}
        className="p-0 max-h-72 overflow-auto z-[100]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="py-1">
          {filtered.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No results.</div>}
          {filtered.map((o, i) => (
            <button
              key={o.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); commit(o); }}
              onMouseEnter={() => setHighlight(i)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm flex flex-col",
                i === highlight ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                value === o.id && "font-medium",
              )}
            >
              <span>{o.label}</span>
              {o.sub && <span className="text-xs text-muted-foreground">{o.sub}</span>}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
