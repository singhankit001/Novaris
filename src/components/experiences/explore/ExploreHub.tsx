import Link from "next/link";
import { ArrowUpRight, Scale, ScanSearch, ShieldCheck } from "lucide-react";
import { H2, LinkRow } from "@/components/seo/blocks";
import s from "@/components/seo/seo.module.css";
import { cn } from "@/components/nv/cn";
import { CardBody, CardContainer, CardItem } from "@/components/fx/scene/card-3d";
import { BentoGrid, BentoItem } from "@/components/fx/surface/bento-grid";
import { ExpandableCards } from "@/components/fx/surface/expandable-cards";

export interface ExploreEntry {
  title: string;
  slug: string;
  summary: string;
}

export interface ExploreGroup {
  id: "analysis" | "security" | "comparison";
  title: string;
  guidance: string;
  entries: ExploreEntry[];
}

const ICON = { analysis: ScanSearch, security: ShieldCheck, comparison: Scale } as const;

/** Three entry tiles, one per guide group; each links to its section on this page. */
export function CategoryBento({ groups }: { groups: ExploreGroup[] }) {
  return (
    <BentoGrid className="auto-rows-[minmax(12rem,auto)]">
      {groups.map((g) => {
        const Icon = ICON[g.id];
        return (
          <BentoItem
            key={g.id}
            href={`#explore-${g.id}`}
            title={g.title}
            summary={`${g.entries.length} guides`}
            detail={g.guidance}
            header={
              <div className="flex items-start justify-between">
                <span className="nv-num font-nv-serif text-6xl italic leading-none text-nv-copper-400">{String(g.entries.length).padStart(2, "0")}</span>
                <Icon className="size-6 text-nv-graphite-400" />
              </div>
            }
          />
        );
      })}
    </BentoGrid>
  );
}

/** Analysis: one featured guide as a depth card beside the remaining guides as rows. */
export function AnalysisSection({ group }: { group: ExploreGroup }) {
  const [lead, ...rest] = group.entries;
  if (!lead) return null;
  return (
    <section id="explore-analysis" aria-label={group.title} className="scroll-mt-28">
      <H2>{group.title}</H2>
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-12 lg:gap-12">
        <CardContainer className="lg:col-span-7" maxTilt={5}>
          <Link href={lead.slug} className="block h-full [transform-style:preserve-3d] focus-visible:outline-none">
            <CardBody className="p-6 sm:p-8">
              <CardItem translateZ={20} as="p" className="nv-eyebrow">
                Start here
              </CardItem>
              <CardItem translateZ={40} as="h3" className="mt-3 w-full text-nv-display-md font-semibold tracking-[-0.03em] text-nv-ivory-100 text-balance">
                {lead.title}
              </CardItem>
              <CardItem translateZ={25} as="p" className="mt-4 w-full max-w-prose text-nv-lead text-nv-ivory-200 text-pretty">
                {lead.summary}
              </CardItem>
              <CardItem translateZ={50} as="span" aria-hidden className="mt-8 inline-flex items-center gap-1.5 text-nv-small font-medium text-nv-copper-400">
                Open guide <ArrowUpRight className="size-4" />
              </CardItem>
            </CardBody>
          </Link>
        </CardContainer>
        <div className={cn(s.rows, "lg:col-span-5")}>
          {rest.map((e) => (
            <LinkRow key={e.slug} href={e.slug} title={e.title} summary={e.summary} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Security: guides as expandable cards, each opening to its guide link and the analysis workspace. */
export function SecuritySection({ group }: { group: ExploreGroup }) {
  return (
    <section id="explore-security" aria-label={group.title} className="scroll-mt-28">
      <H2>{group.title}</H2>
      <ExpandableCards
        className="mt-8"
        items={group.entries.map((e) => ({
          id: e.slug,
          eyebrow: "Security guide",
          title: e.title,
          summary: e.summary,
          detail: (
            <p className="flex flex-wrap gap-x-6 gap-y-2">
              <Link href={e.slug} className="inline-flex min-h-11 items-center gap-1.5 font-medium text-nv-copper-400 hover:underline">
                Open the guide <ArrowUpRight aria-hidden className="size-4" />
              </Link>
              <Link href="/chat" className="inline-flex min-h-11 items-center gap-1.5 text-nv-ivory-200 hover:underline">
                Ask about a repository in chat
              </Link>
            </p>
          ),
        }))}
      />
    </section>
  );
}

function VersusMark({ title }: { title: string }) {
  const [a, b] = title.split(/\s+vs\s+/i);
  return (
    <div className="flex flex-wrap items-center gap-2 font-nv-mono text-nv-micro text-nv-ivory-200">
      <span className="rounded-full border border-nv-graphite-600 px-3 py-1">{a}</span>
      <span className="font-nv-serif text-lg italic text-nv-copper-400">vs</span>
      <span className="rounded-full border border-nv-graphite-600 px-3 py-1">{b ?? "Novaris"}</span>
    </div>
  );
}

/** Comparison: each guide is a bento tile; the summary swaps to a pointer on hover or focus. */
export function ComparisonSection({ group }: { group: ExploreGroup }) {
  return (
    <section id="explore-comparison" aria-label={group.title} className="scroll-mt-28">
      <H2>{group.title}</H2>
      <BentoGrid className="mt-8 auto-rows-[minmax(13rem,auto)] lg:grid-cols-3">
        {group.entries.map((e) => (
          <BentoItem key={e.slug} href={e.slug} title={e.title} summary={e.summary} detail={`${e.summary} Open the comparison.`} header={<VersusMark title={e.title} />} />
        ))}
      </BentoGrid>
    </section>
  );
}
