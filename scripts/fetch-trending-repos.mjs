import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Transactional catalog refresh: build and validate everything in a temp dir, then atomically
// replace public/data/top-repos.json. Any failure exits nonzero and leaves the previous data intact.

const DAY_MS = 24 * 60 * 60 * 1000;
const PER_PAGE = 100;
const MAX_ATTEMPTS = 5;
const MAX_WAIT_MS = 10 * 60 * 1000;

export const TIERS = ["all-time", "yearly", "6-month", "monthly", "weekly"];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * `min` is the smallest acceptable entry count. Trending tiers are deduplicated against earlier
 * tiers, so they legitimately fall well below `target`; all-time must reach 90% of target.
 */
export function getTierConfigs(now = Date.now()) {
  const since = (days) => new Date(now - days * DAY_MS).toISOString().slice(0, 10);
  return [
    {
      tier: "all-time",
      target: 4000,
      min: 3600,
      windows: [
        { query: "is:public archived:false stars:>=50000", sort: "stars" },
        { query: "is:public archived:false stars:20000..49999", sort: "stars" },
        { query: "is:public archived:false stars:10000..19999", sort: "stars" },
        { query: "is:public archived:false stars:5000..9999", sort: "stars" },
        { query: "is:public archived:false stars:2000..4999", sort: "stars" },
      ],
      useTrendingScore: false,
    },
    {
      tier: "yearly",
      target: 2000,
      min: 500,
      days: 365,
      windows: [{ query: `is:public archived:false pushed:>=${since(365)} stars:>=500`, sort: "updated" }],
      useTrendingScore: true,
      trendingWeight: { starVelocity: 0.4, recentStars: 0.3, pushRecency: 0.3 },
    },
    {
      tier: "6-month",
      target: 800,
      min: 150,
      days: 180,
      windows: [{ query: `is:public archived:false pushed:>=${since(180)} stars:>=200`, sort: "updated" }],
      useTrendingScore: true,
      trendingWeight: { starVelocity: 0.4, recentStars: 0.3, pushRecency: 0.3 },
    },
    {
      tier: "monthly",
      target: 500,
      min: 120,
      days: 30,
      windows: [{ query: `is:public archived:false pushed:>=${since(30)} stars:>=100`, sort: "updated" }],
      useTrendingScore: true,
      trendingWeight: { starVelocity: 0.5, recentStars: 0.3, pushRecency: 0.2 },
    },
    {
      tier: "weekly",
      target: 300,
      min: 80,
      days: 7,
      windows: [{ query: `is:public archived:false pushed:>=${since(7)} stars:>=50`, sort: "updated" }],
      useTrendingScore: true,
      trendingWeight: { starVelocity: 0.6, recentStars: 0.3, pushRecency: 0.1 },
    },
  ];
}

// ---------- GitHub fetch with bounded retry ----------

function retryDelayMs(response, attempt, now) {
  const retryAfter = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1000 + 1000;
  const reset = Number(response.headers.get("x-ratelimit-reset"));
  if (response.headers.get("x-ratelimit-remaining") === "0" && Number.isFinite(reset) && reset > 0) {
    return Math.max(0, reset * 1000 - now()) + 1000;
  }
  return 2000 * 2 ** attempt;
}

export function createGithubFetchPage(token, { fetchImpl = fetch, sleepFn = sleep, now = Date.now } = {}) {
  return async function fetchPage(query, sort, page) {
    const url = new URL("https://api.github.com/search/repositories");
    url.searchParams.set("q", query);
    url.searchParams.set("sort", sort);
    url.searchParams.set("order", "desc");
    url.searchParams.set("per_page", String(PER_PAGE));
    url.searchParams.set("page", String(page));

    let lastError;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      let waitMs = 2000 * 2 ** attempt;
      try {
        const response = await fetchImpl(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "Novaris-Tiered-Catalog",
          },
        });
        if (response.ok) {
          const payload = await response.json();
          if (!payload || !Array.isArray(payload.items)) throw new Error("GitHub response has no items array");
          return payload.items;
        }
        lastError = new Error(`GitHub API error ${response.status}: ${response.statusText}`);
        if (response.status !== 403 && response.status !== 429 && response.status < 500) {
          lastError.fatal = true;
          throw lastError;
        }
        waitMs = retryDelayMs(response, attempt, now);
      } catch (err) {
        if (err.fatal) throw err;
        lastError = err; // network error or retryable status
      }
      if (attempt < MAX_ATTEMPTS - 1) {
        console.warn(`Retry ${attempt + 1}/${MAX_ATTEMPTS - 1} in ${Math.ceil(Math.min(waitMs, MAX_WAIT_MS) / 1000)}s: ${lastError.message}`);
        await sleepFn(Math.min(waitMs, MAX_WAIT_MS));
      }
    }
    throw lastError;
  };
}

