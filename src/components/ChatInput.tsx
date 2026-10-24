"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowUp, AtSign, FileCode, Folder, Loader2, Network, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelPreference } from "@/lib/ai-client";
import s from "./chat/chat.module.css";

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
    /** Changing this number moves focus into the field (suggestion picked, prefill). */
    focusSignal?: number;
}

/** 44px on touch, a tighter 36px with a fine pointer. */
const pill =
    "inline-flex min-h-9 touch-manipulation items-center gap-1.5 rounded-full px-3 text-nv-small font-medium transition-[background-color,color,box-shadow] duration-150 [@media(pointer:coarse)]:min-h-11 disabled:cursor-not-allowed disabled:opacity-45";

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
    focusSignal,
}: ChatInputProps) {
    const { data: session } = useSession();
    const uid = useId();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [coarse, setCoarse] = useState(false);
    const [mentionOpen, setMentionOpen] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionIndex, setMentionIndex] = useState(0);
    const [dragging, setDragging] = useState(false);
    const wasLoading = useRef(false);

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
        t.style.height = `${Math.min(t.scrollHeight, 220)}px`;
        t.style.overflowY = t.scrollHeight > 220 ? "auto" : "hidden";
    }, [value]);

    // Focus returns to the field when an answer finishes, so the next question is one keystroke away.
    useEffect(() => {
        if (wasLoading.current && !loading && !disabled && !document.querySelector("dialog[open]")) textareaRef.current?.focus({ preventScroll: true });
        wasLoading.current = Boolean(loading);
    }, [loading, disabled]);

    useEffect(() => {
        if (focusSignal) {
            const t = textareaRef.current;
            t?.focus();
            t?.setSelectionRange(t.value.length, t.value.length);
        }
    }, [focusSignal]);

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
        if (e.key === "Enter" && !e.shiftKey && !coarse && !e.nativeEvent.isComposing) {
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

    const startMention = () => {
        const t = textareaRef.current;
        const cursor = t?.selectionStart ?? value.length;
        const next = `${value.slice(0, cursor)}${cursor > 0 && !/\s$/.test(value.slice(0, cursor)) ? " " : ""}@${value.slice(cursor)}`;
        onChange(next);
        setMentionOpen(true);
        setMentionQuery("");
        setMentionIndex(0);
        window.setTimeout(() => t?.focus(), 0);
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
                <ul id={`${uid}-mentions`} role="listbox" aria-label="Files to tag" className="nv-fade absolute bottom-full left-0 z-30 mb-3 max-h-64 w-full max-w-md list-none overflow-y-auto rounded-nv-lg border border-nv-graphite-700 bg-white p-1.5 shadow-nv-popover">
                    <li role="presentation" className="nv-eyebrow px-3 pb-1 pt-1.5">Tag a file</li>
                    {matches.map((f, i) => (
                        <li
                            key={f.path}
                            id={`${uid}-opt-${i}`}
                            role="option"
                            aria-selected={i === mentionIndex}
                            onMouseDown={(e) => { e.preventDefault(); addTag(f.path); }}
                            className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-nv-sm px-3 text-nv-small", i === mentionIndex ? "bg-nv-copper-wash text-nv-copper-300" : "text-nv-ivory-200 hover:bg-nv-graphite-800")}
                        >
                            {f.type === "tree" ? <Folder aria-hidden className="size-4 shrink-0" /> : <FileCode aria-hidden className="size-4 shrink-0" />}
                            <span className="truncate font-nv-mono text-[0.78rem]">{f.path}</span>
                        </li>
                    ))}
                </ul>
            )}

            <div
                data-drop={dragging || undefined}
                onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn("nv-holo-ring p-3 sm:p-4", s.composer, disabled && "opacity-80")}
            >
                {taggedFiles.length > 0 && (
                    <ul aria-label="Tagged files" className="m-0 mb-2 flex list-none flex-wrap gap-1.5 p-0">
                        {taggedFiles.map((path) => {
                            const folder = repositoryFiles.find((r) => r.path === path)?.type === "tree";
                            return (
                                <li key={path} className="inline-flex max-w-full items-center gap-1 rounded-md border border-nv-copper-700 bg-nv-copper-wash pl-2 font-nv-mono text-[0.71875rem] text-nv-copper-300">
                                    {folder ? <Folder aria-hidden className="size-3 shrink-0" /> : <FileCode aria-hidden className="size-3 shrink-0" />}
                                    <span className="truncate">{path}</span>
                                    <button type="button" onClick={() => onTaggedFilesChange?.(taggedFiles.filter((f) => f !== path))} aria-label={`Remove ${path}`} className="grid size-8 place-items-center rounded-md hover:text-nv-ivory-50">
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
                    className="block max-h-[220px] min-h-12 w-full resize-none bg-transparent px-1.5 py-2 text-[1rem] leading-[1.6] text-nv-ivory-100 placeholder:text-nv-graphite-400 focus:outline-none focus-visible:!shadow-none focus-visible:!outline-none disabled:cursor-not-allowed"
                />
                <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        {repositoryFiles.length > 0 && (
                            <button type="button" disabled={disabled} onClick={startMention} aria-label="Tag a file" className={cn(pill, "text-nv-ivory-200 hover:bg-nv-graphite-850 hover:text-nv-ivory-50")}>
                                <AtSign aria-hidden className="size-4" />
                                <span className="hidden sm:inline">Tag</span>
                            </button>
                        )}
                        <div role="group" aria-label="Model mode" className="inline-flex rounded-full bg-nv-graphite-850 p-0.5 shadow-[inset_0_1px_2px_rgb(21_23_29/0.06)]">
                            <button
                                type="button"
                                disabled={disabled}
                                aria-pressed={modelPreference === "flash"}
                                onClick={() => setModelPreference?.("flash")}
                                className={cn(pill, modelPreference === "flash" ? "bg-white text-nv-ivory-50 shadow-nv-xs" : "text-nv-ivory-200 hover:text-nv-ivory-50")}
                            >
                                Lite
                            </button>
                            <button
                                type="button"
                                disabled={disabled}
                                aria-pressed={modelPreference === "thinking"}
                                onClick={() => (session ? setModelPreference?.("thinking") : onRequireAuth?.())}
                                className={cn(pill, modelPreference === "thinking" ? "bg-white text-nv-violet-600 shadow-nv-xs" : "text-nv-ivory-200 hover:text-nv-ivory-50")}
                            >
                                <Sparkles aria-hidden className="size-3.5" />
                                Thinking{!session && <span className="text-nv-micro font-normal text-nv-ivory-300">sign in</span>}
                            </button>
                        </div>
                        {showCrossRepoToggle && (
                            <button
                                type="button"
                                disabled={disabled}
                                aria-pressed={crossRepoEnabled}
                                onClick={() => {
                                    if (!crossRepoEnabled && !session) return onRequireCrossRepoAuth?.();
                                    setCrossRepoEnabled?.(!crossRepoEnabled);
                                }}
                                className={cn(pill, "border", crossRepoEnabled ? "border-nv-copper-700 bg-nv-copper-wash text-nv-copper-300" : "border-nv-graphite-600 text-nv-ivory-200 hover:bg-nv-graphite-800")}
                            >
                                <Network aria-hidden className="size-4" /> Cross-repo{!session && <span className="text-nv-micro font-normal text-nv-ivory-300">sign in</span>}
                            </button>
                        )}
                        {quotaNode}
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                        {!coarse && (
                            <p className="m-0 hidden items-center gap-1.5 text-nv-micro text-nv-ivory-300 md:flex">
                                <kbd className="rounded border border-nv-graphite-600 bg-nv-graphite-800 px-1.5 font-nv-mono text-[0.65rem]">Enter</kbd> send
                                <kbd className="ml-1 rounded border border-nv-graphite-600 bg-nv-graphite-800 px-1.5 font-nv-mono text-[0.65rem]">Shift Enter</kbd> new line
                            </p>
                        )}
                        <button
                            type="submit"
                            disabled={!canSend}
                            aria-busy={loading || undefined}
                            aria-label={loading ? "Working on your question" : "Send question"}
                            className="inline-flex size-11 touch-manipulation items-center justify-center rounded-full bg-nv-copper-500 text-white shadow-nv-accent transition-[background-color,transform,box-shadow] duration-200 hover:bg-nv-copper-300 motion-safe:active:scale-95 disabled:cursor-not-allowed disabled:bg-nv-graphite-600 disabled:shadow-none"
                        >
                            {loading ? <Loader2 aria-hidden className="nv-spin size-5" /> : <ArrowUp aria-hidden className="size-5" />}
                        </button>
                    </div>
                </div>
            </div>
            {disabled && disabledReason && <p id={`${uid}-why`} className="m-0 px-2 text-nv-small text-nv-warning">{disabledReason}</p>}
        </div>
    );
}
