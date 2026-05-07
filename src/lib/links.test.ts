import { describe, it, expect } from "vitest";
import {
 resolveDocLink,
 normalizePath,
 renderMarkdownWithLinks,
 extractHeadings,
 slugify,
} from "$lib/links";

describe("resolveDocLink", () => {
 const source = "proxmox-setup";
 const filePath = "documentation/shell_environment.md";

 it("returns null for http URLs", () => {
  expect(resolveDocLink("https://example.com", source, filePath)).toBeNull();
  expect(resolveDocLink("http://example.com/page", source, filePath)).toBeNull();
 });

 it("returns null for mailto links", () => {
  expect(resolveDocLink("mailto:user@example.com", source, filePath)).toBeNull();
 });

 it("returns null for anchor-only links", () => {
  expect(resolveDocLink("#section-heading", source, filePath)).toBeNull();
 });

 it("returns null for empty href", () => {
  expect(resolveDocLink("", source, filePath)).toBeNull();
 });

 it("returns null for ftp and data URIs", () => {
  expect(resolveDocLink("ftp://files.example.com/doc.txt", source, filePath)).toBeNull();
  expect(resolveDocLink("data:text/plain;base64,SGVsbG8=", source, filePath)).toBeNull();
 });

 it("resolves bare filename in same directory", () => {
  expect(resolveDocLink("ansible_build_commands.md", source, filePath)).toBe(
   "/doc/proxmox-setup%3Adocumentation%2Fansible_build_commands.md",
  );
 });

 it("resolves ./filename in same directory", () => {
  expect(resolveDocLink("./systemd.md", source, filePath)).toBe(
   "/doc/proxmox-setup%3Adocumentation%2Fsystemd.md",
  );
 });

 it("resolves ../path for parent directory traversal", () => {
  const deepFile = "docs/sub/current.md";
  expect(resolveDocLink("../other/file.md", source, deepFile)).toBe(
   "/doc/proxmox-setup%3Adocs%2Fother%2Ffile.md",
  );
 });

 it("resolves subdirectory path", () => {
  expect(resolveDocLink("sub/guide.md", source, filePath)).toBe(
   "/doc/proxmox-setup%3Adocumentation%2Fsub%2Fguide.md",
  );
 });

 it("preserves fragment after rewritten URL", () => {
  expect(resolveDocLink("ansible_build_commands.md#usage", source, filePath)).toBe(
   "/doc/proxmox-setup%3Adocumentation%2Fansible_build_commands.md#usage",
  );
 });

 it("resolves non-.md files to /api/files/", () => {
  expect(resolveDocLink("diagram.png", source, filePath)).toBe(
   "/api/files/proxmox-setup%3Adocumentation%2Fdiagram.png",
  );
 });

 it("resolves non-.md files with subdirectory", () => {
  expect(resolveDocLink("images/screenshot.jpg", source, filePath)).toBe(
   "/api/files/proxmox-setup%3Adocumentation%2Fimages%2Fscreenshot.jpg",
  );
 });

 it("handles document at repo root (no directory)", () => {
  expect(resolveDocLink("other.md", source, "README.md")).toBe(
   "/doc/proxmox-setup%3Aother.md",
  );
 });

 it("handles multiple ../ segments", () => {
  const deepFile = "a/b/c/deep.md";
  expect(resolveDocLink("../../target.md", source, deepFile)).toBe(
   "/doc/proxmox-setup%3Aa%2Ftarget.md",
  );
 });

 it("normalizes paths with redundant segments", () => {
  expect(resolveDocLink("./sub/../file.md", source, filePath)).toBe(
   "/doc/proxmox-setup%3Adocumentation%2Ffile.md",
  );
 });
});

describe("normalizePath", () => {
 it("removes ./ prefixes", () => {
  expect(normalizePath("./docs/file.md")).toBe("docs/file.md");
 });

 it("collapses .. segments", () => {
  expect(normalizePath("docs/sub/../file.md")).toBe("docs/file.md");
 });

 it("handles multiple .. segments", () => {
  expect(normalizePath("a/b/c/../../d.md")).toBe("a/d.md");
 });

 it("handles simple path", () => {
  expect(normalizePath("docs/file.md")).toBe("docs/file.md");
 });

 it("handles bare filename", () => {
  expect(normalizePath("file.md")).toBe("file.md");
 });

 it("removes empty segments from double slashes", () => {
  expect(normalizePath("docs//file.md")).toBe("docs/file.md");
 });
});

