# Round 3 — Batch C (State) Implementation Plan

**Status:** superseded — completed and shipped in round 3; see [journal/260516-round-3-closer.md](../../journal/260516-round-3-closer.md) (archived 2026-05-19).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finalise `/status` behaviour — (C1) persist sort state in URL search params so refresh/bookmark/back-forward work; (C2) live-refresh source health every 30s, paused while the tab is hidden.

**Architecture:** Two independent items on the same file. C1 swaps two `$state` declarations for URL-derived/URL-writing reactives; C2 adds a `$effect` that owns a `setInterval` plus a `visibilitychange` listener with proper cleanup. Both items use Svelte 5 runes; both can be unit-tested with route-fixture-style tests using vitest + happy-dom.

**Tech Stack:** Svelte 5 runes (`$state`, `$derived`, `$effect`), SvelteKit `$app/navigation` (`goto`) + `$app/stores` (`page`), happy-dom for `document.hidden` + `visibilitychange` mocking.

**Spec:** `docs/superpowers/specs/2026-05-16-round-3-deferred-sweep-design.md` — Batch C.

---

## File Structure

```
src/routes/status/+page.svelte                   ← C1: sort URL roundtrip; C2: setInterval + visibility pause
src/routes/status/page-logic.test.ts             ← NEW: unit tests for parseSortParams, buildSortParams, and polling helpers (pure functions extracted from the route)
src/routes/status/page-logic.ts                  ← NEW: extracted pure helpers — parseSortParams, buildSortParams, POLL_INTERVAL_MS
journal/260MMDD-round-3-batch-c-state.md         ← new journal entry
```

The reason to extract `page-logic.ts`: the route's `<script>` block is hard to unit-test directly (SvelteKit's route boilerplate, `$state` runes). Pure helpers in a sibling module are trivially testable. Keep the route file thin — its job is reactive wiring, not URL parsing.

Use a fresh branch `eng-round-3-batch-c-state` off `main`.

---

## Task 1: Extract `page-logic.ts` (TDD scaffolding)

This task adds the pure helpers we'll need in C1 and C2, plus their tests. The route doesn't use them yet.

**Files:**
- Create: `src/routes/status/page-logic.ts`
- Create: `src/routes/status/page-logic.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/routes/status/page-logic.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
 parseSortParams,
 buildSortQuery,
 POLL_INTERVAL_MS,
 SORT_KEYS,
 DEFAULT_SORT,
} from "./page-logic";

describe("parseSortParams", () => {
 it("returns defaults when no params are present", () => {
  const params = new URLSearchParams("");
  expect(parseSortParams(params)).toEqual(DEFAULT_SORT);
 });

 it("parses a valid sort key + asc direction", () => {
  const params = new URLSearchParams("sort=source&dir=asc");
  expect(parseSortParams(params)).toEqual({ key: "source", asc: true });
 });

 it("parses a valid sort key + desc direction", () => {
  const params = new URLSearchParams("sort=file_count&dir=desc");
  expect(parseSortParams(params)).toEqual({ key: "file_count", asc: false });
 });

 it("falls back to defaults when sort key is unknown", () => {
  const params = new URLSearchParams("sort=evil&dir=asc");
  expect(parseSortParams(params)).toEqual(DEFAULT_SORT);
 });

 it("falls back to default dir when dir is unknown but key is valid", () => {
  const params = new URLSearchParams("sort=source&dir=sideways");
  expect(parseSortParams(params)).toEqual({ key: "source", asc: true });
 });

 it("treats dir as desc-by-default when missing on a non-text column", () => {
  const params = new URLSearchParams("sort=file_count");
  expect(parseSortParams(params)).toEqual({ key: "file_count", asc: false });
 });

 it("treats dir as asc-by-default when missing on a text column", () => {
  const params = new URLSearchParams("sort=source");
  expect(parseSortParams(params)).toEqual({ key: "source", asc: true });
 });
});

describe("buildSortQuery", () => {
 it("returns empty string when sort matches default", () => {
  expect(buildSortQuery(DEFAULT_SORT)).toBe("");
 });

 it("includes sort and dir when both differ from defaults", () => {
  expect(buildSortQuery({ key: "source", asc: false })).toBe("?sort=source&dir=desc");
 });

 it("includes sort when only key differs", () => {
  expect(buildSortQuery({ key: "file_count", asc: false })).toBe("?sort=file_count");
 });
});

describe("SORT_KEYS", () => {
 it("matches the route's known sort keys", () => {
  expect(SORT_KEYS).toEqual([
   "source",
   "source_status",
   "file_count",
   "chunk_count",
   "last_indexed",
   "last_checked",
  ]);
 });
});

describe("POLL_INTERVAL_MS", () => {
 it("is 30 seconds", () => {
  expect(POLL_INTERVAL_MS).toBe(30_000);
 });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/routes/status/page-logic.test.ts
```

