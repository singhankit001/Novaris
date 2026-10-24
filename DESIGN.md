# Novaris design system

Direction: **ivory paper, ink type, cobalt signal**. A light, editorial, quietly luxurious product: warm ivory canvas, white cards with soft layered depth, near-black ink type, one cobalt accent for action and state, an ember highlight used sparingly for emphasis. Spectacle lives in two places only: the landing hero and the analysis journey. Working screens (chat, dashboard, report) are calm, dense and precise.

Tokens live in `src/styles/novaris.css`. Primitives live in `src/components/nv/*`. Fonts load in `src/app/layout.tsx`.

## Principles

1. **Editorial hierarchy.** One dominant headline per view, generous whitespace, strict alignment to a 12-column grid. Asymmetry is deliberate: wide headline column against a narrow evidence column.
2. **One accent per view.** Cobalt marks the primary action, active state, links and focus. Ember is a highlight (a word, a data series, a single badge), never a second button colour and never status.
3. **Depth through light, not glass.** White cards on ivory with layered warm shadows (`shadow-nv-card`, `shadow-nv-lift` on hover). Backdrop blur only on the sticky header and dialog scrim. No glassmorphism panels, no neon glow.
4. **Cite or qualify.** Analysis claims link a file, commit or repo, or are labelled inferred. Progress reflects real work stages, never fake percentages.
5. **Colour is never the only channel.** Status = icon + text + colour.
6. **Motion confirms, never carries.** Every fact is readable with motion off. Hover motion is gated to fine pointers. Reduced motion keeps fades and drops movement.
7. **No template tells.** No rows of identical feature cards with icons in circles, no purple-to-pink gradient blobs, no emoji, no "wall of love", no fake logos or fake metrics.

## Colour

| Role | Token / utility | Value |
|---|---|---|
| Page canvas | `bg-nv-graphite-950` / `--nv-bg` | #faf8f3 |
| Card, panel | `bg-nv-graphite-900` / `--nv-surface` | #ffffff |
| Sunken well, input | `bg-nv-graphite-850` | #f4f1ea |
| Hover tint | `bg-nv-graphite-800` | #f7f5ef |
| Hairline | `border-nv-graphite-700` | #ebe6db |
| Border | `border-nv-graphite-600` | #dcd5c6 |
| Control boundary (3:1) | `border-nv-graphite-500` | #8b8474 |
| Muted text | `text-nv-graphite-400` | #6a6658 |
| Primary text | `text-nv-ivory-100` | #15171d |
| Secondary / tertiary text | `text-nv-ivory-200` / `-300` | #3c3f48 / #5d6070 |
| Accent (links, active, focus, solid fill) | `nv-copper-400` / `nv-copper-500` | #2a3ff0 |
| Accent hover | `nv-copper-300` | #1d2fd1 |
| Accent wash | `bg-nv-copper-wash` | #eef0ff |
| Text on accent | `text-nv-on-accent` | #ffffff |
| Ember highlight / data B | `nv-ember-400`, text `nv-ember-600`, `bg-nv-ember-wash` | #f0542d / #b8371a |
| Violet data C | `nv-violet-400`, `bg-nv-violet-wash` | #7c5cff |
| Status | `nv-{success,warning,danger,info}` + `-wash`, `-edge` | see css |

The `copper` and `graphite` names are historical; they now hold cobalt and ivory neutrals. Use them as the table says.

Gradients: `--nv-gradient-signal` (cobalt to violet to ember) for a hairline, a single highlighted word (`.nv-gradient-text`) or the journey. `.nv-aurora` is the soft atmospheric wash for hero and journey backdrops. `.nv-grid-paper` is the fine engineering grid.

## Typography

| Role | Family | Use |
|---|---|---|
| Display + UI | Geist (`font-nv-sans`, `.nv-display`) | Headlines at weight 600, tracking -0.035em |
| Editorial accent | Instrument Serif italic (`font-nv-serif`, `<em>` inside `.nv-display`) | One or two words per headline, pull quotes |
| Code, paths, eyebrows, numbers in tables | Geist Mono (`font-nv-mono`, `.nv-eyebrow`) | |

All three are SIL OFL 1.1, self-hosted by `next/font`.

Scale (fluid): `text-nv-display-xl` up to 7rem, `-lg` up to 4.5rem, `-md` up to 2.875rem, `text-nv-title`, `text-nv-lead`, `text-nv-body` 15px, `text-nv-small` 13px, `text-nv-micro` 12px. `text-balance` on headings, `text-pretty` on paragraphs, `.nv-num` on every metric.

## Shape, depth, spacing

- Radius: `rounded-nv-xs` 6, `-sm` 10 (controls), `-md` 14 (inputs, small cards), `-lg` 20 (cards, panels), `-xl` 28 (hero surfaces, composer). Pills use `rounded-full`.
- Elevation: `shadow-nv-xs` (controls), `shadow-nv-card` (cards), `shadow-nv-lift` (hover), `shadow-nv-popover`, `shadow-nv-overlay`, `shadow-nv-accent` (primary button). `.nv-card` = surface + hairline + radius-lg + card shadow. `.nv-lift` = hover lift on fine pointers.
- Spacing: Tailwind 4px steps. Section rhythm on marketing pages: `py-24 md:py-32`. Page width `max-w-[var(--nv-page-max)]` (1280) with `px-[var(--nv-gutter)]`.
- Touch targets 44px minimum (`min-h-11`).

## Motion

- Easing: `ease-nv-out` for enter/exit, `ease-nv-in-out` for on-screen moves, `ease-nv-drawer` for sheets.
- Durations: micro 140ms, small 220ms, large 450ms, scene 900ms. UI stays under 300ms; dialogs up to 500ms; the journey and hero are the only long sequences.
- Libraries already installed: `framer-motion` (UI choreography, springs `{ type: "spring", duration: 0.5, bounce: 0 }`), `three` (journey scene). Do not add GSAP, R3F or other animation dependencies.
- Pause loops off-screen; respect `prefers-reduced-motion` (`useReducedMotion` from framer-motion).

## Accessibility

Contrast: body text 4.5:1, large text and UI boundaries 3:1. Focus ring is the global 2px cobalt outline (do not remove). Icon-only buttons need `aria-label`. Semantic elements only; no `<div onClick>`. No `<p>` or block content inside `<p>`.
