import { describe, it, expect, vi, beforeEach } from "vitest";
import { displayTitle } from "$lib/titles";
import { githubFileUrl } from "$lib/api";

describe("githubFileUrl", () => {
 it("builds a blob URL from repo base, branch and path", () => {
  expect(
   githubFileUrl("https://github.com/johnmathews/relay", "main", "docs/readme.md"),
  ).toBe("https://github.com/johnmathews/relay/blob/main/docs/readme.md");
 });

 it("defaults the ref to main when branch is null/empty", () => {
  expect(githubFileUrl("https://github.com/o/r", null, "a.md")).toBe(
   "https://github.com/o/r/blob/main/a.md",
  );
  expect(githubFileUrl("https://github.com/o/r", "  ", "a.md")).toBe(
   "https://github.com/o/r/blob/main/a.md",
  );
 });

 it("returns null when the source is not github-backed", () => {
  expect(githubFileUrl(null, "main", "a.md")).toBeNull();
  expect(githubFileUrl(undefined, "main", "a.md")).toBeNull();
 });

 it("returns null when there is no file path", () => {
  expect(githubFileUrl("https://github.com/o/r", "main", "")).toBeNull();
 });

 it("encodes path segments but preserves separators", () => {
  expect(
   githubFileUrl("https://github.com/o/r", "feat/x", "a b/c#d.md"),
  ).toBe("https://github.com/o/r/blob/feat%2Fx/a%20b/c%23d.md");
 });

 it("strips a trailing slash on the repo base", () => {
  expect(githubFileUrl("https://github.com/o/r/", "main", "a.md")).toBe(
   "https://github.com/o/r/blob/main/a.md",
  );
 });
});

// Test the pure utility logic that the API module and components share

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

 it("uses raw filename for root-level files", () => {
  expect(displayTitle({ title: null, file_path: "readme.md" })).toBe("readme.md");
 });

 it("strips date prefix and normalises", () => {
  expect(displayTitle({ title: null, file_path: "docs/250321-fix-stuff.md" })).toBe("Fix Stuff");
 });

 it("converts underscored ALL_CAPS to Title Case for non-root files", () => {
  expect(displayTitle({ title: null, file_path: "docs/SDK_DEEP_DIVE.md" })).toBe("SDK Deep Dive");
 });

 it("keeps short acronyms uppercase for non-root files", () => {
  expect(displayTitle({ title: null, file_path: "docs/API_DOCS.md" })).toBe("API Docs");
 });

 it("normalises hyphenated names for non-root files", () => {
  expect(displayTitle({ title: null, file_path: "docs/apple-container-networking.md" })).toBe("Apple Container Networking");
 });

 it("returns raw filename for root-level files regardless of title", () => {
  expect(displayTitle({ title: "Some Title", file_path: "CLAUDE.md" })).toBe("CLAUDE.md");
  expect(displayTitle({ title: "Some Title", file_path: "README.md" })).toBe("README.md");
 });
});

// Date formatting is now centralised in src/lib/datetime.ts and covered
// by datetime.test.ts (the previous block here tested an inline copy that
// duplicated — and has since diverged from — the real implementation).

describe("searchDocuments with filters", () => {
 const mockResults = [
  {
   doc_id: "repo:docs/a.md",
   source: "repo",
   file_path: "docs/a.md",
   title: "Doc A",
   created_at: "2025-01-15T00:00:00Z",
   modified_at: "2025-03-01T00:00:00Z",
   score: 0.5,
   snippet: "About doc A",
  },
  {
   doc_id: "repo:docs/b.md",
   source: "repo",
   file_path: "docs/b.md",
   title: "Doc B",
   created_at: "2025-06-10T00:00:00Z",
   modified_at: "2025-07-20T00:00:00Z",
   score: 0.6,
   snippet: "About doc B",
  },
  {
   doc_id: "other:docs/c.md",
   source: "other",
   file_path: "docs/c.md",
   title: "Doc C",
   created_at: null,
   modified_at: null,
   score: 0.7,
   snippet: "About doc C",
  },
 ];

 beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal(
   "fetch",
   vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockResults),
   }),
  );
 });

 it("passes source filter as query parameter", async () => {
  const { searchDocuments } = await import("$lib/api");
  await searchDocuments("test", { source: "repo" });
  expect(fetch).toHaveBeenCalledWith("/api/search?q=test&source=repo", undefined);
 });

 it("returns all results when no filters are applied", async () => {
  const { searchDocuments } = await import("$lib/api");
  const results = await searchDocuments("test");
  expect(results).toHaveLength(3);
 });

 it("filters by createdAfter", async () => {
  const { searchDocuments } = await import("$lib/api");
  const results = await searchDocuments("test", { createdAfter: "2025-03-01" });
  expect(results).toHaveLength(2);
  expect(results.map((r) => r.doc_id)).toContain("repo:docs/b.md");
  expect(results.map((r) => r.doc_id)).toContain("other:docs/c.md");
 });

 it("filters by createdBefore", async () => {
  const { searchDocuments } = await import("$lib/api");
  const results = await searchDocuments("test", { createdBefore: "2025-03-01" });
  expect(results).toHaveLength(2);
  expect(results.map((r) => r.doc_id)).toContain("repo:docs/a.md");
  expect(results.map((r) => r.doc_id)).toContain("other:docs/c.md");
 });

 it("filters by modifiedAfter", async () => {
  const { searchDocuments } = await import("$lib/api");
  const results = await searchDocuments("test", { modifiedAfter: "2025-05-01" });
  expect(results).toHaveLength(2);
 });

 it("filters by modifiedBefore", async () => {
  const { searchDocuments } = await import("$lib/api");
  const results = await searchDocuments("test", { modifiedBefore: "2025-05-01" });
  expect(results).toHaveLength(2);
 });

 it("combines multiple date filters", async () => {
  const { searchDocuments } = await import("$lib/api");
  const results = await searchDocuments("test", {
   createdAfter: "2025-02-01",
   createdBefore: "2025-12-01",
  });
  expect(results).toHaveLength(2);
  expect(results.map((r) => r.doc_id)).toContain("repo:docs/b.md");
 });

 it("passes documents with null dates through date filters", async () => {
  const { searchDocuments } = await import("$lib/api");
  const results = await searchDocuments("test", {
   createdAfter: "2025-01-01",
   modifiedBefore: "2025-12-31",
  });
  expect(results.map((r) => r.doc_id)).toContain("other:docs/c.md");
 });
});

