"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";
import { Menu, X } from "lucide-react";
import { cn } from "@/components/nv/cn";
import { btnClass } from "./blocks";
import s from "./seo.module.css";

export interface HeaderLink {
  href: string;
  label: string;
  current?: boolean;
}

export { BrandMark };

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn(s.brand, className)}>
      <BrandMark />
      <span className="font-nv-sans text-[15px] font-medium tracking-[0.24em] text-nv-ivory-50">NOVARIS</span>
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
