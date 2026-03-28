# Root Docs Category and Resizable Chat Panel

## Root Docs as a Proper Category

The `root_docs` category (files like README.md, CLAUDE.md in the project root) was partially
implemented — the backend returned them and the sidebar rendered them, but they appeared as flat
items directly under each source without a collapsible header. All other categories (Documentation
Directory, Development Journal, Engineering Analysis) had proper collapsible headers with counts.

Changes:
- **Sidebar**: Root Docs now renders as a collapsible category toggle with a document count, matching
  the pattern of the other three categories. Added to expand-all/collapse-all logic.
- **Home page**: Added a "Root Docs" section to each source card on the landing page. Previously,
  root docs were completely absent from the home page. Updated the doc count in stats to include
  root docs alongside docs-directory files.

## Resizable Chat Panel

The chat panel was previously a fixed-width overlay (360px). Made it wider by default and
user-resizable on desktop:

- Default width increased from 360px to 432px (20% wider)
- Added a drag handle on the left edge of the chat panel (desktop only, hidden on mobile
  and when expanded to 50vw)
- Width constrained to 300–900px range
- Width persisted to localStorage, matching the sidebar resize behavior
- Follows the same resize pattern as the existing sidebar (mousedown/mousemove/mouseup,
  user-select: none during drag, brand-colored handle highlight on hover)

## Print Page Feature

Added a print button (printer icon) to the top bar that calls `window.print()`. Comprehensive
`@media print` styles in `app.css`:

- Hides all UI chrome (header, nav, sidebar, chat, breadcrumbs, backdrop)
- Forces light colours so dark mode doesn't print reversed
- Compact 12pt base typography (headings: 18/15/13pt, code: 10pt, tables: 11pt)
- Source badge stripped to plain text (no padding, no background colour)
- Metadata rendered as 3 rows in print: source name, file path, dates
- Page break control: avoids breaks inside code blocks/blockquotes and after headings
- All critical overrides use `!important` to beat Svelte-scoped style specificity

## Document Metadata Layout

Split the single-row metadata bar into two rows in normal view:
- Row 1: source badge + full file path (no truncation, wraps with `word-break: break-all`)
- Row 2: created date + modified date

In print view, this becomes 3 rows (source name, file path, dates) via `flex-direction: column`.

## Duplicate Source Name Validation (MCP Server)

Added validation in `_parse_sources()` in the documentation-mcp-server that raises `ValueError`
on startup if two sources share the same name. Includes the conflicting paths in the error message.

## Service Nav Overhaul

Reorganized the service navigation bar:
- File Picker button moved to first position
- Renamed "Journal Entries" to "Dev Journal"
- Added "Root Docs" and "Engineering Team" nav items with dedicated cross-project
  aggregate pages at `/root-docs` and `/engineering-team`
- Renamed "Engineering Analysis" to "Engineering Team" across all views (sidebar,
  home page, source page, category page)

## Test Suite Expansion

Added 60 new tests (43→103 total):
- `print-css.test.ts` (36 tests): Parses app.css and asserts all critical print rules exist
  with correct values and `!important` flags. Guards against regression.
- `titles.test.ts` (13 tests): Tests `displaySource` (previously untested) and `displayTitle`
  edge cases.
- `stores.test.ts` (11 tests): Tests `CATEGORIES` constant ordering, uniqueness, and labels.
