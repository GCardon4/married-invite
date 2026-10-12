---
name: Vibrant Flora & Nuptials
colors:
  surface: '#fcf9f7'
  surface-dim: '#dcd9d8'
  surface-bright: '#fcf9f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f1'
  surface-container: '#f0edeb'
  surface-container-high: '#eae8e6'
  surface-container-highest: '#e5e2e0'
  on-surface: '#1b1c1b'
  on-surface-variant: '#564146'
  inverse-surface: '#30302f'
  inverse-on-surface: '#f3f0ee'
  outline: '#897176'
  outline-variant: '#dcbfc5'
  surface-tint: '#a6335d'
  primary: '#841544'
  on-primary: '#ffffff'
  primary-container: '#a3305b'
  on-primary-container: '#ffc6d3'
  inverse-primary: '#ffb1c5'
  secondary: '#a53c00'
  on-secondary: '#ffffff'
  secondary-container: '#ff6a1e'
  on-secondary-container: '#591d00'
  tertiary: '#39483c'
  on-tertiary: '#ffffff'
  tertiary-container: '#506053'
  on-tertiary-container: '#c8dac9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd9e1'
  primary-fixed-dim: '#ffb1c5'
  on-primary-fixed: '#3f001b'
  on-primary-fixed-variant: '#871846'
  secondary-fixed: '#ffdbcd'
  secondary-fixed-dim: '#ffb598'
  on-secondary-fixed: '#360f00'
  on-secondary-fixed-variant: '#7e2c00'
  tertiary-fixed: '#d5e7d6'
  tertiary-fixed-dim: '#b9cbbb'
  on-tertiary-fixed: '#101f14'
  on-tertiary-fixed-variant: '#3b4a3e'
  background: '#fcf9f7'
  on-background: '#1b1c1b'
  surface-variant: '#e5e2e0'
typography:
  display:
    fontFamily: Playfair Display
    fontSize: 56px
    fontWeight: '600'
    lineHeight: 64px
    letterSpacing: -0.02em
  display-mobile:
    fontFamily: Playfair Display
    fontSize: 38px
    fontWeight: '600'
    lineHeight: 46px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
  headline-md:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '500'
    lineHeight: 36px
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 30px
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 26px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system embodies a contemporary romantic aesthetic rooted in joyful floral arrangements, sun-drenched celebrations, and effortless modern elegance. Built for digital wedding invitations and guest management dashboards, it bridges high-end editorial stationery with clean, high-utility operational software.

The emotional signature is celebratory, warm, and graceful. It avoids cold transactional minimalism in favor of lush, expressive chromatic warmth balanced by structured typographical discipline. Subtle gold nuances and botanical sage ground the high-energy juxtaposition of deep plum, fuchsia, and warm tangerine.

## Colors

The palette directly reflects natural floral cascades:

- **Primary (`#a3305b`)**: Deep plum/magenta. Used for high-emphasis interactive elements, structural buttons, primary brand marks, and prominent active navigation items.
- **Accent Rose (`#d3367b`)**: Vibrant fuchsia. Serves as a dynamic highlight token for notification badges, interactive states, and RSVP confirmation states.
- **Secondary (`#ff6a1e`)**: Warm tangerine orange. Used for secondary CTAs, key celebratory callouts, calendar badges, and celebratory moments.
- **Tonal Peach (`#fe9b7b`)**: Soft petal peach. Employed for secondary button hover states, delicate pill badges, tag containers, and background highlights.
- **Tertiary Botanical (`#4a5a4d`)**: Dark sage green. Forms the backbone of high-contrast readable typography, secondary icons, and structural divider accents, grounding the vibrant floral tones.
- **Neutral Canvas (`#faf7f5`) & Card Neutral (`#fffdfa`)**: Warm ivory and subtle cream backdrops replacing cold, sterile pure whites to emulate high-grade cotton stationery.

## Typography

The typographic hierarchy pairs the literary sophistication of **Playfair Display** with the clear, humanist geometric legibility of **Plus Jakarta Sans**. 

- **Display & Headlines:** Reserved for wedding invitations, couple names, date anchors, and major dashboard card headers. It carries editorial weight and delicate contrast.
- **Titles, Body, & Labels:** Powered by Plus Jakarta Sans to maintain swift legibility within data tables, RSVP trackers, guest status lists, seating charts, and forms.
- **Letter Spacing:** Tighter negative tracking is applied to large serif headings to maintain typographic density, while positive tracking is applied to small UI badges and functional labels.

## Layout & Spacing

This design system uses a 12-column fluid grid system on desktop (max width: 1280px) and a single-column reflow structure on mobile devices:

