# Round 3 — Batch D (XSS Hardening) Implementation Plan

**Status:** superseded — completed and shipped in round 3; see [journal/260516-round-3-closer.md](../../journal/260516-round-3-closer.md) (archived 2026-05-19).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install DOMPurify and wrap the two `{@html}` render paths (ChatPanel assistant messages, `/doc/[id]` document body) so untrusted markdown can never inject script execution.

**Architecture:** One new module (`src/lib/sanitise.ts`) exporting a single `sanitiseHtml` function. Both render call sites pipe their marked-rendered HTML through it. SSR-compatible: use `isomorphic-dompurify` so the same module works in the SvelteKit server renderer and in the browser.

**Tech Stack:** `isomorphic-dompurify` (bundles `jsdom` for server-side use), `marked` (already installed), Vitest for the unit test suite.

**Spec:** `docs/superpowers/specs/2026-05-16-round-3-deferred-sweep-design.md` — Batch D.

---

## File Structure

```
package.json                                ← add isomorphic-dompurify dependency
src/lib/sanitise.ts                         ← NEW: sanitiseHtml(dirty: string): string
src/lib/sanitise.test.ts                    ← NEW: unit tests for sanitise
src/lib/components/ChatPanel.svelte         ← wrap marked.parse output in sanitiseHtml
src/lib/links.ts                            ← wrap renderMarkdownWithLinks output in sanitiseHtml
journal/260MMDD-round-3-batch-d-xss.md      ← new journal entry
```

Use a fresh branch `eng-round-3-batch-d-xss` off `main`.

---

## Task 1: Install `isomorphic-dompurify`

**Files:**
- Modify: `package.json`, `package-lock.json` (via npm install).

- [ ] **Step 1: Install the package**

```bash
npm install isomorphic-dompurify
```

This package bundles `dompurify` + `jsdom` and exports a unified interface that works in both the browser and Node SSR. The peer-dependency surface is small; npm should resolve it cleanly.

- [ ] **Step 2: Verify the dependency landed**

```bash
grep '"isomorphic-dompurify"' package.json
```

Expected output: one line showing the package in `dependencies` with a `^X.Y.Z` version range.

- [ ] **Step 3: Run build gates**

```bash
npm run check
npm run lint
npm test
```

Expected: clean. Test count unchanged (254). The dependency is added but no code uses it yet.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "$(cat <<'EOF'
Install isomorphic-dompurify (round 3 — batch D, prep)

The next two commits will wrap our two {@html} render paths
(ChatPanel and /doc/[id]) in DOMPurify. isomorphic-dompurify is the
SSR-friendly variant; it bundles jsdom for the server renderer and
uses the browser's DOMParser in the client bundle.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Create `src/lib/sanitise.ts` (TDD)

**Files:**
- Create: `src/lib/sanitise.test.ts`
- Create: `src/lib/sanitise.ts`

- [ ] **Step 1: Write the failing test file**

