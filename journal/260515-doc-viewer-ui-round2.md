# 2026-05-15 — Doc viewer UI fixes (round 2, route 3)

Round-2 follow-up to the home-page fix in `6765531`. This unit audits
and fixes the doc viewer at `/doc/[id]`.

## What changed

Two files, both CSS-only:

1. **`src/routes/doc/[id]/+page.svelte`** — `.doc-layout` reading column
   narrowed from 960 → 720 px (GOV.UK two-thirds, matches the
   `/source/[name]` fix from 260514). The grid layout that puts the
   TOC rail beside the article now activates at `min-width: 1024px`
   (was 1200), with columns `minmax(0, 720px) 240px` and a total
   `max-width: 1000px` (was 1240). Net effect: at 1024 the rail is
   now beside the article instead of stacked below it; at 1440 the
   reading column is no longer wider than the recommended ~75-char
   line target.
2. **`src/app.css`** — `.markdown-content` body upped from
   17 px / 1.35 line-height to 19 px / 25 px line-height (GOV.UK body
   scale, 5-px multiple). `.markdown-content h3` rose with it
   (1.0625rem → 1.1875rem), so h3 stays at body size; weight, not
   size, distinguishes the heading from prose — same pattern GOV.UK
   uses for `heading-s`. Blockquote also moved to 19 px to match
   body. The mobile (<640 px) override is now explicit:
   `font-size: 16px; line-height: 1.25` (= 20 px line-height, 5-px
   multiple) so the mobile rhythm doesn't inherit the desktop's
   non-integer ratio.

## The bug

At 1024 and 768 px viewports the doc-toc rail was *rendered below the
article* whenever a user toggled the TOC button on. The CSS:

```css
@media (min-width: 1200px) {
 .doc-layout.has-toc {
  display: grid;
  grid-template-columns: minmax(0, 960px) 240px;
  ...
 }
}
```

Below 1200 px, `.doc-layout` reverted to block flow and the
`<aside class="doc-toc-rail">` fell into normal document order under
the `<article>`. At 1024 px the rail's `y` was ~2964 — well below the
fold; at 768 it was ~3355. The toggle "worked" in the sense that
something changed, but the something was unreachable until the reader
had scrolled past the entire document.

Lowering the breakpoint to 1024 px and narrowing the grid columns
(720 + 40 + 240 = 1000) puts the rail beside the article at 1024
viewports too. At 1024 the article ends up 678 px wide (1024 minus
the 60 px of content padding minus 240 rail minus 40 gap) — close
enough to the 720 ideal, still well within GOV.UK two-thirds.

## Why the reading column matters here

The doc viewer is the long-form reading surface — the place in the
app where the "≤ 75 characters per line" rule has the most leverage.
Round 1 (260514 source view) moved `/source/[name]` to 720 px; the
home page (round 2, 260514) is a table so the rule doesn't apply
identically. Until this commit, `/doc/[id]` was 960 px — ≈ 120
characters per line at 17 px — which is the exact thing GOV.UK's
two-thirds rule exists to prevent.

## Why 19 px body, not 17 px

GOV.UK body is 19 px. The webapp body has been 17 px since
260512 — readable, but the GOV.UK scale puts headings, body, and
spacing on a 5-px vertical-rhythm grid that requires 19 px to align.
At 17 px the existing line-height was 22.95 (non-multiple of 5).
Bumping to 19 / 25 lands the rhythm and improves legibility inside
the now-narrower column. The combination of narrower column + bigger
text is the canonical GOV.UK reading page.

H3 went up in lockstep (1.0625rem → 1.1875rem so it stays at 19 px =
body). Pre-fix h3 was the same size as body; that intent is
preserved. Weight-not-size is also how GOV.UK distinguishes h3 from
prose.

## What was considered and rejected

