import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger, newRequestId } from "./logger";

describe("logger", () => {
 let stdoutSpy: ReturnType<typeof vi.spyOn>;
 let stderrSpy: ReturnType<typeof vi.spyOn>;

 beforeEach(() => {
  stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
 });

 afterEach(() => {
  stdoutSpy.mockRestore();
  stderrSpy.mockRestore();
 });

 function captured(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
  const line = spy.mock.calls[0][0] as string;
  return JSON.parse(line.trim());
 }

 it("writes info logs as JSON to stdout", () => {
  logger.info("hello", { event: "test", count: 1 });
  expect(stderrSpy).not.toHaveBeenCalled();
  const entry = captured(stdoutSpy);
  expect(entry).toMatchObject({
   level: "INFO",
   logger: "docwebapp",
   message: "hello",
   event: "test",
   count: 1,
  });
  expect(typeof entry.timestamp).toBe("string");
  expect(new Date(entry.timestamp as string).toString()).not.toBe("Invalid Date");
 });

 it("writes warn logs to stdout with WARN level", () => {
  logger.warn("careful", { event: "slow" });
  expect(captured(stdoutSpy).level).toBe("WARN");
  expect(stderrSpy).not.toHaveBeenCalled();
 });

 it("routes error logs to stderr", () => {
  logger.error("boom", { event: "crash" });
  expect(stdoutSpy).not.toHaveBeenCalled();
  expect(captured(stderrSpy)).toMatchObject({ level: "ERROR", message: "boom", event: "crash" });
 });

 it("emits a single newline-terminated line", () => {
  logger.info("one-liner");
  const line = stdoutSpy.mock.calls[0][0] as string;
  expect(line.endsWith("\n")).toBe(true);
  expect(line.indexOf("\n")).toBe(line.length - 1);
 });

 it("works with no extra fields", () => {
  logger.info("bare");
  expect(captured(stdoutSpy)).toMatchObject({ level: "INFO", message: "bare" });
 });
});

describe("newRequestId", () => {
 it("returns distinct ids on consecutive calls", () => {
  const a = newRequestId();
  const b = newRequestId();
  expect(a).not.toBe(b);
 });

 it("pads short ids to at least 4 chars", () => {
  const id = newRequestId();
  expect(id.length).toBeGreaterThanOrEqual(4);
 });

 it("returns base36 strings", () => {
  const id = newRequestId();
  expect(id).toMatch(/^[0-9a-z]+$/);
 });
});