Create `src/lib/sanitise.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { sanitiseHtml } from "$lib/sanitise";

describe("sanitiseHtml", () => {
 describe("removes dangerous content", () => {
  it("strips <script> tags", () => {
   const dirty = "<p>hello</p><script>alert('xss')</script>";
   expect(sanitiseHtml(dirty)).not.toContain("<script>");
   expect(sanitiseHtml(dirty)).toContain("<p>hello</p>");
  });

  it("strips inline event handlers", () => {
   const dirty = `<img src="x" onerror="alert(1)" alt="oops">`;
   const clean = sanitiseHtml(dirty);
   expect(clean).not.toContain("onerror");
   expect(clean).not.toContain("alert");
  });

  it("strips javascript: URIs in href", () => {
   const dirty = `<a href="javascript:alert(1)">click</a>`;
   const clean = sanitiseHtml(dirty);
   expect(clean).not.toContain("javascript:");
  });

  it("strips <iframe>", () => {
   const dirty = `<p>hi</p><iframe src="https://evil.example/"></iframe>`;
   expect(sanitiseHtml(dirty)).not.toContain("<iframe");
  });

  it("strips <style> blocks", () => {
   const dirty = `<style>body{display:none}</style><p>visible</p>`;
   const clean = sanitiseHtml(dirty);
   expect(clean).not.toContain("<style");
   expect(clean).toContain("<p>visible</p>");
  });

  it("strips event handlers from style attributes that try to execute", () => {
   const dirty = `<div style="background:url(javascript:alert(1))">x</div>`;
   const clean = sanitiseHtml(dirty);
   expect(clean).not.toContain("javascript:");
  });
 });

 describe("preserves legitimate markdown output", () => {
  it("keeps headings", () => {
   const html = "<h1>Title</h1><h2>Sub</h2><h3>Sub-sub</h3>";
   expect(sanitiseHtml(html)).toBe(html);
  });

  it("keeps paragraphs, emphasis, and links with safe href", () => {
   const html = `<p>Hello <em>world</em> <strong>!</strong> <a href="/doc/foo">link</a></p>`;
   expect(sanitiseHtml(html)).toContain(`href="/doc/foo"`);
   expect(sanitiseHtml(html)).toContain("<em>world</em>");
   expect(sanitiseHtml(html)).toContain("<strong>!</strong>");
  });

  it("keeps lists, blockquote, hr, br", () => {
   const html = `<ul><li>a</li><li>b</li></ul><blockquote>q</blockquote><hr><br>`;
   const clean = sanitiseHtml(html);
   expect(clean).toContain("<ul>");
   expect(clean).toContain("<blockquote>");
   expect(clean).toContain("<hr>");
   expect(clean).toContain("<br>");
  });

  it("keeps pre/code blocks", () => {
   const html = `<pre><code>console.log(1)</code></pre>`;
   expect(sanitiseHtml(html)).toBe(html);
  });

  it("keeps tables", () => {
   const html = `<table><thead><tr><th>a</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>`;
   const clean = sanitiseHtml(html);
   expect(clean).toContain("<table>");
   expect(clean).toContain("<th>a</th>");
   expect(clean).toContain("<td>1</td>");
  });

  it("keeps <mark> for future highlight support", () => {
   const html = `<p>see <mark>this</mark></p>`;
   expect(sanitiseHtml(html)).toContain("<mark>this</mark>");
  });

  it("keeps <img> with src and alt (no event handlers)", () => {
   const html = `<img src="/api/files/foo:bar.png" alt="diagram">`;
   const clean = sanitiseHtml(html);
   expect(clean).toContain(`src="/api/files/foo:bar.png"`);
   expect(clean).toContain(`alt="diagram"`);
  });
 });

 describe("edge cases", () => {
  it("returns empty string for empty input", () => {
   expect(sanitiseHtml("")).toBe("");
  });

  it("returns plain text unchanged", () => {
   expect(sanitiseHtml("plain text")).toBe("plain text");
  });

  it("is idempotent", () => {
   const dirty = `<p>hi</p><script>x</script>`;
   const once = sanitiseHtml(dirty);
   const twice = sanitiseHtml(once);
   expect(once).toBe(twice);
  });
 });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test -- src/lib/sanitise.test.ts
```

Expected: failure with module-not-found error like `Cannot find module '$lib/sanitise'`.

- [ ] **Step 3: Implement `src/lib/sanitise.ts`**

Create `src/lib/sanitise.ts`:

