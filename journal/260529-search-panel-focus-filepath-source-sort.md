# Search panel: auto-focus, file path in results, alphabetical source filter

Three small fixes to `SearchPanel.svelte` driven by a single user session.

## 1. Auto-focus the search input when the panel opens

Opening the side panel with `⌘K` (or the toolbar button) used to require a
follow-up click into the input before you could start typing. The panel is
always present in the DOM with visibility toggled by a `class:open` CSS
class, so a plain `autofocus` attribute on the input would fire once at
mount (before the panel is shown) and never again.

Added an `open` prop to `SearchPanel`, bound the input via `bind:this`, and
hooked a `$effect` that calls `searchInput.focus()` whenever `open` becomes
true. `+layout.svelte` now passes `open={searchOpen}`. Re-opens (not just
the first open) re-focus the input, which is what you'd expect from a
keyboard-driven workflow.

The effect guards on `open && searchInput`, so the initial mount with
`searchOpen=false` does not steal focus from the page.

## 2. Show the file path on each search result

Result cards previously surfaced title, source tag, snippet, and created /
modified dates. With several sources containing similarly-titled docs
(`README.md`, `notes.md`, journal entries with date-prefixed names), having
the file path visible removed ambiguity before clicking through.

Added a `.result-path` span to `.result-meta`, monospace,
`var(--text-muted)`, `word-break: break-all` so long paths wrap inside the
flex meta row rather than overflowing. `title={result.file_path}` is also
set as a tooltip for users hovering over wrapped paths.

Considered showing just the basename. Rejected: the basename is often
already implied by the title (and is what `displayTitle` normalises from
when no title is present), so the *path* is what adds disambiguation. User
explicitly picked "full path" when asked.

## 3. Sort the Source filter dropdown alphabetically by displayed label

The Source dropdown looked almost-alphabetical but had `SRE Agent` and
`SRE Webapp` sitting above `Car`. Cause: `availableSources` came straight
from `fetchSources()` → `/health`, which returns raw source IDs in
ASCII-sorted order (uppercase before lowercase, so `SRE-...` sorts before
`car`, `cv-classification`, etc.). The `displaySource()` formatter only
prettifies the label for rendering — it does not affect ordering.

Sorted the array client-side in `loadSources()` using
`displaySource(a).localeCompare(displaySource(b), undefined, { sensitivity: "base" })`
so the displayed labels are alphabetised case-insensitively. The static
"All sources" option lives outside the loop so it stays pinned at the top.

Sorting on the client (rather than in the docserver) keeps the change
self-contained on the webapp side — the backend's ordering is a passive
contract here, not load-bearing.

## Verification

- `npm test` — 327 / 327 pass.
- `npm run lint` — clean.
- `npx svelte-check` — 0 errors. The single warning (`a11y_no_noninteractive_tabindex`
  on the existing info-icon span at line 261) is pre-existing.
- Manual run not done; behaviour should be visually obvious next time the
  panel is opened.
