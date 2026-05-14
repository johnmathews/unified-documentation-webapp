# 2026-05-14 — Header wraps on narrow phones

## What changed

1. **`src/routes/+layout.svelte`** — the GOV.UK-style header band now allows
   the action cluster (Files / Search / Chat / Theme / Scan / Status / Print
   = 7 buttons) to fall onto a second row at viewports ≤480px. The "Library"
   wordmark sits on row 1, the icon cluster on row 2 right-aligned.
2. **`.gitignore`** — added `.engineering-team/`. The engineering-team
   skill writes session-local scratch (eval reports, plans, screenshots)
   under this path, and it had been getting checked in by mistake.
3. **Removed from git index** — five stale planning files and six
   screenshots that had been carried from earlier sessions. Files remain on
   disk locally (they're in this worktree), they're just no longer tracked.

## The bug

At 375px (iPhone SE) the header showed "Library" overlapping the first
icon (the Files folder). Reproducible at every viewport ≤419px or so.

Root cause: `.govuk-header__container` is `display: flex;
justify-content: space-between` with no wrap, and the actions cluster has
`flex: 1; min-width: 0` so it shrinks rather than wraps when the row
overflows. With shrink down to zero, the cluster's content overflows
past its allocated width and renders on top of the title.

Numbers, hot off the dev server at 375px:
- Container padding: `10px 15px` → 30px horizontal → 345px usable.
- 7 buttons × `min-width: 44px` (WCAG touch-target floor) = 308px.
- "Library" at 20px font-weight 700 ≈ 70px.
- 70 + 308 = 378px → overflow ~33-45px depending on the inter-group gap.

## The fix

```css
@media (max-width: 480px) {
  .govuk-header__actions {
    flex-basis: 100%;
    min-width: 100%;
    justify-content: flex-end;
  }
}
```

Combined with `flex-wrap: wrap` on the container, this forces the action
cluster to consume a full row of its own at ≤480px. The cluster keeps its
right-alignment via `justify-content: flex-end`. The 44px touch-target
floor is preserved — buttons themselves are unchanged.

## Why not hide buttons?

Considered hiding Print + Status (least-used on mobile) instead of
wrapping. Rejected because:
- Wrap preserves discoverability — same controls at every viewport.
- The header growing by ~44px on phones is unobjectionable; the
  service-nav band already takes a second row.
- "Mobile-first. Every view must be usable on a 375px phone screen" from
  CLAUDE.md design principles — hiding controls is the opposite.

## Why 480px and not 420px?

Calculated overflow point is ~416px of content vs viewport. Phones run
360–430px wide (Galaxy S20 → iPhone 14 Pro Max). Set gate at 480px so the
wrap kicks in cleanly across the whole phone-size band rather than only
on the very smallest ones. Tablets and desktops are unaffected.

## Verification

Playwright at 375 / 481 / 768 / 1024 / 1440px in light mode, plus 375px in
dark mode. Screenshots in `.engineering-team/screenshots/` (gitignored
now). 481px specifically chosen to sit one pixel above the breakpoint —
confirms there's no regression at the boundary.

Backend ran locally via `uv run python -m docserver` (CLAUDE.md update of
this round: local frontend always needs a local backend). The user's
`config/sources.local.yaml` has a duplicate key that crashes startup, so
booted against `config/sources.example.yaml` for verification only.

`npm run check` → 0 errors, 0 warnings, 427 files.
`npm test` → 14 files, 245 tests, all pass.
`npm run lint` → clean.

## Out of scope (flagged for next rounds)

- Home page (`/`) — source cards, stats, link styling, width.
- `/doc/[id]` — metadata layout, max-width vs 75-char line length.
- `/journal` — month group headers, entry cards, dates.
- Search / chat panel overlay sizing on tablet.
- `/bookmarks`, `/status` — likely small fixes.

## Design principle this reinforces

When a flex row has too much content for the viewport at a known
breakpoint, prefer **wrap-and-restack** to either **hide** or **shrink-
below-touch-target**. Touch-target floors (44×44) are non-negotiable;
discoverability of controls is more valuable than vertical compactness on
phone-sized viewports.
