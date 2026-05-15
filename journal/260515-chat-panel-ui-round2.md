# 2026-05-15 — Chat panel restyled to GOV.UK standards (round 2, route 7)

Round-2 follow-up to the search-panel restyle (`fde0768`). Seventh
UI-standards unit in the round-2 sweep, and the second to target a
**panel** (drawer) rather than a route. Single-panel-per-PR
cadence; `/status` is the last remaining round-2 unit.

CSS-only change to one file:
`src/lib/components/ChatPanel.svelte`.

## What changed

1. **Bubble body promoted to GOV.UK body (19 / 25) for both
   roles.** The assistant bubble already carried
   `class="markdown-content"` (template line 342) — the intent
   was clearly "let the global doc-viewer typography apply" —
   but `.message-bubble { font-size: 16px; line-height:
   1.3157894737 }` overrode it. Dropped the override; the
   assistant bubble now inherits the GOV.UK 19 / 25 from
   `.markdown-content`, and `.message-bubble` declares the same
   scale explicitly so user bubbles match. Conversational
   typography stays consistent across roles; differentiation is
   carried by the bubble background (`var(--brand)` for user,
   white-on-`var(--border)` left-rule for assistant), which is
   how real chat UIs (Slack, ChatGPT, Claude.ai) handle it.
2. **Assistant-only 720 px reading column.** Assistant bubble
   `max-width: min(85%, 720px)`. The 85 % cap dominates on
   narrow panels (default 432 px → bubble ≈ 367 px); the 720 px
   cap engages once the panel widens beyond ~847 px (drag-
   resize up to 900, or expanded mode on a 1920 viewport at
   50 vw = 960). Verified: on a 900 px panel with long
   content, assistant-bubble computed width is exactly 720.
   The round-6 finding "the 720 reading-column rule does NOT
   apply to a drawer" stands — but it **does** apply to the
   long-form text *inside* the drawer, when the drawer is wide
   enough to give it that budget. User bubble keeps
   `max-width: 85%`; user messages are short, the cap is not
   load-bearing.
3. **Universal 44 px touch floor.** Moved `min-height: 44px`
   (and the matching width on icon buttons) out of the
   `@media (max-width: 768px)` block and onto the base rules
   for `.header-btn`, `.send-btn`, `.chat-input textarea`,
   `.edit-btn`, `.edit-cancel-btn`, `.history-delete`,
   `.history-item`. Same rule established in rounds 4 / 5 / 6:
   a 44 px tap target is no more expensive on desktop than on
   mobile, and asymmetric floors create reachability gaps on
   touch-enabled laptops. Notable specific bumps:
   - `.header-btn`: 24 × 28 → 44 × 44 (clear-chat, history,
     expand toggles)
   - `.edit-btn`: 22 × 26 → 44 × 44 (now also opens on
     keyboard focus via `:focus-within`, not just mouse hover)
   - `.history-delete`: small icon → 44 × 44
4. **5 px line-height grid everywhere.** Replaced fractional
   line-heights (21.0526, 21.6, 22.4, 19.5, implicit
   `normal`) with explicit `line-height: 20px` (or 25 px on the
   chat-header H3 and the bubble body). Fixed elements:
   `.chat-header h3`, `.context-badge`, `.confirm-label`,
   `.empty-state p`, `.context-hint`, `.history-loading`,
   `.history-empty`, `.history-title`, `.history-meta`,
   `.history-preview`, `.edit-bar`, `.edit-cancel-btn`,
   `.chat-input textarea`, `.tool-progress`. Bubble body
   25 / 19 was already the right ratio — declared as 25 px
   absolute so it lands on the grid unambiguously.
5. **`.history-preview` switched from single-line ellipsis to
   2-line clamp.** Same fix and same rationale as round 6
   (`.result-snippet`): `white-space: nowrap; text-overflow:
   ellipsis` shows a ghost of the snippet that's
   informationally absent. Two lines of wrapped text actually
   carry the matched topic.
6. **Mobile @media block reduced from 12 rules to 2.** Kept
   `.header-btn.expand-btn { display: none }` (the expand
   toggle has nothing to expand into when the panel is already
   full-width) and `.chat-input { padding-bottom: calc(15px +
   env(safe-area-inset-bottom, 0)); }` (iPhone notch). A new
   `@media (max-width: 640px)` block drops bubble body from
   19 / 25 to 16 / 20, mirroring the global
   `.markdown-content` mobile rule in `app.css`.
