"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { BotIcon } from "@/components/icons/BotIcon";
import s from "./chat.module.css";

export interface HeroSuggestion {
    label: string;
    hint: string;
    icon: ReactNode;
}

interface ChatHeroProps {
    /** Small line above the headline, e.g. the scope of the conversation. */
    eyebrow: string;
    /** Plain lead-in, then one serif italic accent word or name. */
    lead: string;
    accent: string;
    /** Real facts about what was loaded, e.g. "2,314 files indexed". */
    facts?: string[];
    suggestions: HeroSuggestion[];
    suggestionsLabel?: string;
    onPick: (label: string) => void;
}

/** The empty-thread screen: what you can ask, and one click to start. */
export function ChatHero({ eyebrow, lead, accent, facts = [], suggestions, suggestionsLabel = "Try asking", onPick }: ChatHeroProps) {
    const reduce = useReducedMotion();
    const rise = (delay: number) => (reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { type: "spring" as const, duration: 0.6, bounce: 0, delay } });

    return (
        <section aria-labelledby="hero-title" className="mx-auto flex w-full max-w-[46rem] flex-col items-center px-4 pb-6 pt-8 text-center sm:px-6 sm:pt-[min(6vh,3rem)]">
            <motion.span {...rise(0)} aria-hidden className={`${s.mark} nv-holo-ring mb-4 grid size-12 place-items-center !rounded-[1.1rem]`}>
                <BotIcon className="size-8" />
            </motion.span>
            <motion.p {...rise(0.05)} className="nv-eyebrow mb-3">{eyebrow}</motion.p>
            <motion.h2 {...rise(0.1)} id="hero-title" className="nv-display max-w-full text-balance text-[clamp(2rem,1.3rem+2.8vw,3.25rem)] leading-[1.04] text-nv-ivory-50">
                {lead} <em className="nv-gradient-text break-words pr-1">{accent}</em>
            </motion.h2>
            {facts.length > 0 && (
                <motion.ul {...rise(0.16)} className="m-0 mt-5 flex list-none flex-wrap justify-center gap-x-5 gap-y-1 p-0 text-nv-small text-nv-ivory-300">
                    {facts.map((f) => (
                        <li key={f} className="nv-num flex items-center gap-2">
                            <span aria-hidden className="size-1 rounded-full bg-nv-copper-600" />
                            {f}
                        </li>
                    ))}
                </motion.ul>
            )}

            <motion.div {...rise(0.22)} className="mt-7 w-full text-left">
                <p className="nv-eyebrow mb-3">{suggestionsLabel}</p>
                <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
                    {suggestions.map((sg) => (
                        <li key={sg.label}>
                            <button
                                type="button"
                                onClick={() => onPick(sg.label)}
                                className="nv-lift group flex min-h-[4.75rem] w-full touch-manipulation items-start gap-3.5 rounded-nv-lg border border-nv-graphite-700 bg-nv-graphite-900 p-4 text-left shadow-nv-card"
                            >
                                <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-nv-sm bg-nv-copper-wash text-nv-copper-400 transition-colors group-hover:bg-nv-copper-500 group-hover:text-white">{sg.icon}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[0.9375rem] font-medium leading-snug tracking-[-0.01em] text-nv-ivory-50">{sg.label}</span>
                                    <span className="mt-0.5 block text-nv-small leading-snug text-nv-ivory-300">{sg.hint}</span>
                                </span>
                                <ArrowUpRight aria-hidden className="mt-1 size-4 shrink-0 text-nv-graphite-500 transition-[color,transform] group-hover:text-nv-copper-400 motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5" />
                            </button>
                        </li>
                    ))}
                </ul>
            </motion.div>
        </section>
    );
}
