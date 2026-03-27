# GOV.UK Design System Research Notes

Detailed research on the UK Government Design System for redesigning the documentation browser web UI.

---

## 1. Government Design Principles (11 Principles)

These are the foundational philosophy behind all GOV.UK design decisions.

1. **Start with user needs** -- Do research, analyse data, talk to users. Do not make assumptions. What users ask for is not always what they need.
2. **Do less** -- Concentrate on the irreducible core. Build platforms others can build upon. Reuse, do not reinvent.
3. **Design with data** -- Let data drive decisions, not hunches. Analytics should be built-in, always on, easy to read.
4. **Do the hard work to make it simple** -- Making something look simple is easy. Making something simple to USE is hard. Do not accept "it's always been that way."
5. **Iterate. Then iterate again** -- Start small, release MVPs early, test with actual users. Iteration reduces risk.
6. **This is for everyone** -- Accessible design is good design. If we have to sacrifice elegance, so be it. Think about those who find services hardest to use FROM THE START.
7. **Understand context** -- Design for people, not screens. Consider: library, phone, only familiar with Facebook, never used web before.
8. **Build digital services, not websites** -- Think about all aspects of a service, not just web pages.
9. **Be consistent, not uniform** -- Use same language and patterns wherever possible. Share patterns, but do not stop improving them.
10. **Make things open: it makes things better** -- Share code, designs, ideas, intentions, failures.
11. **Minimise environmental impact** -- Reduce energy, water, materials. Even small improvements help.

### Key takeaway for doc browser
Principles 1, 4, 6, 7, and 9 are most directly applicable. The design should prioritise function over decoration, be accessible first, and achieve consistency without rigidity.

---

## 2. Colour System

### Functional Colours (use by purpose, not by hex value)

| Purpose | Hex | Notes |
|---------|-----|-------|
| **text** | `#0b0c0c` | Near-black, not pure black |
| **secondary-text** | `#484949` | For less prominent text |
| **link** | `#1a65a6` | Darker blue than brand |
| **link-hover** | `#0f385c` | Very dark blue |
| **link-visited** | `#54319f` | Purple |
| **link-active** | `#0b0c0c` | Same as text colour |
| **border** | `#cecece` | Light grey for general borders |
| **input-border** | `#0b0c0c` | Full contrast for form inputs |
| **template-background** | `#f4f8fb` | Very light blue -- html element |
| **body-background** | `#ffffff` | White -- body element |
| **focus** | `#ffdd00` | Bright yellow -- ONLY for focus indication |
| **focus-text** | `#0b0c0c` | Text colour within focus state |
| **error** | `#ca3535` | Red for errors |
| **success** | `#0f7a52` | Green for success |
| **hover** | `#cecece` | Input hover states |
| **brand** | `#1d70b8` | Primary brand blue |
| **surface-background** | `#f4f8fb` | Surface/card background |
| **surface-text** | `#0b0c0c` | Text on surfaces |
| **surface-border** | `#8eb8dc` | Blue-tinted border for surfaces |

### Web Palette Colour Groups

Each group has: primary, tint-25, tint-50, tint-80, tint-95, shade-25, shade-50.

| Group | Primary | Tint-95 (lightest) | Shade-50 (darkest) |
|-------|---------|---------------------|---------------------|
| **Blue** | `#1d70b8` | `#f4f8fb` | `#0f385c` |
| **Green** | `#0f7a52` | `#f3f8f6` | `#083d29` |
| **Teal** | `#158187` | `#f3f9f9` | `#0b4144` |
| **Purple** | `#54319f` | `#f6f5fa` | `#2a1950` |
| **Magenta** | `#ca357c` | `#fcf5f8` | `#651b3e` |
| **Red** | `#ca3535` | `#fcf5f5` | `#651b1b` |
| **Orange** | `#f47738` | `#fef8f5` | `#7a3c1c` |
| **Yellow** | `#ffdd00` | `#fffdf2` | `#806f00` |
| **Brown** | `#99704a` | `#faf8f6` | -- |
| **Black** | `#0b0c0c` | `#f3f3f3` | -- |
| **White** | `#ffffff` | -- | -- |

### Key Colour Rules
- WCAG 2.2 AA minimum contrast ratio required (4.5:1 for text)
- Do NOT assign new meanings to colours
- Colours are functional: use them for their designated purpose
- Do not rely on colour alone to convey information

### Applicability to Dark Mode
GOV.UK does not officially support dark mode, but their colour system gives us the building blocks:
- The tint-95 values (very light backgrounds) invert well to shade-50 values
- `#0b0c0c` (near-black text) becomes light text on dark backgrounds
- Functional colour separation (by purpose) makes theme switching possible
- The `surface-background` / `surface-border` / `surface-text` pattern is already a dark-mode-ready abstraction

