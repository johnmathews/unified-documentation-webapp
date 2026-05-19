# Round 3 — Batch A (Accessibility) Implementation Plan

**Status:** superseded — completed and shipped in round 3; see [journal/260516-round-3-closer.md](../../journal/260516-round-3-closer.md) (archived 2026-05-19).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the five accessibility items deferred from round 2 — ChatPanel history-item nested-interactive fix, focus-visible audit/prune, `/status` aria-describedby, ChatPanel aria-live for new messages, FloatingDocControls 30 → 44px touch targets.

**Architecture:** Five independent items, all surgical. Each touches one or two files. A1 is the largest (DOM refactor in ChatPanel). A2 is the most scattered (audit across nine files). A3/A4/A5 are small additions. Lands on a feature branch with one commit per item plus a journal entry.

**Tech Stack:** Svelte 5 runes, Vitest (with svelte-testing-library if used; otherwise inline DOM assertions), GOV.UK Design System focus patterns already canonicalised in `src/app.css`.

**Spec:** `docs/superpowers/specs/2026-05-16-round-3-deferred-sweep-design.md` — Batch A.

---

## File Structure

```
src/lib/components/ChatPanel.svelte             ← A1: DOM refactor (history-item → wrapper + row-button + delete-button); A4: aria-live on .messages
src/lib/components/FloatingDocControls.svelte   ← A5: control-btn 30 → 44px
src/routes/status/+page.svelte                  ← A3: aria-describedby + visually-hidden <dl> of status meanings
src/app.css                                     ← A2: canonical comment block describing the two focus patterns
src/lib/components/SearchPanel.svelte           ← A2: audit 6 :focus rules
src/lib/components/Toaster.svelte               ← A2: audit 1 :focus rule
src/lib/components/Breadcrumbs.svelte           ← A2: audit 1 :focus rule
src/routes/+layout.svelte                       ← A2: audit 3 :focus rules
src/routes/+page.svelte                         ← A2: audit 2 :focus rules
src/routes/journal/+page.svelte                 ← A2: audit 2 :focus rules
journal/260MMDD-round-3-batch-a-a11y.md         ← new journal entry
```

Use a fresh branch `eng-round-3-batch-a-a11y` off `main`.

---

## Task 1: A1 — ChatPanel `.history-item` nested-interactive refactor

**Files:**
- Modify: `src/lib/components/ChatPanel.svelte:303-319` (template) and `:554-603` (CSS)

The current `.history-item` is `<div role="button" tabindex="0" onclick=… onkeydown=…>` wrapping a `<div class="history-item-header">` that nests `.history-title` (span) and `.history-delete` (real `<button>`). Reading the spec: keyboard users have no per-item focus target other than the delete; screen readers treat the title as plain text. Real-button-in-real-button is invalid HTML, so the refactor is:

```
.history-item-wrapper (div, flex parent)
├── .history-row (real <button>, click = resume conversation, contains title + meta + preview)
└── .history-delete (real <button>, click = delete, stopPropagation no longer needed because they're siblings)
```

- [ ] **Step 1: Read the current template + styles**

Open `src/lib/components/ChatPanel.svelte` and re-read lines 303-319 (template) and 554-603 (styles). Note the current behaviour you need to preserve:
- Click on the row body → `resumeConversation(conv.id)`.
- Click on the delete button → `removeConversation(e, conv.id)` (event has stopPropagation; that becomes redundant after refactor but leave it for defence-in-depth).
- Hover or focus-within on the row reveals `.history-delete` from `opacity: 0`.

- [ ] **Step 2: Refactor the template at lines 303-319**

Replace:

```svelte
<div class="history-item" onclick={() => resumeConversation(conv.id)} onkeydown={(e) => { if (e.key === 'Enter') resumeConversation(conv.id); }} role="button" tabindex="0">
 <div class="history-item-header">
  <span class="history-title">{conv.title}</span>
  <button class="history-delete" onclick={(e) => removeConversation(e, conv.id)} title="Delete">
   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
   </svg>
  </button>
 </div>
 <div class="history-meta">
  <span>{conv.message_count} messages</span>
  <span>{formatDate(conv.updated_at)}</span>
 </div>
 {#if conv.preview}
  <p class="history-preview">{conv.preview}</p>
 {/if}
</div>
```

