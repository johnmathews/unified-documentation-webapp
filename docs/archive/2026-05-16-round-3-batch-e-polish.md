# Round 3 — Batch E (Polish) Implementation Plan

**Status:** superseded — completed and shipped in round 3; see [journal/260516-round-3-closer.md](../../journal/260516-round-3-closer.md) (archived 2026-05-19).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the two near-trivial polish items deferred from round 2 — add `md` to the `displaySource` acronyms set, and align the home masthead's negative-margin breakpoint to the layout's content-padding breakpoint.

**Architecture:** Two independent edits in one PR. E1 is a one-character change to a `Set` plus a unit test; E2 is a CSS media-query breakpoint change verified by browser screenshots. No new files, no new dependencies.

**Tech Stack:** SvelteKit (Svelte 5 runes), Vitest, Playwright (manual run for visual diff), GOV.UK Design System conventions.

**Spec:** `docs/superpowers/specs/2026-05-16-round-3-deferred-sweep-design.md` — Batch E.

---

## File Structure

```
src/lib/titles.ts                  ← E1: add "md" to ACRONYMS set
src/lib/titles.test.ts             ← E1: new test asserting "claude-md-global" → "Claude MD Global"
src/routes/+page.svelte            ← E2: change masthead breakpoint from 640px to 768px
journal/260516-round-3-batch-e-polish.md  ← new journal entry (closer for batch E)
```

`src/routes/+layout.svelte` is **read-only** in this batch — we are aligning the masthead breakpoint to match the layout's existing `max-width: 768px` content-padding breakpoint, not changing the layout.

---

## Task 1: E1 — Add `md` to `displaySource` ACRONYMS (TDD)

**Files:**
- Modify: `src/lib/titles.ts:6-24` (the `ACRONYMS` Set)
- Modify: `src/lib/titles.test.ts:14-18` (the `uppercases known acronyms` block)

The test goes in the existing `uppercases known acronyms` block so the assertion sits next to the existing acronym cases.

- [ ] **Step 1: Write the failing test**

Open `src/lib/titles.test.ts` and locate the existing acronyms block (around line 14):

```typescript
it("uppercases known acronyms", () => {
 expect(displaySource("documentation-ui")).toBe("Documentation UI");
 expect(displaySource("dns-proxy")).toBe("DNS Proxy");
 expect(displaySource("api-gateway")).toBe("API Gateway");
});
```

Add two assertions for `md` (start of word + middle of word) so the case-insensitive lookup is exercised in both positions:

```typescript
it("uppercases known acronyms", () => {
 expect(displaySource("documentation-ui")).toBe("Documentation UI");
 expect(displaySource("dns-proxy")).toBe("DNS Proxy");
 expect(displaySource("api-gateway")).toBe("API Gateway");
 expect(displaySource("claude-md-global")).toBe("Claude MD Global");
 expect(displaySource("md-formatter")).toBe("MD Formatter");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- src/lib/titles.test.ts
```

Expected: the `uppercases known acronyms` test fails with output similar to:

```
AssertionError: expected 'Claude Md Global' to be 'Claude MD Global'
```

If the test passes without the source change, stop and investigate — `md` may already be elsewhere in the codebase.

- [ ] **Step 3: Add `md` to the ACRONYMS set**

In `src/lib/titles.ts`, modify the `ACRONYMS` Set to include `"md"` in alphabetical order:

```typescript
const ACRONYMS = new Set([
  "api",
  "cd",
  "ci",
  "cv",
  "dag",
  "dns",
  "http",
  "ip",
  "mcp",
  "md",
  "ssh",
  "ssl",
  "tcp",
  "tls",
  "udp",
  "ui",
  "url",
  "vm",
]);
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npm test -- src/lib/titles.test.ts
```

Expected: all tests in `titles.test.ts` pass (including the two new assertions).

- [ ] **Step 5: Run the full test suite to catch any incidental regression**

