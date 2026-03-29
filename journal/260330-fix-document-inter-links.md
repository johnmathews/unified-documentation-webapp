# Fix Document Inter-Links in Web UI

**Date:** 2026-03-30

## Problem

When viewing a document in the web UI, relative markdown links to other documents (e.g. `[text](other-doc.md)`) produced 404 errors. The links were designed for GitHub/local filesystem use and the web app had no link transformation logic.

## Root Cause

The `marked` library rendered links literally -- `[text](file.md)` became `<a href="file.md">`. The browser resolved this relative to the current page URL (`/doc/...`), which didn't match any SvelteKit route.

## Solution

Created `src/lib/links.ts` with a custom `marked` renderer that rewrites relative links at parse time:

- **`resolveDocLink(href, source, filePath)`** -- Resolves a relative path against the current document's directory, constructs the target doc_id (`source:resolved_path`), and returns the correct app URL. External URLs, anchors, and mailto links pass through unchanged.
- **`renderMarkdownWithLinks(content, source, filePath)`** -- Creates a `Marked` instance with the custom renderer and renders markdown to HTML with rewritten links.
- `.md` files resolve to `/doc/{docId}` (document viewer)
- Non-`.md` files (images, etc.) resolve to `/api/files/{docId}` (raw file serving)

Integrated into both the document viewer (`+page.svelte`) and the chat panel (`ChatPanel.svelte`).

## Key Decisions

- **Custom marked renderer over click handler** -- Links show correct URLs on hover, right-click and middle-click work naturally, no DOM event handling needed.
- **Resolve at render time, not ingestion time** -- Documents stay "normal" (unchanged markdown), no backend changes needed, same document serves different consumers.
- **No backend endpoint needed** -- Path resolution is pure string manipulation using `source` and `file_path` already available in the frontend.

## Files Changed

- `src/lib/links.ts` (new) -- Link resolution utility
- `src/lib/links.test.ts` (new) -- 28 tests covering all resolution cases
- `src/routes/doc/[id]/+page.svelte` -- Uses `renderMarkdownWithLinks`
- `src/lib/components/ChatPanel.svelte` -- Uses `renderMarkdownWithLinks` when document context available
- `CLAUDE.md` -- Added link resolution to project structure and architecture decisions
- `docs/architecture.md` -- Added document link resolution to Document Viewer description
