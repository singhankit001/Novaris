"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { cn } from "@/components/nv/cn";
import s from "./seo.module.css";

export interface HeaderLink {
  href: string;
  label: string;
  current?: boolean;
}

export { BrandMark };

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark />
      <span className="font-nv-sans text-[14px] font-semibold tracking-[0.28em] text-nv-ivory-50">NOVARIS</span>
    </span>
  );
}

interface MenuItem {
  href: string;
  label: string;
  note: string;
}
interface NavEntry {
  id: string;
  label: string;
  href?: string;
  items?: MenuItem[];
}

// Every destination below is an existing route.
const NAV: NavEntry[] = [
  {
    id: "product",
    label: "Product",
    items: [
      { href: "/chat?q=vercel%2Fnext.js", label: "Repository analysis", note: "Ask any public repo; every answer cites its files" },
      { href: "/chat?q=torvalds", label: "Developer profiles", note: "Read a GitHub profile across all of its repositories" },
      { href: "/security-scanner", label: "Security scanner", note: "Secrets, injection paths and risky dependencies" },
      { href: "/github-code-analyzer", label: "Code analyzer", note: "Architecture, structure and code quality" },
    ],
  },
  {
    id: "solutions",
    label: "Solutions",
    items: [
      { href: "/ai-code-review-tool", label: "AI code review", note: "Review a codebase with sources shown" },
      { href: "/repository-risk-analysis", label: "Risk analysis", note: "Due diligence before you adopt a repo" },
      { href: "/typescript-code-analyzer", label: "TypeScript analyzer", note: "Types, modules and project layout" },
      { href: "/nodejs-security-scanner", label: "Node.js security", note: "Server-side risks in Node projects" },
      { href: "/open-source-security-scanner", label: "Open-source security", note: "Check dependencies you did not write" },
      { href: "/solutions", label: "All solutions", note: "Every use case in one place" },
    ],
  },
  {
    id: "explore",
    label: "Explore",
    items: [
      { href: "/trending", label: "Trending", note: "Repositories gaining attention right now" },
      { href: "/explore", label: "Explore", note: "Browse the catalog by topic and language" },
      { href: "/blog", label: "Insights", note: "Engineering notes and product writing" },
    ],
  },
  {
    id: "compare",
    label: "Compare",
    items: [
      { href: "/novaris-vs-snyk", label: "Novaris vs Snyk", note: "Where each tool fits" },
      { href: "/novaris-vs-sonarqube", label: "Novaris vs SonarQube", note: "Static rules versus full-context reading" },
      { href: "/static-analysis-vs-novaris", label: "Static analysis vs Novaris", note: "What changes when the model reads the repo" },
      { href: "/compare", label: "All comparisons", note: "Side by side" },
    ],
  },
  { id: "faq", label: "FAQ", href: "/faq" },
  { id: "about", label: "About", href: "/about" },
];

const ISLAND_SPRING = { type: "spring" as const, duration: 0.5, bounce: 0.22 };

function routeOf(href: string) {
  return href.split("?")[0];
}

