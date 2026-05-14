# 2026-05-14 — `/source/[name]` layout fix + GOV.UK discoverability

## What changed

Three small edits, addressing one visible bug and one process gap.

1. **`src/lib/components/TreeNode.svelte`** — folder rows now keep the doc
   count tight to the folder name instead of pushing it to the far right edge
   of the row.
2. **`src/routes/source/[name]/+page.svelte`** — content column narrowed
   from 960px → 720px, in line with GOV.UK's two-thirds layout.
3. **`CLAUDE.md`** — added a "Design principles" section at the top
   pointing at `docs/govuk-design-research.md` (the north star) and
   `docs/brutalist-ui-implementation-plan.md`. Future sessions will
   discover the design intent without having to be told.

## The bug

The user reported `/sources/relay` looked broken: the doc-count value for
each folder ("5", "1", "3", ...) appeared on the far right of the row,
visually disconnected from the folder name on the left. At 960px page
width, this left a ~700px gap between label and value — the count read as a
separate column rather than as a count *of that folder*.

The same pattern exists in the sidebar at 320px width, where the small gap
is acceptable. The bug was only visible on the wide `/source/[name]`
template.

## Root cause

One CSS rule: `.folder-name { flex: 1 }` in `TreeNode.svelte`. Inside
`.folder-toggle` (a `display: flex; width: 100%` row), giving the name
`flex: 1` made it absorb all spare horizontal space, pushing the adjacent
`.count` element against the row's right edge. Leaf rows (`.tree-leaf` /
`.leaf-title`) were unaffected — `.leaf-title` uses the default
`flex: 0 1 auto` and already sat tight against the file icon.

## The fix

- `.folder-name`: drop `flex: 1`; add `min-width: 0` so the name shrinks
  but never grows. Ellipsis still kicks in on overly long names because
  `min-width: 0` lets the flex container squeeze it. Default `flex: 0 1
  auto` (implicit) means the name is now sized to content.
- `.count`: add `flex-shrink: 0` so the count is never the thing that
  collapses or line-breaks when names are long.
- `.folder-toggle` unchanged at `width: 100%` so the hover background still
  covers the full row.

## Why narrow the page too

Even with the count adjacent to its name, a 960px-wide column with very
short rows (~150px of content) leaves a lot of dead horizontal space and
makes the page feel under-filled. GOV.UK recommends two-thirds (~680px) for
content. 720px keeps the controls-row (stats tag + expand/collapse + sort
toggle) sensible at 640px+, and the existing mobile breakpoint that stacks
the controls-row is untouched.

## Verification

Playwright at 1440 / 1024 / 768 / 375px in light mode, plus 1440px in dark
mode. Screenshots saved under `.engineering-team/screenshots/`. The
backend stack failed to boot locally (the docker image is linux/amd64,
this host is arm64, and the volume's SQLite hit a disk-I/O error on
Rosetta), so the source tree was mocked via a Playwright `window.fetch`
override with a 14-doc fixture matching the prod screenshot the user
shared. At every width the doc count now sits ~4px to the right of the
folder name, with empty row hanging right.

`npm run check` → 0 errors, 0 warnings.
`npm test` → 14 files, 245 tests, all pass.
`npm run lint` → clean.

## Out of scope (flagged for the next round)

- The header at 375px viewport has crowding: "Documentation Library"
  title overlaps the right-side icon cluster, and "Library" gets clipped.
  Pre-existing; not addressed because user scoped this work to
  `/source/[name]` only.
- `.engineering-team/` has five stale planning files checked in from past
  sessions. The engineering-team skill treats this dir as session-local
  scratch — should probably be gitignored.
- Other routes (home, doc viewer, journal, search, chat, bookmarks,
  status) not audited; user said "we will get to them later."

## Design principle this establishes

For lists of `(label, count)` pairs: keep them adjacent. Don't let the
label absorb available width — counts that float in space stop reading as
counts of *this* item and start reading as a separate column.
