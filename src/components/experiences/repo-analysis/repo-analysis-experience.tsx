"use client";

import { createRef, useRef, useState, type RefObject } from "react";
import { ArrowRight, FileCode2 } from "lucide-react";
import { cn } from "@/components/nv/cn";
import { AnimatedBeam } from "@/components/fx/code/animated-beam";
import { FileTree, type TreeNode } from "@/components/fx/code/file-tree";
import { ArchitectureGraph } from "@/components/fx/graph/architecture-graph";
import type { ArchEdge, ArchNode } from "@/components/fx/graph/graph-types";
import { CardBody, CardContainer, CardItem } from "@/components/fx/scene/card-3d";
import { DemoFrame } from "../shared";

interface Mod {
  id: string;
  label: string;
  kind: ArchNode["kind"];
  role: string;
  files: { path: string; why: string }[];
}

const MODS: Mod[] = [
  {
    id: "pages",
    label: "App pages",
    kind: "module",
    role: "Server-rendered routes the shopper sees. They read data through services and call route handlers for mutations.",
    files: [
      { path: "src/app/(shop)/page.tsx", why: "Lists products; the entry point of the storefront." },
      { path: "src/app/(shop)/cart/page.tsx", why: "Cart view; posts the order to the orders route." },
    ],
  },
  {
    id: "mw",
    label: "Middleware",
    kind: "module",
    role: "Runs before every matched request. Checks the session cookie and redirects anonymous visitors away from protected paths.",
    files: [
      { path: "src/middleware.ts", why: "Matcher config and the redirect rule." },
      { path: "src/lib/auth.ts", why: "Session verification helper the middleware imports." },
    ],
  },
  {
    id: "route",
    label: "Route handlers",
    kind: "module",
    role: "HTTP boundary. Validates the request body, calls a service, and shapes the JSON response.",
    files: [
      { path: "src/app/api/orders/route.ts", why: "POST creates an order, GET lists the caller's orders." },
      { path: "src/app/api/orders/[id]/route.ts", why: "Reads or cancels one order." },
    ],
  },
  {
    id: "svc",
    label: "Services",
    kind: "module",
    role: "Business rules. The only layer that talks to both the database client and the payment integration.",
    files: [
      { path: "src/lib/services/order-service.ts", why: "Order lifecycle and stock checks." },
      { path: "src/lib/services/payment-service.ts", why: "Builds charge requests for the payment provider." },
    ],
  },
  {
    id: "db",
    label: "Prisma + Postgres",
    kind: "service",
    role: "Persistence. One shared Prisma client; the schema file is the source of truth for tables and relations.",
    files: [
      { path: "src/lib/db.ts", why: "Singleton Prisma client." },
      { path: "prisma/schema.prisma", why: "Models: User, Product, Order, OrderItem." },
    ],
  },
  {
    id: "pay",
    label: "Payments provider",
    kind: "external",
    role: "Third-party API reached over HTTPS from one integration file, so swapping providers touches a single module.",
    files: [{ path: "src/lib/integrations/payments.ts", why: "Typed fetch wrapper around the provider API." }],
  },
];

const NODE_POS: Record<string, [number, number]> = { pages: [0, 0], mw: [0, 130], route: [250, 65], svc: [500, 65], db: [750, 0], pay: [750, 130] };
const NODES: ArchNode[] = MODS.map((m) => ({ id: m.id, label: m.label, kind: m.kind, x: NODE_POS[m.id]![0], y: NODE_POS[m.id]![1], detail: m.files[0]!.path.replace(/\/[^/]+$/, "/") }));
const EDGES: ArchEdge[] = [
  { id: "p-r", from: "pages", to: "route", label: "fetches", animated: true },
  { id: "m-r", from: "mw", to: "route", label: "guards", animated: true },
  { id: "r-s", from: "route", to: "svc", label: "calls", animated: true },
  { id: "s-d", from: "svc", to: "db", label: "queries", animated: true },
  { id: "s-y", from: "svc", to: "pay", label: "charges" },
];

const FLOW = ["req", "mw", "route", "svc", "db"] as const;
const FLOW_LABEL: Record<string, string> = { req: "Request", mw: "Middleware", route: "Route", svc: "Service", db: "Database" };

const TREE: TreeNode[] = [
  {
    id: "src",
    name: "src",
    children: [
      {
        id: "src/app",
        name: "app",
        children: [
          { id: "src/app/(shop)", name: "(shop)", children: [{ id: "src/app/(shop)/page.tsx", name: "page.tsx" }, { id: "src/app/(shop)/cart/page.tsx", name: "cart/page.tsx" }] },
          { id: "src/app/api", name: "api/orders", children: [{ id: "src/app/api/orders/route.ts", name: "route.ts" }, { id: "src/app/api/orders/[id]/route.ts", name: "[id]/route.ts" }] },
        ],
      },
      {
        id: "src/lib",
        name: "lib",
        children: [
          { id: "src/lib/auth.ts", name: "auth.ts" },
          { id: "src/lib/db.ts", name: "db.ts" },
          { id: "src/lib/integrations/payments.ts", name: "integrations/payments.ts" },
          { id: "src/lib/services", name: "services", children: [{ id: "src/lib/services/order-service.ts", name: "order-service.ts" }, { id: "src/lib/services/payment-service.ts", name: "payment-service.ts" }] },
        ],
      },
      { id: "src/middleware.ts", name: "middleware.ts" },
    ],
  },
  { id: "prisma", name: "prisma", children: [{ id: "prisma/schema.prisma", name: "schema.prisma" }] },
  { id: "package.json", name: "package.json" },
];
const FOLDERS = ["src", "src/app", "src/app/(shop)", "src/app/api", "src/lib", "src/lib/services", "prisma"];

