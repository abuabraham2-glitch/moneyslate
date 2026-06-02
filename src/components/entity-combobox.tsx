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
  // When true, the input has been focused but the user hasn't typed yet —
  // show the full list instead of filtering by the selected label.
  const [browsing, setBrowsing] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [width, setWidth] = React.useState<number>();
  // True once the user has actually typed during the current focus session.
  // Blur without typing must NOT re-commit — re-committing the same id triggers
  // parent side-effects (e.g. resetting payment_terms on the invoice dialog).
  const dirtyRef = React.useRef(false);

  React.useEffect(() => {
    if (!open) setQuery(options.find((o) => o.id === value)?.label || "");
  }, [value, options, open]);

  React.useEffect(() => {
    if (open && anchorRef.current) setWidth(anchorRef.current.offsetWidth);
  }, [open]);

  const q = browsing ? "" : query.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) => o.label.toLowerCase().includes(q) || (o.sub || "").toLowerCase().includes(q))
    : options;

  React.useEffect(() => { setHighlight(0); }, [query, open, browsing]);

  const commit = (opt: ComboOption) => {
    dirtyRef.current = false;
    onChange(opt.id);
    setQuery(opt.label);
    setBrowsing(false);
    setOpen(false);
  };

  const openAndBrowse = () => {
    dirtyRef.current = false;
    setBrowsing(true);
    setOpen(true);
  };

  return (
    <Popover open={open} modal={false} onOpenChange={(v) => { setOpen(v); if (!v) setBrowsing(false); }}>
      <PopoverAnchor asChild>
        <div ref={anchorRef}>
          <Input
            ref={inputRef}
            value={browsing ? "" : query}
            autoComplete="off"
            placeholder={selected && browsing ? selected.label : placeholder}
            onChange={(e) => { dirtyRef.current = true; setQuery(e.target.value); setBrowsing(false); setOpen(true); }}
            onFocus={openAndBrowse}
            onClick={openAndBrowse}
            onBlur={() => {
              // No-op if the user didn't type — avoids re-committing the same value
              // and firing parent side-effects on click-outside.
              if (!dirtyRef.current) { setQuery(selected?.label || ""); setBrowsing(false); return; }
              const exact = options.find((o) => o.label.toLowerCase() === query.trim().toLowerCase());
              if (exact) commit(exact);
              else setQuery(selected?.label || "");
              dirtyRef.current = false;
              setBrowsing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
              else if (e.key === "Enter") {
                e.preventDefault();
                // Only commit on Enter when the user has filtered (not just browsing the full list)
                if (!browsing && query.trim() && filtered[highlight]) commit(filtered[highlight]);
              }
              else if (e.key === "Tab") {
                // Commit highlighted match on Tab when filtering; let default Tab advance focus.
                if (open && !browsing && query.trim() && filtered[highlight]) {
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
        style={width ? { width, pointerEvents: "auto" } : { pointerEvents: "auto" }}
        className="p-0 max-h-72 overflow-y-auto overscroll-contain z-[100]"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onWheelCapture={(e) => e.stopPropagation()}
        onPointerDownCapture={(e) => e.stopPropagation()}
      >
        <div className="py-1">

          {filtered.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage}</div>}
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
