# Documentation UI

## Design principles

The webapp UI follows the **GOV.UK Design System** as its north star. When in
doubt — typography scale, spacing, colour, layout width, link styling,
component patterns — copy GOV.UK. Deviate only with a stated reason.

- [`docs/govuk-design-research.md`](docs/govuk-design-research.md) — the
  authoritative reference. Default to it.
- [`docs/brutalist-ui-implementation-plan.md`](docs/brutalist-ui-implementation-plan.md)
  — companion document explaining how the GOV.UK system was applied to this
  app (CSS variables, breakpoints, source-tag colours, dark mode).

Practical defaults that follow from this:

- Max page content width ≈ 1020px; main-content column ≈ two-thirds (≈680px).
  Do not let content stretch to fill the viewport.
- Body text 17–19px, headings on the GOV.UK scale (48 / 36 / 24 / 19 desktop;
  32 / 27 / 21 / 19 mobile), line heights in multiples of 5px.
- Links underlined and blue (`var(--link)`), with `var(--link-visited)` and
  the GOV.UK yellow focus state.
- No decorative shadows, gradients, or rounded corners. Every visual element
  must solve a specific problem.
- Mobile-first. Every view must be usable on a 375px phone screen.

## Project Structure

- `src/lib/` - Shared library code
  - `api.ts` - Client-side API functions (types + fetch wrappers)
  - `links.ts` - Document link resolution (rewrites relative markdown links to app URLs)
  - `tree.ts` - Pure helpers that build a nested `FolderNode` tree from a flat list of `TreeDocument`
  - `stores.svelte.ts` - Shared reactive state: current doc ID, sidebar expansion state, `DOC_TYPES` (vocabulary used by SearchPanel's type-select dropdown), and `excludeNotDocs` (SearchPanel "exclude non-documentation files" toggle, persists to `exclude-not-docs` localStorage key).
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
- **Per-document types** — The backend classifies each doc into one of `documentation`, `journal`, `prompt`, or `not-docs` and ships the value as `type` on every API payload. The frontend uses this vocabulary only in SearchPanel (a type-select dropdown and an "exclude non-documentation files" checkbox that maps to `exclude_types=not-docs`). The earlier per-document filter pills, location-category pills, and inline type badges in the tree were removed — they added visual noise without enough value to justify the complexity.
- **Document link resolution** — Relative markdown links (e.g. `[text](other.md)`) are rewritten at render time by `src/lib/links.ts`. Links to `.md` files resolve to `/doc/{docId}`, other files to `/api/files/{docId}`. The original markdown is unchanged, so links still work on GitHub and locally

## Backend Dependency

This app requires the documentation MCP server running. In Docker, it connects via `http://docserver:8080`. For local dev, the `.env` file sets `API_URL=http://localhost:8080` (the backend's default port). See `docs/development.md` for full local setup instructions.

**Any time you start a local frontend instance — `npm run dev`, Playwright runs, UI change verification, screenshots, etc. — you must also start a local backend** (`uv run python -m docserver` from `../server/`, or `docker compose up -d` for the full stack). There is no mock data layer; every route proxies to the docserver, so a frontend without a backend renders empty / error states and is not a faithful test of the UI.
