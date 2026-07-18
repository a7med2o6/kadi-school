---
name: Kadi School Management System
colors:
  surface: '#f5f6fa'
  surface-dim: '#dde0ea'
  surface-bright: '#ffffff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fbfbfd'
  surface-container: '#f0f1f6'
  surface-container-high: '#e9eaf2'
  surface-container-highest: '#e1e3ec'
  on-surface: '#15171f'
  on-surface-variant: '#5b5f70'
  inverse-surface: '#2a2c38'
  inverse-on-surface: '#f2f2f8'
  outline: '#8a8ea3'
  outline-variant: '#e2e4ec'
  surface-tint: '#2563eb'
  primary: '#2563eb'
  on-primary: '#ffffff'
  primary-container: '#1d4ed8'
  on-primary-container: '#eef4ff'
  inverse-primary: '#a5c4ff'
  secondary: '#4f46e5'
  on-secondary: '#ffffff'
  secondary-container: '#6366f1'
  on-secondary-container: '#ffffff'
  tertiary: '#c2410c'
  on-tertiary: '#ffffff'
  tertiary-container: '#ea580c'
  on-tertiary-container: '#fff3ec'
  success: '#16a34a'
  on-success: '#ffffff'
  success-container: '#dcfce7'
  on-success-container: '#14532d'
  error: '#dc2626'
  on-error: '#ffffff'
  error-container: '#fee2e2'
  on-error-container: '#7f1d1d'
  primary-fixed: '#dbe6ff'
  primary-fixed-dim: '#a5c4ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#1d4ed8'
  secondary-fixed: '#e0e0ff'
  secondary-fixed-dim: '#c2c1ff'
  on-secondary-fixed: '#1e1a5e'
  on-secondary-fixed-variant: '#4338ca'
  tertiary-fixed: '#ffe0cc'
  tertiary-fixed-dim: '#ffb787'
  on-tertiary-fixed: '#3a1400'
  on-tertiary-fixed-variant: '#9a3d00'
  background: '#f5f6fa'
  on-background: '#15171f'
  surface-variant: '#e6e7ef'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.375rem
  DEFAULT: 0.625rem
  md: 0.875rem
  lg: 1.25rem
  xl: 1.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
---

## Brand & Style
The design system for this school management platform embodies a premium, enterprise-grade aesthetic that balances academic authority with modern technological efficiency. The style is **modern SaaS admin**: a white sidebar and cards floating on a soft lavender-gray canvas, vivid blue and indigo as the only strong colors on the page, and generous rounded corners throughout.

The interface prioritizes clarity, reducing cognitive load for administrators and educators through generous white space and a structured information hierarchy. The emotional response is one of "calm control"—it feels reliable, fast, and sophisticated. The design must feel equally native in both English (LTR) and Arabic (RTL) contexts, ensuring that layout logic is mirrored perfectly without losing the premium editorial feel.

## Colors
The palette is rooted in a vivid **Blue + Indigo** pairing on a near-white canvas.

- **Primary (`#2563EB`):** every primary action — buttons, links, the active nav indicator's icon tone, focus rings.
- **Secondary (`#4F46E5`, indigo):** the active-nav pill background, and the auth screen's brand panel. Used as a *fill*, not for text-on-white.
- **Neutrals:** the page background is a very light lavender-gray (`#F5F6FA`); the sidebar and every card sit on top of it in pure white (`#FFFFFF`), which is what creates the layered, "floating cards" look — the background must never be white itself, or cards stop reading as elevated.
- **Semantic badges (Success / Error):** high-vibrancy tone for text (`#16A34A` / `#DC2626`) paired with a matching ~10%-opacity background wash for pill badges (status chips, +/- change indicators). Never fill a badge solid.
- **Dark Mode:** the system shifts to a deep charcoal and navy foundation. Surfaces use a slightly lighter elevation color (`#161B22`) against the background (`#0B0E14`) to maintain the layered aesthetic; primary/secondary switch to their `-fixed-dim` tones for contrast on dark.

## Typography
This design system utilizes **Inter** exclusively. Headings are bold (700) and tight-tracked — noticeably heavier than a typical SaaS dashboard, which is what gives screens like "Good morning, Admin" and page titles their confident, editorial weight. Body and label text stay at 400–500 weight for contrast against the bold headings.

