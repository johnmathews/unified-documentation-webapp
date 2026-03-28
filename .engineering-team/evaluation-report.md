# Mobile Responsiveness Evaluation Report

## Executive Summary

The documentation UI works well on desktop with its 3-panel layout (sidebar, content, chat), but **every single interactive element fails minimum touch target guidelines** on mobile. The sidebar takes full-screen width on phones with no backdrop/scrim to dismiss it, there are no swipe gestures, no safe-area-inset handling for notched phones, and several flex layouts overflow on narrow screens. The mobile experience needs a systematic overhaul, not just CSS tweaks.

---

## Assessment Dimensions

| Dimension | Rating | Notes |
|-----------|--------|-------|
| Desktop UX | 4/5 | Clean 3-panel layout, works great |
| Mobile touch targets | 0/5 | Every interactive element fails 44x44px minimum |
| Mobile layout | 2/5 | Basic breakpoints exist but panels need rethinking |
| Mobile navigation | 1/5 | No backdrop/scrim, no swipe, sidebar covers everything |
| Responsive typography | 1/5 | Fixed font sizes, h1 at 28px looks huge on 375px screens |
| Safe area handling | 0/5 | No env(safe-area-inset-*) for notched devices |

---

## Detailed Findings

### 1. Touch Target Sizes (CRITICAL)

Apple HIG requires 44x44px minimum. Material Design requires 48x48dp. WCAG 2.2 AA minimum is 24x24px.

**Current state: Every interactive element fails all three standards.**

| Element | File | Computed Size | Required |
|---------|------|---------------|----------|
| Hamburger button | `+layout.svelte:38` | 29x29px | 44x44px |
| Theme toggle | `+layout.svelte:46` | 27x27px | 44x44px |
| Chat toggle | `+layout.svelte:57` | 29px tall | 44x44px |
| Sidebar tree items | `Sidebar.svelte:193` | 30px tall | 44x44px |
| Sidebar tree toggles | `Sidebar.svelte:179` | 31px tall | 44x44px |
| Expand/collapse btn | `Sidebar.svelte:157` | 22x22px | 44x44px |
| Chat header buttons | `ChatPanel.svelte:126-151` | 22x22px | 44x44px |
| Send button | `ChatPanel.svelte:212` | 30x30px | 44x44px |
| Doc list links | `source/[name]/+page.svelte:71` | 20px tall | 44x44px |
| Breadcrumb links | `Breadcrumbs.svelte:10` | 11px tall | 44x44px |
| Source badge | `doc/[id]/+page.svelte:83` | 13px tall | 44x44px |

**Impact:** On a phone, users must aim precisely at tiny targets with their thumbs. This causes frequent mis-taps, especially in the sidebar tree where items are densely packed.

### 2. Sidebar on Mobile (HIGH)

**Current behavior** (`+layout.svelte:189-218`):
- At <= 1024px: sidebar becomes `position: fixed` overlay with shadow
- At <= 640px: sidebar takes `width: 100%`
- Auto-closes on navigation for screens <= 640px (good)

**Problems:**
- **No backdrop/scrim**: When the sidebar opens, there's no semi-transparent overlay behind it. Users can't tap outside to dismiss. There's no visual cue that the sidebar is a modal overlay.
- **Full-width blocks content**: At 100% width on phones, the sidebar completely hides the content. Users lose context of where they are. Best practice is 80% width (leave ~56px visible).
- **No swipe gestures**: No swipe-right-from-edge to open or swipe-left to close. Users must find and tap the 29px hamburger button.
- **No escape key handling**: Keyboard users can't dismiss with Escape.

### 3. Chat Panel on Mobile (HIGH)

**Current behavior** (`+layout.svelte:199-211`):
- At <= 1024px: fixed overlay from right side
- At <= 640px: `width: 100%`

**Problems:**
- Same no-backdrop issue as sidebar
- No bottom-sheet pattern for quick questions
- The 22px chat header buttons are nearly impossible to tap
- No way to see content while chatting (full takeover with no back context)
- Chat input at bottom could be obscured by iOS home indicator (no safe-area-inset)

### 4. Horizontal Overflow Risks (MEDIUM)

| Issue | File:Line | Description |
|-------|-----------|-------------|
| Sources grid | `+page.svelte:122` | `minmax(380px, 1fr)` can overflow between 380-640px viewports |
| Doc metadata row | `doc/[id]/+page.svelte:152` | Flex row with source badge + monospace file path, no wrap |
| Doc dates row | `doc/[id]/+page.svelte:188` | Flex row, no `flex-wrap` for narrow screens |
| Doc list items | `source/[name]/+page.svelte:110` | Flex row with title + date, no mobile stack |
| Markdown tables | `app.css:161` | `width: 100%` but no `overflow-x` wrapper, wide tables overflow |

### 5. Typography (MEDIUM)

- `h1` at `2rem` (28px) is disproportionately large on 375px screens (takes ~8% of width per character)
- No fluid typography using `clamp()` — all sizes fixed
- Base font 14px is fine for mobile but could scale with `clamp()` for readability

### 6. Safe Area Handling (MEDIUM)

No `env(safe-area-inset-*)` values anywhere. On iPhone X+ with notch/dynamic island:
- Top bar content could overlap with status bar/notch
- Bottom chat input could be hidden behind home indicator
- Sidebar content near edges could be clipped

### 7. Viewport Height (LOW)

`+layout.svelte:86` uses `height: 100vh` for `.app-layout`. On iOS Safari, `100vh` includes the area behind the browser chrome, causing content to be hidden behind the URL bar. Should use `100dvh` (dynamic viewport height) with `100vh` fallback.

---

## Strengths

- The desktop layout is clean and well-organized
- Dark/light theme with CSS custom properties is well implemented
- The sidebar auto-close on mobile navigation (`+layout.svelte:69`) is a good UX touch
- The 1024px breakpoint for overlay panels and 640px for full-width are reasonable breakpoints
- Markdown content has `overflow-x: auto` on `<pre>` blocks (prevents code overflow)
- The responsive grid for source cards has a 640px fallback to single column

---

## What's Working on Mobile

- Viewport meta tag is present and correct (`app.html:5`)
- Source cards stack to single column at 640px
- Journal entries stack date above title at 640px
- Content padding reduces from 2rem to 1rem at 640px
- Chat button label text hides at 640px
