"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/components/nv/cn";
import { btnClass } from "./blocks";
import s from "./seo.module.css";

export interface HeaderLink {
  href: string;
  label: string;
  current?: boolean;
}

/** Branching mark: a root node fanning into two cited leaves. */
export function BrandMark({ size = 30 }: { size?: number }) {
  const uid = useId();
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 32 32" className={s.brandMark} focusable="false">
      <defs>
        <linearGradient id={`${uid}-g`} x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4d6dff" />
          <stop offset="0.6" stopColor="#7a4dff" />
          <stop offset="1" stopColor="#19b6e6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="10" fill={`url(#${uid}-g)`} />
      <path d="M11 22V10m0 6c0-3 2-4 5-4h3" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity="0.95" />
      <circle cx="11" cy="9" r="2.4" fill="#fff" />
      <circle cx="11" cy="23" r="2.4" fill="#fff" />
      <circle cx="21.5" cy="12" r="2.4" fill="#fff" opacity="0.95" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn(s.brand, className)}>
      <BrandMark />
      <span className={cn(s.brandName, "font-nv-sans")}>
        novaris<span className={s.brandDot}>.</span>
      </span>
    </span>
  );
}

export default function SiteHeader({ links, cta, account }: { links: HeaderLink[]; cta: { href: string; label: string }; account?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  return (
    <header className={cn(s.header, "nv-site-header")}>
      <a href="#nv-main" className={s.skip}>
        Skip to content
      </a>
      <div className={s.bar}>
        <Link href="/" aria-label="Novaris home" className={s.brand}>
          <Wordmark />
        </Link>
        <nav aria-label="Primary" className={s.nav}>
          <ul className={s.navList}>
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} aria-current={l.current ? "page" : undefined} className={cn(s.navLink, l.current && s.navLinkActive)}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className={s.actions}>
          {account}
          <Link href={cta.href} className={cn(btnClass("primary"), s.cta)}>
            {cta.label}
          </Link>
          <button type="button" className={s.menuBtn} aria-label="Open menu" aria-haspopup="dialog" onClick={() => setOpen(true)}>
            <Menu aria-hidden className="size-5" />
          </button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className={s.sheet}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) setOpen(false);
        }}
      >
        <div aria-hidden className={cn(s.sheetGlow, "nv-aurora")} />
        <div className={s.sheetTop}>
          <span id={titleId} className="nv-eyebrow">
            Menu
          </span>
          <button type="button" className={cn(s.menuBtn, s.menuBtnShown)} aria-label="Close menu" onClick={() => setOpen(false)}>
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className={s.sheetBody}>
          <nav aria-label="Primary mobile">
            <ul className={s.sheetList}>
              {links.map((l, i) => (
                <li key={l.href}>
                  <Link href={l.href} aria-current={l.current ? "page" : undefined} className={s.sheetLink} onClick={() => setOpen(false)}>
                    <small className="nv-num">{String(i + 1).padStart(2, "0")}</small>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className={s.sheetCta}>
            <Link href={cta.href} className={cn(btnClass("primary", true), "w-full")} onClick={() => setOpen(false)}>
              {cta.label}
            </Link>
          </div>
        </div>
      </dialog>
    </header>
  );
}
