import { describe, it, expect } from "vitest";
import { displaySource, displayTitle, stripSourcePrefix } from "$lib/titles";

describe("displaySource", () => {
 it("converts hyphens to spaces and title-cases", () => {
  expect(displaySource("documentation-mcp-server")).toBe("Documentation MCP Server");
 });

 it("converts underscores to spaces and title-cases", () => {
  expect(displaySource("my_project_name")).toBe("My Project Name");
 });

 it("uppercases known acronyms", () => {
  expect(displaySource("documentation-ui")).toBe("Documentation UI");
  expect(displaySource("dns-proxy")).toBe("DNS Proxy");
  expect(displaySource("api-gateway")).toBe("API Gateway");
  expect(displaySource("claude-md-global")).toBe("Claude MD Global");
  expect(displaySource("md-formatter")).toBe("MD Formatter");
 });

 it("preserves already-uppercase short words", () => {
  expect(displaySource("MCP")).toBe("MCP");
 });

 it("handles single word", () => {
  expect(displaySource("journal")).toBe("Journal");
 });

 it("collapses multiple separators", () => {
  expect(displaySource("a--b__c")).toBe("A B C");
 });

 it("returns original name for empty string", () => {
  // displaySource returns name if result would be empty after trim
  expect(displaySource("")).toBe("");
 });
});

describe("stripSourcePrefix", () => {
 it("strips PascalCase project name from title with em-dash separator", () => {
  expect(stripSourcePrefix("DocumentStream — Implementation Plan", "document-stream")).toBe("Implementation Plan");
 });

 it("strips PascalCase project name from title with space only", () => {
  expect(stripSourcePrefix("DocumentStream Dictionary", "document-stream")).toBe("Dictionary");
 });

 it("strips when source has underscores", () => {
  expect(stripSourcePrefix("HomeServer Setup Guide", "home_server")).toBe("Setup Guide");
 });

 it("strips with en-dash separator", () => {
  expect(stripSourcePrefix("DocumentStream – Redis Pipeline", "document-stream")).toBe("Redis Pipeline");
 });

 it("strips with colon separator", () => {
  expect(stripSourcePrefix("DocumentStream: Getting Started", "document-stream")).toBe("Getting Started");
 });

 it("strips with comma separator", () => {
  expect(stripSourcePrefix("DocumentStream, Overview", "document-stream")).toBe("Overview");
 });

 it("strips with hyphen separator", () => {
  expect(stripSourcePrefix("DocumentStream - Architecture", "document-stream")).toBe("Architecture");
 });

 it("returns original title when source does not match", () => {
  expect(stripSourcePrefix("Unrelated Title", "document-stream")).toBe("Unrelated Title");
 });

 it("returns original title if stripping would leave nothing", () => {
  expect(stripSourcePrefix("DocumentStream", "document-stream")).toBe("DocumentStream");
 });

 it("handles empty source", () => {
  expect(stripSourcePrefix("Some Title", "")).toBe("Some Title");
 });
});

describe("displayTitle with source prefix stripping", () => {
 it("strips source prefix from title when source is provided", () => {
  expect(
   displayTitle({
    title: "DocumentStream — Implementation Plan",
    file_path: "docs/implementation-plan.md",
    source: "document-stream",
   }),
  ).toBe("Implementation Plan");
 });

 it("does not strip when source is not provided", () => {
  expect(
   displayTitle({
    title: "DocumentStream — Implementation Plan",
    file_path: "docs/implementation-plan.md",
   }),
  ).toBe("DocumentStream — Implementation Plan");
 });
});

describe("displayTitle SKILL.md handling", () => {
 it("uses parent directory name for skills/*/SKILL.md", () => {
  expect(
   displayTitle({ title: "About", file_path: "skills/code-review/SKILL.md" }),
  ).toBe("Skill: Code Review");
 });

 it("uses parent directory name even when title is null", () => {
  expect(
   displayTitle({ title: null, file_path: "skills/code-review/SKILL.md" }),
  ).toBe("Skill: Code Review");
 });

 it("handles underscores in skill directory name", () => {
  expect(
   displayTitle({ title: "About", file_path: "skills/my_custom_skill/SKILL.md" }),
  ).toBe("Skill: My Custom Skill");
 });

 it("preserves short acronyms in skill name", () => {
  expect(
   displayTitle({ title: null, file_path: "skills/api-client/SKILL.md" }),
  ).toBe("Skill: API Client");
 });

 it("is case-insensitive on the filename", () => {
  expect(
   displayTitle({ title: null, file_path: "skills/foo/skill.md" }),
  ).toBe("Skill: Foo");
 });
});

describe("displayTitle edge cases", () => {
 it("strips nested directory paths and shows only filename", () => {
  expect(displayTitle({ title: null, file_path: "a/b/c/my-doc.md" })).toBe("My Doc");
 });

 it("handles .engineering-team path", () => {
  expect(displayTitle({ title: null, file_path: ".engineering-team/evaluation-report.md" })).toBe("Evaluation Report");
 });

 it("keeps short acronyms uppercase in non-root filename", () => {
  expect(displayTitle({ title: null, file_path: "docs/API_GUIDE.md" })).toBe("API Guide");
 });

 it("uses raw filename for root-level files", () => {
  expect(displayTitle({ title: null, file_path: "README.md" })).toBe("README.md");
  expect(displayTitle({ title: null, file_path: "CLAUDE.md" })).toBe("CLAUDE.md");
  expect(displayTitle({ title: "Some Project Title", file_path: "README.md" })).toBe("README.md");
 });

 it("prefers title over filename when title is present", () => {
  expect(
   displayTitle({
    title: "My Custom Title",
    file_path: "docs/something-else.md",
   }),
  ).toBe("My Custom Title");
 });

 it("falls back to filename when title contains a slash", () => {
  expect(
   displayTitle({
    title: "docs/readme.md",
    file_path: "docs/readme.md",
   }),
  ).toBe("Readme");
 });

 it("returns raw filename for root file even when title ends with .md", () => {
  expect(
   displayTitle({
    title: "readme.md",
    file_path: "readme.md",
   }),
  ).toBe("readme.md");
 });
});
