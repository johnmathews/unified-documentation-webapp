# 2026-05-16 — Round 3, batch B (density / layout)

Round 3 batch B closes the three density/layout items deferred from
round 2. Three commits — one per route — plus this entry.

## What shipped

### B1 — `/status` table density + masthead breakpoint

`src/routes/status/+page.svelte`. Table padding 12/25 → 10/16 on
both `th` and `td`. Subtle zebra striping (`var(--bg-zebra)` on
odd-row `td`s) anchors row rhythm. The masthead's media-query
breakpoints shift 641/640 → 768/767, mirroring what batch E did on
the home page.

`src/app.css` gains a `--bg-zebra` token (light `#f8f8f8`, dark
`rgba(255,255,255,0.03)`) — also used by home's table in B2.

### B2 — Home: orphan badge becomes a summary bar

`src/routes/+page.svelte`. The single-word "Healthy" badge floating
~50px above the table is replaced with a one-line summary bar:
`<status badge> · N projects · N documents · last scan Xm ago`. The
whole bar links to `/status`. New `homeSummary` `$derived` computes
the total file count and the most-recent `last_indexed` across all
sources. Table padding tightens to 10/16 to match B1.

### B3 — Doc viewer: single-line metadata + 75ch + type

`src/routes/doc/[id]/+page.svelte`. Header collapses two stacked
rows (meta + dates) into a single flex bar: `🔖 source / path ·
type · modified · words`. Wraps naturally on narrow screens. The
`doc.type` field — classified by the backend but never visible on
the viewer until now — appears between path and modified date.
`created_at` and the line count are dropped from the visible bar
in service of compactness.

`src/app.css` gains `--measure: 75ch` token; `.markdown-content`
gets `max-width: var(--measure)` as a defensive cap so the body
prose can never exceed comfortable reading length even if the
layout grid grows.

The print-CSS rules referencing the now-deleted `.doc-meta-row` and
`.doc-dates-row` were removed, and `src/lib/print-css.test.ts` was
updated to assert the new shape (the old classes are absent;
`.source-badge` print behaviour is preserved).

## Verification

- `npm test`: 282 passed across 17 test files. No regression.
- `npm run check`: clean.
- `npm run lint`: clean.
- Visual: Playwright before/after at 1440 / 1024 / 768 / 375 px in
  light + dark, captured by the controller at batch-end.

## Out of scope (still deferred to round 4)

- **B4** — tablet TOC drawer for 768–1023 px on the doc viewer.
- **B5** — `/status` expanded ↔ collapsed disclosure for "last
  error" detail.

After batch B merges, round 3 is closed. The closer journal entry
(`journal/260MMDD-round-3-closer.md`) summarises the 14 items
shipped across the five batches and lists round-4 candidates.

See `docs/superpowers/specs/2026-05-16-round-3-deferred-sweep-design.md`
for the full round-3 plan.
