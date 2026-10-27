# Novaris Phase 1 audit

Date: 24 October 2026. Scope: the local project at `Novaris-final` (no `.git` metadata) plus read-only inspection of `github.com/singhankit001/Novaris` with the GitHub CLI. Nothing was pushed, no messages were sent, and no migrations were run against any database.

## Gate result

| Check | Baseline | Now | Command |
| --- | --- | --- | --- |
| Install | 33 advisories at install | `npm ci` clean | `npm ci` |
| Prisma client | generated | generated | `npx prisma generate` |
| Lint | 33 errors, 48 warnings | 0 errors, 48 warnings | `npm run lint` |
| Typecheck | 1 error (TS2349) | 0 errors | `npx tsc --noEmit` |
| Unit and integration tests | 7 of 90 files failing (5 at import), 3 of 482 tests failing | 96 of 96 files, 566 of 566 tests pass | `npm test` |
| Catalog pipeline tests | none | 8 of 8 pass | `node --test tests/catalog/refresh.test.mjs` |
| Production build | exit 0, wrong workspace root, no service worker emitted | exit 0, no warnings | `npm run build` |
| Browser journeys | none | 8 of 8 pass (desktop and mobile Chromium) | `npx playwright test` |
| `npm audit` | 37 (5 critical, 24 high, 7 moderate, 1 low) | 20 (0 critical, 13 high, 5 moderate, 2 low) | `npm audit` |

Raw logs from the final run are summarized in "Command results" at the end.

Still externally blocked, so not verified: live GitHub OAuth sign-in, Gemini answers, PostgreSQL and Vercel KV behaviour against real services, Resend email, Vercel Blob uploads, and the scheduled catalog workflow on GitHub Actions with the new script. The local build and browser runs used placeholder database values, with KV unset; pages degraded gracefully and logged the expected connection errors.

## GitHub evidence

- Repository identity: `singhankit001/Novaris`, public, default branch `main`, last push 2026-10-19. This matches `package.json` `repository.url`.
- Workflows: only "Refresh Tiered Repo Catalog". The last 14 scheduled runs (2026-07-20 to 2026-10-19) all succeeded. No application CI existed.
- Issues and pull requests: none, open or closed.
- The 2026-10-19 run log prints `All-time tier skipped (last refresh: 0 days ago, next in 1825 days)`, which is the evidence for finding A10.
- `.env.production` is tracked in the remote repository (finding A31).

## Findings

Severity scale: Critical = cross-user data exposure or credential leak; High = authorization bypass, data integrity loss, or reachable critical dependency; Medium = broken feature or misleading state; Low = hygiene, defence in depth, or tooling.

### A1. Private repository data served to other users from shared caches (Critical, fixed)

- Files: `src/lib/github.ts:399-430` (`getRepo`), `src/lib/cache.ts` (repo metadata, full context, tree, commit snapshot, security-scan keys), `src/lib/services/repo-index-service.ts`.
- Reproduction: user A signs in and grants the `repo` scope on `/dashboard/repos`, then opens private repo `acme/secret`. `fetchGitHubAPI` uses A's token, and `getRepo` writes the metadata to `repo:acme/secret` in KV and to the in-process `repoCache`. User B (or an anonymous caller of the public `fetchGitHubData` or `fetchRepoDetails` server actions) then requests `acme/secret`. `getRepo` returns the cached copy before any GitHub call, so B receives private metadata. `getRepoFullContext` does the same for the README and commit messages, and the security-scan cache and repo index are keyed by `owner/repo` only.
- Root cause: the shared repo-scoped keys are not partitioned by caller, while the data in them may have been fetched with one user's private token.
- Fix: when GitHub reports `private: true`, `cacheRepoMetadata` and `cacheRepoFullContext` record a marker `repo:private:{owner}/{repo}` (30 days, longer than any shared TTL) instead of caching. Every shared repo-scoped reader and writer (metadata, full context, tree, commit snapshot, scan result, repo index) treats a marked repo as a miss, and `getRepo` no longer serves private entries from memory. A request for a private repo therefore always goes to GitHub with the caller's own token, and GitHub decides. File and answer caches were already partitioned per actor for private repos.
- Verification: `src/lib/__tests__/private-repo-cache.test.ts` (private metadata is never stored; entries written before the marker are ignored in a fresh process; public repos still cache).
- Residual: data cached for a private repo before this change can stay in KV until its TTL (1 hour for metadata and context, 15 minutes for snapshots, 7 days for scan results). It becomes unreachable as soon as the repo is marked, which happens the next time anyone loads it. Flushing `repo:*`, `scan_answer:*` and `repo_index:*` keys once at deploy closes that window.