7. **`.send-btn:hover` is now theme-aware.** Was
   `background: #0b5c3e` — a hard-coded dark green that reverted
   the button to a light-mode shade when hovered in dark mode.
   Replaced with `filter: brightness(0.9)`, which works against
   `var(--success)` regardless of theme.
8. **Markdown sub-element rules slimmed.** The component used
   to override `:global(h1/h2/h3) { font-size: 16px }` and
   `:global(pre) { font-size: 0.8em }`, fighting the global
   `.markdown-content` rules. Both overrides removed — `h1-h3`
   inherit the GOV.UK heading scale, `pre code` inherits the
   doc-viewer 13 px monospace block. Only kept the compact
   margin overrides (10 px between paragraphs instead of 15)
   because chat transcripts are denser than article body.

## Design choices that matter

1. **User and assistant bubbles share the same body scale.**
   The prompt asked whether to differentiate. GOV.UK has no
   chat pattern, but every other surface in the app puts
   long-form text at 19 / 25 and the global rule is already
   set up that way. Picking a smaller user-bubble scale would
   either drop the user message below the body floor (bad) or
   introduce a third body size in the panel (16 / 20 small,
   19 / 25 medium, doc-viewer 19 / 25 large) — extra entropy
   for no functional gain. Same scale, different chroma.
2. **720 cap on assistant, not user, bubble.** Round 6
   resolved that the 720 reading-column rule does not apply to
   the drawer *as a surface*. But it does apply to long-form
   text *content* once a surface is wide enough to give it
   the budget. Assistant messages are paragraphs from an LLM;
   user messages are one-liners. The cap is on the content
   that actually consumes it.
3. **`filter: brightness(0.9)` for hover.** Tempting to map
   to a CSS variable like `var(--success-hover)`, but that
   means defining the variable in both light and dark mode
   for one button. `filter: brightness()` derives the right
   shade from whatever `var(--success)` resolves to. Cheaper
   primitive, no new variable in the system.
4. **Empty `@media (max-width: 768px)` block survived (just
   barely).** Round 6 reduced the search-panel block from 8
   rules to 2; this round reduced 12 rules to 2. Once the
   `/status` round is complete the round-2 sweep will have
   moved every panel and route to "universal everywhere
   except phone-specific concerns" — a much smaller mobile
   block per surface.
5. **No template changes.** The `class:markdown-content`
   binding on the assistant bubble was already correct (and
   already there). The defect was the override block defeating
   it. Pure CSS fix.

## What I considered and rejected

1. **Linking `.history-title` to a real `<a>` with the GOV.UK
   underline.** It's a `<span>` styled link-blue. Same cross-
   route source-badge pattern flagged for four rounds running.
   This round neither introduces nor entrenches the pattern —
   the title already renders as a clickable region (the parent
   `.history-item` is the clickable surface). Out of scope.
2. **Adding `aria-live="polite"` to `.messages`.** Screen
   readers don't announce new assistant replies. Trivial fix,
   but it's an accessibility concern, not a visual standards
   one. Defer to a separate a11y round.
3. **A DOMPurify pass on the assistant HTML.** `marked` doesn't
   sanitize by default; the assistant's model output goes
   through `{@html}`. Trusted because the backend is trusted,
   but a real hardening pass would add `marked` with
   `sanitizer` or post-render `DOMPurify.sanitize`. Server-
   side concern; defer.
4. **Bubble `max-width: 100%` on mobile.** The 85 % cap on a
   full-width panel leaves a 15 % rail empty. Tempting to drop
   it on mobile, but the rail visually separates user and
   assistant bubbles (user at right edge, assistant at left
   edge); collapsing both to 100 % loses that affordance.
   Kept 85 % everywhere.
5. **Container queries for the 720 px cap.** The cap depends
   on panel width, not viewport width. A container query
   would express this more precisely. But the assistant bubble
   sits in a flex column, and `@container` setup needs a
   wrapper with `container-type`. `min(85%, 720px)` produces
   the correct behaviour with no setup. The browser engages
   whichever cap is smaller — clamping at 85 % until the
   panel reaches ~847 px, then clamping at 720. Container
   query would not add precision here.

## Verification

