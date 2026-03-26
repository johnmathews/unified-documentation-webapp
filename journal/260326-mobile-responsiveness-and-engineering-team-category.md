# Mobile Responsiveness Overhaul & Engineering Team Category

## Summary

Comprehensive mobile UX overhaul and addition of the engineering_team document category to the UI.

## Mobile Responsiveness Changes

### Touch Targets (Critical Fix)
Every interactive element in the app failed the 44x44px minimum touch target guideline (Apple HIG / Material Design). All buttons, links, inputs, tree items, and breadcrumbs now have `min-height: 44px` on mobile via `@media (max-width: 600px)` scoped styles.

### Sidebar Drawer
- Changed from full-width overlay to 85% width (max 320px) on mobile, leaving visible content for spatial context
- Added backdrop/scrim (semi-transparent overlay) — tap to dismiss
- Added slide animation (250ms cubic-bezier transition via CSS transforms)
- Sidebar is always in the DOM on tablet/mobile (not conditionally rendered) to enable smooth transitions
- Changed from `{#if sidebarOpen}` conditional to `class:open` pattern at <= 1024px

### Swipe Gestures
- Swipe right from left edge (30px zone) opens sidebar
- Swipe left closes sidebar
- Swipe right closes chat panel
- Swipe from right edge opens chat
- Horizontal movement must dominate vertical and complete within 500ms

### Chat Panel
- Full-width overlay with backdrop on mobile
- Safe-area-inset-bottom padding on chat input for iPhone home indicator

### Other Mobile Fixes
- `viewport-fit=cover` in meta tag to enable safe-area-inset environment variables
- `100dvh` (with `100vh` fallback) for correct full-height on iOS Safari
- `padding-top: env(safe-area-inset-top)` on top bar for notched devices
- Responsive typography: h1 scales from 2rem to 1.5rem on mobile
- Markdown heading sizes reduced on mobile
- Fixed horizontal overflow: sources grid uses `min(380px, 100%)`, doc metadata wraps, file paths break-word
- Markdown tables get `overflow-x: auto` for horizontal scrolling
- Doc list items stack vertically on mobile (title above date)
- Escape key closes chat/sidebar
- Backdrop uses `z-index: 99`, panels use `z-index: 100`

## Engineering Team Category

Added `engineering_team` as a new document category in the UI. The MCP server backend already supported this (auto-includes `.engineering-team/` directories and categorizes them in the tree API response).

### UI Changes
- `TreeSource` interface: added `engineering_team: TreeDocument[]`
- Sidebar: new "Engineering Analysis" section with gear icon, expand/collapse support
- Source pages: engineering_team count in stats, doc list section
- Category page: handles `engineering_team` routing and label
- Home page: engineering_team stats in source cards
- Breadcrumbs: detects `.engineering-team/` paths for correct category breadcrumb

## Technical Decisions

- Used Svelte 5's `MediaQuery` class from `svelte/reactivity` for reactive mobile detection
- Touch handlers on the main content area (with `a11y_no_static_element_interactions` ignore since the div is purely a gesture capture surface)
- 600px breakpoint for mobile (aligned with Material Design 3 compact window class), 1024px for tablet
- CSS transforms for sidebar animation instead of display toggling — enables smooth slide transitions
