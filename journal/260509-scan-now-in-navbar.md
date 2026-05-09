# Move "Scan now" from homepage into the navbar

The "Scan now" button added earlier today (`260509-scan-now-button.md`) sat next
to the system status badge on the homepage. It looked out of place there — a
chunky text button immediately under the masthead, in a row with one other
element. The action is also useful from any page, not just `/`, but the only
other place it lived was the `/status` page.

Moved it into the GOV.UK header's utility-button group, immediately before the
chart-line icon that links to `/status`. That puts the two scan-related affordances
(trigger a scan, inspect scan results) right next to each other. The button is
now icon-only — refresh-cw glyph by default, spinning while a scan is in
progress, briefly turning into a green check on success or an orange alert on
error. The human-readable result ("Scan complete — 3 added, 2 updated", or the
error message) lives in the `title`/`aria-label` so it's still discoverable on
hover and to assistive tech, just without the layout-shifting wide button label.

## Cross-page refresh

When the button lived on the homepage, its `onComplete` callback re-fetched the
tree directly. From the navbar that doesn't work — the button has no idea what
the current page needs to refresh. Added a tiny `scanTick` counter store
(`stores.svelte.ts`); the navbar handler bumps it on success, and any page that
cares (`/`, `/status`) subscribes to it inside its mount `$effect` and re-runs
its loader. Three lines per page — `void scanTick.value;` to register the read.

## Why inline rather than a navbar variant on `ScanNowButton`

I considered adding a `variant="navbar"` prop to the existing component so it
could render either the chunky text button or the icon button from one place.
Decided against it because:

1. The layout's other navbar buttons (theme toggle, status link, print, panel
   toggles) are all inline `<button>`/`<a>` markup directly in `+layout.svelte`.
   That's the established convention and the styles (`.govuk-header__action-btn`)
   are scoped to that component. Putting a child component in the same group
   would either break the scoping or require refactoring all the other buttons
   to match.
2. The state machine is small (one `handleClick`, one `scanTitle`, a result
   auto-clear timer). Duplicating ~40 lines is cheaper than the indirection of
   a multi-shape component, especially since the icon-button rendering is
   meaningfully different from the text-button rendering — not just a CSS
   tweak.

`ScanNowButton.svelte` is unchanged and still used on `/status` next to the
"Refresh" button, where its text-with-result design fits.

## Files

- `src/lib/stores.svelte.ts`: added `scanTick` counter.
- `src/routes/+layout.svelte`: scan state, click handler, title formatter, and
  the new icon button between the theme toggle and the `/status` link. Plus a
  `spin` keyframe and `scan-done`/`scan-error` colour modifiers on
  `.govuk-header__action-btn`.
- `src/routes/+page.svelte`: removed `<ScanNowButton>` and its import; the
  status badge stays. The mount effect now subscribes to `scanTick`.
- `src/routes/status/+page.svelte`: same `scanTick` subscription so the page
  refreshes when a scan is triggered from the navbar while viewing `/status`.
- `docs/architecture.md`: updated the layout description to list the scan-now
  button and explain the icon/title feedback model.

## Verification

- `npm run lint`, `npx svelte-check`: clean.
- `npm test`: 224 / 224 pass.
- Playwright walk-through (desktop + 390px mobile): icon renders correctly in
  the utility-button group, scaling to a 44×44 touch target on mobile. Click
  triggers `POST /api/scan`, refresh-cw spins, transitions to a green check on
  completion (with title `"Scan complete — no changes"` against the empty
  test data), auto-clears after 6s. No console errors.
