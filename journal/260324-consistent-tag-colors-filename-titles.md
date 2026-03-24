# Consistent Tag Colors and Filename-Based Titles

## What changed

Two UI consistency improvements:

### 1. Consistent source tag colors across the UI

The sidebar had colored source tags using a deterministic hash-based color palette, but the
journal timeline and document detail pages used plain/accent-colored tags. Extracted the color
logic into a shared `$lib/colors.ts` module and applied it everywhere source tags appear:

- **Sidebar** — imports from shared module (no visual change)
- **Journal timeline** — `.entry-source` now uses the same colored tags instead of plain gray
- **Document detail page** — `.source-badge` uses source-specific colors instead of the generic accent color

### 2. Filename-based sidebar and list titles

Changed `displayTitle()` across all components to show the filename (minus extension) instead of
the document's markdown `# title`. This prevents confusion when multiple files share the same
title (e.g., two `readme.md` files both titled "Homelab SRE Assistant" would now show as "readme").

Affected components: Sidebar, home page, journal timeline, source page, category page.

## Files changed

- `src/lib/colors.ts` — new shared module with `SOURCE_COLORS` palette and `sourceColor()` function
- `src/lib/components/Sidebar.svelte` — imports from shared module, updated `displayTitle`
- `src/routes/journal/+page.svelte` — colored source tags, updated `displayTitle`
- `src/routes/doc/[id]/+page.svelte` — colored source badge, updated style
- `src/routes/+page.svelte` — updated `displayTitle`
- `src/routes/source/[name]/+page.svelte` — updated `displayTitle`
- `src/routes/source/[name]/[category]/+page.svelte` — updated `displayTitle`
- `src/lib/api.test.ts` — updated `displayTitle` tests, added `sourceColor` tests

## Decisions

- Used filename without extension rather than a truncated title because filenames are always
  unique within a directory, while titles extracted from markdown headers are not guaranteed unique.
- Kept the same hash-based color assignment algorithm — it produces stable colors without needing
  any configuration or state.
