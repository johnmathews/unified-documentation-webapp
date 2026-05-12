# Document-view UX improvements — improvement plan

Worktree: `.claude/worktrees/eng-doc-view-improvements/` on `worktree-eng-doc-view-improvements`.
Baseline: `npm test` → 226/226 passing (7 files). No backend changes anywhere in this plan — every
change is in `documentation-webapp`.

## Non-goals

1. **No backend changes.** Word/line counts are computed client-side from `doc.content`; the
   `FullDocument` API shape stays the same. If we want server-side stats later, that's a separate
   change touching `documentation-server`.
2. **No per-passage bookmark in the existing bookmark store.** W5 stores highlights in
   `localStorage` only. Promoting highlights into the server-side bookmark schema is a follow-up.
3. **No annotation text on highlights in this round.** Just colored highlights + remove. Notes
   on highlights are a follow-up — the user said "highlight, annotate, *or* bookmark", so we
   ship the highlight slice and surface the others as next steps.
4. **No toast infrastructure for non-scan events yet.** The new toast module is built generically,
   but the only producer wired in this round is the scan flow. W5's "highlight saved" message
   is the only opportunistic second producer.
5. **No mobile-specific sticky title.** W4 is desktop-only (`min-width: 1200px`). On small
   screens the title-staying-visible problem is less acute (the user explicitly said "on
   desktops").

## Decisions & tradeoffs (cross-cutting)

1. **Title is the first H1 in the markdown body, not a separately-rendered field.** The
   "Fitness Multi-User Plan" heading in Image #1 is produced by `renderMarkdownWithLinks` on
   the doc content (`src/routes/doc/[id]/+page.svelte:138`). So W1 changes
   `.markdown-content h1` in `src/app.css`, not a Svelte template. W4's sticky bar prefers
   `doc.title` (the JSON field) and falls back to the first H1 only if `doc.title` is empty.

2. **Toast positioning: viewport-fixed, anchored to the scan-button column, not a popover on
   the button itself.** A true CSS-anchored popover on the scan button would re-position when
   the header reflows on resize and would clip on narrow screens. Instead we use
   `position: fixed; top: calc(var(--header-height) + 8px); right: 30px` so the stack sits
   just under the header in roughly the scan-button column. On mobile we span across
   (`left: 8px; right: 8px`). This matches the user's "anchored below the scan button"
   intent without coupling to scan-button geometry.

3. **Scan progress is one toast that updates, not many that stack.** The user wants stacking
   for "scan-started / scan-complete / second-scan-complete" — *separate events*. But during
   a single scan, `pollScan`'s `onProgress` fires 5–20 times; stacking each one would be
   noisy garbage. The toast API supports `update(id, patch)` for this; `handleScanClick`
   creates one toast on start and updates it through the run, then finalizes it (3s
   auto-dismiss starts).

4. **Highlights stored by anchor (prefix + text + suffix), not by DOM path.** DOM paths
   break when the markdown is re-rendered (line numbers change, surrounding markup shifts).
   Storing the highlighted text plus ~20 chars of context on either side lets us re-locate
   highlights deterministically on load using `String.indexOf`, even if the document is
   edited slightly upstream. This is the standard "fuzzy anchor" pattern (Hypothes.is
   uses a variant). Keyed by `doc_id` in `localStorage` under
   `docs-webapp:highlights:{docId}`.

5. **No new dependencies.** All five units are doable with what's already installed
   (`marked`, Svelte 5 runes, MediaQuery). Adding a toast library or annotation library
   would be more code to learn than the ~80 lines this plan needs.

## Ordering

Foundation-then-risk: W1 and W2 are tiny CSS / formatting changes that ship value quickly.
W3 (toast refactor) is the structural change with the largest blast radius on existing UX,
so it goes before W4 and W5 — W5 then gets to call into the new toast API for "highlight
saved" feedback. W5 is largest and last so any time-pressure cut-back lands there cleanly.

---

## Work units

### W1 — Bigger document title (first H1)

- **Priority:** Medium
- **Risk:** Low (visual-only CSS in global stylesheet)
- **Size:** S (under 30 min)
- **Changes:**
  - `src/app.css:199` — `.markdown-content h1` font-size from `2rem` (32px) → `2.4rem` (~38.4px).
    Bump `line-height` from `1.125` to `1.15` to keep the heading airy.
  - `src/app.css:399` (mobile h1 override inside `@media (max-width: 640px)`) — read the
    exact current value first, then scale proportionally (target ~1.9rem on small screens).
  - `src/app.css:486` (very-narrow override) — leave alone unless it conflicts.
- **Test impact:** None. CSS changes don't have unit tests; visual verification via
  Playwright in Phase 3.
- **Reversibility:** Trivial — revert the CSS commit.
- **Dependencies:** None.
- **Acceptance criteria:**
  1. The first H1 in `/doc/<any-doc-id>` is visibly larger than now but smaller than `3rem`.
  2. Mobile (`browser_resize` to 375×800) doesn't overflow the column or wrap awkwardly.

### W2 — Word & line count in metadata bar

- **Priority:** Medium
- **Risk:** Low (pure client-side compute on already-loaded `doc.content`)
- **Size:** S (about an hour incl. test)
- **Changes:**
  - New file `src/lib/docStats.ts` exporting
    `countDocStats(content: string | null): { words: number; lines: number }`.
    Treats empty / null content as `{words: 0, lines: 0}`. Counts lines as
    `content.split('\n').length` but trims a trailing newline so a file ending in `\n`
    doesn't add a phantom line.
  - `src/routes/doc/[id]/+page.svelte` — import `countDocStats`, derive
    `const stats = $derived(doc?.content ? countDocStats(doc.content) : null)`,
    and append two new `<span>`s to the `.doc-dates-row` (lines 116–123):
    `Words: {stats.words.toLocaleString()}` and `Lines: {stats.lines.toLocaleString()}`.
    Render the row whenever any of {created_at, modified_at, stats} is present.
  - Hide for PDFs (no markdown content; already guarded by `doc.content` check).
- **Test impact:** New file `src/lib/docStats.test.ts` covering: empty content, single
  word, multi-line, content with only whitespace, multi-byte chars, content ending in
  newline (no phantom line). No existing tests need updates — `+page.svelte` currently
  has no test file.
- **Reversibility:** Revert the commit; `docStats.ts` is new and the template change is
  additive.
- **Dependencies:** None.
- **Acceptance criteria:**
  1. `npm test` includes 5+ new passing tests for `countDocStats`.
  2. On `/doc/<a-markdown-doc>`, the dates row shows the dates plus
     `Words: N` and `Lines: M` with thousands separators.
  3. On a PDF doc the counts are not shown.

### W3 — Proper toast module, stacking, anchored below scan button

- **Priority:** High (the user's most detailed ask; current top-right banner has bugs they
  named explicitly — only the last toast has an `x`).
- **Risk:** Medium. Replaces the only existing notification surface. If the refactor drops
  a state (e.g. `scanAlreadyRunning`), the user gets silent scans. Mitigation: enumerate
  every branch in the existing `scanTitle()` and assert each maps to a toast in the new flow.
- **Size:** M (one focused session)
- **Changes:**
  - New file `src/lib/toasts.svelte.ts` — module-level `$state` array of
    `{ id, message, kind: 'info'|'success'|'neutral'|'error', dismissable, ttlMs }`,
    plus exports `add(toast)`, `update(id, patch)`, `dismiss(id)`, `clear()`.
    Default `ttlMs = 3000`. `add` schedules auto-dismiss via `setTimeout` when `ttlMs`
    is not null; `update` may reset the timer or skip it depending on patch contents.
  - New file `src/lib/components/Toaster.svelte` — renders the array as a stack with
    `position: fixed; top: calc(var(--header-height) + 8px); right: 30px;`
    `display: flex; flex-direction: column; gap: 8px;`
    `max-width: min(360px, calc(100vw - 60px));`.
    `border-radius: 10px` (soft corners). Per-toast `border-left: 4px solid <kind-color>`,
    `box-shadow`, `padding: 10px 12px`. Entry animation: slide+fade from
    `translateY(-6px)`. Exit animation via Svelte `transition:fade` on each item.
    Each toast has a `<button aria-label="Dismiss">✕</button>` regardless of kind.
    Mobile (`max-width: 640px`): `left: 8px; right: 8px;
    top: calc(var(--header-height) + 8px)`.
  - `src/routes/+layout.svelte`:
    - Remove the inline `.scan-banner` markup (lines 452–469) and its CSS
      (lines 745–821).
    - Mount `<Toaster />` once, near the closing of the outer wrapper.
    - Refactor `handleScanClick`: at start,
      `const id = toasts.add({message: 'Scanning…', kind: 'info', dismissable: false,
      ttlMs: null})`. Inside `onProgress` and after result,
      `toasts.update(id, {...})`. On completion:
      `toasts.update(id, {message: 'Scan complete — no changes' | …,
      kind: 'neutral'|'success', dismissable: true, ttlMs: 3000})`. On error:
      same with `kind: 'error'`. The "already running" branch adds a separate
      short-lived `info` toast.
    - Drop now-unused `scanResultTimer`, `clearScanResultLater`, `dismissScanResult`,
      `scanHadChanges` — that lifecycle lives inside the toast module now.
  - No existing tests reference `.scan-banner` (grep confirmed: 0 hits in test files).
- **Test impact:**
  - New file `src/lib/toasts.test.ts` — vitest fake timers; covers: `add` returns id;
    `ttlMs` auto-dismisses; `ttlMs=null` persists; `update` patches in place;
    `dismiss` removes by id; `clear` empties array; multiple toasts stack in insertion
    order.
  - No existing test deletions / updates needed.
- **Reversibility:** Revert the commit; the old banner code is in git history.
- **Dependencies:** None (W1, W2 independent).
- **Acceptance criteria:**
  1. Click Scan Now twice in succession with a 4-second gap → two scan-complete toasts
     visible, stacked, each with its own `✕` (verify with Playwright + screenshot).
  2. Every toast dismisses on its own after 3s (verify by waiting and re-snapshotting).
  3. Clicking `✕` on the middle of three stacked toasts removes just that one;
     the others remain.
  4. Toast appears below the scan-now button on a 1440-wide viewport
     (screenshot shows toast aligned roughly under the scan-button column).
  5. `npm test` passes including new toast tests; `grep -r "scan-banner" src/` → 0 hits.

### W4 — Sticky document title on desktop

- **Priority:** Medium
- **Risk:** Low (additive desktop-only layout)
- **Size:** S–M
- **Changes:**
  - `src/routes/doc/[id]/+page.svelte`:
    - After the `<Breadcrumbs>` line and before `<header class="doc-header">`, insert
      `<div class="doc-sticky-title" class:visible={stickyVisible} aria-hidden="true">
      {stickyTitle}</div>` where `stickyTitle = $derived(doc?.title ?
      stripSourcePrefix(doc.title, doc.source) :
      doc?.file_path.split('/').pop() ?? '')`.
    - `aria-hidden="true"` — the real H1 inside the markdown is the accessible heading;
      the sticky bar is purely visual.
    - Add `$effect` using `IntersectionObserver` on the first
      `.markdown-content h1` element. When the H1 is not intersecting and the user
      has scrolled past it (`boundingClientRect.top < 0`), set `stickyVisible = true`;
      otherwise false.
  - CSS in the same file (scoped):
    - `.doc-sticky-title { display: none; }` by default.
    - Inside `@media (min-width: 1200px)`:
      `display: block; position: sticky; top: 0; z-index: 50;
      background: var(--bg-body); padding: 8px 12px; margin: 0 -12px 0;
      font-size: 0.95rem; font-weight: 700; color: var(--text);
      border-bottom: 1px solid var(--border); white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis;
      opacity: 0; pointer-events: none; transition: opacity 150ms;`.
    - `.doc-sticky-title.visible { opacity: 1; pointer-events: auto; }`.
  - The sticky element lives inside `.document`, so it sticks within the
    scroll container `.content` (confirmed in `src/routes/+layout.svelte:983-991`).
- **Test impact:** None for unit tests (`IntersectionObserver` is jsdom-flaky).
  Verify via Playwright: scroll past the H1, take screenshot, assert title bar is
  visible at the top of the content scroll area.
- **Reversibility:** Revert; nothing else depends on the new element.
- **Dependencies:** None.
- **Acceptance criteria:**
  1. At 1440-wide viewport on `/doc/<long-doc>`: scroll halfway down → title bar
     shows the doc title at the top of the content area.
  2. At 800-wide viewport: sticky bar is `display: none`.
  3. At the very top of the doc (H1 still visible), the sticky bar is invisible
     (`opacity: 0`).

### W5 — Highlight passages (MVP)

- **Priority:** Medium (the user's last ask, framed exploratorily: "could be useful")
- **Risk:** Medium-High (DOM manipulation over `{@html}`-rendered markdown; selection
  edge cases — across paragraphs, inside code blocks, across links). Mitigated by
  restricting to single-Range selections that stay within a single block-level element
  in `.markdown-content`, and gracefully bailing on cross-block selections.
- **Size:** L (kept unitary because partial highlight without persistence is worse
  than nothing)
- **Changes:**
  - New file `src/lib/highlights.ts`:
    - Type `HighlightAnchor = { id: string; text: string; prefix: string;
      suffix: string; createdAt: string }`.
    - `loadHighlights(docId)`, `saveHighlight(docId, anchor)`,
      `removeHighlight(docId, id)` — `localStorage` under
      `docs-webapp:highlights:{docId}`. Defensive JSON parsing.
    - `anchorFromSelection(root, sel): HighlightAnchor | null` — extracts text and
      20-char prefix/suffix from `root.textContent`. Returns null if selection is
      empty, not inside root, < 2 chars, or crosses block boundaries.
    - `applyHighlights(root, anchors)` — for each anchor, find its text in
      `root.textContent` using prefix+text+suffix, then walk text nodes to wrap the
      matching range in `<mark class="hl-mark" data-hl-id="…">…</mark>`. Skips
      anchors that don't match (doc was edited upstream).
  - New file `src/lib/components/HighlightPopover.svelte`:
    - Listens to `selectionchange` / `mouseup` on `document`; appears only if the
      current selection is inside `.markdown-content`.
    - Renders a small floating popover above the selection with a "Highlight" button.
    - Click → `anchorFromSelection` → `saveHighlight` → re-`applyHighlights` →
      `toasts.add({message: 'Highlight saved', kind: 'success', ttlMs: 3000})`.
    - Also handles "click an existing `<mark.hl-mark>`" → show a small "Remove"
      affordance anchored to that mark.
  - `src/routes/doc/[id]/+page.svelte`:
    - After `{@html renderMarkdownWithLinks(...)}` renders and is in the DOM, run an
      `$effect` that calls `applyHighlights` on the `.markdown-content` element using
      `loadHighlights(doc.doc_id)`.
    - Mount `<HighlightPopover />` once inside the article.
  - CSS in `app.css`:
    - `.markdown-content mark.hl-mark { background: rgba(255, 235, 59, 0.45);
      padding: 0 2px; border-radius: 2px; cursor: pointer; }`.
    - `[data-theme='dark'] .markdown-content mark.hl-mark {
      background: rgba(255, 235, 59, 0.25); color: inherit; }`.
- **Test impact:**
  - New file `src/lib/highlights.test.ts`: anchor round-trip on simple text; ambiguous
    text disambiguated by prefix+suffix; anchor not found returns gracefully;
    save/load/remove round-trip via mocked `localStorage`. DOM mutation tested in
    Playwright, not jsdom.
- **Reversibility:** Revert the commit. Saved highlights stay in `localStorage` but
  become inert — no UI to render them.
- **Dependencies:** Soft dependency on W3 (`toasts.add`). If W3 dropped, replace with
  no-op.
- **Acceptance criteria:**
  1. Select 2+ words inside the markdown body → popover appears within 200ms with a
     Highlight button.
  2. Click Highlight → selected text gains a yellow background; a
     "Highlight saved" toast appears.
  3. Hard-reload the page → highlight still visible in the same place.
  4. Click a highlighted span → small Remove affordance; clicking removes the
     highlight and persists the removal.
  5. Selection spanning multiple paragraphs OR inside a code block: popover does
     not appear (the simplest valid behavior).
  6. `npm test` includes the new `highlights.test.ts` and all tests pass.

---

## Final verification (after all units)

1. `npm run lint` clean.
2. `npm run check` (svelte-check) clean.
3. `npm test` — 226 baseline + new tests, all green.
4. Playwright walk-through on `/doc/journal-insights-server:docs/fitness-multiuser-plan.md`
   (the doc in the user's screenshots):
   - H1 looks bigger.
   - Metadata bar shows Words + Lines.
   - Click Scan Now twice → two stacked toasts under the scan button.
   - Scroll → sticky title appears in the content area top.
   - Select text → popover → click Highlight → reload → highlight persists.
5. Journal entry in `journal/YYMMDD-doc-view-ux-improvements.md` capturing the five
   units and any decisions deviated from this plan.