With:

```svelte
<div class="history-item-wrapper">
 <button type="button" class="history-row" onclick={() => resumeConversation(conv.id)}>
  <span class="history-title">{conv.title}</span>
  <div class="history-meta">
   <span>{conv.message_count} messages</span>
   <span>{formatDate(conv.updated_at)}</span>
  </div>
  {#if conv.preview}
   <p class="history-preview">{conv.preview}</p>
  {/if}
 </button>
 <button type="button" class="history-delete" onclick={(e) => removeConversation(e, conv.id)} aria-label="Delete conversation: {conv.title}">
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
   <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
 </button>
</div>
```

Changes summarised:
- `.history-item` div + role + tabindex + onkeydown → `.history-row` real `<button type="button">`. The browser handles Enter/Space natively on buttons; remove the manual key handler.
- `.history-item-header` div removed — its only job was to flex the title and delete button. With them as siblings of the wrapper, the wrapper handles the flex.
- `.history-meta` and `.history-preview` move inside `.history-row` so clicking them counts as clicking the row.
- The delete button gets a proper `aria-label` (was only a `title=` tooltip; some screen readers ignore `title`).
- The svg gets `aria-hidden="true"` (the button has a real label now).

- [ ] **Step 3: Update the CSS at lines 554-603**

Replace the existing `.history-item`, `.history-item-header`, `.history-title`, `.history-delete`, `.history-item:hover`, and `.history-item:hover .history-delete, .history-item:focus-within .history-delete` rules with:

```css
 .history-item-wrapper {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 0;
  border-bottom: 1px solid var(--border);
 }

 .history-row {
  flex: 1;
  min-width: 0;
  display: block;
  text-align: left;
  padding: 12px 15px;
  background: none;
  border: none;
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
  color: var(--text);
 }

 .history-row:hover {
  background: var(--bg-hover);
 }

 .history-title {
  display: block;
  font-size: 16px;
  line-height: 20px;
  font-weight: 600;
 }

 .history-delete {
  flex-shrink: 0;
  min-height: 44px;
  min-width: 44px;
  padding: 10px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  opacity: 0;
 }

 .history-item-wrapper:hover .history-delete,
 .history-item-wrapper:focus-within .history-delete {
  opacity: 1;
 }

 .history-delete:hover {
  color: var(--error);
 }
```

Key shifts vs the old CSS:
- `.history-item` became `.history-item-wrapper` (flex parent) + `.history-row` (button child). The width/min-height/display:block migrated to `.history-row`. The border-bottom moved to the wrapper so both children share it.
- The hover-reveal selector now keys off the wrapper, not the item.
- `.history-title` keeps its styling; it's now an inline-block `<span>` inside the row-button.

Leave `.history-meta` and `.history-preview` styles alone — they're unchanged.

- [ ] **Step 4: Run the build gates**

```bash
npm run check
npm run lint
npm test
```

Expected: all clean. No test count change (no A1-specific tests added; behavioural verification is manual + Playwright).

If `npm run check` flags the `aria-label` interpolation, that's expected — Svelte supports it. If it flags a missing handler (e.g. the removed `onkeydown`), accept it — buttons handle keyboard natively.

If any test fails, investigate. Likely cause: a Playwright/test fixture that selected `.history-item` by class. Search for `.history-item` in the test suite and rewrite if needed.

- [ ] **Step 5: Manual verification**

Start the backend (`cd ../server && uv run python -m docserver`) and webapp (`npm run dev`). Open `/`, open the chat panel, click the history icon (clock SVG in header). With at least one prior conversation:

