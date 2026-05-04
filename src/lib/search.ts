export function includesSearch(haystack: Array<string | null | undefined>, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystack.some((value) => (value || "").toLowerCase().includes(q));
}