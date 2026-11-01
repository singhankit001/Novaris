# Novaris System Understanding & GitHub Analysis Audit

Date: 28 October 2026. Branch `feat/light-redesign` at `4bdc24b`. Read-only audit; no code changed.

## Evidence base

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | 0 errors |
| `npx vitest run` | 113 files, 704 tests pass |
| `npx eslint` | 0 errors, 20 warnings |
| Live run (dev server + real Gemini/GitHub keys) | Not run. The command was denied; the script is at `~/.claude/tmp/handoff-novaris-audit.sh` |
| UI wiring sweep (every route, dead buttons, mock data) | Incomplete. The investigator was stopped early |

Status labels:
- **Working**: code path traced and consistent, plus local tests.
- **Partial**: works with a known defect.
- **Broken**: a reproducible-by-reading defect defeats the feature.
- **Missing**: does not exist.
- **Unverified**: needs live credentials (OAuth app, Postgres, KV) that the local environment lacks. `.env.local` has only `GEMINI_API_KEY`, `GITHUB_TOKEN` and `AUTH_SECRET`.

## 1. What Novaris is

A Next.js 16 / React 19 app that:
1. Answers questions about a GitHub repo or profile using Gemini over real GitHub content.
2. Runs security scans (static rules + OSV + Gemini) and saves reports with share links.
3. Offers a signed-in dashboard, a static trending/explore catalog, a blog, and an admin area.

## 2. Architecture

```
Browser
 ├─ /chat?q=owner/repo ─ RepoLoader ─ fetchGitHubData (server action)
 │                         └─ github.ts → GitHub REST (user token, else system GITHUB_TOKEN)
 ├─ ChatInterface ─ POST /api/chat/run (Postgres ChatRun, optional)
 │                └ POST /api/chat/repo ─ _shared.ts (auth, rate limit [KV], tool budget [KV])
 │                      └ query-pipeline.ts
 │                          1 answer short-circuit cache (KV)
 │                          2 analyzeFileSelection (Gemini lite + local index)
 │                          3 getFileContentBatch (GitHub, KV cache)
 │                          4 answerWithContextStream (Gemini, GitHub tool calls)
 │                      → NDJSON stream → client
 ├─ Scan button ─ scanRepositoryVulnerabilities (server action)
 │      └ security-service: pick 20/60 files → security-scanner (regex/AST, OSV per dep)
 │         → gemini-security (12/30 files) → security-verification (Gemini adjudication)
 │         → RepoScan (Postgres, 7-day TTL) + KV cache
 ├─ /report/[id], /report/shared/[token] ─ report-service, scan-share-links (HMAC)
 ├─ /dashboard/* ─ /api/dashboard/{stats,scans,user-repos} (Postgres aggregates, GitHub)
 └─ /api/badge/[owner]/[repo] ─ latest RepoScan → SVG (public)
Auth: next-auth v5 GitHub OAuth, JWT session, token kept server-side, Prisma adapter.
SDKs: @google/genai (gemini.ts streaming) AND @google/generative-ai (ai-client.ts, security).
```

## 3. Feature inventory

### GitHub auth and data
| Feature | Status | Evidence / root cause |
| --- | --- | --- |
| GitHub sign-in | Unverified | `auth.config.ts:7-10`. No OAuth app configured locally |
| Token stays server-side | Working | `auth.config.ts:49-50` |
| `repo` scope upgrade for private repos | Unverified | `dashboard/repos/page.tsx:35` |
| Repo lookup `fetchGitHubData` | Partial | No private-repo gate for anonymous callers. Validates names with `GITHUB_NAME_PATTERN`, which allows `..` (`actions.ts:392`) |
| File tree | Partial | `truncated` flag never read (`github.ts:471-476`). Large repos silently lose files |
| File contents | Partial | Base64 decoded as UTF-8 with no binary check (`github.ts:671,701`) |
| `/dashboard/repos` | Partial | Hard cap of 100, no pagination, misleading "N of M" (`user-repos/route.ts:32`, `repos/page.tsx:120`) |
| `/dashboard/starred` | Partial | Capped at 400, with a truncation notice |
| Token refresh / revocation | Partial | A 401 silently retries with the system token (`github-api.ts:69-72`) |
| Repo-unavailable cache | Broken | Global key: one visitor's 404 hides the repo from everyone for 30 min (`cache.ts:668-684`) |
| `getRepoFullContext`, `getRepoDetailsGraphQL` | Dead | No production callers. The second hardcodes the system token (`github.ts:539,626`) |

