import * as React from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const US_STATES: { code: string; name: string }[] = [
  ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],
  ["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["FL","Florida"],["GA","Georgia"],
  ["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],
  ["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],
  ["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],
  ["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],
  ["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],
  ["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],
  ["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],
  ["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"],
].map(([code, name]) => ({ code, name }));

export function StateSelect({
  value, onChange,
}: { value?: string; onChange: (v: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState(value || "");
  const [highlight, setHighlight] = React.useState(0);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState<number>();

  React.useEffect(() => { setQuery(value || ""); }, [value]);
  React.useEffect(() => {
    if (open && anchorRef.current) setWidth(anchorRef.current.offsetWidth);
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? US_STATES.filter((s) => s.code.toLowerCase().startsWith(q) || s.name.toLowerCase().includes(q))
    : US_STATES;

  React.useEffect(() => { setHighlight(0); }, [query, open]);

  const commit = (code: string) => {
    onChange(code);
    setQuery(code);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const exact = US_STATES.find((s) => s.code.toLowerCase() === q);
      if (exact) commit(exact.code);
      else if (filtered[highlight]) commit(filtered[highlight].code);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={anchorRef}>
          <Input
            value={query}
            placeholder="State"
            maxLength={20}
            onChange={(e) => {
              const v = e.target.value.toUpperCase();
              setQuery(v);
              setOpen(true);
              const exact = US_STATES.find((s) => s.code === v);
              if (exact) onChange(exact.code);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              const exact = US_STATES.find((s) => s.code.toLowerCase() === query.trim().toLowerCase());
              if (exact) { onChange(exact.code); setQuery(exact.code); }
              else setQuery(value || "");
            }}
            onKeyDown={onKeyDown}
            className="h-9"
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={4}
        style={width ? { width } : undefined}
        className="p-0 max-h-64 overflow-auto z-[100]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="py-1">
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No state.</div>
          )}
          {filtered.map((s, i) => (
            <button
              key={s.code}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); commit(s.code); }}
              onMouseEnter={() => setHighlight(i)}
              className={cn(
                "w-full text-left px-3 py-1.5 text-sm flex items-center justify-between",
                i === highlight ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                value === s.code && "font-medium",
              )}
            >
              <span>{s.name}</span>
              <span className="text-xs text-muted-foreground">{s.code}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