Expected: failure — module not found.

- [ ] **Step 3: Implement `src/routes/status/page-logic.ts`**

Create `src/routes/status/page-logic.ts`:

```typescript
export type SortKey =
 | "source"
 | "source_status"
 | "file_count"
 | "chunk_count"
 | "last_indexed"
 | "last_checked";

export const SORT_KEYS: SortKey[] = [
 "source",
 "source_status",
 "file_count",
 "chunk_count",
 "last_indexed",
 "last_checked",
];

export interface SortState {
 key: SortKey;
 asc: boolean;
}

export const DEFAULT_SORT: SortState = { key: "last_indexed", asc: false };

/** Sort keys whose natural default direction is ascending (text columns). */
const ASC_DEFAULT_KEYS: SortKey[] = ["source", "source_status"];

/** Read sort state from URLSearchParams, falling back to defaults for any
 *  unknown or missing values. Never throws. */
export function parseSortParams(params: URLSearchParams): SortState {
 const rawKey = params.get("sort");
 const rawDir = params.get("dir");
 if (!rawKey || !SORT_KEYS.includes(rawKey as SortKey)) {
  return DEFAULT_SORT;
 }
 const key = rawKey as SortKey;
 let asc: boolean;
 if (rawDir === "asc") asc = true;
 else if (rawDir === "desc") asc = false;
 else asc = ASC_DEFAULT_KEYS.includes(key);
 return { key, asc };
}

/** Build a `?sort=…&dir=…` query string for the given sort state.
 *  Returns "" when the state is the default (no params needed).
 *  Returns just "?sort=…" when only the key differs and the dir matches that key's default. */
export function buildSortQuery(state: SortState): string {
 if (state.key === DEFAULT_SORT.key && state.asc === DEFAULT_SORT.asc) {
  return "";
 }
 const params = new URLSearchParams();
 params.set("sort", state.key);
 const keyDefaultAsc = ASC_DEFAULT_KEYS.includes(state.key);
 if (state.asc !== keyDefaultAsc) {
  params.set("dir", state.asc ? "asc" : "desc");
 }
 return `?${params.toString()}`;
}

/** Polling interval for /status live refresh. */
export const POLL_INTERVAL_MS = 30_000;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/routes/status/page-logic.test.ts
```

Expected: all tests pass (14 it blocks).

- [ ] **Step 5: Run full suite**

```bash
npm test
```

Expected: previous total + 14 new = 254 + 14 (or whatever batch-A landed) + 14. Verify no failures.

- [ ] **Step 6: Run check + lint**

```bash
npm run check
npm run lint
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/routes/status/page-logic.ts src/routes/status/page-logic.test.ts
git commit -m "$(cat <<'EOF'
Extract /status sort + polling logic into testable pure helpers (round 3 — batch C, prep)

Pure helpers parseSortParams + buildSortQuery + constants live in a
sibling module so they can be unit-tested without spinning up the
SvelteKit route. The route file in the next two commits will use them
for URL roundtripping (C1) and polling interval (C2).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: C1 — Sort state in URL search params

**Files:**
- Modify: `src/routes/status/+page.svelte:1-105` (the `<script>` block).

Currently the route declares:

```typescript
let sortKey: SortKey = $state("last_indexed");
let sortAsc = $state(false);
```

And `toggleSort` mutates them in-place. We're replacing those with a URL-derived reactive sort state and a `toggleSort` that writes the new state to the URL via `goto`.

- [ ] **Step 1: Update the imports**

Open `src/routes/status/+page.svelte`. Around the existing imports (lines 1-4), add:

```typescript
 import { goto } from "$app/navigation";
 import { page } from "$app/stores";
 import { parseSortParams, buildSortQuery, type SortState, type SortKey } from "./page-logic";
```

And remove the now-duplicate `SortKey` type alias (line 11):

```typescript
 type SortKey = "source" | "source_status" | "file_count" | "chunk_count" | "last_indexed" | "last_checked";
