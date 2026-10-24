# Novaris

Novaris answers questions about GitHub profiles and repositories. You give it a username or an `owner/repo`; it reads public data from the GitHub API, sends selected files and metadata to Google Gemini, and streams back an answer that cites what it looked at. It also runs security scans on repositories and produces shareable reports.

Live site: https://novaris.in

## What it does

| Feature | Where | Notes |
| --- | --- | --- |
| Profile chat | `/chat?q=<username>` | Profile, READMEs, recent commits, PRs, issues and releases are fetched as tools during the answer. |
| Repository chat | `/chat?q=<owner>/<repo>` | Picks relevant files from the tree (Gemini plus a local keyword index), reads them, streams an answer. Mermaid diagrams render inline. |
| File browsing and code search | Repository chat sidebar | File tree, file preview, text search across indexed files. |
| Security scans | Repository chat, `/report/<scan_id>` | Quick scans for anyone; deep scans need sign-in and are capped per month. Findings go through a verification pass. |
| Report sharing | `/report/shared/<token>` | Owner-issued links that expire with the report. Viewers can flag false positives. |
| Dashboard | `/dashboard`, `/dashboard/repos`, `/dashboard/starred`, `/dashboard/scans` | Requires GitHub sign-in. Private repositories appear only if you grant the `repo` scope. |
| Trending and explore | `/trending`, `/explore`, `/topics/<topic>` | Backed by a weekly catalog snapshot in `public/data/top-repos.json`. |
| Blog and admin | `/blog`, `/admin` | Admin is limited to the GitHub user named in `ADMIN_GITHUB_USERNAME`. |

Not implemented: a public REST API, side-by-side repository comparison (`/compare` is a set of guide articles), and user settings (`/dashboard/settings` shows a "coming soon" notice). Scores in the UI come from the security scanner and catalog data; there is no developer ranking or "founder potential" model.

## Stack

Next.js 16 (App Router) with React 19 and TypeScript, Tailwind CSS 4, Auth.js v5 with GitHub OAuth, Prisma 6 on PostgreSQL, Vercel KV (Upstash Redis) for caching and usage budgets, Vercel Blob for blog uploads, Google Gemini (`@google/genai`), Resend for email. Tests use Vitest and Playwright. Everything runs in the Next.js app; there is no separate backend service.

## Local setup

Requirements: Node.js 20, npm, a PostgreSQL database, and (for caching and budgets) a Vercel KV or Upstash Redis instance. The app starts without KV, but caching and usage limits are disabled.

```bash
npm ci
cp .env.example .env.local      # fill in values; see docs/ENVIRONMENT.md
npx prisma generate
npx prisma migrate dev          # applies prisma/migrations to your local database
npm run dev
```

`docs/ENVIRONMENT.md` lists every environment variable, whether it is required, and which features stop working without it.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm test                         # Vitest unit and integration tests
node --test tests/catalog/refresh.test.mjs   # catalog refresh pipeline tests
npm run build && npx playwright test   # browser journeys against a production build
```

The same checks run on every pull request (`.github/workflows/ci.yml`).

## Data refresh

`.github/workflows/refresh-repo-catalog.yml` rebuilds the trending catalog weekly with `scripts/fetch-trending-repos.mjs`. The script builds the catalog in a temporary directory, validates every tier, and replaces `public/data/top-repos.json` only when the whole run succeeds; on any failure it exits non-zero and leaves the previous data in place.

## Deployment

The app is deployed on Vercel. Database migrations are applied with `npm run prisma:deploy` (it wraps `prisma migrate deploy` with retries for lock timeouts). Run it against the target database before or as part of a release, never against production from a development machine.

## Security

Please report vulnerabilities privately to singhankit91624@gmail.com rather than opening a public issue.

## License

MIT. See [LICENSE](LICENSE).