- **Desktop (min-width: 1024px):** 12 columns with `24px` (`1.5rem`) gutters and `32px` (`2rem`) outer margin. Dashboard widgets comfortably span 3, 4, 6, or 12 columns.
- **Tablet (768px – 1023px):** 8 columns with `16px` gutters and `24px` outer canvas margins.
- **Mobile (< 768px):** 4 columns or single stack, with `16px` (`1rem`) outer margins and gutters.

Layouts preserve generous negative space around ceremonial invitation components, shifting into compact, structured card compositions for attendee tables and dietary requirement panels.

## Elevation & Depth

Visual hierarchy combines warm ambient shadows, tonal layering, and fine gold/neutral hairline dividers:

- **Canvas to Card Layering:** Surfaces rest on the base neutral (`#faf7f5`). Containers, cards, and interactive modal surfaces use ivory-white (`#fffdfa`).
- **Ambient Tinted Shadows:** Shadows utilize warm plum-botanical tints instead of neutral grey or black. Standard elevation uses `box-shadow: 0 8px 24px -4px rgba(74, 90, 77, 0.08), 0 2px 6px -1px rgba(163, 48, 91, 0.04)`.
- **Gold-Accented Borders:** Premium invitation cards and VIP guest tags employ an ultra-fine border: `1px solid rgba(224, 182, 116, 0.35)` or `1px solid rgba(163, 48, 91, 0.1)`.
- **Overlays & Modals:** RSVP drawers and guest detail flyouts incorporate a warm backdrop blur with high diffusion: `backdrop-filter: blur(12px)` and an ivory tint `rgba(250, 247, 245, 0.75)`.

## Shapes

The design system implements a rounded aesthetic (Level 2) that mirrors soft archways, floral contours, and handcrafted paper goods:

- **Base Corner Radius (`rounded`):** `8px` (`0.5rem`) for form inputs, table rows, and secondary action buttons.
- **Medium / Large (`rounded-lg`):** `16px` (`1rem`) for dashboard cards, guest summary containers, and menu modules.
- **Extra Large (`rounded-xl`):** `24px` (`1.5rem`) for hero invitation containers and modal dialogs.
- **Architectural Arches:** Dedicated decorative preview headers can apply half-oval top radii (`border-top-left-radius: 9999px; border-top-right-radius: 9999px`) to evoke mirrored floral ceremony arches.
- **Pills (`rounded-full`):** Reserved for category filters, diet flags, and status badges.

## Components

### Buttons
- **Primary:** Background `#a3305b`, text `#ffffff`, border radius `10px`, padding `12px 24px`. Hover activates a subtle lift and background shift toward vibrant fuchsia `#d3367b`.
- **Secondary / RSVP Affirmative:** Background `#ff6a1e`, text `#ffffff`, radius `10px`. Hover transitions to `#e0550f`.
- **Tertiary / Botanical:** Outlined with `1.5px solid #4a5a4d`, text `#4a5a4d`, background transparent. Hover reveals a soft sage wash `rgba(74, 90, 77, 0.08)`.

### Chips & Status Badges
- **Confirmed Guest:** Background `rgba(74, 90, 77, 0.12)`, text `#2f3a31`, border `1px solid rgba(74, 90, 77, 0.25)`.
- **Pending RSVP:** Background `rgba(254, 155, 123, 0.2)`, text `#a03b1e`, border `1px solid rgba(255, 106, 30, 0.3)`.
- **Dietary / VIP:** Background `rgba(211, 54, 123, 0.1)`, text `#a3305b`, border `1px solid rgba(211, 54, 123, 0.25)`.
- **Shape:** Pill-shaped (`rounded-full`) with `label-sm` uppercase tracking.

### Cards & Panels
- Background `#fffdfa` with a subtle inset or perimeter stroke `1px solid rgba(163, 48, 91, 0.08)`.
- Padding `space-lg` (`24px`).
- Feature cards may incorporate a delicate dual gradient top accent line: `linear-gradient(90deg, #a3305b, #ff6a1e)`.

### Input Fields & Controls
- **Inputs:** Ivory fill (`#faf7f5`), border `1.5px solid rgba(74, 90, 77, 0.25)`, text `#4a5a4d`, radius `8px`. Active focus shifts border to `#a3305b` with a soft glow `box-shadow: 0 0 0 3px rgba(163, 48, 91, 0.15)`.
- **Checkboxes & Radios:** Colored in `#a3305b` when checked. Unchecked state presents a botanical border `#4a5a4d`.

### Lists & Tables (Guest Tracker)
- Striped with `#fffdfa` and `#faf7f5`.
- Row hover states reveal soft peach-rose tint `rgba(254, 155, 123, 0.08)`.
- Dividers use ultra-thin borders `1px solid rgba(74, 90, 77, 0.1)`.