### A2. GitHub OAuth access token sent to the browser (Critical, fixed)

- Files: `src/lib/auth.config.ts:44-55`, `src/types/next-auth.d.ts`, `src/lib/github-api.ts`, `src/app/api/dashboard/user-repos/route.ts`.
- Reproduction: sign in, then open `/api/auth/session`. The JSON response contains `accessToken` (a GitHub token with `repo` scope if granted) and `oauthScope`. Any XSS or browser extension could read it.
- Root cause: the session callback copied `token.accessToken` onto the session object, which Auth.js returns to the client.
- Fix: the token stays only in the encrypted JWT cookie. New `getSessionGitHubAuth()` in `src/lib/github-api.ts` decodes the cookie server-side with `getToken` (both the secure and plain cookie names). `fetchGitHubAPI` and the user-repos route use it.
- Verification: `src/lib/__tests__/auth.config.test.ts` (the session payload contains no token or scope); `src/lib/__tests__/github-session-token.test.ts` (round trip with a real encrypted cookie; forged cookie and no cookie return nothing).

### A3. Share-link URL token was the stored hash; revoked links could revive (High, fixed)

- Files: `src/lib/services/scan-share-links.ts`.
- Reproduction: create a share link, then read `RepoScanShareLink.tokenHash` from the database. Opening `/report/shared/{tokenHash}` shows the report, because the code returned the hash as the URL token and looked links up by that raw value. Separately, re-sharing after a revoke or expiry cleared `revokedAt` and reused the same token, so the old URL worked again.
- Root cause: the raw random token was discarded after hashing, so the hash itself became the bearer credential.
- Fix: the URL token is `HMAC-SHA256(AUTH_SECRET, linkId:issuedAt)`. It can be re-derived for repeat shares without being stored, and the database holds only `sha256(token)`. Refreshing an expired or revoked link resets `issuedAt` (`createdAt`), which rotates the token. Lookups hash the presented token. Links issued before this change, whose URL token is the stored value, keep working until they expire (at most the 7-day report lifetime) so already-shared URLs do not break. Rows issued under the new scheme can no longer be opened with their stored value.
- Verification: `src/lib/services/__tests__/scan-share-links.test.ts`, rewritten as an intentional contract change because the old assertions required `token === tokenHash`. It covers: the stored hash cannot open a link; repeat shares return the same URL; refresh after expiry or revoke rotates and kills the old URL even with the fixed scan expiry; legacy links keep working; issuing fails without `AUTH_SECRET`.
- Open: `revokeScanShareLink` still has no UI or action caller (Phase 3).

### A4. "My repositories" listed the service account's repositories (High, fixed)

- File: `src/app/api/dashboard/user-repos/route.ts`.
- Reproduction: a signed-in user whose session lacks a GitHub token calls `GET /api/dashboard/user-repos`. The route falls back to the system `GITHUB_TOKEN` and calls `GET /user/repos`, which lists the repositories of the token's owner, private ones included if that token has `repo` scope.
- Root cause: `/user/repos` is relative to the token owner; a system-token fallback is never valid for it. The response also used `next: { revalidate: 60 }`, which puts a per-user response into the shared data cache.
- Fix: the route requires the caller's own token (401 `GITHUB_TOKEN_MISSING` otherwise), uses `cache: "no-store"`, and derives `hasPrivateAccess` from the granted scope instead of "returned at least one repo".
- Verification: typecheck and route behaviour by reading; no route test exists for this endpoint yet (listed under open items).

### A5. False-positive submissions bypassed report access with a client flag (High, fixed)

