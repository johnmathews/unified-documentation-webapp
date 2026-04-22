import { describe, it, expect } from "vitest";
import { CATEGORIES, type CategoryKey } from "$lib/stores.svelte";

describe("CATEGORIES constant", () => {
 it("contains exactly 9 categories", () => {
  expect(CATEGORIES).toHaveLength(9);
 });

 it("has root_docs as the first category", () => {
  expect(CATEGORIES[0].key).toBe("root_docs");
 });

 it("has docs category", () => {
  expect(CATEGORIES.find((c) => c.key === "docs")).toBeDefined();
 });

 it("has journal category", () => {
  expect(CATEGORIES.find((c) => c.key === "journal")).toBeDefined();
 });

 it("has engineering_team category", () => {
  expect(CATEGORIES.find((c) => c.key === "engineering_team")).toBeDefined();
 });

 it("has research category", () => {
  expect(CATEGORIES.find((c) => c.key === "research")).toBeDefined();
 });

 it("all categories have unique keys", () => {
  const keys = CATEGORIES.map((c) => c.key);
  expect(new Set(keys).size).toBe(keys.length);
 });

 it("all categories have non-empty labels", () => {
  for (const cat of CATEGORIES) {
   expect(cat.label.length).toBeGreaterThan(0);
  }
 });

 it("CategoryKey type matches the defined keys", () => {
  // This is a compile-time check, but we can verify at runtime too
  const validKeys: CategoryKey[] = ["root_docs", "docs", "journal", "learning_journal", "engineering_team", "research", "skills", "runbooks", "pdf"];
  const actualKeys = CATEGORIES.map((c) => c.key);
  expect(actualKeys).toEqual(validKeys);
 });
});

describe("CATEGORIES ordering", () => {
 it("root_docs comes before docs", () => {
  const rootIdx = CATEGORIES.findIndex((c) => c.key === "root_docs");
  const docsIdx = CATEGORIES.findIndex((c) => c.key === "docs");
  expect(rootIdx).toBeLessThan(docsIdx);
 });

 it("docs comes before journal", () => {
  const docsIdx = CATEGORIES.findIndex((c) => c.key === "docs");
  const journalIdx = CATEGORIES.findIndex((c) => c.key === "journal");
  expect(docsIdx).toBeLessThan(journalIdx);
 });

 it("journal comes before engineering_team", () => {
  const journalIdx = CATEGORIES.findIndex((c) => c.key === "journal");
  const engIdx = CATEGORIES.findIndex((c) => c.key === "engineering_team");
  expect(journalIdx).toBeLessThan(engIdx);
 });

 it("engineering_team comes before research", () => {
  const engIdx = CATEGORIES.findIndex((c) => c.key === "engineering_team");
  const researchIdx = CATEGORIES.findIndex((c) => c.key === "research");
  expect(engIdx).toBeLessThan(researchIdx);
 });

 it("research comes before pdf", () => {
  const researchIdx = CATEGORIES.findIndex((c) => c.key === "research");
  const pdfIdx = CATEGORIES.findIndex((c) => c.key === "pdf");
  expect(researchIdx).toBeLessThan(pdfIdx);
 });
});
