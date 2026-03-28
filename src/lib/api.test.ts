import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TreeSource, TreeDocument } from "$lib/api";
import { sourceColorClass } from "$lib/colors";
import { displayTitle } from "$lib/titles";

// Test the pure utility logic that the API module and components share

describe("sourceColorClass", () => {
 it("returns a tag-* CSS class name", () => {
  const cls = sourceColorClass("test-source");
  expect(cls).toMatch(/^tag-/);
 });

 it("returns the same class for the same source name", () => {
  expect(sourceColorClass("my-repo")).toBe(sourceColorClass("my-repo"));
 });

 it("returns different classes for different source names", () => {
  const a = sourceColorClass("alpha");
  const b = sourceColorClass("beta");
  // Not guaranteed to differ, but these specific strings do hash differently
  expect(a !== b).toBe(true);
 });
});

describe("docUrl", () => {
 function docUrl(docId: string): string {
  return `/doc/${encodeURIComponent(docId)}`;
 }

 it("encodes simple doc IDs", () => {
  expect(docUrl("source:docs/readme.md")).toBe("/doc/source%3Adocs%2Freadme.md");
 });

 it("encodes doc IDs with special characters", () => {
  expect(docUrl("source:journal/250321-fix stuff.md")).toBe("/doc/source%3Ajournal%2F250321-fix%20stuff.md");
 });
});

describe("displayTitle", () => {
 it("uses title when it looks like a real title", () => {
  expect(displayTitle({ title: "My Doc", file_path: "docs/my-doc.md" })).toBe("My Doc");
 });

 it("normalises filename when title is null", () => {
  expect(displayTitle({ title: null, file_path: "docs/my-doc.md" })).toBe("My Doc");
 });

 it("handles file at root", () => {
  expect(displayTitle({ title: null, file_path: "readme.md" })).toBe("Readme");
 });

 it("strips date prefix and normalises", () => {
  expect(displayTitle({ title: null, file_path: "docs/250321-fix-stuff.md" })).toBe("Fix Stuff");
 });

 it("converts underscored ALL_CAPS to Title Case", () => {
  expect(displayTitle({ title: null, file_path: "SDK_DEEP_DIVE.md" })).toBe("SDK Deep Dive");
 });

 it("keeps short acronyms uppercase", () => {
  expect(displayTitle({ title: null, file_path: "API_DOCS.md" })).toBe("API Docs");
 });

 it("normalises hyphenated names", () => {
  expect(displayTitle({ title: null, file_path: "apple-container-networking.md" })).toBe("Apple Container Networking");
 });
});

describe("formatDate", () => {
 function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
   return new Date(dateStr).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
   });
  } catch {
   return dateStr;
  }
 }

 it("returns empty string for null", () => {
  expect(formatDate(null)).toBe("");
 });

 it("formats ISO date string", () => {
  const result = formatDate("2025-03-21T00:00:00Z");
  expect(result).toContain("2025");
  expect(result).toContain("Mar");
  expect(result).toContain("21");
 });
});

describe("journal entry sorting", () => {
 interface JournalEntry {
  doc_id: string;
  source: string;
  created_at: string | null;
  modified_at: string | null;
 }

 function sortJournalEntries(entries: JournalEntry[]): JournalEntry[] {
  return [...entries].sort((a, b) => {
   const da = a.created_at || a.modified_at || "";
   const db = b.created_at || b.modified_at || "";
   return db.localeCompare(da);
  });
 }

 it("sorts entries by date descending (most recent first)", () => {
  const entries: JournalEntry[] = [
   { doc_id: "a", source: "s1", created_at: "2025-01-01", modified_at: null },
   { doc_id: "b", source: "s2", created_at: "2025-03-15", modified_at: null },
   { doc_id: "c", source: "s1", created_at: "2025-02-10", modified_at: null },
  ];
  const sorted = sortJournalEntries(entries);
  expect(sorted.map((e) => e.doc_id)).toEqual(["b", "c", "a"]);
 });

 it("falls back to modified_at when created_at is null", () => {
  const entries: JournalEntry[] = [
   { doc_id: "a", source: "s1", created_at: null, modified_at: "2025-03-01" },
   { doc_id: "b", source: "s2", created_at: "2025-03-15", modified_at: null },
  ];
  const sorted = sortJournalEntries(entries);
  expect(sorted.map((e) => e.doc_id)).toEqual(["b", "a"]);
 });

 it("handles entries with no dates", () => {
  const entries: JournalEntry[] = [
   { doc_id: "a", source: "s1", created_at: null, modified_at: null },
   { doc_id: "b", source: "s2", created_at: "2025-01-01", modified_at: null },
  ];
  const sorted = sortJournalEntries(entries);
  expect(sorted.map((e) => e.doc_id)).toEqual(["b", "a"]);
 });
});