- Files: `src/app/actions.ts` (`submitReportFalsePositive`), `src/app/report/[scan_id]/ReportContent.tsx`, `src/app/report/shared/[token]/page.tsx`.
- Reproduction: call the server action with any `scanId`, a valid fingerprint and `isSharedView: true` while signed out. The access check is skipped and a submission is stored against a private report.
- Root cause: authorization trusted a boolean supplied by the caller.
- Fix: a shared view must present its share token, which must resolve to the same scan; otherwise the normal owner or admin check applies. Details are capped at 2000 characters.
- Verification: `src/app/actions.report-false-positive.test.ts` (an intentional contract change: the old test allowed `isSharedView: true` without proof). New cases reject no access, a token for another scan, and a revoked token.

### A6. Fix-verification actions had no authentication or ownership check (High, fixed)

- File: `src/app/actions.ts` (`startFindingFixVerification`, `finalizeFindingFixVerification`).
- Reproduction: any visitor can invoke the exported server actions. `start` accepts an arbitrary `changedFiles` list that triggers GitHub fetches and rescans; `finalize` runs for any `runId` and updates verification state.
- Fix: both require sign-in. `start` requires a `scanId` the caller can access and bounds `changedFiles` (at most 50 paths of at most 512 characters). `finalize` requires the caller to own the run, or be an admin.
- Verification: typecheck and the existing service tests. The actions have no UI caller today.

### A7. Open redirect in forced sign-out (High, fixed)

- File: `src/app/api/internal/auth/force-signout/route.ts`.
- Reproduction: `/api/internal/auth/force-signout?callbackUrl=//evil.example` redirected to `https://evil.example` after clearing cookies.
- Root cause: the check only required a leading `/`, which protocol-relative URLs satisfy.
- Fix: the target is resolved against the request and must have the same origin.
- Verification: `src/app/api/internal/auth/force-signout/__tests__/route.test.ts` (`//host`, `/\host`, absolute URL and `javascript:` all stay on site; auth cookies cleared).

### A8. Reachable critical and high dependency advisories (High, partly fixed)

- Files: `package.json`, `package-lock.json`.
- Reproduction: `npm audit` reported 37 advisories, including critical ones in `next` 16.1.1 (image optimizer RCE, middleware bypass, cache poisoning), `@auth/core` 0.41.2 (OAuth check cookies not bound to provider) and `dompurify` 3.4.12 (used by Mermaid in the browser).
- Fix (compatible upgrades only, no `--force`): `next` and `eslint-config-next` 16.4.3, `react` and `react-dom` 19.2.9, `next-auth` 5.0.0-beta.32 (brings `@auth/core` 0.41.3), `@auth/prisma-adapter` 2.11.3, `axios` 1.20.0, `mermaid` 11.17.2, `baseline-browser-mapping` 2.11. `overrides` pin patched in-range `dompurify` 3.4.17, `undici` 6.29.1 and `follow-redirects` 1.16.1. `next-pwa` was removed (finding A18), which removed the `serialize-javascript` and workbox chain.
- Result: 20 advisories, 0 critical. The remaining ones and why they stay:
  - `vitest` / `@vitest/mocker` (moderate, dev only). The fixed 4.1.12 adds an optional peer that makes npm 10.9.8 crash (`Cannot read properties of null (reading 'edgesOut')` in Arborist `#loadPeerSet`). Retry with a newer npm.
  - `katex` via `mermaid` 11 (needs mermaid 12, a major). The advisory needs an existing prototype pollution to matter.
  - `deepmerge-ts` via the `prisma` CLI config (needs Prisma 7, a major). CLI only, not in the runtime bundle.
  - `zod` 4.1.11 pinned exactly by `@vercel/cli-config` inside `@vercel/oidc`. It parses local config, not user input.
  - `brace-expansion`, `browserslist`, `js-yaml`, `nanoid` 3, `source-map-js`, `postcss-selector-parser`, `vite`. Build, lint or test tooling only.
- `npm audit fix` itself crashes with the same Arborist error, so it was not usable.

### A9. Catalog refresh could publish incomplete data (High, fixed)

