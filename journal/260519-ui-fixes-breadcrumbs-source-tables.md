# 2026-05-19 — UI fixes: breadcrumbs, source tables, navbar, chat button, sticky title

Six user-raised webapp issues, fixed in one pass on branch `eng-ui-fixes`.

## 1 & 6 — Breadcrumbs invisible / sticky header lacked the title (one root cause)

Breadcrumbs were *always* rendered on doc pages — not data-conditional. The
desktop sticky `.doc-header` used `position: sticky; top: -40px; margin-top:
-40px` with an opaque background and `z-index: 50`. The negative top-margin
pulled the opaque header up ~40px over the breadcrumb `<nav>` directly above
it, painting it out. The journal-doc screenshot only showed breadcrumbs
because its wrap/scroll state let them peek past the overlap.

Fix: moved `<Breadcrumbs>` *inside* `<header class="doc-header">` as its first
child and added a prominent `.doc-title` `<h1>` between the breadcrumbs and
`.doc-meta`. Nothing now sits above the opaque header for it to cover, so
breadcrumbs are always visible; and because breadcrumbs + title + meta are all
part of the sticky block, the document title stays pinned and readable when
scrolled. Dropped the `title` prop passed to `Breadcrumbs` (the dedicated
`<h1>` carries the name now; the trail ends at the folder).

## 2 — "Root Documents" vs "Docs" (investigation, no code)

Purely structural, computed client-side in `tree.ts`: "Root Documents" =
files with no `/` in `file_path`; each top-level directory is its own section.
Documented the answer in the evaluation report; no behaviour change needed
beyond #3.

## 3 — Source view → one flat table per document group

Replaced the `<details>` concertina + recursive `TreeNode` on
`/source/[name]` with one table per directory. Grouping is now flat: each
directory is its own non-indented group, nested folders become sibling groups
(`Docs`, then `Docs / Archive`), `Root Documents` always first. Columns:
Title (link) / Path / Modified / Lines. Recent/A–Z toggle sorts within each
group. `buildFolderTree`/`TreeNode` are untouched (still used by the Sidebar
and the `[...path]` folder-browse route).

## 4 — Navbar "Chat" underlined, others not

`Chat` is an `<a>`; `Files`/`Search` are `<button>`s. `.govuk-header__
action-btn` set no `text-decoration`, so only the anchor inherited the global
underlined-link style. Added `text-decoration: none` (incl. `:link/:visited/
:hover`) to the shared class — all header actions now consistent. Active state
remains the existing background highlight.

## 5 — Chat "New conversation" button

Was a tiny two-line box (no `white-space:nowrap`, squeezed flex item).
Relabelled to "New" with `title="New conversation"` for accessibility;
`white-space:nowrap`, centred, `padding: 8px 16px`, 16px text, `min-height:
40px`.

## Cross-repo

Line count is not in `TreeDocument` (only `size_bytes`). The server branch
`eng-source-tree-line-count` adds `line_count` to `get_source_files` (derived
from stored content). Added `line_count?: number | null` to `TreeDocument` in
`api.ts`; both tree endpoints pass it through unchanged.

## Verification

`npm run lint`, `npm run check` (svelte-check 0 errors), `npm test` (325
passed) all green. Updated `page.test.ts` for the new table structure and the
chat test for the new button label. Not yet visually verified in a live
browser — recommend a Playwright/manual pass with the backend running.