Playwright at 1440 / 1024 / 768 / 375 px in light + dark mode,
both compact and expanded modes. Screenshots in
`.engineering-team/after-*.png` (before-shots in
`.engineering-team/before-*.png` for diff). Specifically:

- **At 1440 px light, compact (panel 432 px):** computed
  `.message-bubble` is 19 / 25 (was 16 / 21.0526). Every
  interactive element (`.header-btn`, `.send-btn`,
  `.chat-input textarea`, `.edit-btn`) has `min-height: 44px`
  and `min-width: 44px`. Every body-shape text element has a
  line-height that lands on the 5 px grid (`20px` or `25px`).
- **At 1440 px light, expanded (panel 720 px):** assistant
  bubble at 85 % = 612 px (under 720 cap). Verified the cap
  engages when the panel is widened: at panel = 900 px with
  long content, assistant bubble computed width is exactly
  720, as designed.
- **At 768 px:** panel becomes full-width, all floors firing
  from base rules. Bubble still 19 / 25 (above the 640 px
  mobile boundary). Expand toggle hidden.
- **At 375 px:** panel 375 px wide, bubble drops to 16 / 20
  via the new `@media (max-width: 640px)` block. No horizontal
  overflow (`documentElement.scrollWidth === 375`). All 44 px
  floors holding.
- **Dark mode at 1440 px:** `.send-btn` background resolves
  to `rgb(108, 205, 165)` (`var(--success)` on dark), and the
  hover state correctly darkens via `filter: brightness(0.9)`
  instead of reverting to the light-mode `#0b5c3e` hard-code.
- **Empty state:** "Ask questions about the documentation."
  at 16 / 20, on the 5 px grid.
- **0 new console errors.** The pre-existing 503 from
  `/api/chat/stream` is expected (no `ANTHROPIC_API_KEY` in
  local dev) and is not caused by the CSS changes.

Backend booted locally via
`uv run python -m docserver` from `server/` with
`DOCSERVER_CONFIG=.engineering-team/sources.eng.yaml`,
`DOCSERVER_DOC_TYPES_CONFIG=.engineering-team/doc_types.eng.yaml`,
`DOCSERVER_DATA_DIR=local-data-eng`. Chat endpoint returns 503
without an API key, which surfaces the error bubble — useful
for visual audit, not useful for testing the streaming-state
styling. The current implementation doesn't render partial
text anyway (`onReply` lands a complete message), so no
streaming-state styling was within scope.

`npm run check` → 0 errors, 0 warnings, 431 files.
`npm test` → 15 files, 254 tests, all pass.
`npm run lint` → clean.

## Out of scope (flagged for next rounds)

1. `/status` UI standards round (the last remaining round-2 unit).
2. **`aria-live="polite"` on `.messages`.** Screen readers
   don't announce new assistant replies. Accessibility round.
3. **`marked` / DOMPurify hardening for assistant HTML.**
   `{@html}` of `marked.parse` output is an XSS surface if
   the backend or the model emit raw HTML. Trusted today;
   not a structural defense.
4. **Source-badge underline pattern across home / source /
   doc / journal / chat-history.** Still cross-route, still
   pending. `.history-title` renders link-blue but plain
   `<span>` — this round didn't add or commit to the pattern.
5. **Streaming-state cursor / retry button styling.** The
   current chat endpoint doesn't stream partial text and
   doesn't expose a stop button. If both arrive later, the
   styling story will need a follow-up.

## Design principles this reinforces

1. **When a class is already wired up, fix the override, not
   the surface.** The assistant bubble carried
   `class="markdown-content"` already — the intent was right,
   the local override was wrong. Most of the body-text fix is
   *deletion*, not addition. Spotting "this class implies a
   global rule that's being defeated" is faster than
   re-deriving the rule from scratch.
2. **Reading-column rules apply to long-form content, not to
   surfaces.** Round 6's "drawer is its own width budget"
   resolved one half; this round resolved the other half.
   The 720 px cap goes on the long-form *content inside* the
   drawer — assistant paragraphs — not on the drawer itself.
   Same rule, more precise scope.
3. **Theme-aware hover via primitive functions, not new CSS
   variables.** `filter: brightness()` derives the right
   colour from whatever the theme resolves to. Adding a
   `--success-hover` variable for one button would have
   doubled the surface area of the change. Use the cheap
   primitive when it does the job.