Run:

```bash
npm test
```

Expected: 254 passed (the round-2 baseline) + 1 new test passing = 255 tests across 15 files. No failures.

If any test outside `titles.test.ts` now fails, investigate before continuing. The likely cause would be a fixture that expected the previous `"Md"` casing — those fixtures are the ones whose UI was wrong and should be updated.

- [ ] **Step 6: Commit**

```bash
git add src/lib/titles.ts src/lib/titles.test.ts
git commit -m "$(cat <<'EOF'
Add md to displaySource ACRONYMS (round 3 — batch E, E1)

claude-md-global now renders as "Claude MD Global" instead of
"Claude Md Global". Round-2 flagged this from the home-page UI work
(260514-home-page-ui-round2.md); deferred because it touches every
route that displays a source.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: E2 — Align masthead breakpoint to layout's 768px

**Files:**
- Modify: `src/routes/+page.svelte:491` (the `@media (max-width: 640px)` block) and `src/routes/+page.svelte:257-262` and `src/routes/+page.svelte:277-283` and `src/routes/+page.svelte:292-297` (the three `@media (min-width: 641px)` blocks)
- Read-only context: `src/routes/+layout.svelte:939-961` (the `@media (max-width: 768px)` block that defines `.content` padding as `20px 15px` at and below 768px)

**Bug summary:** the masthead at the default rule (`+page.svelte:247-255`) bleeds `-30px` on each side via negative margin to overshoot the `.content` `30px` padding. The layout switches `.content` padding to `15px` at `max-width: 768px`, but the masthead waits until `max-width: 640px` to switch to `-15px`. Between 641–767px, the masthead bleeds `-30px` against a `15px`-padded parent — overshooting by 15px each side, silently clipped by `overflow-x: hidden`.

**Fix:** change all four masthead media-query breakpoints from `640px / 641px` to `767px / 768px` so they switch in lock-step with the layout's `.content` breakpoint.

- [ ] **Step 1: Reproduce the bug locally**

Before touching any code, confirm the bug is visible.

In one terminal, start the backend (per CLAUDE.md — the webapp has no mock layer):

```bash
cd ../server
uv run python -m docserver
```

In another terminal, start the webapp dev server:

```bash
npm run dev
```

Open `http://localhost:5173/` in a browser. Open DevTools → device toolbar → set viewport to 700px wide. Inspect the masthead `<div>` and confirm `margin-left: -30px; margin-right: -30px;` — that's the bug at 700px.

Set viewport to 800px — confirm the same `-30px` margin (this is correct at 800px because `.content` padding is still `40px 30px`).

Set viewport to 500px — confirm `margin-left: -15px; margin-right: -15px;` (this is correct at 500px because `.content` padding is `20px 15px`).

- [ ] **Step 2: Edit the masthead breakpoints**

Open `src/routes/+page.svelte`. There are four media-query blocks scoped to the masthead. Change each one:

At line **257** (masthead padding upscale):

```css
@media (min-width: 641px) {
 .masthead {
  padding-top: 60px;
  padding-bottom: 60px;
 }
}
```

Change to:

```css
@media (min-width: 768px) {
 .masthead {
  padding-top: 60px;
  padding-bottom: 60px;
 }
}
```

At line **277** (masthead title font-size upscale):

```css
@media (min-width: 641px) {
 .masthead__title {
  font-size: 3rem;
  line-height: 1.0416666667;
  margin-bottom: 30px;
 }
}
```

Change to:

```css
@media (min-width: 768px) {
 .masthead__title {
  font-size: 3rem;
  line-height: 1.0416666667;
  margin-bottom: 30px;
 }
}
```

At line **292** (masthead description font-size upscale):

```css
@media (min-width: 641px) {
 .masthead__description {
  font-size: 1.5rem;
  line-height: 1.25;
 }
}
```

Change to:

