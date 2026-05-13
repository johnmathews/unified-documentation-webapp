# 2026-05-13 — Files panel improvements

Four UI fixes against the Files panel and source detail page, driven by user
complaints (image #1: pills too small / low contrast; image #2: pill vocabulary
too narrow; image #3: source page pills look broken; plus "first source
expanded by default" being jarring across 19 indexed sources).

## What shipped

1. **Chip restyle (W1).** `.type-filter-chip` in both `src/lib/components/Sidebar.svelte`
   and `src/routes/source/[name]/+page.svelte` moved from 11–12 px + `opacity:
   0.55` idle → 14 px + a GOV.UK-tag style (light tinted background, `var(--text)`
   foreground, no opacity dimming). Active-state colours keep `var(--text)` for
   the label and use the per-type accent as a tinted background, so the active
   tag is the visual cue rather than a contrast cliff. Both themes pass WCAG
   2.2 AA at idle now, where they previously sat at ~2.7:1.
2. **Default-collapsed sidebar + persistence (W2).** New
   `sidebarCollapse` store in `src/lib/stores.svelte.ts` (localStorage key
   `sidebar-expanded-sources`), following the same factory pattern as
   `typeFilters`. The Sidebar reads/writes it instead of an in-memory map.
   All sources start collapsed on a fresh load; expansions survive reloads.
3. **Location-based category store (W3).** Added `CATEGORY_FILTERS` vocabulary
   (`bookmarks`, `engineering-team`, `learning-journal`, `dev-journal`,
   `root-docs`), a `categoryOf(file_path)` pure classifier, and a
   `categoryFilters` store with opt-in semantics: all categories default off,
   and "off" means pass-through (the existing tree is unchanged until the user
   turns a pill on).
4. **Second pill row + inline bookmarks (W4).** A second
   `.type-filters .category-filters` row sits below the doc-type row, sharing
   the W1 chip shape with a brand-blue active state to read as a unified
   secondary filter. When the `bookmarks` pill is on, the Sidebar fetches
   `/api/bookmarks` (lazily, once) and passes a composed `filterDoc`
   predicate to TreeNode that ANDs the doc-type filter, the path-based
   category filter, and "is in the bookmark set." Bookmarks act as a
   visibility *override* — they keep matching docs visible even when other
   category pills would hide them.

## Notable decisions

- **TreeNode gained a `filterDoc` prop** rather than importing
  `categoryFilters` directly. This keeps the source detail page using just
  `typeFilters` (its existing behaviour) while letting the Sidebar compose
  the join. TreeNode falls back to the old typeFilters-only behaviour when no
  prop is passed, so the source page didn't need changes beyond the chip
  restyle.
- **Bookmarks visibility is implemented at the Sidebar level, not in
  `categoryFilters`.** The store's `isVisible(file_path)` deliberately never
  returns true for the `bookmarks` key — bookmark membership is by `doc_id`,
  not path, so making `categoryFilters` know about it would couple the store
  to an async fetch. Keeping the join at the consumer was simpler.
- **`learning-journal` ships even though nothing's indexed at `learning/`
  paths yet.** The pill works the moment such files are indexed; no UI
  changes needed when they appear. The ingestion gap belongs on the
  docserver side and is flagged in the plan's non-goals.
- **Active-state contrast** is achieved by keeping `color: var(--text)` and
  varying only the background tint. Per-type colours stay visible in the
  border + background but never sit under the label text — that's the
  GOV.UK pattern and it resolves the contrast complaint cleanly in both
  light and dark mode.

## Tests added / updated

- Inverted `Sidebar.test.ts` "only first expanded" → "collapses every source
  by default" + flipped the "toggles a source body" test's starting state.
- Added Sidebar tests for: store-seeded expansion restoring on mount, both
  pill rows rendering, category-filter hiding non-matching files, and
  bookmark visibility overriding category filters.
- Added `stores.test.ts` blocks for `categoryOf`, `categoryFilters`
  (defaults / OR semantics / bookmarks isolation / persistence), and
  `sidebarCollapse` (round-trip / setMany / persistence).
- All 270 vitest cases pass. `eslint` clean. `svelte-check` clean.
  `npm run build` succeeds.

## Visual verification

Live browser verification didn't happen this session: the backend wouldn't
start because the user's local `sources.local.yaml` has a duplicate
`unified-documentation-server` source name (pre-existing, unrelated). The
SvelteKit dev server runs but every `/api/*` route returns 502 without a
backend, so I couldn't validate the rendered tree with real data. The CSS
is unit-tested by inspection against the style guide
(`docs/govuk-design-research.md`) and the contrast math is straightforward;
the user should still eyeball both themes once the backend is running.
