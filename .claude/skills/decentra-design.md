---
name: decentra-design
description: Use when building any frontend UI component, page, or visual element in the DeCentra project. Enforces the established design system — colors, typography, component classes, and patterns. MUST be followed for all frontend work.
---

# DeCentra Design System

This is a **rigid** skill. Follow it exactly. Do not introduce new color palettes, fonts, or component patterns.

## Two Themes

The app has two visual contexts. Use the right one.

### Dark Theme (Landing page, Auth page, overlays on photos)

| Token | Value |
|-------|-------|
| Background | `#06080f` |
| Text primary | `text-white` |
| Text secondary | `text-white/50` – `text-white/70` |
| Text muted | `text-white/25` – `text-white/35` |
| Gold accent | `#f0c24c` |
| Gold hover | `#f0c24c/90` |
| Gold glow | `rgba(240,194,76,0.06)` – `rgba(240,194,76,0.22)` |
| Borders | `ring-1 ring-white/10` |
| Surface (cards) | `bg-white/[0.03]` – `bg-white/[0.05]` |
| Input bg | `bg-white/[0.04]` |
| Input focus | `focus:ring-[#f0c24c]/40 focus:bg-white/[0.06]` |
| Backdrop | `backdrop-blur-xl` or `backdrop-blur-md` |
| Overlay on photos | `bg-[#06080f]/60` – `bg-[#06080f]/70` |
| Bottom fade | `linear-gradient(to bottom, transparent, #06080f)` |
| Gold radial glow | `radial-gradient(ellipse 80% 60% at 50% 70%, rgba(240,194,76,0.06), transparent 70%)` |

### Light Theme (Map page, control panels, popups)

Uses CSS variables defined in `index.css`:

| Variable | Value | Usage |
|----------|-------|-------|
| `--bg` | `#f3efe4` | Page background |
| `--surface` | `#fbf8f1` | Card/panel background |
| `--ink` | `#172033` | Primary text |
| `--ink-soft` | `#5f6c83` | Secondary text |
| `--blue` | `#2f67bf` | Accent |
| `--blue-strong` | `#1f4f9c` | Active accent |
| `--yellow` | `#f0c24c` | Highlight (slider thumb, sun icon) |
| `--yellow-strong` | `#c68a11` | Emphasis highlight |
| `--line` | `rgba(31,79,156,0.16)` | Borders |
| `--line-strong` | `rgba(31,79,156,0.3)` | Active borders |
| `--shadow` | `0 18px 40px rgba(23,32,51,0.08)` | Card shadows |

## Typography

| Role | Font | Class |
|------|------|-------|
| Display headings | Unbounded | `font-display` |
| Body text | Plus Jakarta Sans | (default, inherited) |
| Mono labels/tags | Space Mono | `ui-mono` |

**Rules:**
- Headings: `font-display`, tight tracking `tracking-[-0.04em]`
- Labels/tags: `ui-mono text-[9px]`–`text-[11px]` uppercase `tracking-[1px]`–`tracking-[1.2px]`
- Body: default font, `text-sm` or `text-[12.5px]`
- NEVER use Inter, Roboto, Arial, or system fonts

## Component Classes (Light Theme)

Use these existing CSS classes — do NOT recreate them with inline styles:

| Class | Purpose |
|-------|---------|
| `map-panel` | Card container: frosted glass, border, shadow, blur |
| `map-input` | Input field with border, hover/focus transitions |
| `map-chip` | Small icon container |
| `map-segment` | Toggle button with active state `.is-active` |

```html
<!-- Card -->
<div class="map-panel rounded-xl p-3">...</div>

<!-- Input -->
<div class="map-input flex items-center gap-2 rounded-lg px-3 py-2.5">
  <input class="w-full bg-transparent text-sm text-[var(--ink)] outline-none" />
</div>

<!-- Toggle buttons -->
<button class="map-segment rounded-lg px-3 py-2">Option A</button>
<button class="map-segment is-active rounded-lg px-3 py-2">Option B</button>
```

## Dark Theme Components

For dark pages (landing, auth), build components inline using tokens above:

```html
<!-- Dark card -->
<div class="rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.08] backdrop-blur-xl p-8">

<!-- Dark input -->
<input class="w-full rounded-xl bg-white/[0.04] ring-1 ring-white/10 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:ring-[#f0c24c]/40 focus:bg-white/[0.06]" />

<!-- Gold CTA button -->
<button class="rounded-xl bg-[#f0c24c] px-4 py-3 text-sm font-semibold text-[#06080f] hover:bg-[#f0c24c]/90 shadow-[0_4px_20px_rgba(240,194,76,0.2)]">

<!-- Ghost pill button -->
<button class="rounded-full bg-white/5 ring-1 ring-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-white hover:bg-white/8">

<!-- Nav bar container -->
<div class="flex items-center gap-1 rounded-full bg-white/5 px-1 py-1 ring-1 ring-white/10 backdrop-blur-md">
```

## Photo Overlays

When placing content over background images:

```html
<div class="relative">
  <img src="..." class="absolute inset-0 h-full w-full object-cover" />
  <!-- Dark overlay -->
  <div class="absolute inset-0 bg-[#06080f]/65" />
  <!-- Gold glow -->
  <div class="absolute inset-0" style="background: radial-gradient(ellipse 80% 60% at 50% 70%, rgba(240,194,76,0.06) 0%, transparent 70%)" />
  <!-- Bottom fade -->
  <div class="absolute inset-0" style="background: linear-gradient(to bottom, transparent 0%, transparent 50%, rgba(6,8,15,0.7) 80%, #06080f 100%)" />
  <!-- Content -->
  <div class="relative z-10">...</div>
</div>
```

## Animations

Use existing keyframes from `index.css`:

```css
/* Staggered entrance */
.animate-fade-slide-in-1  /* delay 0.1s */
.animate-fade-slide-in-2  /* delay 0.25s */
.animate-fade-slide-in-3  /* delay 0.4s */
.animate-fade-slide-in-4  /* delay 0.55s */
```

For new animations, use CSS `transition-all duration-150`–`duration-250` with `ease` or `cubic-bezier(0.32,0.72,0,1)`.

## Icon Library

Use `lucide-react`. Standard sizes: `h-3 w-3` (small), `h-3.5 w-3.5` (default), `h-4 w-4` (medium), `h-5 w-5` (large).

## Don'ts

- Don't use `border` — use `ring-1 ring-{color}` pattern
- Don't use shadows on dark theme — use `ring` + subtle `bg-white/` layering
- Don't use generic gradients (purple, blue-to-green, etc.)
- Don't add new fonts or color palettes
- Don't use `bg-gray-*` or `text-gray-*` — use `white/{opacity}` (dark) or `var(--ink*)` (light)
- Don't use `rounded-md` — prefer `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-full`
