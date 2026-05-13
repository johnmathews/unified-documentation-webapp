# Documentation UI

## Project Structure

- `src/lib/` - Shared library code
  - `api.ts` - Client-side API functions (types + fetch wrappers)
  - `links.ts` - Document link resolution (rewrites relative markdown links to app URLs)
  - `tree.ts` - Pure helpers that build a nested `FolderNode` tree from a flat list of `TreeDocument`
  - `stores.svelte.ts` - Shared reactive state (current doc ID, sidebar/chat state). The legacy `CATEGORIES` const and `categoryFilters` store still live here pending a follow-up stage that retires them in favour of per-document types.
  - `server/api.ts` - Server-side proxy utilities
  - `components/` - Svelte components (Sidebar, TreeNode, SearchPanel, ChatPanel, …)
- `src/routes/` - SvelteKit pages and API proxy routes
- `docs/` - Project documentation
- `journal/` - Development journal

## Key Commands

- `npm install` - Install dependencies
- `npm run dev` - Start dev server
- `npm run build` - Production build
- `npm run preview` - Preview production build

## Architecture Decisions

- **SvelteKit** with adapter-node for Docker deployment
- **Server-side proxy** — SvelteKit server routes proxy `/api/*` to the MCP server backend, configured via `API_URL` env var at runtime. JSON endpoints use `proxyGet`/`proxyPost`; binary endpoints (e.g. `/api/files/`) use `proxyGetRaw` which preserves Content-Type and Content-Length
- **No CORS needed** — Browser talks to same origin, server proxies to backend
- **Dark theme** with CSS custom properties
- **Responsive** — Desktop (3 panels), tablet (overlay drawers), phone (85%-width sidebar with backdrop, swipe gestures, 44px touch targets, safe-area-insets)
- **Folder tree per source** — Sidebar and per-source pages render the actual filesystem structure of each source repo via `TreeNode.svelte` (a recursive collapsible component) and `buildFolderTree` (pure helper in `src/lib/tree.ts`). Source-tree data comes from `GET /api/sources/tree` (bulk) and `GET /api/sources/:name/tree` (single).
- **Legacy nine-category system** — `CATEGORIES`, `categoryFilters`, `categorizeFilePath`, and the legacy `TreeSource` shape are still present and used by orphaned routes (`/source/[name]/[category]/`, `/root-docs`, `/journal`, `/learning-journal`, `/engineering-team`). A follow-up stage retires them in favour of per-document type classification.
- **Document link resolution** — Relative markdown links (e.g. `[text](other.md)`) are rewritten at render time by `src/lib/links.ts`. Links to `.md` files resolve to `/doc/{docId}`, other files to `/api/files/{docId}`. The original markdown is unchanged, so links still work on GitHub and locally

## Backend Dependency

This app requires the documentation MCP server running. In Docker, it connects via `http://docserver:8080`. For local dev, the `.env` file sets `API_URL=http://localhost:8080` (the backend's default port). See `docs/development.md` for full local setup instructions.