---

## 3. Typography / Type Scale

### Font
GOV.UK uses **New Transport** (a custom font). For non-government services, a system font stack or similar sans-serif is appropriate.

### Type Scale (Responsive)

The type scale changes between small screens (<640px) and large screens (>=640px).

**Large screens (>=640px tablet breakpoint):**

| Scale Point | Used by | Font Size | Line Height |
|-------------|---------|-----------|-------------|
| 80 | Exceptional only | 80px | 80px |
| 48 | `govuk-heading-xl` | 48px | 50px |
| 36 | `govuk-heading-l` | 36px | 40px |
| 27 | Exceptional only | 27px | 30px |
| 24 | `govuk-heading-m`, `govuk-body-l` | 24px | 30px |
| 19 | `govuk-heading-s`, `govuk-body` | 19px | 25px |
| 16 | `govuk-body-s` | 16px | 20px |

**Small screens (<640px):**

| Scale Point | Font Size | Line Height |
|-------------|-----------|-------------|
| 80 | 53px | 55px |
| 48 | 32px | 35px |
| 36 | 27px | 30px |
| 27 | 21px | 25px |
| 24 | 21px | 25px |
| 19 | 19px (unchanged) | 25px |
| 16 | 16px (unchanged) | 20px |

### Key Typography Rules
- Line heights are always multiples of 5px for consistent vertical rhythm
- Default body text is 19px (not 16px) -- larger than most systems for legibility
- Lead paragraphs use 24px and should only appear once per page at the top
- Body-small (16px) should be used sparingly
- All headings in sentence case
- CSS outputs in rem/em for better zoom/magnification support

### Heading Hierarchy

**Standard pages (forms, questions):**
- h1: `govuk-heading-l` (36px)
- h2: `govuk-heading-m` (24px)
- h3: `govuk-heading-s` (19px)

**Long-form content pages (documentation, articles):**
- h1: `govuk-heading-xl` (48px)
- h2: `govuk-heading-l` (36px)
- h3: `govuk-heading-m` (24px)

### Heading Captions
For showing context above headings (e.g. section name above page title):
- Caption sits ABOVE the heading in a lighter, smaller style
- Caption classes: `govuk-caption-xl`, `govuk-caption-l`, `govuk-caption-m`
- Can be nested inside h1 for semantic grouping

### How Hierarchy Communicates Importance
1. **Size difference** between heading levels is substantial (48 -> 36 -> 24 -> 19)
2. **Weight**: headings are bold, body is regular
3. **Spacing**: larger headings get more margin above them
4. **Colour**: primary text `#0b0c0c` for headings, `#484949` for secondary/less important text
5. **Captions** (lighter, smaller text above headings) provide context without competing for attention

---

## 4. Spacing System

### Responsive Spacing Scale (adapts at 640px breakpoint)

| Unit | Small screens | Large screens |
|------|--------------|---------------|
| 0 | 0 | 0 |
| 1 | 5px | 5px |
| 2 | 10px | 10px |
| 3 | 15px | 15px |
| 4 | 15px | 20px |
| 5 | 15px | 25px |
| 6 | 20px | 30px |
| 7 | 25px | 40px |
| 8 | 30px | 50px |
| 9 | 40px | 60px |

### Static Spacing Scale (same at all sizes)

| Unit | Value |
|------|-------|
| 0 | 0 |
| 1 | 5px |
| 2 | 10px |
| 3 | 15px |
| 4 | 20px |
| 5 | 25px |
| 6 | 30px |
| 7 | 40px |
| 8 | 50px |
| 9 | 60px |

### Key Spacing Rules
- Base unit is 5px; all spacing is a multiple of 5
- Units 0-3 are the same on all screen sizes
- Units 4-9 compress on small screens
- Consistent vertical rhythm: combine with 5px-multiple line heights

---

## 5. Layout System

### Core Principles
- **Design for small screens first** (mobile-first)
- Default max page width: **1020px**
- **Two-thirds** layout is the recommended default for most content
- Maximum ~75 characters per line for readability
- Never assume specific devices -- design for screen sizes

### Grid System

Available column widths:
- `full` (100%)
- `three-quarters` (75%)
- `two-thirds` (66.66%)
- `one-half` (50%)
- `one-third` (33.33%)
- `one-quarter` (25%)

### Common Layouts for Documentation

**Two-thirds (recommended for long-form content):**
- Main content in two-thirds column
- Keeps line length readable

