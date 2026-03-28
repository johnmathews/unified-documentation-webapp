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

## Files Changed

- `src/app.css` — chat-width CSS variable 360→432px
- `src/lib/components/Sidebar.svelte` — root_docs collapsible category, expand/collapse all
- `src/routes/+layout.svelte` — chat resize state, handler, handle element, CSS
- `src/routes/+page.svelte` — root docs section on home page, stats count fix
- `docs/architecture.md` — updated sidebar and chat panel descriptions