// ---------- scoring / normalisation ----------

function calculateTrendingScore(repo, weights, tierDays, now) {
  const createdAt = new Date(repo.created_at).getTime();
  const pushedAt = new Date(repo.pushed_at).getTime();
  const daysSinceCreation = Math.max(1, (now - createdAt) / DAY_MS);
  const daysSincePush = Math.max(0.1, (now - pushedAt) / DAY_MS);
  const starVelocity = repo.stargazers_count / daysSinceCreation;
  const pushRecencyScore = Math.exp(-daysSincePush / tierDays);
  const recentStarEstimate = starVelocity * pushRecencyScore * tierDays;
  return (
    Math.log10(starVelocity + 1) * weights.starVelocity +
    Math.log10(recentStarEstimate + 1) * weights.recentStars +
    pushRecencyScore * weights.pushRecency * 10
  );
}

function normalizeRepo(repo, tier, rank, trendingScore = null) {
  return {
    owner: repo?.owner?.login ?? "",
    repo: repo?.name ?? "",
    stars: Number(repo?.stargazers_count ?? 0),
    description: typeof repo?.description === "string" ? repo.description : null,
    topics: Array.isArray(repo?.topics) ? repo.topics : [],
    language: repo?.language ?? null,
    tier,
    rank,
    ...(trendingScore !== null && Number.isFinite(trendingScore) && { trendingScore: Math.round(trendingScore * 100) / 100 }),
  };
}

const keyOf = (owner, repo) => `${owner.toLowerCase()}/${repo.toLowerCase()}`;

// ---------- validation ----------

export class CatalogValidationError extends Error {
  constructor(errors) {
    super(`Catalog validation failed (${errors.length} problem${errors.length === 1 ? "" : "s"}):\n  - ${errors.slice(0, 20).join("\n  - ")}`);
    this.name = "CatalogValidationError";
    this.errors = errors;
  }
}

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

/**
 * Returns a list of problems (empty = valid). Ranks run 1..N across the file in order
 * (the shape src/lib/repo-catalog.ts consumers expect); tiers form contiguous blocks in tier order.
 */
export function validateCatalog(entries, tierConfigs = getTierConfigs()) {
  const errors = [];
  if (!Array.isArray(entries)) return ["catalog is not an array"];
  const known = new Set(tierConfigs.map((c) => c.tier));
  const counts = new Map();
  const seen = new Map();
  let lastTierIndex = -1;

  entries.forEach((e, i) => {
    const at = `#${i}`;
    if (!e || typeof e !== "object") return void errors.push(`${at}: not an object`);
    if (!isNonEmptyString(e.owner)) errors.push(`${at}: owner must be a non-empty string`);
    if (!isNonEmptyString(e.repo)) errors.push(`${at}: repo must be a non-empty string`);
    if (typeof e.stars !== "number" || !Number.isFinite(e.stars) || e.stars < 0) errors.push(`${at}: stars must be a finite number >= 0`);
    if (e.description !== null && typeof e.description !== "string") errors.push(`${at}: description must be string|null`);
    if (!Array.isArray(e.topics) || e.topics.some((t) => typeof t !== "string")) errors.push(`${at}: topics must be string[]`);
    if (e.language !== null && typeof e.language !== "string") errors.push(`${at}: language must be string|null`);
    if ("trendingScore" in e && !(typeof e.trendingScore === "number" && Number.isFinite(e.trendingScore))) errors.push(`${at}: trendingScore must be finite`);
    if (!known.has(e.tier)) return void errors.push(`${at}: unknown tier ${JSON.stringify(e.tier)}`);
    if (e.rank !== i + 1) errors.push(`${at}: rank ${e.rank} is not contiguous (expected ${i + 1})`);

    const tierIndex = tierConfigs.findIndex((c) => c.tier === e.tier);
    if (tierIndex < lastTierIndex) errors.push(`${at}: tier ${e.tier} is out of order`);
    lastTierIndex = Math.max(lastTierIndex, tierIndex);
    counts.set(e.tier, (counts.get(e.tier) ?? 0) + 1);

    if (isNonEmptyString(e.owner) && isNonEmptyString(e.repo)) {
      const k = `${e.tier}:${keyOf(e.owner, e.repo)}`;
      if (seen.has(k)) errors.push(`${at}: duplicate ${e.owner}/${e.repo} in tier ${e.tier} (first at #${seen.get(k)})`);
      else seen.set(k, i);
    }
  });

  for (const c of tierConfigs) {
    const n = counts.get(c.tier) ?? 0;
    if (n < c.min) errors.push(`tier ${c.tier}: ${n} entries, minimum ${c.min}`);
  }
  return errors;
}