1. Tab into the history list. Each conversation row should be its own focus stop; the focus ring should appear on `.history-row` (GOV.UK yellow-fill since it's a button — actually no, buttons get the `:focus-visible` outline pattern; the `a:focus` GOV.UK pattern only applies to anchors).
2. Press Tab again — focus should land on `.history-delete` (visible because `:focus-within` reveals it).
3. Press Enter on the row → conversation resumes.
4. Tab to the next row, then Tab to its delete, press Enter → delete confirm flow.
5. Verify no nested `<button>` complaints in the browser console.

If anything regresses (e.g. delete now triggers row click because event propagation changed), investigate before committing.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/ChatPanel.svelte
git commit -m "$(cat <<'EOF'
ChatPanel history rows are now real buttons (round 3 — batch A, A1)

The conversation history used a <div role="button"> as the row click
target with a real <button> nested inside it for delete. Keyboard users
had no per-row focus stop other than delete; screen readers read the
title as plain text. Refactor: each conversation is a flex wrapper
containing a real <button class="history-row"> (resume) and a real
<button class="history-delete"> (delete) as siblings. The svg in the
delete button is aria-hidden because the button has an aria-label now.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: A2 — focus-visible audit / prune

**Files (read each, decide per rule):**
- Modify: `src/app.css:165-168` — add a comment block above the canonical `:focus-visible` rule documenting the two patterns and when to override.
- Modify (likely): `src/lib/components/SearchPanel.svelte` — 6 `:focus` rules
- Modify (likely): `src/routes/journal/+page.svelte` — 2 `:focus` rules
- Modify (likely): `src/routes/+page.svelte` — 2 `:focus` rules
- Inspect-only (probably keep): `src/lib/components/Toaster.svelte` — 1 divergent rule (sits on dark toast bg)
- Inspect-only (probably keep): `src/lib/components/Breadcrumbs.svelte` — 1 GOV.UK pattern
- Inspect-only (probably keep): `src/routes/+layout.svelte` — 3 GOV.UK header patterns
- Inspect-only (already covered): `src/lib/components/ChatPanel.svelte` — focus rules left after A1 (they're refinements, not duplicates; verify and comment)

### Audit decision tree

For each per-component `:focus` or `:focus-visible` rule, apply this:

1. **Pure duplicate of the canonical rule?**
   Canonical for non-link interactive elements (`app.css:165`):
   ```css
   :focus-visible {
    outline: 3px solid var(--focus);
    outline-offset: 0;
   }
   ```
   If a component rule is literally `outline: 3px solid var(--focus); outline-offset: 0;` with no other declarations → **remove** the rule. The global covers it.

2. **Adds layout-relevant refinements (e.g. `box-shadow: inset 0 0 0 2px var(--border-strong)` on input borders, or different background/colour for a GOV.UK button pattern)?**
   → **Keep**, but add a one-line comment naming what the rule refines vs canonical, e.g.:
   ```css
   /* Refines canonical :focus-visible (app.css:165) — adds inset border so
      the outline doesn't visually collide with the input border. */
   .search-input:focus {
    outline: 3px solid var(--focus);
    outline-offset: 0;
    box-shadow: inset 0 0 0 2px var(--border-strong);
   }
   ```

3. **Diverges (e.g. `outline: none`, custom colour)?**
   → **Decide and document**: rewrite to canonical if the divergence has no good reason; if the divergence is intentional (e.g. Toaster's close button sits on a dark toast surface so it needs colour-swap focus styling), keep it but add a one-line `/* Divergent: ... reason ... */` comment above the rule.

### Step-by-step

- [ ] **Step 1: Land the canonical comment block in `app.css`**

In `src/app.css`, just above the `:focus-visible` rule at line 165, add:

```css
/*
 * Focus styles — two canonical patterns:
 *
 * 1. `a:focus` (above) — GOV.UK yellow-fill + black bottom shadow.
 *    Applies to all inline anchor links. Overriding this on a per-component
 *    basis is rarely correct; the GOV.UK link pattern is intentional and
 *    consistent across the design system.
 *
 * 2. `:focus-visible` (below) — 3px solid `var(--focus)` outline for
 *    buttons, inputs, divs with role="button", and anything else that
 *    isn't an anchor.
 *
 * Per-component overrides should:
 *   - Remove redundant duplicates of these two rules.
 *   - Add a one-line comment ABOVE the rule when the override refines
 *     (e.g. inset box-shadow on inputs) or diverges (e.g. dark surface).
 */
```

- [ ] **Step 2: Audit `src/lib/components/SearchPanel.svelte`**

Run `grep -n ':focus' src/lib/components/SearchPanel.svelte` to find the 6 rules. Read each in its surrounding context. For each:
- If it's a pure duplicate → delete the rule.
- If it has refinement properties (e.g. `box-shadow: inset 0 0 0 2px var(--border-strong)` on inputs) → keep, add the canonical-refines comment.
- If divergent → decide.

Expected outcome: 2–4 rules removed (the pure duplicates), 2–4 kept with comments.

- [ ] **Step 3: Audit `src/routes/journal/+page.svelte`**

Two rules: `.filter-btn:focus-visible` (likely duplicate — remove) and `.entry-title:focus` (probably refines a link or button — read the surrounding markup to decide).

- [ ] **Step 4: Audit `src/routes/+page.svelte`**

Two rules: `.sort-btn:focus-visible` (likely duplicate — remove) and `.source-link:focus` (this is an anchor; the `a:focus` global covers it — remove unless it adds refinements like `min-height: 44px`).

- [ ] **Step 5: Audit `src/lib/components/Toaster.svelte`**

One rule at line ~94: `.toast__close:focus { color: var(--focus-text); background: var(--focus); outline: none; }`. This is divergent — `outline: none` is normally a red flag, but on a dark toast surface a swap to GOV.UK yellow fill might be the right pattern. Keep, add a `/* Divergent: dark toast surface, swap to GOV.UK yellow fill instead of outline */` comment.

- [ ] **Step 6: Audit `src/lib/components/Breadcrumbs.svelte`**

One rule at line ~117: `.govuk-breadcrumbs__link:focus` — full GOV.UK yellow-fill pattern. But the `a:focus` global at `app.css:150` is already the GOV.UK pattern. If the rule is a pure duplicate of `a:focus`, remove it. If it differs (e.g. specific shadow values), keep with comment.

- [ ] **Step 7: Audit `src/routes/+layout.svelte`**

Three rules: `.govuk-header__link--homepage:focus`, `.govuk-header__action-btn:focus`, `.govuk-service-nav__link:focus`. These are GOV.UK header nav patterns — likely customised because the header sits on a coloured band. Inspect each; keep with comments.

- [ ] **Step 8: Audit `src/lib/components/ChatPanel.svelte` (post-A1)**

After A1, ChatPanel still has `.chat-input textarea:focus`, `.send-btn:focus:not(:active)`, `.message.user:focus-within .edit-btn`. The first two are real refinements; comment them. The third reveals an edit button on hover/focus — keep as-is (it's not a focus *style*, it's a sibling reveal driven by focus).

- [ ] **Step 9: Run the build gates**

```bash
npm run check
npm run lint
npm test
```

Expected: clean. No test count change.

- [ ] **Step 10: Manual verification (Tab-walk)**

With backend + dev server running, Tab through each route and confirm focus rings appear on every interactive element:
- `/` — masthead area, sort buttons, source links, status badge.
- `/doc/[id]` — breadcrumbs, source badge, body links, FloatingDocControls buttons, TOC links if open.
- `/status` — refresh button, sort buttons, source links.
- `/bookmarks` — group headers, doc links, bookmark toggle buttons.
- `/journal` — filter buttons, entry titles.
- Search panel open — input, filter toggles, date inputs, clear button.
- Chat panel open — header buttons, history rows + delete (from A1), textarea, send button.

Every interactive element must have a visible focus ring (either GOV.UK yellow-fill on anchors or yellow outline on others). If any element loses its focus state, restore the removed rule.

- [ ] **Step 11: Commit**

```bash
git add src/app.css src/lib/components/SearchPanel.svelte src/routes/journal/+page.svelte src/routes/+page.svelte src/lib/components/Toaster.svelte src/lib/components/Breadcrumbs.svelte src/routes/+layout.svelte src/lib/components/ChatPanel.svelte
git commit -m "$(cat <<'EOF'
Focus-state audit: prune duplicates, document refinements (round 3 — batch A, A2)

Two canonical focus patterns live in app.css: GOV.UK yellow-fill for
a:focus, 3px solid outline for :focus-visible. Per-component rules now
either remove pure duplicates, or carry a one-line comment naming what
they refine or why they diverge. Header band, dark Toaster surface, and
input box-shadow inset cases are kept as documented refinements.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: A3 — `/status` aria-describedby for status meanings

**Files:**
- Modify: `src/routes/status/+page.svelte:118-238` (template — add visually-hidden `<dl>` once, add `aria-describedby` to two badge groups)
- Modify: `src/routes/status/+page.svelte` styles — add `.visually-hidden` utility class

The page has two badge surfaces:
1. **Overall page badge** at lines 138-148 (`Healthy` / `Degraded` / `Error`).
2. **Per-row source-status spans** at lines 195-210 (`Healthy` / `Warning` / `Error` / `Unknown`).

Both currently rely on colour + a `title=` tooltip. Colour alone fails WCAG 1.4.1; `title=` is unreliable on touch and inconsistent with screen readers.

- [ ] **Step 1: Add a visually-hidden `<dl>` of status meanings**

In `src/routes/status/+page.svelte`, just inside the `{:else if health}` block (before the masthead at line 118), add:

```svelte
<dl class="visually-hidden" aria-hidden="false">
 <dt id="status-desc-healthy">Healthy</dt>
 <dd>All sources are scanning successfully.</dd>
 <dt id="status-desc-degraded">Degraded</dt>
 <dd>One or more sources have scan failures or are stale.</dd>
 <dt id="status-desc-error">Error</dt>
 <dd>All sources are failing or unreachable, or this source has 2+ consecutive failures.</dd>
 <dt id="status-desc-warning">Warning</dt>
 <dd>1 consecutive scan failure or scan is overdue.</dd>
 <dt id="status-desc-unknown">Unknown</dt>
 <dd>This source has not been scanned yet.</dd>
</dl>
```

The IDs are stable; we'll point each badge at them.

- [ ] **Step 2: Add `aria-describedby` to the overall page badge**

Modify the `.status-badge` element at lines 138-148:

```svelte
<div class="status-badge"
 class:ok={health.status === "healthy"}
 class:warn={health.status === "degraded"}
 class:err={health.status === "error"}
 aria-describedby={health.status === "healthy" ? "status-desc-healthy" : health.status === "degraded" ? "status-desc-degraded" : "status-desc-error"}
 title={...}>
 {...}
</div>
```

Keep the existing `title=` attribute — it's still useful for sighted hover users.

- [ ] **Step 3: Add `aria-describedby` to per-row source-status spans**

Modify the `.src-status` span at lines 195-210:

```svelte
<span class="src-status" class:src-healthy={source.source_status === "healthy"}
 class:src-warning={source.source_status === "warning"}
 class:src-error={source.source_status === "error"}
 class:src-unknown={source.source_status === "unknown"}
 aria-describedby="status-desc-{source.source_status}"
 title={...}>
 {...}
</span>
```

The `aria-describedby="status-desc-{source.source_status}"` is interpolated; the available values (`healthy`, `warning`, `error`, `unknown`) all have matching IDs in the visually-hidden `<dl>`.

- [ ] **Step 4: Add the `.visually-hidden` utility class**

In the `<style>` block of `src/routes/status/+page.svelte`, add at the top:

```css
 .visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
 }
```

This is the standard accessibility-only-hide pattern.

- [ ] **Step 5: Run build gates**

```bash
npm run check
npm run lint
npm test
```

Expected: clean.

- [ ] **Step 6: Manual verification with VoiceOver**

With backend + dev server running, open `/status` in Safari (VoiceOver works best there). Enable VoiceOver (Cmd+F5). Navigate to a status badge — VoiceOver should announce e.g. "Healthy. All sources are scanning successfully." (the description from the `<dd>`).

If VoiceOver only announces "Healthy" without the description, check:
- The `aria-describedby` ID matches the `<dt id="...">` ID exactly.
- The `<dl>` is in the same document context.
- The `.visually-hidden` doesn't use `display: none` (which removes it from the a11y tree).

- [ ] **Step 7: Commit**

```bash
git add src/routes/status/+page.svelte
git commit -m "$(cat <<'EOF'
/status badges now carry aria-describedby (round 3 — batch A, A3)

Status badges relied on colour + a title= attribute. Colour alone fails
WCAG 1.4.1; title= is unreliable on touch and inconsistent with screen
readers. Added a visually-hidden <dl> describing each status value once,
and aria-describedby on every badge (overall + per-row) pointing at the
matching <dt>. The title= attribute stays for sighted hover users.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: A4 — ChatPanel `aria-live="polite"` on `.messages`

**Files:**
- Modify: `src/lib/components/ChatPanel.svelte:294` (the `.messages` container opening tag)

- [ ] **Step 1: Edit the `.messages` container**

Change:

```svelte
<div class="messages" bind:this={messagesEl}>
```

To:

```svelte
<div class="messages" bind:this={messagesEl} aria-live="polite" aria-relevant="additions" aria-atomic="false">
```

Why these values:
- `aria-live="polite"` — wait for the screen reader to finish the current utterance before announcing. `assertive` would interrupt; that's too noisy for a chat.
- `aria-relevant="additions"` — only announce node additions, not deletions or edits. New assistant messages append; that's the signal.
- `aria-atomic="false"` — only the new node is read, not the whole `.messages` block again.

Note on interim tool-call states (the `{#if sending}` block with `.thinking-dots` and `.tool-progress`): these are appended/removed during the assistant response. With `aria-relevant="additions"`, each tool step's "✓ Tool name — summary" gets announced once. That is the right behaviour — the user benefits from knowing what the assistant is doing. If user feedback later shows it's too chatty, narrow `aria-relevant` or move the tool-progress to its own non-live region in a follow-up.

The history list and empty state are inside `.messages` and would also be subject to aria-live. But they only render once on `showHistory` toggle / empty load — there are no incremental additions. They don't trigger announcements.

- [ ] **Step 2: Run build gates**

```bash
npm run check
npm run lint
npm test
```

Expected: clean.

- [ ] **Step 3: Manual verification with VoiceOver**

With backend + dev server running, open `/`, open the chat panel, ask a question. As the assistant replies, VoiceOver should announce the new message text. If you have tool-progress steps, each completed step should be announced.

If VoiceOver doesn't announce, check that the `aria-live` attribute is actually present on `.messages` in DevTools.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/ChatPanel.svelte
git commit -m "$(cat <<'EOF'
ChatPanel .messages is now an aria-live region (round 3 — batch A, A4)

aria-live="polite" aria-relevant="additions" aria-atomic="false" means
screen readers announce new assistant messages (and tool-progress steps)
as they're appended, without interrupting the current utterance and
without re-announcing the entire message list on every change.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: A5 — FloatingDocControls `.control-btn` 30 → 44px

**Files:**
- Modify: `src/lib/components/FloatingDocControls.svelte:128-141` (the `.control-btn` rule and the surrounding container if it needs adjustment).

- [ ] **Step 1: Edit `.control-btn` width/height**

Replace the existing rule at line 128:

```css
 .control-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
 }
```

With:

```css
 .control-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
 }
```

The svg stays at 16px (centred via flexbox). The container's padding (`6px 10px 6px 6px`) and `gap: 8px` will need re-evaluation now that the buttons are larger:

- Old footprint (2 buttons): `2 × 30 + 2 × 8 (gap) + 16 (padding-x) + 38 (progress min-width) + 1 (divider) ≈ 131px`.
- New footprint (2 buttons): `2 × 44 + 2 × 8 + 16 + 38 + 1 ≈ 159px`.
- With TOC button (3 buttons): `3 × 44 + 3 × 8 + 16 + 38 + 2 ≈ 188px`.

At 375px viewport the floating control sits at `right: 12px`, so 375 - 12 - 188 = 175px of body content visible on the left. Should be acceptable. Verify visually in Step 3.

- [ ] **Step 2: Run build gates**

```bash
npm run check
npm run lint
npm test
```

Expected: clean. No test count change.

- [ ] **Step 3: Manual verification at 375 + 768 + 1440**

With backend + dev server running, open any doc at `/doc/{some-doc-id}`. The floating controls appear at the bottom right.

- 1440px: buttons clearly 44px square, no layout regression.
- 768px: buttons 44px, doesn't overlap content.
- 375px: buttons 44px, doesn't overlap body text. The container right-edge offset is `right: 12px` at ≤768px (existing rule); verify the controls don't extend past the viewport.

If the controls crowd content at 375px, evaluate options (move to bottom centre? hide TOC button on narrow viewports?) and add to follow-ups rather than expanding this batch.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/FloatingDocControls.svelte
git commit -m "$(cat <<'EOF'
FloatingDocControls control-btn meets 44px touch floor (round 3 — batch A, A5)

The floating controls' buttons were 30px square; WCAG touch-target
floor is 44px. Bumped width/height/min-width/min-height to 44px. The
svg stays at 16px (centred via flexbox); the container's padding and
gap absorb the extra footprint without overflow at any viewport.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Batch A journal entry

**Files:**
- Create: `journal/260MMDD-round-3-batch-a-a11y.md` (substitute today's date for MMDD).

- [ ] **Step 1: Draft the entry**

Write the journal file with sections for each of A1–A5 summarising what landed, why, and any follow-ups discovered. Reference the round-3 spec and round-2 origin entries for each item. End with an "Out of scope (round 3 follow-ups)" section listing what's left: batch D, batch B, batch C.

- [ ] **Step 2: Commit**

```bash
git add journal/260MMDD-round-3-batch-a-a11y.md
git commit -m "$(cat <<'EOF'
Journal entry for round 3, batch A (a11y)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Final batch verification

- [ ] **Step 1: Run all build gates**

```bash
npm run check
npm run lint
npm test
```

Expected: clean. Test count unchanged from round-2 baseline (254) unless A1 surfaced a `.history-item` selector somewhere in tests that needed updating.

- [ ] **Step 2: Visual + keyboard pass across all touched surfaces**

With backend + dev server, walk through:
- `/` — sort buttons get yellow outline focus, source links get GOV.UK yellow-fill.
- `/doc/[id]` — body links, source badge, breadcrumbs, FloatingDocControls (44px buttons), TOC.
- `/status` — VoiceOver announces status meaning for at least one badge.
- ChatPanel open — Tab walks through history rows + their delete buttons cleanly; aria-live announces new replies.
- Search panel open — Tab walks through input + filters with visible focus everywhere.

- [ ] **Step 3: Git log**

```bash
git log --oneline main..eng-round-3-batch-a-a11y
```

Expected: 6 commits (A1, A2, A3, A4, A5, journal).

- [ ] **Step 4: Merge to main (or open PR)**

```bash
git checkout main
git merge --no-ff eng-round-3-batch-a-a11y -m "Merge round-3 batch A (a11y)"
git branch -d eng-round-3-batch-a-a11y
```

---

## When this plan is complete

Next: **Batch D (XSS hardening)** plan at `docs/superpowers/plans/2026-05-16-round-3-batch-d-xss.md` — already drafted alongside this one.
