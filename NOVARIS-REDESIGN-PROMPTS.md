# Novaris: audit and five implementation prompts for Claude

Prepared 24 October 2026 from the local project. Give Claude the project and use the prompts in order in the same conversation. These are implementation prompts, not a claim that the redesign or fixes have already been completed.

## Observed baseline

The implementation contains Next.js 16.1.1, React 19, TypeScript, Tailwind 4, Framer Motion, Three.js, Auth.js, Prisma/PostgreSQL, Vercel KV and Gemini integrations. Existing surfaces include profile and repository chat, file selection and code search, diagrams, security scanning, reports and sharing, finding verification, dashboard repositories/stars/scans, trending/explore, blog/admin and SEO pages. Their presence does not establish that their live integrations work.

Verification after installing locked dependencies and generating Prisma:

- Vitest: 83 test files pass, 7 fail. 479 individual tests pass and 3 fail; five suites fail during import. Repeated run produces the same counts.
- Five suites encounter `next-auth/lib/env.js` resolving `next/server` unsuccessfully. This is an observed test/runtime integration issue; do not assume it proves production auth is broken.
- Two public-statistics assertions disagree with returned totals. Investigate fixture assumptions and the intended aggregation contract before changing implementation or expectations.
- Search-button focus-style assertion fails. Current submit control removes its outline without the expected visible focus ring.
- ESLint: 33 errors and 48 warnings.
- TypeScript: `src/lib/__tests__/storage.test.ts:220`, TS2349, expression of type `never` is not callable.
- Production build completed successfully (exit 0). It warned that Turbopack selected `/Users/ankitsingh` as its workspace root due to another lockfile. A successful build does not resolve the separately observed test, lint and standalone TypeScript failures.
- Installation reported 33 dependency vulnerabilities (1 low, 7 moderate, 20 high, 5 critical). These are package-audit counts, not verified exploitability findings. Review dependency paths and production reachability before choosing updates.
- This directory has no `.git` metadata. Remote workflow status and GitHub history were not inspected.

Source-backed defects and gaps:

| Finding | Evidence | Required response |
|---|---|---|
| Settings is intentionally unavailable | `src/app/dashboard/settings/page.tsx` renders ComingSoonOverlay and disables the content | Implement supported persisted preferences; remove false plan/security controls |
| Catalog history detection is unreliable | `.github/workflows/refresh-repo-catalog.yml`: shallow checkout; empty successful `git log` does not trigger the `||` fallback | Handle empty history explicitly; fetch appropriate history or use reliable refresh metadata |
| Refresh can save incomplete datasets | `scripts/fetch-trending-repos.mjs` catches fetch errors, writes progressively to the canonical JSON and ends with `run().catch(console.error)` | Fail with nonzero status, validate per-tier integrity, publish atomically and preserve last-good data |
| No application CI workflow in this snapshot | Only catalog refresh workflow is present | Add PR checks for generation, typecheck, lint, tests, build and browser journeys |
| GitHub failure becomes an empty state | `src/lib/github.ts:getStarredRepos` catches errors and returns `[]`; starred page treats that as no stars | Separate success-empty, auth, rate-limit and network states; review pagination beyond 50 stars |
| Suggestion spinner can stick | `RepoSearch.tsx` cancels an in-flight request; the short-input branch never resets its loading flag | Reproduce typing then deleting below three characters and fix request-state ownership |
| Existing 3D ignores user/device limitations | Global background mounts through Providers; renderer creation is unguarded; no reduced-motion or visibility handling | Replace the design entirely; add fallback, quality tiers and lifecycle controls |
| Texture cleanup incomplete | Background creates CanvasTexture maps but teardown only disposes geometry/materials and renderer | Explicitly dispose texture resources in the replacement |
| Zoom is disabled | `src/app/layout.tsx` sets maximumScale 1 and userScalable false | Restore browser zoom |
| Documentation is not a reliable specification | README advertises FastAPI/LangGraph/Neo4j, Docker setup and `/api/v1/analyze/repo`; corresponding implementation was not found in the inspected snapshot | Reconcile claims with actual routes and supported behavior |
| Compare route is a guide hub | `src/app/compare/page.tsx` links comparison articles | Do not present it as an implemented side-by-side repository comparison tool |

