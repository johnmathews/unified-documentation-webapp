# Round 3 — Batch B (Density / Layout) Implementation Plan

**Status:** superseded — completed and shipped in round 3; see [journal/260516-round-3-closer.md](../../journal/260516-round-3-closer.md) (archived 2026-05-19).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the three deferred density/layout items from round 2. Each item lands as its own commit on a single feature branch.

- **B1** — Tighten `/status` table (10/16 padding + subtle zebra) and align its masthead breakpoint to the layout's 768px.
- **B2** — Replace the home page's orphan status badge with a one-line summary bar ("Healthy · N projects · N docs · last scan Xm ago") and tighten the home table to match B1.
- **B3** — Collapse the doc-viewer metadata to a single-line compact bar at ≥640px, add an explicit 75ch body measure, and include the doc-type field in the metadata.

**Architecture:** Pure CSS/template edits on three route files. No new modules, no new tests. Visual verification via Playwright at batch-end (the same 1440/1024/768/375 × light/dark pattern as batches E and A).

**Tech Stack:** Svelte 5 runes; existing GOV.UK design tokens in `src/app.css`.

**Spec:** `docs/superpowers/specs/2026-05-16-round-3-deferred-sweep-design.md` — Batch B (with mockup-approved decisions locked in below).

---

## Mockup decisions (locked)

- **B1**: 10/16 padding (`padding: 10px 16px 10px 0` on `th`/`td`); subtle alternate-row background; two-line "ago" preserved. Masthead breakpoint 640→768 folds in.
- **B2**: Orphan `<a class="status-badge">` removed. Replaced with one-line summary: `<status badge> · N projects · N documents · last scan Xm ago`. Whole bar links to `/status`. Table padding 10/16.
- **B3**: Single-line metadata bar at `min-width: 640px` (stacks naturally on narrow). Order: bookmark · source · path · type · modified · words. `--measure: 75ch` lands on `.markdown-content`. Doc-type rendered.

---

## File Structure

```
src/routes/status/+page.svelte              ← B1: table padding 10/16 + zebra; masthead breakpoint 641/640→768/767
src/routes/+page.svelte                     ← B2: remove .home-status-row; add summary bar; tighten table
src/routes/doc/[id]/+page.svelte            ← B3: collapse meta rows into one bar; insert type field
src/app.css                                 ← B3: --measure: 75ch token + .markdown-content max-width
journal/260516-round-3-batch-b-density.md   ← new journal entry
```

Use a fresh branch `eng-round-3-batch-b-density` off `main`.

---

## Task 1: B1 — `/status` table density + masthead breakpoint

**Files:**
- Modify: `src/routes/status/+page.svelte`

### Step 1: Tighten `th` and `td` padding

Find the `.source-table th` rule at line 482 and the `.source-table td` rule at line 517.

Replace:

```css
 .source-table th {
  text-align: left;
  font-weight: 700;
  padding: 12px 25px 12px 0;
  border-bottom: 2px solid var(--border-strong);
 }
```

With:

```css
 .source-table th {
  text-align: left;
  font-weight: 700;
  padding: 10px 16px 10px 0;
  border-bottom: 2px solid var(--border-strong);
 }
```

Replace:

```css
 .source-table td {
  padding: 12px 25px 12px 0;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
 }
```

With:

```css
 .source-table td {
  padding: 10px 16px 10px 0;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
 }
```

The `.source-table th:first-child, .source-table td:first-child { padding-left: 8px }` rule at lines 489-492 stays unchanged.

### Step 2: Add subtle zebra striping

Below the existing `.source-table td` rule, add:

```css
 .source-table tbody tr:nth-child(odd) td {
  background: var(--bg-zebra);
 }
```

The `--bg-zebra` token may not exist yet. Check `src/app.css` for it — if absent, add it to the canonical token block (likely near the top of `:root` and `[data-theme="dark"]`):

- Light: `--bg-zebra: #f8f8f8;`
- Dark: `--bg-zebra: rgba(255, 255, 255, 0.03);`

If the token block in `app.css` doesn't have an obvious "background variants" section, place `--bg-zebra` next to `--bg-hover` (which already exists per usage in the codebase). Surface the exact lines you added in your report.

### Step 3: Align masthead breakpoint to 768px

In the same file, find the four media queries at lines 341, 355, 362, plus another `(min-width: 641px)` somewhere around the `.masthead__title` block (line 341). Change:

