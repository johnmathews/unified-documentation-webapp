# 2026-05-14 — Home page UI fixes (round 2, route 2)

Round-2 follow-up to the header-band fix in `51447f8`. This unit
audits and fixes the home page (`/`).

## What changed

All edits land in **`src/routes/+page.svelte`** — one file, no
component-extraction. Four logical units:

1. **Masthead and content share `max-width: 960px`.** Previously the
   masthead inner was 960 px and the table area (`.home`) was 880 px.
   The two `margin: 0 auto` containers had aligned centres but
   different left edges, so the H1 visibly "jut out" 40 px to the
   left of the table at desktop. Aligning to 960 reduces that to 0
   (`getBoundingClientRect().left` is identical for both at 1440 px).
   The blue masthead band still bleeds edge-to-edge of `.content` via
   the existing negative-margin trick.
2. **Mobile masthead padding tightened.** Under 640 px the masthead
   padding shorthand now writes the top/bottom too: `padding: 20px
   15px` (was `padding-left: 15px; padding-right: 15px;` only, leaving
   the desktop's 30 px top/bottom in force on mobile). Combined with
   shrinking H1 mobile margin-bottom from 20 → 15, the masthead drops
   from ≈ 220 → 176 px on a 375-wide viewport (~20 % smaller hero on
   the most-cramped screen).
3. **Source-link kept at 19 px on mobile.** Removed the `font-size:
   1rem` override under 640 px. The most-important content now stays
   at GOV.UK body size on phones.
4. **Sortable column headers are keyboard-accessible.** Replaced the
   four `<th class="sortable" onclick=…>` with `<th aria-sort={…}>
   <button class="sort-btn" onclick=…>`. Adds `aria-sort="ascending"
   /"descending"/"none"` per W3C sortable-table guidance, plus a
   GOV.UK yellow `:focus-visible` outline. New `sortIcon()` helper
   renders a neutral `↕` on inactive columns so the affordance is
   visible — previously only the active column had any arrow.
5. **Empty Status cell renders "Unknown".** When a source is missing
   from `health.sources` the Status cell was previously empty (read
   as broken). Added an `{:else}` branch that re-uses the existing
   `.src-unknown` class and a tooltip mirroring `statusTooltip()` for
   the unknown case.

(That's five user-visible bullets but four planned units — the
masthead width fix and the masthead mobile-padding fix were grouped
in plan W1.)

## What was considered and rejected

- **Wrapping masthead inner + table in a single `.page-container`
  div.** The plan called this out as an alternative; in practice
  changing the two existing `max-width` values to match was cheaper
  (no markup change, two-line CSS diff) and equivalent at the user
  level.
- **Hiding the orphaned status badge above the table on desktop.**
  Real but mild concern — the badge takes ~50 px of vertical for one
  word at 1440 px. Skipped this round; the layout decision (move it
  inline with the table caption? remove? keep?) belongs with the user
  in a separate session, not bundled into a CSS-only round.
- **Fixing `displaySource("claude-md-global")` rendering as "Claude
  Md Global".** The fix lives in `src/lib/titles.ts` (add `md` to
  the `ACRONYMS` set), which would touch every route that displays a
  source name — out of scope for "one route per PR".
- **Changing the masthead's negative-margin breakpoint from 640 px to
  768 px** to match the layout's `.content` padding breakpoint.
  Between 641-768 the masthead's `-30 px` lateral margin overshoots
  the layout's `15 px` content padding by 15 px each side. Visible in
  no screenshot — `.content` has `overflow-x: hidden`, so the
  overflow is clipped silently. Pre-existing behaviour, not a
  regression introduced here, and fixing it would require either
  carrying the layout breakpoint into the home page (coupling) or
  changing `.content`'s padding pattern (large blast radius). Logged
  as a follow-up.

## The keyboard-a11y rationale (W3 in detail)

Round 1 established "CSS-only where possible." W3 is the explicit
exception in this round and is worth justifying.

The original `<th class="sortable" onclick={…}>` pattern is mouse-
only: there's no `tabindex`, no keydown handler, no `role="button"`,
and no `aria-sort`. A keyboard user cannot trigger a sort. A screen-
reader user gets no signal that the columns are sortable nor which
column is currently sorted. None of that is fixable in CSS.