**Two-thirds + one-third (recommended for doc browser):**
- Main content (document) in two-thirds
- Sidebar (navigation, metadata, related links) in one-third
- This is the most applicable to a documentation browser

**Desktop-specific classes:**
- `-from-desktop` suffix for desktop-only widths
- Can combine with standard classes for tablet breakpoint

### Page Wrapper Structure
1. `govuk-width-container` -- sets max width, no vertical spacing
2. Breadcrumbs/Back link/Phase banner -- inside container, before main
3. `govuk-main-wrapper` on `<main>` -- adds responsive vertical padding

---

## 6. Components Relevant to Documentation Browser

### Breadcrumbs
- Placed at top of page, BEFORE `<main>` element
- Start with 'home', end with parent section (not current page)
- Can collapse on mobile to show only first and last items
- Has inverse variant for dark backgrounds (`govuk-breadcrumbs--inverse`)
- Use when site has hierarchical multi-level structure
- Do NOT use for flat structures or linear journeys

### Tags
- Show status of something (e.g. document category, source type)
- Use adjectives, NOT verbs (so users do not think they are clickable)
- Available colours: grey, green, teal, blue, purple, magenta, red, orange, yellow
- Previously used white-on-dark design but changed because users thought they were buttons
- Now uses lighter background with darker text to avoid button confusion
- Start with fewest statuses needed; add more only if research shows need
- Do NOT rely on colour alone -- always use text labels

### Tables
- Use for comparing information in rows and columns
- NEVER use tables for page layout
- Always include `<caption>` element (works like a heading for the table)
- Right-align numeric columns (`govuk-table__cell--numeric`)
- Use `govuk-table--small-text-until-tablet` for data-heavy tables on mobile
- Width overrides available: one-half, one-quarter, one-third, two-thirds, three-quarters

### Inset Text
- Left-bordered block to differentiate content (quotes, examples, supplementary info)
- Use sparingly -- less effective when overused
- Some users do NOT notice it on complex pages
- Do NOT use for critical information; use Warning Text instead

### Warning Text
- Exclamation icon + bold text for important warnings
- Used for legal consequences or critical actions
- Visually hidden "Warning" text for screen readers

### Details (Expandable)
- Disclosure widget: click link text to reveal hidden content
- For information only some users need (progressive disclosure)
- Less visually prominent than accordion/tabs
- Research shows some users avoid clicking, thinking it navigates away
- Write clear, short, descriptive link text

### Accordion
- Multiple show/hide sections on one page
- Use when users need overview of related sections and can choose relevant ones
- Good for case-working/admin systems with repeat users
- Sections start closed by default; can configure to start open
- "Show all sections" toggle at top
- Remembers open/closed state via session storage
- Do NOT nest accordions inside accordions
- Do NOT put accordions inside tabs or vice versa
- Better for many sections (vertical layout) vs tabs (horizontal, limited)

### Tabs
- Navigate between related sections, one visible at a time
- Best when first section is most relevant for most users
- Good for repeat users (case-working systems)
- Falls back to stacked content with table of contents when JS unavailable
- On small screens, currently shows as stacked content (not tabs)
- Do NOT use as page navigation
- Tab state stored in URL fragment (back button works)
- Include heading inside each tab panel that duplicates tab label

### Notification Banner
- Tell users about something not directly related to page content
- Position immediately before page h1
- Blue (neutral) for service-wide notices
- Green (success) for confirming completed actions
- Use sparingly: evidence shows people often miss them
- Avoid showing more than one per page
- Green banners should be removed when user navigates to new page

### Summary List
- Key-value pairs displayed as a definition list
- Rows with: key, value, optional action links
- Can be wrapped in Summary Cards with titles and card-level actions
- Borders between rows help users scan and associate key with value
- Can remove borders with `govuk-summary-list--no-border` if no actions

### Panel
- Large, prominent container for confirmation/results pages
- Green background with white text
- NEVER use within body content to highlight information
- Keep panel text brief

---

## 7. Links

### Link Styling Rules
- Links are blue (`#1a65a6`) and underlined by default
- Visited links are purple (`#54319f`)
- Hover state: `#0f385c` (very dark blue)
- Active state: `#0b0c0c` (text colour)
- Do NOT include trailing full stops in linked text
- `govuk-link--no-visited-state` for frequently-changing content (dashboards)
- `govuk-link--inverse` for white links on dark backgrounds
- `govuk-link--no-underline` ONLY when context makes linkness obvious (navigation)
- External links: make clear in text, do NOT use external link icons
- New tab links: include "(opens in new tab)" in link text