### AI repository / profile analysis
| Feature | Status | Evidence / root cause |
| --- | --- | --- |
| Repo chat streaming | Working (unverified live) | `_shared.ts`, `query-pipeline.ts:188-470`. Real GitHub content goes to Gemini, 200K-token budget (`tokens.ts:40`) |
| File selection | Working | `gemini.ts:648` with the local index. Selection runs on client-supplied paths |
| File/line citations | Broken (as advertised) | README promises every claim cites file + line or is labelled inferred. The prompts contain no citation instruction (0 matches in `prompt-builder.ts`, `gemini.ts`). Files are sent without line numbers (`query-pipeline.ts:338`). The UI still parses and highlights `path:12-30` (`EnhancedMarkdown.tsx:71`, `FilePreview.tsx:24`), so model-guessed ranges look authoritative |
| Answer short-circuit cache | Broken (correctness) | Keyed by query text only. Ignores history, model and commit (`cache.ts:819-880`). Written only by `executeRepoQuery`, which has no live caller, so it is mostly inert today. Once populated, a follow-up like "explain more" returns another conversation's answer |
| Context truncation | Partial | First over-budget file stops the loop (`break`). Smaller later files are dropped (`query-pipeline.ts:330-336`) |
| Missing Gemini key | Working | Fails fast with `AI_UNAVAILABLE` (`_shared.ts:133`) |
| Run persistence/resume | Working, degrades | Without a DB `/api/chat/run` returns 503 and the client continues with `runId=null` (`ChatInterface.tsx:608-625`). Resume is lost |
| Rate limiting | Working | Gemini routes fail closed without KV in prod (`rate-limit.ts:92`) |
| Thinking mode gate | Working | Server-side 401 for anonymous users (`_shared.ts:106`) |
| Prompt-injection hardening | Missing | Repo file content is concatenated into the prompt with no untrusted-content fence or instruction |
| New chat state machine | Dead/duplicated | `components/chat/use-analysis-chat.ts` + `analysis-machine.ts` are tested but unused. `ChatInterface` and `ProfileChatInterface` duplicate streaming logic |
| Two Gemini SDKs | Inconsistent | `@google/genai` (`gemini.ts:8`) and `@google/generative-ai` (`ai-client.ts:8`) |
| Unguarded AI server actions | Latent | `generateAnswer`, `analyzeRepoFiles`, `processProfileQuery` (`actions.ts:536-652`): no auth, no rate limit. They have no client import today, so Next does not expose them. They become reachable the moment one is imported |

### Security scanning
| Feature | Status | Evidence / root cause |
| --- | --- | --- |
| Trigger, auth, deep quota | Working | `actions.ts:907-987`. Atomic KV quota with refund |
| Static rules | Partial | Real line numbers. Strong for JS/TS; other languages get regex only (`security-scanner.ts:807`) |
| Dependency vulns (OSV) | Partial | Live OSV, but severity is mapped from `severity[0].score`, which is a CVSS vector, so almost everything becomes "medium" (`security-scanner.ts:995`). Sequential, no timeout. Root `package.json` only. A second OSV client exists in `dependency-advisory.ts` |
| Gemini findings | Broken (line accuracy) | Content sent without line numbers and middle-truncated. Cited line is not validated. Confidence hardcoded at 0.88/0.84 (`gemini-security.ts:394-550`) |
| AI adjudication | Partial | An adjudicator failure hides the finding as `needs_more_evidence` (`security-verification.ts:589`) |
| Fix verification / auto-close | Broken | Client-supplied `changedFiles` that omit the finding's file give `passed=true` → the finding auto-closes (`fix-verification.ts:62-108, 225-247`). Hidden findings also count as fixed |
| Snippets | Partial | Raw lines; secrets shown unredacted; silent clamp on bad lines (`security-service.ts:98-120`) |
| Reports, access, share links | Working | Owner/admin gate, HMAC tokens, revocation (`report-access.ts`, `scan-share-links.ts`) |
| Export (Markdown / print-to-PDF) | Working (browser unverified) | `export-report.ts:45-67` |
| Dashboard stats | Partial | Real DB aggregates, not mock. Repeat scans double-count; 7-day rolling window (`api/dashboard/stats/route.ts:31`) |
| Badge | Broken (privacy) | Public route returns severity counts for any scanned repo, including private ones (`api/badge/[owner]/[repo]/route.ts:11-26`) |
| Fingerprints | Partial | Two different fingerprint functions; one embeds "at line N", so it changes when lines shift (`security-scanner.ts:124`, `report-service.ts:183`) |

