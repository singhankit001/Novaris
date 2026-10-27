import type { TreeNode } from "@/components/fx/code/file-tree";
import type { TerminalLine } from "@/components/fx/code/terminal";

export const SESSION_TS = `import { cookies } from "next/headers";
import { verifyToken } from "./token";

export interface Session {
  userId: string;
  role: "member" | "admin";
}

export async function readSession(): Promise<Session | null> {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;
  const claims = await verifyToken(token);
  if (claims.expiresAt < Date.now()) return null;
  return { userId: claims.sub, role: claims.role };
}
`;

export const BILLING_BEFORE = `import { db } from "@/lib/db";
import { readSession } from "@/lib/auth/session";

export async function GET() {
  const { userId } = await readSession();
  const invoices = await db.invoice.findMany({ where: { userId } });
  return Response.json(invoices);
}
`;

export const BILLING_AFTER = `import { db } from "@/lib/db";
import { readSession } from "@/lib/auth/session";

export async function GET() {
  const session = await readSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  const invoices = await db.invoice.findMany({ where: { userId: session.userId } });
  return Response.json(invoices);
}
`;

export const STAGES = [
  { label: "Select file", ms: 4200, title: "A file is selected", text: "The reviewer opens src/lib/auth/session.ts. A diff-only reader sees these lines and nothing around them." },
  { label: "Read context", ms: 8500, title: "Novaris reads the whole file and its neighbours", text: "The full file, its imports, and every file that imports it are loaded before any comment is written." },
  { label: "Map callers", ms: 5200, title: "The dependency view shows who relies on this file", text: "Three files import readSession. The change touches what all three receive." },
  { label: "Review note", ms: 6500, title: "A context-sensitive note, with its source", text: "The note cites file and line, and says which claims were read directly and which were reasoned." },
  { label: "Improvement", ms: 7000, title: "The precise improvement", text: "The fix lands in the caller that the diff never showed, not in the file that changed." },
] as const;

export const CALLERS = [
  { id: "mw", path: "middleware.ts", note: "handles null" },
  { id: "bill", path: "api/billing/route.ts", note: "destructures result" },
  { id: "acct", path: "account/page.tsx", note: "handles null" },
] as const;

export const IMPORTS = [
  { id: "tok", path: "lib/auth/token.ts" },
  { id: "hdr", path: "next/headers" },
] as const;

export function treeFor(stage: number): TreeNode[] {
  const ctx = stage >= 1 ? ("context" as const) : undefined;
  const flag = stage >= 3 ? ("flagged" as const) : ctx;
  return [
    {
      id: "src",
      name: "src",
      children: [
        {
          id: "src/lib",
          name: "lib",
          children: [
            { id: "src/lib/auth", name: "auth", children: [{ id: "session", name: "session.ts", status: "changed" }, { id: "token", name: "token.ts", status: ctx }] },
            { id: "db", name: "db.ts" },
          ],
        },
        {
          id: "src/app",
          name: "app",
          children: [
            { id: "billing", name: "api/billing/route.ts", status: flag },
            { id: "account", name: "account/page.tsx", status: ctx },
          ],
        },
        { id: "middleware", name: "middleware.ts", status: ctx },
      ],
    },
  ];
}

export const TERMINAL: TerminalLine[] = [
  { kind: "command", text: "novaris review src/lib/auth/session.ts" },
  { kind: "output", text: "reading src/lib/auth/session.ts (15 lines, whole file)" },
  { kind: "output", text: "resolving imports: lib/auth/token.ts, next/headers" },
  { kind: "output", text: "finding importers of readSession" },
  { kind: "success", text: "3 callers: middleware.ts, api/billing/route.ts, account/page.tsx" },
  { kind: "output", text: "checking each call site against Session | null" },
  { kind: "warn", text: "1 call site does not handle null (api/billing/route.ts:5)" },
];