export function assertValidCatalog(entries, tierConfigs) {
  const errors = validateCatalog(entries, tierConfigs);
  if (errors.length) throw new CatalogValidationError(errors);
}

// ---------- pure core ----------

/**
 * Builds and validates a full catalog. Throws on any fetch error or validation failure;
 * never returns partial data. Does no file I/O.
 */
export async function buildCatalog({
  fetchPage,
  previousCatalog = [],
  skipAllTime = false,
  tierConfigs = getTierConfigs(),
  now = Date.now(),
  pageDelayMs = 1000,
  log = () => {},
}) {
  const collected = [];
  const seen = new Set();
  let rank = 1;

  if (skipAllTime) {
    const carried = (Array.isArray(previousCatalog) ? previousCatalog : []).filter((r) => r?.tier === "all-time");
    if (!carried.length) throw new Error("--skip-all-time requires existing all-time entries in the previous catalog");
    for (const r of carried) {
      collected.push({ ...r, rank: rank++ });
      if (isNonEmptyString(r.owner) && isNonEmptyString(r.repo)) seen.add(keyOf(r.owner, r.repo));
    }
    log(`carried ${carried.length} all-time entries`);
  }

  for (const config of tierConfigs) {
    if (skipAllTime && config.tier === "all-time") continue;
    log(`tier ${config.tier} (target ${config.target})`);
    const candidates = new Map();
    const maxPages = Math.min(10, Math.ceil((config.target * (config.useTrendingScore ? 2 : 1)) / PER_PAGE));

    for (const window of config.windows) {
      if (!config.useTrendingScore && candidates.size >= config.target) break;
      for (let page = 1; page <= maxPages; page++) {
        const items = await fetchPage(window.query, window.sort, page); // throws => whole refresh fails
        if (!Array.isArray(items)) throw new Error(`fetchPage returned a non-array for ${config.tier} page ${page}`);
        if (!items.length) break;
        for (const item of items) {
          if (!item?.owner?.login || !item?.name) continue;
          const key = keyOf(item.owner.login, item.name);
          if (seen.has(key) || candidates.has(key)) continue;
          const score = config.useTrendingScore ? calculateTrendingScore(item, config.trendingWeight, config.days, now) : null;
          candidates.set(key, { item, score });
          if (!config.useTrendingScore && candidates.size >= config.target) break;
        }
        if (!config.useTrendingScore && candidates.size >= config.target) break;
        if (pageDelayMs) await sleep(pageDelayMs);
      }
    }

    let picked = [...candidates.entries()];
    if (config.useTrendingScore) picked.sort((a, b) => b[1].score - a[1].score);
    picked = picked.slice(0, config.target);
    for (const [key, { item, score }] of picked) {
      seen.add(key);
      collected.push(normalizeRepo(item, config.tier, rank++, score));
    }
    log(`  ${config.tier}: +${picked.length}`);
  }

  assertValidCatalog(collected, tierConfigs);
  return collected;
}

