"use client";

import { useState, useEffect, useId } from "react";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { getRepoSuggestions } from "@/app/actions";
import SuggestionsList, { suggestionOptionId } from "./SuggestionsList";
import type { RepoSuggestion } from "@/lib/services/repo-suggestions";
import type { CatalogRepoEntry } from "@/lib/repo-catalog";
import type { SearchHistoryItem } from "@/lib/services/history-service";
import Link from "next/link";

interface RepoSearchProps {
    onSearchSubmit: (query: string) => void;
    loading: boolean;
    trendingRepos: CatalogRepoEntry[];
    recentSearches: SearchHistoryItem[];
    isSessionActive: boolean;
}

export default function RepoSearch({
    onSearchSubmit,
    loading,
    trendingRepos,
    recentSearches,
    isSessionActive,
}: RepoSearchProps) {
    const [input, setInput] = useState("");
    const [suggestions, setSuggestions] = useState<RepoSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
    const [emptyError, setEmptyError] = useState(false);
    const listId = useId();

    useEffect(() => {
        let isCancelled = false;
        
        const fetchSuggestions = async () => {
            if (input.length < 3) {
                setSuggestions([]);
                setShowSuggestions(false);
                return;
            }

            setIsFetchingSuggestions(true);
            try {
                const results = await getRepoSuggestions(input);
                if (!isCancelled) {
                    setSuggestions(results);
                    setShowSuggestions(results.length > 0);
                }
            } catch (err) {
                if (!isCancelled) {
                    console.error("Failed to fetch suggestions:", err);
                }
            } finally {
                if (!isCancelled) {
                    setIsFetchingSuggestions(false);
                }
            }
        };

        const timer = setTimeout(() => {
            if (!loading) {
                fetchSuggestions();
            }
        }, 100);

        return () => {
            isCancelled = true;
            clearTimeout(timer);
            // A cancelled request skips its own reset, so release the spinner here; only the
            // request started by the next effect run may turn it back on.
            setIsFetchingSuggestions(false);
        };
    }, [input, loading]);

    const handleInputChange = (val: string) => {
        setInput(val);
        setEmptyError(false);
        setSelectedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showSuggestions || suggestions.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === "Enter" && selectedIndex >= 0) {
            e.preventDefault();
            const selected = suggestions[selectedIndex];
            const suggestionInput = `${selected.owner}/${selected.repo}`;
            setInput(suggestionInput);
            setShowSuggestions(false);
            onSearchSubmit(suggestionInput);
        } else if (e.key === "Escape") {
            setShowSuggestions(false);
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowSuggestions(false);
        if (!input.trim()) {
            setEmptyError(true);
            return;
        }
        onSearchSubmit(input);
    };

    const handleSuggestionSelect = (selected: RepoSuggestion) => {
        const suggestionInput = `${selected.owner}/${selected.repo}`;
        setInput(suggestionInput);
        setShowSuggestions(false);
        onSearchSubmit(suggestionInput);
    };

    const picks = isSessionActive && recentSearches.length > 0
        ? { label: "Recent", items: recentSearches.slice(0, 3).map((r) => ({ key: r.query, text: r.query, query: r.query })) }
        : {
              label: "Try",
              items: (trendingRepos.length > 0
                  ? trendingRepos.slice(0, 3).map((r) => ({ key: `${r.owner}/${r.repo}`, text: `${r.owner}/${r.repo}`, query: `${r.owner}/${r.repo}` }))
                  : [
                        { key: "torvalds", text: "torvalds", query: "torvalds" },
                        { key: "facebook/react", text: "facebook/react", query: "facebook/react" },
                        { key: "vercel/next.js", text: "vercel/next.js", query: "vercel/next.js" },
                    ]),
          };
    const activeId = showSuggestions && selectedIndex >= 0 ? suggestionOptionId(listId, selectedIndex) : undefined;
    const busy = loading || isFetchingSuggestions;

    return (
        <div className="w-full">
            <form onSubmit={handleFormSubmit} className="relative" noValidate>
                <div
                    className={`flex min-h-14 items-stretch gap-2 rounded-nv-md border bg-nv-graphite-850 p-1.5 transition-colors duration-150 focus-within:border-nv-copper-400 ${
                        emptyError ? "border-nv-danger" : "border-nv-graphite-500 hover:border-nv-ivory-300"
                    }`}
                >
                    <Search aria-hidden className="my-auto ml-2.5 size-5 shrink-0 text-nv-ivory-300" />
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => input.length >= 3 && suggestions.length > 0 && setShowSuggestions(true)}
                        onBlur={() => setShowSuggestions(false)}
                        placeholder="owner/repo, URL or username"
                        aria-label="GitHub URL, username, or repository"
                        aria-controls={showSuggestions ? listId : undefined}
                        aria-activedescendant={activeId}
                        aria-invalid={emptyError || undefined}
                        aria-describedby={emptyError ? `${listId}-err` : undefined}
                        autoComplete="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        className="min-w-0 flex-1 border-0 bg-transparent px-1 font-mono text-nv-body text-nv-ivory-50 outline-none placeholder:font-sans placeholder:text-nv-graphite-400 focus-visible:!shadow-none focus-visible:!outline-none"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        aria-label={loading ? "Analyzing" : "Analyze"}
                        className="inline-flex min-h-11 shrink-0 touch-manipulation items-center justify-center gap-2 rounded-nv-sm bg-nv-copper-400 px-4 font-medium text-nv-graphite-950 transition-colors duration-150 hover:bg-nv-copper-300 active:bg-nv-copper-500 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        <span aria-hidden className="hidden sm:inline">
                            {loading ? "Analyzing" : "Analyze"}
                        </span>
                        {busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <ArrowRight aria-hidden className="size-4" />}
                    </button>
                </div>
                {emptyError && (
                    <p id={`${listId}-err`} role="alert" className="mt-2 text-nv-small text-nv-danger">
                        Enter a GitHub URL, a username, or owner/repo to analyze.
                    </p>
                )}
                {showSuggestions && (
                    <SuggestionsList id={listId} suggestions={suggestions} onSelect={handleSuggestionSelect} selectedIndex={selectedIndex} />
                )}
                <p className="sr-only" aria-live="polite">
                    {showSuggestions ? `${suggestions.length} suggestions available` : ""}
                </p>
            </form>

            <div className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-nv-small text-nv-ivory-300">
                <span className="mr-1">{picks.label}</span>
                {picks.items.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                            setInput(item.query);
                            onSearchSubmit(item.query);
                        }}
                        className="min-h-11 max-w-[14rem] truncate rounded-nv-sm px-2 font-mono text-nv-ivory-100 underline decoration-nv-graphite-500 underline-offset-4 hover:decoration-nv-copper-400"
                    >
                        {item.text}
                    </button>
                ))}
                <Link href="/trending" className="inline-flex min-h-11 items-center rounded-nv-sm px-2 text-nv-copper-400 hover:text-nv-copper-300">
                    Browse trending
                </Link>
            </div>
        </div>
    );
}