### How Links Direct Attention
- Underlines are the primary affordance (not just colour)
- Removing underlines is only appropriate in navigation contexts
- Visited state helps users track what they have already seen

---

## 8. Section Breaks

- `govuk-section-break` on `<hr>` elements
- Size modifiers: `--xl`, `--l`, `--m` (control margin size)
- Visibility: `--visible` adds a horizontal line; without it, just margin
- Used to create thematic breaks between content sections

---

## 9. Images and Decoration

### Core Rule: Avoid unnecessary decoration
- Only use images if there is a real user need
- Services usually work best WITHOUT relying on images
- Focus on clear, simple written content first
- Do NOT use generic stock photography
- Do NOT use photography for abstract concepts or emotions
- Icons: avoid in most cases (people interpret them differently)
- Only use icons in systems where users are familiar and return frequently
- Always include visible text labels alongside icons

### Illustration Guidelines (when needed)
- Use as few visual elements as possible
- Flat blocks of colour (no shadows, no gradients)
- Use GOV.UK colour palette
- Consistent style across all illustrations in a service
- Avoid depicting people (risk of exclusion)

---

## 10. Brutalist Web Design Principles

From brutalist-web.design (David Bryant Copeland):

### Philosophy
Derived from architectural "beton brut" (raw concrete). The "materials" of the web are content and the context in which it is consumed. The philosophy centres on HONESTY.

### Seven Core Tenets

1. **Content is readable on all reasonable screens and devices**
   - By default, HTML that uses semantic markup IS readable everywhere
   - Do not break what the browser gives you for free

2. **Only hyperlinks and buttons respond to clicks**
   - Prevent confusion about what is interactive
   - No surprise behaviours

3. **Hyperlinks are underlined and buttons look like buttons**
   - Visual honesty: communicate function through appearance
   - Do not make links look like non-links or vice versa

4. **The back button works as expected**
   - Respect browser conventions
   - Provide reliable "undo" for navigation

5. **View content by scrolling**
   - Scrolling respects user pace
   - Avoid artificial pagination (unless genuinely needed)

6. **Decoration when needed and googaws that do something**
   - Every design element must solve a specific problem
   - No decoration for vanity
   - No unrelated content, misleading links, or sensationalism

7. **Performance is a feature**
   - Fast loading respects bandwidth, battery, time
   - Following the other principles naturally achieves this

### Practical Starting Point
Begin with left-aligned black text on a white background. Apply styling ONLY to solve genuine problems. Embrace semantic HTML.

### Relationship to GOV.UK Design
GOV.UK is frequently cited as the canonical example of brutalist web design in practice:
- Both prioritise content over decoration
- Both treat accessibility as fundamental, not optional
- Both use typography and spacing as primary design tools (not imagery)
- Both distrust icons and decorative elements
- Both embrace HTML as the raw material
- GOV.UK adds a systematic colour and spacing framework on top of brutalist foundations

---

## 11. Dark Mode Considerations

GOV.UK does not officially implement dark mode, but their architecture makes it feasible. Here is how to adapt their system for a dark theme:

### Colour Inversion Strategy

| Light Mode | Dark Mode Equivalent |
|------------|---------------------|
| body-background `#ffffff` | `#0b0c0c` or `#1a1a1a` |
| template-background `#f4f8fb` | `#121820` (shade of blue-95) |
| text `#0b0c0c` | `#f3f3f3` (black tint-95) |
| secondary-text `#484949` | `#cecece` (black tint-80) |
| border `#cecece` | `#484949` |
| surface-background `#f4f8fb` | `#0f385c` (blue shade-50) or `#1a2332` |
| surface-border `#8eb8dc` | `#1d70b8` (blue primary) dimmed |
| link `#1a65a6` | Lighten to tint-25 `#5694ca` |
| link-visited `#54319f` | Lighten to `#7f65b7` (purple tint-25) |
| focus `#ffdd00` | Keep `#ffdd00` (works on dark backgrounds) |
| error `#ca3535` | Keep or lighten slightly |
| success `#0f7a52` | Keep or lighten slightly |

### Principles for Dark Mode Adaptation
1. Use functional colour tokens, NOT raw hex values -- this is what GOV.UK already recommends
2. Maintain WCAG 2.2 AA contrast ratios (4.5:1 minimum) in both modes
3. Reduce brightness of large surface areas; keep accent colours vibrant
4. The yellow focus state (`#ffdd00`) works well on dark backgrounds already
5. Do NOT simply invert all colours -- some (like error red) work in both modes
6. Test with forced-colours/high-contrast modes (Windows High Contrast, etc.)

---

## 12. Visual Hierarchy and Attention Direction