```

(`SortKey` now comes from `page-logic.ts`.)

- [ ] **Step 2: Replace the sort `$state` with URL-derived state**

Remove:

```typescript
 let sortKey: SortKey = $state("last_indexed");
 let sortAsc = $state(false);
```

Add (using Svelte's `$page` store via the `$:` prefix):

```typescript
 // Sort state is derived from URL search params. toggleSort writes to URL.
 let sort = $derived<SortState>(parseSortParams($page.url.searchParams));
 let sortKey = $derived(sort.key);
 let sortAsc = $derived(sort.asc);
```

The `$page` store is automatically reactive — re-deriving `sort` whenever the URL changes (via `goto`, back/forward, or initial load).

- [ ] **Step 3: Replace `toggleSort` to write to the URL**

Find the existing `toggleSort` function (lines 17-24):

```typescript
 function toggleSort(key: SortKey) {
  if (sortKey === key) {
   sortAsc = !sortAsc;
  } else {
   sortKey = key;
   sortAsc = key === "source" || key === "source_status";
  }
 }
```

Replace with:

```typescript
 function toggleSort(key: SortKey) {
  const next: SortState =
   sort.key === key
    ? { key, asc: !sort.asc }
    : { key, asc: key === "source" || key === "source_status" };
  const query = buildSortQuery(next);
  void goto(`/status${query}`, { replaceState: true, noScroll: true, keepFocus: true });
 }
```

`goto` triggers the `$page` store update, which re-derives `sort` automatically. `replaceState: true` keeps each sort change out of the back/forward history — clicking the same sort 5 times produces one history entry, not five. `noScroll: true` keeps the user's scroll position. `keepFocus: true` keeps focus on the sort button so keyboard sorts stay usable.

- [ ] **Step 4: Sanity check the rest of the route is unchanged**

The `sortedSources = $derived.by(...)` block at lines 26-44 reads `sortKey` and `sortAsc` — those are still reactive thanks to the `$derived` declarations in Step 2, so no change needed there. The `sortIndicator` function and the template's onclick handlers also stay as-is.

- [ ] **Step 5: Run build gates**

```bash
npm run check
npm run lint
npm test
```

Expected: clean. Test count unchanged at +14 from Task 1 (this task is route-side; covered by Playwright in Step 6).

If `npm run check` flags an unused import (e.g. the old `SortKey` type alias if you didn't remove it cleanly), tidy it up.

- [ ] **Step 6: Manual verification**

With backend + dev server, open `/status`. Click the Source column header — URL should become `/status?sort=source` (ascending is the default for source). Click again — `/status?sort=source&dir=desc`. Click Last Updated — URL becomes `/status` (matches default). Reload at `/status?sort=source` — sort restored.

Open `/status?sort=evil&dir=asc` directly — should fall back to defaults and render correctly (no console errors).

Press browser back — sort history is suppressed thanks to `replaceState: true`; back should take you to whatever you were on before `/status`.

- [ ] **Step 7: Commit**

```bash
git add src/routes/status/+page.svelte
git commit -m "$(cat <<'EOF'
/status sort state lives in URL search params (round 3 — batch C, C1)

The previous sort was in-memory only — refresh and bookmark dropped it.
Sort now derives from $page.url.searchParams via parseSortParams;
toggleSort writes the new state via goto(..., { replaceState, noScroll,
keepFocus }). Unknown params fall back to defaults. Each sort change is
a URL replacement, not a push, so back/forward isn't polluted by
sort-button clicks.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: C2 — Polling refresh with visibilitychange pause

**Files:**
- Modify: `src/routes/status/+page.svelte:51-72` (the existing `$effect` and `loadHealth`).

The current refresh model: `$effect` runs on mount and on `scanTick.value` change, calling `loadHealth()`. We'll add a sibling `$effect` owning a `setInterval` + a `visibilitychange` listener.

- [ ] **Step 1: Import `POLL_INTERVAL_MS` and `browser`**

Add to imports:

```typescript
 import { browser } from "$app/environment";
 import { parseSortParams, buildSortQuery, POLL_INTERVAL_MS, type SortState, type SortKey } from "./page-logic";
```

