# Novaris design foundation

Direction: **precision engineering observatory**. Deep graphite, warm ivory type, one restrained oxidized-copper accent, and status colors that never borrow from the accent. Calm working screens; spectacle only on the landing page and meaningful transitions. Evidence is the main subject of every analysis screen.

Files: tokens `src/styles/novaris.css`; primitives `src/components/nv/*`; workbench `/design-system` (`NOVARIS_WORKBENCH=1` in production, always on in dev); layouts and route map in `docs/design/`.

## 1. What replaces what

Nothing from the previous UI carries over visually: no cyan-purple glow, cursor glow, floating 3D background, bento feature cards, code streams, marquees or wall of love. Data hooks, server actions, APIs, URLs and auth behavior are retained behind new components. See `docs/design/migration-map.md`.

## 2. Principles

1. **Scope before conclusion.** Any analysis shows identity, repositories included (n of total), date range, freshness, collection limits, and which statements are measured vs inferred, before findings.
2. **Cite or qualify.** A claim links a file (path and lines) or commit, or is tagged Inferred / Not available.
3. **Only chart what we hold.** Commit counts, language bytes, finding counts, scan history. No developer rankings, composite scores, personality or founder-potential claims.
4. **Color is never the only channel.** Status = icon + text + color. Chart legends repeat values.
5. **One accent per view.** Copper marks action, active state and evidence edges. Patina is data series B only.
6. **Understandable without animation.** Motion confirms, never carries information.
7. **Asymmetry with intent.** Wide display headline against a narrow evidence column; uneven grids; no rows of identical cards.

## 3. Tokens

Raw values are CSS custom properties `--nv-*`. Tailwind v4 utilities are exposed with an `nv-` name prefix through `@theme inline`.

| Group | Tokens (utility form) |
|---|---|
| Graphite | `bg-nv-graphite-{950,900,850,800,700,600,500,400}` |
| Ivory | `text-nv-ivory-{50,100,200,300}` |
| Copper | `nv-copper-{300,400,500,600,700,wash}` |
| Patina | `nv-patina-{400,600}` |
| Status | `nv-{success,warning,danger,info}`, `-wash`, `-edge` |
| Type | `font-nv-display`, `font-nv-sans`, `font-nv-mono`; sizes `text-nv-display-{xl,lg,md}`, `text-nv-title`, `text-nv-body`, `text-nv-small`, `text-nv-micro` |
| Radius | `rounded-nv-{xs,sm,md,lg}` = 2, 4, 6, 10 px |
| Shadow | `shadow-nv-popover`, `shadow-nv-overlay` (overlays only) |
| Layout vars | `--nv-gutter` (16/24/32), `--nv-page-max` 1360px, `--nv-measure` 68ch, `--nv-touch` 44px |
| Helpers | `.nv-num` tabular figures, `.nv-eyebrow` mono caption, `.nv-display` editorial heading, `.nv-skeleton`, `.nv-spin`, `.nv-rise`, `.nv-fade` |

Surfaces: page `graphite-950`; panel `900`; raised and popover `800`; sunken (inputs, wells) `850`; hairlines `700`; control boundaries `500` (3:1). Elevation is a tone step plus a hairline; shadows exist only for overlays. No glow.

Spacing: 4px base (4, 8, 12, 16, 24, 32, 48, 64, 96). Use Tailwind spacing steps; no custom spacing tokens.

Scope: wrap every redesigned surface in `data-nv-root` (sets background, text, font stacks, selection, focus ring). The font face variables must be defined on the same element or an ancestor, which is why the stacks resolve inside `[data-nv-root]`.

## 4. Typography and font licensing

| Role | Family | License | Source |
|---|---|---|---|
| Editorial display | Fraunces (variable, optical size axis) | SIL OFL 1.1 | `next/font/google` |
| Interface text | Geist | SIL OFL 1.1 | `next/font/google` |
| Code, paths, hashes, eyebrows | Geist Mono | SIL OFL 1.1 | `next/font/google` |