- **Floating-control button touch targets** (30 × 30 vs the project's
  44 px target convention). Real but lower priority; bundling it would
  resize the floating pill from ~150 × 44 to ~180 × 60 and that's
  a deliberate visual change, not a routine fix. Logged as a follow-up.
- **`.source-badge` link underline.** The badge is a real `<a>` link
  but renders bold blue without an underline — a GOV.UK link-styling
  deviation. The same pattern lives on the home page and the source
  view; fixing it cleanly is a cross-route change. Out of scope here.
- **Bumping h1 to 48 px** (GOV.UK heading-xl). Project chose 2.4 rem
  (38.4 px) in 260512 — a deliberate deviation. Not re-litigating.
- **Tablet TOC overlay drawer.** At 768 px the TOC button still
  stacks the rail below the article (this round's fix only reaches
  1024 px). The cleanest fix is an overlay drawer like the sidebar
  has — bigger than CSS-only scope. Logged.

## Verification

Playwright at 1440 / 1024 / 768 / 375 px in light + dark mode.
Screenshots in `.engineering-team/after-*.png` (before-shots in
`.engineering-team/before-*.png` for diff). Specifically:

- **At 1440 px with TOC open:** `.doc-layout` is `display: grid`,
  `max-width: 1000px`, article width = 720, TOC rail at `x = 977`
  (right of article). `getComputedStyle('.markdown-content')` →
  font 19 px, line-height 25 px.
- **At 1024 px with TOC open:** layout is grid (was block), article
  right = 708 < TOC left = 748 → side-by-side. Body still 19 / 25.
- **At 768 px:** article width = 720, body 19 / 25. No TOC rail at
  this width (still pre-existing; flagged).
- **At 375 px:** article width = 339, body = 16 / 20 (mobile media
  query). No horizontal page scroll (`document.body.scrollWidth ===
  window.innerWidth`).
- **Sticky doc-header at desktop:** still pins at the top of the
  scroll area; verified the F7 concern about overlapping the TOC rail
  is unchanged (rail starts under the metadata bar by design).

Backend booted locally via `uv run python -m docserver` with
`DOCSERVER_CONFIG=.engineering-team/sources.eng.yaml` (a session-local
4-source config pointing at this workspace's own docs / journals,
gitignored) and `DOCSERVER_DATA_DIR=server/local-data-eng-doc`. Did
not touch the user's `sources.local.yaml`.

`npm run check` → 0 errors, 0 warnings, 427 files.
`npm test` → 14 files, 245 tests, all pass.
`npm run lint` → clean.

## Out of scope (flagged for next rounds)

1. F3 — `.control-btn` 30 → 44 px in `FloatingDocControls.svelte`
   (touch-target floor convention).
2. F4 — `.source-badge` link underline pattern across home / source
   / doc views. Cross-route, do separately.
3. Tablet TOC drawer for the 768–1023 px range.
4. `/journal`, search panel, chat panel, `/bookmarks`, `/status` —
   still pending. One PR per route.

## Design principles this reinforces

1. **Reading width is non-negotiable on the reading surface.** GOV.UK
   recommends ≤ 75 characters per line for long-form. The doc viewer
   is *the* place where that rule has the most impact. Other surfaces
   (status tables, source listings) can deviate when the content
   isn't body prose; `/doc/[id]` cannot.
2. **The breakpoint where a layout abruptly changes should not be
   where the layout abruptly breaks.** The original 1200 px grid
   breakpoint meant the TOC rail had a "broken stacked" state at
   1024 and 768 — visible only if a user toggled it on. Either lower
   the breakpoint so the layout works at narrower widths, or hide the
   rail entirely below the breakpoint so the toggle is honest about
   what it does. Falling halfway is the worst option.
3. **Typography scale alignment >= individual size choice.** 19 / 25
   isn't 1.4 % bigger than 17 / 22.95 — it's *on the 5-px grid*.
   Future heading and spacing decisions can stack cleanly on top of
   it without fractional pixels accumulating.