- Files: `scripts/fetch-trending-repos.mjs`, `tests/catalog/refresh.test.mjs`.
- Reproduction (from the code): any tier fetch error was caught and logged, the script wrote progressively to `public/data/top-repos.json`, and `run().catch(console.error)` exited 0, so the workflow committed a partial catalog.
- Fix: a pure `buildCatalog` core with an injectable fetcher. Output is built in an `mkdtemp` directory, re-read and re-validated (schema of every entry, contiguous global ranks, tier order, no duplicates, per-tier minimum counts), then atomically renamed over the canonical file from a temp file in the same directory after `fsync`. Any failure exits 1 and leaves the previous file untouched. The fetcher retries 403, 429 and 5xx with `retry-after` and `x-ratelimit-reset`. `--skip-all-time` carries the previous all-time entries forward and validates them. `--dry-run` validates the current files without network calls.
- Verification: 8 node:test cases, including simulated upstream failure (previous file byte-identical) and schema violations. `--dry-run` reports the current 5559-entry catalog as valid.
- Note: per-tier minimums for the trending tiers are set below 90 % of target (yearly 500, 6-month 150, monthly 120, weekly 80) because those tiers are deduplicated against earlier tiers. The current data has 833, 288, 250 and 188.

### A10. All-time tier never refreshed because of shallow history (High, fixed)

- File: `.github/workflows/refresh-repo-catalog.yml`.
- Reproduction: live run log of 2026-10-19 shows `last refresh: 0 days ago`. `actions/checkout` is shallow, so `git log --grep` prints nothing with exit status 0, the `||` fallback never runs, and `date -d ""` is today.
- Fix: refresh state lives in `public/data/catalog-meta.json` (`allTimeRefreshedAt`), written by the script, so the workflow no longer depends on git history. A missing or invalid timestamp means "refresh". Also: `concurrency` without cancellation, catalog tests before the live refresh, both data files committed, and `git pull --rebase` before push that fails loudly on conflict.
- Note: `catalog-meta.json` does not exist yet, so the first run after this lands does a one-time full all-time refresh.
- Verification: workflow YAML parses (Ruby `yaml`); not run on GitHub Actions (nothing was pushed).

### A11. Failed chat streams left runs RUNNING and still charged tools (Medium, fixed)

- Files: `src/app/api/chat/profile/route.ts`, `src/app/api/chat/repo/route.ts`.
- Reproduction: when Gemini fails mid-answer, the generators yield `{type: "error"}` instead of throwing (`src/app/actions.ts:830`, `src/lib/services/query-pipeline.ts:464`). The route loop then ends normally: the `ChatRun` stays `RUNNING` (the client polls it forever on reload) and the tool units used before the failure are charged. A stream that ends without `complete` behaves the same.
- Fix: the routes track the terminal outcome. Error or truncation marks the run `FAILED` with its partial text and the error message, and charges nothing. Only a `complete` run is charged, once.
- Verification: `src/app/api/chat/profile/route.test.ts` (three new cases). Two existing fixtures that modelled success without a `complete` chunk now emit `complete`, as the real generators do (an intentional contract change: only completed runs are billed).

### A12. No application CI (Medium, fixed)

- File: `.github/workflows/ci.yml` (new).
- Fix: on pull requests and pushes to `main`: `npm ci`, Prisma generate, lint, typecheck, Vitest, catalog tests, production build, then Playwright with the report uploaded on failure. Placeholder environment values only; `contents: read`; per-ref concurrency.
- Verification: the same commands pass locally (gate table). Not yet run on GitHub.

### A13. Five test suites failed at import (Medium, fixed)

- File: `vitest.config.ts`.
- Reproduction: `npm test` showed `Cannot find module '.../node_modules/next/server' imported from .../next-auth/lib/env.js` for `gemini-file-selection`, `github-context`, `github-guards`, `query-pipeline` and `security-service`.
- Root cause: `src/lib/github.ts` imports `github-api.ts`, which imports Auth.js. Vitest externalizes `node_modules`, so Node's ESM loader resolves `next-auth`'s extensionless `next/server` import and fails, because `next` has no `exports` map. Production bundling is unaffected.
- Fix: `server.deps.inline: ["next-auth"]` so Vite resolves the import.
- Verification: all five suites pass (55 tests).

### A14. Public statistics persisted a deflated snapshot when adjustments failed (Medium, fixed)