// ---------- file I/O ----------

/** Writes `data` to a temp file beside `target`, fsyncs, then renames over it. */
export function writeFileAtomic(target, data) {
  const tmp = path.join(path.dirname(target), `.${path.basename(target)}.${process.pid}.${Date.now()}.tmp`);
  const fd = fs.openSync(tmp, "w");
  try {
    fs.writeSync(fd, data);
    fs.fsyncSync(fd);
  } catch (err) {
    fs.closeSync(fd);
    fs.rmSync(tmp, { force: true });
    throw err;
  }
  fs.closeSync(fd);
  try {
    fs.renameSync(tmp, target);
  } catch (err) {
    fs.rmSync(tmp, { force: true });
    throw err;
  }
}

function readJsonIfExists(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/**
 * Full refresh: build, stage in an OS temp dir, re-read + re-validate the staged bytes, then
 * atomically replace the canonical file and metadata. Canonical files are untouched on any error.
 */
export async function refreshCatalog({
  fetchPage,
  dataDir,
  skipAllTime = false,
  tierConfigs = getTierConfigs(),
  now = Date.now(),
  pageDelayMs = 1000,
  log = console.log,
}) {
  const catalogPath = path.join(dataDir, "top-repos.json");
  const metaPath = path.join(dataDir, "catalog-meta.json");
  const previousCatalog = readJsonIfExists(catalogPath) ?? [];
  const previousMeta = readJsonIfExists(metaPath) ?? {};

  const catalog = await buildCatalog({ fetchPage, previousCatalog, skipAllTime, tierConfigs, now, pageDelayMs, log });

  const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), "novaris-catalog-"));
  try {
    const nowIso = new Date(now).toISOString();
    const meta = {
      schemaVersion: 1,
      refreshedAt: nowIso,
      allTimeRefreshedAt: skipAllTime ? (previousMeta.allTimeRefreshedAt ?? null) : nowIso,
      tierCounts: Object.fromEntries(tierConfigs.map((c) => [c.tier, catalog.filter((e) => e.tier === c.tier).length])),
    };
    const stagedCatalog = path.join(stagingDir, "top-repos.json");
    const stagedMeta = path.join(stagingDir, "catalog-meta.json");
    fs.writeFileSync(stagedCatalog, JSON.stringify(catalog, null, 2));
    fs.writeFileSync(stagedMeta, JSON.stringify(meta, null, 2) + "\n");
    assertValidCatalog(JSON.parse(fs.readFileSync(stagedCatalog, "utf8")), tierConfigs);

    fs.mkdirSync(dataDir, { recursive: true });
    // Catalog first: if the meta write fails, a stale allTimeRefreshedAt only causes an earlier refresh.
    writeFileAtomic(catalogPath, fs.readFileSync(stagedCatalog));
    writeFileAtomic(metaPath, fs.readFileSync(stagedMeta));
    return { catalog, meta };
  } finally {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
}

// ---------- CLI ----------

const USAGE = `Usage: node scripts/fetch-trending-repos.mjs [--skip-all-time] [--dry-run] [--help]
  --skip-all-time  keep the existing all-time tier (also SKIP_ALL_TIME=true)
  --dry-run        validate the existing public/data files; no network, no writes
Requires GITHUB_TOKEN for live refreshes.`;

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) return console.log(USAGE);

  const dataDir = path.resolve(process.cwd(), "public/data");
  if (args.includes("--dry-run")) {
    const existing = readJsonIfExists(path.join(dataDir, "top-repos.json"));
    assertValidCatalog(existing);
    return console.log(`dry-run: existing catalog valid (${existing.length} entries)`);
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN environment variable is required.");
  const skipAllTime = args.includes("--skip-all-time") || process.env.SKIP_ALL_TIME === "true";

  const { catalog } = await refreshCatalog({
    fetchPage: createGithubFetchPage(token),
    dataDir,
    skipAllTime,
    log: (m) => console.log(m),
  });
  console.log(`Catalog refreshed: ${catalog.length} entries -> ${path.join(dataDir, "top-repos.json")}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`Catalog refresh failed: ${err.message}`);
    process.exit(1);
  });
}