- `@media (min-width: 641px)` → `@media (min-width: 768px)` (three occurrences in the masthead section)
- `@media (max-width: 640px)` → `@media (max-width: 767px)` (one occurrence)

This mirrors what batch E did for the home page. The bodies of each media-query block stay identical.

### Step 4: Build gates

```bash
npm run check
npm run lint
npm test
```

Expected: clean, 282 tests pass.

### Step 5: Commit

```bash
git add src/routes/status/+page.svelte src/app.css
git commit -m "$(cat <<'EOF'
/status: tighter table density + zebra stripes + masthead breakpoint (round 3 — batch B, B1)

- Table row padding 12/25 → 10/16; rows scan faster with no header
  squeeze.
- Subtle zebra background (--bg-zebra token) for odd rows. Per
  GOV.UK data-table guidance.
- Masthead breakpoint 641/640 → 768/767, matching the layout's
  .content padding breakpoint (same fix that batch E did on home).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: B2 — Home page summary bar + table density

**Files:**
- Modify: `src/routes/+page.svelte`

### Step 1: Compute totals + last-scan for the summary

The page already has `tree: SourceTree[]` and `health: HealthStatus | null` in scope (lines 6-7). The HealthStatus type carries `total_chunks` but not a directly summed doc count or last-scan timestamp.

Add a `$derived` for the totals just below the existing `healthBySource` derived (around line 17-22):

```typescript
 let homeSummary = $derived.by(() => {
  if (!health) return null;
  const totalFiles = health.sources.reduce((n, s) => n + s.file_count, 0);
  const lastScan = health.sources
   .map((s) => s.last_indexed)
   .filter((t): t is string => Boolean(t))
   .sort()
   .at(-1) ?? null;
  return {
   status: health.status,
   projectCount: tree.length,
   totalFiles,
   lastScan,
  };
 });
