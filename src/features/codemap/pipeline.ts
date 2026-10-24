import { buildCodeGraph } from "./graph";
import { selectSourceFiles, toCodeFile } from "./languages";
import { extractImports, parseFileBlocks } from "./parsers";
import { createResolver, parseGoModule, parseTsconfig, type PathAlias } from "./resolve";
import type { CodeGraph, ImportRef, TreeFile } from "./types";

/** Source files read per repository. Each read is one GitHub request on the server, so this bounds API cost. */
export const MAX_SOURCE_FILES = 240;
export const BATCH_FILES = 40;
/** Keeps one batch well under the server's 200k-token context cap (about 4 bytes per token). */
export const BATCH_BYTES = 360_000;
const CONCURRENCY = 2;
const UNKNOWN_SIZE = 8_000;
const CONFIG_FILES = ["tsconfig.json", "jsconfig.json", "go.mod"];

export type FailureKind = "rate-limit" | "not-found" | "network" | "unknown";

export interface PipelineState {
  phase: "structure" | "reading" | "done" | "error";
  graph: CodeGraph;
  /** Source files in the repo that are eligible for reading. */
  eligible: number;
  /** Source files chosen for reading (capped). */
  planned: number;
  read: number;
  /** Files requested but not returned by the server (truncated or unreadable). */
  unreadable: number;
  fromCache: boolean;
  /** Set when reading stopped early; the graph is partial. */
  stopped?: { kind: FailureKind; message: string };
  error?: { kind: FailureKind; message: string };
}

export type FetchFiles = (
  owner: string,
  repo: string,
  files: Array<{ path: string; sha?: string }>,
) => Promise<{ context: string; fetchedFiles: string[] }>;

export function classifyFailure(err: unknown): { kind: FailureKind; message: string } {
  const message = err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";
  if (/rate.?limit|429|too many/i.test(message)) return { kind: "rate-limit", message: "GitHub rate limit reached." };
  if (/not found|404|private|forbidden|403/i.test(message)) return { kind: "not-found", message: "The repository is private or could not be found." };
  if (/network|fetch failed|timeout|ECONN/i.test(message)) return { kind: "network", message: "Network problem while reading files." };
  return { kind: "unknown", message };
}

export function planBatches<T extends { path: string; size?: number }>(files: T[]): T[][] {
  const batches: T[][] = [];
  let cur: T[] = [];
  let bytes = 0;
  for (const f of files) {
    const size = f.size ?? UNKNOWN_SIZE;
    if (cur.length && (cur.length >= BATCH_FILES || bytes + size > BATCH_BYTES)) {
      batches.push(cur);
      cur = [];
      bytes = 0;
    }
    cur.push(f);
    bytes += size;
  }
  if (cur.length) batches.push(cur);
  return batches;
}

const yieldToMain = () => new Promise<void>((r) => setTimeout(r, 0));

interface CachePayload {
  v: 1;
  parsed: Array<[string, ImportRef[]]>;
  aliases: PathAlias[];
  goModule?: string;
  eligible: number;
  planned: number;
  unreadable: number;
  stopped?: PipelineState["stopped"];
}

function cacheKey(owner: string, repo: string, tree: TreeFile[]): string {
  let h = 5381;
  for (const t of tree) {
    const s = t.sha ?? t.path;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return `novaris_codemap:v1:${owner}/${repo}:${tree.length}:${(h >>> 0).toString(36)}`.toLowerCase();
}

function readCache(key: string): CachePayload | null {
  try {
    const raw = typeof window === "undefined" ? null : window.sessionStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as CachePayload) : null;
    return parsed?.v === 1 ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, payload: CachePayload) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Storage full or unavailable: the map still works, it just is not cached.
  }
}

export interface RunOptions {
  owner: string;
  repo: string;
  tree: TreeFile[];
  fetchFiles: FetchFiles;
  onState: (state: PipelineState) => void;
  signal?: AbortSignal;
  maxFiles?: number;
}

