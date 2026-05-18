import { describe, it, expect } from "vitest";
import { buildCspHeader } from "./csp";

describe("buildCspHeader", () => {
 const header = buildCspHeader();

 it("emits default-src 'self'", () => {
  expect(header).toMatch(/default-src 'self'/);
 });

 it("permits inline scripts for SvelteKit hydration", () => {
  expect(header).toMatch(/script-src [^;]*'unsafe-inline'/);
 });

 it("permits inline styles for Svelte scoped components", () => {
  expect(header).toMatch(/style-src [^;]*'unsafe-inline'/);
 });

 it("permits data: image URIs for inline markdown images", () => {
  expect(header).toMatch(/img-src [^;]*data:/);
 });

 it("locks frame-ancestors to 'none' to prevent clickjacking", () => {
  expect(header).toMatch(/frame-ancestors 'none'/);
 });

 it("locks object-src to 'none' to disable legacy plugins", () => {
  expect(header).toMatch(/object-src 'none'/);
 });

 it("locks form-action and base-uri to 'self'", () => {
  expect(header).toMatch(/form-action 'self'/);
  expect(header).toMatch(/base-uri 'self'/);
 });

 it("uses semicolons between directives", () => {
  // Cheap shape check — every directive ends with `; ` except the last.
  const parts = header.split("; ");
  expect(parts.length).toBeGreaterThan(5);
  for (const part of parts) {
   expect(part).toMatch(/^[a-z-]+ /);
  }
 });
});
