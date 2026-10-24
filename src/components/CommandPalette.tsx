"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Search, Home, LayoutDashboard, TrendingUp, HelpCircle, FileText, ShieldAlert, LogOut, BookOpen, Compass, Layers, Info, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Dialog } from "@/components/nv/dialog";
import { cn } from "@/components/nv/cn";

interface CommandOption {
    label: string;
    href: string;
    icon: LucideIcon;
    category: string;
}

// Every href is an existing route; "signout" is handled separately.
const NAVIGATION: CommandOption[] = [
    { label: "Home and search", href: "/", icon: Home, category: "Navigation" },
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, category: "Navigation" },
    { label: "Trending repositories", href: "/trending", icon: TrendingUp, category: "Navigation" },
    { label: "Explore pages", href: "/explore", icon: Compass, category: "Navigation" },
    { label: "Solutions", href: "/solutions", icon: Layers, category: "Information" },
    { label: "Insights (blog)", href: "/blog", icon: BookOpen, category: "Information" },
    { label: "FAQ", href: "/faq", icon: HelpCircle, category: "Information" },
    { label: "About", href: "/about", icon: Info, category: "Information" },
    { label: "Terms of Service", href: "/terms", icon: FileText, category: "Legal" },
    { label: "Privacy Policy", href: "/privacy", icon: ShieldAlert, category: "Legal" },
];
const SIGN_OUT: CommandOption = { label: "Sign out", href: "signout", icon: LogOut, category: "Account" };

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();
    const { data: session } = useSession();
    const inputRef = useRef<HTMLInputElement>(null);
    const uid = useId();

    const allOptions = session ? [...NAVIGATION, SIGN_OUT] : NAVIGATION;
    const needle = search.trim().toLowerCase();
    const filteredOptions = allOptions.filter(
        (opt) => opt.label.toLowerCase().includes(needle) || opt.category.toLowerCase().includes(needle),
    );
    const active = filteredOptions[selectedIndex];

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Reset search state each time the palette opens
    const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
    if (prevIsOpen !== isOpen) {
        setPrevIsOpen(isOpen);
        if (isOpen) {
            setSearch("");
            setSelectedIndex(0);
        }
    }

    useEffect(() => {
        if (!isOpen) return;
        const frame = requestAnimationFrame(() => inputRef.current?.focus());
        return () => cancelAnimationFrame(frame);
    }, [isOpen]);

    const handleAction = (href: string) => {
        setIsOpen(false);
        if (href === "signout") {
            signOut({ callbackUrl: "/" });
        } else {
            router.push(href);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : Math.max(filteredOptions.length - 1, 0)));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (active) handleAction(active.href);
        }
    };

    return (
        <Dialog open={isOpen} onClose={() => setIsOpen(false)} title="Quick navigation" description="Jump to a page. Press Escape to close.">
            <div className="flex items-center gap-3 rounded-nv-md border border-nv-graphite-500/70 bg-nv-graphite-850 px-4 shadow-[inset_0_1px_2px_rgb(21_23_29/0.06)] transition-[background-color,border-color,box-shadow] focus-within:border-nv-copper-400 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgb(47_84_255/0.14)]">
                <Search aria-hidden className="size-4 shrink-0 text-nv-ivory-300" />
                <input
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-expanded="true"
                    aria-controls={`${uid}-list`}
                    aria-activedescendant={active ? `${uid}-opt-${selectedIndex}` : undefined}
                    aria-autocomplete="list"
                    aria-label="Search pages or commands"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setSelectedIndex(0);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search pages or commands"
                    autoComplete="off"
                    className="min-h-11 w-full border-0 bg-transparent text-nv-body text-nv-ivory-50 outline-none placeholder:text-nv-graphite-400 focus-visible:!shadow-none focus-visible:!outline-none"
                />
            </div>
            <ul id={`${uid}-list`} role="listbox" aria-label="Pages" className="m-0 mt-4 max-h-[50dvh] list-none space-y-1 overflow-y-auto p-0">
                {filteredOptions.map((opt, idx) => {
                    const selected = idx === selectedIndex;
                    return (
                        <li
                            key={opt.label}
                            id={`${uid}-opt-${idx}`}
                            role="option"
                            aria-selected={selected}
                            onClick={() => handleAction(opt.href)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={cn(
                                "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-nv-md px-3 text-nv-body transition-colors duration-150",
                                selected ? "bg-nv-copper-wash text-nv-ivory-50 shadow-[inset_0_0_0_1px_rgb(47_84_255/0.14)]" : "text-nv-ivory-200",
                            )}
                        >
                            <span className="flex items-center gap-3">
                                <opt.icon aria-hidden className="size-4 text-nv-ivory-300" />
                                {opt.label}
                            </span>
                            <span className="nv-eyebrow">{opt.category}</span>
                        </li>
                    );
                })}
            </ul>
            {filteredOptions.length === 0 && (
                <p role="status" className="mt-3 text-nv-small text-nv-ivory-300">
                    No page matches &ldquo;{search}&rdquo;.
                </p>
            )}
        </Dialog>
    );
}
