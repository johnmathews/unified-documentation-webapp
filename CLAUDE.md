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

- Reading-column width is bounded (doc body ≈900px, ≈720px when the TOC rail
  is shown) so prose keeps a comfortable measure — do not let the *text*
  stretch to fill the viewport. **Deliberate divergence from GOV.UK:** the
  header band, the service-nav band, and the `/chat` page are *full-bleed*
  (no centred max-width cap). Reading columns are *centred* (`margin: 0
  auto`) so the doc, home, and journal pages share one visual rhythm on
  wide displays — an earlier experiment left-aligning the doc column at the
  30px inset (to make every band share one left edge) read as abandoned
  rather than intentional once the column ran out and a viewport-wide empty
  band opened on its right. Rationale for full-bleed bands and the rejected
  alternative (cap chat to match the header) are in
  [`journal/260519-full-bleed-layout-decision.md`](journal/260519-full-bleed-layout-decision.md);
  the decision to re-centre the doc column is in
  [`journal/260519-doc-page-centred-reading-column.md`](journal/260519-doc-page-centred-reading-column.md).
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
  - `links.ts` - Document link resolution (rewrites relative markdown links to app URLs) and `parseFrontmatter` (splits a leading YAML frontmatter block off the body so it renders as a clean metadata table, not a Marked-mangled blob)
  - `datetime.ts` - `formatDateTime` — the single date+time formatter (created/modified shown with time-of-day, en-GB); all display sites delegate to it
  - `tree.ts` - Pure helpers that build a nested `FolderNode` tree from a flat list of `TreeDocument`, plus `findFolderNode` (descend to a sub-path node — backs the folder-browse route)
  - `stores.svelte.ts` - Shared reactive state: current doc ID, sidebar expansion state, `DOC_TYPES` (vocabulary used by SearchPanel's type-select dropdown), and `excludeNotDocs` (SearchPanel "exclude non-documentation files" toggle, persists to `exclude-not-docs` localStorage key).
  - `server/api.ts` - Server-side proxy utilities
  - `components/` - Svelte components (Sidebar, TreeNode, SearchPanel, ChatPanel, Breadcrumbs, …). `ChatPanel` is now the conversation-area component used *by the `/chat` page* — it is no longer a docked right-side panel.
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
- **Responsive** — Desktop (sidebar + main + optional search drawer), tablet (overlay drawers), phone (85%-width sidebar with backdrop, swipe gestures, 44px touch targets, safe-area-insets). Keyboard: `⌘B` Files, `⌘K` Search, `⌘J` go to `/chat`, `⌘.` TOC. `⌘F` is left untouched so the browser's native find-in-page still works; a previous `⌘\` binding for Files was reverted because the OS/browser intercepted it before the page handler could run.
- **Chat is a page, not a panel** — `/chat` (`src/routes/chat/+page.svelte`) is a standalone two-column page: conversation history on the left, the active conversation + input on the right (the `ChatPanel` component). The old docked/resizable right-side panel was removed entirely; the header "Chat" item is a nav link.
- **Folder tree per source** — The Sidebar and the folder-browse route (`/source/[name]/[...path]`) render the actual filesystem structure via `TreeNode.svelte` (a recursive collapsible component) and `buildFolderTree` (pure helper in `src/lib/tree.ts`). The source page (`/source/[name]`) instead renders **one flat table per directory** (no nesting): each directory is its own non-indented group, nested folders become sibling groups (e.g. `Docs` then `Docs / Archive`), `Root Documents` first; columns are Title / Path / Modified / Lines with a Recent/A–Z sort toggle. Source-tree data comes from `GET /api/sources/tree` (bulk) and `GET /api/sources/:name/tree` (single); `line_count` is derived server-side from stored content. Breadcrumb segments remain clickable links resolving to the `[...path]` route.
- **"View on GitHub"** — When a source's repo is github-backed, the doc page shows a link to the file on GitHub. The backend exposes `repo_url`/`branch` per source on `/health`; the webapp builds the blob URL via `githubFileUrl` in `api.ts`.
- **Per-document types** — The backend classifies each doc into one of `documentation`, `journal`, `prompt`, or `not-docs` and ships the value as `type` on every API payload. The frontend uses this vocabulary only in SearchPanel (a type-select dropdown that surfaces `not-docs` as "Not documentation" and an "exclude non-documentation files" checkbox that maps to `exclude_types=not-docs`; an `(?)` info icon on the checkbox carries the help-text explaining the relationship between the two controls). The earlier per-document filter pills, location-category pills, and inline type badges in the tree were removed — they added visual noise without enough value to justify the complexity.
- **Folder-label override** — `displayFolderName` in `src/lib/titles.ts` rewrites the on-disk `docs/` folder to "Documentation" wherever it surfaces in the UI (breadcrumbs, sidebar tree, source-page group headings). Other folder names are passed through unchanged. Routes and `href`s still use the real on-disk segment (`/source/<name>/docs/...`) — only the visible text is rewritten.
- **Document link resolution** — Relative markdown links (e.g. `[text](other.md)`) are rewritten at render time by `src/lib/links.ts`. Links to `.md` files resolve to `/doc/{docId}`, other files to `/api/files/{docId}`. The original markdown is unchanged, so links still work on GitHub and locally

## Backend Dependency

This app requires the documentation MCP server running. In Docker, it connects via `http://docserver:8080`. For local dev, the `.env` file sets `API_URL=http://localhost:8080` (the backend's default port). See `docs/development.md` for full local setup instructions.

**Any time you start a local frontend instance — `npm run dev`, Playwright runs, UI change verification, screenshots, etc. — you must also start a local backend** (`uv run python -m docserver` from `../server/`, or `docker compose up -d` for the full stack). There is no mock data layer; every route proxies to the docserver, so a frontend without a backend renders empty / error states and is not a faithful test of the UI.

For UI work, start the backend with `DOCSERVER_POLL_INTERVAL=0 DOCSERVER_INGEST_ON_START=0` so it serves the persisted corpus instead of re-ingesting on every boot (hot/slow laptop). Full recipe in `docs/development.md`.
