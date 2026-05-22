import * as React from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const DEFAULT_TERMS = [
  "Due Upon Receipt",
  "Net 7",
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
  "Net 90",
];

export function TermsCombobox({
  value,
  onChange,
  placeholder = "Net 30",
  options = DEFAULT_TERMS,
  emptyMessage = "No terms found",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  options?: string[];
  emptyMessage?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState(value || "");
  const [browsing, setBrowsing] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState<number>();
  // When set, the next blur should be ignored — we just committed a match
  // via Tab/Enter and don't want the blur handler to overwrite it with
  // free-text fallback.
  const justCommittedRef = React.useRef(false);

  React.useEffect(() => { if (!open) setQuery(value || ""); }, [value, open]);

  React.useEffect(() => {
    if (open && anchorRef.current) setWidth(anchorRef.current.offsetWidth);
  }, [open]);

  const q = browsing ? "" : query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;

  React.useEffect(() => { setHighlight(0); }, [query, open, browsing]);

  const commit = (v: string) => {
    justCommittedRef.current = true;
    onChange(v);
    setQuery(v);
    setBrowsing(false);
    setOpen(false);
  };

  const openAndBrowse = () => { setBrowsing(true); setOpen(true); };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setBrowsing(false); }}>
      <PopoverAnchor asChild>
        <div ref={anchorRef}>
          <Input
            value={browsing ? "" : query}
            placeholder={browsing && value ? value : placeholder}
            onChange={(e) => { setQuery(e.target.value); setBrowsing(false); setOpen(true); }}
            onFocus={openAndBrowse}
            onClick={openAndBrowse}
            onBlur={() => {
              const trimmed = query.trim();
              const exact = options.find((o) => o.toLowerCase() === trimmed.toLowerCase());
              if (exact) commit(exact);
              else if (trimmed) { onChange(trimmed); setQuery(trimmed); }
              else setQuery(value || "");
              setBrowsing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
              else if (e.key === "Enter") {
                e.preventDefault();
                if (!browsing && query.trim() && filtered[highlight]) commit(filtered[highlight]);
              }
              else if (e.key === "Tab") {
                if (open && !browsing && query.trim() && filtered[highlight]) commit(filtered[highlight]);
              }
              else if (e.key === "Escape") { setOpen(false); setBrowsing(false); }
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
          {filtered.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage}</div>}
          {filtered.map((o, i) => (
            <button
              key={o}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); commit(o); }}
              onMouseEnter={() => setHighlight(i)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm",
                i === highlight ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                value === o && "font-medium",
              )}
            >
              {o}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
