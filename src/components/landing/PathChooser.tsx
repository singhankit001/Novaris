"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, GitBranch, ShieldAlert, User } from "lucide-react";
import DemoVideo, { type DemoName } from "@/components/media/DemoVideo";
import { cn } from "@/components/nv/cn";
import s from "./landing.module.css";

interface Path {
  id: string;
  title: string;
  text: string;
  href: string;
  cta: string;
  demo: DemoName;
  demoLabel: string;
}

const PATHS: Path[] = [
  {
    id: "developer",
    title: "Analyze a developer",
    text: "Start from a GitHub username and ask about their public projects and activity.",
    href: `/chat?q=${encodeURIComponent("torvalds")}`,
    cta: "Analyze the example profile",
    demo: "developer-analysis",
    demoLabel: "Illustrative developer analysis: a profile is analysed, then languages, repository insights and contributions appear",
  },
  {
    id: "repository",
    title: "Analyze a repository",
    text: "Paste owner/repo and get answers about architecture, with the files shown.",
    href: `/chat?q=${encodeURIComponent("facebook/react")}`,
    cta: "Analyze the example repository",
    demo: "repo-analysis",
    demoLabel: "Illustrative repository analysis: a repository is entered, files are highlighted, and an architecture summary with citations appears",
  },
  {
    id: "security",
    title: "Run a security scan",
    text: "Quick scans are open to everyone. Deep scans need sign-in.",
    href: `/chat?q=${encodeURIComponent("vercel/next.js")}&prompt=security`,
    cta: "Scan the example repository",
    demo: "security-scan",
    demoLabel: "Illustrative security scan: stages complete, then findings are grouped by severity",
  },
];
const ICONS = [User, GitBranch, ShieldAlert];

export default function PathChooser() {
  const [active, setActive] = useState(PATHS[1]?.id ?? "repository");
  const uid = useId();
  return (
    <div className={s.chooser}>
      <ul className={s.options}>
        {PATHS.map((p, i) => {
          const on = p.id === active;
          const Icon = ICONS[i] ?? User;
          return (
            <li key={p.id} className={cn(s.option, on && s.optionOn)}>
              <button
                type="button"
                className={s.optionBtn}
                aria-pressed={on}
                aria-controls={`${uid}-${p.id}`}
                onPointerEnter={(e) => e.pointerType === "mouse" && setActive(p.id)}
                onFocus={() => setActive(p.id)}
                onClick={() => setActive(p.id)}
              >
                <span className={s.optionTitle}>
                  <Icon aria-hidden className="mr-3 inline size-5 align-[-3px]" />
                  {p.title}
                </span>
                <span className={s.optionText}>{p.text}</span>
              </button>
              <Link href={p.href} className={s.optionGo} aria-label={p.cta}>
                <ArrowRight aria-hidden className="size-5" />
              </Link>
            </li>
          );
        })}
      </ul>
      <div className={s.preview} aria-live="polite">
        <div aria-hidden className={cn(s.previewGlow, "nv-aurora")} />
        {PATHS.map((p) => (
          <div key={p.id} id={`${uid}-${p.id}`} role="region" aria-label={`${p.title} preview`} className={cn(s.pane, p.id === active && s.paneOn)} inert={p.id !== active}>
            <DemoVideo name={p.demo} label={p.demoLabel} active={p.id === active} className="rounded-2xl border border-nv-graphite-700 bg-white shadow-nv-card" />
          </div>
        ))}
        <p className={s.previewNote}>Sample layout with made-up values, not a real result.</p>
      </div>
    </div>
  );
}
