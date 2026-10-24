"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import type { ReactNode } from "react";
import { Badge } from "@/components/nv/badge";
import { Button } from "@/components/nv/button";
import { Wordmark } from "@/components/nv/nav";

/** Signed-in top bar shared by the dashboard and admin shells. */
export default function AppHeader({ area }: { area?: string }) {
    const status: ReactNode = area ? <Badge status="warning">{area}</Badge> : null;
    return (
        <header className="sticky top-0 z-20 border-b border-nv-graphite-700 bg-nv-graphite-800/95 backdrop-blur-xl">
            <a
                href="#nv-main"
                className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-nv-sm focus:bg-nv-copper-400 focus:px-3 focus:py-2 focus:text-white"
            >
                Skip to content
            </a>
            <div className="flex h-18 items-center justify-between gap-3 px-[var(--nv-gutter)]">
                <div className="flex items-center gap-3">
                    <Link href="/" aria-label="Novaris home" className="rounded-nv-sm">
                        <Wordmark />
                    </Link>
                    {status}
                </div>
                <Button variant="ghost" leading={<LogOut aria-hidden className="size-4" />} onClick={() => signOut({ callbackUrl: "/" })}>
                    Sign out
                </Button>
            </div>
        </header>
    );
}
