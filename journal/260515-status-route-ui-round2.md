# 2026-05-15 — `/status` route restyled to GOV.UK standards (round 2, route 8 — final)

Round-2 closer. Eighth and last unit in the round-2 UI standards
sweep. Earlier units shipped:

1. `/source/[name]` — round 4.
2. `/journal` (rebuilt) — `4d32d44`.
3. `/bookmarks` — `bbfc28b`.
4. `SearchPanel` — `fde0768`.
5. `ChatPanel` — `169c564`.
6. `/status` — this PR.

The `/status` page is a **6-column sortable table** of source-
ingest health. Surface shape is neither row-shape list nor card
grid, so the closest analog from the sweep is `SearchPanel`
(round 6): cross-cutting standards apply universally (5 px grid,
44 px touch floor, global `a` rule), but the **720 px reading-
column rule does not** apply to a data table whose cross-source
comparison value comes from columns sitting adjacent.

CSS-only change to one file:
`src/routes/status/+page.svelte`, plus one small template change
(wrap the `<table>` in an `overflow-x: auto` div).

## What changed

1. **Universal 44 px touch floor.** Three interactive controls
   moved from below-floor to ≥ 44 px:
   - `.refresh-btn`: 39 → 48 px tall via `min-height: 44px` +
     `padding: 12 16` (was `8 16`). Also `min-width: 44px`.
   - `.sort-btn`: 22 → 44 px tall via `min-height: 44px` +
     `padding: 12 0` (was `0`). The table header row is now
     44+ px tall — desired outcome, not a regression. Six
     sortable columns × 22 px → 44 px each.
   - `.source-link`: 18 → 44 px tall via `display: inline-flex;
     align-items: center; min-height: 44px`. The anchor wrapping
     the source tag now has a real hit area regardless of the
     16 px text it contains.
2. **5 px line-height grid universally.** Every body-text
   element gets an explicit `line-height: 20px` (or 25 px on
   the masthead body) replacing the inherited `*1.35` from
   `app.css`'s `body` rule. Concretely: `.breadcrumbs`,
   `.status-badge`, `.refresh-btn`, `.source-table`, `.sort-btn`,
   `.source-tag`, `.timestamp`, `.time-ago`, `.src-status`,
   `.failure-count`. The data row table-cell text now resolves
   to 16 / 20 instead of 16 / 21.6; the secondary `.time-ago`
   and `.src-status` are 14 / 20 instead of 14 / 18.9. Failure
   count stays at 12 px (it's a count, not narrative — same
   permission given in rounds 4 / 5 / 6 / 7 for timestamps and
   durations) but lands on the grid via `line-height: 20px`.
3. **Table wrapped in `overflow-x: auto` div.** New
   `.source-table-wrap` container scopes horizontal scroll to
   the table. Before: at 375 px the entire page scrolled
   horizontally (masthead and breadcrumbs scrolled off-screen
   with the table). After: `document.documentElement.scrollWidth
   === 375`, while `.source-table-wrap.scrollWidth === 563`
   and `.source-table-wrap.clientWidth === 345`. The chrome
   stays put; only the table scrolls.
4. **Mobile @media block reduced from 9 rules to 2.** Removed
   font-size compressions (`.source-table`, `.source-tag`,
   `.timestamp` all dropping to 14 at < 640 px) — at 375 px the
   table is wider than the viewport regardless of font size, so
   shrinking text doesn't save horizontal space at the relevant
   breakpoint. Kept `.time-ago { display: none }` (phone-
   specific — dropping the relative-time metadata column is the
   right concession at narrow widths) and `.source-table th,
   td { padding: 8 8 8 0 }` (phone-specific cell-padding
   compression).

## Design choices that matter

1. **720 px cap does not apply.** Deliberate non-goal,
   documented in the plan. A 6-column sortable table with
   `tabular-nums` numeric columns wants its columns sitting
   adjacent — cross-source comparison is the whole point of
   the surface. Forcing a 720 cap + `overflow-x: auto` would
   put the table behind a permanent scroll on a 1440 px
   viewport, hiding two columns by default. Same conceptual
   move as round 6 (search panel) and round 7 (chat panel
   `min(85%, 720px)` cap applies to long-form *content*
   inside a drawer, not to the drawer surface itself): the
   720 rule governs long-form reading columns, not tabular
   comparison surfaces. The page-wrapper stays at 960 px,
   matching the masthead inner.