- Files: `src/lib/analytics.ts`, `src/lib/__tests__/public-stats.test.ts`.
- Reproduction: the two failing assertions were short by exactly the manual adjustments (104 − 97 = 7 visitors, 379 − 370 = 9 queries).
- Root cause: two things. (1) The fixture never set `KV_REST_API_URL`/`KV_REST_API_TOKEN`, so adjustments were skipped by design; the assertions were right for a configured KV. (2) A real defect: `getManualAnalyticsAdjustments` swallowed KV errors and returned zeros, so the resilience logic saw "success" and saved the deflated totals as the last-known-good snapshot.
- Fix: public stats use a throwing reader (`readManualAnalyticsAdjustments`), so an adjustment failure falls back to the last-known-good snapshot. The fixture declares a configured KV. No assertion was changed.
- Verification: the two original tests pass, and a new test fails against the old code (the old path persists `{57, 150, 20}`).

### A15. Starred repository failures shown as "no stars"; only 50 loaded (Medium, fixed)

- Files: `src/lib/github.ts` (`getStarredRepos`), `src/app/dashboard/starred/page.tsx`.
- Reproduction: any GitHub error (rate limit, expired token, network) returned `[]`, and the page said "No Starred Repositories". Only the first 50 stars were requested. The page also fell back to the display name or email prefix as a GitHub login.
- Fix: a discriminated result (`ok` with `truncated`, or `error` with `rate_limited | not_found | unauthorized | unavailable`). Up to 4 pages of 100 are loaded, and truncation is stated. Errors render an alert with a retry link. Only the session's GitHub login is used.
- Verification: `src/lib/__tests__/github-starred.test.ts` (7 cases).

### A16. Suggestion spinner stuck after shortening the query (Medium, fixed)

- File: `src/components/RepoSearch.tsx`.
- Reproduction: type `rea` (a suggestion request starts), then delete back to `re` before it returns. The submit button keeps spinning indefinitely. The same happens if `loading` flips mid-request.
- Root cause: the effect cleanup marks the request cancelled, so its `finally` skips the reset, and the short-input branch never resets the flag.
- Fix: the effect cleanup releases the flag, so only the request from the current effect run can turn it on.
- Verification: `tests/e2e/home-search.spec.ts` holds the server-action request open in a real browser and asserts the spinner clears (desktop and mobile).

### A17. Search submit button had no visible focus or accessible name (Medium, fixed)

- File: `src/components/RepoSearch.tsx`.
- Reproduction: tab from the search input to the arrow button. `focus-visible:outline-none` removed the outline with no replacement, and the icon-only button and the input had no accessible names.
- Fix: a 2 px offset white outline on `:focus-visible`, `aria-label` on the button ("Analyze" or "Analyzing") and on the input.
- Verification: the brittle class-string assertion was replaced by a browser test that tabs to the button and checks the computed outline style and width (`tests/e2e/home-search.spec.ts`).

### A18. Service worker was never built; stale workers kept caching GitHub API responses (Medium, fixed)

- Files: `next.config.ts`, `public/sw.js` (new), `src/components/ServiceWorkerRegistration.tsx` (new), `src/components/Providers.tsx`, `.gitignore`.
- Reproduction: `next build` (Turbopack) emitted no `public/sw.js`. `next-pwa` 5.6 is a webpack plugin and does nothing under Turbopack, so `register: true` registered nothing. The remote repository has no `sw.js` either. Workers installed by older webpack builds had `NetworkFirst` caching for `api.github.com` and `StaleWhileRevalidate` for scripts.
- Fix: `next-pwa` removed. A hand-written worker caches only `/_offline.html`. It serves same-origin page navigations from the network and falls back to that page offline. It never intercepts `/api/*`, non-GET or non-navigation requests, and never stores a response. On activate it deletes every other cache, including old Workbox caches. It is registered in production with `updateViaCache: "none"`, and `/sw.js` is served `no-cache`.
- Verification: `src/lib/__tests__/service-worker.test.ts` (sandboxed worker), and `tests/e2e/service-worker.spec.ts` in Chromium: the worker registers at scope `/`; after requests to `/api/auth/session` and `/api/chat/quota` the only cache entry is `/_offline.html`; offline navigation shows "You're Offline"; `/sw.js` has `Cache-Control: no-cache`.
- Note: browsers whose old worker has an expired update check fetch `/sw.js` again within 24 hours, then activate the new worker, which clears the old caches.

