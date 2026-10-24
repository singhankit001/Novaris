"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ChevronRight, Menu as MenuIcon } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { cn } from "./cn";
import { IconButton } from "./button";
import { buttonClasses } from "./button-styles";
import { Drawer } from "./dialog";

export interface NavLink {
  href: string;
  label: string;
  icon?: ReactNode;
  current?: boolean;
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark />
      <span className="font-nv-sans text-[15px] font-medium tracking-[0.24em] text-nv-ivory-50">NOVARIS</span>
    </span>
  );
}

function NavItems({ links, vertical, onNavigate }: { links: NavLink[]; vertical?: boolean; onNavigate?: () => void }) {
  return (
    <ul className={cn("m-0 flex list-none gap-1 p-0", vertical && "flex-col")}>
      {links.map((l) => (
        <li key={l.label}>
          <Link
            href={l.href}
            onClick={onNavigate}
            aria-current={l.current ? "page" : undefined}
            className={cn(
              "relative flex min-h-11 items-center gap-3 rounded-nv-sm px-3.5 text-[0.8125rem] font-medium transition-colors duration-150",
              l.current
                ? "bg-nv-copper-wash text-nv-copper-400 shadow-[inset_0_0_0_1px_rgb(47_84_255/0.12)]"
                : "text-nv-ivory-200 hover:bg-nv-graphite-850 hover:text-nv-ivory-50",
            )}
          >
            {l.current && vertical && <span aria-hidden className="absolute -left-3 top-2.5 bottom-2.5 w-[3px] rounded-full bg-nv-copper-400" />}
            {l.icon && <span aria-hidden className="grid size-5 place-items-center">{l.icon}</span>}
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export interface SiteHeaderProps {
  links: NavLink[];
  cta?: { href: string; label: string };
  account?: ReactNode;
}

/** Marketing / public header. Links inline from md; below md they move into a right drawer. */
export function SiteHeader({ links, cta, account }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  return (
    <header className="nv-site-header sticky top-0 z-30 border-b border-nv-graphite-700/70">
      <a href="#nv-main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-nv-sm focus:bg-nv-ivory-100 focus:px-3 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <div className="mx-auto flex h-[76px] max-w-[var(--nv-page-max)] items-center justify-between gap-4 px-[var(--nv-gutter)]">
        <Link href="/" aria-label="Novaris home" className="rounded-nv-sm">
          <Wordmark />
        </Link>
        <nav aria-label="Primary" className="hidden md:block">
          <NavItems links={links} />
        </nav>
        <div className="flex items-center gap-2">
          {account}
          {cta && (
            <Link href={cta.href} className={cn(buttonClasses("primary"), "hidden lg:inline-flex")}>
              {cta.label}
            </Link>
          )}
          <IconButton label="Open menu" icon={<MenuIcon className="size-5" />} className="md:hidden" onClick={() => setOpen(true)} />
        </div>
      </div>
      <Drawer open={open} onClose={() => setOpen(false)} title="Menu">
        <nav aria-label="Primary mobile">
          <NavItems links={links} vertical onNavigate={() => setOpen(false)} />
        </nav>
        {cta && (
          <Link href={cta.href} onClick={() => setOpen(false)} className={cn(buttonClasses("primary", "lg"), "mt-4 w-full")}>
            {cta.label}
          </Link>
        )}
      </Drawer>
    </header>
  );
}

/** Signed-in left rail, visible from lg. */
export function SideNav({ links, label, footer }: { links: NavLink[]; label: string; footer?: ReactNode }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-nv-graphite-700 bg-[linear-gradient(180deg,#ffffff_0%,#fbfbf9_100%)] px-6 py-5 lg:flex">
      <nav aria-label={label}>
        <p className="nv-eyebrow mb-3 px-3.5">Workspace</p>
        <NavItems links={links} vertical />
      </nav>
      {footer}
    </aside>
  );
}

/** Bottom tab bar below lg: 5 destinations max, each 44px+ wide with a text label. */
export function MobileNav({ links, label }: { links: NavLink[]; label: string }) {
  return (
    <nav aria-label={label} className="nv-site-header fixed inset-x-0 bottom-0 z-20 border-t border-nv-graphite-700 pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="m-0 grid list-none grid-flow-col auto-cols-fr p-0">
        {links.slice(0, 5).map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              aria-current={l.current ? "page" : undefined}
              className={cn(
                "relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-nv-micro font-medium",
                l.current ? "text-nv-copper-400" : "text-nv-ivory-300",
              )}
            >
              {l.current && <span aria-hidden className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-nv-copper-400" />}
              <span aria-hidden>{l.icon}</span>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export interface AppShellProps {
  header: ReactNode;
  sideNav?: ReactNode;
  mobileNav?: ReactNode;
  children: ReactNode;
}

export function AppShell({ header, sideNav, mobileNav, children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      {header}
      <div className="flex min-h-0 flex-1">
        {sideNav}
        <main id="nv-main" tabIndex={-1} className="min-w-0 flex-1 pb-20 lg:pb-0">
          {children}
        </main>
      </div>
      {mobileNav}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0 text-nv-small text-nv-ivory-300">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${it.label}-${i}`} className="flex items-center gap-1">
              {it.href && !last ? (
                <Link href={it.href} className="inline-flex min-h-8 items-center rounded-nv-xs px-1 transition-colors hover:text-nv-copper-400">
                  {it.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={cn("px-1", last && "font-medium text-nv-ivory-100")}>
                  {it.label}
                </span>
              )}
              {!last && <ChevronRight aria-hidden className="size-3.5" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function Footer({ groups }: { groups: { title: string; links: { href: string; label: string }[] }[] }) {
  return (
    <footer className="border-t border-nv-graphite-700 bg-nv-graphite-950">
      <div className="mx-auto grid max-w-[var(--nv-page-max)] gap-10 px-[var(--nv-gutter)] py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Wordmark />
          <p className="mt-3 text-nv-small text-nv-ivory-300">
            Repository and profile analysis that shows its sources: files, commits, dates and limits.
          </p>
        </div>
        {groups.map((g) => (
          <nav key={g.title} aria-label={g.title}>
            <h2 className="nv-eyebrow mb-2">{g.title}</h2>
            <ul className="m-0 list-none p-0">
              {g.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="inline-flex min-h-11 items-center text-nv-small text-nv-ivory-200 transition-colors hover:text-nv-copper-400">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </footer>
  );
}
