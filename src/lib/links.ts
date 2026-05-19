import { Marked, type Tokens } from "marked";
import { sanitiseHtml } from "$lib/sanitise";

/**
 * Resolve a relative markdown link href into an app URL.
 *
 * Returns the rewritten URL string, or null if the link should be left as-is
 * (external URLs, anchors, mailto, etc.).
 */
export function resolveDocLink(
 href: string,
 currentSource: string,
 currentFilePath: string,
): string | null {
 if (!href) return null;

 // Leave external URLs, mailto links, and anchor-only links unchanged
 if (/^(?:https?:|mailto:|ftp:|data:)/i.test(href)) return null;
 if (href.startsWith("#")) return null;

 // Separate fragment from path
 const hashIndex = href.indexOf("#");
 let path: string;
 let fragment = "";
 if (hashIndex !== -1) {
  path = href.slice(0, hashIndex);
  fragment = href.slice(hashIndex);
 } else {
  path = href;
 }

 // If path is empty after extracting fragment, it's an anchor-only link
 if (!path) return null;

 // Compute the directory of the current document
 const lastSlash = currentFilePath.lastIndexOf("/");
 const currentDir = lastSlash === -1 ? "" : currentFilePath.slice(0, lastSlash + 1);

 // Resolve the relative path against the current directory
 const resolved = normalizePath(currentDir + path);

 // Build the doc_id
 const docId = `${currentSource}:${resolved}`;

 // .md files go to /doc/, everything else goes to /api/files/
 const base = resolved.endsWith(".md") ? "/doc/" : "/api/files/";

 return `${base}${encodeURIComponent(docId)}${fragment}`;
}

/**
 * Normalize a file path by collapsing `.` and `..` segments and removing
 * leading `./` prefixes.
 */
export function normalizePath(path: string): string {
 const parts = path.split("/");
 const result: string[] = [];

 for (const part of parts) {
  if (part === "." || part === "") {
   continue;
  } else if (part === "..") {
   result.pop();
  } else {
   result.push(part);
  }
 }

 return result.join("/");
}

/** A heading entry suitable for table-of-contents rendering. */
export interface TocEntry {
 level: 1 | 2 | 3;
 text: string;
 slug: string;
}

/** Convert heading text into a URL-safe slug. */
export function slugify(text: string): string {
 return text
  .toLowerCase()
  .trim()
  .replace(/[^\w\s-]/g, "")
  .replace(/[\s_]+/g, "-")
  .replace(/^-+|-+$/g, "");
}

/**
 * Build a stateful slug allocator that deduplicates repeated headings by
 * appending `-2`, `-3`, etc. The same input sequence always produces the
 * same output sequence, so a renderer pass and an extraction pass agree.
 */
function createSlugger() {
 const seen = new Map<string, number>();
 return (text: string): string => {
  const base = slugify(text) || "section";
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
 };
}

/**
 * Strip basic markdown formatting from heading text so the TOC label and
 * the heading slug are computed against the plain text.
 */