OFL permits commercial use, embedding and self-hosting (next/font self-hosts at build). Do not sell the font files on their own. Ship each family's license text in the repository `LICENSES/` or notices page before launch (not yet done; see gaps).

Exact snippet (root layout; currently in `src/app/design-system/layout.tsx`):

```tsx
import { Fraunces, Geist, Geist_Mono } from "next/font/google";

const display = Fraunces({ subsets: ["latin"], variable: "--nv-font-display-face", axes: ["opsz"], display: "swap" });
const sans = Geist({ subsets: ["latin"], variable: "--nv-font-sans-face", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--nv-font-mono-face", display: "swap" });

// <body className={`${display.variable} ${sans.variable} ${mono.variable}`}> with data-nv-root on the app wrapper
```

Scale: Display XL `clamp(2.75rem, 1.6rem + 5.2vw, 5.75rem)`, Display LG up to 4rem, Display MD up to 2.5rem, Title 22px, Body 15px / 1.55, Small 13px, Micro 12px. Display uses weight 400, tight tracking (-0.02em), line height 1.02. Body measure 68ch. Every number in a metric, table or chart uses `.nv-num`. Use `text-balance` on headings and `text-pretty` on paragraphs.

## 5. Contrast (computed, WCAG 2.x)

All pairs are measured live in `/design-system` (section Color) from `contrast.ts`; the same numbers were verified with an independent script. Needs: text 4.5, large text 3, UI boundary and focus 3.

| Foreground on background | Use | Ratio |
|---|---|---|
| ivory-100 on graphite-900 | body | 15.24 |
| ivory-100 on graphite-800 | body on raised | 13.47 |
| ivory-50 on graphite-950 | headings | 17.65 |
| ivory-200 on graphite-900 / 800 | secondary | 11.86 / 10.48 |
| ivory-300 on graphite-900 / 800 | metadata | 7.72 / 6.83 |
| graphite-400 on graphite-900 / 800 | muted, placeholder | 6.17 / 5.45 |
| copper-400 on graphite-900 / 800 | link, accent text | 6.96 / 6.16 |
| copper-300 on copper-wash | citation chip | 7.76 |
| graphite-950 on copper-400 / 500 | primary button label | 7.31 / 5.38 |
| success / warning / danger / info on graphite-900 | status text | 8.90 / 9.61 / 6.83 / 7.68 |
| status on its wash | notices | 7.66 / 8.05 / 6.14 / 6.75 |
| graphite-500 on graphite-900 / 800 | control boundary (UI) | 3.94 / 3.48 |
| copper-400, patina-400 on graphite-900 | chart series (UI) | 6.96 / 6.71 |
| ivory-50 on graphite-950 / 900 | focus ring (UI) | 17.65 / 16.82 |

All pass. Disabled controls are exempt from contrast (WCAG) but stay legible at 45% opacity. `prefers-contrast: more` raises hairlines, borders and secondary text one step. `forced-colors` is respected for the progress bar; other components rely on borders and text so they survive forced colors.

## 6. Layout

Grids: 4 / 8 / 12 columns at 360 / 768 / 1440 (breakpoints md 768, lg 1024 side rail appears, xl 1280 for 12 columns). Gutters 16 / 24 / 32. Page max 1360. Header 56px. Touch targets 44px minimum with visible spacing. Full specs per surface: `docs/design/layouts.md`. Use `min-h-dvh`.

## 7. Interaction matrix