### A19. Browser zoom disabled (Medium, fixed)

- File: `src/app/layout.tsx`. `maximumScale: 1` and `userScalable: false` were removed (WCAG 1.4.4).

### A20. GitHub token prefixes logged on every API call (Medium, fixed)

- File: `src/lib/github-api.ts`. The wrapper logged the first 8 characters of the session and system tokens. The logging was removed. 403 responses are now classified: only `x-ratelimit-remaining: 0` or 429 is "rate limit"; other 403s surface as normal API errors.

### A21. JSON-LD could be broken out of with `</script>` (Medium, fixed)

- File: `src/components/JsonLdScript.tsx`. Blog fields reach JSON-LD unescaped. `<` is now escaped as `<`. Verification: `src/components/__tests__/json-ld-script.test.tsx`.

### A22. Typecheck error TS2349 in the storage test (Low, fixed)

- File: `src/lib/__tests__/storage.test.ts:180`. Control-flow analysis does not see an assignment inside a synchronous `Promise` executor, so it narrowed `releasePost` to `null`. It is now declared with definite assignment.

### A23. 33 lint errors (Low, fixed)

- 18 `react-hooks/set-state-in-effect`, 9 `no-explicit-any`, 3 unescaped entities, 2 `prefer-const`, 1 `react-hooks/purity`, 1 `no-require-imports`, across 20 files. They were fixed without disable comments, config or baseline changes: derived state during render, `useSyncExternalStore` for browser-only values, quota setters moved to call sites, typed markdown component props, and a deterministic animation delay. These component changes passed the existing component tests but were not exercised in a browser one by one. Most of those components are replaced in Phase 3.

### A24. Turbopack inferred the wrong workspace root and traced the whole project (Low, fixed)

- Files: `next.config.ts`, `src/app/sitemap.ts`. A `package-lock.json` in the home directory made Turbopack pick `/Users/ankitsingh` as root. `turbopack.root` and `outputFileTracingRoot` are now pinned to the project. The `force-static` sitemap's `fs.statSync(path.join(process.cwd(), ...))` made Turbopack trace every project file into the server output; a `turbopackIgnore` hint fixes that. The build now prints no warnings.

### A25 to A30. Defence in depth (Low, fixed)

- A25 `src/app/api/fix-mermaid/route.ts`: unauthenticated Gemini call with unbounded input. It is now capped (code 20 000, error 2 000, type 64 characters, otherwise 413) and no longer returns internal error text. Test added. Per-actor rate limiting is still open.
- A26 `src/app/api/admin/blog/upload/route.ts`: admin-only uploads accepted any content and a client-chosen blob path. Uploads are now limited to PNG, JPEG, WebP, GIF and AVIF up to 5 MB, use a sanitized basename under `blog/` with a random suffix, and set an explicit content type.
- A27 `src/app/api/internal/email/retry/route.ts`: the job secret is compared with `timingSafeEqual` over SHA-256 digests.
- A28 `src/app/api/chat/run/route.ts`: a malformed JSON body returned an unhandled 500; it now returns 400.
- A29 `src/app/robots.ts`: `/api/`, `/admin`, `/dashboard`, `/report/` and `/design-system` are now disallowed, while badges and stat cards stay crawlable.
- A30 `src/components/admin/AdminSidebar.tsx`: removed the link to `/admin/settings`, which has no page.

### A31. `.env.production` tracked in git (Low, not changed)

The remote repository tracks `.env.production` (363 bytes). Its own comment says it holds build placeholders, and the build log shows a `dummy.aws.neon.tech` host. Values were not read or copied. Recommendation: keep it placeholder-only or move the placeholders into the Vercel build settings, and add a secret scan to CI.

### A32. Settings page is a locked mock with false claims (Medium, open (Phase 3))

`src/app/dashboard/settings/page.tsx` renders `ComingSoonOverlay` over disabled, unwired controls, including a "Pro Plan" badge (no plans exist) and a password card (sign-in is GitHub OAuth only). Phase 3 replaces it with persisted preferences.

