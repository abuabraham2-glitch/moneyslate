import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** Inline-editable memo cell. Click to edit, saves on blur. */
export function MemoCell({
  table, id, value, onSaved,
}: {
  table: "purchase_orders" | "invoices";
  id: string;
  value: string | null | undefined;
  onSaved?: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value || "");
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => { setText(value || ""); }, [value]);

  useEffect(() => {
    if (!editing) return;
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [editing]);

  const save = async () => {
    setEditing(false);
    const next = text.trim();
    if ((value || "") === next) return;
    const { error } = await supabase.from(table).update({ memo: next || null } as any).eq("id", id);
    if (error) { toast.error(error.message); setText(value || ""); return; }
    onSaved?.(next);
  };

  if (editing) {
    return (
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const el = e.currentTarget;
          el.style.height = "auto";
          el.style.height = `${el.scrollHeight}px`;
        }}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setText(value || ""); setEditing(false); }
        }}
        rows={1}
        className="w-full min-w-[140px] resize-none bg-background border border-input rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring overflow-hidden"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="w-full min-w-[140px] text-left text-sm text-foreground/80 hover:text-foreground hover:bg-muted/30 rounded px-2 py-1 whitespace-pre-wrap break-words"
      title="Click to edit memo"
    >
      {value ? value : <span className="text-muted-foreground italic">Add memo…</span>}
    </button>
  );
}