```typescript
/**
 * HTML sanitiser for the two {@html} render paths in this app:
 *   - ChatPanel assistant messages (marked-rendered)
 *   - /doc/[id] document body (marked + link-rewrite)
 *
 * Allowlist covers tags that `marked` emits for standard markdown:
 *   headings, paragraphs, emphasis, lists, blockquote, hr, br,
 *   anchors (with safe URIs), images (src + alt), tables, pre/code,
 *   plus <mark> for future highlight support.
 *
 * Denylist: <script>, <style>, <iframe>, all event-handler attributes,
 * javascript: / data: / vbscript: URIs.
 *
 * When you add a new markdown feature (e.g. footnote refs, definition
 * lists), revisit ALLOWED_TAGS and ALLOWED_ATTR.
 */
import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
 "h1", "h2", "h3", "h4", "h5", "h6",
 "p", "br", "hr",
 "em", "strong", "del", "code", "pre",
 "blockquote",
 "ul", "ol", "li",
 "a",
 "img",
 "table", "thead", "tbody", "tfoot", "tr", "th", "td",
 "mark",
 "span", "div",
];

const ALLOWED_ATTR = ["href", "src", "alt", "title", "id", "class"];

const CONFIG = {
 ALLOWED_TAGS,
 ALLOWED_ATTR,
 ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|\/|#|\?)/i,
};

export function sanitiseHtml(dirty: string): string {
 if (!dirty) return "";
 return DOMPurify.sanitize(dirty, CONFIG) as string;
}
```

A few notes on the config:
- `ALLOWED_URI_REGEXP` whitelists `http(s):`, `mailto:`, `tel:`, and same-origin paths (`/...`), fragments (`#...`), and query-only refs (`?...`). This blocks `javascript:`, `data:`, and `vbscript:` by exclusion.
- `span` and `div` are included because `marked` can emit them inside code-block highlighters (and we render code blocks). If you find DOMPurify still stripping useful structural markup, expand the list — but err toward stricter.
- `DOMPurify.sanitize` returns `TrustedHTML | string` depending on TS lib settings; the `as string` cast is required.

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test -- src/lib/sanitise.test.ts
```

Expected: all 14 tests pass.

If a test fails, read the failure carefully:
- "expected … to contain …" on a strip test → sanitiser passed something through that shouldn't be allowed.
- "expected … to be …" on a preserve test → sanitiser stripped legitimate markup; expand `ALLOWED_TAGS` / `ALLOWED_ATTR`.

- [ ] **Step 5: Run the full suite**

```bash
npm test
```

Expected: 254 + 14 new = 268 passed. No failures.

- [ ] **Step 6: Run check + lint**

```bash
npm run check
npm run lint
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/sanitise.ts src/lib/sanitise.test.ts
git commit -m "$(cat <<'EOF'
Add sanitiseHtml() backed by isomorphic-dompurify (round 3 — batch D, sanitiser)

New module wrapping DOMPurify with an allowlist for the tags marked.js
emits for standard markdown, plus <mark> for future highlight support.
14 unit tests cover the strip side (script, event handlers, javascript:
URIs, iframe, style, javascript: in style) and the preserve side
(headings, paragraphs, lists, blockquote, hr/br, tables, pre/code,
mark, images, safe-href links). Idempotent on already-clean input.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Wire `sanitiseHtml` into ChatPanel

**Files:**
- Modify: `src/lib/components/ChatPanel.svelte:212-227` (the `renderMarkdown` function).

- [ ] **Step 1: Import `sanitiseHtml`**

In `src/lib/components/ChatPanel.svelte`, add the import next to the existing `marked` import (around line 12):

```typescript
 import { marked } from "marked";
 import { sanitiseHtml } from "$lib/sanitise";
```

- [ ] **Step 2: Wrap `renderMarkdown`'s output**

Modify the `renderMarkdown` function. The current implementation (lines 212-227) is:

```typescript
 function renderMarkdown(content: string): string {
  if (docId) {
   const colonIndex = docId.indexOf(":");
   if (colonIndex !== -1) {
    const source = docId.slice(0, colonIndex);
    const filePath = docId.slice(colonIndex + 1);
    return renderMarkdownWithLinks(content, source, filePath);
   }
  }
  return marked.parse(content, { async: false }) as string;
 }
```