describe("journal entry grouping by month", () => {
 function monthKey(dateStr: string | null): string {
  if (!dateStr) return "Unknown date";
  try {
   return new Date(dateStr).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
   });
  } catch {
   return "Unknown date";
  }
 }

 it("groups dates into month/year format", () => {
  const result = monthKey("2025-03-15");
  expect(result).toContain("March");
  expect(result).toContain("2025");
 });

 it('returns "Unknown date" for null', () => {
  expect(monthKey(null)).toBe("Unknown date");
 });

 it("groups same-month dates identically", () => {
  expect(monthKey("2025-03-01")).toBe(monthKey("2025-03-28"));
 });

 it("separates different months", () => {
  expect(monthKey("2025-03-01")).not.toBe(monthKey("2025-04-01"));
 });
});

describe("fetchTree", () => {
 beforeEach(() => {
  vi.restoreAllMocks();
 });

 it("calls /api/tree and returns parsed JSON", async () => {
  const mockData = [{ source: "test", root_docs: [], docs: [], journal: [] }];
  vi.stubGlobal(
   "fetch",
   vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockData),
   }),
  );

  const { fetchTree } = await import("$lib/api");
  const result = await fetchTree();
  expect(result).toEqual(mockData);
  expect(fetch).toHaveBeenCalledWith("/api/tree", undefined);
 });

 it("throws on non-ok response", async () => {
  vi.stubGlobal(
   "fetch",
   vi.fn().mockResolvedValue({
    ok: false,
    status: 500,
    statusText: "Internal Server Error",
    json: () => Promise.resolve({ error: "Backend unavailable" }),
   }),
  );

  const { fetchTree } = await import("$lib/api");
  await expect(fetchTree()).rejects.toThrow("Backend unavailable");
 });
});

// ---------------------------------------------------------------------------
// Regression tests: optional fields in TreeSource
//
// The backend may not include all category fields (e.g. engineering_team)
// when running an older version. The UI must handle missing fields without
// crashing. This test suite mirrors every access pattern used in the
// Svelte components to catch TypeError on undefined fields.
// ---------------------------------------------------------------------------

function makeDoc(docId: string, filePath: string): TreeDocument {
 return {
  doc_id: docId,
  source: docId.split(":")[0],
  file_path: filePath,
  title:
   filePath
    .split("/")
    .pop()
    ?.replace(/\.[^.]+$/, "") ?? null,
  created_at: "2026-01-01T00:00:00Z",
  modified_at: "2026-01-01T00:00:00Z",
  size_bytes: 100,
 };
}

/** Backend response without engineering_team (older server version). */
function makeSourceWithoutEngTeam(name: string): TreeSource {
 return {
  source: name,
  root_docs: [makeDoc(`${name}:README.md`, "README.md")],
  docs: [makeDoc(`${name}:docs/setup.md`, "docs/setup.md")],
  journal: [makeDoc(`${name}:journal/260101-init.md`, "journal/260101-init.md")],
  // engineering_team intentionally omitted — simulates older backend
 };
}

/** Backend response with engineering_team (current server version). */
function makeSourceWithEngTeam(name: string): TreeSource {
 return {
  ...makeSourceWithoutEngTeam(name),
  engineering_team: [
   makeDoc(`${name}:.engineering-team/eval.md`, ".engineering-team/evaluation-report.md"),
   makeDoc(`${name}:.engineering-team/plan.md`, ".engineering-team/improvement-plan.md"),
  ],
 };
}

