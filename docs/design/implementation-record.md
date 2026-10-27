# Secondary-page experiences: implementation record

Branch `feat/secondary-experiences`. Homepage design is unchanged except the product-preview contents, which now play demo videos.

## Component research

All 25 references were fetched and evaluated. Per-component notes, decisions and file paths:
`docs/design/research/group-a.md` (3D/cinematic, 1–7 and 25), `group-b.md` (code/graph, 8–14), `group-c.md` (SaaS interactions, 15–24).
Every component is an original implementation on already-installed libraries (framer-motion, three, @xyflow/react, gsap). No dependencies were added.

Adapted or replaced rather than copied:
- Liquid Glass: the reference SVG-refraction backdrop filter is Chromium-only and breaks the "no backdrop blur" rule in DESIGN.md; replaced by a restrained lens surface.
- Canvas Reveal: WebGL shader per card rejected as too heavy; canvas2D dot matrix that idles once settled.
- Google Gemini Effect: replaced by `SignalPaths` (scroll-drawn SVG paths converging into one cited answer).
- Floating particles: canvas2D at low density instead of three.js.

## Library

- `src/components/fx/code/`: FileTree, CodeBlock, CodeComparison, Terminal, AnimatedBeam, OrbitingCircles
- `src/components/fx/graph/`: ArchitectureGraph (lazy @xyflow/react, semantic list fallback)
- `src/components/fx/scene/`: Card3D, CubesGrid, Globe (lazy three.js, SVG fallback), SignalPaths, CanvasReveal, Marquee3D, Particles3D, HeroParallax
- `src/components/fx/surface/`: GlowingBorder, BentoGrid, TracingBeam, StickyScrollReveal, CometCard, LiquidGlass, MagneticButton, ExpandableCards, Timeline, GooeyInput
- `src/components/app-fx/`: SeverityFilter, CountUp, StructureMap, RepoRowDetails
- Route experiences: `src/components/experiences/<route>/`
- Dev-only gallery: `/design-system/fx` (hidden in production unless `NOVARIS_WORKBENCH=1`)

All animated components pause off-screen, honour `prefers-reduced-motion`, and WebGL renders on demand only.

## Routes

| Route | Experience |
|---|---|
| /ai-code-review-tool | Hero centred (`PageHeader align="center"`); staged review demo: FileTree, Terminal, dependency view, cited note, CodeComparison |
| /github-code-analyzer | Without/with repository context toggle, CodeBlock, ExpandableCards, Terminal |
| /typescript-code-analyzer | TS FileTree, clickable diagnostics linked to type definitions, CodeComparison, TracingBeam |
| /github-repository-analysis | Explorable ArchitectureGraph + FileTree + Card3D detail + AnimatedBeam |
| /security-scanner | Steppable scan stages with CanvasReveal, Terminal, severity-coded sample findings |
| /nodejs-security-scanner, /open-source-security-scanner, /repository-risk-analysis | Dependency path graph, repository cards, risk bento (sample data, labelled) |
| /explore, /trending, /topics/[topic], /solutions | Discovery bento and Card3D, CometCard stats on real values, topic map, end-to-end journey |
| /about, /faq, /compare, comparison pages, /blog, /coming-soon | Editorial experiences; legal pages unchanged in wording |
| /report, /dashboard, /repo | Severity filter + group-by-file, count-up on real totals, expandable repo rows, directory map from the real file tree |

Every demo is labelled illustrative and uses fictional repositories (`acme/payments-api`). No real CVEs, metrics or competitor results.

## Demo videos

Brag is installed as a Claude skill but makes one launch video per project, so the demos use its engine, Hyperframes (`npx hyperframes render`), with ffmpeg for VP9/H.264 encoding. Sources and re-render script: `video/` (`video/render.sh`).
Assets in `public/media/demos/`: select, repo-analysis, developer-analysis, security-scan, ai-chat, ai-chat-narrow, architecture, code-review (webm + mp4 + webp poster each, webm 30–190 KB).
`src/components/media/DemoVideo.tsx` renders the poster on the server, mounts the video near the viewport, pauses off-screen, and shows only the poster under reduced motion or Save-Data.

## Verification (final run)

- `tsc --noEmit`: clean. ESLint on changed areas: 0 errors, 1 pre-existing warning (`src/app/blog/[slug]/page.tsx`).
- Vitest: 111 files, 696/696 passing.
- `npm run build`: passes.
- Production server spot check of /security-scanner, /solutions, /explore at 1440: no page errors, no horizontal overflow.
- Homepage before/after at 1440 and 390: identical page height and section boxes; changes confined to preview containers.

## Remaining

- Not verified end to end: dashboard, report, chat and admin with real data (no database, KV or OAuth locally).
- Several stopped page agents had not finished their own screenshot passes; mobile (390px) review of the secondary routes and WebKit checks of most routes are still to do.
- /explore: the third category card sits ~20px lower than its neighbours.
- ArchitectureGraph nodes are small at 390px on graph-heavy routes.
- Demo loops run 5–7 s rather than 2–3 s.
- `src/app/HomeClient.tsx` still carries another session's uncommitted `SignalBurst` → `FileStreams` swap (with `page.tsx`, `landing.module.css`, `FileStreams.tsx`); left untouched.
