# Sidebar Controls & Journal Timeline

## Changes

### 1. Expand All / Collapse All in Sidebar

Added a toolbar row between the search box and the file tree in `Sidebar.svelte` with:

- An **expand/collapse toggle button** that expands or collapses all sources and categories at once. Shows expand icon when anything is collapsed, collapse icon when all are expanded.
- A derived `allExpanded` state that tracks whether everything is currently expanded, so the button reflects the current state.
- Functions `expandAll()` and `collapseAll()` that iterate over all sources and set both `expandedSources` and `expandedCategories`.

### 2. Cross-Project Journal Timeline

Created a new `/journal` route that aggregates all journal entries from every source into a single chronological view:

- Fetches the tree data and extracts all journal entries across sources
- Sorts by `created_at` (or `modified_at` fallback), most recent first
- Groups entries by month/year with section headers for easy scanning
- Each entry shows title, date, and a source badge pill
- Responsive: on mobile, date moves above title for better readability
- Left border accent on hover for visual consistency with the sidebar active state

A link to "All Journal Entries" was added to the sidebar toolbar row (same row as expand/collapse) so it's always accessible from the navigation.

### 3. Test Suite & CI/CD

- Added vitest with jsdom environment as the project's first test suite
- 16 tests covering URL encoding, display helpers, date formatting, journal entry sorting/grouping, and API fetch behavior
- Created GitHub Actions workflow (`docker-publish.yml`) to build and push Docker images to `ghcr.io/johnmathews/documentation-ui` on push to main

## Decisions

- Used `$derived.by()` for the grouped entries computation since it depends on the sorted entries array and needs procedural logic.
- Grouped by month rather than showing a flat list — this provides visual structure without over-complicating the UI. A flat list of 50+ entries would be hard to scan.
- The journal link sits in the sidebar rather than the top bar to keep the top bar minimal and because journal browsing is a navigation activity.
- The expand/collapse button toggles between two states (expand all vs collapse all) rather than showing both buttons, keeping the UI compact.
