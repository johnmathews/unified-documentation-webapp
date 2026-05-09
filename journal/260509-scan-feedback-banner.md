# Replace navbar icon-swap feedback with a notification banner; drop the in-page Scan now button on /status

The icon-only feedback I added in `260509-scan-now-in-navbar.md` (refresh-cw →
green check on success, alert on error) wasn't conveying enough. In prod the
user reported the icon "disappears for a bit" then comes back, which was the
icon swap (white refresh-cw → dark-green check on the brand-blue navbar — low
contrast, too subtle to read as "success"). And even when noticed, an icon
can't tell you *what* the scan picked up: "3 added, 2 updated" needs words.

## Changes

1. **Stopped swapping the icon.** The navbar button now always shows
   refresh-cw, just spinning while a scan is in progress. The success/error
   icon variants and the `.scan-done` / `.scan-error` colour modifiers are
   gone — they were the source of the perceived "disappearing" and they were
   redundant with the new banner anyway.

2. **Added a notification banner** anchored under the header (top-right on
   desktop, full-width on mobile) that surfaces the actual result text:

   - "Scanning…" / "Already scanning…" while in progress (no dismiss × — can't
     dismiss an active operation).
   - "Scan complete — 3 added, 2 updated, 1 removed" on success-with-changes.
   - "Scan complete — no changes" on success-with-no-changes.
   - "Scan failed: …" on error.

   The banner has a coloured left border (brand-blue while scanning, GOV.UK
   green for success-with-changes, neutral grey for no-changes, GOV.UK red for
   errors) and a × button that dismisses immediately. It auto-clears 6 s after
   completion via the existing `scanResultTimer`. `role="status"` +
   `aria-live="polite"` so screen readers announce results.

3. **Removed the in-page Scan now button from `/status`.** The navbar button
   is visible from every page including `/status`, so duplicating it next to
   "Refresh" was redundant — and it carried its own inline feedback that would
   compete with the banner. `ScanNowButton.svelte` had no remaining users so
   the file is gone too. The `triggerScan` / `pollUntilScanDone` /
   `summariseScan` helpers in `api.ts` and their tests stay — those are still
   what the layout's scan handler uses.

## TypeScript narrowing gotcha

While writing the `scanHadChanges` derived, my first attempt was the obvious
`!!scanSummary && (scanSummary.added > 0 || …)`. svelte-check rejected it with
"Property 'added' does not exist on type 'never'" — TS narrows `scanSummary`
to `never` after the truthiness check inside a `$derived(...)` callback for
some reason I didn't fully chase. Rewriting as `$derived.by` with an explicit
local `const s = scanSummary; if (!s) return false;` got the narrow back.
Worth remembering for future runes work.

## Files

- `src/routes/+layout.svelte`: removed icon variants and their colour
  modifiers; added `dismissScanResult`, `scanHadChanges` derived, the banner
  markup, and ~80 lines of banner CSS.
- `src/routes/status/+page.svelte`: removed the `ScanNowButton` import and
  usage. The `Refresh` button stays. `scanTick` subscription stays so the page
  refetches when the navbar button completes a scan.
- `src/lib/components/ScanNowButton.svelte`: deleted (no remaining users).
- `docs/architecture.md`: updated the layout description to reflect the new
  icon-only-with-banner feedback model.

## Verification

- `npm run lint`, `npx svelte-check`, `npm test`: all clean (224 / 224 tests).
- Playwright walkthrough on desktop and 390 px mobile: clicking the navbar
  scan button leaves the icon refresh-cw (no swap), the banner appears with
  "Scan complete — no changes" on the empty test data, the × dismisses it
  immediately, and the 6 s auto-clear still works. Mobile banner stretches
  to the viewport width minus 16 px on each side.

One known cosmetic edge case: on very narrow viewports the service-nav band
wraps to two rows, but `--header-height` is computed once at mount before
that wrap, so the banner can briefly overlap the second nav row during the
6 seconds it's visible. Acceptable for now.
