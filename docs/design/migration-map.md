## Functional DAG

```
inventory.md routes ─┐
DESIGN.md templates ─┼─> map each route -> template + primitives ─> per-route rebuild brief ─> gate: every route mapped, flow readable without motion
nv primitives list ──┘
```

# Route migration mapping

Source of routes: scratchpad `inventory.md` (read-only code pass). URL, auth behavior and server data stay as they are; only the presentation layer is replaced. "Keep" means retain the existing data hook, server action or API call behind the new component.

Templates (defined in `layouts.md`):
- **T-Landing**: cinematic marketing hero + search. Only `/`.
- **T-Marketing**: SiteHeader, editorial column (68ch measure) + wide figures, Footer.
- **T-Workspace**: full-height three-pane (tree / reading column / chat) collapsing to tabs and sheets.
- **T-Report**: two-column, evidence rail + findings, print-friendly.
- **T-Dashboard**: AppShell with SideNav (lg) or MobileNav (below lg).
- **T-Catalog**: filter rail + DataRow list.
- **T-Article**: single 68ch column, display headline.
- **T-Admin**: Dashboard shell with a persistent "admin" status pill.
- **T-State**: centered State primitive (empty, error, unauthorized, not-found).

## Pages

| URL | Template | Primitives | Migration notes |
|---|---|---|---|
| `/` | T-Landing | SiteHeader, Combobox (search), EvidencePanel (sample), Metric, BarList, Citation, Footer | Keep: `fetchGitHubData`, `getRepoSuggestions`, `/chat?q=` push, `getPublicStats`, blog/catalog reads. Search is the hero. Show only real public stats (query count) with source and date; drop marquee, wall of love, fake logos. Hero scene may animate; every fact also in text. |
| `/chat` (profile) | T-Workspace (profile variant) | Tabs (Overview, Repositories, Activity, Chat), EvidencePanel, Metric group, DataTable (repos), Sparkline (weekly commits), BarList (languages), Citation, IndeterminateProgress (phase labels), Dialog (sign-in for Thinking mode) | Keep: ProfileLoader data calls, sessionStorage cache, `/api/chat/profile` NDJSON stream, quota. Overview opens with EvidencePanel (identity, repos included of total, date range, freshness, limits). No score, rank or personality claim. Chat answers render Citation chips; measured vs inferred via BasisTag. |
| `/chat` (repo) | T-Workspace | Tabs, file tree (DataRow list, roving tabindex tree), Drawer (tree on tablet/mobile), CodeBlock, Citation, Combobox (code search), Textarea (chat), IndeterminateProgress, Notice (rate limit, auth gate), Dialog (scan options) | Keep: RepoLoader, `fetchRepoFiles`, `analyzeRepoFiles`, `searchRepositoryCode`, `/api/chat/repo` SSE, `/api/chat/run`, quota, `/api/chat` persistence. Architecture tab hosts the Mermaid diagram plus a text outline alternative (Phase 4 atlas slot). Security tab hosts quick/deep scan trigger. Deep scan and Thinking need login: show UnauthorizedState inline, not a blocking modal. |
| `/chat` error | T-State | ErrorState, UnauthorizedState, Notice | Keep `chat/error.tsx` logic (auth + rate-limit aware). Add retry and a quote-able detail line. |
| `/dashboard` | T-Dashboard | AppShell, SideNav, MobileNav, MetricGroup, DataRow (recent scans), Sparkline, EmptyState, Skeleton | Keep `/api/dashboard/stats`, `/api/dashboard/scans`. Only counts the API returns. Loading skeletons mirror rows; failure shows ErrorState with retry (current code only toasts). |
| `/dashboard/scans` | T-Dashboard | DataTable, StatusPill, Drawer (filters), EmptyState | Keep `/api/dashboard/scans`. Status by icon+text. |
| `/dashboard/repos` | T-Dashboard | DataRow list, Input (filter), Button (grant private access), Notice (scope), ErrorState | Keep `/api/dashboard/user-repos` and `signIn("github", repo scope)`. Add visible error UI (current: console only). Server-side gate stays; client `return null` replaced by UnauthorizedState. |
| `/dashboard/starred` | T-Dashboard | DataRow list, EmptyState | Keep `getStarredRepos`. |
| `/dashboard/settings` | T-Dashboard | Panel, Notice, EmptyState | Current page is mock UI behind a lock. New: only real settings (GitHub connection state, access scope, data deletion entry if backed). No "Pro plan", password or toggle that does nothing. Until backed, render one Notice "Settings are not available yet" and the real connection facts. |
| `/report/[scan_id]` | T-Report | EvidencePanel, StatusPill, BasisTag, Citation, CodeBlock, StackedBar (severity counts), DataRow (findings), Dialog (share, false-positive), Menu (actions), Notice (expired), Tabs (Findings / Method / Diff vs previous) | Keep `getScanResultWithStatus`, `getPreviousScan`, `buildReportViewData`, actions `createScanShareLink`, `submitReportFalsePositive`, `startFinding/finalizeFindingFixVerification`, `generateOutreachPack` (admin). Each finding: severity, basis (measured/inferred), cited file+lines, status of verification. No composite "security score". Non-owner remains notFound(). |
| `/report/[scan_id]` expired | T-State | ErrorState (expired variant) | Keep `ReportExpiredState` condition. |
| `/report/shared/[token]` | T-Report (read-only) | Same as report minus owner actions; Notice "Shared view, read only" | Keep token resolution. SharedLinkFailureState -> ErrorState/NotFoundState. |
| `/repo/[owner]/[repo]` | T-Marketing (public repo page) | EvidencePanel (public-data scope), MetricGroup, BarList (languages), Citation, Button (open in workspace), CopyBadge as CodeBlock | Keep `getRepo`, KV cache, `/api/badge`. RepoUnavailableState -> ErrorState with sign-in link. Shows only GitHub-sourced numbers with date. |
| `/topics/[topic]` | T-Catalog | DataRow list, Breadcrumbs, Badge | Keep static catalog and `generateStaticParams`. |
| `/trending` | T-Catalog | Tabs (period if catalog has it), DataRow, Sparkline only if catalog stores history | Keep TrendingClient data. If the catalog has no time series, do not draw trend lines. |
| `/explore` | T-Catalog | Combobox filter, DataRow grid, Badge | Keep catalog. |
| `/blog` | T-Article index | DataRow (editorial variant), EmptyState | Keep `getPublishedPosts`. Add EmptyState (currently unverified). |
| `/blog/[slug]` | T-Article | Breadcrumbs, CodeBlock, display headline, 68ch column | Keep `getPublishedPostBySlug`, EnhancedMarkdown renderer (restyle via nv tokens), notFound. |
| `/admin` | T-Admin | AppShell, SideNav, MetricGroup, DataTable | Keep layout `isAdminUser` redirect. Unauthorized -> `/?error=unauthorized` shows UnauthorizedState on `/`. |
| `/admin/stats` | T-Admin | MetricGroup, DataTable, Tabs, Dialog (destructive reset) | Keep snapshot, details API, actions. Reset funnel / delete account use `destructive` Dialog. |
| `/admin/blog` | T-Admin | DataTable, Menu, Dialog (destructive delete), EmptyState | Keep `getAllPosts`, `deletePostAction`. |
| `/admin/blog/new`, `/admin/blog/[id]` | T-Admin | Input, Textarea, Button, Notice, CodeBlock (preview), Dialog | Keep BlogEditor logic, `savePostAction`, upload API. Restyle fields only. |
| `/admin/index` | T-Admin | MetricGroup, Button (loading), Notice | Keep `refreshCatalogAction`. |
| `/admin/settings` | T-Admin / T-State | NotFoundState or remove link | Page does not exist; the sidebar link is a dead link. New SideNav omits it until a real page exists. |
| `/about` | T-Marketing | display headline, Metric (only real), Footer | Keep copy intent; rewrite to editorial layout. |
| `/faq` | T-Marketing | native `<details>` disclosure styled with tokens | Keep content. |
| `/privacy`, `/terms` | T-Article | 68ch column, headings with anchors | Keep legal text unchanged. |
| `/solutions` | T-Marketing | EvidencePanel (sample), BarList (static illustrations labeled "Illustrative") | Replace SeoVisual with labeled illustrations. |
| `/compare` | T-Marketing | DataRow list to the 3 comparison pages | Keep JSON-LD. |
| `/coming-soon` | T-State | EmptyState | Keep noindex. Label reads from `feature` param. |
| `/ai-code-review-tool`, `/github-repository-analysis`, `/security-scanner` | T-Marketing | display headline, EvidencePanel (sample), CodeBlock, Citation, Footer | Keep metadata and JSON-LD. Replace SeoVisual. Real feature descriptions only. |
| `/github-code-analyzer`, `/nodejs-security-scanner`, `/open-source-security-scanner`, `/repository-risk-analysis`, `/typescript-code-analyzer`, `/novaris-vs-snyk`, `/novaris-vs-sonarqube`, `/static-analysis-vs-novaris` | T-Marketing via `SeoLandingPage` | Same primitives | One rebuild of `components/seo/SeoLandingPage.tsx` covers all eight. Comparison pages use DataTable for claims with sources. |
| not-found (no file today) | T-State | NotFoundState | Add `app/not-found.tsx` (new file, lead owns). |
| global error (no file today) | T-State | ErrorState | Add `app/error.tsx` / `global-error.tsx` (lead owns). |
| loading (no file today) | T-State | Skeleton, LoadingRegion | Add `loading.tsx` per template. |

## Redirects, API and metadata

No change. Redirects in `next.config.ts`, `sitemap.ts`, `robots.ts`, `manifest`, OG generation, and all `/api/*` routes are untouched by the design replacement.

## Legacy components to retire

`CursorGlow`, `Global3DParallaxBackground`, `WaveBackground`, `Interactive3DCard`, `BentoFeatures`, `FeatureTiles`, `TrustedByMarquee`, `WallOfLove`, `FeaturedIn`, `MediaShowcase`, `InteractiveDemo`, `SeoVisual`, `ComingSoonOverlay`, `DeveloperCard`. Each is a visual layer; the data hooks they call remain.