### How GOV.UK Communicates Hierarchy

**1. Typography is the primary tool:**
- Massive size jumps between heading levels (48 -> 36 -> 24 -> 19)
- Bold weight for headings, regular for body
- Lead paragraphs (24px) signal "read this first"
- Body-small (16px) signals "this is supplementary"

**2. Spacing creates structure:**
- Larger spacing above higher-level headings
- Consistent vertical rhythm (5px multiples) creates scannable blocks
- Section breaks (visible `<hr>`) separate major content areas
- Spacing units 7-9 (40-60px) create significant visual separation

**3. Colour is used sparingly and functionally:**
- Near-black text on white: maximum readability, no distraction
- Blue links are the only colour in most body content
- Tags use colour to categorise but never to be the sole indicator
- Borders are light grey (`#cecece`), not attention-grabbing
- The only vivid colour is focus yellow (`#ffdd00`), reserved for keyboard focus

**4. Layout constrains attention:**
- Two-thirds column width limits line length (~75 chars)
- Content does not stretch to fill the screen
- One-third sidebar is clearly secondary (smaller column = less important)
- Maximum width of 1020px prevents content from sprawling

**5. Visual weight hierarchy:**
- Heaviest: Page heading (h1) -- largest, boldest, most spacing
- Heavy: Section headings (h2/h3) -- still bold, substantial size
- Medium: Lead paragraph -- larger body text
- Normal: Body text -- 19px regular weight
- Light: Captions, body-small -- smaller, sometimes lighter colour
- Lightest: Metadata, secondary text in `#484949`

**6. Progressive disclosure:**
- Details component hides secondary info until clicked
- Accordions let users scan section titles before committing to content
- Tabs separate content into clearly labelled views
- This reduces cognitive load on initial page view

**7. Borders and lines direct scanning:**
- Summary list row borders help eyes track across key-value pairs
- Table borders align data for comparison
- Section break lines signal topic changes
- Left border on Inset Text draws attention to supplementary content

### What is NOT used to direct attention
- No drop shadows
- No background gradients
- No rounded corners on content blocks (buttons have minimal rounding)
- No animations or transitions for emphasis
- No hero images or banners
- No icons for decoration
- No colour backgrounds on content sections (except notification banners and panels for specific purposes)

---

## 13. Patterns Applicable to Documentation Browser

### Navigation Pattern (from components research)
- Breadcrumbs at top for hierarchical position
- Sidebar (one-third column) for secondary navigation
- No sidebar navigation on mobile (collapses)
- Tab-based navigation for switching between related views

### Content Display Pattern
- Two-thirds column for document content
- Lead paragraph at top summarises content
- Heading hierarchy creates scannable structure
- Inset text for callouts/quotes within documents
- Section breaks between major topics

### Search/Browse Pattern
- Tags for categorising/filtering documents by source or type
- Summary lists for displaying document metadata (key-value pairs)
- Tables for comparing multiple documents
- Accordion for organising many documents into collapsible categories

### Status Communication Pattern
- Tags with colours for document status/category
- Notification banners for system-level messages (sync status, errors)
- Warning text for critical notices

---

## 14. Summary: Actionable Design Guidance for Documentation Browser

### Typography
- Base body: 19px, line-height 25px
- Use a clean sans-serif (system font stack or Inter/similar)
- Heading scale: 48/36/24/19 on desktop; 32/27/21/19 on mobile
- Line heights always multiples of 5px
- Max ~75 characters per line

### Colour (Light Mode)
- Background: `#ffffff` (body), `#f4f8fb` (surfaces/cards)
- Text: `#0b0c0c` (primary), `#484949` (secondary)
- Links: `#1a65a6` (default), `#54319f` (visited), underlined
- Borders: `#cecece` (general), `#0b0c0c` (input/form borders)
- Brand/accent: `#1d70b8`
- Focus: `#ffdd00`
- Error: `#ca3535`, Success: `#0f7a52`

### Spacing
- Base unit: 5px
- Scale: 0/5/10/15/20/25/30/40/50/60px
- Responsive: units 4-9 compress on mobile

### Layout
- Max width: 1020px
- Main content: two-thirds column
- Sidebar: one-third column
- Mobile-first: single column, content stacks

### Interaction
- Links: underlined, blue, with visited state
- Buttons: look like buttons (not styled links)
- Focus states: thick yellow outline
- Back button must always work
- Progressive disclosure for secondary content

### Decoration
- Minimal to none
- No decorative images, icons, shadows, gradients
- Flat colour blocks only
- Section breaks (horizontal rules) for visual separation
- Left borders for callout/inset content
- Every visual element must serve a specific function