describe("fetchSources", () => {
 beforeEach(() => {
  vi.restoreAllMocks();
 });

 it("returns source names from health endpoint", async () => {
  vi.stubGlobal(
   "fetch",
   vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
     Promise.resolve({
      status: "ok",
      total_sources: 2,
      total_chunks: 100,
      sources: [
       { source: "alpha-repo", file_count: 10, chunk_count: 50, last_indexed: null },
       { source: "beta-docs", file_count: 5, chunk_count: 50, last_indexed: null },
      ],
     }),
   }),
  );

  const { fetchSources } = await import("$lib/api");
  const sources = await fetchSources();
  expect(sources).toEqual(["alpha-repo", "beta-docs"]);
 });
});

// ---- Bookmark API functions ----

describe("listBookmarks", () => {
 beforeEach(() => {
  vi.restoreAllMocks();
 });

 it("calls /api/bookmarks and returns parsed JSON", async () => {
  const mockData = [
   {
    doc_id: "docs:setup.md",
    user_id: "default",
    bookmarked_at: "2025-01-01T00:00:00Z",
    title: "Setup",
    source: "docs",
    file_path: "setup.md",
    created_at: "2025-01-01T00:00:00Z",
    modified_at: "2025-01-01T00:00:00Z",
    size_bytes: 100,
   },
  ];
  vi.stubGlobal(
   "fetch",
   vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockData),
   }),
  );

  const { listBookmarks } = await import("$lib/api");
  const result = await listBookmarks();
  expect(result).toHaveLength(1);
  expect(result[0].doc_id).toBe("docs:setup.md");
  expect(fetch).toHaveBeenCalledWith("/api/bookmarks", undefined);
 });
});

describe("addBookmark", () => {
 beforeEach(() => {
  vi.restoreAllMocks();
 });

 it("sends POST with doc_id", async () => {
  vi.stubGlobal(
   "fetch",
   vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ doc_id: "docs:setup.md" }),
   }),
  );

  const { addBookmark } = await import("$lib/api");
  await addBookmark("docs:setup.md");
  expect(fetch).toHaveBeenCalledWith("/api/bookmarks", {
   method: "POST",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ doc_id: "docs:setup.md" }),
  });
 });
});

describe("removeBookmark", () => {
 beforeEach(() => {
  vi.restoreAllMocks();
 });

 it("sends DELETE to the correct URL", async () => {
  vi.stubGlobal(
   "fetch",
   vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ deleted: true }),
   }),
  );

  const { removeBookmark } = await import("$lib/api");
  await removeBookmark("docs:setup.md");
  expect(fetch).toHaveBeenCalledWith(`/api/bookmarks/${encodeURIComponent("docs:setup.md")}`, {
   method: "DELETE",
  });
 });
});

describe("checkBookmarks", () => {
 beforeEach(() => {
  vi.restoreAllMocks();
 });

 it("sends POST with doc_ids and returns status map", async () => {
  const mockResult = { "docs:setup.md": true, "docs:other.md": false };
  vi.stubGlobal(
   "fetch",
   vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockResult),
   }),
  );

  const { checkBookmarks } = await import("$lib/api");
  const result = await checkBookmarks(["docs:setup.md", "docs:other.md"]);
  expect(result).toEqual(mockResult);
  expect(fetch).toHaveBeenCalledWith("/api/bookmarks/check", {
   method: "POST",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ doc_ids: ["docs:setup.md", "docs:other.md"] }),
  });
 });
});