function mark(nodes: TreeNode[], lit: Set<string>): TreeNode[] {
  return nodes.map((n) => (n.children ? { ...n, children: mark(n.children, lit) } : lit.has(n.id) ? { ...n, status: "context" as const } : n));
}

export function RepoAnalysisExperience() {
  const [sel, setSel] = useState("svc");
  const [file, setFile] = useState<string | null>(null);
  const mod = MODS.find((m) => m.id === sel)!;
  const lit = new Set(mod.files.map((f) => f.path));
  const near = new Set([sel, ...EDGES.filter((e) => e.from === sel || e.to === sel).flatMap((e) => [e.from, e.to])]);

  const box = useRef<HTMLDivElement>(null);
  const [refs] = useState(() => Object.fromEntries(FLOW.map((id) => [id, createRef<HTMLElement>()])));
  const ref = (id: string) => refs[id]!;

  function pick(id: string) {
    if (!MODS.some((m) => m.id === id)) return;
    setSel(id);
    setFile(null);
  }
  function pickFile(path: string) {
    const owner = MODS.find((m) => m.files.some((f) => f.path === path));
    if (owner) setSel(owner.id);
    setFile(path);
  }

  return (
    <DemoFrame
      title="Explore a sample repository map"
      note="The repository (acme/storefront), its files and the notes below are invented to show the shape of an analysis. This is not output from a real run."
    >
      <div className="grid gap-6">
        <div>
          <h3 className="m-0 mb-3 text-nv-small font-medium text-nv-ivory-100">Request path through the app</h3>
          <div ref={box} className="relative grid grid-cols-1 gap-8 md:grid-cols-5 md:gap-6">
            {FLOW.slice(0, -1).map((id, i) => {
              const next = FLOW[i + 1]!;
              return <AnimatedBeam key={id} containerRef={box} fromRef={ref(id)} toRef={ref(next)} duration={2.4} delay={i * 0.5} />;
            })}
            {FLOW.map((id) => {
              const isMod = id !== "req";
              return (
                <button
                  key={id}
                  ref={ref(id) as RefObject<HTMLButtonElement>}
                  type="button"
                  disabled={!isMod}
                  aria-pressed={isMod ? sel === id : undefined}
                  onClick={() => pick(id)}
                  className={cn(
                    "relative z-10 min-h-11 rounded-nv-sm border bg-white px-3 py-2 text-nv-small font-medium text-nv-ivory-100 transition-colors",
                    isMod ? "border-nv-graphite-600 hover:bg-nv-graphite-800" : "border-dashed border-nv-graphite-500 bg-nv-graphite-850 text-nv-ivory-300",
                    sel === id && "border-nv-copper-700 bg-nv-copper-wash",
                  )}
                >
                  {FLOW_LABEL[id]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <FileTree
            nodes={mark(TREE, lit)}
            label="Sample repository files"
            defaultExpanded={FOLDERS}
            selected={file ?? mod.files[0]!.path}
            onSelect={(n) => pickFile(n.id)}
            className="max-md:order-2"
          />
          <div className="grid min-w-0 gap-6">
            <div className="hidden md:block">
              <ArchitectureGraph nodes={NODES} edges={EDGES} label="Sample module dependency graph. Select a module to highlight its files." height={310} selectedId={sel} onSelect={pick} highlightIds={[...near]} />
            </div>
            <div className="md:hidden">
              <h3 className="m-0 mb-2 text-nv-small font-medium text-nv-ivory-100">Modules</h3>
              <div className="flex flex-wrap gap-2">
                {MODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={sel === m.id}
                    onClick={() => pick(m.id)}
                    className={cn("min-h-11 rounded-nv-sm border border-nv-graphite-600 bg-white px-3 text-nv-small", sel === m.id && "border-nv-copper-700 bg-nv-copper-wash")}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <CardContainer>
              <CardBody className="p-5">
                <div aria-live="polite">
                  <CardItem translateZ={28} className="block">
                    <span className="nv-eyebrow block">Selected module</span>
                    <h3 className="m-0 mt-1 text-nv-title font-semibold tracking-[-0.02em] text-nv-ivory-100">{mod.label}</h3>
                  </CardItem>
                  <CardItem translateZ={14} className="mt-2 block w-full">
                    <p className="m-0 text-nv-small leading-relaxed text-nv-ivory-200">{mod.role}</p>
                  </CardItem>
                  <CardItem translateZ={20} className="mt-4 block w-full">
                    <h4 className="m-0 mb-2 text-nv-micro font-medium uppercase tracking-[0.06em] text-nv-graphite-400">Files this note cites</h4>
                    <ul className="m-0 grid list-none gap-2 p-0">
                      {mod.files.map((f) => (
                        <li key={f.path} className="flex items-start gap-2 text-nv-small">
                          <FileCode2 aria-hidden className="mt-0.5 size-4 shrink-0 text-nv-copper-400" />
                          <span className="min-w-0">
                            <code className="break-all font-nv-mono text-nv-micro text-nv-ivory-100">{f.path}</code>
                            <span className="block text-nv-ivory-300">{f.why}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardItem>
                  <CardItem translateZ={10} className="mt-4 flex w-full flex-wrap items-center gap-1.5 text-nv-micro text-nv-graphite-400">
                    <span>Connected to</span>
                    {[...near].filter((id) => id !== sel).map((id) => (
                      <span key={id} className="inline-flex items-center gap-1 rounded-full border border-nv-graphite-700 px-2 py-0.5">
                        <ArrowRight aria-hidden className="size-3" />
                        {MODS.find((m) => m.id === id)?.label}
                      </span>
                    ))}
                  </CardItem>
                </div>
              </CardBody>
            </CardContainer>
          </div>
        </div>
      </div>
    </DemoFrame>
  );
}
