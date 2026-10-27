# Novaris feature matrix

State as of the Phase 1 recovery (24 October 2026). Status values:

- **Implemented, verified**: exercised end to end locally (unit, integration or browser test) without live third-party services.
- **Implemented, live-unverified**: code paths exist and their local tests pass, but the feature needs GitHub OAuth, Gemini, PostgreSQL, Vercel KV, Blob or Resend credentials to run for real. None of these were available.
- **Intentionally unavailable**: the product shows a placeholder on purpose.
- **Broken**: reproduced defect still open. (Defects fixed in this phase are listed in AUDIT.md and are not repeated here.)

Authorization terms: *anonymous* = no sign-in; *signed-in* = server-side `auth()` with a valid user id; *owner* = `RepoScan.userId` equals the session user; *admin* = session GitHub login equals `ADMIN_GITHUB_USERNAME`. `src/proxy.ts` additionally blocks `/dashboard/*` for signed-out users.

## Pages

| Route | Feature | Main components | Server actions / APIs | External deps | Authorization | Persistence | Loading / error states | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | Landing and search | `app/page.tsx`, `HomeClient`, `RepoSearch`, `SuggestionsList`, `PublicStats` | `getRepoSuggestions`, `fetchGitHubData` (via `/chat`), `getPublicStats` | catalog JSON, KV, Postgres (blog) | anonymous | reads KV stats, BlogPost | Suspense; suggestion spinner; stats fall back to last-known-good | Implemented, verified (search box, suggestions, focus, SW in browser); stats and blog live-unverified |
| `/chat?q=<user>` | Profile chat | `ChatPageClient`, `ProfileLoader`, `ProfileChatInterface`, `EnhancedMarkdown`, `Mermaid` | `fetchProfile`, `fetchProfileReadme`, `fetchUserRepos`, `fetchRecentProfileCommitSnapshot`; `POST /api/chat/run`, `POST /api/chat/profile`, `GET /api/chat/quota`, `/api/chat` | GitHub REST and GraphQL, Gemini, KV, Postgres | anonymous; Thinking mode and cross-repo need sign-in | ChatRun, ChatConversation (signed-in), KV budgets and caches, sessionStorage | `chat/error.tsx`; streamed status, tool and error chunks; run restore on reload | Implemented, live-unverified (route logic tested with mocks) |
| `/chat?q=<owner>/<repo>` | Repository chat, file tree, preview, code search, diagrams, scans | `RepoLoader`, `RepoLayout`, `RepoSidebar`, `FileTreePicker`, `FilePreview`, `ChatInterface`, `Mermaid` | `fetchGitHubData`, `fetchRepoFiles`, `analyzeRepoFiles`, `searchRepositoryCode`, `scanRepositoryVulnerabilities`, `getRemainingDeepScans`; `POST /api/chat/repo`, `/api/fix-mermaid` | GitHub, Gemini, KV, Postgres | anonymous; deep scans need sign-in (15 per month, admin unlimited) | ChatRun, RepoScan, ScanFindingVerification, KV | as above; 413 handling for large trees | Implemented, live-unverified |
| `/repo/<owner>/<repo>` | Public repository landing page | `repo/[owner]/[repo]/page.tsx`, `CopyBadge` | `getRepo`, KV unavailable marker | GitHub, KV | anonymous; segments validated | KV | unavailable state with sign-in link | Implemented, live-unverified |
| `/report/<scan_id>` | Security report, share, outreach, false positives | `ReportContent`, `ReportExpiredState` | `createScanShareLink`, `generateOutreachPack` (admin), `submitReportFalsePositive`, `trackReportConversion` | Postgres, KV | owner or admin, otherwise 404 | RepoScan, RepoScanShareLink, ReportFalsePositive | expired state; toast errors | Implemented, live-unverified (access rules unit-tested) |
| `/report/shared/<token>` | Shared report | `report/shared/[token]/page.tsx`, `ReportContent` | `resolveScanFromShareToken`, `submitReportFalsePositive` with share token | Postgres | anyone holding a valid, unexpired, unrevoked token | RepoScanShareLink access count | invalid, expired and revoked states | Implemented, live-unverified (token scheme unit-tested) |
| `/dashboard` | Overview | `dashboard/layout.tsx`, `WelcomeBanner`, `QuickStats`, `RecentScans`, `AdvancedVisuals` | `GET /api/dashboard/stats`, `GET /api/dashboard/scans` | Postgres | signed-in | reads RepoScan | skeletons, empty state, toast on error | Implemented, live-unverified |
| `/dashboard/scans` | Scan history | `RecentScans` | `GET /api/dashboard/scans` (limit at most 50) | Postgres | signed-in | reads RepoScan | as above | Implemented, live-unverified |
| `/dashboard/repos` | My repositories, optional private access | `dashboard/repos/page.tsx` | `GET /api/dashboard/user-repos`; `signIn` with `repo` scope | GitHub | signed-in with own token (401 otherwise) | none | loading; errors only logged to console (no UI error yet) | Implemented, live-unverified |
| `/dashboard/starred` | Starred repositories | `dashboard/starred/page.tsx` | `getStarredRepos` (up to 400) | GitHub | signed-in | none | error alert with retry, empty state, truncation note | Implemented, verified (unit) / live-unverified |
| `/dashboard/settings` | Settings | `ComingSoonOverlay` over a disabled mock | none | none | signed-in | none | n/a | Intentionally unavailable. The mock shows a false "Pro Plan" badge and a password card (AUDIT A32) |
| `/trending` | Trending catalog by tier | `TrendingClient` | catalog loader | `public/data/top-repos.json` | anonymous | static JSON | Suspense | Implemented, verified (catalog validated by `--dry-run`) |
| `/explore` | Catalog browse | `explore/page.tsx` | catalog loader | static JSON | anonymous | static JSON | none | Implemented |
| `/topics/<topic>` | Topic pages (static params) | `topics/[topic]/page.tsx` | catalog loader | static JSON | anonymous | static JSON | `notFound` | Implemented |
| `/blog`, `/blog/<slug>` | Blog | `blog/*`, `EnhancedMarkdown` | `getPublishedPosts`, `getPublishedPostBySlug` | Postgres | anonymous | reads BlogPost | `notFound`; DB failure renders empty | Implemented, live-unverified |
| `/admin` | Admin home | `admin/layout.tsx`, `AdminSidebar` | `getAllPosts` | Postgres | admin (layout redirects others) | BlogPost | none | Implemented, live-unverified |
| `/admin/stats` | Analytics, false-positive review, account deletion | `StatsDashboardClient` | `getAdminAnalyticsSnapshot`, `/api/admin/stats/details`, `resetAdminReportFunnel`, `updateReportFalsePositiveReviewStatus`, `deleteLoggedInUserAccount` | KV, Postgres | admin | KV analytics, Postgres | n/a | Implemented, live-unverified |
| `/admin/blog`, `/admin/blog/new`, `/admin/blog/<id>` | Blog editor and image upload | `BlogEditor`, `DeletePostButton` | `savePostAction`, `deletePostAction`, `POST /api/admin/blog/upload` | Postgres, Vercel Blob | admin | BlogPost, Blob | `notFound` | Implemented, live-unverified |
| `/admin/index` | Repository index manager | `IndexManagementClient` | `refreshCatalogAction`, repo index service | KV | admin | KV | n/a | Implemented, live-unverified |
| `/compare` | Links to three comparison articles | `compare/page.tsx` | none | none | anonymous | none | none | Implemented as a guide hub. It is not a side-by-side comparison tool |
| `/coming-soon` | Generic placeholder (noindex) | `coming-soon/page.tsx` | none | none | anonymous | none | n/a | Intentionally unavailable; no in-app link points to it |
| `/about`, `/faq`, `/privacy`, `/terms`, `/solutions` | Marketing and legal | static pages | none | none | anonymous | none | none | Implemented |
| `/ai-code-review-tool`, `/github-repository-analysis`, `/security-scanner`, `/github-code-analyzer`, `/nodejs-security-scanner`, `/open-source-security-scanner`, `/repository-risk-analysis`, `/typescript-code-analyzer`, `/novaris-vs-snyk`, `/novaris-vs-sonarqube`, `/static-analysis-vs-novaris` | SEO landing pages | `SeoLandingPage`, `SeoVisual` | none | none | anonymous | none | none | Implemented |
| `/code-analyzer`, `/repo-analyzer`, `/architecture-analyzer` | Permanent redirects | `next.config.ts` | none | none | anonymous | none | n/a | Implemented |
| `/sitemap.xml`, `/robots.txt`, `/manifest.json`, `/sw.js`, `/_offline.html` | Crawl and offline support | `sitemap.ts`, `robots.ts`, `public/*` | none | catalog JSON, Postgres (blog) | anonymous | none | n/a | Implemented; service worker verified in browser |

