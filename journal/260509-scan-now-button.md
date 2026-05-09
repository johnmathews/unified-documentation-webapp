# "Scan now" button on /status and homepage

## Context

The doc sources are scanned every 30 min by the docserver. That's the right
cadence for steady-state, but when you've just added a doc you want it to
appear in the app *now*, not in 29 minutes. This change adds a "Scan now"
button that triggers an immediate scan and reports what changed inline.

Pairs with the small backend additions in `documentation-server` on
`feature/scan-now-button` (extends `/health` with `last_stats` and
`ingestion_running`; logs the 409 no-op).

## Architecture: kick-off + poll, not block-and-wait

`POST /rescan` on the docserver was already async — it returns immediately
after starting the worker subprocess. Two viable shapes for the UI:

1. Synchronous endpoint that holds the connection until the scan finishes.
2. Async kick-off + poll `/health` until the cycle completes.

(2) was chosen. (1) would have collided with `proxyPost`'s 90s timeout
(supervisor allows 600s for slow scans), and there's no visible benefit to
the user from blocking — the polling overhead is trivial (1 GET every 2s).

## Files

- `src/routes/api/scan/+server.ts` — new SvelteKit POST proxy → backend `/rescan`.
- `src/lib/api.ts` — added `triggerScan()`, `pollUntilScanDone()`,
  `summariseScan()`, types `ScanStats` / `ScanTriggerResponse` / `ScanSummary`.
  Extended `HealthStatus` with optional `last_stats`, `ingestion_running`,
  and `last_ingestion.completed_at`.
- `src/lib/components/ScanNowButton.svelte` — self-contained component used
  on both pages. Manages its own state (idle / scanning / already-running /
  done summary / error). Accepts an `onComplete` callback so the parent can
  re-fetch its data when the scan finishes.
- `src/routes/status/+page.svelte` — button placed inside `.status-header`
  next to the existing Refresh button. `onComplete={loadHealth}`.
- `src/routes/+page.svelte` — wrapped status badge + button in a new
  `.home-status-row` flex container (replaces the badge's standalone
  `margin-bottom`). `onComplete={loadData}` so the project table re-renders
  with the new file counts.

## UX states

The button label is the entire feedback channel — no toast/notification
infrastructure existed and adding one for this single use case felt
disproportionate. States:

| State | Label |
|---|---|
| Idle | `Scan now` |
| In flight | `Scanning…` (disabled) |
| Already running on click | `Already scanning…` (disabled, then resolves) |
| Done — changes | `Done — N added, M updated, K removed` (auto-clears 6s) |
| Done — no changes | `No changes` (auto-clears 6s) |
| Error | inline red text next to the button |

Button has `min-width: 110px` so the label transitions don't make it jump.

## Polling details

`pollUntilScanDone(triggeredAtMs, …)`:
- Polls `/api/health` every 2s (default).
- Considers the scan finished when `ingestion_running === false` AND
  `last_ingestion.completed_at >= triggeredAtMs`.
- Uses wall-clock comparison rather than tracking a server-side trigger ID
  because the user's perceived "I clicked at this moment" is what matters,
  and any cycle that completes after that moment is a valid signal.
- Survives transient health-fetch failures (continues polling).
- Honours an `AbortSignal` and a 10-min timeout.
- Returns `null` on timeout; component shows "Scan timed out".

## Tests

Added 10 unit tests in `src/lib/api.test.ts` covering `summariseScan`,
`triggerScan` (200/409/500 branches), and `pollUntilScanDone` (success,
timeout, abort, transient failure recovery). Full suite: 81 passed.

No component test for `ScanNowButton` — the repo has no existing component
tests, and the helpers it composes are individually well covered. Manual
Playwright verification covered the component wiring.

## Manual verification (Playwright)

Drove a local stack with a synthetic source:

1. `/status` — clicked, button cycled `Scan now` → `Scanning…` → `No changes`
   (file already indexed). File count in the table unchanged.
2. Modified `hello.md` and added `another.md`, clicked again → backend logs
   showed `1 new, 1 modified`, table re-rendered with 2 files.
3. Deleted `another.md`, added `third.md`, clicked again → button briefly
   showed `Done — 1 added, 2 removed`. (Two removed because the previous
   `another.md` produced multiple chunks.)
4. Navigated to homepage, added `fourth.md`, clicked the button there →
   backend logged the rescan, table updated to 3 files, no console errors.

## Pitfalls

- The doc-id colon: the new proxy route is `POST /api/scan` (not parameterised),
  so it doesn't run into the colon-encoding hazard described in the workspace
  CLAUDE.md.
- The `HealthStatus` extension is optional fields, so older backends would
  still type-check — but the polling loop relies on the new fields, so the
  webapp is effectively coupled to the matching backend version. Acceptable;
  the two repos ship together.