### A33. README described a different product (Low, fixed)

The README advertised FastAPI, LangGraph, Neo4j, Python, Docker Compose, `POST /api/v1/analyze/repo`, proprietary developer scoring, "founder potential" and a CONTRIBUTING.md. None exist. It was rewritten to describe the implemented routes, stack, setup (`npm ci`, `prisma generate`, `prisma migrate dev`), checks, data refresh and deployment. `docs/ENVIRONMENT.md` lists every environment variable name with no values.

## Open items carried into later phases

| Severity | Item | Evidence | Planned |
| --- | --- | --- | --- |
| High | Anonymous budgets are bypassable: a new `rm_anon_id` cookie means a fresh budget, and `x-forwarded-for` feeds the fallback hash. Budget checks are check-then-increment, not atomic. A KV outage reads as zero used. No request rate limiter exists. | `src/lib/actor-id.ts`, `src/lib/cache.ts` (`consumeToolBudgetUsage`) | Phase 3: atomic `INCRBY` reservation before tool use, per-IP limiter, fail closed on KV errors for paid calls |
| Medium | A new search can show a slower, older result: no cancellation in `ProfileLoader`/`RepoLoader`, and no `AbortController` on stream fetches. | static reading | Phase 3 state machine |
| Medium | Generation continues after the client disconnects, still spending Gemini and GitHub budget. | `src/app/api/chat/*/route.ts` `safeEnqueue` | Phase 3: explicit, documented policy |
| Medium | Raw upstream error messages reach the client. | `src/app/api/chat/*/route.ts`, `src/app/actions.ts` | Phase 3 |
| Medium | Deep-scan monthly cap is check-then-increment. Anonymous scans are saved without an owner, so the scanner cannot open their own report. | `src/app/actions.ts` (`scanRepositoryVulnerabilities`) | Phase 3 |
| Medium | Share links cannot be revoked from the UI. | `revokeScanShareLink` has no caller | Phase 3 |
| Low | Mermaid SVG is injected via `dangerouslySetInnerHTML`, relying on Mermaid `securityLevel: "strict"`. The PDF preview iframe has no `sandbox`. | `src/components/Mermaid.tsx`, `src/components/FilePreview.tsx` | Phase 3 |
| Low | The GraphQL call uses `process.env.GITHUB_TOKEN` directly. | `src/lib/github.ts` `getRepoDetailsGraphQL` | Phase 3 |
| Low | Global 3D background mounts on every page, with no reduced-motion, visibility or context-loss handling and incomplete texture disposal. | `src/components/Global3DParallaxBackground.tsx` | Phase 4 replaces it |
| Low | 20 remaining `npm audit` advisories (A8). | `npm audit` | Revisit with a newer npm, mermaid 12 and Prisma 7 |

## Command results (final run)

```
prisma generate: 0
lint: 0 (✖ 48 problems (0 errors, 48 warnings))
tsc: 0
vitest: 0 (Test Files 96 passed (96) / Tests 566 passed (566))
catalog: 0 (# pass 8 # fail 0)
build: 0 (warnings: 0)
e2e: 0 (8 passed (7.9s))
audit: 20 vulnerabilities (2 low, 5 moderate, 13 high)
```

Baseline before any change (same machine, same lockfile):

```
npm ci: 33 vulnerabilities (1 low, 7 moderate, 20 high, 5 critical); npm audit a few minutes later: 37 (1 low, 7 moderate, 24 high, 5 critical)
eslint: ✖ 81 problems (33 errors, 48 warnings)
tsc: src/lib/__tests__/storage.test.ts(220,9): error TS2349: This expression is not callable. Type 'never' has no call signatures.
vitest: Test Files 7 failed | 83 passed (90); Tests 3 failed | 479 passed (482)
next build: exit 0; "Next.js inferred your workspace root ... selected the directory of /Users/ankitsingh/package-lock.json"
```

Tooling notes: npm 10.9.8 (`~/.hermes/node`) and Node 22 locally; CI uses Node 20. Playwright 1.64.1 with Chromium headless shell 156.