No route has `loading.tsx` or `not-found.tsx`; only `/chat` has `error.tsx`. Phase 3 adds them.

## APIs

| Endpoint | Purpose | Authorization | Persistence | Status |
| --- | --- | --- | --- | --- |
| `/api/auth/[...nextauth]` | GitHub OAuth (Auth.js v5, JWT sessions, Prisma adapter) | Auth.js | User, Account | Implemented, live-unverified |
| `POST /api/chat/run`, `GET /api/chat/run` | Create or read a run (idempotent per client request id) | actor-scoped (user id or anonymous cookie) | ChatRun | Implemented, verified (unit) |
| `POST /api/chat/profile`, `POST /api/chat/repo` | NDJSON answer streams | anonymous; Thinking and cross-repo need sign-in; run must belong to actor | ChatRun, KV budgets | Implemented, verified (unit with mocks) |
| `GET /api/chat/quota` | Tool budget window | anonymous or signed-in | KV | Implemented, verified (unit) |
| `GET/POST/DELETE /api/chat` | Saved conversations | signed-in, own rows only | ChatConversation | Implemented, live-unverified |
| `GET /api/dashboard/stats`, `GET /api/dashboard/scans` | Dashboard data | signed-in, own rows | RepoScan | Implemented, live-unverified |
| `GET /api/dashboard/user-repos` | User's GitHub repositories | signed-in with own GitHub token | none | Implemented, live-unverified |
| `POST /api/fix-mermaid` | Diagram syntax repair | anonymous; input bounded | none | Implemented, verified (unit); not rate limited |
| `GET /api/badge/<owner>/<repo>`, `GET /api/stats/badge`, `GET /api/stats/card` | Embeddable badges and cards | public by design | reads RepoScan, KV | Implemented, live-unverified |
| `POST /api/admin/blog/upload`, `GET /api/admin/stats/details` | Admin tools | admin | Blob, KV | Implemented, live-unverified |
| `GET /api/internal/auth/force-signout` | Clear auth cookies after an invalid session | public; same-origin redirect only | cookies | Implemented, verified (unit) |
| `GET/POST /api/internal/email/retry` | Email retry job | shared secret | TransactionalEmailDelivery | Implemented, live-unverified |
| `POST /api/internal/email/webhook/resend` | Delivery webhooks | Svix signature | TransactionalEmailDelivery | Implemented, live-unverified |

