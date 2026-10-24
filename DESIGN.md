# Novaris design system

Direction: **futuristic intelligence lab, in light**. Luminous ivory-white canvas, white and silver surfaces with layered dimensional depth, near-black ink type, electric blue for action and state, violet as the secondary accent, holographic pastel light for edges and atmosphere. Spectacle lives in the landing hero and the cinematic analysis journey. Working screens (chat, dashboard, report) are calm, dense and precise, with depth and light used to clarify hierarchy.

Tokens live in `src/styles/novaris.css`. Primitives live in `src/components/nv/*`. Fonts load in `src/app/layout.tsx`.

## Principles

1. **Editorial hierarchy.** One dominant headline per view, generous whitespace, strict alignment to a 12-column grid. Asymmetry is deliberate: wide headline column against a narrow evidence column.
2. **One accent per view.** Electric blue marks the primary action, active state, links and focus. Violet is secondary (data series B, a highlighted word, a selected secondary state), never a second primary button and never status.
3. **Depth through light, not glass.** White cards on ivory with layered shadows (`shadow-nv-card`, `shadow-nv-lift` on hover), silver wells, and a holographic 1px ring (`.nv-holo-ring`) reserved for hero surfaces and the focused composer. Backdrop blur only on the sticky header, dialog scrim and journey HUD. No frosted panels everywhere, no neon glow on working screens.
4. **Cite or qualify.** Analysis claims link a file, commit or repo, or are labelled inferred. Progress reflects real work stages, never fake percentages.
5. **Colour is never the only channel.** Status = icon + text + colour.
6. **Motion confirms, never carries.** Every fact is readable with motion off. Hover motion is gated to fine pointers. Reduced motion keeps fades and drops movement.
7. **No template tells.** No rows of identical feature cards with icons in circles, no random gradient blobs, no emoji, no "wall of love", no fake logos or fake metrics.

## Colour

| Role | Token / utility | Value |
|---|---|---|
| Page canvas | `bg-nv-graphite-950` / `--nv-bg` | #fafaf7 |
| Card, panel | `bg-nv-graphite-900` / `--nv-surface` | #ffffff |
| Silver well, input | `bg-nv-graphite-850` | #f1f2f5 |
| Hover tint | `bg-nv-graphite-800` | #f6f7f9 |
| Hairline | `border-nv-graphite-700` | #e6e8ee |
| Border | `border-nv-graphite-600` | #d5d8e0 |
| Control boundary (3:1) | `border-nv-graphite-500` | #868b99 |
| Muted text | `text-nv-graphite-400` | #626775 |
| Primary text | `text-nv-ivory-100` | #14161d |
| Secondary / tertiary text | `text-nv-ivory-200` / `-300` | #3a3e4a / #5a5f6e |
| Accent (links, active, focus, solid fill) | `nv-copper-400` / `nv-copper-500` | #2f54ff |
| Accent hover | `nv-copper-300` | #1f3ee6 |
| Accent wash | `bg-nv-copper-wash` | #eef1ff |
| Text on accent | `text-nv-on-accent` | #ffffff |
| Violet secondary / data B | `nv-violet-400`, `-600`, `bg-nv-violet-wash` | #7a4dff |
| Ion cyan data C / holo highlight | `nv-ion-400` (graphics), text `nv-ion-600`, `bg-nv-ion-wash` | #19b6e6 / #0a7aa3 |
| Status | `nv-{success,warning,danger,info}` + `-wash`, `-edge` | see css |

The `copper` and `graphite` names are historical; they now hold electric blue and ivory/silver neutrals. Use them as the table says.

Gradients: `--nv-gradient-signal` (blue to violet to ion) for a hairline, a single highlighted word (`.nv-gradient-text`) or the journey. `--nv-gradient-holo` (pastel conic) for holographic edges via `.nv-holo-ring`. `--nv-gradient-silver` for silver surfaces. `.nv-aurora` is the soft atmospheric wash for hero and journey backdrops. `.nv-grid-paper` is the fine engineering grid.

## Typography

| Role | Family | Use |
|---|---|---|
| Display + UI | Sora (`font-nv-sans`, `.nv-display`) | Headlines at weight 600, tracking -0.045em; body 400 |
| Editorial accent | Instrument Serif italic (`font-nv-serif`, `<em>` inside `.nv-display`) | One or two words per headline, pull quotes |
| Code, paths, eyebrows | JetBrains Mono (`font-nv-mono`, `.nv-eyebrow`) | |

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
- Libraries: `framer-motion` (UI choreography, springs `{ type: "spring", duration: 0.5, bounce: 0 }`), `gsap` (journey camera and scene timelines only), `three` (raw three.js journey scene), `@xyflow/react` (interactive architecture and relationship graphs). All four load via dynamic import on the screens that use them. Do not add other UI or animation libraries.
- Pause loops off-screen; respect `prefers-reduced-motion` (`useReducedMotion` from framer-motion).

## Accessibility

Contrast: body text 4.5:1, large text and UI boundaries 3:1. Focus ring is the global 2px electric-blue outline (do not remove). Icon-only buttons need `aria-label`. Semantic elements only; no `<div onClick>`. No `<p>` or block content inside `<p>`.
