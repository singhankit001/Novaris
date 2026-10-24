export type LangId =
  | "typescript"
  | "javascript"
  | "vue"
  | "svelte"
  | "python"
  | "go"
  | "rust"
  | "java"
  | "kotlin"
  | "ruby"
  | "php"
  | "csharp"
  | "other"
  | "external";

export interface TreeFile {
  path: string;
  type?: "blob" | "tree";
  sha?: string;
  size?: number;
}

export type ImportKind = "static" | "dynamic" | "require" | "reexport" | "mod";

export interface ImportRef {
  spec: string;
  kind: ImportKind;
}

export interface CodeFile {
  path: string;
  name: string;
  folder: string;
  lang: LangId;
  size?: number;
  isSource: boolean;
  isTest: boolean;
  /** True once the file contents were read and parsed. */
  parsed: boolean;
}

export interface CodeFolder {
  path: string;
  name: string;
  parent: string | null;
  folders: string[];
  files: string[];
}

export interface CodeEdge {
  from: string;
  to: string;
}

export interface ExternalPackage {
  /** Node id, `ext:<name>`. */
  id: string;
  name: string;
}

export interface CodeGraph {
  files: Map<string, CodeFile>;
  folders: Map<string, CodeFolder>;
  externals: Map<string, ExternalPackage>;
  /** file -> file imports (deduplicated). */
  edges: CodeEdge[];
  /** file -> external package imports (deduplicated). */
  externalEdges: CodeEdge[];
  outgoing: Map<string, string[]>;
  incoming: Map<string, string[]>;
  /** Groups of 2+ files (or a self-importing file) that import each other in a cycle. */
  cycles: string[][];
}

export interface GraphStats {
  files: number;
  folders: number;
  sourceFiles: number;
  parsedFiles: number;
  importEdges: number;
  externalPackages: number;
  mostImported: { path: string; count: number } | null;
  cycleGroups: number;
  filesInCycles: number;
}

export const EXTERNAL_FOLDER = "__external__";
export const EXTERNAL_PREFIX = "ext:";