Two structural options:

1. Add `tabindex="0"` + `role="button"` + `keydown` handler to the
   `<th>` itself.
2. Put a `<button>` inside the `<th>`, with `aria-sort` on the
   `<th>`.

Option 2 is the W3C-recommended pattern for sortable tables, gets
`Enter`/`Space` activation for free (it's a real button), and is
easier to style consistently — the `:focus-visible` rule lives on
one element (`.sort-btn`) instead of every header, the existing
`text-decoration: underline` hover pattern from `.sortable` carries
over verbatim. Picked option 2.

Two helpers were added: `ariaSort(col)` returns `"ascending" |
"descending" | "none"`, `sortIcon(col)` returns `"↕" | "▲" | "▼"`.
Both pure functions over `sortCol` / `sortAsc`; no new state.

## Verification

Playwright at 1440 / 1024 / 768 / 375 px in light + dark mode.
Screenshots in `.engineering-team/after-*.png`. Specifically:

- **W1 alignment:** at 1440 px,
  `document.querySelector('.masthead__title').getBoundingClientRect().left === 240` and
  `document.querySelector('th').getBoundingClientRect().left === 240`. Diff = 0 px.
- **W1 mobile padding:** masthead height at 375 × 812 dropped from
  ≈ 220 → 176 px.
- **W2 source-link size:** computed `font-size` at 375 px is `19 px`
  (was `16 px`).
- **W3 keyboard sort:** focusing the first `.sort-btn` and clicking
  it (equivalent to Enter on a button) flips `tbody` row order from
  `Webapp` first to `Claude Md Global` first, and the `<th>` `aria-sort`
  attribute changes `descending → ascending`. Focus state shows the
  GOV.UK yellow rectangle (`outline: 3px solid #ffdd00`, `background:
  #ffdd00`) — verified via `getComputedStyle`.
- **W4 unknown status:** the `{:else}` branch renders `<span
  class="src-status src-unknown">Unknown</span>` with the existing
  styling. Could not visually verify in the live session because the
  ingest cycle had populated health for all four configured sources by
  the time the page loaded; the change is small and trusted (uses the
  same class already applied elsewhere in the file).

The backend was started locally via
`uv run python -m docserver` from `server/`, with
`DOCSERVER_CONFIG=.engineering-team/sources.eng.yaml` (a session-local
4-source config pointing at this workspace's own docs / journals,
gitignored) and a fresh `DOCSERVER_DATA_DIR=local-data-eng`. Did not
touch the user's `sources.local.yaml`.

`npm run check` → 0 errors, 0 warnings, 427 files.
`npm test` → 14 files, 245 tests, all pass.
`npm run lint` → clean.

Round-1 header-band wrap at 375 px — visually confirmed unchanged.

## Out of scope (flagged for next rounds)

- Doc viewer (`/doc/[id]`) — metadata layout and 75-char line length.
- Journal (`/journal`) — month group headers, entry cards, dates.
- Search panel — overlay sizing and z-index on tablet.
- Chat panel — overlay sizing and resize handle.
- Bookmarks (`/bookmarks`) and status (`/status`) — likely small.
- `displaySource` ACRONYMS set should include `md`. Touches multiple
  routes; do separately.
- Status badge above the home table — layout decision needed.
- Masthead's negative-margin breakpoint mismatch with layout's
  content padding (640 vs 768) — silently clipped, not visible.

## Design principles this reinforces

1. **Width consistency between stacked containers matters more than
   the absolute width chosen.** A masthead and a table at 880 vs 960
   px both look fine in isolation; together they create an
   accidental 40 px indent that reads as a layout bug. Pick one and
   apply it to every container the user's eye trails down.
2. **Click affordance must be discoverable, not just present.** The
   inactive sort headers had `cursor: pointer` and an `onclick` but
   no visible mark — to a user, only the actively-sorted column
   looked sortable. The neutral `↕` icon makes the latent
   interactivity visible without needing a hover.
3. **Keyboard accessibility on tabular controls is structural, not
   stylistic.** Reaching for `tabindex="0"` + `keydown` on a `<th>`
   is the wrong solution; a real `<button>` inside the `<th>` is the
   right one — and once the markup is right, the styling shrinks
   rather than grows.
