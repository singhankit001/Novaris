## Functional DAG

```
tokens (grid, gutters, breakpoints) ─┐
templates T-* ───────────────────────┼─> per-surface layout at 360 / 768 / 1440 ─> gate: no horizontal scroll, 44px targets, flow readable with motion off
primitives (nv) ─────────────────────┘
```

# Layout specs: desktop 1440, tablet 768, mobile 360

Grid: 4 columns (below 768, 16px gutter), 8 columns (768-1279, 24px gutter), 12 columns (1280+, 32px gutter). Page max 1360. Reading column 68ch. Side rail 240px from 1024. Header 56px. Bottom bar 56px plus safe area below 1024. Use `h-dvh` / `min-h-dvh`, never `h-screen`.

## Landing `/` (T-Landing)
- Desktop: asymmetric. Display headline spans cols 1-8, left aligned, below it the search Combobox (cols 1-7, 48px field). Cols 9-12 hold a tall evidence specimen (EvidencePanel with sample data, labeled "Sample") offset 96px lower than the headline. Under the fold: a three-row "how a claim is sourced" strip (claim, citation, measured/inferred), real public stats, latest blog rows.
- Tablet: headline cols 1-8, search full width, specimen drops under search at full width.
- Mobile: headline (clamp scale), search field with 48px height, suggestions list as a full-width sheet under the field, specimen collapsed to a 3-line summary with "Show full scope".
- Cinematic: hero scene may animate (650ms entrance, slow ambient). Reduced motion: static poster, no loop.

## Profile (T-Workspace, profile variant)
- Desktop: header row (identity + EvidencePanel summary line, with "Details" expanding the full panel). Below, Tabs: Overview, Repositories, Activity, Chat. Overview is 12 columns: cols 1-8 narrative with Citation chips, cols 9-12 sticky rail of MetricGroup and Sparkline. Chat is a split: reading column + composer.
- Tablet: single column, rail becomes a MetricGroup row above the narrative.
- Mobile: tabs scroll horizontally, MetricGroup 2 columns, composer pinned above the bottom area, EvidencePanel summary line opens a bottom sheet with the full panel.

## Repository workspace (T-Workspace)
- Desktop: three panes. Left 280px file tree (roving tabindex tree, DataRow density), center flexible reading/code pane (Tabs: Chat, Code, Architecture, Security), right optional 320px evidence rail (citations used in the current answer). Resizable divider with keyboard arrows (step 16px).
- Tablet: two panes. Tree moves into a left Drawer (button "Files"). Evidence rail becomes a bottom disclosure.
- Mobile: one pane. Tabs at top; "Files" opens a bottom sheet; the composer sits above the bottom bar; CodeBlock scrolls horizontally inside its own focusable region.

## Architecture
- Desktop: diagram canvas cols 1-9, text outline cols 10-12 (always present, doubles as the accessible alternative). Mode switch "Illustrative / From repository data" is a visible Tabs-like segmented control with a Notice when illustrative.
- Tablet: canvas full width, outline below.
- Mobile: static 2D diagram, pinch zoom, outline first by default.

## Security scan and report (T-Report)
- Desktop: left 4 columns sticky EvidencePanel (scope, scan mode, date, limits) + StackedBar of severity counts; right 8 columns findings list. Each finding is an expandable row: title, severity StatusPill, BasisTag, Citation, CodeBlock excerpt, verification state, actions Menu.
- Tablet: EvidencePanel on top (collapsed to summary), findings below.
- Mobile: findings are full-width rows; filters in a bottom sheet; share and export in the header Menu.

## Dashboard, history, repos, stars, settings (T-Dashboard)
- Desktop: SideNav 240px + content (cols 1-12). Overview: MetricGroup (4), Recent scans DataTable, Sparkline row.
- Tablet: SideNav hidden; header has a Menu; content 8 columns.
- Mobile: MobileNav bottom bar (Overview, Scans, Repos, Starred, Settings); DataTable switches to DataRow stack.

## Trending / explore (T-Catalog)
- Desktop: filter rail cols 1-3, list cols 4-12 (DataRow, 56px rows).
- Tablet: filters in a right Drawer.
- Mobile: search Combobox on top, topic chips (44px) scroll horizontally, list stack.

## Blog and admin (T-Article, T-Admin)
- Article: 68ch column, display headline across cols 1-9, byline in mono eyebrow, figures may break out to 10 columns.
- Admin: Dashboard shell; editor is two columns (fields / preview) on desktop, tabs (Edit, Preview) below 1024.

## Marketing and legal (T-Marketing, T-Article)
- Desktop: alternating asymmetric blocks (text cols 1-5 / figure cols 7-12, then swap). No identical three-card rows.
- Mobile: single column, figure first only when it carries evidence.

## States (T-State)
Centered, max 32rem, left aligned text with an icon square, a mono status code, display headline, explanation, one primary action. Same at all widths.
