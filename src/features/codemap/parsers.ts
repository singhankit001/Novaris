import { langOf } from "./languages";
import type { ImportKind, ImportRef, LangId } from "./types";

function stripJsComments(src: string): string {
  // Keeps string contents intact enough for import specs; removes /* */ and // comments.
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:\\'"`])\/\/[^\n]*/g, "$1");
}

function collect(out: ImportRef[], src: string, re: RegExp, kind: ImportKind, group = 1) {
  for (const m of src.matchAll(re)) {
    const spec = m[group];
    if (spec) out.push({ spec, kind });
  }
}

function parseJs(src: string): ImportRef[] {
  const s = stripJsComments(src);
  const out: ImportRef[] = [];
  collect(out, s, /\bimport\s+(?:type\s+)?(?:[\w$*{}\s,]+?\s+from\s+)?["']([^"'\n]+)["']/g, "static");
  collect(out, s, /\bexport\s+(?:type\s+)?(?:\*(?:\s+as\s+[\w$]+)?|\{[^}]*\})\s+from\s+["']([^"'\n]+)["']/g, "reexport");
  collect(out, s, /\bimport\s*\(\s*(?:\/\*[^*]*\*\/\s*)?["']([^"'\n]+)["']\s*\)/g, "dynamic");
  collect(out, s, /\brequire\s*\(\s*["']([^"'\n]+)["']\s*\)/g, "require");
  return out;
}

function parseVueSvelte(src: string): ImportRef[] {
  const blocks = [...src.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1] ?? "");
  return parseJs(blocks.length ? blocks.join("\n") : src);
}

function parsePython(src: string): ImportRef[] {
  const out: ImportRef[] = [];
  for (const line of src.split("\n")) {
    const from = /^\s*from\s+(\.*[\w.]*)\s+import\s+(.+)$/.exec(line);
    if (from) {
      const base = from[1] ?? "";
      if (/^\.+$/.test(base)) {
        // `from . import a, b` points at sibling modules a and b.
        for (const name of (from[2] ?? "").replace(/[()]/g, "").split(",")) {
          const n = name.trim().split(/\s+as\s+/)[0];
          if (n && /^\w+$/.test(n)) out.push({ spec: base + n, kind: "static" });
        }
      } else {
        out.push({ spec: base, kind: "static" });
      }
      continue;
    }
    const imp = /^\s*import\s+([\w.,\s]+?)(?:\s+as\s+\w+)?\s*(?:#.*)?$/.exec(line);
    if (imp) {
      for (const part of (imp[1] ?? "").split(",")) {
        const n = part.trim().split(/\s+as\s+/)[0];
        if (n) out.push({ spec: n, kind: "static" });
      }
    }
  }
  return out;
}

function parseGo(src: string): ImportRef[] {
  const out: ImportRef[] = [];
  for (const m of src.matchAll(/^\s*import\s*\(([\s\S]*?)\)/gm)) {
    collect(out, m[1] ?? "", /"([^"\n]+)"/g, "static");
  }
  collect(out, src, /^\s*import\s+(?:[\w.]+\s+)?"([^"\n]+)"/gm, "static");
  return out;
}

function parseRust(src: string): ImportRef[] {
  const out: ImportRef[] = [];
  collect(out, src, /^\s*(?:pub(?:\([^)]*\))?\s+)?use\s+((?:crate|super|self)(?:::\w+)*)/gm, "static");
  collect(out, src, /^\s*(?:pub(?:\([^)]*\))?\s+)?use\s+(?!crate\b|super\b|self\b)(\w+)::/gm, "static");
  collect(out, src, /^\s*(?:pub(?:\([^)]*\))?\s+)?mod\s+(\w+)\s*;/gm, "mod");
  return out;
}

function parseJvm(src: string): ImportRef[] {
  const out: ImportRef[] = [];
  collect(out, src, /^\s*import\s+(?:static\s+)?([\w.]+?)(?:\.\*)?\s*;?\s*$/gm, "static");
  return out;
}

function parseRuby(src: string): ImportRef[] {
  const out: ImportRef[] = [];
  collect(out, src, /^\s*require_relative\s*\(?\s*["']([^"'\n]+)["']/gm, "static");
  collect(out, src, /^\s*require\s*\(?\s*["']([^"'\n]+)["']/gm, "require");
  return out;
}

function parsePhp(src: string): ImportRef[] {
  const out: ImportRef[] = [];
  collect(out, src, /^\s*use\s+(?:function\s+|const\s+)?([\w\\]+)(?:\s+as\s+\w+)?\s*;/gm, "static");
  collect(out, src, /\b(?:require|include)(?:_once)?\s*\(?\s*(?:__DIR__\s*\.\s*)?["']([^"'\n]+)["']/g, "require");
  return out;
}

function parseCsharp(src: string): ImportRef[] {
  const out: ImportRef[] = [];
  collect(out, src, /^\s*(?:global\s+)?using\s+(?:static\s+)?(?:\w+\s*=\s*)?([\w.]+)\s*;/gm, "static");
  return out;
}

const PARSERS: Partial<Record<LangId, (src: string) => ImportRef[]>> = {
  typescript: parseJs,
  javascript: parseJs,
  vue: parseVueSvelte,
  svelte: parseVueSvelte,
  python: parsePython,
  go: parseGo,
  rust: parseRust,
  java: parseJvm,
  kotlin: parseJvm,
  ruby: parseRuby,
  php: parsePhp,
  csharp: parseCsharp,
};

/** Extracts import specifiers; duplicates are removed, order is first-seen. */
export function extractImports(path: string, source: string): ImportRef[] {
  const parse = PARSERS[langOf(path)];
  if (!parse) return [];
  const seen = new Set<string>();
  const out: ImportRef[] = [];
  for (const ref of parse(source)) {
    if (seen.has(ref.spec)) continue;
    seen.add(ref.spec);
    out.push(ref);
  }
  return out;
}

const FILE_HEADER = /^--- FILE: (.+?) ---$/;

/** Splits the `--- FILE: path ---` context produced by fetchRepoFiles into per-file source. */
export function parseFileBlocks(context: string): Map<string, string> {
  const files = new Map<string, string>();
  let current: string | null = null;
  let buf: string[] = [];
  const flush = () => {
    if (current !== null) files.set(current, buf.join("\n"));
  };
  for (const line of context.split("\n")) {
    const m = FILE_HEADER.exec(line);
    if (m) {
      flush();
      current = m[1] ?? null;
      buf = [];
    } else if (current !== null && !line.startsWith("--- NOTE:")) {
      buf.push(line);
    }
  }
  flush();
  return files;
}
