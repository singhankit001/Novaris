import type { FileNode } from "@/lib/github";

// FIXTURE: a synthetic project used only to exercise the codemap UI without GitHub. Not a real repository.
const groups: Record<string, string[]> = {
  "src/app": ["layout", "page", "providers"],
  "src/components": ["Button", "Card", "Modal", "Table", "Form", "Nav", "Toast", "Avatar", "Tabs", "Chart"],
  "src/hooks": ["useAuth", "useQuery", "useDebounce", "useMedia", "useStore"],
  "src/lib": ["api", "auth", "cache", "format", "logger", "router", "schema", "storage"],
  "src/features/billing": ["plans", "invoice", "checkout", "webhook"],
  "src/features/search": ["index", "query", "ranking", "suggest"],
  "src/utils": ["array", "date", "string", "math"],
  "server/routes": ["users", "orders", "health", "auth"],
  "server/db": ["client", "migrate", "models"],
};

const files = Object.entries(groups).flatMap(([dir, names]) => names.map((n) => `${dir}/${n}.ts`));

export const sampleTree: FileNode[] = [
  ...files.map((path, i) => ({ path, type: "blob" as const, sha: `fx${i}`, size: 1200 })),
  { path: "README.md", type: "blob", sha: "fxr", size: 900 },
  { path: "package.json", type: "blob", sha: "fxp", size: 700 },
  { path: "src/__tests__/api.test.ts", type: "blob", sha: "fxt", size: 800 },
];

const rel = (from: string, to: string) => {
  const a = from.split("/").slice(0, -1);
  const b = to.replace(/\.ts$/, "").split("/");
  while (a.length && b.length > 1 && a[0] === b[0]) {
    a.shift();
    b.shift();
  }
  return `${a.length ? "../".repeat(a.length) : "./"}${b.join("/")}`;
};

function contentFor(path: string, i: number): string {
  const picks = new Set<string>();
  for (let k = 1; k <= 3 + (i % 3); k++) {
    const j = i + 1 + ((i * 7 + k * 11) % Math.max(1, files.length - i - 1));
    const t = files[j];
    if (t && t !== path) picks.add(t);
  }
  // utilities are imported by everything, creating realistic fan-in
  const util = files.find((f) => f.startsWith("src/utils/"));
  if (util && files.indexOf(util) > i && i % 2 === 0) picks.add(util);
  const ext = i % 3 === 0 ? 'import React from "react";\n' : i % 4 === 0 ? 'import { z } from "zod";\n' : "";
  return ext + [...picks].map((t) => `import { x } from "${rel(path, t)}";`).join("\n") + "\nexport const x = 1;\n";
}

export const sampleFetch = async (_owner: string, _repo: string, req: Array<{ path: string }>) => {
  await new Promise((r) => setTimeout(r, 350));
  const fetchedFiles: string[] = [];
  let context = "";
  for (const { path } of req) {
    const i = files.indexOf(path);
    context += `\n--- FILE: ${path} ---\n${i === -1 ? "export {};" : contentFor(path, i)}\n`;
    fetchedFiles.push(path);
  }
  return { context, fetchedFiles };
};