| Primitive | Pointer | Keyboard | Touch | Disabled | Async/error |
|---|---|---|---|---|---|
| Button / IconButton | hover, active tones | Enter, Space, focus ring | 44px, `touch-manipulation` | native `disabled`, 45% | `loading`: spinner, `aria-busy`, activation blocked, still focusable |
| Input / Textarea | hover border | Tab, native | 44px+ | native | `error` text `role=alert`, `aria-invalid`, `aria-describedby` |
| Combobox | hover sets active, click selects | Down/Up wrap, Home/End, Enter, Esc (close, then clear), Tab | options 44px, mousedown prevented so blur does not drop the tap | native | `loading`, `error`, empty text inside the listbox; live region announces count |
| Tabs | click | Left/Right wrap, Home/End, roving tabindex, disabled skipped | scroll strip, 44px | native | panel can hold any state |
| Dialog / Drawer / Sheet | backdrop click, close button | showModal trap, Esc, focus returns to opener | bottom sheet on mobile | n/a | `destructive` -> `alertdialog` |
| Menu | click, outside press | Enter/Space/Down open, arrows, Home/End, type-ahead, Esc returns focus | 44px items | `aria-disabled`, skipped by arrows | n/a |
| Tooltip | hover | focus shows, Esc hides | tap focuses trigger | n/a | never sole carrier of information |
| DataRow | whole row link, hover | one tab stop | 56px | `aria-disabled`, no link | n/a |
| Citation | link when `href` | focus ring | 32px chip, 44px with surrounding row spacing | span when no href | n/a |
| Nav (Site/Side/Mobile) | hover, `aria-current` | skip link, roving not needed | drawer under md, bottom bar under lg | n/a | n/a |

Verified in browser (Playwright, Chromium): combobox type/arrow/Enter, tabs arrows and End skipping disabled, menu open/arrows/Esc focus return, dialog trap and focus return, reduced-motion zeroes animation duration, no horizontal overflow at 360, 768 or 1440.

## 8. Primitives (`src/components/nv`)

`button.tsx` Button, IconButton; `button-styles.ts` buttonClasses (server-safe link styling); `field.tsx` Input, Textarea; `combobox.tsx` Combobox; `tabs.tsx` Tabs; `dialog.tsx` Dialog, Drawer; `menu.tsx` Menu; `tooltip.tsx` Tooltip; `badge.tsx` Badge, StatusPill, BasisTag; `notice.tsx` Notice; `skeleton.tsx` Skeleton, LoadingRegion, Spinner, IndeterminateProgress; `states.tsx` EmptyState, ErrorState, UnauthorizedState, NotFoundState; `data.tsx` Metric, MetricGroup, DataRow, DataTable; `evidence.tsx` Citation, EvidencePanel; `code-block.tsx` CodeBlock; `charts.tsx` Sparkline, BarList, StackedBar; `nav.tsx` Wordmark, SiteHeader, SideNav, MobileNav, AppShell, Breadcrumbs, Footer; `panel.tsx` Panel; helpers `cn.ts`, `contrast.ts`, `tokens.ts`.

Import files directly (no barrel).

## 9. Motion specification

| Tier | Duration | Easing | Use |
|---|---|---|---|
| micro | 120-220ms (`--nv-dur-micro` 140, `--nv-dur-small` 220) | `--nv-ease-out` | hover, press, tabs, menus, notices |
| large | 350-650ms (`--nv-dur-large` 450, `--nv-dur-scene` 650) | `--nv-ease-in-out` | panel and route transitions; scene only on landing and atlas |

Easing tokens: `--nv-ease-out cubic-bezier(.2,.7,.2,1)`, `--nv-ease-in-out cubic-bezier(.65,0,.35,1)`, `--nv-ease-spring-lite` for gesture release only. Animate `transform` and `opacity` only. No `ease-in`, no scale-from-zero. Hover motion gated by `(hover: hover) and (pointer: fine)` when added.

Reduced motion (`prefers-reduced-motion: reduce`): every animation and transition collapses to near zero duration; skeleton shimmer becomes a flat fill; indeterminate bar becomes a static half-opacity bar with its text label; dialogs appear without slide; landing scene shows a static poster; atlas shows the 2D fallback with no camera travel, tilt, parallax or auto-rotate. State changes use crossfade at most. Using Motion (framer-motion 12): wrap the app in `MotionConfig reducedMotion="user"`, and check `useReducedMotion()` before any camera or parallax logic.