```css
@media (min-width: 768px) {
 .masthead__description {
  font-size: 1.5rem;
  line-height: 1.25;
 }
}
```

At line **491** (mobile masthead negative margin + padding):

```css
@media (max-width: 640px) {
 .masthead {
  margin: -20px -15px 0;
  padding: 20px 15px;
 }

 .source-table th,
 .source-table td {
  padding-right: 10px;
 }

 .col-date {
  display: none;
 }

 .time-ago {
  display: none;
 }
}
```

Change the outer breakpoint to `767px`:

```css
@media (max-width: 767px) {
 .masthead {
  margin: -20px -15px 0;
  padding: 20px 15px;
 }

 .source-table th,
 .source-table td {
  padding-right: 10px;
 }

 .col-date {
  display: none;
 }

 .time-ago {
  display: none;
 }
}
```

**Decision recorded inline:** the existing block at line 491 mixed two concerns — masthead negative-margin (which is what this batch is fixing) and source-table column shrinking + `.col-date` / `.time-ago` hiding. Both concerns share the same logical "we are below the layout's content breakpoint" trigger. Shifting all of them to 767px keeps them aligned with the layout's 768px breakpoint. If the table-shrink concerns turn out to want a different breakpoint, that is its own change in batch B2; not in scope here.

- [ ] **Step 3: Verify visually at 700px and 800px**

With `npm run dev` still running, reload the browser and re-test:

