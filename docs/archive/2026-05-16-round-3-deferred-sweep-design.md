# Round 3 — Deferred-items sweep (design)

**Date:** 2026-05-16
**Status:** superseded — round-3 sweep completed; see [journal/260516-round-3-closer.md](../../journal/260516-round-3-closer.md) (archived 2026-05-19). Note: B4 (tablet TOC drawer), B5 (`/status` disclosure), backend `<mark>` highlighting, and ChatPanel streaming styling were deferred out of round 3 and remain unimplemented.
**Predecessor:** round 2 closed in `journal/260515-source-badge-cross-route.md`
**Backend prerequisite:** server-side follow-ups shipped in `server/journal/260515-backend-followups-bookmarks-type-and-worker-classifier.md` and `server/journal/260516-document-types-rename-and-prod-bind-mount.md`

## Goal

Close the round-2 ledger. 14 deferred items, grouped into 5 batches, landing in this order:

**E (polish) → A (a11y) → D (XSS hardening) → B (density/layout) → C (state)**

One batch = one PR. Each batch is internally coherent (shared verification approach, shared review focus). PRs land on `main` independently; no batch depends on another for correctness, only for ordering benefit.

## Non-goals

- **B4** — tablet TOC drawer (768–1023px) on `/doc/[id]`. Deferred to its own round-4 design; it is a new component, not a layout tweak.
- **B5** — `/status` expanded/collapsed disclosure for "last error" detail. Deferred to its own round-4 design; it is a new UI pattern, not density polish.
- **Backend `<mark>` highlighting in search snippets.** Cross-repo (needs a server change plus a webapp XSS-safe render path). Deferred.
- **ChatPanel streaming cursor / retry styling.** Depends on a streaming endpoint that does not exist today. Deferred.

## Shared constraints

- GOV.UK Design System remains the north star (`docs/govuk-design-research.md`).
- Mobile-first: 375px must be usable for every change.
- Light + dark theme verified on every visual change.
- `npm test`, `npm run check`, `npm run lint` must pass. New tests only; no suite regression.
- Local backend running for every UI verification (CLAUDE.md rule).

## Documentation per batch

Each batch ships `journal/260MMDD-round-3-batch-{letter}-{short-name}.md` framed from the webapp's perspective. The closer (after C lands) ships `journal/260MMDD-round-3-closer.md` summarising the round-3 ledger and round-4 candidates.

---

## Batch E — Polish (lands first)

Two near-trivial one-liners. Warm-up PR.

### E1. `displaySource()` ACRONYMS — add `md`

- File: `src/lib/titles.ts`.
- Change: add `"md"` to the `ACRONYMS` set.
- Effect: `claude-md-global` renders as `Claude MD Global` everywhere `displaySource` is used (home table, breadcrumbs, doc viewer source label, `/status` table, `/bookmarks` group headers, SearchPanel, ChatPanel history).
- Tests: unit test in `titles.test.ts` for the specific input.

### E2. Masthead negative-margin breakpoint vs layout content padding

- Files: `src/routes/+page.svelte` (`.masthead`), `src/routes/+layout.svelte` (`.content`).
- Bug: masthead's edge-to-edge bleed via negative margins is keyed to 640px; layout's content padding has a 768px breakpoint. Between 640–768px the negative margin overshoots and is silently clipped by `overflow-x: hidden`.
- Fix: align masthead negative-margin breakpoint to 768px to match the layout grid.
- Verification: Playwright 700px + 800px screenshots, light + dark.

---

## Batch A — Accessibility (lands second)

5 items, all with Playwright keyboard-walk + axe-core verification.

### A1. ChatPanel `.history-title` nested-interactive

