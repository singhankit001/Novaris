import { langOf } from "./languages";
import type { ImportRef, LangId } from "./types";

export interface PathAlias {
  /** Directory the tsconfig/jsconfig lives in ("" for repo root). */
  dir: string;
  baseUrl?: string;
  paths?: Record<string, string[]>;
}

export interface ResolveOptions {
  aliases?: PathAlias[];
  goModule?: string;
}

export type Resolution =
  | { kind: "file"; path: string }
  | { kind: "external"; name: string }
  | { kind: "skip" };

const JS_EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts", ".vue", ".svelte"];

function dirname(p: string): string {
  const i = p.lastIndexOf("/");
  return i === -1 ? "" : p.slice(0, i);
}

/** Joins and normalises a posix path; returns null when it climbs above the repo root. */
export function joinPath(base: string, rel: string): string | null {
  const out: string[] = base ? base.split("/") : [];
  for (const seg of rel.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") {
      if (out.length === 0) return null;
      out.pop();
    } else out.push(seg);
  }
  return out.join("/");
}

/** Reads compilerOptions.baseUrl/paths from tsconfig-style JSON (comments and trailing commas allowed). */
export function parseTsconfig(text: string, dir: string): PathAlias | null {
  const clean = text
    .replace(/("(?:[^"\\]|\\.)*")|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (_m, str: string | undefined) => str ?? "")
    .replace(/,(\s*[}\]])/g, "$1");
  try {
    const json: unknown = JSON.parse(clean);
    const opts = (json as { compilerOptions?: { baseUrl?: unknown; paths?: unknown } } | null)?.compilerOptions;
    if (!opts) return null;
    const paths: Record<string, string[]> = {};
    if (opts.paths && typeof opts.paths === "object") {
      for (const [k, v] of Object.entries(opts.paths as Record<string, unknown>)) {
        if (Array.isArray(v)) paths[k] = v.filter((x): x is string => typeof x === "string");
      }
    }
    return { dir, baseUrl: typeof opts.baseUrl === "string" ? opts.baseUrl : undefined, paths };
  } catch {
    return null;
  }
}

export function parseGoModule(text: string): string | undefined {
  return /^\s*module\s+(\S+)/m.exec(text)?.[1];
}