Live GitHub OAuth, Gemini, database/KV, deployment, report exports and browser interaction remain unverified. No production migrations were run. No application source was changed by this audit.

## Phase 1 — Reproduce defects and restore a trustworthy baseline

```text
You are the lead engineer responsible for recovering Novaris, an existing GitHub profile and repository analysis application. Work directly in the supplied repository. First read NOVARIS-REDESIGN-PROMPTS.md and applicable repository instructions. Execute this phase; do not stop at advice.

The owner wants an entirely new frontend later. During this phase establish reliable behavior and evidence. Preserve useful backend contracts, persisted data, access controls and supported URLs. Do not preserve broken implementations simply because they already exist.

Use available GitHub connectors to inspect this project's actual repository, workflows, recent failures and relevant issues, verifying repository identity first. Use web connectors to read official documentation matching installed Next.js, React, Auth.js, Prisma, Vitest and GitHub API versions. If a connector or credential is unavailable, state the precise limitation and continue local work. Never invent connector results or expose environment values. Do not publish messages, push changes or run production migrations merely to inspect the application.

Inventory every user-facing feature and route. For each, record its component, server action/API, external dependencies, authorization policy, persistence, loading/error states, and current verification status. Distinguish implemented, intentionally unavailable, broken, and unverified features. Trace profile lookup → GitHub ingestion → AI tools/context → streamed response → persisted run → rendered results. Do the same for repository analysis and security reports.

Reproduce the known baseline: five Auth.js/Next import-failing suites, two analytics assertions, missing search-button focus styling, storage-test TS2349, 33 lint errors, Settings overlay, starred-request failures becoming empty data, suggestion-loading cancellation, catalog-history failure, partial catalog overwrites, and missing app CI. Inspect rather than blindly patch the assertions. Add behavioral regression tests for real defects; replace brittle CSS-string assertions with equivalent accessibility verification where appropriate.

Install from the lockfile, explicitly generate Prisma, then run lint, typecheck, all tests and a production build. Inspect package audit results and repair reachable vulnerabilities with compatible upgrades; do not run force-upgrade commands indiscriminately. Investigate Turbopack root selection and next-pwa compatibility using build evidence. Verify the service worker actually registers, updates safely and does not cache private/auth/stream responses.

Fix reproduced blockers. Make catalog refresh transactional: isolated temporary output, schema/per-tier validation, nonzero exit on failure, preservation of previous data, atomic replacement and safe concurrent workflow behavior. Add PR CI and an environment-variable-name checklist without secret values. Reconcile misleading README setup/API claims.

Deliver AUDIT.md with severity, file references, reproduction, root cause, fix and verification for every finding; FEATURE-MATRIX.md; and the actual command results. Gate: baseline checks pass or each externally blocked check is explicitly documented. Do not label an untested integration working or start visual redesign while a locally fixable critical blocker remains.
```

## Phase 2 — Design an entirely new product experience

```text
Continue from Phase 1 as a senior product designer and creative director. Produce and implement a new design foundation for Novaris. This is a full visual replacement, not a polish pass.

Reject the previous frontend design completely: do not reuse its page compositions, visual component designs, cyan-purple glow theme, floating primitive background, cursor glow, generic feature cards or decorative code streams. You may retain proven data hooks and server behavior behind newly designed components. Maintain URL and accessibility compatibility where useful.

Use web connectors to inspect current high-quality developer products, editorial interfaces and interactive data visualization examples. Research official component, Motion and Three.js documentation. If design/component connectors are available, use them for references and implementation details. Record reference URLs and the specific design lesson from each. Develop an original composition rather than copying a brand or importing a component showcase wholesale.

Art direction: a precision engineering observatory. Deep graphite, warm ivory typography, restrained oxidized-copper accents and clearly separated semantic status colors. Strong editorial display typography, highly readable UI text, tabular metrics and intentional asymmetry. Keep working screens calm and legible; reserve cinematic spectacle for meaningful transitions and the landing experience. Validate contrast and font licensing. Commit to one cohesive direction, not a menu of unfinished alternatives.

Design the entire experience: landing/search; profile overview and evidence; repository workspace, file tree and chat; architecture; security scan and report; dashboard/history/repos/stars; settings; trending/explore; blog/admin; marketing/legal; and loading, empty, error, unauthorized and not-found states. Preserve the feature inventory. Never silently remove a feature to make the redesign easier.

Make analysis evidence central: identity and scope, repositories included, date range, data freshness, collection limits, cited files/commits, measured vs inferred findings and uncertainty. Avoid unsupported developer rankings, fake scores or claims about personality/founder potential. Design charts only for data the product can genuinely obtain.

Create DESIGN.md and an implemented component workbench covering tokens, responsive grids, typography, spacing, elevation, focus, buttons, inputs, combobox, tabs, dialogs, navigation, data rows, charts, code, citations, notices and all async states. Every interaction needs pointer, keyboard, touch and disabled behavior. Define desktop/tablet/mobile layouts before full migration.

Deliver real design artifacts and usable foundation components. Gate: new design is visibly unrelated to the old UI, every existing route has a migration mapping, core flows are understandable without animation, and contrast/keyboard/mobile review passes.
```

