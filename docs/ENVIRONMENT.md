# Environment variables

Names only. Never put values in this file, in issues, or in CI logs. Copy `.env.example` to `.env.local` and fill values locally; set production values in the hosting dashboard. CI uses placeholders only (see `.github/workflows/ci.yml`).

Tick each row when set in the target environment.

| Done | Variable | Required | Read in | Purpose | Breaks without it |
|---|---|---|---|---|---|
| [ ] | `DATABASE_URL` | Required | `prisma.config.ts`, `scripts/seed-blog.ts`, `scripts/estimate-traffic.ts` | Postgres connection (pooled) | All database features: scans, reports, accounts, email queue |
| [ ] | `DIRECT_URL` | Required for migrations | `prisma.config.ts`, `scripts/seed-blog.ts` | Direct Postgres connection used by Prisma migrate | `prisma migrate` / deploy |
| [ ] | `AUTH_SECRET` | Required | `src/lib/github-api.ts`, `src/lib/services/scan-share-links.ts`, Auth.js | Signs sessions, signs report share links, decrypts the user's GitHub token server-side | Sign-in, report share links (issuing throws), reading the user's GitHub token (falls back to the app token and its rate limits) |
| [ ] | `NEXTAUTH_SECRET` | Optional (legacy fallback for `AUTH_SECRET`) | `src/lib/github-api.ts`, `src/lib/services/scan-share-links.ts` | Used only when `AUTH_SECRET` is unset | Nothing if `AUTH_SECRET` is set |
| [ ] | `AUTH_GITHUB_ID` | Required | `src/lib/auth.config.ts` | GitHub OAuth app client id | GitHub sign-in |
| [ ] | `AUTH_GITHUB_SECRET` | Required | `src/lib/auth.config.ts` | GitHub OAuth app client secret | GitHub sign-in |
| [ ] | `NEXT_PUBLIC_APP_URL` | Required in production | `src/lib/site-url.ts` | Canonical site URL (links, sitemap, metadata, emails) | Wrong canonical and absolute URLs |
| [ ] | `GITHUB_TOKEN` | Required | `src/lib/github.ts`, `src/lib/github-api.ts`, `scripts/fetch-top-repos.ts`, `scripts/fetch-trending-repos.mjs` | Server GitHub API token for repo reads and catalog refresh | Repo analysis for anonymous users, catalog refresh (the workflow supplies its own) |
| [ ] | `NOVARIS_GITHUB_TOKEN` | Optional | `src/lib/github-api.ts` | Alternate app-level GitHub token | Falls back to `GITHUB_TOKEN` |
| [ ] | `GEMINI_API_KEY` | Required | `src/lib/ai-client.ts`, `src/lib/gemini.ts` | Google Gemini API key | AI analysis, chat, security verification |
| [ ] | `GEMINI_FILE_SELECTOR_MODEL` | Optional | `src/lib/ai-client.ts` | Model override for file selection | Uses built-in default |
| [ ] | `GEMINI_LITE_MODEL` | Optional | `src/lib/ai-client.ts` | Model override for light tasks | Uses built-in default |
| [ ] | `GEMINI_THINKING_MODEL` | Optional | `src/lib/ai-client.ts` | Model override for deep analysis | Uses built-in default |
| [ ] | `RESEND_API_KEY` | Required for email | `src/lib/emails/mailer.ts`, `src/lib/emails/delivery-service.ts` | Resend API key | Transactional email |
| [ ] | `RESEND_FROM_EMAIL` | Required for email | `src/lib/emails/mailer.ts`, `src/lib/emails/delivery-service.ts` | Sender address | Transactional email |
| [ ] | `RESEND_WEBHOOK_SECRET` | Required for email | `src/app/api/internal/email/webhook/resend/route.ts` | Verifies Resend delivery webhooks | Delivery status updates (webhook rejected) |
| [ ] | `EMAIL_RETRY_JOB_SECRET` | Required for email | `src/app/api/internal/email/retry/route.ts` | Authorizes the email retry job endpoint | Failed email retries |
| [ ] | `ADMIN_GITHUB_USERNAME` | Optional | `src/lib/admin-auth.ts`, `src/lib/analytics.ts`, `scripts/estimate-traffic.ts` | GitHub login treated as admin | Admin stats pages |
| [ ] | `KV_REST_API_URL` | Optional | `src/lib/analytics.ts` | Upstash/Vercel KV REST endpoint | Analytics counters |
| [ ] | `KV_REST_API_TOKEN` | Optional | `src/lib/analytics.ts` | KV REST token | Analytics counters |
| [ ] | `KV_REST_API_READ_ONLY_TOKEN`, `KV_URL`, `REDIS_URL` | Optional | listed in `.env.example`; not read directly in `src/` or `scripts/` (provisioned by the KV integration) | KV/Redis integration variables | Nothing in this repo directly |
| [ ] | `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET` | Optional | listed in `.env.example`; not read directly in `src/` or `scripts/` (platform integrations) | Blob storage and platform cron auth | Nothing in this repo directly |
| [ ] | `SECURITY_VERIFICATION_GATE`, `SECURITY_AUTO_CLOSURE_GATE`, `SECURITY_DEPENDENCY_LIVE_ADVISORY`, `SECURITY_VERIFIED_ONLY_REPORTS`, `SECURITY_VERIFIED_CANARY_PERCENT`, `SECURITY_VERIFICATION_AUTO_THRESHOLD`, `SECURITY_VERIFICATION_REJECT_THRESHOLD`, `SECURITY_VERIFICATION_BENCH_PRECISION`, `SECURITY_VERIFICATION_BENCH_RECALL` | Optional | `src/lib/security-verification-config.ts` | Security verification rollout flags and thresholds | Uses built-in defaults |
| [ ] | `TRACK_ANALYTICS_IN_DEV` | Optional | `src/app/actions.ts` | Enable analytics outside production | Dev analytics off |
| [ ] | `SKIP_ALL_TIME` | Optional | `scripts/fetch-trending-repos.mjs` | `true` keeps the existing all-time catalog tier | Nothing (default refreshes all tiers) |
| [ ] | `PRISMA_DEPLOY_MAX_ATTEMPTS`, `PRISMA_DEPLOY_RETRY_DELAY_MS` | Optional | `scripts/prisma-deploy.mjs` | Migration retry tuning | Uses built-in defaults |
| [ ] | `E2E_PORT` | Optional | `playwright.config.ts` | Port for Playwright web server (default 3100) | Nothing |
| - | `NODE_ENV`, `CI`, `VERCEL` | Set by tooling | various, `playwright.config.ts`, `prisma.config.ts` | Runtime / CI / Vercel detection | Do not set manually |

## CI placeholders

`ci.yml` sets `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` to non-secret placeholders so `next build` and the Playwright run work without real services. Features needing a live database or third-party keys are not exercised in CI.
