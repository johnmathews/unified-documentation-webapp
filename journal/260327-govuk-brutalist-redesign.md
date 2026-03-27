# GOV.UK Brutalist UI Redesign

Complete visual redesign of the documentation browser to closely match the GOV.UK Design System website (https://design-system.service.gov.uk/). All values sourced from the actual `alphagov/govuk-frontend` and `alphagov/govuk-design-system` GitHub repos.

## What changed

### Design system foundation (`app.css`)
- Exact GOV.UK colour palette: `#0b0c0c` text, `#ffffff` body, `#f4f8fb` surfaces, `#1d70b8` brand blue, `#cecece` borders
- GOV.UK typography: 19px body, heading scale 48/36/24/19px with responsive compression
- GOV.UK link styling: underline thickens on hover, yellow focus highlight with black box-shadow
- GOV.UK input focus: `outline: 3px solid #ffdd00; box-shadow: inset 0 0 0 2px #0b0c0c`
- GOV.UK tag colours: shade-50 text on tint-80 backgrounds (from `_tag.scss`)
- GOV.UK inset text: 5px left border (from `_inset-text.scss`)
- GOV.UK tables: bottom-borders only, no side borders (from `_table.scss`)
- Dark mode as sensible inversion of the GOV.UK palette
- Zero border-radius throughout (brutalist)

### Layout (`+layout.svelte`)
- Two-band blue header: logo bar + service navigation bar (matching GOV.UK header structure)
- Service nav with active state (white bottom border + bold text)
- Sidebar and chat as fixed overlays starting below header, full remaining height
- Dynamic header height measurement via `onMount`
- 1100px container max-width (matching Design System site)
- Backdrop overlay when panels open

### Components
- **Sidebar**: GOV.UK subnav styling — 4px blue left border on active item, white background standout, 16px font
- **ChatPanel**: GOV.UK button styling on send (green with 3px shadow, pressed-down active state), inset-text style for assistant messages
- **Breadcrumbs**: GOV.UK chevron separators (CSS rotated border trick), text-coloured links

### Pages
- **Home**: GOV.UK masthead hero (blue background, white text, responsive heading scale), structured source cards with bullet lists and section dividers
- **Journal**: Added masthead hero section
- **All pages**: Widened to 960px max-width, GOV.UK heading hierarchy

### New shared utilities
- `src/lib/titles.ts`: `displayTitle()` normalises filenames to readable titles (strips date prefixes, replaces separators, Title Case, preserves short acronyms like SDK/API)
- `src/lib/colors.ts`: Refactored from inline styles to CSS class approach (`sourceColorClass()`) for theme-aware tag colours

## Key decisions
- Light mode is default (GOV.UK is light-only), dark mode available via toggle
- Sidebar is always an overlay (not persistent) — keeps content full-width and hero sections undisturbed
- Header height measured dynamically to position panels correctly below nav bar
- Document titles normalised with smart acronym handling (words ≤3 chars stay uppercase)

## Tests
- 43 tests passing (up from 40 — added 3 new tests for `displayTitle` normalisation)
- 0 type errors, 0 warnings
- Build passes