describe("summariseScan", () => {
 it("returns zeros when stats are null", async () => {
  const { summariseScan } = await import("$lib/api");
  expect(summariseScan(null)).toEqual({ added: 0, updated: 0, removed: 0, errors: 0 });
 });

 it("sums new/modified/deleted/errors across sources", async () => {
  const { summariseScan } = await import("$lib/api");
  const result = summariseScan({
   "tech-blog": { upserted: 4, deleted: 1, skipped: 12, new: 3, modified: 1, files: 16, errors: 0 },
   "home-server": { upserted: 2, deleted: 0, skipped: 8, new: 0, modified: 2, files: 10, errors: 1 },
  });
  expect(result).toEqual({ added: 3, updated: 3, removed: 1, errors: 1 });
 });
});

describe("triggerScan", () => {
 beforeEach(() => {
  vi.restoreAllMocks();
 });

 it("returns started on 200", async () => {
  vi.stubGlobal(
   "fetch",
   vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ status: "started", sources: "all", force: false }),
   }),
  );
  const { triggerScan } = await import("$lib/api");
  const result = await triggerScan();
  expect(result.status).toBe("started");
  expect(fetch).toHaveBeenCalledWith("/api/scan", {
   method: "POST",
   headers: { "Content-Type": "application/json" },
  });
 });

 it("returns already_running on 409 without throwing", async () => {
  vi.stubGlobal(
   "fetch",
   vi.fn().mockResolvedValue({
    ok: false,
    status: 409,
    json: () => Promise.resolve({ status: "already_running" }),
   }),
  );
  const { triggerScan } = await import("$lib/api");
  const result = await triggerScan();
  expect(result.status).toBe("already_running");
 });

 it("throws on other non-ok responses", async () => {
  vi.stubGlobal(
   "fetch",
   vi.fn().mockResolvedValue({
    ok: false,
    status: 500,
    statusText: "Internal Server Error",
    json: () => Promise.resolve({ error: "boom" }),
   }),
  );
  const { triggerScan } = await import("$lib/api");
  await expect(triggerScan()).rejects.toThrow("boom");
 });
});

describe("pollUntilScanDone", () => {
 beforeEach(() => {
  vi.restoreAllMocks();
 });

 it("resolves with summary once health reports a fresh completion", async () => {
  const triggeredAt = Date.now();
  const completedAt = new Date(triggeredAt + 1000).toISOString();

  // 1st poll: still running. 2nd poll: done.
  const responses = [
   { status: "healthy", total_sources: 1, total_chunks: 0, poll_interval_seconds: 1800, sources: [],
    ingestion_running: true, last_ingestion: { completed_at: new Date(triggeredAt - 5000).toISOString() }, last_stats: null },
   { status: "healthy", total_sources: 1, total_chunks: 0, poll_interval_seconds: 1800, sources: [],
    ingestion_running: false, last_ingestion: { completed_at: completedAt },
    last_stats: { src: { upserted: 1, deleted: 0, skipped: 0, new: 1, modified: 0, files: 1, errors: 0 } } },
  ];
  let callIdx = 0;
  vi.stubGlobal(
   "fetch",
   vi.fn().mockImplementation(() => {
    const r = responses[callIdx++] ?? responses[responses.length - 1];
    return Promise.resolve({ ok: true, json: () => Promise.resolve(r) });
   }),
  );

  const { pollUntilScanDone } = await import("$lib/api");
  const result = await pollUntilScanDone(triggeredAt, { intervalMs: 5, timeoutMs: 5000 });
  expect(result).toEqual({ added: 1, updated: 0, removed: 0, errors: 0 });
 });

 it("returns null on timeout", async () => {
  vi.stubGlobal(
   "fetch",
   vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
     status: "healthy", total_sources: 0, total_chunks: 0, poll_interval_seconds: 1800, sources: [],
     ingestion_running: true, last_ingestion: null, last_stats: null,
    }),
   }),
  );
  const { pollUntilScanDone } = await import("$lib/api");
  const result = await pollUntilScanDone(Date.now(), { intervalMs: 5, timeoutMs: 30 });
  expect(result).toBeNull();
 });

 it("aborts when signal is triggered", async () => {
  vi.stubGlobal(
   "fetch",
   vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
     status: "healthy", total_sources: 0, total_chunks: 0, poll_interval_seconds: 1800, sources: [],
     ingestion_running: true, last_ingestion: null, last_stats: null,
    }),
   }),
  );
  const { pollUntilScanDone } = await import("$lib/api");
  const ctrl = new AbortController();
  const promise = pollUntilScanDone(Date.now(), { intervalMs: 50, timeoutMs: 5000, signal: ctrl.signal });
  setTimeout(() => ctrl.abort(), 10);
  expect(await promise).toBeNull();
 });

 it("survives transient health-fetch failures and keeps polling", async () => {
  const triggeredAt = Date.now();
  let callIdx = 0;
  vi.stubGlobal(
   "fetch",
   vi.fn().mockImplementation(() => {
    callIdx++;
    if (callIdx === 1) {
     return Promise.reject(new Error("network blip"));
    }
    return Promise.resolve({
     ok: true,
     json: () => Promise.resolve({
      status: "healthy", total_sources: 0, total_chunks: 0, poll_interval_seconds: 1800, sources: [],
      ingestion_running: false,
      last_ingestion: { completed_at: new Date(triggeredAt + 100).toISOString() },
      last_stats: { src: { upserted: 0, deleted: 2, skipped: 0, new: 0, modified: 0, files: 0, errors: 0 } },
     }),
    });
   }),
  );
  const { pollUntilScanDone } = await import("$lib/api");
  const result = await pollUntilScanDone(triggeredAt, { intervalMs: 5, timeoutMs: 5000 });
  expect(result).toEqual({ added: 0, updated: 0, removed: 2, errors: 0 });
 });
});

