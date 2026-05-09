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
  const [highlight, setHighlight] = React.useState(0);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState<number>();

  React.useEffect(() => {
    if (open && anchorRef.current) setWidth(anchorRef.current.offsetWidth);
  }, [open]);

  const q = (value || "").trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;

  React.useEffect(() => { setHighlight(0); }, [value, open]);

  const commit = (v: string) => { onChange(v); setOpen(false); };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={anchorRef}>
          <Input
            value={value || ""}
            placeholder={placeholder}
            onChange={(e) => { onChange(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
              else if (e.key === "Enter") { if (open && filtered[highlight]) { e.preventDefault(); commit(filtered[highlight]); } }
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
