import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Plus, Check } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

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

  const selected = items.find((i) => i.id === value);

  const createInline = async () => {
    const name = search.trim();
    if (!name) return;
    const { data, error } = await supabase
      .from("products_services")
      .insert({ name, type: "service" })
      .select("id,name,default_description,default_price,default_cost")
      .single();
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["products_services"] });
    onPick(data as any);
    setSearch("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn("w-full justify-between border-0 shadow-none h-9 px-2 font-normal", className)}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected?.name || "Select…"}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[260px] z-[100]"
        align="start"
        side="bottom"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandInput placeholder="Search or add…" value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>
              <button
                type="button"
                onClick={createInline}
                className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Create "{search}"
              </button>
            </CommandEmpty>
            <CommandGroup>
              {items.map((it) => (
                <CommandItem
                  key={it.id}
                  value={it.name}
                  onSelect={() => { onPick(it); setOpen(false); setSearch(""); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === it.id ? "opacity-100" : "opacity-0")} />
                  {it.name}
                </CommandItem>
              ))}
              {search.trim() && !items.some((i) => i.name.toLowerCase() === search.trim().toLowerCase()) && (
                <CommandItem onSelect={createInline}>
                  <Plus className="mr-2 h-4 w-4" /> Create "{search}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
