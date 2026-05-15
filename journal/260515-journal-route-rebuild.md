# 2026-05-15 — `/journal` route rebuilt (round 2, route 4)

Round-2 follow-up to the doc-viewer fix in `4e2a82f`. This unit's
target — `/journal` — turned out not to exist. It used to: the route
was deleted in `1158949` (May 13 2026) as part of the four-orphan-
routes-removed migration that came with the Stage 2 doc-type rework.
Round 2's previous handoff was written against the old mental model
and assumed it was still there. So this unit became a build, not a
CSS-only fix.

## What changed

Three new / edited files in the webapp:

1. **`src/lib/journal.ts`** (new) — Lifts the four pure helpers out of
   what was test-scoped scaffolding in `api.test.ts`. Exports:
   `sortJournalEntries`, `monthKey`, `formatDay`, `groupEntriesByMonth`,
   plus the `JournalEntry` interface (a `TreeDocument` extended with
   a required `source` field).
2. **`src/lib/journal.test.ts`** (new) — 16 tests. Ports the 7
   pre-existing test cases from the now-removed `api.test.ts` blocks,
   adds 9 new ones covering: stable sort on equal dates, malformed
   date input for `monthKey` / `formatDay`, `groupEntriesByMonth` on
   empty input, month-order preservation, and an `"Unknown date"`
   trailing group for null-dated entries. The empty-input case
   guarded a real bug in the deleted page's `groupedEntries` reducer
   (`groups[groups.length - 1].entries.push(...)` blows up if the
   array starts empty).
3. **`src/routes/journal/+page.svelte`** (new) — The route. Masthead
   block copied verbatim from `/bookmarks` (30 / 60 padding, 960 inner,
   white H1, GOV.UK masthead pattern). Body column is 720 px
   (matches `/source/[name]` and `/doc/[id]` after round 2 W1/W3).
   Layout per entry: date column, source label, title link, all in
   one baseline-aligned row at desktop; stacks with source label on
   top at < 640 px.
4. **`src/routes/+layout.svelte`** — One new `<li>` in the service-nav,
   placed between Projects and Bookmarks, with the same active-state
   `<strong>` pattern as its siblings.
5. **`src/lib/api.test.ts`** — Removed the two test-scoped
   `describe` blocks that had been the only home for the helpers
   (lines 81-156). Net test count: 245 → 254 (+9), as +16 in the new
   file minus 7 lifted out.

## Design choices that matter

1. **Source rendered as a non-link `<span>`, not an `<a>`.** The
   deleted page styled it as bold-blue-no-underline, which is the
   cross-route "source badge looks like a link but isn't underlined"
   pattern that has been flagged for a separate PR for two rounds
   running. Rendering as a plain label here means this PR doesn't
   pre-commit to the broken pattern, and the eventual cross-route fix
   doesn't have to revisit the `/journal` route.
2. **Title is the only link.** The deleted page had `entry-card` as
   the link wrapping everything; this round splits it so only the
   title is `<a>`. Cleaner GOV.UK link styling (underlined blue with
   visited + hover-thickness + focus), and the source label no longer
   inherits link colour by accident.
3. **No card-style hover.** Dropped the deleted page's
   `border-left: 3px solid transparent` → `border-left-color:
   var(--brand)` decoration. It wasn't an affordance — just a
   colour-bar at the row's left edge — and round 2's rule is "every
   visual element must solve a specific problem." Hover lives on the
   title link instead (text-decoration-thickness bump, GOV.UK
   pattern).
4. **720 px reading column.** The masthead inner stays at 960 px
   (consistent with `/`, `/bookmarks`, `/source/[name]`, `/doc/[id]`
   mastheads), but the actual content column matches the long-form
   surfaces that already adopted 720 px in round 2. A long list of
   date / source / title rows benefits from the same ≤ 75-char-per-
   line discipline as prose.
5. **44 px touch floor universally, not just mobile.** The deleted
   page applied `min-height: 44px` only at `< 640 px`. New rule
   applies it everywhere: both `.entry` and `.filter-btn` carry it
   regardless of viewport. Costs nothing on desktop, fixes the
   "8 px padding leaves a 32 px row" footgun.
6. **Typography on the 5 px grid.** Month header 24 / 30 desktop,
   21 / 25 mobile (GOV.UK heading-m / heading-s). Entry title 19 / 25
   desktop, 16 / 20 mobile (GOV.UK body / body-s). Entry date and
   source 16 / 20. All five-multiples. The deleted page inherited
   `line-height: 1.5` from `app.css`, which produced 28.5 px on 19 px
   text — exactly the kind of fractional-pixel accumulation round 2
   W3 ruled against.
7. **Day-number-only-on-first-entry-of-day.** Carried over from the
   deleted page, but the deduplication now lives in the template as
   `{day === prevDay ? "" : day}` rather than a CSS `visibility:
   hidden` toggle. Same visual outcome, but the empty cell is
   actually empty (no DOM text), so screen readers don't announce
   redundant dates.

## What I considered and rejected