2. **Sort button gets 44 px floor even though it makes the
   header row 44+ px tall.** Considered keeping `.sort-btn` at
   text-height and treating the entire `<th>` as the click
   surface, but moving the click handler from `<button>` to
   `<th>` would make the cell a non-semantic interactive
   surface (a `<th>` is not a `<button>`). Keeping the
   `<button>` element and giving it the floor is cleaner;
   the visual cost (taller header row) is small and the
   header is also where the column-label lives, so vertical
   density there is less valuable than in body rows.
3. **`.source-link` becomes `inline-flex`.** Tempting to keep
   it as the default `inline` and rely on the `<td>` padding to
   provide the row's tap target. But the link's hit area is its
   own bounding box, not its containing cell — clicking 30 px
   right of the source tag would land on `<td>` text rather
   than the anchor. Making the anchor an inline-flex container
   with `min-height: 44px` extends the actual link hit area
   vertically to match the row.
4. **`.failure-count { font-size: 12px }` survives.** Below
   the 16 px body floor, but it's a count of consecutive scan
   failures — data, not narrative. Same permission given to
   the chat panel's tool-progress and the search panel's date-
   input labels. Lands on the 5 px grid via explicit
   `line-height: 20px`.
5. **No changes to the breadcrumb override pattern.** The
   `text-decoration: none` + hover-underline pattern on
   `.breadcrumbs a` is the established convention across
   `/bookmarks` and `/journal`. Changing it on `/status`
   alone would be a one-off divergence. The cross-route
   breadcrumb question is a separate concern.

## What I considered and rejected

1. **Converting the table to a row-shape list.** Would let
   the page adopt the same `[date | source | title]` shape as
   `/journal` and `/bookmarks`, and the 720 cap could then
   apply. But the surface's value is exactly column-aligned
   numeric comparison (Files / Chunks across sources, with
   `tabular-nums`), plus sort affordance. Both are weakened
   in a vertical card stack. The right shape for this data
   is a table.
2. **Linking the source-tag with a real underlined GOV.UK
   `<a>` instead of bold-blue-no-underline.** Same cross-route
   source-badge pattern that has been flagged for **five
   rounds running** (`/source`, home, doc viewer, journal,
   bookmarks, search panel, chat panel — and now status).
   Fixing it route-by-route would commit each round to a
   styling decision that the cross-route round has to
   relitigate. Leaving the anchor in place (so the eventual
   fix is a CSS change, not a template change) and the
   visible style unchanged for now.
3. **Sort state to URL search params.** Would make the
   sorted view deeply linkable (`/status?sort=last_indexed
   &dir=desc`). Out of scope for a visual standards round.
4. **`aria-describedby` instead of `title=` tooltip for status
   meaning.** The page's status meaning is in `title=`
   attributes — visible on hover only, no screen-reader
   announcement. A separate accessibility round can address.
5. **Refreshing the refresh button visual to GOV.UK secondary
   button styling.** It already uses `var(--bg-surface)` /
   `var(--border-strong)` / GOV.UK font weight; the 2 px
   border is the GOV.UK secondary-button treatment. No work
   needed.

## Verification

Playwright at 1440 / 1024 / 768 / 375 px in light + dark mode.
Screenshots in `.engineering-team/before-*.png` and `after-*.png`.

- **At 1440 px light:** `.status-page` `max-width: 960px`
  (deliberate deviation), masthead inner 960. Every
  interactive control has computed `min-height ≥ 44px`:
  `.refresh-btn` 48, `.sort-btn` 44, `.source-link` 44. Every
  body-text element has an explicit 5 px line-height: 20 px on
  16-14-12 px text, 25 px on masthead body. `<tr>` body rows
  computed at 70 px (cell padding + content well past the
  44 floor). `document.documentElement.scrollWidth === 1440 ===
  clientWidth`.
- **At 375 px light:** `document.documentElement.scrollWidth
  === 375` (page does not horizontally scroll).
  `.source-table-wrap.scrollWidth === 563`,
  `.source-table-wrap.clientWidth === 345` (table scrolls
  inside its wrapper). `.time-ago` display: none. All 44 px
  floors holding. Cell padding compressed to `8 8 8 0`.