export async function runPipeline(opts: RunOptions): Promise<void> {
  const { owner, repo, fetchFiles, onState, signal } = opts;
  const tree = opts.tree.filter((t) => t.type !== "tree");
  const allFiles = tree.map((t) => toCodeFile(t));
  const { selected, eligible } = selectSourceFiles(allFiles, opts.maxFiles ?? MAX_SOURCE_FILES);
  const sizeOf = new Map(tree.map((t) => [t.path, t]));
  const resolverPaths = tree.map((t) => t.path);

  const parsed = new Map<string, ImportRef[]>();
  const aliases: PathAlias[] = [];
  let goModule: string | undefined;
  let unreadable = 0;

  const build = (): CodeGraph =>
    buildCodeGraph({ tree, parsed, resolve: createResolver(resolverPaths, { aliases, goModule }) });
  const emit = (phase: PipelineState["phase"], extra: Partial<PipelineState> = {}) =>
    onState({ phase, graph: build(), eligible, planned: selected.length, read: parsed.size, unreadable, fromCache: false, ...extra });

  const key = cacheKey(owner, repo, opts.tree);
  const cached = readCache(key);
  if (cached) {
    for (const [p, refs] of cached.parsed) parsed.set(p, refs);
    aliases.push(...cached.aliases);
    goModule = cached.goModule;
    unreadable = cached.unreadable;
    emit("done", { fromCache: true, stopped: cached.stopped });
    return;
  }

  // Structure first: instant, no network.
  emit("structure");
  if (selected.length === 0) {
    emit("done");
    return;
  }

  const configPaths = CONFIG_FILES.filter((c) => sizeOf.has(c));
  const queue: Array<Array<{ path: string }>> = planBatches(selected);
  const retried = new Set<string>();
  let stopped: PipelineState["stopped"];

  const runBatch = async (batch: Array<{ path: string }>, withConfigs: boolean) => {
    const request = [...(withConfigs ? configPaths : []), ...batch.map((b) => b.path)].map((path) => ({
      path,
      sha: sizeOf.get(path)?.sha,
    }));
    const { context, fetchedFiles } = await fetchFiles(owner, repo, request);
    if (signal?.aborted) return;
    // The server action reports per-file failures as missing files, so an empty reply means GitHub refused the reads.
    if (fetchedFiles.length === 0) throw new Error("GitHub rate limit: no file contents were returned");
    const blocks = parseFileBlocks(context);
    let n = 0;
    for (const [path, src] of blocks) {
      if (path === "tsconfig.json" || path === "jsconfig.json") {
        const a = parseTsconfig(src, "");
        if (a) aliases.push(a);
      } else if (path === "go.mod") goModule = parseGoModule(src);
      else if (sizeOf.has(path)) parsed.set(path, extractImports(path, src));
      if (++n % 25 === 0) await yieldToMain();
    }
    const got = new Set(fetchedFiles);
    const missing = batch.filter((b) => !got.has(b.path) && !parsed.has(b.path));
    const again = missing.filter((m) => !retried.has(m.path));
    again.forEach((m) => retried.add(m.path));
    if (again.length && again.length < batch.length) queue.push(again);
    else unreadable += missing.length;
  };

  try {
    // The first batch carries tsconfig/go.mod so aliases are known when edges are resolved.
    const first = queue.shift();
    if (first) {
      await runBatch(first, true);
      emit("reading");
    }
    const worker = async () => {
      while (!signal?.aborted && !stopped) {
        const batch = queue.shift();
        if (!batch) return;
        try {
          await runBatch(batch, false);
        } catch (err) {
          stopped = classifyFailure(err);
          unreadable += batch.length;
          return;
        }
        emit("reading");
        await yieldToMain();
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  } catch (err) {
    if (signal?.aborted) return;
    stopped = classifyFailure(err);
  }
  if (signal?.aborted) return;

  unreadable += queue.reduce((n, b) => n + b.length, 0);
  if (parsed.size === 0 && stopped) {
    emit("error", { error: stopped });
    return;
  }
  // A rate-limited partial result is not cached, so a retry can read the rest.
  if (!stopped) {
    writeCache(key, { v: 1, parsed: [...parsed], aliases, goModule, eligible, planned: selected.length, unreadable });
  }
  emit("done", { stopped });
}

/** Plain-language coverage line, honest about what was and was not read. */
export function coverageLine(s: Pick<PipelineState, "read" | "eligible" | "planned" | "unreadable" | "stopped">): string | null {
  const notRead = s.eligible - s.read;
  if (notRead <= 0) return null;
  const why = s.stopped
    ? s.stopped.message
    : s.planned < s.eligible
      ? `limit of ${s.planned} files reached`
      : s.unreadable > 0
        ? `${s.unreadable} could not be read`
        : "still reading";
  return `Mapped imports in ${s.read} of ${s.eligible} source files; ${notRead} not read: ${why}`;
}
