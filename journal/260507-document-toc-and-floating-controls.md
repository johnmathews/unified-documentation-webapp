# Document TOC, floating reading controls, and panel keyboard shortcuts

Long markdown documents in the library were a chore to navigate — there was no
way to skim the structure of a doc, no idea how far through I was, and reaching
for the bookmark icon meant scrolling all the way back to the top. Today added
three pieces that cover that:

## What shipped

1. **Sidebar table of contents.** The sidebar now has a two-tab strip — Files /
   Contents — with the active tab persisted in localStorage (`sidebar-tab`,
   default `contents`). The Contents tab renders the h1–h3 headings of the
   current document with level-based indentation. The currently-visible heading
   is highlighted via an `IntersectionObserver` on the `.content` scroller
   (rootMargin `0 0 -70% 0` so a heading is "active" when in the top 30% of the
   viewport). Clicking a TOC entry smooth-scrolls the content pane to that
   heading and blurs the button so the sidebar can be `aria-hidden` cleanly when
   later closed.

2. **Floating reading pill.** A small pill in the bottom-right of every
   non-PDF doc page shows the scroll percentage and a bookmark toggle. The
   bookmark state is shared with the existing in-doc `BookmarkButton` via
   `bind:bookmarked`, so toggling either keeps both icons in sync. Hidden in
   `@media print` and on PDF docs (no scroll percentage concept there).

3. **Keyboard shortcuts for the side panels.** `Cmd/Ctrl+B` toggles Files,
   `Cmd/Ctrl+K` toggles Search, `Cmd/Ctrl+J` toggles Chat. The handler
   explicitly ignores Shift/Alt modifiers so it doesn't collide with browser
   devtools chords (Cmd+Shift+K opens the Firefox web console, etc.). Existing
   Escape behaviour is unchanged.

## Implementation notes

- `renderMarkdownWithLinks` now injects `id` attributes on h1–h3 using a stable
  slugger (lowercase, alphanumeric+hyphen, dedupe via `-2`/`-3` suffix). A new
  exported `extractHeadings(content)` walks the same tokens with the same
  slugger, so render-time IDs and TOC slugs are guaranteed identical. Both go
  through a small `plainText()` helper that strips inline markdown (backticks,
  `**`, `_`, link text) so heading labels look right.
- The TOC's IntersectionObserver is reattached on doc change inside a
  `requestAnimationFrame` so the headings are guaranteed to be in the DOM by
  the time we look them up. Fallback path picks the last heading above the
  scroll position when nothing is intersecting the active band.
- The doc page populates `currentDocToc` (new in `stores.svelte.ts`) on load
  and clears it on cleanup. The TocPanel observes that store rather than
  receiving props — keeps the doc page and the sidebar decoupled.
- Tab choice in the sidebar is persisted (`sidebar-tab`) so closing and
  reopening the panel preserves the user's last manual selection. Default is
  `contents`, which is what you typically want when reading a long doc.

## Things considered and skipped

- A right-side TOC rail that pushes content. Discussed in the design pass —
  rejected because it competes with the existing left sidebar and adds a
  layout dimension. The tab-strip-inside-the-existing-sidebar approach reuses
  the resize handle, mobile drawer, and aria-hidden plumbing that already
  works well.
- Sharing `BookmarkButton` between the header and the floating pill. The two
  have different sizes, padding, and surrounding chrome; collapsing them would
  require config props the existing component doesn't have. Two ~50-line
  pieces with no shared logic beyond the API call is fine.

## Verification

- `npm test` — 215/215 (added 11 tests covering `slugify`, `extractHeadings`,
  heading-id injection, dedupe, h4+ skip).
- `npm run build` — clean.
- Manual end-to-end in Playwright against a freshly-ingested local backend
  (test markdown with h1/h2/h3): TOC populates with correct indentation,
  click-to-jump works, active highlight tracks scroll, floating pill updates
  0% → 100%, bookmark sync confirmed, all three keyboard shortcuts toggle the
  right panel, tab choice survives a hard reload.

## Other tweaks in the same session

- Added `workflow_dispatch:` to `.github/workflows/build-and-push.yml` so the
  Docker build can be re-run manually from the Actions tab when needed.
- Updated `docs/architecture.md` and `docs/development.md` to describe the
  new sidebar tab strip, TOC, floating pill, and keyboard shortcuts.
