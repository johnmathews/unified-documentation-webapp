import { describe, it, expect, beforeEach } from "vitest";
import {
 loadHighlights,
 saveHighlight,
 removeHighlight,
 applyHighlights,
 type HighlightAnchor,
} from "./highlights";

const DOC_ID = "test-source:docs/example.md";

function mkAnchor(overrides: Partial<HighlightAnchor> = {}): HighlightAnchor {
 return {
  id: "h-test",
  text: "hello",
  prefix: "",
  suffix: "",
  createdAt: "2026-05-12T00:00:00.000Z",
  ...overrides,
 };
}

beforeEach(() => {
 localStorage.clear();
});

describe("localStorage round-trip", () => {
 it("returns empty array for unknown doc", () => {
  expect(loadHighlights(DOC_ID)).toEqual([]);
 });

 it("saves and loads a single highlight", () => {
  const anchor = mkAnchor();
  saveHighlight(DOC_ID, anchor);
  expect(loadHighlights(DOC_ID)).toEqual([anchor]);
 });

 it("appends additional highlights without clobbering", () => {
  saveHighlight(DOC_ID, mkAnchor({ id: "a" }));
  saveHighlight(DOC_ID, mkAnchor({ id: "b", text: "world" }));
  const ids = loadHighlights(DOC_ID).map((h) => h.id);
  expect(ids).toEqual(["a", "b"]);
 });

 it("removes a highlight by id", () => {
  saveHighlight(DOC_ID, mkAnchor({ id: "keep" }));
  saveHighlight(DOC_ID, mkAnchor({ id: "drop" }));
  removeHighlight(DOC_ID, "drop");
  expect(loadHighlights(DOC_ID).map((h) => h.id)).toEqual(["keep"]);
 });

 it("ignores corrupted storage values", () => {
  localStorage.setItem("docs-webapp:highlights:" + DOC_ID, "not-json{");
  expect(loadHighlights(DOC_ID)).toEqual([]);
 });

 it("filters out malformed entries", () => {
  localStorage.setItem(
   "docs-webapp:highlights:" + DOC_ID,
   JSON.stringify([{ not: "a-highlight" }, mkAnchor({ id: "ok" })]),
  );
  expect(loadHighlights(DOC_ID).map((h) => h.id)).toEqual(["ok"]);
 });

 it("isolates highlights by doc id", () => {
  saveHighlight("doc:a", mkAnchor({ id: "a-only" }));
  saveHighlight("doc:b", mkAnchor({ id: "b-only" }));
  expect(loadHighlights("doc:a").map((h) => h.id)).toEqual(["a-only"]);
  expect(loadHighlights("doc:b").map((h) => h.id)).toEqual(["b-only"]);
 });
});

describe("applyHighlights", () => {
 function makeRoot(html: string): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
 }

 it("wraps a contiguous text run inside a single paragraph", () => {
  const root = makeRoot("<p>The quick brown fox jumps</p>");
  applyHighlights(root, [
   mkAnchor({ id: "x", text: "brown fox", prefix: "uick ", suffix: " jump" }),
  ]);
  const marks = root.querySelectorAll("mark.hl-mark");
  expect(marks).toHaveLength(1);
  expect(marks[0].textContent).toBe("brown fox");
  expect(marks[0].getAttribute("data-hl-id")).toBe("x");
 });

 it("uses prefix+suffix to disambiguate repeated text", () => {
  const root = makeRoot("<p>cat bird cat</p>");
  applyHighlights(root, [
   mkAnchor({ id: "second", text: "cat", prefix: "bird ", suffix: "" }),
  ]);
  const marks = root.querySelectorAll("mark.hl-mark");
  expect(marks).toHaveLength(1);
  // The second cat is at index 9.
  const range = document.createRange();
  range.selectNode(marks[0]);
  expect(range.startOffset).toBeGreaterThan(0);
  // Easier assertion: the text immediately before the mark ends with "bird ".
  const before = marks[0].previousSibling?.textContent ?? "";
  expect(before.endsWith("bird ")).toBe(true);
 });

 it("falls back to plain-text search when context doesn't match", () => {
  const root = makeRoot("<p>edited document with fox content</p>");
  applyHighlights(root, [
   mkAnchor({ id: "f", text: "fox", prefix: "no-longer-matches ", suffix: "" }),
  ]);
  const marks = root.querySelectorAll("mark.hl-mark");
  expect(marks).toHaveLength(1);
  expect(marks[0].textContent).toBe("fox");
 });

 it("skips anchors whose text isn't present at all", () => {
  const root = makeRoot("<p>nothing matches here</p>");
  applyHighlights(root, [mkAnchor({ id: "missing", text: "unicorn" })]);
  expect(root.querySelectorAll("mark.hl-mark")).toHaveLength(0);
 });

 it("re-applying clears previous marks (idempotent)", () => {
  const root = makeRoot("<p>alpha beta gamma</p>");
  applyHighlights(root, [mkAnchor({ id: "a", text: "beta" })]);
  expect(root.querySelectorAll("mark.hl-mark")).toHaveLength(1);
  applyHighlights(root, [mkAnchor({ id: "b", text: "gamma" })]);
  const marks = root.querySelectorAll("mark.hl-mark");
  expect(marks).toHaveLength(1);
  expect(marks[0].textContent).toBe("gamma");
  expect(marks[0].getAttribute("data-hl-id")).toBe("b");
 });

 it("wraps a run that spans inline elements within one paragraph", () => {
  const root = makeRoot("<p>start <strong>middle</strong> end</p>");
  // Highlight "middle end" — spans the </strong> boundary.
  applyHighlights(root, [
   mkAnchor({ id: "y", text: "middle end", prefix: "start ", suffix: "" }),
  ]);
  const marks = root.querySelectorAll("mark.hl-mark");
  expect(marks.length).toBeGreaterThanOrEqual(1);
  // Combined text content of all marks should equal the highlighted text.
  const combined = Array.from(marks)
   .map((m) => m.textContent ?? "")
   .join("");
  expect(combined).toBe("middle end");
 });
});
