import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/components/nv/cn";

/** Responsive bento layout: one column on phones, two from md, three from lg. Children are BentoItems. */
export function BentoGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid auto-rows-[minmax(14rem,auto)] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>{children}</div>;
}

export interface BentoItemProps {
  title: string;
  summary: string;
  /** Longer text. On fine pointers with `href` it replaces the summary on hover/focus; elsewhere it shows under the summary. */
  detail: string;
  /** Optional decorative illustration or mini chart (hidden from assistive tech). */
  header?: ReactNode;
  /** Makes the whole card one link and enables the hover/focus reveal. */
  href?: string;
  /** Grid span, e.g. "md:col-span-2". */
  className?: string;
}

/** One bento card: header slot, title, summary; detail crossfades in on hover or focus when `href` is set. */
export function BentoItem({ title, summary, detail, header, href, className }: BentoItemProps) {
  const swap = Boolean(href);
  return (
    <article
      className={cn(
        "group/bento nv-card relative flex flex-col justify-between gap-5 overflow-hidden p-5",
        swap && "nv-lift focus-within:border-nv-copper-700 focus-within:shadow-nv-lift",
        className,
      )}
    >
      {header ? (
        <div aria-hidden className="min-h-24 flex-1">
          {header}
        </div>
      ) : null}
      <div>
        <h3 className="text-nv-title font-semibold tracking-[-0.02em] text-nv-ivory-100">
          {href ? (
            <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>
        <div
          className={cn(
            "mt-2 grid gap-2 text-nv-small leading-relaxed",
            swap && "[@media(hover:hover)_and_(pointer:fine)]:gap-0 [@media(hover:hover)_and_(pointer:fine)]:[&>*]:col-start-1 [@media(hover:hover)_and_(pointer:fine)]:[&>*]:row-start-1",
          )}
        >
          <p
            className={cn(
              "text-nv-ivory-300",
              swap &&
                "transition-opacity duration-200 ease-nv-out motion-reduce:transition-none group-focus-within/bento:[@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover/bento:opacity-0",
            )}
          >
            {summary}
          </p>
          <p
            className={cn(
              "text-nv-ivory-200",
              swap &&
                "transition-opacity duration-200 ease-nv-out motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:opacity-0 group-focus-within/bento:[@media(hover:hover)_and_(pointer:fine)]:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-hover/bento:opacity-100",
            )}
          >
            {detail}
          </p>
        </div>
      </div>
    </article>
  );
}
