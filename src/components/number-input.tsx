import { Input } from "@/components/ui/input";
import { useEffect, useRef, useState } from "react";

function formatWithCommas(n: number, places: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  }).format(n);
}

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
  const focusedRef = useRef(false);

  const formatDisplay = (v: number | null | undefined): string => {
    if (v == null) return "";
    const n = Number(v);
    if (Number.isNaN(n)) return "";
    const str = Math.abs(n).toString();
    const dot = str.indexOf(".");
    const typedDecimals = dot === -1 ? 0 : str.length - dot - 1;
    let places: number;
    if (typeof minDecimals === "number" || typeof maxDecimals === "number") {
      const lo = minDecimals ?? 0;
      const hi = maxDecimals ?? Math.max(typedDecimals, lo);
      places = Math.min(Math.max(typedDecimals, lo), hi);
    } else if (typeof decimals === "number") {
      places = decimals;
    } else {
      places = typedDecimals;
    }
    return formatWithCommas(n, places);
  };

  const [text, setText] = useState<string>(() => formatDisplay(value));

  useEffect(() => {
    if (focusedRef.current) return;
    const parsed = parseFloat(text.replace(/,/g, ""));
    if (Number.isNaN(parsed) ? value != null : parsed !== Number(value ?? 0)) {
      setText(formatDisplay(value));
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
      onFocus={() => {
        focusedRef.current = true;
        // Strip commas while editing
        setText((t) => t.replace(/,/g, ""));
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/,/g, "");
        if (raw === "" || /^-?\d*\.?\d*$/.test(raw)) {
          setText(raw);
          const n = raw === "" || raw === "-" || raw === "." || raw === "-." ? 0 : parseFloat(raw);
          if (!Number.isNaN(n)) onChange(n);
        }
      }}
      onBlur={() => {
        focusedRef.current = false;
        if (text === "" || text === "-" || text === "." || text === "-.") {
          setText("0");
          onChange(0);
          return;
        }
        const n = parseFloat(text.replace(/,/g, ""));
        if (!Number.isNaN(n)) {
          setText(formatDisplay(n));
        }
      }}
    />
  );
}