Loading: indeterminate only, with a phase label; never a percentage unless the server reports a real count (then show "48 of 212 files").

## 10. Phase 4 placeholder: repository atlas

Owner: separate engineer, `src/components/atlas/**`. Visual language:
- **Strata:** layered horizontal bands for modules or directories (graphite-900 to 800 tone steps, 1px hairlines), files as small rectangles sized by bytes or line count (only when measured).
- **Edges:** copper-400 lines connect relations that have evidence (an import, a call, a co-change) and link to a Citation. Relations without evidence are not drawn.
- **Labels:** ivory-100 mono 12px, direct labels on strata, never a legend of color-only meaning.
- **Two modes, always labeled:** "From repository data" (every node and edge traceable to a file or commit) and "Illustrative" (landing and marketing only, carries a visible Illustrative tag and a Notice-style caption).
- **Interaction:** hover/focus highlights a node and its cited edges; keyboard traverses a text outline in parallel (arrow keys move through the outline, selection focuses the node); touch uses tap to select, a bottom sheet for details.
- **Three.js rules:** render on demand, dispose geometry/material/texture/renderer on unmount, pause when off-screen, cap pixel ratio at 2.
- **2D fallback:** SVG strata layout with the same data and labels, used for reduced motion, no WebGL, mobile by default, and print.

## 11. Evidence model (UI contract)

`EvidencePanel` props: identity, repos `{included, total, excluded?}`, dateRange, freshness, limits[], measured[], inferred[], uncertainty?. Every analysis route must pass real values for each field; if a field cannot be known, pass an honest string ("Not recorded"), never a guess. `Metric` requires `source`. `Citation` kinds: file (path, line range, repo) and commit (short sha). `BasisTag`: Measured, Inferred, Not available.

## 12. Integration notes for the lead

1. In root `globals.css`: add `@import "../styles/novaris.css";` after `@import "tailwindcss";`. Until then `src/app/design-system/workbench.css` imports tailwind and the tokens for the workbench alone (it duplicates preflight; delete it after integration).
2. Move the three `next/font` declarations to the root layout, add the variable classes to `<body>`, add `data-nv-root` to the app wrapper, remove `CursorGlow` and the legacy providers' visual layers.
3. Delete the workbench wrapper's `fixed inset-0 z-50` mask once the root chrome is gone.
4. `Providers` currently runs `SessionProvider`; in the workbench it logs a session fetch error because `NEXTAUTH` env is not configured in this checkout. That is unrelated to the design system.

## 13. Gate checklist

- Visibly unrelated to the old UI: dark graphite/ivory/copper, serif display, no glow. Met in workbench; routes pending.
- Every route mapped: `docs/design/migration-map.md`, one row per page route in the inventory plus not-found, error and loading.
- Core flows readable without animation: motion is confirmation only; reduced-motion verified on skeleton duration.
- Contrast: all defined pairs pass (section 5).
- Keyboard and mobile: verified in workbench (section 7). Full-route review waits for migration.

## 14. Known gaps

- Fonts license files not yet added to the repo; verify OFL text per family.
- Tree view (file tree with roving tabindex and expand/collapse) is specified (layouts) but not a primitive yet.
- Toast is not provided; sonner exists in the legacy layout. Errors adjacent to their source are the default; a restyled toast wrapper is needed for non-form success feedback.
- Markdown renderer (`EnhancedMarkdown`) and Mermaid theming still need nv styling (diagram palette tokens are `--diagram-*` in old CSS).
- CodeBlock is a frame; syntax highlighting (react-syntax-highlighter) is not wired to nv tokens yet.
- Tooltip is not collision-aware (always above); keep text short.
- Menu and Combobox popovers do not flip near viewport edges.
- Reduced-transparency media query not yet used (header uses 95% opacity, no blur beyond `backdrop-blur-sm`).
- No automated axe run; checks were manual plus Playwright keyboard scripts.
