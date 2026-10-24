"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowUp, FileCode, Folder, Network, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelPreference } from "@/lib/ai-client";

interface ChatInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    placeholder?: string;
    disabled?: boolean;
    /** Why the field is disabled, shown under it. */
    disabledReason?: string;
    loading?: boolean;
    allowEmptySubmit?: boolean;
    modelPreference?: ModelPreference;
    setModelPreference?: (pref: ModelPreference) => void;
    onRequireAuth?: () => void;
    showCrossRepoToggle?: boolean;
    crossRepoEnabled?: boolean;
    setCrossRepoEnabled?: (enabled: boolean) => void;
    onRequireCrossRepoAuth?: () => void;
    repositoryFiles?: { path: string; type?: "blob" | "tree" }[];
    taggedFiles?: string[];
    onTaggedFilesChange?: (files: string[]) => void;
    quotaNode?: React.ReactNode;
}

const chip =
    "inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-nv-sm border px-3 text-nv-small transition-colors disabled:cursor-not-allowed disabled:opacity-45";

export function ChatInput({
    value,
    onChange,
    onSubmit,
    placeholder,
    disabled,
    disabledReason,
    loading,
    allowEmptySubmit,
    modelPreference = "flash",
    setModelPreference,
    onRequireAuth,
    showCrossRepoToggle = false,
    crossRepoEnabled = false,
    setCrossRepoEnabled,
    onRequireCrossRepoAuth,
    repositoryFiles = [],
    taggedFiles = [],
    onTaggedFilesChange,
    quotaNode,
}: ChatInputProps) {
    const { data: session } = useSession();
    const uid = useId();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [coarse, setCoarse] = useState(false);
    const [mentionOpen, setMentionOpen] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionIndex, setMentionIndex] = useState(0);
    const [dragging, setDragging] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia("(pointer: coarse)");
        const update = () => setCoarse(mq.matches);
        update();
        mq.addEventListener("change", update);
        return () => mq.removeEventListener("change", update);
    }, []);

    useEffect(() => {
        const t = textareaRef.current;
        if (!t) return;
        t.style.height = "auto";
        t.style.height = `${Math.min(t.scrollHeight, 200)}px`;
        t.style.overflowY = t.scrollHeight > 200 ? "auto" : "hidden";
    }, [value]);

    const matches = repositoryFiles.filter((f) => f.path.toLowerCase().includes(mentionQuery.toLowerCase()) && !taggedFiles.includes(f.path)).slice(0, 10);
    const menuOpen = mentionOpen && matches.length > 0;
    const hasContent = Boolean(value.trim()) || Boolean(allowEmptySubmit) || taggedFiles.length > 0;
    const canSend = !loading && !disabled && hasContent;

    const addTag = (file: string) => {
        onTaggedFilesChange?.([...taggedFiles, file]);
        setMentionOpen(false);
        const cursor = textareaRef.current?.selectionStart ?? value.length;
        const before = value.slice(0, cursor).replace(/@[a-zA-Z0-9_.\-/]*$/, "");
        onChange(before + value.slice(cursor));
        window.setTimeout(() => {
            textareaRef.current?.focus();
            textareaRef.current?.setSelectionRange(before.length, before.length);
        }, 0);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (menuOpen) {
            if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => Math.min(i + 1, matches.length - 1)); return; }
            if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => Math.max(i - 1, 0)); return; }
            if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); if (matches[mentionIndex]) addTag(matches[mentionIndex].path); return; }
            if (e.key === "Escape") { e.preventDefault(); setMentionOpen(false); return; }
        }
        if (e.key === "Enter" && !e.shiftKey && !coarse) {
            e.preventDefault();
            if (canSend) onSubmit(e);
        }
    };

    const handleChange = (next: string) => {
        onChange(next);
        const cursor = textareaRef.current?.selectionStart ?? next.length;
        const m = next.slice(0, cursor).match(/@([a-zA-Z0-9_.\-/]*)$/);
        setMentionOpen(Boolean(m));
        if (m) { setMentionQuery(m[1] || ""); setMentionIndex(0); }
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        if (disabled) return;
        const dropped = e.dataTransfer.getData("text/plain");
        if (dropped && repositoryFiles.some((f) => f.path === dropped)) {
            if (!taggedFiles.includes(dropped)) onTaggedFilesChange?.([...taggedFiles, dropped]);
            return;
        }
        const names = Array.from(e.dataTransfer.files).map((f) => f.name);
        const next = [...taggedFiles];
        for (const n of names) {
            const hit = repositoryFiles.find((f) => f.path === n || f.path.endsWith(`/${n}`));
            if (hit && !next.includes(hit.path)) next.push(hit.path);
        }
        if (next.length !== taggedFiles.length) onTaggedFilesChange?.(next);
    };

    const placeholderText =
        taggedFiles.length > 0 ? "Add your message" : (placeholder ?? "Type @ to mention a file").replace(coarse ? "(use @ or drop to tag)" : "", coarse ? "(use @ to tag)" : "");

    return (
        <div className="relative flex flex-col gap-2">
            {menuOpen && (
                <ul id={`${uid}-mentions`} role="listbox" aria-label="Files to tag" className="shadow-nv-popover absolute bottom-full left-0 z-30 mb-2 max-h-60 w-full max-w-md list-none overflow-y-auto rounded-nv-md border border-nv-graphite-600 bg-nv-graphite-800 p-1.5">
                    {matches.map((f, i) => (
                        <li
                            key={f.path}
                            id={`${uid}-opt-${i}`}
                            role="option"
                            aria-selected={i === mentionIndex}
                            onMouseDown={(e) => { e.preventDefault(); addTag(f.path); }}
                            className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-nv-sm px-3 text-nv-small", i === mentionIndex ? "bg-nv-copper-wash text-nv-copper-300" : "text-nv-ivory-200 hover:bg-nv-graphite-700")}
                        >
                            {f.type === "tree" ? <Folder aria-hidden className="size-4 shrink-0" /> : <FileCode aria-hidden className="size-4 shrink-0" />}
                            <span className="truncate font-mono">{f.path}</span>
                        </li>
                    ))}
                </ul>
            )}

            <div
                onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn("rounded-nv-lg border bg-nv-graphite-800 p-3 shadow-[0_12px_38px_-24px_rgba(37,93,76,0.35)] transition-[border-color,box-shadow] duration-200 focus-within:border-nv-copper-400 focus-within:shadow-[0_12px_38px_-20px_rgba(37,93,76,0.3)]", dragging ? "border-nv-copper-400 bg-nv-copper-wash" : "border-nv-graphite-500")}
            >
                {taggedFiles.length > 0 && (
                    <ul aria-label="Tagged files" className="m-0 mb-2 flex list-none flex-wrap gap-2 p-0">
                        {taggedFiles.map((path) => {
                            const folder = repositoryFiles.find((r) => r.path === path)?.type === "tree";
                            return (
                                <li key={path} className="inline-flex max-w-full items-center gap-1 rounded-nv-xs border border-nv-copper-600 bg-nv-copper-wash pl-2 font-mono text-nv-micro text-nv-copper-300">
                                    {folder ? <Folder aria-hidden className="size-3 shrink-0" /> : <FileCode aria-hidden className="size-3 shrink-0" />}
                                    <span className="truncate">{path}</span>
                                    <button type="button" onClick={() => onTaggedFilesChange?.(taggedFiles.filter((f) => f !== path))} aria-label={`Remove ${path}`} className="grid size-8 place-items-center hover:text-nv-ivory-50">
                                        <X aria-hidden className="size-3" />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
                <label htmlFor={`${uid}-q`} className="sr-only">Your question</label>
                <textarea
                    id={`${uid}-q`}
                    ref={textareaRef}
                    role="combobox"
                    aria-expanded={menuOpen}
                    aria-controls={menuOpen ? `${uid}-mentions` : undefined}
                    aria-activedescendant={menuOpen ? `${uid}-opt-${mentionIndex}` : undefined}
                    aria-autocomplete="list"
                    aria-describedby={disabled && disabledReason ? `${uid}-why` : undefined}
                    value={value}
                    onChange={(e) => handleChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={placeholderText}
                    disabled={disabled}
                    rows={1}
                    className="block max-h-[200px] min-h-12 w-full resize-none bg-transparent px-2 py-3 text-nv-body text-nv-ivory-100 placeholder:text-nv-graphite-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-nv-graphite-700 pt-2">
                    <div className="flex flex-wrap items-center gap-2">
                        {quotaNode}
                        {showCrossRepoToggle && (
                            <button
                                type="button"
                                disabled={disabled}
                                aria-pressed={crossRepoEnabled}
                                onClick={() => {
                                    if (!crossRepoEnabled && !session) return onRequireCrossRepoAuth?.();
                                    setCrossRepoEnabled?.(!crossRepoEnabled);
                                }}
                                className={cn(chip, crossRepoEnabled ? "border-nv-copper-600 bg-nv-copper-wash text-nv-copper-300" : "border-nv-graphite-600 text-nv-ivory-200 hover:bg-nv-graphite-800")}
                            >
                                <Network aria-hidden className="size-4" /> Cross-repo{!session && <span className="text-nv-micro text-nv-ivory-300">sign in</span>}
                            </button>
                        )}
                        <div role="group" aria-label="Model mode" className="inline-flex">
                            <button
                                type="button"
                                disabled={disabled}
                                aria-pressed={modelPreference === "flash"}
                                onClick={() => setModelPreference?.("flash")}
                                className={cn(chip, "rounded-r-none", modelPreference === "flash" ? "border-nv-copper-400 bg-nv-copper-wash text-nv-copper-300" : "border-nv-graphite-600 text-nv-ivory-200 hover:bg-nv-graphite-800")}
                            >
                                Lite
                            </button>
                            <button
                                type="button"
                                disabled={disabled}
                                aria-pressed={modelPreference === "thinking"}
                                onClick={() => (session ? setModelPreference?.("thinking") : onRequireAuth?.())}
                                className={cn(chip, "-ml-px rounded-l-none", modelPreference === "thinking" ? "border-nv-copper-400 bg-nv-copper-wash text-nv-copper-300" : "border-nv-graphite-600 text-nv-ivory-200 hover:bg-nv-graphite-800")}
                            >
                                Thinking{!session && <span className="text-nv-micro text-nv-ivory-300">sign in</span>}
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={!canSend}
                        aria-busy={loading || undefined}
                        className="inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-nv-sm bg-nv-copper-400 px-5 font-medium text-white transition-[background-color,transform] duration-200 hover:bg-nv-copper-300 motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        {loading ? "Working" : "Send"} <ArrowUp aria-hidden className="size-4" />
                    </button>
                </div>
            </div>
            {disabled && disabledReason && <p id={`${uid}-why`} className="text-nv-small text-nv-warning">{disabledReason}</p>}
        </div>
    );
}
