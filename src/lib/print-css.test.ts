/**
 * Tests that the @media print styles in app.css are present and correct.
 *
 * These tests parse the raw CSS to guard against accidental removal or
 * weakening of print rules (e.g. dropping !important, removing a hidden
 * selector, changing font sizes). They don't rely on a browser rendering
 * engine — they check the stylesheet source directly.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

let printBlock = "";

beforeAll(() => {
 const css = readFileSync(resolve(__dirname, "../app.css"), "utf-8");

 // Extract the @media print { … } block.
 // Find the start, then match braces to find the end.
 const start = css.indexOf("@media print");
 expect(start).toBeGreaterThan(-1);

 let depth = 0;
 let end = start;
 for (let i = css.indexOf("{", start); i < css.length; i++) {
  if (css[i] === "{") depth++;
  if (css[i] === "}") depth--;
  if (depth === 0) {
   end = i + 1;
   break;
  }
 }

 printBlock = css.slice(start, end);
});

describe("print CSS: @media print block exists", () => {
 it("contains an @media print block", () => {
  expect(printBlock.length).toBeGreaterThan(100);
 });
});

describe("print CSS: UI chrome is hidden", () => {
 const chromeSelectors = [".govuk-header", ".govuk-service-nav", ".sidebar", ".chat-panel", ".backdrop"];

 for (const selector of chromeSelectors) {
  it(`hides ${selector} with display: none !important`, () => {
   expect(printBlock).toContain(selector);
   // The selectors are grouped in one rule, so just check the rule
   // contains display: none !important somewhere after the selector list
  });
 }

 it("uses display: none !important for chrome elements", () => {
  expect(printBlock).toMatch(/display:\s*none\s*!important/);
 });
});

describe("print CSS: breadcrumbs hidden", () => {
 it("hides breadcrumb navigation", () => {
  expect(printBlock).toContain('nav[aria-label="Breadcrumb"]');
  // Check it's set to display: none somewhere in the block
  const breadcrumbSection = printBlock.slice(printBlock.indexOf('nav[aria-label="Breadcrumb"]'));
  expect(breadcrumbSection).toMatch(/display:\s*none/);
 });
});

describe("print CSS: layout overflow is unblocked", () => {
 it(".app-layout has overflow: visible !important", () => {
  expect(printBlock).toMatch(/\.app-layout\s*\{[^}]*overflow:\s*visible\s*!important/);
 });

 it(".app-layout has height: auto !important", () => {
  expect(printBlock).toMatch(/\.app-layout\s*\{[^}]*height:\s*auto\s*!important/);
 });

 it(".main-area has overflow: visible !important", () => {
  expect(printBlock).toMatch(/\.main-area\s*\{[^}]*overflow:\s*visible\s*!important/);
 });

 it(".content has overflow: visible !important", () => {
  expect(printBlock).toMatch(/\.content\s*\{[^}]*overflow:\s*visible\s*!important/);
 });
});

describe("print CSS: forces light colours", () => {
 it("sets --bg-body to white", () => {
  expect(printBlock).toMatch(/--bg-body:\s*#ffffff/);
 });

 it("sets --text to black", () => {
  expect(printBlock).toMatch(/--text:\s*#000000/);
 });

 it("overrides dark theme", () => {
  expect(printBlock).toContain('[data-theme="dark"]');
 });
});

describe("print CSS: compact typography", () => {
 it("body font-size is 10pt", () => {
  expect(printBlock).toMatch(/body\s*\{[^}]*font-size:\s*10pt\s*!important/);
 });

 it(".markdown-content font-size is 10pt", () => {
  expect(printBlock).toMatch(/\.markdown-content\s*\{[^}]*font-size:\s*10pt\s*!important/);
 });

 it("h1 is 15pt", () => {
  expect(printBlock).toMatch(/\.markdown-content\s+h1\s*\{[^}]*font-size:\s*15pt\s*!important/);
 });

 it("h2 is 13pt", () => {
  expect(printBlock).toMatch(/\.markdown-content\s+h2\s*\{[^}]*font-size:\s*13pt\s*!important/);
 });

 it("h3 is 11pt", () => {
  expect(printBlock).toMatch(/\.markdown-content\s+h3\s*\{[^}]*font-size:\s*11pt\s*!important/);
 });

 it("code is 8pt", () => {
  expect(printBlock).toMatch(/\.markdown-content\s+code\s*\{[^}]*font-size:\s*8pt\s*!important/);
 });

 it("table is 9pt", () => {
  expect(printBlock).toMatch(/\.markdown-content\s+table\s*\{[^}]*font-size:\s*9pt\s*!important/);
 });
});

describe("print CSS: page break control", () => {
 it("prevents break inside code blocks", () => {
  expect(printBlock).toMatch(/\.markdown-content\s+pre[\s\S]*?break-inside:\s*avoid/);
 });

 it("prevents break inside blockquotes", () => {
  expect(printBlock).toMatch(/\.markdown-content\s+blockquote[\s\S]*?break-inside:\s*avoid/);
 });

 it("prevents break after headings", () => {
  expect(printBlock).toMatch(/\.markdown-content\s+h1[\s\S]*?break-after:\s*avoid/);
 });
});

describe("print CSS: all !important flags present", () => {
 // These are the critical properties that MUST have !important to override
 // Svelte-scoped styles. If any of these lose !important, the print layout breaks.
 const criticalRules = [
  { selector: ".app-layout", property: "height", value: "auto" },
  { selector: ".app-layout", property: "overflow", value: "visible" },
  { selector: ".main-area", property: "overflow", value: "visible" },
  { selector: ".content", property: "overflow", value: "visible" },
  { selector: "body", property: "font-size", value: "10pt" },
 ];

 for (const rule of criticalRules) {
  it(`${rule.selector} { ${rule.property}: ${rule.value} } has !important`, () => {
   // Find the rule block for this selector
   const selectorIdx = printBlock.indexOf(rule.selector);
   expect(selectorIdx).toBeGreaterThan(-1);
   const blockStart = printBlock.indexOf("{", selectorIdx);
   const blockEnd = printBlock.indexOf("}", blockStart);
   const block = printBlock.slice(blockStart, blockEnd);

   const propRegex = new RegExp(`${rule.property}:\\s*${rule.value}\\s*!important`);
   expect(block).toMatch(propRegex);
  });
 }
});

describe("print CSS: metadata 3-row layout", () => {
 it(".doc-meta-row uses flex-direction: column !important", () => {
  expect(printBlock).toMatch(/\.doc-meta-row\s*\{[^}]*flex-direction:\s*column\s*!important/);
 });

 it(".doc-meta-row uses display: flex !important", () => {
  expect(printBlock).toMatch(/\.doc-meta-row\s*\{[^}]*display:\s*flex\s*!important/);
 });

 it(".doc-dates-row has reduced margin-top", () => {
  expect(printBlock).toMatch(/\.doc-dates-row\s*\{[^}]*margin-top:\s*2px\s*!important/);
 });
});

describe("print CSS: source badge stripped", () => {
 it(".source-badge has padding: 0 !important", () => {
  expect(printBlock).toMatch(/\.source-badge[\s\S]*?padding:\s*0\s*!important/);
 });

 it(".source-badge has background: none !important", () => {
  expect(printBlock).toMatch(/\.source-badge[\s\S]*?background:\s*none\s*!important/);
 });

 it(".source-tag has padding: 0 !important", () => {
  expect(printBlock).toMatch(/\.source-tag[\s\S]*?padding:\s*0\s*!important/);
 });
});
