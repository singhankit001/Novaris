import type { ShowcaseEntry } from "../showcase-types";
import { ArchitectureGraph } from "../graph/architecture-graph";
import type { ArchEdge, ArchNode } from "../graph/graph-types";
import { CodeBlock } from "./code-block";
import { CodeComparison } from "./code-comparison";
import { BeamDemo, FileTreeDemo, OrbitDemo } from "./demos";
import { Terminal, type TerminalLine } from "./terminal";

const AUTH_BEFORE = `import { sign } from "jsonwebtoken";

export function issueSession(userId: string) {
  // illustrative sample
  return sign({ sub: userId }, "dev-secret");
}`;
const AUTH_AFTER = `import { sign } from "jsonwebtoken";

export function issueSession(userId: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET required");
  return sign({ sub: userId }, secret, { expiresIn: "1h" });
}`;

const MIDDLEWARE = `import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token && req.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}`;
const SCHEMA = `model Scan {
  id        String   @id @default(cuid())
  repoUrl   String
  status    String
  createdAt DateTime @default(now())
}`;

const TRANSCRIPT: TerminalLine[] = [
  { kind: "command", text: "novaris scan github.com/acme/storefront" },
  { kind: "output", text: "Cloning repository (depth 1)..." },
  { kind: "output", text: "Indexed 214 files, 38 dependencies" },
  { kind: "warn", text: "src/lib/auth.ts:5 hardcoded signing secret" },
  { kind: "success", text: "Report ready: 1 finding, 0 critical" },
  { kind: "command", text: "novaris explain src/lib/auth.ts:5" },
  { kind: "output", text: "Secret literal passed to sign(); read it from the environment." },
];

const NODES: ArchNode[] = [
  { id: "web", label: "web app", kind: "module", x: 0, y: 90, detail: "src/app" },
  { id: "mw", label: "middleware", kind: "file", x: 250, y: 0, detail: "src/middleware.ts" },
  { id: "auth", label: "auth", kind: "file", x: 250, y: 180, detail: "src/lib/auth.ts" },
  { id: "f1", label: "Hardcoded secret", kind: "finding", severity: "high", x: 500, y: 250, detail: "auth.ts:5" },
  { id: "db", label: "Postgres", kind: "service", x: 500, y: 60, detail: "prisma/schema.prisma" },
  { id: "gh", label: "GitHub API", kind: "external", x: 500, y: -50 },
];
const EDGES: ArchEdge[] = [
  { id: "e1", from: "web", to: "mw", label: "imports", animated: true },
  { id: "e2", from: "web", to: "auth", label: "imports" },
  { id: "e3", from: "auth", to: "f1", label: "raises" },
  { id: "e4", from: "mw", to: "db", label: "reads" },
  { id: "e5", from: "mw", to: "gh", label: "calls", animated: true },
];

export const codeShowcase: ShowcaseEntry[] = [
  {
    id: "file-tree",
    name: "File Tree",
    reference: "Magic UI File Tree",
    routes: ["/ai-code-review-tool", "/typescript-code-analyzer", "/github-repository-analysis", "/chat", "/repo"],
    render: () => <FileTreeDemo />,
  },
  {
    id: "code-block",
    name: "Code Block",
    reference: "Aceternity Code Block",
    routes: ["/github-code-analyzer"],
    render: () => (
      <CodeBlock
        tabs={[
          { filename: "src/middleware.ts", code: MIDDLEWARE, highlight: [4, 5], annotations: { 5: "Checked on /dashboard routes only. API routes are not covered." } },
          { filename: "prisma/schema.prisma", code: SCHEMA, lang: "prisma", highlight: [3] },
        ]}
      />
    ),
  },
  {
    id: "code-comparison",
    name: "Code Comparison",
    reference: "Magic UI Code Comparison",
    routes: ["/ai-code-review-tool", "/github-code-analyzer", "/typescript-code-analyzer", "/nodejs-security-scanner", "/report"],
    render: () => <CodeComparison filename="src/lib/auth.ts" beforeCode={AUTH_BEFORE} afterCode={AUTH_AFTER} beforeLabel="Current" afterLabel="Suggested" />,
  },
  {
    id: "terminal",
    name: "Terminal",
    reference: "Magic UI Animated Terminal",
    routes: ["/ai-code-review-tool", "/security-scanner", "/github-code-analyzer"],
    render: () => <Terminal lines={TRANSCRIPT} title="novaris scan" />,
  },
  {
    id: "animated-beam",
    name: "Animated Beam",
    reference: "Magic UI Animated Beam",
    routes: ["/github-repository-analysis", "/security-scanner", "/solutions"],
    render: () => <BeamDemo />,
  },
  {
    // Decision: /solutions (what Novaris reads from a repo). /about carries no data story an orbit could explain.
    id: "orbiting-circles",
    name: "Orbiting Circles",
    reference: "Magic UI Orbiting Circles",
    routes: ["/solutions"],
    render: () => <OrbitDemo />,
  },
  {
    id: "architecture-graph",
    name: "Architecture Graph",
    reference: "React Flow examples (custom nodes and edges)",
    routes: ["/github-repository-analysis", "/nodejs-security-scanner", "/repository-risk-analysis", "/repo"],
    render: () => <ArchitectureGraph label="Illustrative architecture of a sample repository" nodes={NODES} edges={EDGES} height={380} />,
  },
];
