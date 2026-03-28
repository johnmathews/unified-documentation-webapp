# Category Filters and Engineering Team Docs

## Summary

Added a global category filter to the sidebar and tracked `.engineering-team/` documents in git.

## Changes

### Category Filter (Sidebar)

- Added a collapsible "Filter categories" section between the search box and the document tree
- Four GOV.UK-style small checkboxes: Root Docs, Documentation, Journal, Engineering Team
- Toggling a checkbox immediately hides/shows that category across all sources
- Document counts per source update reactively to reflect filtered state
- A "N hidden" badge appears on the filter toggle when categories are filtered out
- Filter state persists to localStorage across page reloads
- Category definitions centralized in a `CATEGORIES` constant in `stores.svelte.ts` for extensibility

### Engineering Team Documents

- Tracked `.engineering-team/` directory (evaluation-report.md, improvement-plan.md) in the documentation-ui git repo
- The MCP server already auto-discovers `.engineering-team/` directories and serves them under the `engineering_team` category
- The UI already rendered this category in the sidebar and on source/category pages

### Git Cleanup

- Both repos had `.gitignore` updated: added `.playwright-mcp/`, `.claude/`, `local-data/`, `config/sources.local.yaml`
- Committed pending permission changes in documentation-mcp-server `.claude/settings.local.json`

## Design Decision

Researched GOV.UK Design System filter patterns (govuk-frontend checkboxes, MOJ filter component, GOV.UK Publishing search filter). Chose GOV.UK's small checkbox variant (`govuk-checkboxes--small`) for a compact, non-distracting filter that stays out of the way of the main content. Used custom CSS checkboxes matching GOV.UK's visual pattern: hidden native input, pseudo-element box with solid fill and checkmark on checked state, yellow focus ring.

## Note

During local testing, noticed that the MCP server indexes `node_modules/*.md` files when using the default `**/*.md` glob pattern on the documentation-ui repo. This is a separate issue to address — the server should either respect `.gitignore` patterns or the source config should use explicit patterns to exclude `node_modules/`.
