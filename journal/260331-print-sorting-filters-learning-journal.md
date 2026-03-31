# Print Improvements, Sorting, Filters, and Learning Journal Category

## Print Styles

Reduced all print font sizes by two steps from the original 12pt baseline:
- Body/content: 12pt -> 10pt
- Headings: h1 15pt, h2 13pt, h3 11pt
- Code: 8pt, Tables: 9pt

Added `white-space: pre-wrap` and `word-wrap: break-word` to code blocks in print mode. Without this, code that overflows horizontally simply disappears in print (no scrollbars exist on paper).

## Homepage Sortable Table

The homepage project table now has clickable column headers (Project, Last updated, Documents). Default sort is by last updated descending. Clicking a header sorts by that column; clicking again toggles ascending/descending. Active column shows a triangle indicator.

## Header Separator Fix

The vertical separator line between the icon-only buttons (theme, status, print) and the panel buttons (Files, Search, Chat) was not vertically centered. Replaced the CSS `border-left` approach with a dedicated `<span>` element that sits as a flex child. The parent's `align-items: center` handles centering reliably across all viewport sizes.

## Source Page Sorting and Dates

Source pages (`/source/<name>`) now show:
- A Recent/A-Z sort toggle that applies within each category section
- Both edited and created dates (inline, no labels) for every document
- Tighter row padding (6px vs 10px) for denser information display
- Created date hidden when it matches the modified date

Same treatment on category sub-pages (`/source/<name>/docs`, etc.).

## Cross-Project Source Filters

Added source filter buttons to all cross-project pages:
- `/journal` — filter by source project
- `/root-docs` — filter by source + Edited/Created/A-Z sort toggle + dates
- `/engineering-team` — filter by source + sort toggle + dates

Click a source button to filter; click again or "All" to reset. Masthead dynamically shows filtered count.

## Learning Journal Category

Added a new document category `learning_journal` for markdown files in `learning/` directories.

Backend: Added categorization rule in `knowledge_base.py` before the generic `docs` catch-all. Sorted by created_at descending (newest first), same as dev journal.

Frontend changes:
- `TreeSource` type, `CATEGORIES` constant, `categorizeFilePath` all include `learning_journal`
- Sidebar file picker shows Learning Journal as a collapsible category per source (book icon)
- Service nav bar has "Learning Journal" link between "Dev Journal" and "Engineering Team"
- New `/learning-journal` route with timeline layout and source filters
- Source pages show Learning Journal section when the source has entries
- Category sub-page router supports `learning_journal`

## Tests

Updated print CSS tests to match new font sizes (10pt body, 15pt h1, etc.) and stores tests to expect 6 categories instead of 5. All 174 tests pass.
