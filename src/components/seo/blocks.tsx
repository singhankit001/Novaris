import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { Breadcrumbs } from "@/components/nv/nav";
import { buttonClasses, type ButtonVariant } from "@/components/nv/button-styles";
import { cn } from "@/components/nv/cn";

/** Standard page column. `wide` is the 1360px page; default is the 68ch reading column plus gutters. */
export function Page({ children, wide, className }: { children: ReactNode; wide?: boolean; className?: string }) {
  return (
    <div className={cn("mx-auto w-full px-[var(--nv-gutter)] py-10 md:py-16 lg:py-20", wide ? "max-w-[var(--nv-page-max)]" : "max-w-[calc(var(--nv-measure)+2*var(--nv-gutter))]", className)}>
      {children}
    </div>
  );
}

export interface Crumb {
  label: string;
  href?: string;
}

/** Eyebrow, the page's one h1, a lead paragraph. Asymmetric: headline spans 8 of 12 columns from lg. */
export function PageHeader({
  crumbs,
  eyebrow,
  title,
  lead,
  children,
}: {
  crumbs?: Crumb[];
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-12 border-b border-nv-graphite-700/80 pb-10 md:mb-16 md:pb-12">
      {crumbs && (
        <div className="mb-8">
          <Breadcrumbs items={crumbs} />
        </div>
      )}
      {eyebrow && <p className="mb-4 inline-flex rounded-full border border-nv-graphite-700 bg-nv-graphite-900 px-3 py-1.5 text-nv-small font-medium text-nv-copper-400">{eyebrow}</p>}
      <h1 className="nv-display text-nv-display-lg text-balance text-nv-ivory-50 max-w-[23ch] tracking-[-0.045em] leading-[1.08]">{title}</h1>
      {lead && <div className="mt-6 max-w-[var(--nv-measure)] text-pretty text-[clamp(1rem,0.9rem+0.4vw,1.2rem)] leading-relaxed text-nv-ivory-200">{lead}</div>}
      {children}
    </header>
  );
}

export function H2({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="nv-display text-nv-display-md text-balance text-nv-ivory-50">
      {children}
    </h2>
  );
}

export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("max-w-[var(--nv-measure)] space-y-4 text-pretty text-nv-body leading-relaxed text-nv-ivory-200 [&_a]:text-nv-copper-400 [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-nv-copper-300 [&_strong]:font-medium [&_strong]:text-nv-ivory-50", className)}>
      {children}
    </div>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="m-0 list-none space-y-2 p-0 text-nv-body text-nv-ivory-200">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span aria-hidden className="mt-2.5 h-px w-3 shrink-0 bg-nv-copper-400" />
          <span className="text-pretty">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Whole-row internal link: title, one-line summary, arrow. A single 56px+ tab stop. */
export function LinkRow({ href, title, summary, meta }: { href: string; title: string; summary?: string; meta?: string }) {
  return (
    <Link
      href={href}
      className="group flex min-h-14 items-center justify-between gap-4 rounded-nv-sm border-b border-nv-graphite-700 px-3 py-4 transition-colors duration-200 hover:bg-nv-graphite-900"
    >
      <span className="min-w-0">
        <span className="block text-nv-body font-medium text-nv-ivory-50 group-hover:text-nv-copper-300">{title}</span>
        {summary && <span className="mt-0.5 block text-nv-small text-nv-ivory-300">{summary}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-3">
        {meta && <span className="nv-eyebrow hidden sm:inline">{meta}</span>}
        <ArrowUpRight aria-hidden className="size-4 text-nv-ivory-300 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-nv-copper-400" />
      </span>
    </Link>
  );
}

/** Native <details> disclosure list: keyboard and no-JS friendly, content stays in the DOM for crawlers. */
export function FaqList({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <div className="overflow-hidden rounded-nv-md border border-nv-graphite-700 bg-nv-graphite-900 px-5 md:px-7">
      {items.map((item) => (
        <details key={item.question} className="group border-b border-nv-graphite-700 last:border-b-0">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-5 text-nv-body font-medium text-nv-ivory-50 [&::-webkit-details-marker]:hidden">
            <span className="text-pretty">{item.question}</span>
            <ChevronDown aria-hidden className="size-4 shrink-0 text-nv-ivory-300 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <p className="max-w-[var(--nv-measure)] pb-5 text-pretty text-nv-body leading-relaxed text-nv-ivory-200">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function ActionLink({ href, children, variant = "secondary", external }: { href: string; children: ReactNode; variant?: ButtonVariant; external?: boolean }) {
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClasses(variant)}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  ) : (
    <Link href={href} className={buttonClasses(variant)}>
      {children}
    </Link>
  );
}
