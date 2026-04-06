# High-contrast source tags and status badges

## What changed

Source tags (the colored labels identifying each project source) and status badges
(Healthy/Warning/Error) had low text-to-background contrast, especially in dark mode.

### Root cause

The original GOV.UK-style tag design used hue-matched text colors (e.g., dark blue text on
light blue background, light blue text on dark blue background). This produced contrast ratios
as low as ~3.5:1 in dark mode, well below the WCAG AA threshold of 4.5:1. Status badges were
worse — white text on the light-ish dark-mode success/warning/error colors gave ~1.7-2.3:1.

A secondary issue: on the homepage, `.source-link` overrode the tag's text color with
`var(--link)`, which wasn't designed to pair with the tag backgrounds.

### Fix

Simplified to use `color: var(--text)` for all tag classes — near-black (#0b0c0c) in light mode,
near-white (#e8e8e8) in dark mode. This gives 10:1+ contrast in both themes without needing
per-color text tuning. Dark mode tag backgrounds are set to darker values to complement the
light text.

Status badges in dark mode now use dark text (#1a1a1a) since the dark-mode functional colors
(--success, --warning, --error) are lighter/pastel.

Removed the `color: var(--link)` override from `.source-link` so tag text colors apply correctly.
Hover uses `filter: brightness(1.3)` instead of a color swap.

## Files changed

- `src/app.css` — tag class colors simplified
- `src/routes/+page.svelte` — source-link color fix, dark mode status badge overrides
- `src/routes/status/+page.svelte` — dark mode status badge overrides
