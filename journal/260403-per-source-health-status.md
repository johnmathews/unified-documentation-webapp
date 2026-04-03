# Per-source health status for status page

## What changed

The status page previously had a binary health check: "Healthy" (backend reachable) or "Error"
(backend unreachable). Individual source scan failures were invisible — the system showed green
even when every source was failing to sync.

### Backend (documentation-server)

- Added `source_status` SQLite table to persist scan results across server restarts. Tracks
  `last_checked`, `last_error`, `last_error_at`, and `consecutive_failures` per source.
- `KnowledgeBase.update_source_check()` records success (clears error, resets failures) or
  failure (increments counter, stores error message) via upsert.
- `Ingester._sync_source()` now calls `update_source_check()` on both success and failure paths.
- `get_last_check_times()` merges DB-persisted values with in-memory cache so `last_checked`
  survives server restarts.
- Health endpoint computes per-source status: `healthy` / `warning` (1 failure or >2x poll
  interval stale) / `error` (2+ failures or >5x stale) / `unknown` (never scanned).
- Overall status aggregates: `healthy` (all OK), `degraded` (any warning/error), `error` (all
  failing).
- Response now includes `poll_interval_seconds`, `source_status`, `last_error`, `last_error_at`,
  `consecutive_failures`.

### Frontend (documentation-webapp)

- New sortable **Status** column with color-coded labels (green/orange/red/grey).
- Consecutive failure count shown in parentheses when > 0.
- Error message displayed as tooltip on hover.
- Overall badge supports 3 states: Healthy (green), Degraded (orange), Error (red).
- Added `--warning` CSS variable to both light and dark themes.
- Status column sort defaults to ascending (errors first) on first click.

## Edge cases now caught

- Individual source consistently failing → visible as Warning/Error per source
- All sources failing but DB reachable → overall status is "Error" (was "Healthy")
- Server restart → last_checked persisted in DB, not lost from memory
- Recovery → success after failures resets status to Healthy

## Tests

- 7 new tests for `KnowledgeBase.update_source_check()` and `get_source_statuses()`
- 5 new tests for health endpoint status computation (healthy, warning, error, degraded, recovery)
- All 254 backend tests pass at 85% coverage