## End-to-end traces

### Profile analysis

1. Input: `RepoSearch` submit → `HomeClient` `normalizeGitHubInput` (`src/lib/utils.ts`) → `/chat?q=<username>`. A query without `/` is a profile.
2. Ingestion: `ProfileLoader` calls server actions `fetchProfile` (Next data cache 30 min, KV `profile:*`), `fetchProfileReadme`, `fetchUserRepos`, `fetchRecentProfileCommitSnapshot`. The result is kept in sessionStorage for 15 minutes.
3. Run: `ProfileChatInterface` creates a run (`POST /api/chat/run`), then `POST /api/chat/profile` with the query, the client-held profile context, history and model preference.
4. AI tools and context: `processProfileQueryStream` (`src/app/actions.ts`) builds the profile context, adds cross-repo context for signed-in users, and calls `answerWithContextStream` (`src/lib/gemini.ts`). Gemini function calls resolve GitHub tools (commits, PRs, issues, releases, contributors). Tool events carry billable units.
5. Stream: newline-delimited JSON, one `StreamUpdate` per line (`status`, `tool`, `thought`, `content`, `files`, `complete`, `error`; `src/lib/streaming-types.ts`). It is labelled `text/event-stream` but is not SSE framing.
6. Persisted run: partial text is saved every 400 ms. `complete` marks it `COMPLETED` and charges tool units once. An `error` chunk or a truncated stream marks it `FAILED` with the partial text and charges nothing (AUDIT A11).
7. Rendering: `MessageContent` → `EnhancedMarkdown` (`rehype-raw` then `rehype-sanitize`) → `Mermaid` (`securityLevel: "strict"`).

### Repository analysis

1. Input `/chat?q=<owner>/<repo>` → `RepoLoader` → `fetchGitHubData` → `getRepo` (private repos are never served from shared caches; AUDIT A1) and `getRepoFileTree` (recursive tree, filtered, KV keyed by commit SHA; builds a keyword index in the background).
2. `ChatInterface` sends the tree paths and SHAs with the question to `POST /api/chat/repo` → `generateAnswerStream` → `src/lib/services/query-pipeline.ts`: cached-answer short-circuit (24 h, per visibility namespace), file selection (`analyzeFileSelection`: index search plus Gemini), file fetch within the token budget, then the streamed answer with tools.
3. Diagrams render from Mermaid blocks in the answer; a render failure calls `/api/fix-mermaid`.
4. Persistence as for profiles: ChatRun, ChatConversation for signed-in users, KV caches.

### Security reports

1. Trigger from repository chat → `scanRepositoryVulnerabilities`: quick scans for anyone, deep scans for signed-in users (monthly cap). Rules engine plus optional Gemini assist plus a verification gate (`src/lib/services/security-service.ts`, `security-verification.ts`). The result is cached for 7 days per revision, file set and config.
2. Persisted as `RepoScan` (7-day expiry, owner if signed in) plus `ScanFindingVerification` rows.
3. `/report/<scan_id>`: owner or admin only. Sharing creates one link per scan with an HMAC token. `/report/shared/<token>` lets anyone holding it view the report until expiry or revocation and submit false positives tied to that token.
4. Listing: `/api/dashboard/scans` returns the caller's own scans (summary only).

Known gaps in these traces are listed under "Open items" in AUDIT.md.
