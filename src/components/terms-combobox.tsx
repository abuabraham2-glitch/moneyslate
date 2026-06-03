import * as React from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  // Set after a commit via Tab/Enter so the immediate blur doesn't re-run free-text fallback.
  const justCommittedRef = React.useRef(false);
  // True once the user has actually typed in the input during the current focus session.
  // Blur without typing must NOT call onChange — it must preserve the parent value as-is.
  const dirtyRef = React.useRef(false);

  React.useEffect(() => { if (!open) setQuery(value || ""); }, [value, open]);

  React.useEffect(() => {
    if (open && anchorRef.current) setWidth(anchorRef.current.offsetWidth);
  }, [open]);

  const q = browsing ? "" : query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;

  React.useEffect(() => { setHighlight(0); }, [query, open, browsing]);

  const commit = (v: string) => {
    justCommittedRef.current = true;
    dirtyRef.current = false;
    onChange(v);
    setQuery(v);
    setBrowsing(false);
    setOpen(false);
  };

  const openAndBrowse = () => { dirtyRef.current = false; setBrowsing(true); setOpen(true); };

  return (
    <Popover open={open} modal={false} onOpenChange={(v) => { setOpen(v); if (!v) setBrowsing(false); }}>
      <PopoverAnchor asChild>
        <div ref={anchorRef}>
          <Input
            value={browsing ? "" : query}
            autoComplete="off"
            placeholder={browsing && value ? value : placeholder}
            onChange={(e) => { dirtyRef.current = true; setQuery(e.target.value); setBrowsing(false); setOpen(true); }}
            onFocus={openAndBrowse}
            onClick={openAndBrowse}
            onBlur={() => {
              if (justCommittedRef.current) { justCommittedRef.current = false; dirtyRef.current = false; setBrowsing(false); return; }
              // If the user never typed during this focus session, preserve parent value unchanged.
              if (!dirtyRef.current) { setQuery(value || ""); setBrowsing(false); return; }
              const trimmed = query.trim();
              const exact = options.find((o) => o.toLowerCase() === trimmed.toLowerCase());
              if (exact) commit(exact);
              else if (trimmed) { onChange(trimmed); setQuery(trimmed); }
              else setQuery(value || "");
              dirtyRef.current = false;
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
        className="p-0 z-[100]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ScrollArea className="max-h-72">
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
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