describe("TreeSource optional field regression tests", () => {
 // --- Sidebar.svelte: totalDocs() ---
 describe("totalDocs calculation (Sidebar.svelte)", () => {
  function totalDocs(source: TreeSource): number {
   return source.root_docs.length + source.docs.length + source.journal.length + (source.engineering_team?.length ?? 0);
  }

  it("works when engineering_team is missing", () => {
   expect(totalDocs(makeSourceWithoutEngTeam("test"))).toBe(3);
  });

  it("works when engineering_team is present", () => {
   expect(totalDocs(makeSourceWithEngTeam("test"))).toBe(5);
  });

  it("works when engineering_team is an empty array", () => {
   const source = { ...makeSourceWithoutEngTeam("test"), engineering_team: [] };
   expect(totalDocs(source)).toBe(3);
  });
 });

 // --- Sidebar.svelte: {#if (source.engineering_team?.length ?? 0) > 0} ---
 describe("conditional rendering guard (Sidebar.svelte, +page.svelte)", () => {
  function shouldShowEngTeam(source: TreeSource): boolean {
   return (source.engineering_team?.length ?? 0) > 0;
  }

  it("returns false when field is missing", () => {
   expect(shouldShowEngTeam(makeSourceWithoutEngTeam("test"))).toBe(false);
  });

  it("returns false when field is empty array", () => {
   expect(shouldShowEngTeam({ ...makeSourceWithoutEngTeam("test"), engineering_team: [] })).toBe(false);
  });

  it("returns true when field has items", () => {
   expect(shouldShowEngTeam(makeSourceWithEngTeam("test"))).toBe(true);
  });
 });

 // --- Sidebar.svelte: {#each (source.engineering_team ?? []) as doc} ---
 describe("iteration with fallback (Sidebar.svelte)", () => {
  it("iterates zero items when field is missing", () => {
   const source = makeSourceWithoutEngTeam("test");
   const ids = (source.engineering_team ?? []).map((d) => d.doc_id);
   expect(ids).toEqual([]);
  });

  it("iterates all items when field is present", () => {
   const source = makeSourceWithEngTeam("test");
   const ids = (source.engineering_team ?? []).map((d) => d.doc_id);
   expect(ids).toHaveLength(2);
  });
 });

 // --- +page.svelte: {#each (source.engineering_team ?? []).slice(0, 3) as doc} ---
 describe("slicing with fallback (+page.svelte)", () => {
  it("returns empty array when field is missing", () => {
   const source = makeSourceWithoutEngTeam("test");
   expect((source.engineering_team ?? []).slice(0, 3)).toEqual([]);
  });

  it("slices correctly when field has items", () => {
   const source = makeSourceWithEngTeam("test");
   expect((source.engineering_team ?? []).slice(0, 3)).toHaveLength(2);
  });
 });

 // --- +page.svelte stats display: {source.engineering_team?.length ?? 0} ---
 describe("count display (+page.svelte stats)", () => {
  it("shows 0 when field is missing", () => {
   const source = makeSourceWithoutEngTeam("test");
   expect(source.engineering_team?.length ?? 0).toBe(0);
  });

  it("shows correct count when field is present", () => {
   const source = makeSourceWithEngTeam("test");
   expect(source.engineering_team?.length ?? 0).toBe(2);
  });
 });

 // --- source/[name]/[category]/+page.svelte: docs = source.engineering_team ?? [] ---
 describe("category page data loading ([category]/+page.svelte)", () => {
  it("returns empty array when field is missing", () => {
   const source = makeSourceWithoutEngTeam("test");
   const docs = source.engineering_team ?? [];
   expect(docs).toEqual([]);
  });

  it("returns docs when field is present", () => {
   const source = makeSourceWithEngTeam("test");
   const docs = source.engineering_team ?? [];
   expect(docs).toHaveLength(2);
  });
 });

 // --- doc/[id]/+page.svelte: category detection from file_path ---
 describe("category detection from file_path (doc/[id]/+page.svelte)", () => {
  function detectCategory(filePath: string): string {
   if (filePath.includes("journal/")) return "journal";
   if (filePath.includes(".engineering-team/")) return "engineering_team";
   return "docs";
  }

  it("detects journal category", () => {
   expect(detectCategory("journal/260101-init.md")).toBe("journal");
  });

  it("detects engineering_team category", () => {
   expect(detectCategory(".engineering-team/evaluation-report.md")).toBe("engineering_team");
  });

  it("defaults to docs for other paths", () => {
   expect(detectCategory("docs/setup.md")).toBe("docs");
  });

  it("defaults to docs for root files", () => {
   expect(detectCategory("README.md")).toBe("docs");
  });
 });

 // --- Sidebar.svelte: expandAll/collapseAll with engineering_team key ---
 describe("expand/collapse state (Sidebar.svelte)", () => {
  it("setting engineering_team expand state works regardless of field presence", () => {
   const source = makeSourceWithoutEngTeam("test");
   const expandedCategories: Record<string, boolean> = {};

   // This mirrors loadTree() behavior
   expandedCategories[`${source.source}:engineering_team`] = true;
   expect(expandedCategories["test:engineering_team"]).toBe(true);

   // Collapse
   expandedCategories[`${source.source}:engineering_team`] = false;
   expect(expandedCategories["test:engineering_team"]).toBe(false);
  });
 });
});

describe("future-proofing: new optional categories", () => {
 it("TreeSource handles additional unknown fields from backend", () => {
  // If the backend adds a new category in the future, the UI should not crash
  const sourceWithFutureField = {
   ...makeSourceWithoutEngTeam("test"),
   some_new_category: [makeDoc("test:new/doc.md", "new/doc.md")],
  } as TreeSource;

  // Core fields still work
  expect(sourceWithFutureField.source).toBe("test");
  expect(sourceWithFutureField.docs).toHaveLength(1);
  expect(sourceWithFutureField.journal).toHaveLength(1);
 });
});
