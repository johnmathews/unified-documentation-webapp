# Doc-view UX improvements (W1–W5)

Date: 2026-05-12

Five user-requested improvements to the document view, all webapp-only — no
backend changes.

## What shipped

### W1 — Bigger H1 title
`src/app.css` — `.markdown-content h1` went from `2rem`/32px to `2.4rem`/38.4px
with line-height `1.125 → 1.15`. The matching mobile override (`@media
max-width: 640px`) dropped from `2rem` to `1.85rem` so the desktop bump doesn't
crowd narrow viewports. The "title" is the first H1 in the markdown body, not a
separately-rendered field — every doc-page title comes through the same CSS.

### W2 — Word & line count in metadata bar
New `src/lib/docStats.ts` with `countDocStats(content)` returning
`{ words, lines }`. Words use `/\s+/` split with empty-string filter; lines use
`\r\n`-normalized split with a trailing-newline trim so a doc ending in `\n`
doesn't read one line longer than it is. Tested in 10 cases (empty, single-word,
whitespace-only, CRLF, multi-byte unicode, trailing newline, etc.). Rendered in
`src/routes/doc/[id]/+page.svelte` inside the existing `.doc-dates-row` after
Created / Modified, with `toLocaleString()` thousands separators. PDFs have no
`content` so the counts naturally don't render for them.

### W3 — Toast module
Replaced the inline `.scan-banner` in `+layout.svelte` with a proper
module:

- `src/lib/toasts.svelte.ts` — module-level reactive `Toast[]` with
  `add()/update()/dismiss()/clear()`. Default `ttlMs = 3000`; pass `ttlMs: null`
  for a sticky toast (used during in-flight scans). Timer handles live in a
  plain `Object.create(null)` map — the contents aren't templated, so they
  don't need to be reactive (this silenced
  `svelte/prefer-svelte-reactivity`).
- `src/lib/components/Toaster.svelte` — renders the stack with
  `position: fixed; top: calc(var(--header-height) + 8px); right: 30px;
  border-radius: 10px;` and a colored `border-left` per kind
  (`info/success/neutral/error`). Each toast has its own `✕`. On mobile the
  toaster spans across (`left/right: 8px`).
- `handleScanClick` in `+layout.svelte` now adds one sticky toast at scan
  start and `update`s it through progress phases. On completion it switches
  the kind to `success`/`neutral`/`error` and attaches a 3 s `ttlMs` so the
  toast auto-dismisses.

11 vitest tests cover add/update/dismiss/clear, ttl auto-dismiss, sticky
toasts, and independent dismissal of stacked toasts (fake timers).

### W4 — Sticky doc title on desktop
A `.doc-sticky-title` div sits between `<Breadcrumbs>` and `<header
class="doc-header">` inside `.document`. Default `display: none`; inside
`@media (min-width: 1200px)` it's `position: sticky; top: 0` and toggles
opacity via a `.visible` class.

First pass used an `IntersectionObserver` set up in a `$effect`; that turned
out to be timing-sensitive (the observer fired before `{@html ...}` materialized
the H1, so the initial intersection report was "no h1" and never updated).
Final implementation uses `onMount` with a `scroll` listener on `.content`
(the same scroll element `FloatingDocControls` already uses for reading
progress) plus a `ResizeObserver` for layout shifts — `stickyVisible =
h1.getBoundingClientRect().bottom < 0`. Simpler and matches the existing
pattern in the codebase.

### W5 — Highlight passages (MVP)
Client-side only this round. New files:

- `src/lib/highlights.ts` — `HighlightAnchor = { id, text, prefix, suffix,
  createdAt }` stored in `localStorage` under `docs-webapp:highlights:{docId}`.
  - `anchorFromSelection(root, sel)` extracts the selected text plus 20 chars
    of context on each side, refusing selections under 2 chars, across blocks,
    or inside `<pre>` (those should be copy/paste use cases, not annotation).
  - `applyHighlights(root, anchors)` clears existing marks, then for each
    anchor searches `root.textContent` for `prefix + text + suffix` (falling
    back to `text` alone if upstream edits broke the context), then walks
    `TreeWalker`-yielded text nodes to wrap the matched range in
    `<mark class="hl-mark" data-hl-id="…">`. The walk handles ranges that
    span inline elements within a single block.
- `src/lib/components/HighlightPopover.svelte` — listens to `selectionchange`
  on `document`; renders a floating "Highlight" button just above the
  selection when it's inside `.markdown-content`. Clicking a saved
  `<mark.hl-mark>` opens a "Remove" affordance. Success/removal triggers a
  toast via the W3 module.
- `src/routes/doc/[id]/+page.svelte` — `bind:this={mdEl}` on `.markdown-content`
  and a `$effect` keyed on `mdEl + doc.content + doc.doc_id` re-applies
  highlights whenever the markdown element re-mounts (e.g. doc switch or
  hard reload).
- `src/app.css` — `mark.hl-mark` background `rgba(255, 235, 59, 0.45)` in
  light theme, `rgba(255, 235, 59, 0.22)` in `[data-theme="dark"]`.

13 unit tests cover anchor round-trip, prefix+suffix disambiguation between
repeated text, fallback to plain text when context drifts, idempotent
re-apply, and multi-element wrapping.

## Decisions worth carrying forward

1. **DOM-bind effects > tick-then-query for `{@html}` content.** Two of the
   five units needed to inspect the rendered markdown DOM, and `tick()` after
   the `$state` write was unreliable. `bind:this={mdEl}` on the
   `.markdown-content` div, then depending on `mdEl` in the effect, fires
   exactly when the element is in the DOM. Prefer this pattern over
   `tick().then(query)` or `requestAnimationFrame` for anything that needs
   to read the rendered HTML.

2. **Highlight anchoring by text+context, not DOM path.** Storing prefix+suffix
   means highlights survive incidental markdown edits upstream (whitespace
   changes, neighbouring word edits) without DOM-path bookkeeping. The
   `applyHighlights` pass is O(text-length × anchor-count) which is fine for
   the document sizes this app handles.

3. **Scan progress = one toast that updates; scan events = separate toasts.**
   Stacking each `onProgress` callback would have produced 5–20 toasts per
   scan. `toasts.update(id, …)` lets a single toast morph through "Scanning…"
   → "Checking sources…" → "Found N documents to update" → final state, while
   a *second* scan creates a *new* toast that stacks on top of the previous
   "Scan complete" message.

## Numbers

- Tests: 226 baseline → 260 after (+34: 10 docStats, 11 toasts, 13 highlights).
- `npm run check` and `npm run lint` clean.
- No backend changes; no new dependencies.

## Follow-ups not done in this round

1. **Annotations / notes on highlights** — the user mentioned "highlight,
   annotate, *or* bookmark"; we shipped just the highlight slice.
2. **Server-side bookmark for passages** — current highlights are
   `localStorage`-only and don't sync between devices. Promoting them into
   the existing `bookmarks.db` schema needs a backend change.
3. **Cross-block highlights** — currently refused. If users want them, the
   anchor format can stay the same; only the popover-blocking check needs
   relaxing.
4. **Sticky title on tablet/mobile** — the user explicitly asked for
   desktop-only; tablet/phone could revisit if it turns out to be wanted.
