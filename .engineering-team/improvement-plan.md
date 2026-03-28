# Mobile Responsiveness Improvement Plan

## Overview

Transform the documentation UI from a desktop-first app with mobile afterthoughts into a mobile-friendly experience that's a joy to use on phones. The approach: fix touch targets globally, add proper mobile navigation patterns (backdrop, swipe, bottom nav), fix overflow issues, and handle safe areas.

**Scope:** This plan targets screens < 600px (phones in portrait). Tablet improvements (600-1024px) are secondary and noted where applicable.

---

## Work Unit 1: Global Touch Target Fix (CRITICAL)

**Priority:** Critical
**Dependencies:** None
**Estimated scope:** 6 files modified

### Changes

**`src/app.css` — Add global mobile touch target minimum**

Add a mobile media query that increases padding on all interactive elements:

```css
@media (max-width: 600px) {
  /* Minimum 44px touch targets on mobile */
  button, .icon-btn, .header-btn, .tree-action-btn {
    min-height: 44px;
    min-width: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
}
```

**`src/lib/components/Sidebar.svelte` — Increase tree item tap targets**

- `.tree-toggle`, `.category-toggle`: increase padding to `0.75rem` vertical (from 0.4rem) → 44px+ height
- `.tree-item` (doc links): increase padding to `0.75rem` vertical (from 0.35rem) → 44px+ height
- `.tree-action-btn` (expand/collapse all): increase to `min-height: 44px; min-width: 44px`
- `.search-result-item`: increase padding to `0.75rem` vertical
- Search `<input>`: set `min-height: 44px`

**`src/lib/components/ChatPanel.svelte` — Increase chat button targets**

- `.header-btn`: increase to `min-height: 44px; min-width: 44px; padding: 0.5rem`
- `.send-btn`: increase to `min-height: 44px; min-width: 44px`
- Chat `<input>`: set `min-height: 44px`

**`src/routes/+layout.svelte` — Increase top bar button targets**

- `.icon-btn`: increase to `min-height: 44px; min-width: 44px; padding: 0.6rem`
- `.app-title` link: add padding to create a 44px tall tap target

**`src/lib/components/Breadcrumbs.svelte` — Increase breadcrumb tap targets**

- Breadcrumb links: add `padding: 0.5rem 0.25rem` and `min-height: 44px` with flex alignment
- Increase font-size from 0.8rem to 0.9rem on mobile

**Content pages — Increase list item tap targets**

- `source/[name]/+page.svelte` `.doc-list li`: increase padding to `0.75rem 0` on mobile
- `source/[name]/[category]/+page.svelte` `.doc-list li`: same increase
- `doc/[id]/+page.svelte` `.source-badge`: increase padding to `0.4rem 0.75rem`

### Acceptance Criteria
- All interactive elements measure >= 44px in both dimensions on mobile
- Desktop layout is unchanged (all changes scoped to `@media (max-width: 600px)`)
- No visual regression on desktop

---

## Work Unit 2: Sidebar Mobile Overhaul (HIGH)

**Priority:** High
**Dependencies:** None (can run parallel with Unit 1)
**Estimated scope:** 2 files modified

### Changes

**`src/routes/+layout.svelte` — Drawer pattern with backdrop**

1. **Add backdrop/scrim element:**
   ```svelte
   {#if sidebarOpen && isMobile}
     <button class="backdrop" onclick={() => sidebarOpen = false} aria-label="Close sidebar"></button>
   {/if}
   ```
   Style: `position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99;` (sidebar at z-index 100)

2. **Reduce sidebar width on mobile from 100% to ~85%:**
   ```css
   @media (max-width: 600px) {
     .sidebar.open { width: 85%; max-width: 320px; }
   }
   ```
   This leaves ~56px visible of the underlying content, giving users spatial context.

3. **Add escape key handler:**
   ```svelte
   <svelte:window onkeydown={(e) => { if (e.key === 'Escape') { sidebarOpen = false; chatOpen = false; }}} />
   ```

