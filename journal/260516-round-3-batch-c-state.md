# 2026-05-16 — Round 3, batch C (state)

Round 3 batch C closes the two deferred /status state items from
round 2: persist sort state in URL search params, and live-refresh
source health every 30s while the tab is visible. Three commits —
page-logic helpers + tests, C1 sort URL, C2 polling — plus this
entry.

## What shipped

### page-logic extraction (prep)

`src/routes/status/page-logic.ts` + `page-logic.test.ts` — pure
helpers in a sibling module so the URL roundtrip and polling
interval can be unit-tested without spinning up the SvelteKit
route. Exports `parseSortParams(URLSearchParams) → SortState`,
`buildSortQuery(SortState) → string`, the `SortKey` and
`SortState` types, plus `SORT_KEYS`, `DEFAULT_SORT`, and
`POLL_INTERVAL_MS = 30_000` constants.

12 unit tests cover: unknown params fall back to defaults; valid
`sort` + `dir` round-trip; missing-dir defaults differ for text
columns (asc) vs numeric columns (desc); query string omits `dir`
when it matches the key's natural default.

### C1 — sort URL roundtrip

`src/routes/status/+page.svelte`. The route's `sortKey` and
`sortAsc` were `$state` — refresh and bookmark lost them. Now:

- `sort` is `$derived` from `parseSortParams(page.url.searchParams)`
  via `$app/state` (the Svelte 5 modern page API; the legacy
  `$app/stores` pattern isn't used in this codebase).
- `toggleSort` builds the next state, computes the query via
  `buildSortQuery`, and calls `goto(..., { replaceState: true,
  noScroll: true, keepFocus: true })`.
- `replaceState` keeps sort changes out of back/forward history.
  `noScroll` preserves scroll position. `keepFocus` keeps the sort
  button focused so keyboard sorts stay usable.
- Unknown params (`?sort=evil&dir=sideways`) silently fall back to
  defaults — no console errors, no broken state.

### C2 — polling with visibilitychange pause

Same file, sibling `$effect`. Owns a `setInterval(loadHealth,
POLL_INTERVAL_MS)`. `browser`-gated to skip SSR. On
`visibilitychange` to hidden: clears the interval. On visible:
immediate catch-up `loadHealth()` then restarts the interval. The
effect's cleanup function clears the timer AND removes the
listener.

The existing `scanTick`-driven effect (from earlier work) still
works; both effects coexist independently. `loadHealth` is the
single mutating function — manual Refresh button, scanTick effect,
and the new polling effect all funnel through it. No AbortController
needed: a 30s interval makes concurrent calls vanishingly unlikely,
and the cost of a lost race is one stale render cycle.

## Verification

- `npm test`: 282 passed across 16 test files (270 baseline + 12 new
  page-logic tests).
- `npm run check`: clean.
- `npm run lint`: clean.
- Manual: Playwright URL roundtrip + visibilitychange + interval
  cleanup verified by the controller at batch-end.

## Round 3 status after this batch

Round 3 batches:
- ✅ E (polish) — merged 4a45232.
- ✅ A (a11y) — merged a280d21.
- ✅ D (XSS hardening) — merged 2085a62.
- ✅ C (state) — this batch, merging now.
- ⏳ B (density/layout) — mockup-first; pre-plan at
  `docs/superpowers/plans/2026-05-16-round-3-batch-b-density.md`.

Once B lands, the round-3 closer (`journal/260MMDD-round-3-
closer.md`) wraps the ledger and lists round-4 candidates.

See `docs/superpowers/specs/2026-05-16-round-3-deferred-sweep-design.md`
for the full round-3 plan.
