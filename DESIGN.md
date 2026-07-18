---
name: Kadi School Management System
colors:
  surface: '#faf8ff'
  surface-dim: '#d9d9e5'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fe'
  surface-container: '#ededf9'
  surface-container-high: '#e7e7f3'
  surface-container-highest: '#e1e2ed'
  on-surface: '#191b23'
  on-surface-variant: '#434655'
  inverse-surface: '#2e3039'
  inverse-on-surface: '#f0f0fb'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#4b41e1'
  on-secondary: '#ffffff'
  secondary-container: '#645efb'
  on-secondary-container: '#fffbff'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#e2dfff'
  secondary-fixed-dim: '#c3c0ff'
  on-secondary-fixed: '#0f0069'
  on-secondary-fixed-variant: '#3323cc'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#faf8ff'
  on-background: '#191b23'
  surface-variant: '#e1e2ed'
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
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
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
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
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
The design system for this school management platform embodies a premium, enterprise-grade aesthetic that balances academic authority with modern technological efficiency. Drawing inspiration from high-performance tools like Linear and Stripe, the style is **Minimalist-Professional** with subtle **Glassmorphic** accents.

The interface prioritizes clarity, reducing cognitive load for administrators and educators through generous white space and a structured information hierarchy. The emotional response is one of "calm control"—it feels reliable, fast, and sophisticated. The design must feel equally native in both English (LTR) and Arabic (RTL) contexts, ensuring that layout logic is mirrored perfectly without losing the premium editorial feel.

## Colors
The palette is rooted in a "Deep Blue" foundation to signal trust and stability. 

- **Primary & Secondary:** A sophisticated blend of Blue and Indigo is used for interactive states and brand accents. 
- **Neutrals:** In light mode, we use a very light gray (#F9FAFB) for page backgrounds to allow white cards to "pop" with depth.
- **Dark Mode:** The system shifts to a deep charcoal and navy foundation. Surfaces use a slightly lighter elevation color (#161B22) against the background (#0B0E14) to maintain the layered aesthetic.
- **Semantic Colors:** Success, Warning, and Danger colors use standard high-vibrancy tones but are paired with low-opacity background washes for "badge" styles to maintain the minimal look.

## Typography
This design system utilizes **Inter** exclusively to achieve a systematic, utilitarian, and modern feel. The hierarchy is defined by tight tracking on headlines and generous leading on body text to ensure readability during long administrative sessions.

For **Arabic (RTL)** support, the system utilizes Inter’s modern character sets or falls back to a high-quality system sans-serif that matches Inter's x-height. Headlines should use "Semi-Bold" (600) rather than "Bold" (700) to maintain the elegant, high-end SaaS feel. All label styles used for buttons or navigation should be vertically centered with precision.

## Layout & Spacing
The layout follows a **Fluid Grid** model with fixed maximum widths for content readability. 

- **Grid:** A 12-column grid is used for desktop (1440px max), collapsing to 8 columns for tablet and 4 columns for mobile.
- **Rhythm:** An 8px linear scale drives the spacing logic. 16px (md) is the standard padding for components, while 24px (lg) is the standard gutter between cards.
- **Bi-Directionality:** All horizontal spacing (padding-left, margin-right, etc.) must be implemented using logical properties (`padding-inline-start`, `margin-inline-end`) to ensure seamless RTL/LTR switching.

## Elevation & Depth
Depth is created using a combination of **Tonal Layering** and **Ambient Shadows**.

1.  **Base Layer:** The light gray background (#F9FAFB).
2.  **Surface Layer:** White cards with a very soft, diffused shadow (0px 4px 20px rgba(0,0,0,0.03)). 
3.  **Overlay Layer:** Modals and dropdowns use **Glassmorphism**. They feature a semi-transparent white background (80% opacity) with a 12px backdrop blur and a 1px low-contrast border (#E5E7EB).

In Dark Mode, shadows are replaced by subtle inner borders and tonal shifts to prevent the UI from looking "muddy."

## Shapes
The shape language is "Softly Geometric." 
- **Standard Radius:** 8px (rounded-md) for smaller elements like inputs and buttons.
- **Large Radius:** 12px (rounded-xl) for cards, containers, and modals.
- **Pill:** Used exclusively for status badges (e.g., "Active", "Pending").

The large 12px+ corner radius on cards provides a friendly, approachable character that contrasts with the precise, professional typography.

## Components

### Buttons
- **Primary:** Solid Blue (#2563EB) background, white text. Subtle 1px top-inner-border for a tactile feel.
- **Secondary:** White background with a light gray border (#D1D5DB).
- **Ghost:** No background or border; uses primary text color.
- **Interaction:** 200ms ease-in-out transition on hover, slightly darkening the background.

### Input Fields
- **Default:** White background, 1px border (#D1D5DB), 8px corner radius.
- **Focus:** 1px border becomes Primary Blue (#2563EB) with a 3px soft blue outer glow (box-shadow).
- **RTL:** Icons inside inputs (like search magnifying glasses) must flip positions from left to right.

### Cards
- **Container:** White background, 12px radius, 1px subtle border (#F3F4F6), and the ambient shadow defined in Elevation.
- **Header:** Simple 1px bottom divider with 16px padding.

### Chips / Badges
- **Style:** Low-saturation background (10% opacity of the semantic color) with high-saturation text of the same color. Fully rounded (pill).

### Navigation (Sidebar)
- **Structure:** Vertical sidebar on the left (LTR) or right (RTL). 
- **Active State:** A subtle background wash (#EFF6FF) and a 2px vertical "accent bar" on the lead edge of the menu item.