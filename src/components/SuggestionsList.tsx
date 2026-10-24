"use client";

import { useRef, useEffect } from "react";
import { Star, User, Github, Database } from "lucide-react";
import type { RepoSuggestion } from "@/lib/services/repo-suggestions";
import { cn } from "@/components/nv/cn";

interface SuggestionsListProps {
    id: string;
    suggestions: RepoSuggestion[];
    onSelect: (suggestion: RepoSuggestion) => void;
    selectedIndex: number;
}

const SOURCE_LABEL = { user: "Your repositories", local: "Novaris catalog", github: "GitHub search" } as const;

export function suggestionOptionId(listId: string, index: number) {
    return `${listId}-opt-${index}`;
}

export default function SuggestionsList({ id, suggestions, onSelect, selectedIndex }: SuggestionsListProps) {
    const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

    useEffect(() => {
        itemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" });
    }, [selectedIndex]);

    if (suggestions.length === 0) return null;

    const sourceLabel = suggestions.some((s) => s.source === "github")
        ? SOURCE_LABEL.github
        : suggestions.some((s) => s.source === "user")
          ? SOURCE_LABEL.user
          : SOURCE_LABEL.local;

    return (
        <div className="nv-fade absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-nv-md bg-nv-graphite-800 shadow-nv-popover">
            <ul id={id} role="listbox" aria-label="Repository suggestions" className="m-0 max-h-64 list-none overflow-y-auto p-1">
                {suggestions.map((suggestion, index) => {
                    const selected = index === selectedIndex;
                    const Icon = suggestion.source === "user" ? User : suggestion.source === "local" ? Database : Github;
                    return (
                        <li
                            key={`${suggestion.source}:${suggestion.owner}/${suggestion.repo}`}
                            id={suggestionOptionId(id, index)}
                            ref={(el) => {
                                itemRefs.current[index] = el;
                            }}
                            role="option"
                            aria-selected={selected}
                            onMouseDown={(e) => e.preventDefault()} // keep input focus so blur does not drop the tap
                            onClick={() => onSelect(suggestion)}
                            className={cn(
                                "flex min-h-12 cursor-pointer items-start gap-3 rounded-nv-sm px-3 py-2.5 text-left",
                                selected ? "bg-nv-copper-wash shadow-[inset_2px_0_0_var(--nv-copper-400)]" : "hover:bg-nv-graphite-700",
                            )}
                        >
                            <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-nv-ivory-300" />
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center justify-between gap-3">
                                    <span className="truncate font-mono text-nv-small text-nv-ivory-50">
                                        {suggestion.owner}/{suggestion.repo}
                                    </span>
                                    <span className="nv-num flex shrink-0 items-center gap-1 text-nv-micro text-nv-ivory-300">
                                        <Star aria-hidden className="size-3" />
                                        <span className="sr-only">Stars </span>
                                        {suggestion.stars >= 1000 ? `${(suggestion.stars / 1000).toFixed(1)}k` : suggestion.stars}
                                    </span>
                                </span>
                                {suggestion.description && (
                                    <span className="mt-0.5 block truncate text-nv-micro text-nv-ivory-300">{suggestion.description}</span>
                                )}
                            </span>
                        </li>
                    );
                })}
            </ul>
            <p className="m-0 flex items-center justify-between border-t border-nv-graphite-700 px-3 py-1.5 text-nv-micro text-nv-ivory-300">
                <span>Arrow keys to move, Enter to select</span>
                <span>{sourceLabel}</span>
            </p>
        </div>
    );
}
