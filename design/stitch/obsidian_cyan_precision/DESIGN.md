---
name: Obsidian Cyan Precision
colors:
  surface: '#111317'
  surface-dim: '#111317'
  surface-bright: '#37393d'
  surface-container-lowest: '#0c0e11'
  surface-container-low: '#1a1c1f'
  surface-container: '#1e2023'
  surface-container-high: '#282a2d'
  surface-container-highest: '#333538'
  on-surface: '#e2e2e6'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e2e2e6'
  inverse-on-surface: '#2f3034'
  outline: '#849495'
  outline-variant: '#3b494b'
  surface-tint: '#00dbe9'
  primary: '#dbfcff'
  on-primary: '#00363a'
  primary-container: '#00f0ff'
  on-primary-container: '#006970'
  inverse-primary: '#006970'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#f8f4ff'
  on-tertiary: '#1000a9'
  tertiary-container: '#d7d6ff'
  on-tertiary-container: '#494bd7'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#7df4ff'
  primary-fixed-dim: '#00dbe9'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#111317'
  on-background: '#e2e2e6'
  surface-variant: '#333538'
typography:
  display-hero:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 52px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Geist
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 26px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 22px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.005em
  code-inline:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  code-block:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
  label-ui:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xxs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

This design system targets modern software engineers, technical founders, and product designers building on next-generation web infrastructure. The visual tone is uncompromising, disciplined, and hyper-focused—evoking the speed of terminal execution, the tactile confidence of production-grade developer tooling, and the surgical clarity of high-performance IDEs.

The aesthetic fuses technical minimalism with layered obsidian surfacing. Rather than decorative distractions or diffused neon washouts, the system utilizes pure near-black tonal architecture punctuated by electric cyan highlights. Micro-interactions are instantaneous and mechanical, prioritizing clarity, dense data presentation, and rapid keyboard-driven navigation.

## Colors

The palette is engineered specifically for deep dark mode ergonomics, minimizing ocular fatigue over extended development sessions while maintaining pinpoint visual hierarchy.

- **Obsidian Foundations:**
  - Base canvas: `#0B0D10` (absolute substrate)
  - Surface tier 1 (Sidebars, panel backdrops): `#0F1217`
  - Surface tier 2 (Cards, code blocks, active modules): `#151921`
  - Surface tier 3 (Hover overlays, elevated popovers, floating toolbars): `#1C222D`

- **Structural Outlines:**
  - Subtle perimeter line: `#232B38` (default component borders, layout dividers)
  - Interactive perimeter line: `#2E3848` (hover states, selected container contours)

- **Chromatics & Accents:**
  - **Primary (`#00F0FF`):** Electric cyan used exclusively for primary intent, active compilation anchors, telemetry highlights, and dominant focus cursors. Never used for massive flooded fills.
  - **Secondary / Success (`#10B981`):** Precision emerald for verified deployments, zero-error lint checks, and active service health.
  - **Focus / Command (`#6366F1`):** Electric indigo dedicated to command palettes, inline AI suggestion highlights, and secondary tokens.
  - **Warning (`#F59E0B`):** Pure amber for build warnings, resource limits, and non-blocking runtime deprecations.
  - **Critical (`#EF4444`):** Rose red for failed pipelines, syntax breaks, and destructive actions.

- **Monochrome Text Spectrum:**
  - Primary text: `#F1F5F9` (high legibility)
  - Secondary text: `#94A3B8` (metadata, labels, unselected tabs)
  - Muted text: `#64748B` (keyboard shortcuts, placeholder text, gutter line numbers)

## Typography

Typography acts as an instrument of spatial order and structural hierarchy. Headings and primary UI labels utilize Geist for its neutral, highly geometric vertical metrics and ultra-crisp edge rendering on high-density displays.

For functional developer contexts—including code output, runtime logs, git commit hashes, file pathways, status chips, and shortcut badges—JetBrains Mono provides zero-ambiguity character differentiation. Tabular figures (`tnum`) must remain enabled across all numerical dashboards and monitoring graphs to eliminate jitter during active updates.

## Layout & Spacing

The spatial engine is built on a tight, compact rhythm tailored for high-density IDE viewports and split-panel workspaces.

- **Layout Structure:**
  - Multi-pane application frame containing a 48px to 56px global utility rail, a collapsible 240px navigation/tree pane, and a dynamic split-pane center stage (editor/canvas) bound by persistent 1px hairpins.
  - Full-canvas documentation and dashboard views utilize a 12-column fluid grid locked to a max width of 1440px with 1rem gutters.
- **Form-Factor Adaptations:**
  - **Desktop (1024px+):** Independent scroll panes, persistent secondary telemetry rails, flexible horizontal-vertical split panels.
  - **Tablet (768px - 1023px):** Sidebars collapse to icon-only rails or slide-over drawer sheets. Workspace splits collapse from horizontal to stacked vertical tabs.
  - **Mobile (< 768px):** Single active viewport view with a bottom-anchored navigation sheet and swipe-navigable workspace tabs. Outer padding drops to `margin-mobile` (1rem).

## Elevation & Depth