## Phase 3 — Rebuild every frontend surface around working features

```text
Continue from Phases 1–2. Implement the complete frontend replacement in the existing Next.js/React/TypeScript/Tailwind stack. Replace all previous visual components, layouts and styles according to DESIGN.md. Retain correct business logic through explicit typed interfaces. Do not migrate frameworks or build a second disconnected demo app.

Prioritize the real journey: enter username or repository → validate and normalize → acquire data → show honest progress → inspect useful results → ask follow-up questions → revisit/share supported results. Rebuild profile and repository loaders, chat interfaces, navigation, search/suggestions, file selection, architecture display, scan controls and reports. Then complete dashboard, history, repositories, stars, settings, explore/trending, blog/admin, SEO and supporting pages. Track migration coverage so no old-designed route is left behind.

Audit and repair the connections while implementing: malformed inputs, renamed/missing/private repositories, large and empty repositories, pagination, rate limits, token expiration, stale caches, missing AI configuration, tool failure, truncated streams, concurrent requests and database failures. Give each an honest UI state and recovery action. Validate request schemas and payload bounds server-side. Keep access control server-enforced for premium modes, cross-repo analysis, admin actions, runs and reports.

Use a documented stream protocol and a real state machine. Preserve partial output on failure, prevent stale results overwriting a newer search, deduplicate completion and persistence, and make refresh/reconnection consistent with run status. If generation deliberately continues server-side after disconnect, make that policy explicit and recoverable; do not show a fake cancellation control. Review usage-budget atomicity and charging on failed runs.

Implement settings only where backed by real preferences and persistence. Remove hardcoded Pro Plan claims. Make starred failures distinct from an empty list. Verify report authorization, share expiry, clipboard, download/export, finding verification and false-positive actions. Keep markdown, links and diagram rendering safe for untrusted repository content.

Use deterministic fixtures only in clearly identified development/test modes. Production success views must use actual API results. Never substitute fake GitHub contributions, scores, progress or findings to finish a screen. For each visible action verify its real outcome and unavailable state.

Deliver the complete migrated application and updated feature matrix, with focused API/integration tests and browser tests for critical journeys. Gate: every supported workflow works against controlled fixtures, accessible states are complete, and credential-dependent live smoke tests are separately recorded. No dead buttons, silent failures or forgotten old UI.
```

## Phase 4 — Build cinematic transitions and meaningful 3D