(`browser` is `true` only in the client bundle; we don't want setInterval running during SSR.)

- [ ] **Step 2: Add the polling `$effect`**

After the existing `$effect` (after line 55), add:

```typescript
 // Live refresh while the tab is visible. Pauses on visibilitychange and
 // resumes when the tab is foregrounded again. Cleans up on unmount.
 $effect(() => {
  if (!browser) return;

  let timerId: ReturnType<typeof setInterval> | undefined;

  function startPolling() {
   if (timerId !== undefined) return;
   timerId = setInterval(() => {
    void loadHealth();
   }, POLL_INTERVAL_MS);
  }

  function stopPolling() {
   if (timerId === undefined) return;
   clearInterval(timerId);
   timerId = undefined;
  }

  function handleVisibilityChange() {
   if (document.hidden) {
    stopPolling();
   } else {
    void loadHealth();
    startPolling();
   }
  }

  if (!document.hidden) startPolling();
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
   stopPolling();
   document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
 });
```

Key behaviour:
- `if (!browser) return;` — no setInterval during SSR.
- Starts polling immediately if the tab is visible at mount.
- `visibilitychange` to hidden → stop. Visible again → immediate `loadHealth()` to catch up + restart interval.
- Cleanup: clears interval AND removes the listener.

The existing `$effect` (which reacts to `scanTick`) still works; both effects can coexist. `loadHealth` is the single mutating function — both effects call it.

- [ ] **Step 3: Ensure `loadHealth` is safe to call concurrently**

Read the existing `loadHealth` (lines 57-67):

```typescript
 async function loadHealth() {
  try {
   health = await fetchHealth();
   error = "";
  } catch (e) {
   error = e instanceof Error ? e.message : "Failed to load";
  } finally {
   loading = false;
   refreshing = false;
  }
 }
```

It's already safe — last-write-wins on `health`. If two calls overlap, the second's response replaces the first's. That's acceptable for a 30s poll. Don't add a guard.

- [ ] **Step 4: Run build gates**

```bash
npm run check
npm run lint
npm test
```

Expected: clean. The polling effect is route-side; covered by manual verification in Step 5.

- [ ] **Step 5: Manual verification**

With backend + dev server, open `/status`. Open DevTools → Network panel and filter to "Fetch/XHR".

- Wait 30s — observe a new `fetch` for `/api/health` (or wherever `fetchHealth` calls). The page updates if the backend's source health changed.
- Switch to a different tab, wait 60s, come back — no fetches fired while hidden; one fetch fires immediately when you return.
- Click Refresh — fetch fires immediately (the manual refresh path is untouched).
- Reload the page; the polling timer resets. Fetch count: 1 (initial mount) + 1 per 30s.

- [ ] **Step 6: Commit**

```bash
git add src/routes/status/+page.svelte
git commit -m "$(cat <<'EOF'
/status now polls source health every 30s (round 3 — batch C, C2)

A new $effect owns a setInterval that refreshes source health every
30s. visibilitychange pauses polling while the tab is hidden and fires
an immediate catch-up fetch + restart when the tab regains focus.
browser-gated to skip SSR. The existing scanTick-driven $effect and
the manual Refresh button still work; both paths funnel through the
same loadHealth function.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Journal entry

**Files:**
- Create: `journal/260MMDD-round-3-batch-c-state.md`

- [ ] **Step 1: Draft the entry**

Cover: C1 (URL roundtrip — what changed, why `replaceState`/`noScroll`/`keepFocus`), C2 (polling — interval choice, visibilitychange behaviour, SSR gate), the page-logic extraction (testability rationale). Out-of-scope: B4/B5 follow-ups, no remaining /status work.

- [ ] **Step 2: Commit**

```bash
git add journal/260MMDD-round-3-batch-c-state.md
git commit -m "$(cat <<'EOF'
Journal entry for round 3, batch C (state)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Final batch verification

- [ ] **Step 1: Build gates**

```bash
npm run check
npm run lint
npm test
```

Expected: clean. New tests from Task 1 still passing.

- [ ] **Step 2: Production build smoke test**

```bash
npm run build
```

Expected: build succeeds. If `$app/navigation` or `$app/stores` usage triggers SSR errors, surface and resolve before committing.

- [ ] **Step 3: Git log**

```bash
git log --oneline main..eng-round-3-batch-c-state
```

Expected: 4 commits (page-logic + tests, C1, C2, journal).

- [ ] **Step 4: Merge to main**

```bash
git checkout main
git merge --no-ff eng-round-3-batch-c-state -m "Merge round-3 batch C (state)"
git branch -d eng-round-3-batch-c-state
```

---

## When this plan is complete

After batches E (shipped), A, D, B (mockup-first), and C land — round 3 is done. Write the closer journal entry `journal/260MMDD-round-3-closer.md` summarising the round-3 ledger and round-4 candidates.