- File: `src/lib/components/ChatPanel.svelte`.
- Today: `.history-title` is a `<span>` inside `.history-item` (row is click target). Round-2 closer removed the misleading link-blue colour. Remaining bug: keyboard users have no per-item focus target other than delete; screen readers don't announce the title as actionable.
- Fix: convert `.history-item` to `<button type="button" class="history-row">` wrapping the title; nest the delete `<button>` inside and stop propagation on its click. Each row becomes one focusable element; delete is a secondary focusable inside it. Button-in-button HTML is invalid, so the delete must be a sibling-positioned button outside the row's `<button>` (use a flex parent with the row-button + delete-button as direct children, both inside `.history-item-wrapper`). Resolve the exact DOM shape in the plan.
- Tests: Playwright keyboard nav through history list (Tab/Shift+Tab arrives on each row, Enter activates, delete reachable via Tab and doesn't trigger the row); axe-core sweep on open chat panel.

### A2. focus-visible audit / prune

- Files: `src/app.css` (canonical), `src/lib/components/*.svelte`, `src/routes/*.svelte`.
- Today: `app.css` defines two canonical patterns — `a:focus` (GOV.UK yellow-fill + black bottom shadow for inline links) and `:focus-visible` (3px solid outline for everything else). Per-component duplicates exist in SearchPanel (6), ChatPanel (4), Breadcrumbs (1), Toaster (1), journal route (2), home route (2), layout (3).
- Audit policy:
  - **Duplicates the global rule** → remove.
  - **Refines for layout reasons** (e.g. inset box-shadow on inputs so the outline does not visually collide with the border) → keep, add an inline comment naming the canonical rule it complements.
  - **Diverges** (e.g. `outline: none`, custom colour) → rewrite to match canonical, or document the divergence inline.
- Output: PR removes ≥5 duplicate focus rules; lands a comment block in `app.css` documenting the two canonical patterns and override criteria.
- Tests: Playwright Tab-walk across home, `/doc/[id]`, `/status`, `/bookmarks`, `/journal`, search panel open, chat panel open — focus screenshot at each step; axe-core scan must show no focus-visible regressions.

### A3. `/status` `aria-describedby` for status colour-coding

- File: `src/routes/status/+page.svelte`.
- Today: status badges render colour-coded (green/amber/red) with a `title=` attribute carrying the meaning. Colour alone fails WCAG 1.4.1; `title` is unreliable on touch.
- Fix: add a visually-hidden `<dl>` once per page describing each status value (`healthy`, `stale`, `error`, `unknown`); on each badge `aria-describedby="status-desc-{value}"`. Keep `title=` for hover.
- Tests: axe-core scan; manual VoiceOver pass on at least one healthy + one error row.

### A4. ChatPanel `aria-live="polite"` on `.messages`

- File: `src/lib/components/ChatPanel.svelte`.
- Today: assistant replies append to `.messages` silently — screen readers don't announce them.
- Fix: `aria-live="polite" aria-relevant="additions"` on the `.messages` container. Confirm interim tool-call states don't spam announcements; if they share the region, decide announce vs `aria-live="off"` per state.
- Tests: VoiceOver manual; unit-style DOM assertion that the attribute is present after mount.

### A5. `FloatingDocControls` `.control-btn` 30 → 44px

- File: `src/lib/components/FloatingDocControls.svelte`.
- Today: floating controls are 30px square; WCAG touch-target floor is 44px.
- Fix: bump `min-width` / `min-height` / `width` / `height` to 44px. Adjust `bottom` / `right` offsets if the larger buttons crowd the viewport edge or overlap doc content on narrow viewports.
- Tests: Playwright at 375px and 768px — buttons reachable, don't obscure body text, don't overflow.

---

## Batch D — XSS hardening (lands third)

One item, two surfaces.

### D1. Install DOMPurify and wrap both `{@html}` sites

- Files:
  - `package.json` — add `dompurify` (+ `@types/dompurify` if needed). Choose `dompurify` vs `isomorphic-dompurify` based on the SSR decision below.
  - `src/lib/sanitise.ts` (new) — `export function sanitiseHtml(dirty: string): string` wrapping `DOMPurify.sanitize` with a single shared config. Allowlist: standard markdown-rendered tags (`<p>`, `<h1>`–`<h6>`, `<ul>`, `<ol>`, `<li>`, `<blockquote>`, `<pre>`, `<code>`, `<em>`, `<strong>`, `<hr>`, `<br>`, `<a href>`, `<img src alt>`, `<table>`/`<thead>`/`<tbody>`/`<tr>`/`<td>`/`<th>`, `<mark>` for future highlight support). Denylist: `<script>`, `<style>`, `<iframe>`, all event handler attributes, `javascript:` URIs.
  - `src/lib/components/ChatPanel.svelte:226` — `renderMarkdown` returns `sanitiseHtml(marked.parse(content))`.
  - `src/routes/doc/[id]/+page.svelte:150` — `renderMarkdownWithLinks` (in `src/lib/links.ts`) wraps its marked output in `sanitiseHtml` before the link-rewrite renderer applies, OR the call site wraps the result. Pick whichever keeps `links.ts`'s API cleanest; resolve in the plan.
- **SSR decision (resolve in plan):** doc viewer body is server-rendered. DOMPurify needs a DOM. Options: (a) `isomorphic-dompurify` which provides a `jsdom` shim; (b) sanitise only browser-side and ship raw HTML server-side then re-sanitise on hydration (introduces a flash-of-untrusted-content); (c) move doc-body rendering client-side. Strongly prefer (a).
- Tests: `sanitise.test.ts` — `<script>`, `<img onerror>`, `javascript:` URI, `<iframe>`, event-bearing `style=` strings all stripped; legitimate markdown output (headings, links, code blocks, `<mark>`, images) passes through. Playwright injection test using a malicious markdown fixture — confirm no script execution.
- File-top comment in `sanitise.ts` documents the allowlist + when to revisit (new content features).

---

## Batch B — Density / layout (lands fourth)

3 items. Biggest visual work. **Mockups in the visual companion required before any CSS lands; approval per-route before the PR opens.**

### B1. `/status` info-density pass

- File: `src/routes/status/+page.svelte`.
- Today: sparse table — wide row padding, large column gaps, verbose relative-time formatting, errors only on hover.
- Direction (refine via mockup):
  - Tighten row padding (likely `16px 24px` → `12px 16px`).
  - Compact last-seen — absolute time inline, relative on hover/title.
  - Subtle zebra-striping for tabular at-a-glance reading.
  - Source-name column `font-weight: 700` to anchor each row.
- Out of scope: B5 disclosure pattern stays deferred to round 4.
- Verification: Playwright before/after screenshots at 1440×1024, 1024×768, 375×812, light + dark.

### B2. Home `/` info-density + orphaned status badge

- File: `src/routes/+page.svelte`.
- Today: single-word "Status" badge sits ~50px above the table at desktop, occupying vertical for one word. Table itself is roomy.
- Direction (refine via mockup):
  - Move the global status badge inline with the table caption / first column header, OR remove it entirely and rely on per-row status cells.
  - Tighten row padding consistent with B1.
  - Re-check column widths so the source-link column doesn't squash on tablet.
- Verification: same as B1.

### B3. Doc viewer metadata + 75-char line length

- Files: `src/routes/doc/[id]/+page.svelte`; `src/app.css` if a `--measure` token is introduced.
- Today: doc body width is bounded by the layout grid (≈680px main column), roughly 75ch but not enforced. Metadata block above the body is vertically tall.
- Direction:
  - Cap `.doc-body` width via `max-width: 75ch` (or a CSS variable `--measure: 75ch`) for the body prose, independent of the surrounding grid. Grid still bounds the page; body simply won't exceed 75ch on wider grids.
  - Metadata block: collapse to a one-line dl-style row at ≥640px (source · path · type · date) instead of stacked rows.
- Verification: visual at 375 / 768 / 1440, light + dark. Test with the longest filename + longest source name to confirm one-line metadata wraps gracefully.

---

## Batch C — State (lands fifth, finalises `/status`)

2 items, both on `/status`.

### C1. Sort state in URL search params

- File: `src/routes/status/+page.svelte`.
- Today: sort state in-memory only; refresh loses it.
- Fix: read `?sort=<column>&dir=asc|desc` on mount; write on every sort change via `goto(..., { replaceState: true, noScroll: true, keepFocus: true })`. Default sort = current default (likely `last_seen desc`).
- Edge cases:
  - Unknown column / direction: fall back to defaults, drop the param.
  - Initial load without params: don't write defaults to the URL — only persist explicit user choices.
- Tests: Playwright — click sort, reload, state restored; back/forward navigates sort history; bookmark a URL with sort, opens correctly.

### C2. `/status` polling refresh with `visibilitychange` pause

- File: `src/routes/status/+page.svelte`.
- Today: page re-fetches only on mount + `scanTick`.
- Fix: `setInterval` refresh of source health every 30s (declare as a `const POLL_INTERVAL_MS`). Pause when `document.hidden`; resume on `visibilitychange`. Clear interval on unmount.
- Sort state (C1) survives refreshes.
- Tests: Playwright — fake timers, confirm fetch fires; toggle `visibilitychange`, confirm no fetch while hidden, fetch resumes when visible; unmount clears interval (no leaks).

---

## Verification approach

Per-item and per-batch.

### Unit tests

- `titles.test.ts` (E1).
- `sanitise.test.ts` (D1).
- Status route logic test for URL roundtrip + polling pause (C1, C2).

New tests only; no existing test edits unless an item changes covered behaviour.

### Playwright

- **A:** keyboard nav + axe-core across all routes (focus screenshot at each Tab stop).
- **B:** before/after screenshots at 1440 / 1024 / 768 / 375, light + dark.
- **D:** malicious-markdown injection on a local doc fixture.
- **C:** URL roundtrip + visibility-pause + interval cleanup.

### Build gates

`npm test`, `npm run check`, `npm run lint` must pass before each PR opens.

### Manual verification

- **A:** VoiceOver pass on doc viewer + chat panel + `/status`.
- **B:** 1440 + 375 + light/dark walkthrough of touched routes.
- **D:** paste a malicious markdown payload into a local dev fixture; confirm no script execution.
- **C:** refresh / bookmark / back-forward roundtrip on `/status`; toggle tab visibility; observe network panel.

### Local backend

Every Playwright run and every manual UI check requires `uv run python -m docserver` running from `../server/` (CLAUDE.md rule). No mock data layer exists in the webapp.

---

## Round-3 closer

After C lands, ship `journal/260MMDD-round-3-closer.md` summarising:

- Items shipped (the 14, per batch).
- Items still deferred (B4, B5, backend `<mark>` highlighting, ChatPanel streaming).
- Round-4 candidates surfaced during the round (filled in at closer time).
