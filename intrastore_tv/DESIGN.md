---
name: IntraStore TV
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#cac3d9'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#948ea2'
  outline-variant: '#494456'
  surface-tint: '#ccbeff'
  primary: '#ccbeff'
  on-primary: '#350097'
  primary-container: '#6c3bf4'
  on-primary-container: '#e7deff'
  inverse-primary: '#6632ee'
  secondary: '#bdf4ff'
  on-secondary: '#00363d'
  secondary-container: '#00e3fd'
  on-secondary-container: '#00616d'
  tertiary: '#ffb691'
  on-tertiary: '#552000'
  tertiary-container: '#a84700'
  on-tertiary-container: '#ffdbca'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e7deff'
  primary-fixed-dim: '#ccbeff'
  on-primary-fixed: '#1f0060'
  on-primary-fixed-variant: '#4d00d2'
  secondary-fixed: '#9cf0ff'
  secondary-fixed-dim: '#00daf3'
  on-secondary-fixed: '#001f24'
  on-secondary-fixed-variant: '#004f58'
  tertiary-fixed: '#ffdbcb'
  tertiary-fixed-dim: '#ffb691'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#793100'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-hero:
    fontFamily: Space Grotesk
    fontSize: 64px
    fontWeight: '700'
    lineHeight: 72px
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  label-md:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  caption:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  tv-safe-x: 5rem
  tv-safe-y: 3.5rem
  rail-width-collapsed: 6rem
  rail-width-expanded: 18rem
  gutter-shelf: 1.75rem
  card-gap: 1.5rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system targets a 10-foot television viewing experience, designed specifically for lean-back navigation via remote D-pad controllers. The visual language blends high-performance gaming culture with modern digital entertainment, evoking technological power, immersive focus, and vibrant discovery.

The design movement combines **High-Contrast Dark Aesthetic** with **Cybernetic Neon Accents**. Deep obsidian surfaces create an expansive cinematic canvas, allowing electric color accents and glowing focus states to command the user's peripheral and direct vision without causing retinal fatigue in dim living rooms.

Every interaction relies on spatial predictability, deliberate focus management, and immediate tactile visual feedback to ensure navigation feels effortless from 3 meters away.

## Colors

The palette leverages a deep layered dark framework calibrated for OLED and LED television panels:

- **Primary (`#6C3BF4`)**: Electric Royal Purple serves as the dominant brand identifier, driving interactive primary elements, selected category tags, and backdrop accent gradients.
- **Secondary / Accent (`#00E5FF`)**: Cyber Cyan provides high-visibility targeting. It is exclusively applied to active D-pad focus outlines, luminous glow trails, promotional badges, and rating markers.
- **Background & Surfaces**:
  - `Base Canvas`: `#121212` (deepest plane, minimizes panel backlight bleed)
  - `Surface Container Low`: `#181818` (passive card containers, shelf backgrounds)
  - `Surface Container Standard`: `#1E1E1E` (interactive cards, side navigation drawers)
  - `Surface Container High`: `#2A2A2E` (elevated modals, hover previews)
- **Text & Contrast**:
  - `On-Surface / High Emphasis`: `#FFFFFF` (headings, active focus labels)
  - `Medium Emphasis`: `#B4B4C0` (body copy, metadata, secondary chips)
  - `Disabled / Subdued`: `#565666` (inactive indicators, muted icons)

## Typography

Typography is sized and tracked specifically for living-room legibility at 10-foot distances:

- **Space Grotesk** is chosen for headlines, metadata badges, and navigation labels. Its geometric, technical quirks reinforce the gaming and app-store technology persona while remaining razor-sharp on non-Retina 4K/1080p displays.
- **Plus Jakarta Sans** provides humanist balance for descriptions, system warnings, and app specifications. Its open counters ensure blocks of text remain legible without eye strain.
- No body font is scaled below `13px` equivalent (`caption`), and primary descriptive text is fixed at `18px` (`body-lg`) to ensure absolute clarity across all standard television screen calibrations.

## Layout & Spacing

The layout is built for 16:9 native television form factors (1080p base, scaling 2x for 4K / UHD):

- **Overscan TV Safe Zones**: An absolute perimeter margin (`5rem` horizontal, `3.5rem` vertical) is strictly maintained to prevent UI clipping on edge-masking displays.
- **Navigation Architecture**:
  - A vertical left navigation rail sits at the edge. In its resting state, it occupies `6rem` width with centered icons. On D-pad horizontal focus travel into the rail, it expands dynamically to `18rem`, overlaying secondary contextual text.
  - The content area is organized into horizontally scrolling shelves stacked vertically.