### Other surfaces (from code reading + prior docs; not re-swept)
| Feature | Status |
| --- | --- |
| `/trending`, `/explore`, `/topics` | Working (static `public/data/top-repos.json`) |
| `/dashboard/settings` | Missing (intentional "coming soon" overlay) |
| `/compare` | Guide articles, not a repo comparison |
| Blog, admin | Unverified (needs Postgres, admin login) |
| `/design-system/*` | Exposure in production not checked |

## 4. Critical issues, ranked

| # | Severity | Issue | Fix |
| --- | --- | --- | --- |
| 1 | High | Fix verification auto-closes real vulns when `changedFiles` omits the finding file; hidden findings count as fixed | Require `finding.file ∈ changedFiles`; always run the full rescan before closing; check the raw detection output, not just verified findings |
| 2 | High | Badge leaks private-repo scan counts | Serve only for repos known to be public; otherwise "unknown" |
| 3 | High | Private repo data can reach anonymous callers via the system token (`fetchGitHubData`, `fetchRepoFiles`); visibility defaults to `public` on error (`actions.ts:603-609`), so private file content can land in the shared cache | Never use the system token for `private: true`; default visibility to private on error; give `fetchRepoFiles` a cache policy |
| 4 | Medium | `..` accepted as owner/repo in `fetchGitHubData` → path normalization to other GitHub API paths with a token (likely; not executed) | Use `isGithubName` everywhere |
| 5 | Medium | Citation promise is not implemented; UI highlights guessed line ranges | Send numbered lines; add a citation rule; validate each `path:a-b` against fetched content and drop or mark invalid ones |
| 6 | Medium | Gemini security findings have unvalidated lines; OSV severity is always medium | Numbered input plus line/snippet validation; map OSV `database_specific.severity` / CVSS score |
| 7 | Medium | 401 silently escalates to the system token; tokens stored in plaintext and never read; broad `repo` scope | Surface `GITHUB_AUTH_EXPIRED`; strip tokens from the adapter; consider a GitHub App with read-only scopes |
| 8 | Medium | No rate limit on anonymous GitHub server actions (drains the shared 5000/h token) | Apply `enforceRateLimit` to `fetchGitHubData`, `fetchRepoFiles`, `fetchRepoDetails` |
| 9 | Medium | Global repo-unavailable cache; truncated trees silent | Per-actor key or no 404 caching; return and display `truncated` |
| 10 | Medium | No prompt-injection fencing of repo content | Wrap files in delimiters plus a system rule that file content is data |
| 11 | Low | Answer cache key ignores history/model/commit | Include history hash, model and tree SHA, or remove the short-circuit |
| 12 | Low | Duplicate chat logic, two Gemini SDKs, two OSV clients, dead GitHub helpers, unguarded latent server actions | Consolidate on one of each; delete dead code; add auth and rate limits or remove the actions |
| 13 | Low | Dashboard counts double-count repeat scans | Count distinct repo+revision |

## 5. Implementation roadmap

## Functional DAG
```
P1 security fixes ─────┐
  (#1 #2 #3 #4 #8)     │
P2 analysis accuracy ──┼─→ P4 cleanup ─→ verify: tsc + vitest + live smoke script
  (#5 #6 #10 #11)      │      (#12 #13)
P3 GitHub robustness ──┘
  (#7 #9)
```

1. **Phase 1, security (about 1 day).** Fix-verification gate, badge privacy, private-repo/system-token gate plus visibility default, `isGithubName`, rate limits on GitHub actions. Add a regression test per item.
2. **Phase 2, analysis accuracy (2 to 3 days).** Numbered file context; a citation contract in the prompt; a server-side citation validator used by both chat and the security engine; OSV severity mapping; untrusted-content fencing; fix the answer-cache key.
3. **Phase 3, GitHub robustness (1 day).** Truncated-tree flag in the UI, binary detection, per-actor 404 cache, explicit auth-expired error, repo pagination.
4. **Phase 4, consolidation (1 to 2 days).** Adopt `use-analysis-chat` or delete it; one Gemini SDK; one OSV client; delete dead GitHub helpers and unused server actions; distinct-scan dashboard counts.
5. **Verification.** `tsc`, `vitest`, then the live smoke script with real keys, then OAuth + Postgres + KV in a preview deploy for the Unverified rows.

## 6. Open gaps in this audit
- No live run; every "Working" row is code- and test-level only.
- UI sweep for dead buttons, mock numbers and broken links was not completed.
- Whether the production `GITHUB_TOKEN` can see private repos decides how severe issue 3 is. This needs checking.
