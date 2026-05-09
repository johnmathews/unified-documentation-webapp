# 2026-05-09 — Live scan progress in the banner

## Why

The "Scan Now" banner sat at "Scanning…" for the entire duration of an ingestion, even on cold starts where re-embedding could take 30–60 seconds. There was no signal that anything was actually happening, and no way to tell the difference between a slow scan and a stuck one.

## What changed

Two pieces of plumbing in `src/lib/api.ts`:

1. **New `pollScan()`** that's a superset of `pollUntilScanDone()` — same poll loop, plus an `onProgress` callback that fires after every `/api/health` poll with the latest `current_progress` payload (or `null` if the backend hasn't started reporting one yet). `pollUntilScanDone` is preserved as a thin shim so any future caller that doesn't care about progress doesn't have to specify it.
2. **New `ScanProgress` type and `current_progress` field on `HealthStatus`** matching the backend's new schema. Possible phases: `starting | syncing | discovery_done | processing`.

Then in `src/routes/+layout.svelte`:

- New `scanProgress: ScanProgress | null` reactive state, updated by `pollScan`'s `onProgress` callback during a scan and reset to `null` in the `finally` block of `handleScanClick`.
- `scanTitle()` extended to render different banner text per phase:
  - `discovery_done` → `"Found N documents from M sources to update"` (or `"No changes detected"` if `total_docs === 0`).
  - `processing` → `"Processing X/N — <doc>"` with the doc path truncated to ~50 chars from the end (so the file basename stays visible when paths are long).
  - `syncing` → `"Checking sources for changes…"`.
  - Anything else (including `starting` and the initial null state before the first poll lands) → falls through to the existing `"Scanning…"`.

## Polling cadence

Untouched. The existing 2 s `pollUntilScanDone` cadence is preserved by `pollScan`. For fast scans (< 2 s), the user may see the banner go straight from "Scanning…" to "Scan complete" without any intermediate states — which is fine, because the user's pain point was specifically *slow* scans where every poll has new state to show.

## What we didn't do

- **SSE / streaming.** Considered. Would give sub-second update latency but adds streaming infrastructure on both sides for an effect the existing 2 s poll handles well.
- **ARIA live-region noise control.** The banner has `aria-live="polite"`; rapid per-doc updates may flood screen readers during a fast burst. Acceptable for now — could split into a phase-headline live region + silent per-doc updates if it becomes an issue.
- **Cancel button.** Out of scope; would need a backend `/rescan/cancel` endpoint.

## Verification

- Vitest: 226 tests pass (was 224). Two new tests cover `pollScan` invoking `onProgress` with each polled `current_progress`, plus the older-backend case where `current_progress` is missing from the response (frontend gets `null`).
- `npm run check` and `npm run lint` clean.
- Manual end-to-end: requires backend with a non-empty source config and at least one source with pending changes. Worth a quick smoke after deploy: click Scan Now and verify the banner transitions through the three new phases.

## Backend counterpart

The backend changes live in `documentation-server` — see its journal entry on the same date. Both halves ship independently; if the webapp is updated before the backend, the banner just falls back to the original "Scanning…" string until the backend catches up (because `current_progress` is absent from older `/health` responses).
