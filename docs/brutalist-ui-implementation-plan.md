# Plan: Brutalist UI Redesign for Documentation Browser

## Context

The documentation-ui frontend (SvelteKit, Svelte 5, at `../documentation-ui`) has good features but poor visual design. The user wants a GOV.UK-inspired brutalist redesign that keeps every feature and interactive element intact but applies a new design system with comfortable contrast, clear visual hierarchy, and responsive layouts across all viewports. Work happens on a branch called `brutalist-ui`.

All design decisions (colors, typography, spacing, responsive breakpoints, component mapping) have been researched, discussed, and approved. The approved specifications are in memory at `brutalist_ui_design_notes.md` and the approved color samples are at `docs/brutalist-color-samples.html`.

## Scope

**What changes:** CSS variables, colors, typography scale, spacing, border radius, shadows, source tag colors, responsive breakpoints, component styling.

**What does NOT change:** All routes, all interactive features, all data structures, all API calls, all state management, all TypeScript logic. Zero functional changes.

## Files to Modify

| File | Change Type | Scope |
|------|-------------|-------|
| `src/app.css` | Major rewrite | New variables, typography, markdown styles, breakpoints |
| `src/lib/colors.ts` | Rewrite | Light/dark mode tag color pairs |
| `src/routes/+layout.svelte` | Major restyle | Header, layout grid, responsive breakpoints, panels |
| `src/lib/components/Sidebar.svelte` | Restyle | Tree, search, tags, active states |
| `src/lib/components/ChatPanel.svelte` | Restyle | Message bubbles, input, header |
| `src/lib/components/Breadcrumbs.svelte` | Minor restyle | Font sizes, colors |
| `src/routes/+page.svelte` | Restyle | Source cards grid, stats |
| `src/routes/doc/[id]/+page.svelte` | Restyle | Document header, metadata, spinner |
| `src/routes/journal/+page.svelte` | Restyle | Timeline, month groups, entry cards |
| `src/routes/source/[name]/+page.svelte` | Restyle | Source overview, doc lists |
| `src/routes/source/[name]/[category]/+page.svelte` | Restyle | Category filter, doc lists |
| `src/app.html` | Minor | Ensure theme script works with new variable names |

**No new files created** (except potentially a `src/lib/theme.ts` if the theme toggle logic needs cleanup for Svelte 5 runes, but likely unnecessary).

---

## Implementation Order

### Phase 1: Foundation (`app.css` + `colors.ts`)

This is the highest-risk phase. Get the design system right and everything else follows.

#### Step 1a: Rewrite CSS custom properties in `app.css`

Replace the current variable system with the approved palette. Key changes:

**Variable renaming** (current -> new):
- `--bg` -> `--bg-body` (#0f1117 -> #0f172a dark / #f8fafc light)
- `--bg-surface` stays (values change)
- Add `--bg-surface-alt` (new token)
- `--bg-hover` stays (values change)
- `--bg-active` stays (values change)
- `--text` stays (values change: #e1e4ed -> #cbd5e1 dark / #334155 light)
- `--text-muted` -> `--text-secondary` (rename: this is the "medium emphasis" level -- metadata, timestamps)
- `--text-dim` -> `--text-muted` (rename: this is the "lowest emphasis" level -- placeholder, disabled)
- **Migration:** Every `var(--text-muted)` in current code becomes `var(--text-secondary)`. Every `var(--text-dim)` becomes `var(--text-muted)`. Do this via global search-replace FIRST before changing any values.
- `--accent` stays (values change: #6c8cff -> #5694ca dark / #1d70b8 light)
- `--accent-hover` stays (values change)
- `--accent-dim` stays (values change)
- Add: `--link`, `--link-visited`, `--link-hover` (separate from accent)
- Add: `--error` (#f87171 is currently hardcoded in 5+ components)
- Add: `--success` stays (values change)
- Add: `--focus` (#ffdd00)
- `--border` stays (values change)
- Add: `--border-strong` (new token)
- `--radius` -> reduce to `2px` (brutalist: minimal rounding)
- `--radius-lg` -> reduce to `4px`

**Current `[data-theme="light"]` approach works fine** -- keep it. The inline script in `app.html` prevents FOUC.

**Typography changes in `:root`:**
- Base font-size: 14px -> 16px on `html`, with body text at 19px (1.1875rem)
- Add heading scale variables or apply directly in markdown content
- Line-heights change to 5px multiples

**Breakpoint changes in global media queries:**
- `@media (max-width: 600px)` -> `@media (max-width: 640px)` (below tablet)
- `@media (max-width: 1024px)` -> keep but also add `@media (min-width: 1200px)` for wide desktop
- These apply in component `<style>` blocks too (coordinated in Phase 2-3)

**Font size context: different areas use different base sizes:**
- **Main content area (doc viewer):** 19px body text (~75 chars/line at 800px max-width)
- **Sidebar:** 16px body text (compact navigation needs smaller text; 14px minimum for anything)
- **Chat panel:** 16px body text (compact conversation view)
- **Header/nav:** 16px for nav links, 24px for app title

**Page title vs content headings:**
- Page title (e.g., document name at top of doc viewer): 48px desktop / 32px mobile (GOV.UK XL)
- Content headings inside markdown: h1=36px, h2=24px, h3=19px (GOV.UK "standard page" scale, since the page already has its own XL title)

**Markdown content styling (`.markdown-content`):**
- Heading sizes: h1=36px, h2=24px, h3=19px (the GOV.UK standard page scale)
- Line-heights: multiples of 5px
- Code blocks: use `--bg-surface` bg, `--border` border
- Blockquotes: left border `--link` color (not `--accent`)
- Tables: `--border` borders, `--bg-surface` header bg
- Max-width: stays 800px (achieves ~75 char line width at 19px)

**Remove:**
- All `box-shadow` values (brutalist: no shadows)
- `--radius-lg: 10px` -> `4px`
- `--radius: 6px` -> `2px`
- Gradient or decorative CSS if any

#### Step 1b: Rewrite `colors.ts`

Current: Returns `{ bg, text }` pairs from 8 hardcoded RGB colors, background at 15% opacity.
New: Refactor to CSS class approach.

**Approved source tag colors:**

| Color | Light BG | Light Text | Dark BG | Dark Text |
|-------|----------|------------|---------|-----------|
| Blue | `#d4e4f7` | `#0f385c` | `#163d6b` | `#7db8e8` |
| Green | `#cce8dc` | `#083d29` | `#0d4f35` | `#6ccda5` |
| Purple | `#ddd6ef` | `#2a1950` | `#3a2570` | `#a694d4` |
| Orange | `#fde3cf` | `#7a3c1c` | `#8f4a24` | `#f4b07a` |
| Teal | `#c9e8e9` | `#0b4144` | `#105558` | `#6dd4d8` |
| Red | `#f5d0d0` | `#651b1b` | `#7a2424` | `#f09090` |

**Implementation:** Define CSS classes `.tag-blue`, `.tag-green`, etc. in `app.css` with theme-aware colors under both `:root` (dark) and `[data-theme="light"]`. The `colors.ts` function becomes `sourceColorClass(name: string): string` returning a class name like `'tag-blue'`. Components change from `style="background: {bg}; color: {text}"` to `class={sourceColorClass(name)}`. This makes theme switching automatic via CSS -- no JS theme detection needed.

**Files that use `sourceColor()` and need updating:** Home page, doc page, journal page, sidebar, source pages (~6 files).

### Phase 2: Layout (`+layout.svelte`)

#### Step 2a: Header/Top Bar restyling
- Background: `--bg-surface`
- Border-bottom: `1px solid var(--border)`
- Height: stays 56px
- App title "Documentation": 24px bold, `--text` color
- Nav links: `--text-secondary` color, underline on hover, active page bold + `--text`
- Theme toggle + chat toggle: keep functionality, restyle icons
- Remove any background colors on nav items

#### Step 2b: Responsive breakpoints

Current breakpoints: 600px, 1024px (with 640px in some components).
New breakpoints: 640px (mobile), 769px (desktop/sidebar), 1200px (wide/three-panel).

**Sidebar persistence:** The design notes originally said 641px, but at that width with a 280px fixed sidebar, content gets only ~361px (~35 chars at 19px body text). Too cramped. Using **769px** instead, which matches GOV.UK's desktop breakpoint and gives ~490px+ for content. Can revisit if testing shows 641px works.

**Breakpoint summary:**

| Range | Sidebar | Chat | Layout |
|-------|---------|------|--------|
| 0-768px | Overlay | Overlay | Single column |
| 769-1199px | Persistent 280px | Overlay | Two column |
| 1200px+ | Persistent 280px | Persistent 360px | Three column |

**Chat panel behavior change:** Currently persistent on desktop (>1024px), overlay below. New: overlay until 1200px. Desktop users at 1024-1199px get chat as overlay. Deliberate -- two columns (sidebar + content) need the space.

#### Step 2c: Panel styling
- Remove box-shadows on sidebar/chat overlays
- Backdrop: keep `rgba(0, 0, 0, 0.5)` but add as `--backdrop` variable
- Sidebar/chat transitions: keep cubic-bezier timing (functional, not decorative)

### Phase 3: Components

#### Step 3a: Sidebar (`Sidebar.svelte`)
- Search input: `--border-strong` border, focus ring with `--focus` color
- Tree items: font-size 16px minimum
- Source tags: use new CSS class approach (`.tag-blue` etc.) instead of inline styles
- Active item: left border `--accent`, bold text, `--accent-dim` background
- Hover: `--bg-hover` background
- Expand/collapse chevrons: keep animation
- Counts: `--text-muted` color, 14px minimum
- Replace `--text-dim` references with `--text-muted`
- Replace hardcoded `#f87171` with `var(--error)`

#### Step 3b: ChatPanel (`ChatPanel.svelte`)
- User messages: `--accent` background (keep), white text
- Assistant messages: left border `--accent` (inset text style), no full border
- Input: `--border-strong` border, 16px font (prevent iOS zoom -- already done)
- Header: simpler, `--text-secondary` for controls
- Page context badge: `--success` color
- Typing dots: keep animation
- Replace hardcoded error color with `var(--error)`

#### Step 3c: Breadcrumbs (`Breadcrumbs.svelte`)
- Font-size: 16px (up from ~14px)
- Separator color: `--text-muted`
- Current page: `--text`, font-weight 600
- Links: `--link` color, underlined
- Mobile (below 641px): collapse to first + last item

### Phase 4: Pages

#### Step 4a: Home Page (`+page.svelte`)
- Source cards: `--bg-surface` background, `1px solid var(--border)`, radius 2px
- Remove colored card borders (currently uses inline sourceColor)
- Source name heading: 24px bold
- Stats: `--text-secondary`, 16px
- Document links: `--link` color, underlined
- Grid: keep auto-fill but min 380px -> maybe 360px to fit better in two-thirds layout
- Replace hardcoded `#f87171` with `var(--error)`

#### Step 4b: Document Page (`doc/[id]/+page.svelte`)
- Source badge: new CSS class tag style
- Title: use heading scale (48px page title / 36px h1 in content)
- Metadata (dates, path): `--text-secondary`, 16px
- File path: monospace, 14px minimum
- Max-width 800px: keep
- Spinner: restyle with `--accent` color
- Replace hardcoded `#f87171` with `var(--error)`

#### Step 4c: Journal Page (`journal/+page.svelte`)
- Month group headers: 24px bold, `--text`
- Entry cards: left border transparent -> `--accent` on hover (keep pattern)
- Source badge: CSS class tag style
- Date: `--text-secondary`, right-aligned, 14px minimum
- Entry title: `--text`, 19px
- Section separator: `--border` bottom border
- Replace hardcoded `#f87171` with `var(--error)`

#### Step 4d: Source Pages (`source/[name]/*`)
- Same patterns as above: heading scale, link colors, secondary text for metadata
- Replace hardcoded `#f87171` with `var(--error)`

### Phase 5: Polish & Cross-cutting

1. **Remove all `box-shadow`** from layout and components
2. **Replace all `border-radius: var(--radius)` usage** -- the variable change handles most, but verify no hardcoded radius values
3. **Verify all `#f87171` replaced** with `var(--error)`
4. **Add `--error` variable** to both themes in `app.css`
5. **Backdrop variable** -- add `--backdrop` and use it
6. **Scrollbar styling** -- update to use new border/surface colors
7. **Link styling** -- ensure body links use `--link` + underline, nav links can omit underline
8. **Focus states** -- add `outline: 3px solid var(--focus); outline-offset: 2px` globally for `:focus-visible`
9. **Font size audit** -- grep for any font-size below 14px and fix

### Phase 6: Verification

1. **`npm run check`** -- SvelteKit type checking, catches broken variable references
2. **`npm run build`** (`vite build`) -- verify no build errors
3. **`npm test`** (`vitest run`) -- run existing unit tests
4. **`npm run dev`** and test in browser:
   - Light mode: all pages, sidebar, chat, search
   - Dark mode: all pages, sidebar, chat, search
   - Toggle between modes: verify no flash, variables all switch
5. **Responsive testing** (browser DevTools):
   - 375px (iPhone SE): single column, overlays work, gestures work
   - 414px (iPhone 14): same
   - 768px (iPad portrait): single column, sidebar overlay
   - 1024px (iPad landscape): sidebar persistent, chat overlay, two columns
   - 1200px: three-panel layout activates
   - 1440px+: content doesn't stretch, whitespace on sides
6. **Feature checklist:**
   - [ ] Sidebar search works (type, results appear, clear works)
   - [ ] Sidebar tree expand/collapse works
   - [ ] All nav links work (All Documents, Journal Entries, File Picker)
   - [ ] Document viewer renders markdown correctly
   - [ ] Chat send/receive works
   - [ ] Chat expand to 50vw works
   - [ ] Chat history persists in localStorage
   - [ ] Chat clear + restore works
   - [ ] Theme toggle persists
   - [ ] Breadcrumbs navigate correctly
   - [ ] Source tags display with correct colors per theme
   - [ ] Mobile swipe gestures work (if testable)
   - [ ] All routes load without error
7. **`npx playwright test`** -- run e2e tests if configured
8. **Contrast spot-check:** Use browser DevTools accessibility panel to verify contrast ratios on key text pairings

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Variable rename breaks component that still references old name | Global search-replace `--bg:` to `--bg-body:` etc. before starting components; grep to verify zero remaining references |
| `colors.ts` refactor breaks inline styles in 6+ files | Do `colors.ts` + all its consumers in the same step |
| Breakpoint changes cause layout regression at certain widths | Test each breakpoint individually in DevTools |
| 19px body text feels too large in sidebar/chat | Sidebar and chat keep 16px body text; only main content area uses 19px |
| Sidebar persistent at 641px is too cramped | Plan uses 769px instead (tested: 641px leaves only 35 chars for content). Can revisit if needed |
| Variable rename misses some references | Strict order: rename variables globally FIRST (search-replace), THEN change values |
| Three-panel layout at 1200px is too cramped | Content area is flex with max line-width of ~75 chars; sidebar 280px and chat 360px are fixed; total ~960px minimum + margins. At 1200px this leaves ~560px for content which is fine for 75 chars at 19px |

## Estimated Work Units

1. **app.css rewrite** -- largest single change (~200 lines rewritten)
2. **colors.ts + tag CSS classes** -- small but touches many files
3. **+layout.svelte** -- second largest (breakpoints, header, panel behavior)
4. **Sidebar.svelte** -- medium (292 lines of CSS to update)
5. **ChatPanel.svelte** -- medium (293 lines of CSS to update)
6. **5 page files + Breadcrumbs** -- small each, batch together
7. **Polish pass** -- shadows, radius, error color, font-size audit
8. **Verification** -- manual testing across viewports and themes