export function createResolver(allPaths: Iterable<string>, opts: ResolveOptions = {}) {
  const files = new Set(allPaths);
  const byBase = new Map<string, string[]>();
  for (const p of files) {
    const base = p.slice(p.lastIndexOf("/") + 1);
    const list = byBase.get(base);
    if (list) list.push(p);
    else byBase.set(base, [p]);
  }
  const dirFiles = new Map<string, string[]>();
  for (const p of files) {
    const d = dirname(p);
    const list = dirFiles.get(d);
    if (list) list.push(p);
    else dirFiles.set(d, [p]);
  }

  const has = (p: string | null): p is string => p !== null && files.has(p);

  function suffixLookup(rel: string): string | null {
    const base = rel.slice(rel.lastIndexOf("/") + 1);
    const hits = (byBase.get(base) ?? []).filter((p) => p === rel || p.endsWith(`/${rel}`));
    return hits.sort((a, b) => a.length - b.length)[0] ?? null;
  }

  function jsCandidates(target: string): string | null {
    if (has(target) && JS_EXTS.some((e) => target.endsWith(e))) return target;
    // TS ESM style: "./a.js" refers to a.ts / a.tsx
    const stripped = target.replace(/\.(m|c)?jsx?$/, "");
    for (const e of JS_EXTS) if (files.has(stripped + e)) return stripped + e;
    for (const e of JS_EXTS) if (files.has(`${target}${e}`)) return `${target}${e}`;
    for (const e of JS_EXTS) if (files.has(`${target}/index${e}`)) return `${target}/index${e}`;
    return null;
  }

  function externalName(spec: string): string {
    const clean = spec.replace(/^node:/, "");
    const parts = clean.split("/");
    return clean.startsWith("@") ? parts.slice(0, 2).join("/") : (parts[0] ?? clean);
  }

  function resolveAlias(from: string, spec: string): string | null {
    const aliases = (opts.aliases ?? []).filter((a) => a.dir === "" || from.startsWith(`${a.dir}/`));
    aliases.sort((a, b) => b.dir.length - a.dir.length);
    for (const a of aliases) {
      const root = joinPath(a.dir, a.baseUrl ?? ".") ?? a.dir;
      for (const [pattern, targets] of Object.entries(a.paths ?? {})) {
        const star = pattern.indexOf("*");
        let captured: string | null = null;
        if (star === -1) captured = pattern === spec ? "" : null;
        else {
          const pre = pattern.slice(0, star);
          const post = pattern.slice(star + 1);
          if (spec.startsWith(pre) && spec.endsWith(post) && spec.length >= pre.length + post.length) {
            captured = spec.slice(pre.length, spec.length - post.length);
          }
        }
        if (captured === null) continue;
        for (const t of targets) {
          const hit = jsCandidates(joinPath(root, t.replace("*", captured)) ?? "\0");
          if (hit) return hit;
        }
      }
      if (a.baseUrl !== undefined && !spec.startsWith(".")) {
        const hit = jsCandidates(joinPath(root, spec) ?? "\0");
        if (hit) return hit;
      }
    }
    return null;
  }

  function resolveJs(from: string, spec: string): Resolution {
    if (spec.startsWith(".")) {
      const hit = jsCandidates(joinPath(dirname(from), spec) ?? "\0");
      return hit ? { kind: "file", path: hit } : { kind: "skip" };
    }
    if (/^[\w@$~#-]/.test(spec) || spec.startsWith("/")) {
      const viaAlias = resolveAlias(from, spec);
      if (viaAlias) return { kind: "file", path: viaAlias };
    }
    if (/^[@~]\//.test(spec)) {
      const rest = spec.slice(2);
      const dirs = ["src", "app", "", ...from.split("/").slice(0, -1).map((_, i, a) => a.slice(0, i + 1).join("/")).flatMap((d) => [`${d}/src`, d])];
      for (const d of dirs) {
        const hit = jsCandidates(joinPath(d, rest) ?? "\0");
        if (hit) return { kind: "file", path: hit };
      }
      return { kind: "skip" };
    }
    if (spec.startsWith("/") || spec.startsWith("#")) return { kind: "skip" };
    // Workspace packages: "pkg/sub" may be a folder in the repo (monorepo); only trust exact repo matches.
    return { kind: "external", name: externalName(spec) };
  }

  function resolvePython(from: string, spec: string): Resolution {
    const dots = /^\.*/.exec(spec)?.[0].length ?? 0;
    const modPath = spec.slice(dots).replace(/\./g, "/");
    const tryAt = (root: string): string | null => {
      const parts = modPath ? modPath.split("/") : [];
      for (let n = parts.length; n >= (dots ? 0 : 1); n--) {
        const rel = parts.slice(0, n).join("/");
        const base = joinPath(root, rel);
        if (base === null) continue;
        const cands = rel ? [`${base}.py`, `${base}/__init__.py`] : [`${base}/__init__.py`];
        for (const c of cands) if (files.has(c)) return c;
      }
      return null;
    };
    if (dots) {
      let dir = dirname(from);
      for (let i = 1; i < dots; i++) dir = dirname(dir);
      const hit = tryAt(dir);
      return hit && hit !== from ? { kind: "file", path: hit } : { kind: "skip" };
    }
    const roots = new Set<string>(["", "src", "lib"]);
    const segs = dirname(from).split("/").filter(Boolean);
    for (let i = 1; i <= segs.length; i++) roots.add(segs.slice(0, i).join("/"));
    for (const r of [...roots].sort((a, b) => a.length - b.length)) {
      const hit = tryAt(r);
      if (hit) return { kind: "file", path: hit };
    }
    return { kind: "external", name: spec.split(".")[0] ?? spec };
  }

  function resolveGo(spec: string): Resolution {
    const mod = opts.goModule;
    if (mod && (spec === mod || spec.startsWith(`${mod}/`))) {
      const dir = spec === mod ? "" : spec.slice(mod.length + 1);
      const list = (dirFiles.get(dir) ?? []).filter((p) => p.endsWith(".go") && !p.endsWith("_test.go")).sort();
      if (!list.length) return { kind: "skip" };
      // A Go import targets a package (a directory). Anchor the edge on the file named like the package, else the first file.
      const pkg = dir.slice(dir.lastIndexOf("/") + 1);
      const rep = list.find((p) => p.endsWith(`/${pkg}.go`) || p === `${pkg}.go`) ?? list[0];
      return rep ? { kind: "file", path: rep } : { kind: "skip" };
    }
    const parts = spec.split("/");
    return { kind: "external", name: /\./.test(parts[0] ?? "") ? parts.slice(0, 3).join("/") : (parts[0] ?? spec) };
  }

  function resolveRust(from: string, ref: ImportRef): Resolution {
    const spec = ref.spec;
    const srcIdx = from.lastIndexOf("src/");
    const crateRoot = srcIdx === -1 ? dirname(from) : from.slice(0, srcIdx + 3);
    const stem = from.slice(from.lastIndexOf("/") + 1).replace(/\.rs$/, "");
    const modDir = ["mod", "lib", "main"].includes(stem) ? dirname(from) : joinPath(dirname(from), stem) ?? "";
    const tryMod = (base: string, segs: string[]): string | null => {
      for (let n = segs.length; n >= 1; n--) {
        const rel = joinPath(base, segs.slice(0, n).join("/"));
        if (rel === null) continue;
        for (const c of [`${rel}.rs`, `${rel}/mod.rs`]) if (files.has(c)) return c;
      }
      return null;
    };
    if (ref.kind === "mod") {
      const hit = tryMod(modDir, [spec]);
      return hit ? { kind: "file", path: hit } : { kind: "skip" };
    }
    const segs = spec.split("::");
    const head = segs[0];
    let hit: string | null = null;
    if (head === "crate") hit = tryMod(crateRoot, segs.slice(1));
    else if (head === "self") hit = tryMod(modDir, segs.slice(1));
    else if (head === "super") {
      const up = dirname(modDir);
      hit = tryMod(up, segs.slice(1).filter((s) => s !== "super"));
    } else return { kind: "external", name: head ?? spec };
    return hit && hit !== from ? { kind: "file", path: hit } : { kind: "skip" };
  }

  function resolveSuffix(spec: string, sep: RegExp, ext: string[], externalParts: number): Resolution {
    const segs = spec.split(sep).filter(Boolean);
    for (let drop = 0; drop < segs.length; drop++) {
      const rel = segs.slice(drop).join("/");
      for (const e of ext) {
        const hit = suffixLookup(rel + e);
        if (hit) return { kind: "file", path: hit };
      }
      // `import pkg.Class.NESTED` or member imports: also try with the last segment removed once.
    }
    for (const e of ext) {
      const parent = segs.slice(0, -1).join("/");
      const hit = parent ? suffixLookup(parent + e) : null;
      if (hit) return { kind: "file", path: hit };
    }
    return { kind: "external", name: segs.slice(0, externalParts).join(".") || spec };
  }

  return function resolve(from: string, ref: ImportRef): Resolution {
    const lang: LangId = langOf(from);
    const spec = ref.spec;
    switch (lang) {
      case "typescript":
      case "javascript":
      case "vue":
      case "svelte":
        return resolveJs(from, spec);
      case "python":
        return resolvePython(from, spec);
      case "go":
        return resolveGo(spec);
      case "rust":
        return resolveRust(from, ref);
      case "java":
      case "kotlin": {
        const r = resolveSuffix(spec, /\./, [".java", ".kt"], 2);
        return r.kind === "file" && r.path === from ? { kind: "skip" } : r;
      }
      case "ruby": {
        if (ref.kind === "static") {
          const target = joinPath(dirname(from), spec);
          const hit = target !== null && [target, `${target}.rb`].find((c) => files.has(c));
          return hit ? { kind: "file", path: hit } : { kind: "skip" };
        }
        for (const c of [`lib/${spec}.rb`, `${spec}.rb`, `app/${spec}.rb`]) if (files.has(c)) return { kind: "file", path: c };
        return { kind: "external", name: spec.split("/")[0] ?? spec };
      }
      case "php": {
        if (ref.kind === "require") {
          const target = joinPath(dirname(from), spec);
          return has(target) ? { kind: "file", path: target } : { kind: "skip" };
        }
        return resolveSuffix(spec, /\\/, [".php"], 1);
      }
      case "csharp":
        return { kind: "external", name: spec.split(".").slice(0, 2).join(".") };
      default:
        return { kind: "skip" };
    }
  };
}