describe("pollScan onProgress", () => {
 beforeEach(() => {
  vi.restoreAllMocks();
 });

 it("calls onProgress with each polled current_progress, then resolves with summary", async () => {
  const triggeredAt = Date.now();
  const completedAt = new Date(triggeredAt + 1000).toISOString();
  const responses = [
   {
    status: "healthy", total_sources: 1, total_chunks: 0, poll_interval_seconds: 1800, sources: [],
    ingestion_running: true,
    last_ingestion: { completed_at: new Date(triggeredAt - 5000).toISOString() },
    last_stats: null,
    current_progress: { phase: "syncing" },
   },
   {
    status: "healthy", total_sources: 1, total_chunks: 0, poll_interval_seconds: 1800, sources: [],
    ingestion_running: true,
    last_ingestion: { completed_at: new Date(triggeredAt - 5000).toISOString() },
    last_stats: null,
    current_progress: { phase: "discovery_done", total_docs: 3, sources_changed: 1, sources_total: 1 },
   },
   {
    status: "healthy", total_sources: 1, total_chunks: 0, poll_interval_seconds: 1800, sources: [],
    ingestion_running: true,
    last_ingestion: { completed_at: new Date(triggeredAt - 5000).toISOString() },
    last_stats: null,
    current_progress: { phase: "processing", current: 2, total: 3, source: "src", doc: "x.md" },
   },
   {
    status: "healthy", total_sources: 1, total_chunks: 0, poll_interval_seconds: 1800, sources: [],
    ingestion_running: false,
    last_ingestion: { completed_at: completedAt },
    last_stats: { src: { upserted: 1, deleted: 0, skipped: 0, new: 1, modified: 0, files: 1, errors: 0 } },
    current_progress: null,
   },
  ];
  let callIdx = 0;
  vi.stubGlobal(
   "fetch",
   vi.fn().mockImplementation(() => {
    const r = responses[callIdx++] ?? responses[responses.length - 1];
    return Promise.resolve({ ok: true, json: () => Promise.resolve(r) });
   }),
  );

  const captured: Array<unknown> = [];
  const { pollScan } = await import("$lib/api");
  const result = await pollScan(triggeredAt, {
   intervalMs: 5,
   timeoutMs: 5000,
   onProgress: (p) => captured.push(p),
  });

  expect(result).toEqual({ added: 1, updated: 0, removed: 0, errors: 0 });
  expect(captured).toEqual([
   { phase: "syncing" },
   { phase: "discovery_done", total_docs: 3, sources_changed: 1, sources_total: 1 },
   { phase: "processing", current: 2, total: 3, source: "src", doc: "x.md" },
   null,
  ]);
 });

 it("passes null to onProgress when current_progress is missing from health", async () => {
  // Older backends don't include the field at all — frontend must handle that.
  const triggeredAt = Date.now();
  vi.stubGlobal(
   "fetch",
   vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
     status: "healthy", total_sources: 0, total_chunks: 0, poll_interval_seconds: 1800, sources: [],
     ingestion_running: false,
     last_ingestion: { completed_at: new Date(triggeredAt + 100).toISOString() },
     last_stats: null,
     // current_progress field omitted entirely
    }),
   }),
  );
  const captured: Array<unknown> = [];
  const { pollScan } = await import("$lib/api");
  await pollScan(triggeredAt, { intervalMs: 5, timeoutMs: 5000, onProgress: (p) => captured.push(p) });
  expect(captured).toEqual([null]);
 });
});