```text
Continue from Phase 3 as a creative developer and motion engineer. Add a premium cinematic layer to the fully working new application. Completely remove the previous Global3DParallaxBackground design and cursor-glow aesthetic. More floating cubes, spheres, wireframes, particles or random code text are explicitly unacceptable.

Build a bespoke spatial repository atlas: structured file/module layers, readable repository identity and evidence-linked relationships. On the landing page, an art-directed illustrative atlas may show the concept but must be clearly illustrative. In analysis results, nodes and edges must represent collected data; never fabricate architecture connections. Provide an equivalent searchable 2D representation and usable text details.

Storyboard the profile-analysis transition: submitted identity remains visually anchored; the view opens into a layered repository atlas; actual arriving repository data populates it; evidence groups settle into the results layout; the camera returns to a stable reading position. Connect visual states to actual ingestion, analysis and completion events. For unknown durations use indeterminate progress. Never delay available results to finish a cinematic sequence or show invented percentages. A failure resolves directly into the appropriate recovery state.

Use shared-element continuity, carefully controlled camera depth, masked reveals and restrained stagger. Hover on selected interactive surfaces may use small perspective changes and moving material highlights; actionable controls need clear pressed and focus states. Keep text, tables and charts readable and stable. Do not tilt the whole dashboard or hide functionality behind hover. Default microinteractions around 120–220 ms and larger transitions around 350–650 ms, adjusting based on testing. Do not hijack scrolling, add forced intros, flashes or autoplay audio.

Use existing Motion/Three.js capabilities where appropriate. Lazy-load the 3D scene; preserve fast server-rendered content. Limit renderer count and pixel ratio, adapt detail by device capability, pause offscreen/hidden work, avoid React state updates every frame, and dispose geometries, materials, textures, observers and listeners. Handle initialization failure and WebGL context loss. Scope spectacle to relevant surfaces rather than running an expensive scene behind every screen.

Reduced motion must provide a composed static or simple crossfade experience, with no camera travel, tilt or parallax. Touch, keyboard, low-power devices and unavailable WebGL must retain full functionality. Offer a persisted motion preference using the settings foundation.

Deliver the implemented scenes, motion specification, fallback states, before/after recordings and measured performance on documented devices. Gate: transitions convey real progress, no stale scene survives navigation, repeat visits do not accumulate GPU resources, the working UI stays responsive, and reduced-motion/touch modes are equally complete.
```

## Phase 5 — Verify, fix regressions and prepare a release

```text
Continue from all prior phases as the release owner. Audit the finished product adversarially and fix defects found. Do not merely produce a checklist or declare everything perfect.

Use available browser automation and GitHub/web connectors to verify the actual application, official deployment guidance and workflow results. Run a clean locked install, Prisma generation, lint, typecheck, all tests, production build and production-server smoke tests. Run app CI and safely validate the catalog refresh using isolated fixtures and simulated upstream failure. Verify deployment/migration sequencing against a disposable or explicitly authorized environment; never use production as a test database.

Exercise anonymous, signed-in, expired-session and admin states. Cover profile and repository analysis, follow-up chat, files, code search, architecture, quick/deep scans, reports, sharing/expiry, exports, verification, history, settings, stars, exploration and content management. Include direct links, browser back/forward, refresh mid-stream, multiple tabs, rapid searches, interrupted requests, 429/401/403/404/5xx responses, DB/KV failure and AI timeout. Verify duplicate requests do not duplicate charges or writes and users cannot access another user's private runs/reports.

Check Chrome, Firefox and Safari where available; desktop and 360/390/768/1440px layouts; keyboard-only operation; touch; screen-reader announcements; zoom; reduced motion; WebGL disabled; slow network; and long content. Capture screenshots and inspect them for clipping, overlap, illegible type, misplaced focus and leftover old styles. Every route in the feature matrix must have a recorded outcome.

Measure performance under stated conditions. Target LCP <=2.5s, INP <=200ms and CLS <=0.1 where measurable; distinguish lab proxies from real-user field data. Profile interaction latency and frame time with 3D enabled, disabled and reduced motion. Document bundle impact and real device limitations. Fix heavy effects instead of concealing slowdowns behind loaders.

Review session isolation, cache scope, report access, untrusted markdown/diagrams, input limits, dependency findings and secret handling. Check service-worker upgrades, offline messaging and private-response caching. Verify metadata/canonicals, sitemap, redirects and revised documentation.

Produce RELEASE-REPORT.md with exact commands/results, browser/device matrix, screenshots/recordings, fixed defects, migration/deployment steps, rollback plan and unresolved blockers. Keep CI checks meaningful; do not skip tests, weaken assertions, broaden lint baselines or suppress errors merely to get green output. Update docs to match delivered behavior.

Release gate: zero unresolved critical/high functional defects, passing required checks, verified primary journeys, complete new visual coverage, and evidence for live integrations. Missing credentials or unavailable browsers remain explicit verification gaps. Provide a concrete release candidate and report; deployment must follow existing user authorization. Never claim universal perfection or production readiness without the evidence.
```
