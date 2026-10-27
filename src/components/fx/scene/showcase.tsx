import { GitBranch, ShieldCheck } from "lucide-react";
import type { ShowcaseEntry } from "../showcase-types";
import { CardBody, CardContainer, CardItem } from "./card-3d";
import { CanvasReveal } from "./canvas-reveal";
import { CubesGrid } from "./cubes-grid";
import { Globe } from "./globe";
import { HeroParallax, type ParallaxItem } from "./hero-parallax";
import { Marquee3D, type MarqueeTile } from "./marquee-3d";
import { Particles3D } from "./particles-3d";
import { SignalPaths } from "./signal-paths";

// All content below is illustrative demo data, not real scan results.
const TILES: MarqueeTile[] = [
  { title: "acme/payments-api", path: "src/routes/checkout.ts", note: "Unvalidated redirect target", tone: "blue" },
  { title: "acme/web-app", path: "package-lock.json", note: "2 advisories, 1 reachable", tone: "violet" },
  { title: "acme/infra", path: "terraform/s3.tf", note: "Public bucket policy", tone: "silver" },
  { title: "acme/mobile", path: "app/auth/token.ts", note: "Token stored unencrypted", tone: "blue" },
  { title: "acme/docs-site", path: "next.config.ts", note: "No findings", tone: "silver" },
  { title: "acme/worker", path: "src/queue/job.ts", note: "Shell command from input", tone: "violet" },
  { title: "acme/ui-kit", path: "src/menu.tsx", note: "Inferred: unsanitised HTML", tone: "blue" },
  { title: "acme/cli", path: "bin/run.js", note: "Unpinned install script", tone: "silver" },
  { title: "acme/gateway", path: "src/auth.go", note: "Weak hash for tokens", tone: "violet" },
  { title: "acme/ml-eval", path: "eval/loader.py", note: "Unsafe deserialisation", tone: "blue" },
  { title: "acme/billing", path: "src/invoice.ts", note: "No findings", tone: "silver" },
  { title: "acme/sdk", path: "src/client.ts", note: "Secret in test fixture", tone: "violet" },
];

const hue = (i: number) => (
  <div
    className="absolute inset-0"
    style={{ background: `linear-gradient(${120 + i * 25}deg, var(--nv-copper-wash), var(--nv-violet-wash) 60%, var(--nv-ion-wash))` }}
  />
);
const PARALLAX: ParallaxItem[] = Array.from({ length: 15 }, (_, i) => ({
  title: ["Dependency exposure", "Secrets in history", "Auth boundaries", "Injection paths", "Supply chain", "Config drift", "Reachability", "Licence risk", "Fix suggestions", "Build scripts", "Token handling", "Unsafe parsing", "CI permissions", "Public endpoints", "Test fixtures"][i] ?? "",
  meta: ["package.json", "git log", "src/auth/*", "src/routes/*", "lockfile", "infra/*", "call graph", "LICENSE", "diff preview", "scripts/*", "src/session.ts", "src/parse/*", ".github/workflows", "openapi.yaml", "fixtures/*"][i] ?? "",
  href: "#solutions",
  visual: hue(i),
}));

const stage = (n: string, title: string, body: string) => (
  <CanvasReveal className="nv-card h-full p-5" key={n}>
    <p className="nv-eyebrow">Stage {n}</p>
    <h4 className="mt-2 text-nv-body font-semibold text-nv-ivory-100">{title}</h4>
    <p className="mt-1 text-nv-small text-nv-text-muted">{body}</p>
    <a href="#stage" className="mt-3 inline-block text-nv-small text-nv-copper-400">
      Details
    </a>
  </CanvasReveal>
);

