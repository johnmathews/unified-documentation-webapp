# 2026-05-15 — `/bookmarks` route restyled to GOV.UK standards (round 2, route 5)

Round-2 follow-up to the `/journal` rebuild (`4d32d44`). Fifth and final
list-surface migration to the GOV.UK standards established in rounds 2
W1-W4: 720 px reading column, GOV.UK typography on a 5 px line-height
grid, universal 44 px touch floor, label/value-adjacency for the date
column.

CSS-only on `src/routes/bookmarks/+page.svelte`, plus one small template
reorder to move the date next to the title (mirrors `/journal`).

## What changed

One file: `src/routes/bookmarks/+page.svelte`.

1. **Body column 960 → 720 px** (`.bookmarks-page`). Matches `/journal`,
   `/source/[name]`, `/doc/[id]`. Masthead inner stays at 960 px for
   alignment with the other index pages' mastheads.
2. **Source-header typography on the 5 px grid.** `.source-header`
   `font-size: 24px` keeps the size but adds `line-height: 30px` (was
   inheriting `app.css` `line-height: 1.35` → 32.4 px). Mobile drops to
   `21 / 25`. Border-bottom changed from `2px solid var(--brand)` to
   `1px solid var(--border)` so source headers stop pulling visual
   weight away from the masthead and match `/journal`'s month-header
   treatment.
3. **Category-header de-decorated.** Dropped `text-transform: uppercase`
   and `letter-spacing: 0.05em`. At a 720 px column with a max of four
   plausible categories (Documentation / Journal / Prompt / Not-docs)
   inside any one source, the size + colour + bold weight already make
   the label distinct; the uppercase letter-spacing was visual noise
   without an information-architecture role. Added `line-height: 20px`
   for the 5 px grid.
4. **Title link → GOV.UK body.** `.doc-list a` (now `.entry-title`)
   bumped from `16px` (no line-height) to `19 / 25` at desktop, drops
   to `16 / 20` at mobile. Underline / visited / hover-thickness /
   focus all inherit from the global `a` rule in `app.css` — no
   per-route duplicates.
5. **44 px touch floor universally.** `min-height: 44px` moves from
   the mobile-only `.doc-list a` override onto `.doc-list li` at all
   viewports. Same fix shipped in `/journal` round 4 W3.
6. **Date next to title, not floated.** Removed `.meta` wrapper with
   `margin-left: auto` (the wrapper pushed the date to the row's far
   edge, ~746 px right of the title — exactly the label/value-
   adjacency violation `260514-source-view-layout-and-govuk-
   discoverability` ruled against). Date now sits in the row right
   after the bookmark button, with `15 px` gap to the title. Bumped
   from `14 / -` to `16 / 20` to match `/journal`'s entry-date size.
7. **Tooltip removed.** `title="Bookmarked on {date}"` was redundant
   with the visible date and only available on hover (no screen-reader
   benefit). Dropped.

Template change: the row layout is now `[bookmark button] [date]
[title]`, mirroring `/journal`'s `[date] [source] [title]` shape.
Bookmark button stays first because it's the action affordance for
this route.

## Design choices that matter

1. **Category-header survives, less decorated.** The open question
   from the prompt — "does `.category-header` still earn its keep at
   720 px?" — resolved toward yes. A source can plausibly contain
   bookmarks across multiple doc-types, and a visible separator
   inside the source block makes the structure scannable. Dropping
   the uppercase + letter-spacing makes it a quiet bold subhead
   rather than a graphic-design flourish.
2. **Match `/journal`'s row shape, not `/source/[name]`'s.** The
   two index pages now both render `[date | title]` rows. Visual
   consistency between the two long-form list surfaces outweighs the
   slight reorder churn (bookmark button + date + title vs. date +
   source + title).
3. **Server bug noted, not fixed.** The bookmark API
   (`GET /api/bookmarks`) doesn't return the `type` column even though
   it's stored against each document. Found during verification when
   the category grouping rendered every bookmarked doc as
   `documentation`. This is a server-repo bug (a missing field in
   the enrichment join on `server/src/docserver/server.py` line ~1456)
   and out of scope for this PR. Flagged below.
4. **Bookmark button position.** Kept it as the first child of the
   row, before the date. It's the action affordance for the route
   (remove this bookmark) — putting it after the title would force a
   long-eye-saccade to find it on every row, and putting it after the
   date wouldn't change the saccade length but would split a meta-
   data column with an action button.

## What I considered and rejected

1. **Linking the source `<h2>` to `/source/{name}`.** Tempting, but
   it's exactly the cross-route source-badge pattern that's been
   flagged for a separate PR for three rounds running. The masthead
   already names the source per row implicitly (via the `<h2>`
   grouping), and the title link goes to the doc itself. Adding a
   second link target on the source header would compete.