- **Sort interaction:** clicking "Files" column flips sort
  order — verified `Files ▲` indicator appears, body rows
  reorder by `file_count`.
- **Refresh interaction:** clicking re-fetches `/api/health`,
  no errors. The "Refreshing..." label flips fast enough on
  local network that it didn't render in a 50 ms probe — same
  as on `main`, not a regression.
- **Dark mode at 1440 + 375:** `.status-badge` colours
  inverted to `color: #1a1a1a` per the `[data-theme="dark"]`
  override. Border colours resolve from `var(--border)` /
  `var(--border-strong)` so they remain subtle on dark.
- **0 console errors at every viewport.**

Backend booted via `uv run python -m docserver` from `server/`
with `DOCSERVER_CONFIG=.engineering-team/sources.eng.yaml`,
`DOCSERVER_DOC_TYPES_CONFIG=.engineering-team/doc_types.eng.yaml`,
`DOCSERVER_DATA_DIR=local-data-eng`. Two sources (webapp,
server) — fewer than ideal for stressing the sort, but enough
to verify rendering and the toggle.

`npm run check` → 0 errors, 0 warnings, 431 files.
`npm test` → 15 files, 254 tests, all pass.
`npm run lint` → clean.

## Out of scope (flagged for follow-up)

1. **Source-badge underline pattern across home / source /
   doc / journal / bookmarks / chat-history / status — sixth
   round running without a cross-route fix.** The pattern is
   now present on seven surfaces. A dedicated cross-route
   round between round 2 and round 3 needs to resolve it
   atomically — fixing one surface at a time means each
   subsequent round has to either re-verify the others or
   accept that the pattern has drifted further. The fix is a
   CSS-only change to `app.css` (probably a `[data-source-
   badge]` attribute selector or a `.source-badge` utility
   class that picks up the global `a` underline). Out of
   scope for any single-route round.
2. **Sort state in URL search params.** Round 3 candidate.
3. **`/status` polling refresh.** Page currently re-fetches
   only on mount + `scanTick`. Adding interval-based polling
   (with `visibilitychange` to pause when the tab is hidden)
   would surface ingestion lifecycle without a manual refresh.
4. **`aria-describedby` for status meaning.** Accessibility
   round candidate.
5. **Status badge expanded ↔ collapsed view.** The current
   inline `title=` strings carry "Last error: …" detail —
   currently hidden behind hover, useful for ops. Could
   render as an expandable disclosure. Out of standards-round
   scope.

## Design principles this reinforces

1. **Cross-cutting rules vs. surface-shape rules.** The
   round-2 sweep now has three explicit examples of "this
   rule applies, that one doesn't" decisions: the search
   panel (round 6) on drawer column-width, the chat panel
   (round 7) on assistant-only 720 cap, and the status
   route (round 8) on tabular data. The pattern: 5 px line-
   height + 44 px floor + global `a` rule apply universally;
   the 720 column-width rule applies only to long-form
   reading surfaces. Documenting which axis each rule lives
   on (universal vs. surface-typed) makes future surface
   decisions cleaner.
2. **Table is the right element for tabular data.** Tempting
   in a "modernise the UI" sweep to convert every page to
   the same row-shape pattern for consistency, but
   consistency of *shape* across surfaces with different
   *purposes* is the wrong axis to optimise on. Sortable
   columns + `tabular-nums` + `<thead>` semantics are too
   valuable on a comparison surface to trade for visual
   harmony with adjacent routes.
3. **Wrap-not-truncate for overflow.** Phone-width tables
   are an unsolved general problem — there isn't a "best"
   pattern. Scoping `overflow-x: auto` to the table wrapper
   is the least-bad answer at a CSS-only cost: the table
   stays usable, the page chrome stays visible, the user
   can scroll within the table without losing context.
   Converting the table to stacked cards on mobile would
   be a much larger change and would lose the sortable-
   column affordance the page exists for.
4. **Round 2 closes.** Eight surfaces audited across roughly
   two weeks of work. The pattern that emerged is more
   useful than the individual fixes: explicit cross-cutting
   standards (typography grid, touch floor, link styling)
   that apply universally, plus surface-shape-specific
   rules (column width, layout) that apply where the
   shape calls for them. The next round can build on this
   vocabulary instead of relitigating it.
