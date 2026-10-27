import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  buildCatalog,
  createGithubFetchPage,
  refreshCatalog,
  validateCatalog,
  writeFileAtomic,
} from "../../scripts/fetch-trending-repos.mjs";

const NOW = Date.parse("2026-01-10T00:00:00Z");
const TINY = [
  { tier: "all-time", target: 4, min: 3, windows: [{ query: "a", sort: "stars" }], useTrendingScore: false },
  {
    tier: "weekly", target: 3, min: 2, days: 7, windows: [{ query: "w", sort: "updated" }],
    useTrendingScore: true, trendingWeight: { starVelocity: 0.6, recentStars: 0.3, pushRecency: 0.1 },
  },
];

const item = (name, stars = 100) => ({
  owner: { login: "o" }, name, stargazers_count: stars, description: "d", topics: ["t"], language: "JS",
  created_at: "2025-01-01T00:00:00Z", pushed_at: "2026-01-09T00:00:00Z",
});
// page 1 returns data for the query; later pages are empty.
const fixtureFetch = (calls = []) => async (query, _sort, page) => {
  calls.push(query);
  if (page > 1) return [];
  return query === "a" ? ["a1", "a2", "a3", "a4", "a5"].map((n) => item(n)) : ["w1", "w2", "w3", "a1"].map((n) => item(n));
};
const opts = { tierConfigs: TINY, now: NOW, pageDelayMs: 0 };
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "catalog-test-"));
const entry = (rank, tier, repo) => ({ owner: "o", repo, stars: 1, description: null, topics: [], language: null, tier, rank });

test("success: builds valid, deduped, contiguous catalog and writes atomically with meta", async () => {
  const dataDir = tmp();
  const { catalog, meta } = await refreshCatalog({ fetchPage: fixtureFetch(), dataDir, ...opts, log: () => {} });
  assert.deepEqual(validateCatalog(catalog, TINY), []);
  assert.equal(catalog.filter((e) => e.tier === "all-time").length, 4);
  assert.equal(catalog.filter((e) => e.tier === "weekly").length, 3); // a1 deduped against all-time
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dataDir, "top-repos.json"), "utf8")), catalog);
  const written = JSON.parse(fs.readFileSync(path.join(dataDir, "catalog-meta.json"), "utf8"));
  assert.equal(written.allTimeRefreshedAt, new Date(NOW).toISOString());
  assert.equal(written.allTimeRefreshedAt, meta.allTimeRefreshedAt);
  assert.deepEqual(fs.readdirSync(dataDir).sort(), ["catalog-meta.json", "top-repos.json"]); // no temp leftovers
});

test("upstream failure in a later tier: rejects and canonical file is byte-identical", async () => {
  const dataDir = tmp();
  const file = path.join(dataDir, "top-repos.json");
  fs.writeFileSync(file, '[{"previous":true}]\n');
  const before = fs.readFileSync(file);
  const failing = async (q, s, p) => {
    if (q === "w") throw new Error("GitHub API error 500: boom");
    return fixtureFetch()(q, s, p);
  };
  await assert.rejects(refreshCatalog({ fetchPage: failing, dataDir, ...opts, log: () => {} }), /500/);
  assert.deepEqual(fs.readFileSync(file), before);
  assert.equal(fs.existsSync(path.join(dataDir, "catalog-meta.json")), false);
});

test("per-tier minimum violation rejects and preserves previous data", async () => {
  const dataDir = tmp();
  const file = path.join(dataDir, "top-repos.json");
  fs.writeFileSync(file, "[]");
  const sparse = async (q, _s, p) => (p > 1 ? [] : q === "a" ? [item("a1")] : [item("w1")]);
  await assert.rejects(refreshCatalog({ fetchPage: sparse, dataDir, ...opts, log: () => {} }), /minimum/);
  assert.equal(fs.readFileSync(file, "utf8"), "[]");
});

