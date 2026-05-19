import { describe, it, expect } from "vitest";
import { formatDateTime } from "./datetime";

describe("formatDateTime", () => {
 it("returns empty string for null/undefined/empty", () => {
  expect(formatDateTime(null)).toBe("");
  expect(formatDateTime(undefined)).toBe("");
  expect(formatDateTime("")).toBe("");
 });

 it("includes the time-of-day, not just the date", () => {
  // 19 May 2026, 15:31 UTC. Assert the date parts and that a HH:MM
  // time component is present (exact clock value depends on the test
  // runner's timezone, so match the shape rather than a fixed value).
  const out = formatDateTime("2026-05-19T15:31:00Z");
  expect(out).toContain("19");
  expect(out).toContain("May");
  expect(out).toContain("2026");
  expect(out).toMatch(/\d{2}:\d{2}/);
 });

 it("echoes the raw string when it cannot be parsed", () => {
  expect(formatDateTime("not-a-date")).toBe("not-a-date");
 });
});
