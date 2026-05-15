import type { TreeDocument } from "$lib/api";

export interface JournalEntry extends TreeDocument {
 source: string;
}

export function sortJournalEntries(entries: JournalEntry[]): JournalEntry[] {
 const indexed = entries.map((e, i) => ({ e, i }));
 indexed.sort((a, b) => {
  const da = a.e.created_at || a.e.modified_at || "";
  const db = b.e.created_at || b.e.modified_at || "";
  const cmp = db.localeCompare(da);
  return cmp !== 0 ? cmp : a.i - b.i;
 });
 return indexed.map((x) => x.e);
}

export function monthKey(dateStr: string | null): string {
 if (!dateStr) return "Unknown date";
 try {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleDateString("en-GB", { year: "numeric", month: "long" });
 } catch {
  return "Unknown date";
 }
}

export function formatDay(dateStr: string | null): string {
 if (!dateStr) return "";
 try {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.getDate().toString();
 } catch {
  return "";
 }
}

export interface MonthGroup {
 month: string;
 entries: JournalEntry[];
}

export function groupEntriesByMonth(entries: JournalEntry[]): MonthGroup[] {
 const groups: MonthGroup[] = [];
 for (const entry of entries) {
  const key = monthKey(entry.created_at || entry.modified_at);
  const last = groups[groups.length - 1];
  if (last && last.month === key) {
   last.entries.push(entry);
  } else {
   groups.push({ month: key, entries: [entry] });
  }
 }
 return groups;
}