4. **Add swipe-to-close gesture:**
   Track touch start/move/end on the sidebar. If the user swipes left > 50px, close the sidebar. Use `touch-action: pan-y` on the sidebar to allow vertical scrolling while capturing horizontal swipes.

5. **Add swipe-from-edge-to-open gesture:**
   On the main content area, detect touch starting within 20px of the left edge. If it moves right > 50px, open the sidebar.

6. **Use `isMobile` reactive media query** (Svelte 5 `MediaQuery` class):
   ```svelte
   import { MediaQuery } from 'svelte/reactivity';
   const isMobile = new MediaQuery('max-width: 600px');
   ```

### Acceptance Criteria
- Tapping outside sidebar (on backdrop) closes it
- Escape key closes sidebar
- Swiping left on sidebar closes it
- Swiping right from left edge opens sidebar
- Sidebar shows ~85% width on mobile, not 100%
- Backdrop has semi-transparent dark overlay
- Desktop layout unchanged

---

## Work Unit 3: Chat Panel Mobile Overhaul (HIGH)

**Priority:** High
**Dependencies:** Unit 2 (shares the `isMobile` query and backdrop pattern)

### Changes

**`src/routes/+layout.svelte` — Chat backdrop**

1. **Add backdrop for chat panel** (same pattern as sidebar):
   ```svelte
   {#if chatOpen && isMobile}
     <button class="backdrop" onclick={() => chatOpen = false} aria-label="Close chat"></button>
   {/if}
   ```

2. **Full-screen chat on mobile with back button:**
   On mobile, the chat panel should take the full screen with a clear back/close button at top-left (44px+ tap target). The current close button at top-right is fine but should also have a larger tap target.

**`src/lib/components/ChatPanel.svelte` — Mobile chat UX**

1. **Safe-area padding for input:**
   ```css
   @media (max-width: 600px) {
     .input-area { padding-bottom: env(safe-area-inset-bottom, 0); }
   }
   ```

2. **Larger message bubbles and text on mobile:**
   ```css
   @media (max-width: 600px) {
     .message { font-size: 1rem; padding: 0.75rem 1rem; }
   }
   ```

3. **Swipe-right to close chat panel** (mirror of sidebar swipe-left-to-close)

### Acceptance Criteria
- Chat has backdrop on mobile
- Chat input accounts for safe-area-inset-bottom (iPhone home indicator)
- Chat messages are comfortably readable on mobile
- Swipe right closes chat
- Back button clearly visible and 44px+ touch target

---

## Work Unit 4: Fix Horizontal Overflow Issues (MEDIUM)

**Priority:** Medium
**Dependencies:** None (can run parallel)

### Changes

**`src/routes/+page.svelte` — Sources grid**
- Change `minmax(380px, 1fr)` to `minmax(min(380px, 100%), 1fr)` to prevent overflow on screens between 380-640px

**`src/routes/doc/[id]/+page.svelte` — Metadata layout**
- Add `flex-wrap: wrap` to `.doc-meta` (line 152)
- Add `flex-wrap: wrap` to `.doc-dates` (line 188)
- Add `min-width: 0; overflow-wrap: break-word` to file path element

**`src/routes/source/[name]/+page.svelte` — Doc list mobile stacking**
```css
@media (max-width: 600px) {
  .doc-list li { flex-direction: column; align-items: flex-start; gap: 0.25rem; }
  .date { margin-left: 0; }
}
```

**`src/routes/source/[name]/[category]/+page.svelte` — Same doc list fix**
Apply same column-stack pattern.

**`src/app.css` — Markdown table overflow**
Wrap tables in a scrollable container:
```css
.doc-content table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
```

### Acceptance Criteria
- No horizontal scroll on any page at 375px width
- Doc metadata wraps gracefully on narrow screens
- Tables scroll horizontally within their container
- Desktop layout unchanged

---

## Work Unit 5: Responsive Typography (MEDIUM)

**Priority:** Medium
**Dependencies:** None

### Changes

**`src/app.css` — Fluid typography**

