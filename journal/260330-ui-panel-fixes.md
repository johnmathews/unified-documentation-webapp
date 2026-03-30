# UI Panel Fixes and Search Improvements

**Date:** 2026-03-30

## Changes

### 1. Navbar visual separator
Added a left border and extra margin on the Search button to visually separate the icon-only buttons (theme, status, print) from the text buttons (Search, Chat) in the header. Uses `border-left: 1px solid rgba(255,255,255,0.3)` with `margin-left: 10px` and `padding-left: 15px`.

### 2. Resizable search panel
The search panel now has its own independent width with a draggable resize handle on its right edge, matching the existing pattern used by the sidebar and chat panel. Width range is 250-800px, persisted to localStorage as `search-width`. Previously the search panel shared the sidebar's width variable and had no resize capability.

### 3. Type filter spacing
Added `display: flex; flex-direction: column; gap: 12px` to `.primary-filters` in SearchPanel.svelte so the "Type" subheading has proper vertical separation from the Source dropdown above it.

### 4. Search scope: keyword search on title and file_path
The backend's `search_documents()` method now combines ChromaDB semantic search with a complementary SQLite LIKE query on title and file_path fields. Documents that match only by title or file path (not body text) are now returned in search results with a synthetic score of 0.5. This ensures that searching for a term that appears only in a document's title will still find it.

### 5. Panel switching: mutual exclusivity
Fixed the File Picker button so it closes the search panel when opening the sidebar. Previously, clicking File Picker while search was open was a no-op (both panels tried to display at the same z-index, with search overlaying sidebar). Now sidebar and search are mutually exclusive in both directions. Search state (query, filters, results) is preserved across toggles because the SearchPanel component stays in the DOM with `display: none`.

## Test updates

### New tests
- `e2e/panel-switching.test.ts`: 11 Playwright tests covering panel mutual exclusivity, search state preservation, navbar separator CSS, resize handle, and Type filter gap
- `tests/test_knowledge_base.py` (backend): 5 pytest tests for keyword search on title/file_path

### Fixed tests
- `e2e/responsive-panels.test.ts`: Rewrote all 19 tests. Old tests used `getByTitle('Toggle sidebar')` (removed), assumed sidebar starts open (it starts closed), and tested CSS transform animations (replaced with display:none/flex). Updated to use `getByRole('button', { name: 'File Picker' })` and match current behavior.
- `e2e/mobile-ux.test.ts`: Rewrote selectors and behavioral assumptions. Fixed: `toggleSidebar` selector, `chatInput` (`textarea` not `input`), `searchInput` (`.search-input` not `.search-box input`), sidebar starting state, landscape width expectations (844px is above the 768px mobile breakpoint so panels use pixel widths, not 100%).

## Key decisions
- Search panel gets its own width state rather than sharing with sidebar, since they can have different preferred widths
- Keyword search uses a synthetic score of 0.5, placing title-only matches after strong semantic matches but before weak ones
- The 768px breakpoint is `max-width: 768px`, meaning exactly 768px IS mobile (100% width panels), but 844px (iPhone landscape) is NOT mobile (pixel-width panels)
