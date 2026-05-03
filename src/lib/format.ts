export function formatCurrency(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d + (d.length === 10 ? "T00:00:00" : "")) : d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateInput(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d + (d.length === 10 ? "T00:00:00" : "")) : d;
  return date.toISOString().slice(0, 10);
}

export function isOverdue(dueDate: string | null | undefined, status: string): boolean {
  if (!dueDate) return false;
  if (status === "paid") return false;
  return new Date(dueDate) < new Date(new Date().toISOString().slice(0, 10));
}

export function addDaysFromTerms(issueDate: string, terms: string | null | undefined): string {
  const days = parseInt(((terms || "Net 30").match(/\d+/) || ["30"])[0], 10);
  const d = new Date(issueDate + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
