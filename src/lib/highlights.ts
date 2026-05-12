/**
 * Per-passage text highlighting backed by localStorage.
 *
 * Anchoring strategy: store the highlighted text + 20 chars of context on each side.
 * On load we search root.textContent for `prefix + text + suffix` and re-locate the
 * range. Falls back to searching for `text` alone if the contextual match fails
 * (small upstream edits to surrounding markdown).
 */

export interface HighlightAnchor {
 id: string;
 text: string;
 prefix: string;
 suffix: string;
 createdAt: string;
}

const CONTEXT_CHARS = 20;
const STORAGE_PREFIX = "docs-webapp:highlights:";

function storageKey(docId: string): string {
 return `${STORAGE_PREFIX}${docId}`;
}

function newId(): string {
 return `h${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadHighlights(docId: string): HighlightAnchor[] {
 if (typeof localStorage === "undefined") return [];
 const raw = localStorage.getItem(storageKey(docId));
 if (!raw) return [];
 try {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
   (h): h is HighlightAnchor =>
    typeof h === "object" &&
    h !== null &&
    typeof h.id === "string" &&
    typeof h.text === "string" &&
    typeof h.prefix === "string" &&
    typeof h.suffix === "string" &&
    typeof h.createdAt === "string",
  );
 } catch {
  return [];
 }
}

export function saveHighlight(docId: string, anchor: HighlightAnchor): void {
 if (typeof localStorage === "undefined") return;
 const existing = loadHighlights(docId);
 existing.push(anchor);
 localStorage.setItem(storageKey(docId), JSON.stringify(existing));
}

export function removeHighlight(docId: string, id: string): void {
 if (typeof localStorage === "undefined") return;
 const existing = loadHighlights(docId).filter((h) => h.id !== id);
 localStorage.setItem(storageKey(docId), JSON.stringify(existing));
}

/**
 * Build a `HighlightAnchor` from the current selection.
 *
 * Returns null when the selection is empty, less than 2 chars, not entirely inside
 * `root`, crosses a block-level boundary, or sits inside a code block.
 */
export function anchorFromSelection(
 root: HTMLElement,
 selection: Selection | null,
): HighlightAnchor | null {
 if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
 const range = selection.getRangeAt(0);
 const text = range.toString();
 if (text.trim().length < 2) return null;

 if (!root.contains(range.commonAncestorContainer)) return null;

 const startBlock = closestBlock(range.startContainer, root);
 const endBlock = closestBlock(range.endContainer, root);
 if (!startBlock || !endBlock || startBlock !== endBlock) return null;

 if (startBlock.tagName === "PRE" || startBlock.closest("pre")) return null;

 const rootText = root.textContent ?? "";
 const startOffset = textOffsetWithin(root, range.startContainer, range.startOffset);
 if (startOffset < 0) return null;
 const endOffset = startOffset + text.length;
 const prefix = rootText.slice(Math.max(0, startOffset - CONTEXT_CHARS), startOffset);
 const suffix = rootText.slice(endOffset, endOffset + CONTEXT_CHARS);

 return {
  id: newId(),
  text,
  prefix,
  suffix,
  createdAt: new Date().toISOString(),
 };
}

/**
 * Apply a list of anchors as `<mark class="hl-mark">` wrappers inside `root`.
 * Idempotent: clears any existing `.hl-mark` wrappers first.
 */
export function applyHighlights(root: HTMLElement, anchors: HighlightAnchor[]): void {
 unwrapExistingMarks(root);
 for (const anchor of anchors) {
  const located = locateAnchor(root, anchor);
  if (!located) continue;
  wrapInMark(root, located.start, located.end, anchor.id);
 }
}

function unwrapExistingMarks(root: HTMLElement): void {
 const existing = root.querySelectorAll("mark.hl-mark");
 existing.forEach((mark) => {
  const parent = mark.parentNode;
  if (!parent) return;
  while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
  parent.removeChild(mark);
 });
 root.normalize();
}

function locateAnchor(
 root: HTMLElement,
 anchor: HighlightAnchor,
): { start: number; end: number } | null {
 const text = root.textContent ?? "";
 const composite = anchor.prefix + anchor.text + anchor.suffix;
 let idx = composite.length > 0 ? text.indexOf(composite) : -1;
 if (idx >= 0) {
  const start = idx + anchor.prefix.length;
  return { start, end: start + anchor.text.length };
 }
 idx = text.indexOf(anchor.text);
 if (idx >= 0) return { start: idx, end: idx + anchor.text.length };
 return null;
}

function wrapInMark(root: HTMLElement, start: number, end: number, id: string): void {
 if (start >= end) return;
 const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
 const targets: { node: Text; from: number; to: number }[] = [];
 let total = 0;
 let current = walker.nextNode() as Text | null;
 while (current) {
  const len = current.data.length;
  const nodeEnd = total + len;
  if (nodeEnd > start && total < end) {
   const from = Math.max(0, start - total);
   const to = Math.min(len, end - total);
   if (to > from) targets.push({ node: current, from, to });
  }
  total = nodeEnd;
  if (total >= end) break;
  current = walker.nextNode() as Text | null;
 }
 // Walk in reverse so earlier-text-node offsets remain valid after splits.
 for (let i = targets.length - 1; i >= 0; i--) {
  const { node, from, to } = targets[i];
  let middle: Text = node;
  if (to < node.data.length) node.splitText(to);
  if (from > 0) middle = node.splitText(from);
  const wrap = document.createElement("mark");
  wrap.className = "hl-mark";
  wrap.dataset.hlId = id;
  middle.parentNode?.insertBefore(wrap, middle);
  wrap.appendChild(middle);
 }
}

function closestBlock(node: Node, root: HTMLElement): HTMLElement | null {
 let n: Node | null = node;
 if (n.nodeType === Node.TEXT_NODE) n = n.parentNode;
 while (n && n !== root) {
  if (n.nodeType === Node.ELEMENT_NODE) {
   const el = n as HTMLElement;
   if (isBlock(el)) return el;
  }
  n = n.parentNode;
 }
 return null;
}

const BLOCK_TAGS = new Set([
 "P",
 "H1",
 "H2",
 "H3",
 "H4",
 "H5",
 "H6",
 "BLOCKQUOTE",
 "DIV",
 "LI",
 "PRE",
 "TR",
 "TD",
 "TH",
]);

function isBlock(el: HTMLElement): boolean {
 return BLOCK_TAGS.has(el.tagName);
}

/** Character offset of (node, offset) within root.textContent, or -1 if not found. */
function textOffsetWithin(root: HTMLElement, node: Node, offset: number): number {
 if (node.nodeType === Node.TEXT_NODE) {
  let total = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
   if (current === node) return total + offset;
   total += (current.textContent ?? "").length;
   current = walker.nextNode();
  }
  return -1;
 }
 // Element node: count text before the offset-th child.
 const el = node as Element;
 const childCount = el.childNodes.length;
 if (offset > childCount) return -1;
 let total = 0;
 for (let i = 0; i < offset; i++) {
  total += (el.childNodes[i].textContent ?? "").length;
 }
 // Combine with offsets in ancestors.
 const before = textOffsetOfElement(root, el);
 if (before < 0) return -1;
 return before + total;
}

function textOffsetOfElement(root: HTMLElement, target: Element): number {
 if (target === root) return 0;
 let total = 0;
 const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
 let current = walker.nextNode();
 while (current) {
  const inside = target.contains(current);
  if (inside) return total;
  total += (current.textContent ?? "").length;
  current = walker.nextNode();
 }
 return total;
}

export const __testing__ = {
 storageKey,
 newId,
 locateAnchor,
};
