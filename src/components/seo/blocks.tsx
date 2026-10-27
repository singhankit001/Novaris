import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { Breadcrumbs } from "@/components/nv/nav";
import { cn } from "@/components/nv/cn";
import s from "./seo.module.css";

export type ActionVariant = "primary" | "secondary" | "ghost" | "danger";

export function btnClass(variant: ActionVariant = "secondary", large?: boolean) {
  return cn(s.btn, large && s.btnLg, variant === "primary" ? s.primary : variant === "ghost" ? s.ghost : s.secondary);
}

/** Standard page column. `wide` is the 1280px page; default is a narrower reading column. */
export function Page({ children, wide, className }: { children: ReactNode; wide?: boolean; className?: string }) {
  return <div className={cn(s.page, wide ? s.pageWide : s.pageNarrow, className)}>{children}</div>;
}

export interface Crumb {
  label: string;
  href?: string;
}

/** Keeps hyphenated words ("Full-File") from breaking at the hyphen on narrow screens. */
function NoBreakHyphens({ text }: { text: string }) {
  return text.split(/(\S*-\S*)/).map((part, i) =>
    part.includes("-") ? (
      <span key={i} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/** Wraps the last word of a title in the serif-italic gradient accent. */
function AccentTitle({ text }: { text: string }) {
  const trimmed = text.trim();
  const idx = trimmed.lastIndexOf(" ");
  if (idx < 0) return <em>{trimmed}</em>;
  return (
    <>
      <NoBreakHyphens text={trimmed.slice(0, idx)} /> <em>{trimmed.slice(idx + 1)}</em>
    </>
  );
}

/**
 * Eyebrow, the page's one h1 with a serif accent word, a lead paragraph, over a luminous backdrop.
 * `align="center"` centres the title block in the page column (breadcrumbs stay at the start edge);
 * use it when no side column sits beside the hero.
 */
export function PageHeader({
  crumbs,
  eyebrow,
  title,
  lead,
  children,
  align = "start",
}: {
  crumbs?: Crumb[];
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  children?: ReactNode;
  align?: "start" | "center";
}) {
  return (
    <header className={cn(s.hero, align === "center" && s.heroCenter)}>
      <div aria-hidden className={cn(s.heroGlow, "nv-aurora")}>
        <div className={cn(s.heroGrid, "nv-grid-paper")} />
      </div>
      {crumbs && (
        <div className={s.crumbs}>
          <Breadcrumbs items={crumbs} />
        </div>
      )}
      {eyebrow && <p className={s.eyebrow}>{eyebrow}</p>}
      <h1 className={cn(s.title, "nv-display", title.length > 40 && s.titleWide)}>
        <AccentTitle text={title} />
      </h1>
      {lead && <div className={s.lead}>{lead}</div>}
      {children}
      <span aria-hidden className={s.heroRule} />
    </header>
  );
}

export function H2({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className={cn(s.h2, "nv-display")}>
      {children}
    </h2>
  );
}

export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(s.prose, className)}>{children}</div>;
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className={s.bullets}>
      {items.map((item) => (
        <li key={item}>
          <span className="text-pretty">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** A list container for LinkRow items. */
export function Rows({ children }: { children: ReactNode }) {
  return <div className={s.rows}>{children}</div>;
}

/** Whole-row internal link: title, one-line summary, arrow. A single 72px+ tab stop. */
export function LinkRow({ href, title, summary, meta }: { href: string; title: string; summary?: string; meta?: string }) {
  return (
    <Link href={href} className={s.row}>
      <span className="min-w-0">
        <span className={s.rowTitle}>{title}</span>
        {summary && <span className={s.rowSummary}>{summary}</span>}
      </span>
      <span className={s.rowEnd}>
        {meta && <span className={cn(s.rowMeta, "nv-num hidden sm:inline")}>{meta}</span>}
        <span aria-hidden className={s.rowArrow}>
          <ArrowUpRight className="size-4" />
        </span>
      </span>
    </Link>
  );
}

/** Native <details> disclosure list: keyboard and no-JS friendly, content stays in the DOM for crawlers. */
export function FaqList({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <div className={s.faq}>
      {items.map((item) => (
        <details key={item.question} className={s.faqItem}>
          <summary className={s.faqSummary}>
            <span className="text-pretty">{item.question}</span>
            <span aria-hidden className={s.faqIcon} />
          </summary>
          <p className={s.faqAnswer}>{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function ActionLink({
  href,
  children,
  variant = "secondary",
  external,
  large,
}: {
  href: string;
  children: ReactNode;
  variant?: ActionVariant;
  external?: boolean;
  large?: boolean;
}) {
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={btnClass(variant, large)}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  ) : (
    <Link href={href} className={btnClass(variant, large)}>
      {children}
    </Link>
  );
}

/** Closing band used at the foot of marketing pages. */
export function CtaBand({ id, title, text, children }: { id?: string; title: ReactNode; text?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={cn(s.panel, s.ctaBand)}>
      <div aria-hidden className={cn(s.panelGlow, "nv-aurora")} />
      <h2 id={id} className={cn(s.ctaTitle, "nv-display")}>
        {title}
      </h2>
      {text && <p className={s.ctaText}>{text}</p>}
      <div className={s.ctaActions}>{children}</div>
    </section>
  );
}