1. **Adding a component-level vitest** for the page. Possible, but
   would need a layout mock + `fetchAllSourcesTree` mock for ~80 lines
   of test scaffolding. Playwright at 4 viewports × 2 themes already
   verifies the render, and the helper unit tests in W1 cover the
   data-shape correctness. Calling it out so the gap is deliberate.
2. **Backend `/api/journal` shortcut endpoint.** Client filter on the
   full `fetchAllSourcesTree()` result is fine at this scale (118
   docs in the test config, 5 KB JSON for the tree). Worth revisiting
   if the tree response gets heavy.
3. **A breadcrumb-style "All projects" / "<project name>"** trail
   when a source filter is active. The masthead description already
   names the active source ("98 journal entries from Server"), and
   the active filter button is visually pinned at the top of the
   list. Adding a second indicator would be noise.
4. **Linking the source label to `/source/{name}`.** Tempting, but
   it's exactly the cross-route source-badge pattern that's been
   flagged for a separate PR. Doing it here means picking a styling
   that the eventual fix has to relitigate — better to land neutral.

## Verification

Playwright at 1440 / 1024 / 768 / 375 px in light + dark mode.
Screenshots in `.engineering-team/after-*.png`. Specifically:

- **At 1440 px light:** journal-page `max-width: 720px`, masthead
  `max-width: 960px`. 98 entries, 3 month groups (May, April, March
  2026). Computed `.month-header` is 24 / 30, `.entry-title` is
  19 / 25 with `color: rgb(26, 101, 166)` (GOV.UK link blue) and
  `text-decoration-line: underline`. Min entry height: 44 px.
  Min filter-btn height: 44 px. No horizontal overflow.
- **At 375 px:** month-header drops to 21 / 25, entry-title drops
  to 16 / 20, h1 to 32 / 35. Source label uses `order: -1` so it
  appears above the title on the wrapped row. Min entry height 71
  (44 floor + body content). No horizontal overflow.
- **Filter interaction:** clicking the "Server" button at 375 px
  drops visible entries from 98 → 44 (matches the per-source
  journal count returned by the API). The source label disappears
  from each row since `activeSource` is truthy. Clicking again
  toggles back to 98 entries (active source clears).
- **Service nav at every viewport** shows three items: Projects,
  Journal, Bookmarks. The Journal item renders `<strong>` when
  `currentPath === "/journal"`.
- **Day-collapse:** at 1440, "15 Webapp Doc viewer UI fixes" is
  followed by " Webapp Home page UI fixes (round 2, route 2)" with
  the date cell empty — both same-day entries share the visible
  "15" only once.
- **0 console errors at every viewport.**

Backend booted locally via `uv run python -m docserver` with
`DOCSERVER_CONFIG=.engineering-team/sources.eng.yaml`,
`DOCSERVER_DOC_TYPES_CONFIG=.engineering-team/doc_types.eng.yaml`,
`DOCSERVER_DATA_DIR=local-data-eng`.

`npm run check` → 0 errors, 0 warnings, 431 files.
`npm test` → 15 files, 254 tests, all pass.
`npm run lint` → clean.

## A backend bug found along the way (out of scope, follow-up)

The doc-type classifier doesn't run during subprocess-mode ingestion.
`server/src/docserver/server.py` loads `DOCSERVER_DOC_TYPES_CONFIG`
into the in-process `Ingester`, but the production scan path runs in
a subprocess via `IngesterSupervisor` → `python -m
docserver.ingestion_worker`, and `ingestion_worker.py` does not call
`load_doc_types_config`. Result: every doc gets classified as the
fallback `documentation`, and the `journal/**` rule silently doesn't
fire. Workaround for this round's verification: a one-off SQL
`UPDATE documents SET type='journal' WHERE file_path LIKE
'journal/%' OR file_path LIKE '%/journal/%'` against the session-
local DB. The fix belongs in the server repo (load the doc_types
config inside `ingestion_worker.py:main()`), not in this PR.

## Out of scope (flagged for next rounds)

1. Source-badge underline pattern across home / source / doc /
   journal — still cross-route, still pending.
2. Search panel UI standards round.
3. Chat panel UI standards round.
4. `/bookmarks` and `/status` UI standards rounds.
5. Backend doc-type classifier missing from the ingestion worker
   subprocess (see "A backend bug" above). File in the
   `unified-documentation-server` repo.

## Design principles this reinforces

1. **Build a route's nav entry in the same PR.** A route without
   a nav link is a route the user can only reach by URL guessing.
   The nav `<li>` is 5 lines in `+layout.svelte` and trivially
   reversible — there's no reason to ship a route without one.
2. **Touch-target floors are universal, not phone-only.** Applying
   `min-height: 44px` only inside a mobile media query leaves a
   reachability gap on desktop with a stylus or touchscreen, and
   the rule is cheap enough to apply globally that the savings of
   not applying it aren't worth the asymmetry.
3. **A "feature" handoff that turns out to be a build.** Round 2's
   handoff prompt was written against a world where `/journal`
   existed; the codebase had moved on. Worth catching at the
   evaluation step rather than mid-build — this session opened
   with "the route doesn't exist; here are three paths forward,"
   which gave the user a real choice. Plan-driven sessions should
   verify the world matches the plan before assuming the plan is
   actionable.