```

The `lastScan` is the most-recent `last_indexed` across all sources — i.e. when the freshest data was indexed. Sorted lexically because ISO 8601 sorts correctly that way.

### Step 2: Replace the orphan status row with the summary bar

In the template, find the `.home-status-row` block at lines 162-178. Replace:

```svelte
  {#if health}
   <div class="home-status-row">
    <a
     class="status-badge"
     class:ok={health.status === "healthy"}
     class:warn={health.status === "degraded"}
     class:err={health.status === "error"}
     href="/status"
     title={health.status === "healthy"
      ? "Healthy: All sources are scanning successfully."
      : health.status === "degraded"
       ? "Degraded: One or more sources have scan failures or are stale."
       : "Error: All sources are failing or unreachable."}>
     {health.status === "healthy" ? "Healthy" : health.status === "degraded" ? "Degraded" : "Error"}
    </a>
   </div>
  {/if}
```

With:

```svelte
  {#if homeSummary}
   <a class="home-summary" href="/status"
    title={homeSummary.status === "healthy"
     ? "Healthy: All sources are scanning successfully."
     : homeSummary.status === "degraded"
      ? "Degraded: One or more sources have scan failures or are stale."
      : "Error: All sources are failing or unreachable."}>
    <span class="status-badge"
     class:ok={homeSummary.status === "healthy"}
     class:warn={homeSummary.status === "degraded"}
     class:err={homeSummary.status === "error"}>
     {homeSummary.status === "healthy" ? "Healthy" : homeSummary.status === "degraded" ? "Degraded" : "Error"}
    </span>
    <span class="summary-sep" aria-hidden="true">·</span>
    <span class="summary-fact"><strong>{homeSummary.projectCount}</strong> projects</span>
    <span class="summary-sep" aria-hidden="true">·</span>
    <span class="summary-fact"><strong>{homeSummary.totalFiles.toLocaleString()}</strong> documents</span>
    {#if homeSummary.lastScan}
     <span class="summary-sep" aria-hidden="true">·</span>
     <span class="summary-fact summary-fact--muted">last scan {timeAgo(homeSummary.lastScan)}</span>
    {/if}
   </a>
  {/if}
```

Notes:
- `.status-badge` is now a `<span>`, not a top-level `<a>` — the parent `.home-summary` is the link target.
- The `title=` moved to the `<a>` so the whole bar shows the explanatory tooltip on hover.
- `aria-hidden="true"` on the separators prevents screen readers from reading "middle dot" between every item.
- `timeAgo` already exists in the file (it's used for the "Last updated" column).

### Step 3: Add the summary-bar CSS + tighten table padding

In the `<style>` block, find the existing `.home-status-row` rule at line 409 and the surrounding `.status-badge` rules at lines 417-448.

Replace the `.home-status-row` rule with:

```css
 .home-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 10px;
  margin-bottom: 20px;
  padding: 8px 0;
  font-size: 16px;
  line-height: 22px;
  color: var(--text);
  text-decoration: none;
  border-bottom: 1px solid var(--border);
 }

 .home-summary:hover {
  background: var(--bg-hover);
 }

 .summary-sep {
  color: var(--text-muted);
 }

 .summary-fact {
  white-space: nowrap;
 }

 .summary-fact--muted {
  color: var(--text-secondary);
  font-size: 14px;
 }
```

Keep all the existing `.status-badge`, `.status-badge.ok/warn/err`, and dark-theme overrides — they still apply to the inner span. The `.status-badge:hover { opacity: 0.9 }` rule at line 446 is no longer reachable (the badge isn't the link anymore); delete it or leave it as dead code, but mention which in your report.

Tighten the table padding to match B1. Find the `.source-table th` rule at line 329:

```css
 .source-table th {
  text-align: left;
  font-weight: 700;
  font-size: 1rem;
  padding: 10px 28px 10px 0;
  color: var(--text);
 }
```

Replace with:

```css
 .source-table th {
  text-align: left;
  font-weight: 700;
  font-size: 1rem;
  padding: 10px 16px 10px 0;
  color: var(--text);
 }
```

Find the `.source-table td` rule at line 379:

```css
 .source-table td {
  padding: 15px 28px 15px 0;
  vertical-align: top;
 }
```

Replace with:

```css
 .source-table td {
  padding: 10px 16px 10px 0;
  vertical-align: top;
 }
```

Add the same zebra rule (uses the `--bg-zebra` token added in B1):

```css
 .source-table tbody tr:nth-child(odd) td {
  background: var(--bg-zebra);
 }
```

### Step 4: Tablet column-width tweak (folded in)

The spec mentioned re-checking the Documents column on tablet. The existing `@media (max-width: 768px)` block at the bottom of the file (around lines 489-510) hides `.col-date` and `.time-ago` on mobile only. Verify when viewing at 800px-1023px the column widths are sensible. If a column is squished, add a `@media (max-width: 1023px) { .col-status, .col-date { white-space: normal } }` to allow wrapping. If everything fits cleanly, no change needed — surface what you did in your report.

### Step 5: Build gates

```bash
npm run check
npm run lint
npm test
```

Expected: clean, 282 tests pass.

### Step 6: Commit

```bash
git add src/routes/+page.svelte
git commit -m "$(cat <<'EOF'
Home: status badge becomes a useful summary bar (round 3 — batch B, B2)

The single-word "Healthy" badge floating ~50px above the table is now a
one-line bar: <badge> · N projects · N documents · last scan Xm ago.
Whole bar links to /status; title= tooltip remains on the link. Saves
vertical space and gives the badge actual context.

Table padding tightened 28→16 (consistent with B1's /status pass) and a
subtle zebra row uses the shared --bg-zebra token.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: B3 — Doc viewer single-line metadata + 75ch measure + type

**Files:**
- Modify: `src/routes/doc/[id]/+page.svelte`
- Modify: `src/app.css` (add `--measure` token)

### Step 1: Add `--measure: 75ch` to `app.css`

Find the `:root` block in `src/app.css`. Add (next to other typographic tokens):

```css
 --measure: 75ch;
```

Mirror it in the `[data-theme="dark"]` block if that block also overrides typographic tokens; if it only overrides colour tokens (typical), leave dark alone.

### Step 2: Collapse the doc-meta rows into a single bar

In `src/routes/doc/[id]/+page.svelte`, find the `<header class="doc-header">` block at lines 117-137. Currently two rows: `.doc-meta-row` (bookmark + source + file-path) and `.doc-dates-row` (created + modified + words + lines).

Replace:

```svelte
   <header class="doc-header">
    <div class="doc-meta-row">
     <BookmarkButton docId={doc.doc_id} bind:bookmarked={isBookmarked} />
     <a href="/source/{encodeURIComponent(doc.source)}" class="source-badge">{displaySource(doc.source)}</a>
     <span class="file-path">{doc.file_path}</span>
    </div>
    {#if doc.created_at || doc.modified_at || stats}
     <div class="doc-dates-row">
      {#if doc.created_at}
       <span>Created: {formatDate(doc.created_at)}</span>
      {/if}
      {#if doc.modified_at}
       <span>Modified: {formatDate(doc.modified_at)}</span>
      {/if}
      {#if stats}
       <span>Words: {stats.words.toLocaleString()}</span>
       <span>Lines: {stats.lines.toLocaleString()}</span>
      {/if}
     </div>
    {/if}
   </header>
```

With:

```svelte
   <header class="doc-header">
    <div class="doc-meta">
     <BookmarkButton docId={doc.doc_id} bind:bookmarked={isBookmarked} />
     <a href="/source/{encodeURIComponent(doc.source)}" class="source-badge">{displaySource(doc.source)}</a>
     <span class="meta-sep" aria-hidden="true">/</span>
     <span class="file-path">{doc.file_path}</span>
     {#if doc.type}
      <span class="meta-sep" aria-hidden="true">·</span>
      <span class="doc-type">{doc.type}</span>
     {/if}
     {#if doc.modified_at}
      <span class="meta-sep" aria-hidden="true">·</span>
      <span>Modified {formatDate(doc.modified_at)}</span>
     {/if}
     {#if stats}
      <span class="meta-sep" aria-hidden="true">·</span>
      <span>{stats.words.toLocaleString()} words</span>
     {/if}
    </div>
   </header>
```

Decisions baked in:
- `created_at` dropped from the visible bar — kept it for now would balloon the line. If the user wants it back, easy to restore.
- `Lines: N` dropped — words is the more useful prose metric; lines is dev-tool noise.
- `doc.type` rendered as a small text node (no badge styling) because (a) the existing source-badge already anchors the bar visually and (b) `documentation` is the dominant value, so a coloured badge for it would be over-emphasised.

### Step 3: Replace `.doc-meta-row` + `.doc-dates-row` CSS

In the `<style>` block, find the two rules at lines 254-271. Replace both with:

```css
 .doc-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 10px;
  font-size: 15px;
  color: var(--text-secondary);
 }

 .meta-sep {
  color: var(--border-strong);
 }

 .doc-type {
  font-weight: 700;
  color: var(--text);
  text-transform: capitalize;
 }
```

The `.source-badge` and `.file-path` rules at lines 241-252 stay unchanged.

### Step 4: Apply `--measure` to the body

Find the `.markdown-content` selector — search for `\.markdown-content` in the file. If it doesn't have a `max-width` rule yet, add one in the `<style>` block near the existing layout rules:

```css
 .markdown-content {
  max-width: var(--measure);
 }
```

This is defence-in-depth: the `.doc-layout` already caps at 720px (close to 72ch at 16px font), but if the grid ever grows, the body prose still wraps cleanly.

### Step 5: Mobile fallback

Find the `@media (max-width: 640px)` block at line 315. The existing rules reference `.source-badge`, `.file-path`, and `.doc-dates-row`. Update — `.doc-dates-row` no longer exists. Either:

- Drop the mobile rule for `.doc-dates-row` (it's dead code now).
- Or leave the `.source-badge` / `.file-path` mobile rules and remove only the `.doc-dates-row` lines.

The bar's `flex-wrap: wrap` already handles narrow viewports: items stack naturally. No new mobile-specific rule needed.

### Step 6: Build gates

```bash
npm run check
npm run lint
npm test
```

Expected: clean. `npm run check` may flag the deleted CSS class names as unused (Svelte's compiler does this). If `.doc-meta-row` or `.doc-dates-row` references survive somewhere in the file, search and remove.

### Step 7: Commit

```bash
git add src/routes/doc/[id]/+page.svelte src/app.css
git commit -m "$(cat <<'EOF'
Doc viewer: one-line metadata bar + 75ch measure + type field (round 3 — batch B, B3)

The header collapses two stacked rows (meta + dates) into a single
flex bar at >= 640px: bookmark / source / path · type · modified ·
words. Wraps naturally on narrow screens (no media-query branch).
Doc-type is now visible inline; previously the backend classified
docs but the viewer never showed the value.

New --measure: 75ch token on .markdown-content as a defensive cap; the
layout grid is already 720px (~72ch) but the explicit measure protects
the body prose if the grid ever grows.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Batch B journal entry

**Files:**
- Create: `journal/260516-round-3-batch-b-density.md`

Write summarising B1 + B2 + B3, the locked mockup decisions, and any tablet/mobile findings discovered during implementation. Cover the four-batch-cleanup nature: the masthead breakpoint fix, the orphan-badge replacement, the doc-type surfacing. Out-of-scope: B4 (tablet TOC drawer) and B5 (status-badge disclosure) remain deferred to a future round.

Use this content verbatim:

```markdown
# 2026-05-16 — Round 3, batch B (density / layout)

Round 3 batch B closes the three density/layout items deferred from
round 2. Three commits — one per route — plus this entry.

## What shipped

### B1 — `/status` table density + masthead breakpoint

`src/routes/status/+page.svelte`. Table padding 12/25 → 10/16 on
both `th` and `td`. Subtle zebra striping (`var(--bg-zebra)` on
odd-row `td`s) anchors row rhythm. The masthead's media-query
breakpoints shift 641/640 → 768/767, mirroring what batch E did on
the home page.

`src/app.css` gains a `--bg-zebra` token (light `#f8f8f8`, dark
`rgba(255,255,255,0.03)`) — also used by home's table in B2.

### B2 — Home: orphan badge becomes a summary bar

`src/routes/+page.svelte`. The single-word "Healthy" badge floating
~50px above the table is replaced with a one-line summary bar:
`<status badge> · N projects · N documents · last scan Xm ago`. The
whole bar links to `/status`. New `homeSummary` `$derived` computes
the total file count and the most-recent `last_indexed` across all
sources. Table padding tightens to 10/16 to match B1.

### B3 — Doc viewer: single-line metadata + 75ch + type

`src/routes/doc/[id]/+page.svelte`. Header collapses two stacked
rows (meta + dates) into a single flex bar: `🔖 source / path ·
type · modified · words`. Wraps naturally on narrow screens. The
`doc.type` field — classified by the backend but never visible on
the viewer until now — appears between path and modified date.
`created_at` and the line count are dropped from the visible bar
in service of compactness.

`src/app.css` gains `--measure: 75ch` token; `.markdown-content`
gets `max-width: var(--measure)` as a defensive cap so the body
prose can never exceed comfortable reading length even if the
layout grid grows.

## Verification

- `npm test`: 282 passed across 17 test files. No regression.
- `npm run check`: clean.
- `npm run lint`: clean.
- Visual: Playwright before/after at 1440 / 1024 / 768 / 375 px in
  light + dark, captured by the controller at batch-end.

## Out of scope (still deferred to round 4)

- **B4** — tablet TOC drawer for 768–1023 px on the doc viewer.
- **B5** — `/status` expanded ↔ collapsed disclosure for "last
  error" detail.

After batch B merges, round 3 is closed. The closer journal entry
(`journal/260MMDD-round-3-closer.md`) summarises the 14 items
shipped across the five batches and lists round-4 candidates.

See `docs/superpowers/specs/2026-05-16-round-3-deferred-sweep-design.md`
for the full round-3 plan.
```

Commit:

```bash
git add journal/260516-round-3-batch-b-density.md
git commit -m "$(cat <<'EOF'
Journal entry for round 3, batch B (density / layout)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Final batch verification + merge

- [ ] **Step 1: Build gates**

```bash
npm run check
npm run lint
npm test
```

Expected: clean, 282 tests pass.

- [ ] **Step 2: SSR smoke**

```bash
npm run build
```

Expected: build completes.

- [ ] **Step 3: Playwright visual + computed-style check**

Dispatched by the controller. Verifies:
- `/status` table padding is 10/16; zebra background present on odd rows.
- `/status` masthead margin-left at 700px = -15px (post-fix).
- `/` summary bar exists (`.home-summary`); orphan `.home-status-row` is gone.
- `/doc/{some-id}` metadata bar is one line at ≥640px; doc-type span present.
- `.markdown-content` computed `max-width` resolves to the pixel equivalent of `75ch`.

- [ ] **Step 4: Merge**

```bash
git checkout main
git merge --no-ff eng-round-3-batch-b-density -m "Merge round-3 batch B (density / layout)"
git branch -d eng-round-3-batch-b-density
```

---

## When this plan is complete

Round 3 is closed. Write `journal/260MMDD-round-3-closer.md` summarising the 14 items shipped across E, A, D, C, B and listing round-4 candidates (B4 tablet TOC, B5 status disclosure, backend `<mark>` search highlighting, ChatPanel streaming).