describe("renderMarkdownWithLinks", () => {
 const source = "my-repo";
 const filePath = "docs/guide.md";

 it("rewrites relative markdown links in rendered HTML", () => {
  const html = renderMarkdownWithLinks("[Other doc](other.md)", source, filePath);
  expect(html).toContain('href="/doc/my-repo%3Adocs%2Fother.md"');
  expect(html).toContain(">Other doc</a>");
 });

 it("leaves external links unchanged", () => {
  const html = renderMarkdownWithLinks("[Google](https://google.com)", source, filePath);
  expect(html).toContain('href="https://google.com"');
 });

 it("leaves anchor links unchanged", () => {
  const html = renderMarkdownWithLinks("[Section](#intro)", source, filePath);
  expect(html).toContain('href="#intro"');
 });

 it("rewrites image sources to /api/files/", () => {
  const html = renderMarkdownWithLinks("![diagram](images/arch.png)", source, filePath);
  expect(html).toContain('src="/api/files/my-repo%3Adocs%2Fimages%2Farch.png"');
  expect(html).toContain('alt="diagram"');
 });

 it("leaves external image sources unchanged", () => {
  const html = renderMarkdownWithLinks("![logo](https://example.com/logo.png)", source, filePath);
  expect(html).toContain('src="https://example.com/logo.png"');
 });

 it("preserves link title attribute", () => {
  const html = renderMarkdownWithLinks('[Docs](other.md "Read more")', source, filePath);
  expect(html).toContain('title="Read more"');
  expect(html).toContain('href="/doc/my-repo%3Adocs%2Fother.md"');
 });

 it("handles link with fragment", () => {
  const html = renderMarkdownWithLinks("[Setup](setup.md#install)", source, filePath);
  expect(html).toContain('href="/doc/my-repo%3Adocs%2Fsetup.md#install"');
 });

 it("injects id attributes on h1-h3 matching extracted slugs", () => {
  const md = "# Intro\n\n## Getting Started\n\n### Install steps\n";
  const html = renderMarkdownWithLinks(md, source, filePath);
  expect(html).toContain('<h1 id="intro">');
  expect(html).toContain('<h2 id="getting-started">');
  expect(html).toContain('<h3 id="install-steps">');
 });

 it("does not add id attributes to h4+ headings", () => {
  const html = renderMarkdownWithLinks("#### Deep heading\n", source, filePath);
  expect(html).toContain("<h4>");
  expect(html).not.toMatch(/<h4\s+id=/);
 });

 it("dedupes repeated heading slugs", () => {
  const md = "## Setup\n\n## Setup\n\n## Setup\n";
  const html = renderMarkdownWithLinks(md, source, filePath);
  expect(html).toContain('id="setup"');
  expect(html).toContain('id="setup-2"');
  expect(html).toContain('id="setup-3"');
 });
});

describe("slugify", () => {
 it("lowercases and hyphenates", () => {
  expect(slugify("Hello World")).toBe("hello-world");
 });

 it("strips punctuation", () => {
  expect(slugify("What's up?")).toBe("whats-up");
 });

 it("collapses whitespace and underscores", () => {
  expect(slugify("foo   bar_baz")).toBe("foo-bar-baz");
 });

 it("trims leading and trailing hyphens", () => {
  expect(slugify("  --hello--  ")).toBe("hello");
 });
});

describe("extractHeadings", () => {
 it("returns h1-h3 entries in document order", () => {
  const md = "# A\n\nbody\n\n## B\n\n### C\n\n#### D should be skipped\n\n## E";
  const entries = extractHeadings(md);
  expect(entries).toEqual([
   { level: 1, text: "A", slug: "a" },
   { level: 2, text: "B", slug: "b" },
   { level: 3, text: "C", slug: "c" },
   { level: 2, text: "E", slug: "e" },
  ]);
 });

 it("strips inline markdown formatting from heading text", () => {
  const md = "## Use `npm install` to **set up**";
  const entries = extractHeadings(md);
  expect(entries).toEqual([
   { level: 2, text: "Use npm install to set up", slug: "use-npm-install-to-set-up" },
  ]);
 });

 it("dedupes repeated slugs deterministically with the renderer", () => {
  const md = "## Setup\n\n## Setup\n\n## Setup\n";
  const entries = extractHeadings(md);
  const html = renderMarkdownWithLinks(md, "src", "f.md");
  expect(entries.map((e) => e.slug)).toEqual(["setup", "setup-2", "setup-3"]);
  for (const slug of entries.map((e) => e.slug)) {
   expect(html).toContain(`id="${slug}"`);
  }
 });

 it("returns empty array when there are no h1-h3 headings", () => {
  expect(extractHeadings("just a paragraph")).toEqual([]);
  expect(extractHeadings("#### only h4\n")).toEqual([]);
 });
});