function plainText(raw: string): string {
 return raw
  .replace(/`([^`]*)`/g, "$1")
  .replace(/\*\*([^*]+)\*\*/g, "$1")
  .replace(/\*([^*]+)\*/g, "$1")
  .replace(/_([^_]+)_/g, "$1")
  .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
}

/** One key/value pair parsed from a document's YAML frontmatter. */
export interface FrontmatterEntry {
 key: string;
 value: string;
}

/**
 * Split a leading YAML frontmatter block off the markdown body.
 *
 * The backend serves raw file content, so a SKILL.md / doc that starts with
 * a `---\n...\n---\n` block would otherwise be fed to Marked, which renders
 * the `---` as a setext-heading rule and the `key: value` lines as one bold
 * blob. We instead parse the block into ordered entries (rendered as a tidy
 * metadata table by the doc page) and hand the clean body to the renderer.
 *
 * This is display-only: it handles the observed shapes — flat `key: value`,
 * folded `>` and block `|` scalars (continuation lines are folded with
 * spaces), and wrapped values. Nested maps / lists are stringified rather
 * than structured. Detection is deliberately strict: the block is only
 * recognised when the file *starts* with `---` and a closing `---` line
 * follows AND at least one `key:` pair is present — so a `---` horizontal
 * rule or a setext heading in the body is never misread as frontmatter.
 */
export function parseFrontmatter(content: string): {
 entries: FrontmatterEntry[];
 body: string;
} {
 const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/);
 if (!m) return { entries: [], body: content };

 const lines = m[1].split(/\r?\n/);
 const entries: FrontmatterEntry[] = [];
 let cur: FrontmatterEntry | null = null;
 for (const line of lines) {
  const kv = line.match(/^([A-Za-z0-9_.-]+):[ \t]?(.*)$/);
  // A new key starts only at column 0 (no leading whitespace).
  if (kv && !/^\s/.test(line)) {
   if (cur) entries.push(cur);
   let v = kv[2].trim();
   if (v === ">" || v === "|" || v === ">-" || v === "|-" || v === "+") v = "";
   cur = { key: kv[1], value: v };
  } else if (cur) {
   const t = line.trim();
   if (t) cur.value = cur.value ? `${cur.value} ${t}` : t;
  }
 }
 if (cur) entries.push(cur);

 // No real pairs → almost certainly a horizontal-rule / setext document,
 // not frontmatter. Leave the content untouched.
 if (entries.length === 0) return { entries: [], body: content };

 return { entries, body: content.slice(m[0].length) };
}

/**
 * Walk the markdown source and return a list of h1-h3 headings with stable slugs.
 * Slugs match the IDs injected by `renderMarkdownWithLinks` for the same input.
 */
export function extractHeadings(content: string): TocEntry[] {
 const tokens = new Marked().lexer(content);
 const slugger = createSlugger();
 const entries: TocEntry[] = [];
 for (const token of tokens) {
  if (token.type === "heading" && token.depth >= 1 && token.depth <= 3) {
   const text = plainText(token.text);
   const slug = slugger(text);
   entries.push({ level: token.depth as 1 | 2 | 3, text, slug });
  }
 }
 return entries;
}

/**
 * Render markdown to HTML with relative links rewritten to app URLs.
 *
 * Creates a fresh Marked instance with a custom renderer that resolves
 * relative links and images against the current document's source and path.
 * h1-h3 headings get an `id` attribute computed by the same slugger used
 * by `extractHeadings`, so TOC anchor links resolve correctly.
 */
export function renderMarkdownWithLinks(
 content: string,
 source: string,
 filePath: string,
): string {
 const instance = new Marked();
 const slugger = createSlugger();
 instance.use({
  renderer: {
   link({ href, title, tokens }: Tokens.Link): string {
    const resolved = resolveDocLink(href, source, filePath);
    const finalHref = resolved ?? href;
    const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
    const text = this.parser.parseInline(tokens);
    return `<a href="${escapeAttr(finalHref)}"${titleAttr}>${text}</a>`;
   },
   image({ href, title, text }: Tokens.Image): string {
    const resolved = resolveDocLink(href, source, filePath);
    const finalSrc = resolved ?? href;
    const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
    const altAttr = text ? ` alt="${escapeAttr(text)}"` : "";
    return `<img src="${escapeAttr(finalSrc)}"${altAttr}${titleAttr} />`;
   },
   heading({ tokens, depth, text }: Tokens.Heading): string {
    const inner = this.parser.parseInline(tokens);
    if (depth >= 1 && depth <= 3) {
     const slug = slugger(plainText(text));
     return `<h${depth} id="${escapeAttr(slug)}">${inner}</h${depth}>\n`;
    }
    return `<h${depth}>${inner}</h${depth}>\n`;
   },
  },
 });
 return sanitiseHtml(instance.parse(content, { async: false }) as string);
}

/** Escape a string for use in an HTML attribute value. */
function escapeAttr(str: string): string {
 return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