2. **Source-then-flat (drop category grouping).** A 720 px column
   would tolerate a flat list under each source, but the category
   axis is meaningful data on this route — a user looking for "that
   journal entry I bookmarked last week" benefits from the Journal
   header narrowing the search. Kept.
3. **Stickying the bookmark button to the left edge with a fixed
   column width.** Would have made the rows line up vertically, but
   at the cost of an asymmetric row layout (button → fixed-width
   column → date → title) for what is a 16 px icon. Flex baseline
   alignment is enough.

## Verification

Playwright at 1440 / 1024 / 768 / 375 px in light + dark mode.
Screenshots in `.engineering-team/after-*.png`. Specifically:

- **At 1440 px light:** `.bookmarks-page` computed `max-width: 720px`,
  masthead inner stays at 960 px. `.source-header` is 24 / 30,
  `.category-header` is 16 / 20 with no uppercase / letter-spacing,
  `.entry-title` is 19 / 25 in GOV.UK link blue with
  `text-decoration-line: underline`. Every `.doc-list li` has computed
  `min-height: 44px`. Date column sits at x=392 (immediately after
  the bookmark button), title at x=499 (15 px gap) — no float-right.
- **At 375 px:** source-header drops to 21 / 25, entry-title drops
  to 16 / 20. Row wraps so title takes a full second line under the
  date. Min `li` height 73.5 px (44 px floor + wrapped content). No
  horizontal overflow (`scrollWidth === clientWidth === 375`).
- **0 console errors at every viewport.**
- **Dark mode:** borders use `var(--border)` so they remain subtle
  on dark; link colour stays GOV.UK blue (`rgb(26, 101, 166)`); 1 px
  underline visible against dark background.

Backend booted locally via `uv run python -m docserver` from
`server/` with `DOCSERVER_CONFIG=.engineering-team/sources.eng.yaml`,
`DOCSERVER_DOC_TYPES_CONFIG=.engineering-team/doc_types.eng.yaml`,
`DOCSERVER_DATA_DIR=local-data-eng`. Seven bookmarks created via
`POST /api/bookmarks` to cover two sources (server, webapp), one
broken doc_id (renders as an "unknown" source group — useful edge
case), and a mix of docs vs. CLAUDE.md vs. journal entries.

`npm run check` → 0 errors, 0 warnings, 431 files.
`npm test` → 15 files, 254 tests, all pass.
`npm run lint` → clean.

## A backend bug found along the way (out of scope, follow-up)

`GET /api/bookmarks` enriches each bookmark with `{title, source,
file_path, created_at, modified_at, size_bytes}` from the documents
table, but omits the `type` column. As a result every bookmark
arrives at the webapp with `type` undefined, the page falls back to
`"documentation"` for all, and the category grouping degenerates to a
single "Documentation" subheading per source. The fix is one line in
`server/src/docserver/server.py:api_list_bookmarks` — add `"type":
doc.get("type") if doc else None` to the enrichment dict. Lives in
the `unified-documentation-server` repo, not this PR.

This is a different bug from the round-4 finding (doc-types
classifier doesn't run in the ingestion subprocess). Both belong in
the server repo follow-up batch.

## Out of scope (flagged for next rounds)

1. Source-badge underline pattern across home / source / doc / journal —
   still cross-route, still pending. `/bookmarks` doesn't currently
   render a source-badge link (it groups by source via `<h2>` instead),
   so this round didn't add or commit to the pattern.
2. Search panel UI standards round.
3. Chat panel UI standards round.
4. `/status` UI standards round (the last remaining route after this
   one).
5. Backend bookmarks-API missing `type` field (above).
6. Backend doc-type classifier missing from the ingestion worker
   subprocess (round 4 finding).

## Design principles this reinforces

1. **Label/value-adjacency really matters at 720 px.** The previous
   `margin-left: auto` on the meta column pushed the date 746 px from
   the title — visually a separate "column" the eye had to traverse
   for every row. Putting it next to the title turns "scan title,
   then scan back for date" into a single eye-fix. The brief flagged
   this exactly, and the round-4 source-view fix established the
   rule; this round confirms it generalises to row-shape lists.
2. **De-decorate when the column narrows.** A 960 px column had room
   for an uppercase letter-spaced category header to feel
   architectural; a 720 px column makes the same treatment feel
   ornamental. Visual weight should track information-architecture
   weight, and narrower columns leave less budget for both.
3. **Tooltips that repeat their visible value are noise.** The
   `title="Bookmarked on {date}"` attribute carried the same date
   the user could already see, just gated behind hover. Dropped.
