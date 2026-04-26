/**
 * Format a source/project name for display.
 * Replaces hyphens and underscores with spaces, applies Title Case,
 * preserves short all-caps words (e.g., API, DNS).
 */
const ACRONYMS = new Set([
  "api",
  "cd",
  "ci",
  "cv",
  "dag",
  "dns",
  "http",
  "ip",
  "mcp",
  "ssh",
  "ssl",
  "tcp",
  "tls",
  "udp",
  "ui",
  "url",
  "vm",
]);

export function displaySource(name: string): string {
  let display = name.replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();

  display = display
    .split(" ")
    .map((word) => {
      if (word.length === 0) return word;
      if (word === word.toUpperCase() && word.length <= 4) return word;
      if (ACRONYMS.has(word.toLowerCase())) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");

  return display || name;
}

/**
 * Strip a source/project name prefix from a title.
 * Normalises both to lowercase alphanumeric for matching, so "document-stream"
 * matches "DocumentStream" at the start of a title. After stripping, removes
 * any leading grammar characters (hyphens, colons, commas, em/en-dashes).
 */
export function stripSourcePrefix(title: string, source: string): string {
  const normalizedSource = source.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  if (!normalizedSource) return title;

  // Walk through title chars, matching alphanumeric chars against the normalised source
  let matched = 0;
  let endIndex = 0;
  for (let i = 0; i < title.length && matched < normalizedSource.length; i++) {
    const ch = title[i].toLowerCase();
    if (/[a-z0-9]/.test(ch)) {
      if (ch !== normalizedSource[matched]) return title;
      matched++;
    }
    endIndex = i + 1;
  }

  if (matched < normalizedSource.length) return title;

  // Strip prefix and leading grammar/whitespace
  const remainder = title.slice(endIndex).replace(/^[\s\-–—:,]+/, "");
  return remainder || title;
}

/**
 * Format a document title for display.
 * Normalises filenames by removing extensions, replacing separators with spaces,
 * stripping date prefixes (YYMMDD-), and converting to Title Case.
 * When a source name is provided, strips it from the title prefix.
 */
export function displayTitle(doc: {
  title: string | null;
  file_path: string;
  source?: string;
}): string {
  // Root-level files: use filename with extension (e.g. "README.md", "CLAUDE.md")
  // to distinguish them since they often share the same title metadata.
  if (!doc.file_path.includes("/")) {
    return doc.file_path;
  }

  // SKILL.md files: use parent directory to build "Skill: <Name>"
  const skillMatch = doc.file_path.match(/skills\/([^/]+)\/SKILL\.md$/i);
  if (skillMatch) {
    const skillName = skillMatch[1]
      .replace(/[_-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .map((w) => {
        if (w === w.toUpperCase() && w.length <= 3) return w;
        if (ACRONYMS.has(w.toLowerCase())) return w.toUpperCase();
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      })
      .join(" ");
    return `Skill: ${skillName}`;
  }

  // Use title if it looks like a real title (not just a filename)
  if (doc.title && !doc.title.includes("/") && !doc.title.endsWith(".md")) {
    return doc.source ? stripSourcePrefix(doc.title, doc.source) : doc.title;
  }

  const filename = doc.file_path.split("/").pop() || doc.file_path;

  let name = filename
    // Remove file extension
    .replace(/\.[^.]+$/, "")
    // Strip leading date prefix like 260318- or 250321-
    .replace(/^\d{6}-/, "")
    // Replace underscores and hyphens with spaces
    .replace(/[_-]/g, " ")
    // Collapse multiple spaces
    .replace(/\s+/g, " ")
    .trim();

  // Title Case: capitalize first letter of each word
  name = name
    .split(" ")
    .map((word) => {
      if (word.length === 0) return word;
      // If the word is all-caps and very short (like SDK, API, DNS), keep it
      if (word === word.toUpperCase() && word.length <= 3) return word;
      if (ACRONYMS.has(word.toLowerCase())) return word.toUpperCase();
      // Otherwise, capitalize first letter and lowercase the rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");

  return name || filename;
}
