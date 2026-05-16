# Round 3 — Batch B (Density / Layout) Pre-Plan

> **For agentic workers:** This is a pre-plan. The final implementation plan can only be written after visual mockup approval. See "Why this isn't a full plan yet" below.

**Goal:** Tighten information density and refine layout on `/status`, home `/`, and `/doc/[id]` per the round-3 spec. Three items (B1, B2, B3) — each touches one route and lands as its own commit.

**Spec:** `docs/superpowers/specs/2026-05-16-round-3-deferred-sweep-design.md` — Batch B.

---

## Why this isn't a full plan yet

The spec explicitly says:

> "Mockups in the visual companion required before any CSS lands; approval per-route before the PR opens."

Concrete CSS — padding values, font weights, zebra-stripe alphas, table column widths, metadata-row layout — is a design decision, not a derived consequence of the spec. Writing those values into a plan now would be guesswork, and reviewing them in PR would force redo work. The right sequence is:

1. **Discovery** of the current state per route (done as part of writing this pre-plan; references below).
2. **Mockup pass** in the visual companion at `http://localhost:52697` — three rounds, one per item (B1, B2, B3). Each round shows the current layout and 2–3 candidate before/after pairs.
3. **User approves a direction** per route.
4. **Final Plan B** gets written into the same plan file (replacing this pre-plan content), with the approved values baked in.
5. **Execute** as a normal subagent-driven implementation.

This pre-plan exists so:
- The user knows what work the mockup pass needs to cover.
- The next session has a clean handoff.
- Discovery findings aren't lost between writing and execution.

---

## Discovery — what already exists

### B1 — `/status` info density

- File: `src/routes/status/+page.svelte`.
- Current table styles (from Task discovery): row padding, column gaps, last-seen formatting are sparse. Status badges are colour-coded with a `title=` tooltip carrying the meaning (round-2 closer flagged this; batch A3 adds `aria-describedby`).
- Same masthead negative-margin breakpoint bug as the home page (lines 251, 271, 285, 292 — `@media (min-width: 641px)` / `(max-width: 640px)`). Batch E fixed it on the home page only. **Decision to revisit during the mockup pass:** fold the `/status` masthead breakpoint fix into B1, or split it out as its own atomic E3 commit.

### B2 — Home `/` info density + orphaned status badge

- File: `src/routes/+page.svelte`.
- Orphaned "Status" badge sits above the source table at desktop — single word, ~50px vertical. Sort buttons + source-table column widths are existing decisions worth re-examining.
- Note: batch E aligned the masthead breakpoint; B2 doesn't have to touch the masthead.

### B3 — Doc viewer metadata + 75-char line length

- File: `src/routes/doc/[id]/+page.svelte`; possibly `src/app.css` if a shared `--measure` token is introduced.
- Body width currently bounded by the layout's main column (≈680px); not enforced at 75ch. Metadata block above the body is vertically tall (multiple stacked rows for source/path/type/date/word count).
- Spec direction: `max-width: 75ch` on `.doc-body` (or `var(--measure)`) AND collapse the metadata block to a one-line dl-style row at ≥640px viewports.

---

## How to run the mockup pass

When ready to convert this pre-plan into a real plan:

1. Confirm the visual companion server is alive at the URL noted in `.superpowers/brainstorm/*/state/server-info`. If not, start it:
   ```bash
   /Users/john/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/skills/brainstorming/scripts/start-server.sh --project-dir /Users/john/projects/documentation/webapp
   ```
2. For each of B1, B2, B3:
   - Write a screen file showing the **current** layout (a faithful HTML mock or annotated screenshot).
   - Write a screen file showing **2–3 candidate after** layouts side-by-side. Cover: tightened padding values, table-row visual hierarchy, last-seen formatting, zebra-striping (B1); inline-vs-removed status badge, column widths (B2); 75ch measure + one-line metadata (B3).
   - User selects a direction. Iterate if needed.
   - Lock the chosen values into the final plan.
3. Replace this pre-plan with the implementation plan once all three directions are locked.

---

## What to record in the final plan

Per item, the final plan needs:

- Exact CSS file + line ranges to modify.
- Exact `before` and `after` CSS blocks.
- Exact viewport-by-viewport screenshot expectations (the existing batch-E pattern: 1440 / 1024 / 768 / 375, light + dark).
- Per-item Playwright before/after capture script if you want automated diff.
- Per-item commit message body.

Use the structure from `docs/superpowers/plans/2026-05-16-round-3-batch-a-a11y.md` as a template.

---

## Pre-execution checklist

Before converting this pre-plan into a real plan:

- [ ] Batches E, A, D, C have either landed or have plans ready. (Batch C touches the same file as B1; locking B1 first means C's edits land on the *new* shape, not a doomed intermediate.)
- [ ] Visual companion is running and reachable.
- [ ] User is available to react to mockups in-session.

If those aren't true, defer.

---

## Status

This file is a placeholder until mockups land. Do not attempt to execute it as-is.