Update both return paths to pipe through `sanitiseHtml`:

```typescript
 function renderMarkdown(content: string): string {
  if (docId) {
   const colonIndex = docId.indexOf(":");
   if (colonIndex !== -1) {
    const source = docId.slice(0, colonIndex);
    const filePath = docId.slice(colonIndex + 1);
    return sanitiseHtml(renderMarkdownWithLinks(content, source, filePath));
   }
  }
  return sanitiseHtml(marked.parse(content, { async: false }) as string);
 }
```

Note: the `docId`-path return value is *also* sanitised. `renderMarkdownWithLinks` already escapes attributes via `escapeAttr` in `src/lib/links.ts`, but defence-in-depth — sanitising the output catches anything the link-rewrite renderer might have missed.

- [ ] **Step 3: Run build gates**

```bash
npm run check
npm run lint
npm test
```

Expected: clean.

- [ ] **Step 4: Manual sanity check**

With backend + dev server, open the chat panel and ask a normal question. Verify the assistant's reply renders correctly: headings, lists, code blocks, links all visible and styled.

Then test a malicious payload — paste this into the chat (the backend will probably refuse to echo it, but the test is whether your sanitiser would catch it if it got through):

```
Test: <script>alert('xss')</script> after script. <img src=x onerror=alert(1)>
```

If the assistant echoes the test string back, no script should execute — DevTools console must be empty.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/ChatPanel.svelte
git commit -m "$(cat <<'EOF'
ChatPanel renderMarkdown now sanitises output (round 3 — batch D, ChatPanel)

Both return paths in renderMarkdown — the link-rewrite path and the
plain marked.parse path — pipe through sanitiseHtml. Assistant replies
can no longer execute injected <script>, <iframe>, inline event
handlers, or javascript: URIs even if a backend or model emits raw HTML.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Wire `sanitiseHtml` into `renderMarkdownWithLinks`

**Files:**
- Modify: `src/lib/links.ts:142-176` (the `renderMarkdownWithLinks` function).

The doc viewer renders document bodies via `{@html renderMarkdownWithLinks(...)}`. The right place to wrap is at the function's return — that way every caller (currently the doc viewer; potentially others later) gets sanitisation by default.

- [ ] **Step 1: Import `sanitiseHtml`**

At the top of `src/lib/links.ts`, add:

```typescript
import { Marked, type Tokens } from "marked";
import { sanitiseHtml } from "$lib/sanitise";
```

- [ ] **Step 2: Wrap the return**

Modify the final line of `renderMarkdownWithLinks` (line 175):

```typescript
 return instance.parse(content, { async: false }) as string;
```

To:

```typescript
 return sanitiseHtml(instance.parse(content, { async: false }) as string);
```

- [ ] **Step 3: Remove the now-redundant wrap in ChatPanel's link-rewrite path**

Because `renderMarkdownWithLinks` now sanitises internally, the wrap added in Task 3 around the link-rewrite path becomes a double-sanitise. DOMPurify is idempotent (the unit test in Task 2 covers this), so double-sanitising is correct but wasteful. Decide:

**Option A (recommended): leave the double-wrap.** Defence-in-depth; future refactors that change one path's wrapping won't accidentally open a hole. Cost is a single extra DOMPurify pass over already-clean HTML — negligible.

**Option B: remove the inner wrap.** Slightly faster; relies on every caller of `renderMarkdownWithLinks` trusting the sanitisation to live inside the function. Slightly more fragile.

If you pick Option A, skip this step. If Option B, edit `ChatPanel.svelte`'s `renderMarkdown` so the `docId`-path return is `return renderMarkdownWithLinks(...)` (no outer `sanitiseHtml`), keeping only the non-link-rewrite path wrapped.

For the rest of this plan, assume Option A.

- [ ] **Step 4: Run build gates**

```bash
npm run check
npm run lint
npm test
```