1. Viewport 700px: masthead margins should now be `-15px` each side (correct against `.content`'s `15px` padding).
2. Viewport 800px: masthead margins should be `-30px` each side (correct against `.content`'s `30px` padding).
3. Viewport 500px: masthead margins should be `-15px` (unchanged).
4. Viewport 1440px: masthead margins should be `-30px` (unchanged).

Toggle the theme (the theme button in the header) at 700px and 800px — masthead colour and bleed unchanged.

Capture a screenshot at 700px light + dark and at 800px light + dark for the journal entry.

- [ ] **Step 4: Run the build gates**

Run:

```bash
npm run check
npm run lint
npm test
```

Expected: all clean. `npm test` shows 255 passed (after E1) — no change from E2 since there are no E2 unit tests (CSS-only change).

- [ ] **Step 5: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "$(cat <<'EOF'
Align home masthead breakpoint to layout's 768px (round 3 — batch E, E2)

The masthead's negative-margin bleed switched at 640px while the
layout's .content padding switched at 768px. Between 641-767px the
masthead overshot the content padding by 15px each side, silently
clipped by overflow-x: hidden. Aligning to 768px closes the gap.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Write the batch-E journal entry

**Files:**
- Create: `journal/260516-round-3-batch-e-polish.md`

- [ ] **Step 1: Draft the entry**

Create `journal/260516-round-3-batch-e-polish.md` with the following content (substitute the actual screenshots / commit SHAs at write time):

```markdown
# 2026-05-16 — Round 3, batch E (polish)

Round 3 opens with the two smallest deferred items from round 2: a one-character
addition to the `displaySource` ACRONYMS set, and a CSS media-query breakpoint
alignment on the home masthead. One PR, two commits.

## What changed

### E1 — `displaySource` ACRONYMS now includes `md`

`src/lib/titles.ts` — added `"md"` to the ACRONYMS Set. `claude-md-global` now
renders as "Claude MD Global" everywhere `displaySource` is used: home table,
breadcrumbs, doc viewer source label, /status table, /bookmarks group headers,
SearchPanel, ChatPanel history.

Two assertions added to `src/lib/titles.test.ts`:
- `displaySource("claude-md-global")` → "Claude MD Global"
- `displaySource("md-formatter")` → "MD Formatter"

Both start-of-word and middle-of-word positions are exercised.

### E2 — Home masthead breakpoint aligned to layout's 768px

`src/routes/+page.svelte` — the masthead had three `@media (min-width: 641px)`
blocks and one `@media (max-width: 640px)` block. The layout's `.content`
padding switches at `max-width: 768px`. Between 641–767px the masthead's
negative-margin bleed overshot the content padding by 15px each side, silently
clipped by `overflow-x: hidden`.

Shifted all four masthead breakpoints to 767px / 768px so they switch in
lock-step with the layout's content breakpoint. Side-effect: the existing
mobile rules at the same breakpoint (source-table padding shrink, .col-date
hide, .time-ago hide) moved with them. That co-location was already there;
this batch preserved it.

## Verification

- `npm test`: 255 passed (was 254) across 15 files.
- `npm run check`: clean.
- `npm run lint`: clean.
- Visual at 500 / 700 / 800 / 1440 px, light + dark — masthead bleeds correctly
  at every viewport.

## Out of scope (round 3 follow-ups for later batches)

This was the polish batch. Subsequent round-3 batches:

- **A** (a11y, next): focus-visible audit, ChatPanel `.history-title`
  nested-interactive fix, /status aria-describedby, ChatPanel aria-live,
  FloatingDocControls 30 → 44px.
- **D** (XSS hardening): DOMPurify across both `{@html}` surfaces.
- **B** (density/layout): /status, home, doc viewer.
- **C** (state): /status URL sort params + visibility-paused polling.

See `docs/superpowers/specs/2026-05-16-round-3-deferred-sweep-design.md`
for the full round-3 plan.
```

- [ ] **Step 2: Commit the journal entry**

```bash
git add journal/260516-round-3-batch-e-polish.md
git commit -m "$(cat <<'EOF'
Journal entry for round 3, batch E

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Final batch verification

- [ ] **Step 1: Run all build gates one more time**

```bash
npm run check
npm run lint
npm test
```

Expected: all clean, 255 tests passing.

- [ ] **Step 2: Spot-check `displaySource` usage in the running app**

With `npm run dev` and the backend running, browse to a page that displays the `claude-md-global` source (if it is indexed in your local instance) and confirm the rendered label reads "Claude MD Global". If `claude-md-global` is not in your local index, the unit test is the authoritative proof — note that in the journal entry rather than fabricating a screenshot.

Also browse to `/` and confirm:
- The masthead bleeds edge-to-edge with no visible clipping at 700px.
- The masthead at 1440px is unchanged from before.

- [ ] **Step 3: Confirm git log**

```bash
git log --oneline -5
```

Expected: three new commits on top of `d840a8a` (the round-3 spec commit) — one for E1 (source + test combined), one for E2, one for the journal entry.

- [ ] **Step 4: Push the batch (optional, when ready)**

If working on a branch, push and open the PR. If working directly on `main` per the round-2 cadence, the work is shipped.

```bash
# branch workflow:
git push -u origin <branch-name>
# then open PR via gh:
gh pr create --title "Round 3, batch E — polish (ACRONYMS + masthead breakpoint)" --body "$(cat <<'EOF'
## Summary

Round 3 opens with batch E (polish) — two near-trivial deferred items from round 2.

- **E1**: `displaySource()` ACRONYMS now includes `md`, so `claude-md-global` renders as "Claude MD Global".
- **E2**: Home masthead breakpoint aligned to layout's 768px (was 640px), closing a silent 15px-each-side overshoot between 641–767px.

See `docs/superpowers/specs/2026-05-16-round-3-deferred-sweep-design.md` and `journal/260516-round-3-batch-e-polish.md` for context.

## Test plan

- [x] `npm test` — 255 passed
- [x] `npm run check` — clean
- [x] `npm run lint` — clean
- [x] Visual at 500 / 700 / 800 / 1440 px, light + dark, on `/`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

If working on `main` directly, skip this step.

---

## When this plan is complete

Batch E is done. Next: write the plan for **Batch A — Accessibility** in `docs/superpowers/plans/2026-05-16-round-3-batch-a-a11y.md` (using the writing-plans skill again, with the audit's output informed by what we just shipped).
