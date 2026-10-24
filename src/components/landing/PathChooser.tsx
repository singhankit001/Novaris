"use client";

import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, GitBranch, ShieldAlert, User } from "lucide-react";
import { BasisTag } from "@/components/nv/badge";
import { Citation } from "@/components/nv/evidence";
import { cn } from "@/components/nv/cn";
import s from "./landing.module.css";

interface Path {
  id: string;
  title: string;
  text: string;
  href: string;
  cta: string;
  pane: ReactNode;
}

function ProfilePane() {
  return (
    <>
      <div className={s.card}>
        <div className={s.row}>
          <span aria-hidden className={s.avatarG}>
            T
          </span>
          <div className="min-w-0">
            <p className="m-0 font-semibold text-nv-ivory-50">torvalds</p>
            <p className="m-0 font-mono text-nv-micro text-nv-ivory-300">@torvalds · public profile</p>
          </div>
        </div>
      </div>
      <p className={s.winCap}>Ask about a developer</p>
      <div className={s.ask}>Which projects does this developer maintain?</div>
      <div className={s.ask}>What languages show up in recent commits?</div>
      <div className={s.ask}>
        <span className={s.askMono}>@username</span> Summarise how they collaborate.
      </div>
    </>
  );
}

function RepoPane() {
  return (
    <>
      <div className={s.card}>
        <ul className={s.mini}>
          <li className={s.miniItem}>src/</li>
          <li className={cn(s.miniItem, s.indent1)}>middleware.ts</li>
          <li className={cn(s.miniItem, s.miniOn, s.indent1)}>lib/auth.ts</li>
          <li className={cn(s.miniItem, s.indent1)}>app/</li>
          <li className={cn(s.miniItem, s.indent2)}>page.tsx</li>
        </ul>
      </div>
      <div className={s.claim}>
        <p className={s.claimText}>Requests pass through a single auth middleware before reaching route handlers.</p>
        <div className={s.claimMeta}>
          <BasisTag basis="measured" />
          <Citation kind="file" target="src/lib/auth.ts" lines="12-40" />
        </div>
      </div>
    </>
  );
}

function ScanPane() {
  return (
    <>
      <div className={s.card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-medium text-nv-ivory-50">Scan depth</span>
          <span className={s.seg2}>
            <span className={s.seg2On}>Quick · 20 files</span>
            <span>Deep · 60 files</span>
          </span>
        </div>
      </div>
      <div className={s.claim}>
        <div className={s.claimMeta}>
          <span className={s.sev}>
            <ShieldAlert aria-hidden className="size-3.5" />
            Example finding · Medium
          </span>
          <BasisTag basis="inferred" />
        </div>
        <p className={s.claimText}>User input reaches a query without validation. Verify before acting.</p>
        <div className={s.claimMeta}>
          <Citation kind="file" target="src/app/api/search.ts" lines="31-48" />
        </div>
      </div>
    </>
  );
}

const PATHS: Path[] = [
  {
    id: "developer",
    title: "Analyze a developer",
    text: "Start from a GitHub username and ask about their public projects and activity.",
    href: `/chat?q=${encodeURIComponent("torvalds")}`,
    cta: "Analyze the example profile",
    pane: <ProfilePane />,
  },
  {
    id: "repository",
    title: "Analyze a repository",
    text: "Paste owner/repo and get answers about architecture, with the files shown.",
    href: `/chat?q=${encodeURIComponent("facebook/react")}`,
    cta: "Analyze the example repository",
    pane: <RepoPane />,
  },
  {
    id: "security",
    title: "Run a security scan",
    text: "Quick scans are open to everyone. Deep scans need sign-in.",
    href: `/chat?q=${encodeURIComponent("vercel/next.js")}&prompt=security`,
    cta: "Scan the example repository",
    pane: <ScanPane />,
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
            {p.pane}
          </div>
        ))}
        <p className={s.previewNote}>Sample layout with made-up values, not a real result.</p>
      </div>
    </div>
  );
}
