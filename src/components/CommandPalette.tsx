"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Home, LayoutDashboard, TrendingUp, HelpCircle, FileText, ShieldAlert, LogOut, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();
    const { data: session } = useSession();
    const inputRef = useRef<HTMLInputElement>(null);

    // Command options
    const allOptions = [
        { label: "Go to Home", href: "/", icon: Home, category: "Navigation" },
        { label: "Go to Dashboard", href: "/dashboard", icon: LayoutDashboard, category: "Navigation" },
        { label: "Explore Trending", href: "/trending", icon: TrendingUp, category: "Navigation" },
        { label: "FAQ & Solutions", href: "/faq", icon: HelpCircle, category: "Information" },
        { label: "Terms of Service", href: "/terms", icon: FileText, category: "Legal" },
        { label: "Privacy Policy", href: "/privacy", icon: ShieldAlert, category: "Legal" },
    ];

    // Add Sign Out if session active
    if (session) {
        allOptions.push({
            label: "Sign Out",
            href: "signout",
            icon: LogOut,
            category: "Account"
        });
    }

    const filteredOptions = allOptions.filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        opt.category.toLowerCase().includes(search.toLowerCase())
    );

    // Listen for ⌘K or Ctrl+K
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

    // Handle selection and focus
    useEffect(() => {
        if (isOpen) {
            setSearch("");
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
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
            setSelectedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (filteredOptions[selectedIndex]) {
                handleAction(filteredOptions[selectedIndex].href);
            }
        } else if (e.key === "Escape") {
            setIsOpen(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                    {/* Backdrop click close */}
                    <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

                    {/* Dialog Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ type: "spring", damping: 25, stiffness: 220 }}
                        className="relative w-full max-w-lg bg-[#0a0a0c]/90 border border-white/10 rounded-2xl overflow-hidden flex flex-col max-h-[80vh] shadow-2xl backdrop-blur-xl"
                    >
                        {/* Search Input block */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                            <Search className="w-5 h-5 text-zinc-400 shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setSelectedIndex(0);
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder="Search commands or pages... (Type and press Enter)"
                                className="w-full bg-transparent outline-none border-none text-white text-sm md:text-base placeholder-zinc-500 py-1"
                            />
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Options List */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {filteredOptions.length === 0 ? (
                                <div className="p-8 text-center text-sm text-zinc-500">
                                    No results found matching &ldquo;{search}&rdquo;
                                </div>
                            ) : (
                                filteredOptions.map((opt, idx) => {
                                    const isSelected = idx === selectedIndex;
                                    return (
                                        <button
                                            key={opt.label}
                                            onClick={() => handleAction(opt.href)}
                                            onMouseEnter={() => setSelectedIndex(idx)}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left text-sm font-medium ${
                                                isSelected
                                                    ? "bg-purple-600/15 border border-purple-500/20 text-white"
                                                    : "border border-transparent text-zinc-400 hover:text-white"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <opt.icon className={`w-4 h-4 ${isSelected ? "text-purple-400" : "text-zinc-500"}`} />
                                                <span>{opt.label}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/5">
                                                    {opt.category}
                                                </span>
                                                {isSelected && (
                                                    <span className="text-[10px] text-purple-400 font-mono">
                                                        Enter
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer Help */}
                        <div className="px-4 py-2 border-t border-white/5 bg-white/[0.01] flex items-center justify-between text-[10px] text-zinc-500">
                            <div className="flex items-center gap-3">
                                <span>↑↓ Navigate</span>
                                <span>↵ Select</span>
                                <span>esc Close</span>
                            </div>
                            <span>Command Menu</span>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
