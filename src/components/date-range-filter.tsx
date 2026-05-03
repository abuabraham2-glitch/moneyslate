import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export type DateRange = { from: string; to: string; preset: string };

export function getPresetRange(preset: string): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  switch (preset) {
    case "this_month":
      return { from: fmt(new Date(y, m, 1)), to: fmt(new Date(y, m + 1, 0)) };
    case "last_month":
      return { from: fmt(new Date(y, m - 1, 1)), to: fmt(new Date(y, m, 0)) };
    case "ytd":
      return { from: fmt(new Date(y, 0, 1)), to: fmt(now) };
    case "last_year":
      return { from: fmt(new Date(y - 1, 0, 1)), to: fmt(new Date(y - 1, 11, 31)) };
    default:
      return { from: fmt(new Date(y, 0, 1)), to: fmt(now) };
  }
}

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
}) {
  return (
    <Select
      value={value.preset}
      onValueChange={(p) => {
        const r = getPresetRange(p);
        onChange({ preset: p, ...r });
      }}
    >
      <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="this_month">This Month</SelectItem>
        <SelectItem value="last_month">Last Month</SelectItem>
        <SelectItem value="ytd">Year to Date</SelectItem>
        <SelectItem value="last_year">Last Year</SelectItem>
      </SelectContent>
    </Select>
  );
}
