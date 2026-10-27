import type { CodeFile, LangId, TreeFile } from "./types";

const EXT: Record<string, LangId> = {
  ts: "typescript", tsx: "typescript", mts: "typescript", cts: "typescript",
  js: "javascript", jsx: "javascript", mjs: "javascript", cjs: "javascript",
  vue: "vue", svelte: "svelte", py: "python", go: "go", rs: "rust",
  java: "java", kt: "kotlin", rb: "ruby", php: "php", cs: "csharp",
};

export const LANG_LABEL: Record<LangId, string> = {
  typescript: "TypeScript", javascript: "JavaScript", vue: "Vue", svelte: "Svelte", python: "Python",
  go: "Go", rust: "Rust", java: "Java", kotlin: "Kotlin", ruby: "Ruby", php: "PHP", csharp: "C#",
  other: "Other", external: "External",
};

/** Data-identity colours. The label always carries the language name, colour is never the only channel. */
export const LANG_COLOR: Record<LangId, string> = {
  typescript: "#2f54ff", javascript: "#b7791f", vue: "#0f9d76", svelte: "#e0457b", python: "#3b7ddd",
  go: "#0a7aa3", rust: "#c2410c", java: "#b4540a", kotlin: "#7a4dff", ruby: "#cc2f4d", php: "#6d5acd",
  csharp: "#5b3fd0", other: "#868b99", external: "#626775",
};

const SKIP_SEGMENTS = new Set([
  "node_modules", "vendor", "dist", "build", ".next", "out", "coverage", "__pycache__", "third_party",
  "target", ".git", "bower_components", "__generated__", ".turbo", ".svelte-kit", ".nuxt",
]);

export function extOf(path: string): string {
  const base = path.slice(path.lastIndexOf("/") + 1);
  const i = base.lastIndexOf(".");
  return i <= 0 ? "" : base.slice(i + 1).toLowerCase();
}

export function langOf(path: string): LangId {
  return EXT[extOf(path)] ?? "other";
}

export function isGeneratedOrVendored(path: string): boolean {
  const parts = path.split("/");
  if (parts.slice(0, -1).some((p) => SKIP_SEGMENTS.has(p))) return true;
  return /\.min\.(js|mjs|cjs)$|\.d\.ts$|\.generated\.|\.gen\.|\.pb\.go$|_pb2?\.py$|_pb\.(js|ts)$|\.bundle\.js$/.test(path);
}

export function isTestPath(path: string): boolean {
  return (
    /(^|\/)(__tests__|tests?|spec|e2e|cypress|__mocks__|fixtures?)\//.test(path) ||
    /\.(test|spec)\.[a-z]+$|_test\.(go|py|rb|rs)$|(^|\/)test_[^/]+\.py$|Tests?\.(java|kt|cs)$|_spec\.rb$/.test(path)
  );
}

export function isSourcePath(path: string): boolean {
  return langOf(path) !== "other" && !isGeneratedOrVendored(path);
}

export function toCodeFile(f: TreeFile, parsed = false): CodeFile {
  const slash = f.path.lastIndexOf("/");
  return {
    path: f.path,
    name: f.path.slice(slash + 1),
    folder: slash === -1 ? "" : f.path.slice(0, slash),
    lang: langOf(f.path),
    size: f.size,
    isSource: isSourcePath(f.path),
    isTest: isTestPath(f.path),
    parsed,
  };
}

const ENTRY = /(^|\/)(index|main|app|server|cli|mod|lib|manage|__main__|__init__)\.[a-z]+$|(^|\/)app\/(layout|page|route)\.[a-z]+$|(^|\/)cmd\/[^/]+\/main\.go$|(^|\/)(Program|Main|Application)\.(cs|java|kt)$/;
const CONFIG = /(^|\/)[^/]*\.(config|setup|conf)\.[a-z]+$|(^|\/)(eslint|vite|webpack|rollup|jest|babel|tailwind|postcss|next|nuxt|svelte)[^/]*\.[a-z]+$/;

/** Higher scores are read first: entry points, shallow files, small files; tests and tooling config last. */
export function rankScore(f: CodeFile): number {
  const depth = f.path.split("/").length - 1;
  let s = 100 - depth * 6;
  if (ENTRY.test(f.path)) s += 40;
  if (/(^|\/)(src|lib|app|pkg|internal|cmd)\//.test(f.path)) s += 10;
  if (CONFIG.test(f.path)) s -= 30;
  if (f.isTest) s -= 80;
  if (f.size && f.size > 60_000) s -= 15;
  return s;
}

export function selectSourceFiles(files: CodeFile[], max: number): { selected: CodeFile[]; eligible: number } {
  const eligible = files.filter((f) => f.isSource && (f.size === undefined || f.size <= 200_000));
  const selected = [...eligible].sort((a, b) => rankScore(b) - rankScore(a) || a.path.localeCompare(b.path)).slice(0, max);
  return { selected, eligible: eligible.length };
}
