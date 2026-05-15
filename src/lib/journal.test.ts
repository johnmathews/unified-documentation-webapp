import { describe, it, expect } from "vitest";
import {
 sortJournalEntries,
 monthKey,
 formatDay,
 groupEntriesByMonth,
 type JournalEntry,
} from "./journal";

function entry(partial: Partial<JournalEntry> & { doc_id: string }): JournalEntry {
 return {
  doc_id: partial.doc_id,
  source: partial.source ?? "s",
  file_path: partial.file_path ?? `journal/${partial.doc_id}.md`,
  title: partial.title ?? null,
  created_at: partial.created_at ?? null,
  modified_at: partial.modified_at ?? null,
  size_bytes: partial.size_bytes ?? null,
  type: partial.type ?? "journal",
 };
}

describe("sortJournalEntries", () => {
 it("sorts entries by created_at descending", () => {
  const entries = [
   entry({ doc_id: "a", created_at: "2025-01-01" }),
   entry({ doc_id: "b", created_at: "2025-03-15" }),
   entry({ doc_id: "c", created_at: "2025-02-10" }),
  ];
  expect(sortJournalEntries(entries).map((e) => e.doc_id)).toEqual([
   "b",
   "c",
   "a",
  ]);
 });

 it("falls back to modified_at when created_at is null", () => {
  const entries = [
   entry({ doc_id: "a", modified_at: "2025-03-01" }),
   entry({ doc_id: "b", created_at: "2025-03-15" }),
  ];
  expect(sortJournalEntries(entries).map((e) => e.doc_id)).toEqual(["b", "a"]);
 });

 it("handles entries with no dates", () => {
  const entries = [
   entry({ doc_id: "a" }),
   entry({ doc_id: "b", created_at: "2025-01-01" }),
  ];
  expect(sortJournalEntries(entries).map((e) => e.doc_id)).toEqual(["b", "a"]);
 });

 it("is stable for equal dates (preserves input order)", () => {
  const entries = [
   entry({ doc_id: "a", created_at: "2025-03-01" }),
   entry({ doc_id: "b", created_at: "2025-03-01" }),
   entry({ doc_id: "c", created_at: "2025-03-01" }),
  ];
  expect(sortJournalEntries(entries).map((e) => e.doc_id)).toEqual([
   "a",
   "b",
   "c",
  ]);
 });
});

describe("monthKey", () => {
 it("formats a date as 'Month YYYY'", () => {
  const result = monthKey("2025-03-15");
  expect(result).toContain("March");
  expect(result).toContain("2025");
 });

 it('returns "Unknown date" for null', () => {
  expect(monthKey(null)).toBe("Unknown date");
 });

 it('returns "Unknown date" for malformed input', () => {
  expect(monthKey("not-a-date")).toBe("Unknown date");
 });

 it("groups same-month dates identically", () => {
  expect(monthKey("2025-03-01")).toBe(monthKey("2025-03-28"));
 });

 it("separates different months", () => {
  expect(monthKey("2025-03-01")).not.toBe(monthKey("2025-04-01"));
 });
});

describe("formatDay", () => {
 it("returns the day-of-month as a string", () => {
  expect(formatDay("2025-03-15")).toBe("15");
 });

 it("returns empty string for null", () => {
  expect(formatDay(null)).toBe("");
 });

 it("returns empty string for malformed input", () => {
  expect(formatDay("not-a-date")).toBe("");
 });
});

describe("groupEntriesByMonth", () => {
 it("handles empty input", () => {
  expect(groupEntriesByMonth([])).toEqual([]);
 });

 it("groups consecutive same-month entries together", () => {
  const sorted = [
   entry({ doc_id: "a", created_at: "2025-03-20" }),
   entry({ doc_id: "b", created_at: "2025-03-01" }),
   entry({ doc_id: "c", created_at: "2025-02-15" }),
  ];
  const groups = groupEntriesByMonth(sorted);
  expect(groups).toHaveLength(2);
  expect(groups[0].entries.map((e) => e.doc_id)).toEqual(["a", "b"]);
  expect(groups[1].entries.map((e) => e.doc_id)).toEqual(["c"]);
 });

 it("preserves month order from input", () => {
  const sorted = [
   entry({ doc_id: "a", created_at: "2025-03-01" }),
   entry({ doc_id: "b", created_at: "2025-02-01" }),
   entry({ doc_id: "c", created_at: "2025-01-01" }),
  ];
  const months = groupEntriesByMonth(sorted).map((g) => g.month);
  expect(months[0]).toContain("March");
  expect(months[1]).toContain("February");
  expect(months[2]).toContain("January");
 });

 it('places null-dated entries under "Unknown date"', () => {
  const sorted = [
   entry({ doc_id: "a", created_at: "2025-03-01" }),
   entry({ doc_id: "b" }),
   entry({ doc_id: "c" }),
  ];
  const groups = groupEntriesByMonth(sorted);
  expect(groups).toHaveLength(2);
  expect(groups[1].month).toBe("Unknown date");
  expect(groups[1].entries.map((e) => e.doc_id)).toEqual(["b", "c"]);
 });
});