Visual depth is achieved primarily through dark-on-dark surface stacking and 1px crisp separation, rather than ambient dropshadows or heavy blurs.

1. **Substrate (Level 0):** Canvas root at `#0B0D10` with zero elevation.
2. **Panel Layer (Level 1):** Main sidebars and secondary splits at `#0F1217`, demarcated exclusively by a right or left 1px border of `#232B38`.
3. **Card & Inset Surface (Level 2):** Workspace canvases, cards, and input panels at `#151921` with an enclosing `#232B38` hairline.
4. **Transient Floating Overlays (Level 3):** Dropdown menus, modal dialogs, and command palettes hover at `#1C222D`. These surfaces receive a restrained, technical shadow: `0 8px 32px -4px rgba(0, 0, 0, 0.65), 0 0 0 1px #2E3848`.
5. **Backdrop Blur Discipline:** Translucency is applied strictly to global sticky headers and the floating quick-switch bar using `rgba(15, 18, 23, 0.75)` paired with a tight `backdrop-filter: blur(8px)`. Diffuse aesthetic blurs are strictly avoided to ensure rendering efficiency and crisp reading conditions.

## Shapes

The design system enforces a soft, precision-engineered geometric profile with `roundedness: 1`:

- **Atomic Controls (Inputs, Buttons, Badges, Tabs):** `0.25rem` (4px). Clean, razor-sharp turns that mirror high-end mechanical instruments.
- **Mid-Tier Modules (Cards, Code Blocks, Modals):** `0.5rem` (8px, `rounded-lg`).
- **Outer Modals & Window Panes:** `0.75rem` (12px, `rounded-xl`).
- **Status Pills & Avatar Circles:** Fully rounded (`rounded-full`) reserved strictly for live runtime status indicators and user avatars.

## Components

### Buttons
- **Primary:** High-contrast solid `#00F0FF` background with `#0B0D10` bold text. Subtle inner highlight. On hover, brightness shifts upward with a subtle glow: `box-shadow: 0 0 16px -2px rgba(0, 240, 255, 0.35)`.
- **Secondary:** Surface `#151921`, 1px border `#232B38`, text `#F1F5F9`. Hover transitions surface to `#1C222D` and border to `#2E3848`.
- **Ghost/Tertiary:** Transparent background, text `#94A3B8`. Hover introduces `#151921` and text `#F1F5F9`.
- **Height & Padding:** Standard height is 32px (dense) or 36px (standard), horizontal padding `space-md` (12px).

### Input Fields & Monospace Editors
- **Surface:** `#0F1217` background with a continuous `#232B38` border. Text in `#F1F5F9` with placeholder in `#64748B`.
- **Focus State:** 1px border sharpens to `#00F0FF` accompanied by a crisp `0 0 0 1px #00F0FF` focus ring. No wide diffuse halos.
- **Prefix / Suffix:** Monospace JetBrains Mono tags (e.g., `devora/api:`, `v1.2`) embedded at `#151921` background with `#64748B` typography.

### Status Chips & Badges
- **Format:** Micro-height (20px), padding `2px 8px`, rounded 4px, font `label-code` (JetBrains Mono, 11px).
- **Variants:**
  - *Active Deploy / Live:* Background `rgba(16, 185, 129, 0.1)`, text `#10B981`, border `1px solid rgba(16, 185, 129, 0.25)`. Prepended with a 5px solid emerald dot.
  - *Compiling / Processing:* Background `rgba(0, 240, 255, 0.1)`, text `#00F0FF`, border `1px solid rgba(0, 240, 255, 0.25)`.
  - *Warning:* Background `rgba(245, 158, 11, 0.1)`, text `#F59E0B`, border `1px solid rgba(245, 158, 11, 0.25)`.

### Tab Strips & Navigation Rails
- **Tab Bar:** Flush horizontal rail separated by a 1px bottom border `#232B38`.
- **Tab Item:** Height 34px, text `#94A3B8`, interactive hover `#F1F5F9`. Active tab exhibits an elevated surface `#151921`, active border-top or active bottom indicator of 2px `#00F0FF`, and text `#F1F5F9`.

### Cards & Container Panels
- **Anatomy:** Surface `#151921`, 1px border `#232B38`, radius `0.5rem`.
- **Interactive Card:** When hoverable, the border transitions seamlessly from `#232B38` to `#2E3848`, with an optional top edge highlight gradient (`linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.4), transparent)`).

### Command Palette & Quick Search
- Centered modal, max-width 640px, surface `#0F1217`, border `1px solid #2E3848`, corner radius `0.75rem`.
- Instant search input with integrated shortcut triggers (`⌘K`, `Esc`) displayed in `label-code` keycaps. Selected menu list item features surface `#1C222D` with a left indicator mark in `#00F0FF`.

### Checkboxes & Switches
- **Checkbox:** 14px × 14px square, radius 3px, border 1px `#2E3848`, background `#0F1217`. Checked state triggers `#00F0FF` fill with `#0B0D10` geometric checkmark.
- **Switch:** 32px width, 18px height track at `#1C222D`. Thumb is a 14px `#F1F5F9` disk that slides smoothly to an active `#00F0FF` track state.