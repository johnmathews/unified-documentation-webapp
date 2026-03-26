# Top Bar Redesign and Document Header Layout Fixes

## Changes

### Top Bar Redesign
- Replaced the old hamburger-menu sidebar toggle with three explicit navigation links: "All Documents", "Journal Entries", and "File Picker"
- "File Picker" is a button (not a link) that toggles the sidebar without navigating
- App title "Documentation" is now always centered on screen using `position: absolute; left: 50%; transform: translateX(-50%)`
- Sidebar starts closed by default instead of open
- Fixed undefined `onNavigate` reference that would have caused runtime errors on click
- Fixed "Journal Enttries" typo
- Moved link styles from Sidebar's scoped CSS to the layout where the elements actually live

### Document Header (doc-dates) Layout
- Changed `doc-dates` from `align-items: stretch` to `align-items: baseline` so the source badge only takes its natural height
- Date spans (`Created:`, `Modified:`) are now `flex-shrink: 0; white-space: nowrap` so they stay compact
- `file-path` span gets `flex: 1` with `text-overflow: ellipsis` to use remaining space for long filenames
- `file-path` now shows just the filename (not the full directory path)

### Code Formatting
- All changed files reformatted from tabs to spaces (consistent with project style)