- **Spacing Rhythm**:
  - Vertical distance between individual shelf titles and their carousel rows is fixed at `1rem`.
  - Spacing between consecutive shelves is `2.5rem` to prevent vertical visual interference during fast browsing.
  - Inactive cards maintain a `1.5rem` inline gap; focused cards scale outward (`scale(1.08)`) with transform anchors calibrated so adjacent items are not clipped.

## Elevation & Depth

Visual hierarchy on a 10-foot screen relies on luminous contrast and dynamic scale rather than subtle drop shadows:

- **Unfocused Elements**: Live on the baseline container levels (`#1E1E1E`) with low-contrast borders (`1px solid rgba(255, 255, 255, 0.08)`).
- **Active D-Pad Focus State**:
  - **Transform**: Instant or 180ms ease-out scale transform to `1.08x` on cards, `1.05x` on action buttons.
  - **Border**: A 3px crisp perimeter border using Cyber Cyan (`#00E5FF`).
  - **Neon Bloom Glow**: Multi-layered ambient shadow using `0 0 20px rgba(0, 229, 255, 0.45), 0 0 45px rgba(108, 59, 244, 0.30)`.
- **Hero & Detail Backdrop**: A subtle radial gradient emerges behind the focused banner or top shelf: `radial-gradient(circle at top right, rgba(108, 59, 244, 0.25) 0%, rgba(18, 18, 18, 0) 70%)`.
- **System Modals / Dialogs**: Sit at `#2A2A2E` surface elevation over an 85% opacity `#0A0A0C` backdrop scrim with `backdrop-filter: blur(16px)`.

## Shapes

This design system uses a balanced **Rounded** (`level 2`) geometry:

- **Cards & Media Tiles**: Employ `0.5rem` (8px) radius on standard displays, expanding to `0.75rem` when focused to accommodate the outer cyan border without sharp corner distortions.
- **Interactive Control Buttons**: Built with rounded pill profiles (`9999px`) or `0.5rem` soft rectangles, depending on role.
- **Category Chips & Badges**: Small-scale chips utilize `0.5rem` corners to retain clean horizontal alignment beside square app icons.
- **D-Pad Focus Ring**: Must follow the exact outer radius curvature of the host element, offsetting `2px` from the component frame to avoid overlapping internal thumbnail art.

## Components

### 1. TV App Cards
- **Structure**: Aspect ratios 16:9 (video/apps) and 3:4 (games/featured).
- **States**:
  - *Resting*: Dark surface `#1E1E1E`, subtle inner stroke, muted title text (`#B4B4C0`) underneath thumbnail.
  - *Focused*: Card scales to `1.08`, border `3px solid #00E5FF`, cyan/purple dual-layer neon glow. Card title switches to `#FFFFFF` with metadata (category, stars) fading in below.
  - *Pressed*: Scale momentarily drops to `1.03` with high-intensity glow pulse.

### 2. Primary Action Buttons (Get / Buy / Open)
- **Resting**: High-contrast purple background (`#6C3BF4`), white `Space Grotesk` text, `0.5rem` border radius, padding `1rem 2.25rem`.
- **Focused**: Cyber Cyan surface fill (`#00E5FF`), text flips to `#121212` for extreme legibility, accompanied by cyan neon drop-glow (`0 0 25px rgba(0, 229, 255, 0.6)`).

### 3. Navigation Rail
- **Collapsed**: Fixed vertical column along the left safe boundary containing glyph icons (Home, Store, Games, Apps, Search, Settings).
- **Focused Item**: White glowing icon with an active vertical Cyan indicator bar (`4px x 24px`) aligned to the left edge.

### 4. Category & Filter Chips
- **Resting**: Semi-transparent `#1E1E1E` background with `1px` translucent border, text in `#B4B4C0`.
- **Selected**: Solid `#6C3BF4` fill with `#FFFFFF` text.
- **Focused**: Border turns `#00E5FF` with cyan ambient halo.

### 5. Dialog & Detail Modals
- **Surface**: Centered elevated pane (`#2A2A2E`), high-radius corners (`1rem`), containing hero trailer media, screenshot carousel, rating badges, and action buttons.
- **Focus Trap**: Restricts D-pad directional traversal strictly within modal action buttons until the remote 'Back' key event is received.

### 6. Inputs & Search Fields
- **Resting**: Dark input field `#181818` with search glyph and placeholder "Search apps, games, genres...".
- **Focused**: Launches on-screen TV keyboard or voice-input visualizer modal. Border illuminates with Cyan glow, keyboard keys follow identical D-pad focus highlight behaviors.