export const sceneShowcase: ShowcaseEntry[] = [
  {
    id: "card-3d",
    name: "Card3D",
    reference: "Aceternity 3D Card Effect",
    routes: ["/solutions", "/security-scanner"],
    render: () => (
      <div className="grid gap-6 sm:grid-cols-2">
        {["acme/payments-api", "acme/web-app"].map((repo) => (
          <CardContainer key={repo}>
            <CardBody className="p-6">
              <CardItem translateZ={30} className="flex items-center gap-2 text-nv-body font-semibold text-nv-ivory-100">
                <GitBranch className="size-4 text-nv-copper-400" aria-hidden="true" /> {repo}
              </CardItem>
              <CardItem translateZ={20} className="mt-2 font-nv-mono text-nv-micro text-nv-ivory-300">
                src/routes/checkout.ts
              </CardItem>
              <CardItem translateZ={50} className="mt-5 w-full">
                <div className="rounded-nv-md bg-nv-graphite-850 p-4 text-nv-small text-nv-ivory-200">Illustrative: 3 findings, 1 reachable.</div>
              </CardItem>
              <CardItem as="a" href="#view" translateZ={40} className="mt-5 inline-flex min-h-11 items-center gap-1 text-nv-small font-medium text-nv-copper-400">
                <ShieldCheck className="size-4" aria-hidden="true" /> View report
              </CardItem>
            </CardBody>
          </CardContainer>
        ))}
      </div>
    ),
  },
  {
    id: "cubes-grid",
    name: "CubesGrid",
    reference: "Aceternity Background Cubes Grid",
    routes: ["/coming-soon"],
    render: () => (
      <div className="relative h-72 overflow-hidden rounded-nv-xl border border-nv-graphite-700 bg-nv-graphite-950">
        <CubesGrid />
        <p className="pointer-events-none relative flex h-full items-center justify-center nv-display text-nv-title">
          Move <em className="mx-2">here</em>
        </p>
      </div>
    ),
  },
  {
    id: "globe",
    name: "Globe",
    reference: "Aceternity 3D Globe",
    routes: ["/about"],
    render: () => (
      <div className="flex flex-col items-center gap-3">
        <Globe className="max-w-sm" />
        <p className="text-nv-small text-nv-text-muted">Illustrative arcs between example hubs. Not user locations.</p>
      </div>
    ),
  },
  {
    id: "signal-paths",
    name: "SignalPaths",
    reference: "Aceternity Google Gemini Effect",
    routes: ["/solutions"],
    render: () => (
      <SignalPaths inputs={["package.json", "src/**", "git history", "CI config", ".env.example"]}>
        <span className="nv-card inline-flex items-center gap-2 px-4 py-2 text-nv-small font-semibold text-nv-ivory-100">
          <ShieldCheck className="size-4 text-nv-copper-400" aria-hidden="true" /> One cited report
        </span>
      </SignalPaths>
    ),
  },
  {
    id: "canvas-reveal",
    name: "CanvasReveal",
    reference: "Aceternity Canvas Reveal Effect",
    routes: ["/security-scanner"],
    render: () => (
      <div className="grid gap-4 sm:grid-cols-3">
        {stage("1", "Fetch", "Clone the repository read-only.")}
        {stage("2", "Analyse", "Trace dependencies and call paths.")}
        {stage("3", "Report", "Cite a file or label it inferred.")}
      </div>
    ),
  },
  {
    id: "marquee-3d",
    name: "Marquee3D",
    reference: "Aceternity 3D Marquee",
    routes: ["/solutions"],
    render: () => <Marquee3D tiles={TILES} />,
  },
  {
    id: "particles-3d",
    name: "Particles3D",
    reference: "Magic UI Floating 3D Particles",
    routes: ["/about", "/coming-soon"],
    render: () => (
      <div className="relative flex h-64 items-center justify-center overflow-hidden rounded-nv-xl border border-nv-graphite-700 bg-nv-graphite-950">
        <Particles3D />
        <p className="relative nv-display text-nv-title">Quiet atmosphere</p>
      </div>
    ),
  },
  {
    id: "hero-parallax",
    name: "HeroParallax",
    reference: "Aceternity Hero Parallax",
    routes: ["/solutions"],
    render: () => (
      <HeroParallax
        items={PARALLAX}
        header={
          <div className="max-w-xl">
            <p className="nv-eyebrow">Illustrative coverage</p>
            <h3 className="nv-display mt-2 text-nv-display-md">What a scan <em>looks at</em></h3>
          </div>
        }
      />
    ),
  },
];
