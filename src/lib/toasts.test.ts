import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { toasts } from "./toasts.svelte";

describe("toasts store", () => {
 beforeEach(() => {
  vi.useFakeTimers();
  toasts.clear();
 });

 afterEach(() => {
  vi.useRealTimers();
 });

 it("starts empty", () => {
  expect(toasts.items).toEqual([]);
 });

 it("add returns a non-empty id", () => {
  const id = toasts.add({ message: "hello", kind: "info" });
  expect(typeof id).toBe("string");
  expect(id.length).toBeGreaterThan(0);
 });

 it("add appends to the items array", () => {
  toasts.add({ message: "first", kind: "info" });
  toasts.add({ message: "second", kind: "success" });
  expect(toasts.items.map((t) => t.message)).toEqual(["first", "second"]);
 });

 it("auto-dismisses after the default ttl", () => {
  toasts.add({ message: "bye", kind: "info" });
  expect(toasts.items).toHaveLength(1);
  vi.advanceTimersByTime(2999);
  expect(toasts.items).toHaveLength(1);
  vi.advanceTimersByTime(2);
  expect(toasts.items).toHaveLength(0);
 });

 it("ttlMs null keeps the toast indefinitely", () => {
  toasts.add({ message: "sticky", kind: "info", ttlMs: null });
  vi.advanceTimersByTime(60_000);
  expect(toasts.items).toHaveLength(1);
 });

 it("update patches an existing toast in place", () => {
  const id = toasts.add({ message: "scanning", kind: "info", ttlMs: null });
  toasts.update(id, { message: "scan complete", kind: "success" });
  expect(toasts.items[0].message).toBe("scan complete");
  expect(toasts.items[0].kind).toBe("success");
  expect(toasts.items[0].id).toBe(id);
 });

 it("update can attach a ttl to a previously sticky toast", () => {
  const id = toasts.add({ message: "scanning", kind: "info", ttlMs: null });
  toasts.update(id, { message: "done", kind: "success", ttlMs: 3000 });
  expect(toasts.items).toHaveLength(1);
  vi.advanceTimersByTime(3001);
  expect(toasts.items).toHaveLength(0);
 });

 it("dismiss removes a toast by id", () => {
  const a = toasts.add({ message: "a", kind: "info", ttlMs: null });
  const b = toasts.add({ message: "b", kind: "info", ttlMs: null });
  toasts.dismiss(a);
  expect(toasts.items.map((t) => t.id)).toEqual([b]);
 });

 it("dismiss is a no-op for unknown id", () => {
  toasts.add({ message: "a", kind: "info", ttlMs: null });
  toasts.dismiss("not-a-real-id");
  expect(toasts.items).toHaveLength(1);
 });

 it("clear empties the array and cancels pending timers", () => {
  toasts.add({ message: "a", kind: "info" });
  toasts.add({ message: "b", kind: "info" });
  toasts.clear();
  expect(toasts.items).toHaveLength(0);
  vi.advanceTimersByTime(10_000);
  expect(toasts.items).toHaveLength(0);
 });

 it("multiple toasts can coexist and dismiss independently", () => {
  toasts.add({ message: "first", kind: "info", ttlMs: 1000 });
  vi.advanceTimersByTime(500);
  toasts.add({ message: "second", kind: "info", ttlMs: 1000 });
  vi.advanceTimersByTime(600);
  expect(toasts.items.map((t) => t.message)).toEqual(["second"]);
  vi.advanceTimersByTime(500);
  expect(toasts.items).toHaveLength(0);
 });
});
