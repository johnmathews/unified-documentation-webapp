# Typography improvements and source color cleanup

## What changed

Three related typography and styling improvements across all listing pages.

### 1. Document list font weight

Document titles on `/source/<name>` pages now use `font-weight: 600`, making them read more
like subheadings. Applied the same treatment to `/root-docs`, `/engineering-team` (was 700 on
the li, moved to 600 on the link), `/journal`, and `/learning-journal` (entry-title bumped
from 500 to 600).

### 2. Source tags: colored backgrounds removed

Source name tags previously had per-source colored backgrounds (tag-blue, tag-green, etc.)
via a hash-based color assignment in `colors.ts`. Replaced with bold colored text (no
backgrounds), then removed per-source coloring entirely — all source names now use normal
inherited text/link colors. The `sourceColorClass` function and `colors.ts` module were
deleted along with all tag color CSS classes from `app.css`.

### 3. Font size hierarchy fixes

- `/source/<name>`: Removed `text-transform: uppercase` and `letter-spacing` from h2 section
  headings — all-caps was inconsistent with the rest of the app.
- `/root-docs` and `/engineering-team`: Source group headings were 16px (from `.source-tag`)
  inside a 24px h2 — removed the font-size override so headings are properly larger than
  document links.
- `/journal`: Source names bumped from 16px to 19px to match entry titles.
- `/learning-journal`: Source names bumped from 16px to 20px (slightly larger than 19px titles).

## Files changed

- `src/app.css` — Removed all `.tag-*` color classes
- `src/lib/colors.ts` — Deleted (unused)
- `src/lib/api.test.ts` — Removed 3 `sourceColorClass` tests
- `src/lib/components/SearchPanel.svelte` — Removed color class usage
- `src/lib/components/Sidebar.svelte` — Removed color class usage
- `src/routes/+page.svelte` — Removed color class from source links
- `src/routes/doc/[id]/+page.svelte` — Removed color class from source badge
- `src/routes/engineering-team/+page.svelte` — Font weight, heading size, color cleanup
- `src/routes/journal/+page.svelte` — Font weight, source name size, color cleanup
- `src/routes/learning-journal/+page.svelte` — Font weight, source name size, color cleanup
- `src/routes/root-docs/+page.svelte` — Font weight, heading size, color cleanup
- `src/routes/source/[name]/+page.svelte` — Font weight, removed uppercase h2
- `src/routes/status/+page.svelte` — Removed color class usage
