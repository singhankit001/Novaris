"use client";

import { motion } from "framer-motion";
import { FileCode2, Search } from "lucide-react";
import type { ReactNode } from "react";
import { BasisTag } from "@/components/nv/badge";
import { cn } from "@/components/nv/cn";
import { Citation } from "@/components/nv/evidence";
import { useReducedMotion } from "@/components/fx/use-reduced-motion";
import { H2 } from "@/components/seo/blocks";

interface Step {
  id: string;
  label: string;
  title: string;
  text: ReactNode;
  visual: ReactNode;
}

function InputVisual() {
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3 rounded-nv-md border border-nv-graphite-700 bg-white px-4 py-3 shadow-nv-xs transition-[border-color,box-shadow] duration-300 group-hover:border-nv-copper-700 group-hover:shadow-[0_0_0_4px_var(--nv-copper-wash)]">
        <Search aria-hidden className="size-4 text-nv-graphite-400" />
        <span className="font-nv-mono text-nv-small text-nv-ivory-100">
          vercel/next.js<span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-nv-copper-400 motion-reduce:animate-none" />
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {["github.com/owner/repo", "owner/repo", "@username"].map((t) => (
          <span key={t} className="rounded-full border border-nv-graphite-700 bg-nv-graphite-850 px-3 py-1 font-nv-mono text-nv-micro text-nv-ivory-200">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function FilesVisual() {
  const files = [
    { path: "src/middleware.ts", whole: true },
    { path: "src/lib/auth.ts", whole: true },
    { path: "src/lib/http.ts", whole: true },
    { path: "public/logo.svg", whole: false },
  ];
  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      {files.map((f, i) => (
        <li key={f.path} className={cn("flex items-center gap-3 rounded-nv-sm px-3 py-2", f.whole ? "bg-white shadow-nv-xs" : "opacity-55")}>
          <FileCode2 aria-hidden className={cn("size-4 shrink-0", f.whole ? "text-nv-copper-400" : "text-nv-graphite-400")} />
          <span className="min-w-0 flex-1 truncate font-nv-mono text-nv-micro text-nv-ivory-100">{f.path}</span>
          {f.whole && (
            <span aria-hidden className="relative hidden h-1 w-16 overflow-hidden rounded-full bg-nv-graphite-700 sm:block">
              <span
                className="absolute inset-y-0 left-0 w-full origin-left scale-x-[0.35] rounded-full bg-[linear-gradient(90deg,var(--nv-copper-400),var(--nv-violet-400))] transition-transform duration-700 ease-nv-out group-hover:scale-x-100"
                style={{ transitionDelay: `${i * 90}ms` }}
              />
            </span>
          )}
          <span className={cn("shrink-0 font-nv-mono text-[10px] uppercase tracking-[0.1em]", f.whole ? "text-nv-copper-300" : "text-nv-graphite-400")}>
            {f.whole ? "Whole file" : "Skipped"}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AnswerVisual() {
  return (
    <div className="grid gap-3 rounded-nv-md border border-nv-graphite-700 bg-white p-4 shadow-nv-xs">
      <p className="m-0 text-nv-body text-nv-ivory-50">Requests pass through a single auth middleware before reaching route handlers.</p>
      <div className="flex flex-wrap items-center gap-2">
        <BasisTag basis="measured" />
        <Citation kind="file" target="src/middleware.ts" lines="12-40" />
      </div>
    </div>
  );
}

const STEPS: Step[] = [
  {
    id: "give",
    label: "Step 1",
    title: "You point it at GitHub",
    text: (
      <>
        You give it a repository URL, <code>owner/repo</code>, or a GitHub username.
      </>
    ),
    visual: <InputVisual />,
  },
  {
    id: "fetch",
    label: "Step 2",
    title: "It reads whole files",
    text: "Novaris fetches public data through the GitHub API and picks the complete files relevant to your question.",
    visual: <FilesVisual />,
  },
  {
    id: "answer",
    label: "Step 3",
    title: "You get a cited answer",
    text: "It sends them to Google Gemini to produce an answer, an architecture diagram, or a security review.",
    visual: <AnswerVisual />,
  },
];

const OUTCOMES = [
  "Architecture and dependency questions answered from whole files, not fragments.",
  "Quick security scans for everyone, deeper scans for signed-in users.",
  "Reports you can revisit for 7 days.",
];

/** "What it does": three steps, each title joined by a connector to a card that shows the step happening. */
export function HowItWorks() {
  const reduce = useReducedMotion();
  return (
    <section aria-labelledby="ab-does-h">
      <H2 id="ab-does-h">What it does</H2>
      <ol className="relative mt-12 grid list-none gap-6 p-0 lg:gap-8">
        {/* the spine that links the three steps */}
        <span aria-hidden className="absolute bottom-10 left-[19px] top-10 w-px bg-[linear-gradient(var(--nv-copper-400),var(--nv-violet-400),var(--nv-hairline))] opacity-50" />
        {STEPS.map((step, i) => (
          <motion.li
            key={step.id}
            initial={{ opacity: 0, y: reduce ? 0 : 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ type: "spring", duration: 0.7, bounce: 0, delay: reduce ? 0 : i * 0.08 }}
            className="group relative grid gap-5 pl-14 lg:grid-cols-[minmax(0,4fr)_72px_minmax(0,8fr)] lg:items-start lg:gap-0"
          >
            <span
              aria-hidden
              className="absolute left-0 top-1 grid size-10 place-items-center rounded-full border border-nv-graphite-600 bg-white font-nv-mono text-nv-small text-nv-graphite-400 shadow-nv-xs transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-nv-out group-hover:scale-110 group-hover:border-nv-copper-400 group-hover:bg-nv-copper-400 group-hover:text-white group-hover:shadow-nv-accent group-focus-within:border-nv-copper-400"
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="lg:pr-6 lg:pt-1">
              <p className="m-0 font-nv-mono text-nv-micro uppercase tracking-[0.14em] text-nv-graphite-400">{step.label}</p>
              <h3 className="m-0 mt-2 text-2xl font-semibold tracking-[-0.02em] text-nv-ivory-50 text-balance">{step.title}</h3>
              <p className="m-0 mt-3 max-w-[38ch] text-[1.0625rem] leading-relaxed text-nv-ivory-200 text-pretty [&_code]:rounded-[6px] [&_code]:bg-nv-graphite-850 [&_code]:px-1.5 [&_code]:py-px [&_code]:font-nv-mono [&_code]:text-[0.88em]">
                {step.text}
              </p>
            </div>
            {/* connector from the step to its card; it draws across on hover */}
            <span aria-hidden className="relative mt-[22px] hidden h-px lg:block">
              <span className="absolute inset-0 bg-nv-graphite-700" />
              <span className="absolute inset-0 origin-left scale-x-0 bg-[linear-gradient(90deg,var(--nv-copper-400),var(--nv-violet-400))] transition-transform duration-500 ease-nv-out group-hover:scale-x-100" />
              <span className="absolute -left-1 -top-1 size-2 rounded-full border border-nv-graphite-600 bg-white transition-colors duration-300 group-hover:border-nv-copper-400" />
              <span className="absolute -right-1 -top-1 size-2 rounded-full bg-nv-graphite-600 transition-colors duration-300 group-hover:bg-nv-violet-400" />
            </span>
            <div className="relative overflow-hidden rounded-nv-lg border border-nv-graphite-700 bg-[linear-gradient(180deg,#ffffff,#f7f8fb)] p-5 shadow-nv-card transition-[transform,box-shadow,border-color] duration-300 ease-nv-out group-hover:-translate-y-1 group-hover:border-nv-copper-700 group-hover:shadow-nv-lift sm:p-6 motion-reduce:group-hover:translate-y-0">
              <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--nv-copper-400),var(--nv-violet-400),transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              {step.visual}
              {i === STEPS.length - 1 && (
                <ul className="m-0 mt-4 grid list-none gap-2 p-0">
                  {OUTCOMES.map((o) => (
                    <li key={o} className="flex gap-3 text-nv-small leading-relaxed text-nv-ivory-200">
                      <span aria-hidden className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-nv-copper-400" />
                      <span className="text-pretty">{o}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.li>
        ))}
      </ol>
      <p className="m-0 mt-6 pl-14 text-nv-small text-nv-text-muted">Illustrative: the cards show sample values, not a real result.</p>
    </section>
  );
}
