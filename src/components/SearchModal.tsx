"use client";

import { useId, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Dialog } from "@/components/nv/dialog";
import { Button } from "@/components/nv/button";
import { cn } from "@/components/nv/cn";
import { toast } from "sonner";
import { searchRepositoryCode } from "@/app/actions";
import { stripEmojiCharacters } from "@/lib/no-emoji";

interface SearchFileNode {
    path: string;
    sha?: string;
}

interface SearchModalProps {
    repoContext: { owner: string; repo: string; fileTree: SearchFileNode[] };
    onSendMessage: (role: "user" | "model", content: string) => void;
}

export function SearchModal({ repoContext, onSendMessage }: SearchModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchType, setSearchType] = useState<'text' | 'regex' | 'ast'>('text');
    const uid = useId();

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setLoading(true);
        try {
            const results = await searchRepositoryCode(
                repoContext.owner,
                repoContext.repo,
                repoContext.fileTree,
                searchQuery,
                searchType
            );

            let content = `### Search Results for "${searchQuery}" (${searchType})\n\n`;
            if (results.length === 0) {
                content += "No matches found.";
            } else {
                content += `Found **${results.length}** matches:\n\n`;
                results.slice(0, 30).forEach(r => {
                    content += `- [${r.file}](#preview-${r.file.replace(/[^a-zA-Z0-9-]/g, '-')}) (Line ${r.line}): \`${r.content.slice(0, 100).trim()}\`\n`;
                });
                if (results.length > 30) content += `\n*...and ${results.length - 30} more.*`;
            }

            onSendMessage("model", stripEmojiCharacters(content));
            setIsOpen(false);
        } catch (error) {
            toast.error("Search failed");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="group grid size-11 place-items-center rounded-nv-sm text-nv-ivory-300 transition-colors hover:bg-nv-copper-wash hover:text-nv-copper-400"
                title="Search codebase"
                aria-label="Search codebase"
            >
                <Search aria-hidden className="size-5 transition-transform motion-safe:group-hover:scale-110" />
            </button>
            <Dialog
                open={isOpen}
                onClose={() => { if (!loading) setIsOpen(false); }}
                title="Search your codebase"
                description={`Find a function, pattern or code structure in ${repoContext.owner}/${repoContext.repo}.`}
            >
                <form onSubmit={handleSearch} className="space-y-6 p-1" aria-busy={loading}>
                    <div>
                        <label htmlFor={`${uid}-query`} className="mb-2 block text-nv-small font-medium text-nv-ivory-100">Search query</label>
                        <input
                            id={`${uid}-query`}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="min-h-12 w-full rounded-nv-sm border border-nv-graphite-500 bg-nv-graphite-950 px-4 text-nv-body text-nv-ivory-50 placeholder:text-nv-graphite-400 focus:border-nv-copper-400"
                            placeholder="Function name, exact string, pattern…"
                            disabled={loading}
                            autoFocus
                        />
                    </div>
                    <fieldset className="min-w-0">
                        <legend className="mb-3 text-nv-small font-medium text-nv-ivory-100">Search type</legend>
                        <div className="grid grid-cols-3 gap-2">
                            {([
                                { value: "text", label: "Text", hint: "Exact strings" },
                                { value: "regex", label: "Regex", hint: "Pattern matching" },
                                { value: "ast", label: "AST", hint: "Code structures" },
                            ] as const).map((type) => (
                                <button
                                    key={type.value}
                                    type="button"
                                    aria-pressed={searchType === type.value}
                                    onClick={() => setSearchType(type.value)}
                                    disabled={loading}
                                    className={cn(
                                        "min-h-20 rounded-nv-md border p-2 text-left transition-colors disabled:opacity-50 sm:p-3",
                                        searchType === type.value
                                            ? "border-nv-copper-400 bg-nv-copper-wash text-nv-copper-300"
                                            : "border-nv-graphite-600 bg-nv-graphite-850 text-nv-ivory-200 hover:border-nv-copper-400",
                                    )}
                                >
                                    <span className="block text-nv-small font-semibold">{type.label}</span>
                                    <span className="mt-1 block text-[11px] leading-snug text-nv-ivory-300">{type.hint}</span>
                                </button>
                            ))}
                        </div>
                    </fieldset>
                    <Button variant="primary" type="submit" disabled={loading || !searchQuery.trim()} className="w-full" leading={loading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Search aria-hidden className="size-4" />}>
                        {loading ? "Searching codebase…" : "Search codebase"}
                    </Button>
                </form>
            </Dialog>
        </>
    );
}
