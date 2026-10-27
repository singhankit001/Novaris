# Developer ecosystem discovery

The `/trending` and `/explore` directories share `EcosystemDiscovery`. Publisher links and editorial descriptions live in `src/lib/ecosystem.ts`. These are third-party discovery listings, not Novaris connectors. Only the existing GitHub analysis action is offered inside Novaris.

Sources were checked against publisher documentation and upstream GitHub repositories on 2026-10-27, including Anthropic Skills, Vercel Agent Skills, GitHub MCP, Microsoft Playwright MCP, Google Gemini CLI, OpenCode and Cursor documentation. Each entry links its own source. Selection is editorial; no adoption ranking or weekly growth is inferred from stars. A commercial product without a representative public repository has no star count. A repository's stars are not the product's user count.

`GET /api/ecosystem` reads the fixed allowlist through GitHub REST `/repos/{owner}/{repo}` with at most three requests concurrently and a five-second timeout per request. Successful values include stars, forks, last push, archive status and retrieval time. Results are cached hourly, with partial failures omitted. Configure the existing server-side `NOVARIS_GITHUB_TOKEN` or `GITHUB_TOKEN` for higher GitHub rate limits. No token is returned to the browser. Links and editorial content remain usable when GitHub is unavailable. Missing metrics sort after available metrics.

The existing trending catalog, its time windows and catalog-refresh provenance remain separate. Profile signals use the existing loaded public repository and commit sample; language counts do not imply framework expertise and sampled commits do not represent a user's complete contribution history.

Validation: API tests cover provenance, bounded concurrency, upstream errors and invalid payloads. `tests/e2e/ecosystem.spec.ts` covers desktop/mobile category filters, search, empty-state reset, collections, sorting, external links, overflow and preservation of repository controls. No new dependencies or database changes are required.
