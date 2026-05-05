import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

/** Numeric input that accepts intermediate states like "0." while typing. */
export function NumberInput({
  value, onChange, className, placeholder, onKeyDown, decimals, minDecimals, maxDecimals,
}: {
  value: number | undefined | null;
  onChange: (n: number) => void;
  className?: string;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  decimals?: number;
  minDecimals?: number;
  maxDecimals?: number;
}) {
  const [text, setText] = useState<string>(value == null ? "" : String(value));

  useEffect(() => {
    // Sync from outside only when the parsed value differs from current text
    const parsed = parseFloat(text);
    if (Number.isNaN(parsed) ? value != null : parsed !== Number(value ?? 0)) {
      setText(value == null ? "" : String(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      className={className}
      onKeyDown={onKeyDown}
      onChange={(e) => {
        const raw = e.target.value;
        // Allow empty, digits, optional single dot, optional leading minus
        if (raw === "" || /^-?\d*\.?\d*$/.test(raw)) {
          setText(raw);
          const n = raw === "" || raw === "-" || raw === "." || raw === "-." ? 0 : parseFloat(raw);
          if (!Number.isNaN(n)) onChange(n);
        }
      }}
      onBlur={() => {
        if (text === "" || text === "-" || text === "." || text === "-.") {
          setText("0");
          return;
        }
        const n = parseFloat(text);
        if (!Number.isNaN(n)) {
          if (typeof minDecimals === "number" || typeof maxDecimals === "number") {
            // Determine current decimal count from typed text
            const dotIdx = text.indexOf(".");
            const typedDecimals = dotIdx === -1 ? 0 : text.length - dotIdx - 1;
            const lo = minDecimals ?? 0;
            const hi = maxDecimals ?? Math.max(typedDecimals, lo);
            const places = Math.min(Math.max(typedDecimals, lo), hi);
            setText(n.toFixed(places));
          } else if (typeof decimals === "number") {
            setText(n.toFixed(decimals));
          }
        }
      }}
    />
  );
}
