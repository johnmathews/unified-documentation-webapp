# TOC right-rail, toggle, and keyboard-shortcuts modal

The previous commit (febc182) added the document table of contents as a second
tab inside the sidebar's "Files" panel. That mixed two different navigation
scopes — between-document (Files) and within-document (Contents) — under one
control. Reverting that and putting the TOC where it actually belongs: a
sticky rail to the right of the article column on wide viewports.

## What changed

- **Removed** `TocPanel.svelte` and the Files/Contents tab strip in
  `Sidebar.svelte`. The sidebar is back to a single purpose: file picker.
- **Removed** the `sidebarTab` store and its `sidebar-tab` localStorage key
  from `stores.svelte.ts`. `currentDocToc` and the `TocEntry` type stay —
  they still feed the new component.
- **Added** `DocToc.svelte`, a sticky 240px right rail rendered next to
  the article on `/doc/[id]`. Reuses the IntersectionObserver active-heading
  logic and smooth-scroll click handler verbatim from the old `TocPanel`.
- **Wrapped** the article in `<div class="doc-layout">` in
  `src/routes/doc/[id]/+page.svelte`. On viewports ≥1200px, when the TOC
  is open and the doc has headings, the layout becomes a CSS grid
  (`minmax(0, 960px) 240px`, gap 40px, max-width 1240px); otherwise the
  article stays centered at its 960px max-width. PDFs and empty docs don't
  get a TOC column.
- **Added** `tocOpen` reactive state in `stores.svelte.ts`, persisted to
  `localStorage` (key `doc-toc-open`, default `true`). `Cmd/Ctrl+.` toggles
  it; Esc closes it after the existing chat/search/sidebar Esc cascade.
  Extended `FloatingDocControls.svelte` with a list-icon button that
  toggles the same state — the button is hidden when the doc has no
  headings. The bookmark button was generalised to `.control-btn` so the
  new TOC button shares its styling.
- **Added** `KeyboardShortcutsModal.svelte` and a `?` keydown binding in
  `+layout.svelte`. The handler is suppressed when `e.target` is an
  INPUT/TEXTAREA/contenteditable element so the search box and chat input
  still receive `?` as text. The modal lists all shortcuts including the
  new `Cmd/Ctrl+.` for the TOC.

## Path through the design

Started with the rail as a sticky element inside a CSS grid with
`align-items: start`. Browser-verified end-to-end and found that sticky
*didn't* stick: at scrollTop 2500px the TOC's `top` was −2337px. Cause:
`align-items: start` makes the grid item only as tall as its own content
(~395px), so the sticky element runs out of parent space and scrolls off.
Fix: drop `align-items: start` so the aside stretches to the row's full
height — sticky now sticks at `top: 0` of the `.content` scroller.

Tried a fixed-position floating panel as an alternative; rejected it
because the floating box overlapped the article. Settled on the sticky
right-rail (with the bug fixed) plus the toggle infrastructure so users
can hide the rail when they want maximum reading width.

## Tradeoffs

- **No TOC under 1200px.** The article column is too narrow to give the
  TOC its own rail without crowding the sidebar. A modal-style TOC for
  small screens is a deliberate follow-up — not done in this pass.
- **Right rail, not left.** Considered the left margin (next to where the
  sidebar lives), but the sidebar already owns the left and an inline TOC
  there would feel cramped when both are open. Right matches MDN, GitBook,
  Docusaurus, Next.js docs.
- **`Cmd/Ctrl+.` for the toggle.** Consistent with the existing
  `Cmd+B/K/J` family and free of browser conflicts (`Cmd+T` is "new tab",
  `Cmd+O` is "open file", etc.). Easy to type one-handed.

## Verified

- All 215 unit tests pass; `npm run build` clean; lint clean for changed files.
- Browser-verified at 1400×900 against a local docserver (`DOCSERVER_DATA_DIR=/tmp/...`,
  `DOCSERVER_CONFIG=...` pointing at the local webapp + docserver repos):
  - At rest, the right rail shows "ON THIS PAGE" with h1–h3 indented and
    the active heading highlighted in brand blue.
  - Scrolling the article keeps the rail visible (`tocTop` stays in
    viewport at any scroll depth) and the active heading updates as
    sections cross the IntersectionObserver threshold.
  - `Cmd+.` hides the rail and removes `.has-toc` from `.doc-layout`,
    allowing the article to re-centre at its 960px width. State persists
    in `localStorage["doc-toc-open"] === "false"`.
  - The floating-pill TOC button toggles the rail back on; when on, the
    button shows the brand-blue active style.
  - `?` typed in the Search panel's input flows to the input as text
    (value `?`), modal does not open. `?` outside any input opens the
    modal; Esc closes it.
