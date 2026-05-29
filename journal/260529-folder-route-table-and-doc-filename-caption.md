# Source-folder route as table + doc-page filename caption

Three related clarity fixes, all GOV.UK-styled.

## What changed

1. **Doc page (`/doc/[id]`).** The H1 comes from the markdown source and the
   author controls it, so the page couldn't reliably extract the filename
   from there. Added a GOV.UK caption-xl above the H1 (`.doc-caption`) that
   renders the document's repo-relative file path in monospace, so the page
   always asserts which file you're viewing regardless of what the author
   wrote in `# …`. Removed the now-duplicated `<span class="file-path">`
   from the meta line so we don't say the same path twice.

2. **Folder-browse route (`/source/[name]/[...path]`).** Replaced the
   concertina + recursive `TreeNode` body with the same flat-table-per-
   directory pattern the root source page already used. The current folder's
   docs render in a `Files` group; any descendant directories become sibling
   groups (e.g. `Files`, `Archive`) rather than indented children. Each
   table has Title / Filename (basename) / Modified / Created / Lines, with
   the existing Recent / A-Z sort toggle. The expand-all / collapse-all
   controls and the `forceExpanded` plumbing went with the concertina.

3. **Masthead breadcrumb context on the folder route.** The masthead H1
   alone ("proposals") didn't say *whose* proposals, even though the
   breadcrumb below answered that. Added a `.masthead__caption` overline
   above the H1 chaining the source name + each parent folder label with
   the GOV.UK chevron glyph (e.g. "SRE Agent › Documentation" for
   `/source/SRE-agent/docs`). The H1 itself now uses the same formatted
   folder label (e.g. `docs` → "Documentation") and the breadcrumb's
   current crumb was updated to match, so all three places agree.

4. **Source root route (`/source/[name]`).** Brought into column-alignment
   with the folder route: Path → Filename (basename), added Created
   between Modified and Lines. The pattern is now identical on both routes.

## Why these choices

- GOV.UK `caption-xl` is the canonical "this thing is a child of that
  thing" pattern. The doc page caption gives the on-disk path before the
  H1 announces the human-readable title; the folder-page caption gives
  the ancestor chain before the H1 announces the current folder.
- "Filename" column shows the basename only — when you're inside a folder
  group, the directory is the heading, so the leading path segments are
  redundant. On the root route the basename is enough to pair with the
  group heading too.
- Kept "Lines" as a fifth column on both routes; small line counts are a
  quick signal of stub-vs.-fully-written docs and it was already there.

## What did not change

- `TreeNode.svelte` is still used by the Sidebar. Removed only from the
  folder-browse route.
- The doc-page H1 itself. The author owns that.
- API surface. Both columns (`created_at`, `modified_at`) were already on
  `TreeDocument`.

## Tests / verification

- 327 tests pass; lint clean; svelte-check clean (one pre-existing a11y
  warning in `SearchPanel.svelte` unchanged).
- New test in `[...path]/page.test.ts` asserts the masthead caption text
  ("Demo Src › Documentation"), the H1 ("Proposals"), and the column
  order (`Title | Filename | Modified | Created | Lines`).
- Verified live in a browser against the local `SRE-agent` source at
  `/source/SRE-agent`, `/source/SRE-agent/docs`, `/source/SRE-agent/src/agent`,
  and `/doc/SRE-agent:docs/architecture.md`.

## Docs touched

- `CLAUDE.md` — corrected the "Folder tree per source" architecture note
  (folder-browse route no longer uses `TreeNode`; column lists updated).
- `docs/architecture.md` — Source Pages and Document Viewer sections
  brought back into agreement with the code.