test("schema violations, duplicates and rank gaps are detected", () => {
  const ok = [entry(1, "all-time", "a"), entry(2, "all-time", "b"), entry(3, "all-time", "c"), entry(4, "weekly", "w"), entry(5, "weekly", "x")];
  assert.deepEqual(validateCatalog(ok, TINY), []);
  const has = (list, re) => assert.ok(validateCatalog(list, TINY).some((e) => re.test(e)), String(re));
  has([{ ...ok[0], stars: -1 }, ...ok.slice(1)], /stars/);
  has([{ ...ok[0], stars: NaN }, ...ok.slice(1)], /stars/);
  has([{ ...ok[0], owner: "" }, ...ok.slice(1)], /owner/);
  has([{ ...ok[0], tier: "bogus" }, ...ok.slice(1)], /unknown tier/);
  has([ok[0], { ...ok[1], repo: "A" }, ok[2], ok[3], ok[4]].map((e, i) => (i === 1 ? { ...e, repo: "a" } : e)), /duplicate/);
  has([ok[0], { ...ok[1], rank: 5 }, ...ok.slice(2)], /rank/);
  has([ok[3], ok[4], ok[0], ok[1], ok[2]].map((e, i) => ({ ...e, rank: i + 1 })), /out of order/);
  has(ok.slice(0, 3), /weekly: 0 entries/);
});

test("skip-all-time carries previous all-time entries unchanged and keeps allTimeRefreshedAt", async () => {
  const dataDir = tmp();
  const prev = [1, 2, 3].map((i) => entry(i, "all-time", `old${i}`));
  fs.writeFileSync(path.join(dataDir, "top-repos.json"), JSON.stringify([...prev, entry(4, "weekly", "stale")]));
  fs.writeFileSync(path.join(dataDir, "catalog-meta.json"), JSON.stringify({ allTimeRefreshedAt: "2025-06-01T00:00:00.000Z" }));
  const calls = [];
  const { catalog, meta } = await refreshCatalog({ fetchPage: fixtureFetch(calls), dataDir, skipAllTime: true, ...opts, log: () => {} });
  assert.deepEqual(catalog.slice(0, 3), prev);
  assert.ok(!calls.includes("a"), "all-time must not be fetched");
  assert.equal(catalog.filter((e) => e.tier === "weekly").length, 3);
  assert.equal(meta.allTimeRefreshedAt, "2025-06-01T00:00:00.000Z");
});

test("skip-all-time without previous all-time data fails", async () => {
  await assert.rejects(buildCatalog({ fetchPage: fixtureFetch(), previousCatalog: [], skipAllTime: true, ...opts }), /all-time/);
});

test("fetch retries 429/5xx honoring retry-after, fails after bounded attempts, fails fast on 404", async () => {
  const waits = [];
  const res = (status, headers = {}, body = {}) => ({
    ok: status < 400, status, statusText: "x", headers: new Headers(headers), json: async () => body,
  });
  const seq = [res(429, { "retry-after": "3" }), res(502), res(200, {}, { items: [item("z")] })];
  const fp = createGithubFetchPage("t", { fetchImpl: async () => seq.shift(), sleepFn: async (ms) => waits.push(ms) });
  assert.equal((await fp("q", "stars", 1)).length, 1);
  assert.deepEqual(waits, [4000, 4000]);

  let n = 0;
  const always = createGithubFetchPage("t", { fetchImpl: async () => (n++, res(500)), sleepFn: async () => {} });
  await assert.rejects(always("q", "stars", 1), /500/);
  assert.equal(n, 5);

  n = 0;
  const notFound = createGithubFetchPage("t", { fetchImpl: async () => (n++, res(404)), sleepFn: async () => {} });
  await assert.rejects(notFound("q", "stars", 1), /404/);
  assert.equal(n, 1);
});

test("writeFileAtomic replaces content and leaves no temp files", () => {
  const dir = tmp();
  const f = path.join(dir, "x.json");
  fs.writeFileSync(f, "old");
  writeFileAtomic(f, "new");
  assert.equal(fs.readFileSync(f, "utf8"), "new");
  assert.deepEqual(fs.readdirSync(dir), ["x.json"]);
});