Expected: clean. No test count change (the existing `links.ts` tests still pass — they assert on link rewriting, not sanitiser behaviour, and the rewriter still produces the same intermediate HTML).

If a `links.ts` test fails because it asserts on the *exact* output string, look at the failure: DOMPurify may have normalised attribute ordering or whitespace. Update the assertion to be less brittle (e.g. `toContain` instead of `toBe`).

- [ ] **Step 5: Manual verification on doc viewer**

With backend + dev server, open any doc at `/doc/{doc-id}`. Verify the body renders correctly: headings link to TOC slugs, relative markdown links resolve through the rewriter, images load, code blocks render.

Construct a test fixture: in your local source repo (one of the ones the docserver indexes), add a markdown file containing:

```markdown
# Test doc

<script>document.body.appendChild(document.createElement('marker'))</script>

<img src="x" onerror="alert(1)">

[xss](javascript:alert(2))

Normal content here.
```

Wait for the docserver to ingest (or restart it), then visit `/doc/{source}:{path}`. The body should render "Test doc" + "Normal content here." with the script/img/link stripped. DevTools should show no `<marker>` element, no console alert.

Clean up the test file from your source repo afterwards.

- [ ] **Step 6: Commit**

```bash
git add src/lib/links.ts
git commit -m "$(cat <<'EOF'
renderMarkdownWithLinks now sanitises output (round 3 — batch D, links.ts)

The doc viewer's body renderer (renderMarkdownWithLinks) wraps its
marked-rendered + link-rewritten HTML in sanitiseHtml before returning.
Any caller — currently the doc viewer's {@html ...} at line 150 of
/doc/[id]/+page.svelte; potentially others later — gets sanitisation
by default without changing their call site.

ChatPanel's renderMarkdown keeps its own outer sanitiseHtml wrap on
both return paths. DOMPurify is idempotent, so the double-wrap on the
link-rewrite path is defence-in-depth at negligible cost.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Journal entry

**Files:**
- Create: `journal/260MMDD-round-3-batch-d-xss.md`

- [ ] **Step 1: Draft the entry**

Cover: what shipped (3 commits — install, sanitiser, ChatPanel wire, links wire — actually 4 commits), the SSR decision (isomorphic-dompurify), the defence-in-depth note (Option A double-wrap), the test surface (14 unit tests). Out-of-scope: backend `<mark>` highlighting (round 4 candidate, still deferred).

- [ ] **Step 2: Commit**

```bash
git add journal/260MMDD-round-3-batch-d-xss.md
git commit -m "$(cat <<'EOF'
Journal entry for round 3, batch D (XSS hardening)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Final batch verification

- [ ] **Step 1: Build gates**

```bash
npm run check
npm run lint
npm test
```

Expected: 268 passed (254 + 14), clean check, clean lint.

- [ ] **Step 2: SSR check**

```bash
npm run build
```

Expected: build completes. If `isomorphic-dompurify` has an SSR issue (e.g. jsdom incompatibility with the Node version SvelteKit is using), the build error surfaces here. If it fails, the fallback is to switch to the browser-only `dompurify` and move sanitisation to `onMount` / client-only rendering — that would require revisiting the doc viewer's SSR-vs-CSR strategy and is a larger change. Surface immediately if it happens.

- [ ] **Step 3: Git log**

```bash
git log --oneline main..eng-round-3-batch-d-xss
```

Expected: 5 commits (install, sanitiser, ChatPanel wire, links wire, journal).

- [ ] **Step 4: Merge to main**

```bash
git checkout main
git merge --no-ff eng-round-3-batch-d-xss -m "Merge round-3 batch D (XSS hardening)"
git branch -d eng-round-3-batch-d-xss
```

---

## When this plan is complete

Next: **Batch B (density/layout)** — requires visual-companion mockup approval before any CSS lands. See `docs/superpowers/plans/2026-05-16-round-3-batch-b-density.md` for the mockup-approval pre-plan.