For **Arabic (RTL)** support, the system utilizes Inter's modern character sets or falls back to a high-quality system sans-serif that matches Inter's x-height. All label styles used for buttons or navigation should be vertically centered with precision.

## Layout & Spacing
The layout follows a **Fluid Grid** model with fixed maximum widths for content readability.

- **Shell:** fixed-width sidebar (white) + fluid main column. Main column content sits on the lavender-gray page background; every piece of content within it (cards, tables, the topbar) is a white surface.
- **Grid:** A 12-column grid is used for desktop (1440px max), collapsing to 8 columns for tablet and 4 columns for mobile.
- **Rhythm:** An 8px linear scale drives the spacing logic. 16px (md) is the standard padding for components, while 24px (lg) is the standard gutter between cards.
- **Bi-Directionality:** All horizontal spacing (padding-left, margin-right, etc.) must be implemented using logical properties (`padding-inline-start`, `margin-inline-end`) to ensure seamless RTL/LTR switching.

## Elevation & Depth
Depth is created using a combination of **Tonal Layering** and **Ambient Shadows**.

1.  **Base Layer:** The lavender-gray page background (`#F5F6FA`).
2.  **Surface Layer:** White cards with a very soft, diffused shadow (`0px 4px 20px rgba(0,0,0,0.04)`) and a hairline border (`#E2E4EC`) — the shadow does most of the separation work, the border is a low-contrast finishing touch, not the primary boundary.
3.  **Overlay Layer:** Modals and dropdowns use a solid white surface with a stronger shadow (not glassmorphic transparency) so data-dense dialogs (forms with selects, tables) stay fully legible.

In Dark Mode, shadows are replaced by subtle inner borders and tonal shifts to prevent the UI from looking "muddy."

## Shapes
The shape language is generously rounded — noticeably softer than a typical dense admin tool, which is what gives this dashboard its friendly, modern feel despite the data density.
- **Standard Radius:** 10px (`rounded`) for inputs and buttons.
- **Large Radius:** 20px (`rounded-lg`) for cards, containers, and modals.
- **Pill:** Used for status badges, the active-nav indicator, and stat-card icon wells.

## Components

### Buttons
- **Primary:** Solid Blue (`#2563EB`) background, white text, `rounded` corners.
- **Secondary:** White background with a light gray border (`outline-variant`).
- **Ghost:** No background or border; uses primary text color.
- **Interaction:** 200ms ease-in-out transition on hover, slightly darkening the background.

### Input Fields
- **Default:** White background, 1px border (`outline-variant`), `rounded` corners.
- **Focus:** Border becomes Primary Blue with a soft blue outer glow (box-shadow).
- **RTL:** Icons inside inputs (like search magnifying glasses) must flip positions from left to right.

### Cards
- **Container:** White background, `rounded-lg` (20px) radius, hairline border, ambient shadow per Elevation.
- **Header:** Bold title + muted subtitle, no divider — spacing alone separates header from body.

### Stat Cards
- Icon in a small tinted rounded-square well (10%-opacity of the stat's semantic color), a trend/status badge pill top-right, a large bold number, and a muted label — this exact four-part pattern is used for every top-of-page metric card.

### Chips / Badges
- **Style:** Low-saturation background (~10% opacity of the semantic color) with high-saturation text of the same color. Fully rounded (pill).

### Data Tables
- Row identity (name) pairs an avatar with a two-line name + email/subtext stack, never plain text alone.
- Status/category values render as badge pills, not plain text.
- Actions live in a trailing column, icon-only.

### Navigation (Sidebar)
- **Structure:** White vertical sidebar on the left (LTR) or right (RTL), fixed width, sitting beside the lavender-gray main column.
- **Active State:** A solid indigo (`secondary`, `#4F46E5`) pill fill behind the icon+label, white text/icon on top — not a subtle wash, a confident solid fill.
- **Footer:** a user identity card (avatar, name, role, sign-out) pinned to the bottom of the sidebar.

### Auth Screens
- Split-screen: a solid primary-blue panel (logo, bold headline, supporting copy, optional decorative graphic) on one side, and the form on a white panel on the other. The blue panel and the form panel are always full-bleed, no page chrome around them.
