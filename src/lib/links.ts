import { Marked, type Tokens } from "marked";

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

/**
 * Render markdown to HTML with relative links rewritten to app URLs.
 *
 * Creates a fresh Marked instance with a custom renderer that resolves
 * relative links and images against the current document's source and path.
 */
export function renderMarkdownWithLinks(
 content: string,
 source: string,
 filePath: string,
): string {
 const instance = new Marked();
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
  },
 });
 return instance.parse(content, { async: false }) as string;
}

/** Escape a string for use in an HTML attribute value. */
function escapeAttr(str: string): string {
 return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