export default function SiteHeader({ cta, account }: { links?: HeaderLink[]; cta: { href: string; label: string }; account?: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [active, setActive] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeTimer = useRef<number | null>(null);
  const titleId = useId();
  const panelId = useId();

  const activeEntry = NAV.find((n) => n.id === active && n.items);
  const isCurrent = (e: NavEntry) =>
    e.href ? routeOf(e.href) === pathname : Boolean(e.items?.some((i) => routeOf(i.href) === pathname));

  const cancelClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  // A short grace period lets the pointer travel from the island into its panel.
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setActive(null), 120);
  };

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (mobileOpen && !d.open) d.showModal();
    else if (!mobileOpen && d.open) d.close();
  }, [mobileOpen]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  useEffect(() => () => cancelClose(), []);

  const fade = reduce ? { duration: 0 } : { duration: 0.25, ease: "easeOut" as const };

  return (
    <>
      {/* Hovering the island blurs the whole page behind the header; purely visual. */}
      <AnimatePresence>
        {active && (
          <motion.div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-20 bg-[rgb(250_250_247/0.35)] backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
          />
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-30 px-[var(--nv-gutter)] pt-3 pb-2">
        <a href="#nv-main" className={s.skip}>
          Skip to content
        </a>
        <div className="mx-auto flex max-w-[var(--nv-page-max)] items-center justify-between gap-3">
          {/* Brand: its own floating pill, separate from navigation */}
          <Link
            href="/"
            aria-label="Novaris home"
            className="group flex h-12 items-center rounded-full border border-nv-graphite-700 bg-white/85 pl-1.5 pr-5 shadow-nv-card backdrop-blur-xl transition-shadow duration-200 hover:shadow-nv-lift"
          >
            <span className="transition-transform duration-300 ease-nv-out group-hover:rotate-[-6deg] motion-reduce:transform-none">
              <BrandMark size={36} />
            </span>
            <span className="ml-3 font-nv-sans text-[13px] font-semibold tracking-[0.3em] text-nv-ivory-50">NOVARIS</span>
          </Link>

          {/* Dynamic island */}
          <div className="relative hidden lg:block" onMouseLeave={scheduleClose} onMouseEnter={cancelClose}>
            <nav
              aria-label="Primary"
              className="relative flex h-12 items-center rounded-full bg-[#0b0d13] p-1 shadow-[0_1px_0_rgb(255_255_255/0.08)_inset,0_18px_40px_-18px_rgb(11_13_19/0.7)]"
              onBlur={(e) => {
                if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) setActive(null);
              }}
            >
              <ul className="flex items-center">
                {NAV.map((entry) => {
                  const on = active === entry.id;
                  const current = isCurrent(entry);
                  const itemClass = cn(
                    "relative flex h-10 items-center gap-1 rounded-full px-4 text-[13.5px] font-medium outline-none transition-colors duration-200",
                    "focus-visible:ring-2 focus-visible:ring-nv-copper-600",
                    on ? "text-white" : current ? "text-white" : "text-white/65 hover:text-white",
                  );
                  const pill = on && (
                    <motion.span
                      layoutId={reduce ? undefined : "nv-island-pill"}
                      className="absolute inset-0 rounded-full bg-white/[0.12]"
                      transition={ISLAND_SPRING}
                    />
                  );
                  return (
                    <li key={entry.id} onMouseEnter={() => setActive(entry.id)}>
                      {entry.items ? (
                        <button
                          type="button"
                          className={itemClass}
                          aria-expanded={on}
                          aria-controls={panelId}
                          onFocus={() => setActive(entry.id)}
                          onClick={() => setActive(on ? null : entry.id)}
                        >
                          {pill}
                          <span className="relative">{entry.label}</span>
                          <ChevronDown aria-hidden className={cn("relative size-3.5 transition-transform duration-200", on && "rotate-180")} />
                        </button>
                      ) : (
                        <Link href={entry.href!} aria-current={current ? "page" : undefined} className={itemClass} onFocus={() => setActive(entry.id)}>
                          {pill}
                          <span className="relative">{entry.label}</span>
                          {current && <span aria-hidden className="relative ml-1 size-1 rounded-full bg-nv-copper-600" />}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* The island grows a panel out of itself */}
            <AnimatePresence>
              {activeEntry && (
                <motion.div
                  key="island-panel"
                  id={panelId}
                  layout={!reduce}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scaleX: 0.55, scaleY: 0.3, y: -14 }}
                  animate={{ opacity: 1, scaleX: 1, scaleY: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scaleX: 0.7, scaleY: 0.4, y: -10 }}
                  transition={reduce ? { duration: 0 } : ISLAND_SPRING}
                  className="absolute left-1/2 top-full z-10 mt-2.5 w-[34rem] origin-top overflow-hidden rounded-[28px] bg-[#0b0d13] p-2 shadow-[0_1px_0_rgb(255_255_255/0.08)_inset,0_40px_80px_-30px_rgb(11_13_19/0.75)]"
                  style={{ x: "-50%" }}
                >
                  <div aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,#7d93ff,#a98bff,transparent)]" />
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.ul
                      key={activeEntry.id}
                      initial={reduce ? false : { opacity: 0, y: 6, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(4px)" }}
                      transition={reduce ? { duration: 0 } : { duration: 0.22, ease: "easeOut" }}
                      className="grid grid-cols-2 gap-1"
                    >
                      {activeEntry.items!.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setActive(null)}
                            aria-current={routeOf(item.href) === pathname ? "page" : undefined}
                            className="group/item flex h-full items-start justify-between gap-3 rounded-[20px] px-4 py-3.5 outline-none transition-colors duration-150 hover:bg-white/[0.07] focus-visible:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-nv-copper-600"
                          >
                            <span className="min-w-0">
                              <span className="block text-[14px] font-medium text-white">{item.label}</span>
                              <span className="mt-1 block text-[12.5px] leading-snug text-white/55">{item.note}</span>
                            </span>
                            <ArrowUpRight
                              aria-hidden
                              className="mt-0.5 size-4 shrink-0 text-[#9fb0ff] opacity-0 transition-[opacity,transform] duration-200 group-hover/item:-translate-y-0.5 group-hover/item:translate-x-0.5 group-hover/item:opacity-100 group-focus-visible/item:opacity-100"
                            />
                          </Link>
                        </li>
                      ))}
                    </motion.ul>
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions: their own pill */}
          <div className="flex items-center gap-2">
            <div className="hidden h-12 items-center gap-1 rounded-full border border-nv-graphite-700 bg-white/85 p-1 shadow-nv-card backdrop-blur-xl sm:flex">
              {account}
              <Link
                href={cta.href}
                className="group flex h-10 items-center gap-2 rounded-full bg-nv-copper-500 pl-4 pr-1.5 text-[13.5px] font-medium text-white shadow-nv-accent transition-colors duration-200 hover:bg-nv-copper-300"
              >
                {cta.label}
                <span className="grid size-7 place-items-center rounded-full bg-white/15">
                  <ArrowRight aria-hidden className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none" />
                </span>
              </Link>
            </div>
            <button
              type="button"
              className="grid size-12 place-items-center rounded-full bg-[#0b0d13] text-white shadow-nv-card lg:hidden"
              aria-label="Open menu"
              aria-haspopup="dialog"
              onClick={() => setMobileOpen(true)}
            >
              <Menu aria-hidden className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <dialog
        ref={dialogRef}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-3 backdrop:bg-[rgb(250_250_247/0.4)] backdrop:backdrop-blur-md"
        aria-labelledby={titleId}
        onClose={() => setMobileOpen(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) setMobileOpen(false);
        }}
      >
        <div className="flex max-h-full flex-col overflow-hidden rounded-[28px] bg-[#0b0d13] text-white shadow-nv-overlay">
          <div className="flex items-center justify-between p-3 pl-5">
            <span id={titleId} className="font-nv-mono text-[11px] uppercase tracking-[0.18em] text-white/50">
              Menu
            </span>
            <button type="button" className="grid size-11 place-items-center rounded-full bg-white/10" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <nav aria-label="Primary mobile" className="overflow-y-auto px-3 pb-3">
            {NAV.map((entry) =>
              entry.items ? (
                <section key={entry.id} className="border-t border-white/10 py-3">
                  <h2 className="px-2 pb-1 font-nv-mono text-[11px] uppercase tracking-[0.18em] text-white/45">{entry.label}</h2>
                  <ul>
                    {entry.items.map((item) => (
                      <li key={item.href}>
                        <Link href={item.href} onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center justify-between rounded-2xl px-2 text-[15px] text-white/90 hover:bg-white/[0.06]">
                          {item.label}
                          <ArrowUpRight aria-hidden className="size-4 text-white/40" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                <Link key={entry.id} href={entry.href!} onClick={() => setMobileOpen(false)} className="flex min-h-12 items-center border-t border-white/10 px-2 text-[15px] text-white/90">
                  {entry.label}
                </Link>
              ),
            )}
            <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
              {account && <div className="[&_*]:!text-white">{account}</div>}
              <Link href={cta.href} onClick={() => setMobileOpen(false)} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-nv-copper-500 text-[15px] font-medium text-white">
                {cta.label}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          </nav>
        </div>
      </dialog>
    </>
  );
}
