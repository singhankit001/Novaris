"use client";

import { useState, useEffect, useId, useRef } from "react";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { getRepoSuggestions } from "@/app/actions";
import SuggestionsList, { suggestionOptionId } from "./SuggestionsList";
import type { RepoSuggestion } from "@/lib/services/repo-suggestions";
import type { CatalogRepoEntry } from "@/lib/repo-catalog";
import type { SearchHistoryItem } from "@/lib/services/history-service";
import Link from "next/link";
import { cn } from "@/components/nv/cn";
import s from "./RepoSearch.module.css";

interface RepoSearchProps {
    onSearchSubmit: (query: string) => void;
    loading: boolean;
    trendingRepos: CatalogRepoEntry[];
    recentSearches: SearchHistoryItem[];
    isSessionActive: boolean;
    /** Set while the portal-activation exit plays before navigation. */
    activating?: boolean;
    /** Id for the input so the page can focus it. */
    inputId?: string;
}

export default function RepoSearch({
    onSearchSubmit,
    loading,
    trendingRepos,
    recentSearches,
    isSessionActive,
    activating = false,
    inputId,
}: RepoSearchProps) {
    const [input, setInput] = useState("");
    const [suggestions, setSuggestions] = useState<RepoSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
    const [emptyError, setEmptyError] = useState(false);
    const listId = useId();
    const inputRef = useRef<HTMLInputElement>(null);

    // "/" focuses the field from anywhere that is not already a text control.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const el = e.target as HTMLElement | null;
            if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
            if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
            e.preventDefault();
            inputRef.current?.focus();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

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
                <div className={s.shell} data-activating={activating}>
                    <div className={cn(s.field, "nv-holo-ring", emptyError && s.fieldError)}>
                        <Search aria-hidden className={cn(s.icon, "size-6")} />
                        <input
                            ref={inputRef}
                            id={inputId}
                            type="text"
                            role="combobox"
                            aria-expanded={showSuggestions}
                            aria-autocomplete="list"
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
                            className={s.input}
                        />
                        <span aria-hidden className={s.hint}>
                            {input ? <><kbd className={s.kbd}>↵</kbd> to analyze</> : <><kbd className={s.kbd}>/</kbd> to focus</>}
                        </span>
                        <button type="submit" disabled={loading} aria-label={loading ? "Analyzing" : "Analyze"} className={s.submit}>
                            <span aria-hidden className={s.submitLabel}>
                                {loading ? "Analyzing" : "Analyze"}
                            </span>
                            {busy ? <Loader2 aria-hidden className="size-5 animate-spin" /> : <ArrowRight aria-hidden className="size-5" />}
                        </button>
                    </div>
                </div>
                {emptyError && (
                    <p id={`${listId}-err`} role="alert" className={s.err}>
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

            <div className={s.picks}>
                <span className="mr-1">{picks.label}</span>
                {picks.items.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                            setInput(item.query);
                            onSearchSubmit(item.query);
                        }}
                        className={s.pick}
                    >
                        {item.text}
                    </button>
                ))}
                <Link href="/trending" className={s.browse}>
                    Browse trending
                </Link>
            </div>
        </div>
    );
}
