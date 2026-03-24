# Breadcrumbs, Light Mode, Chat Improvements

**Date:** 2026-03-24

## What was done

Four improvements to the documentation UI:

### Breadcrumb navigation
- New `Breadcrumbs.svelte` component: `Home / Source / Category / Document`
- New source page route (`/source/:name`) showing all docs and journal entries
- New category page route (`/source/:name/:category`) showing filtered list
- Home page source cards and category headings now link to these pages
- Doc page source badge is now a clickable link

### Light/dark mode
- Light theme CSS variables under `[data-theme="light"]`
- Sun/moon toggle button in the top bar
- Theme persisted to localStorage
- Inline `<script>` in `app.html` applies theme before paint (no flash)

### Chat panel expand
- Expand/collapse button (maximize icon) in chat header
- Expands to 50vw (full width on mobile)
- Message text increased from 0.85rem to 0.9rem

### Chat proxy reliability
- Added 90-second timeout via AbortController
- Proper JSON error responses instead of raw TypeErrors
- Catches fetch failures and returns `502 Backend unavailable`

## Backend changes (documentation-mcp-server)

- Chat system prompt now includes a document inventory (all sources, doc counts, titles)
- Search results increased from 5 to 8
- Non-blocking rescan endpoint (background thread, 409 on concurrent)
- Force rescan flag (`?force=true`) to bypass content hash check

## Key decisions

- Used localStorage for theme persistence (not cookies) since the app uses adapter-node SSR but the theme flash from inline script is imperceptible
- Breadcrumbs derive category from file_path (`journal/` pattern) rather than a separate API call
- Chat expand uses CSS variable `--chat-width-expanded: 50vw` with transition
- Document inventory in chat prompt is compact (titles only, not content) to keep token usage reasonable