Replace fixed font sizes with `clamp()` values:
```css
body { font-size: clamp(0.875rem, 0.85rem + 0.15vw, 1rem); }
```

**Content page headings (scoped changes):**
```css
@media (max-width: 600px) {
  h1 { font-size: 1.5rem; }  /* down from 2rem */
  h2 { font-size: 1.15rem; } /* down from ~1.3rem */
}
```

**Source page title** (`source/[name]/+page.svelte`):
- `h1` at 2rem → `clamp(1.5rem, 1.3rem + 1vw, 2rem)`

### Acceptance Criteria
- Headings scale down gracefully on mobile
- Body text remains legible (minimum 14px)
- Desktop sizes unchanged or negligibly different

---

## Work Unit 6: Safe Area & Viewport Fixes (MEDIUM)

**Priority:** Medium
**Dependencies:** None

### Changes

**`src/routes/+layout.svelte` — Safe area insets**

1. **Top bar:** Add `padding-top: env(safe-area-inset-top, 0)` to account for notch/dynamic island
2. **Bottom of content area:** Add `padding-bottom: env(safe-area-inset-bottom, 0)`

**`src/app.css` — Dynamic viewport height**

Replace `100vh` with `100dvh` (with fallback):
```css
.app-layout {
  height: 100vh;      /* fallback for older browsers */
  height: 100dvh;     /* dynamic viewport height for iOS Safari */
}
```

**`src/app.html` — Viewport meta**

Add `viewport-fit=cover` to enable safe-area-inset environment variables:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

### Acceptance Criteria
- Content not obscured by notch/dynamic island on iPhone X+
- Chat input not hidden behind home indicator
- Full height layout works correctly in iOS Safari (no content behind URL bar)
- No regression on non-notched devices

---

## Work Unit 7: Mobile Navigation Enhancement (LOW)

**Priority:** Low (polish, after core fixes)
**Dependencies:** Units 2, 3

### Changes

**`src/routes/+layout.svelte` — Slide animation for panels**

Add CSS transitions for sidebar and chat panel open/close:
```css
.sidebar {
  transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1);
}
.sidebar:not(.open) {
  transform: translateX(-100%);
}
```
Same for chat panel (translateX(100%) when closed).

Currently the panels use `display: none` / `display: flex` toggling which causes an instant show/hide. Slide animations provide spatial context — the user understands where the panel came from and where it went.

**Backdrop fade animation:**
```css
.backdrop {
  animation: fadeIn 200ms ease;
}
@keyframes fadeIn {
  from { opacity: 0; } to { opacity: 1; }
}
```

### Acceptance Criteria
- Sidebar slides in from left, chat slides in from right
- Backdrop fades in smoothly
- Animations feel responsive (< 300ms)
- No animation on desktop (or only if panels are in overlay mode)

---

## Implementation Order

```
Phase 1 (parallel):  Unit 1 (touch targets) + Unit 4 (overflow) + Unit 5 (typography) + Unit 6 (safe area)
Phase 2 (parallel):  Unit 2 (sidebar) + Unit 3 (chat panel)
Phase 3:             Unit 7 (animations — depends on Units 2 & 3)
```

Units 1, 4, 5, and 6 are independent CSS-only changes that can all be implemented in parallel. Units 2 and 3 involve Svelte logic (media queries, touch handlers, backdrop elements) and share patterns, so they run together after Phase 1. Unit 7 is polish that layers on top of the new panel behavior.

## Testing Strategy

- **Visual testing:** Use browser DevTools device emulation at 375px (iPhone SE), 390px (iPhone 14), and 428px (iPhone 14 Pro Max)
- **Touch target verification:** Use Chrome DevTools "Show touch targets" or manually measure computed sizes
- **Real device testing:** Test on an actual iPhone in Safari — DevTools emulation misses iOS-specific issues (safe areas, 100vh bug, momentum scrolling)
- **Desktop regression:** Verify all pages at 1440px and 1024px look identical to before
- **Overflow check:** At 375px, confirm no horizontal scrollbar on any page
