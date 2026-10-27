"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

export interface RepoRowDetailsProps {
    fullName: string;
    description: string | null;
    language: string | null;
    forks: number;
    stars: number;
    updatedAt: string;
}

/** Disclosure under a repository row. Shows only fields the repository list already returned. */
export function RepoRowDetails({ fullName, description, language, forks, stars, updatedAt }: RepoRowDetailsProps) {
    const [open, setOpen] = useState(false);
    const panel = useId();
    const updated = new Date(updatedAt);
    return (
        <div className="border-b border-nv-graphite-700 px-3 last:border-0">
            <button
                type="button"
                aria-expanded={open}
                aria-controls={panel}
                onClick={() => setOpen((o) => !o)}
                className="inline-flex min-h-11 items-center gap-1.5 text-nv-small text-nv-ivory-300 hover:text-nv-ivory-100"
            >
                <ChevronDown aria-hidden className={`size-4 transition-transform duration-150 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
                {open ? "Hide details" : "Details"}
                <span className="sr-only"> for {fullName}</span>
            </button>
            <div id={panel} role="region" aria-label={`Details for ${fullName}`} inert={!open} className={`grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                    <dl className="m-0 grid gap-x-8 gap-y-3 pb-4 text-nv-small sm:grid-cols-4">
                        <div className="sm:col-span-4">
                            <dt className="nv-eyebrow">Description</dt>
                            <dd className="m-0 text-pretty text-nv-ivory-100">{description || "No description"}</dd>
                        </div>
                        <div>
                            <dt className="nv-eyebrow">Language</dt>
                            <dd className="m-0 text-nv-ivory-100">{language ?? "Not reported"}</dd>
                        </div>
                        <div>
                            <dt className="nv-eyebrow">Stars</dt>
                            <dd className="nv-num m-0 text-nv-ivory-100">{stars.toLocaleString()}</dd>
                        </div>
                        <div>
                            <dt className="nv-eyebrow">Forks</dt>
                            <dd className="nv-num m-0 text-nv-ivory-100">{forks.toLocaleString()}</dd>
                        </div>
                        <div>
                            <dt className="nv-eyebrow">Last updated</dt>
                            <dd className="m-0 text-nv-ivory-100">{Number.isNaN(updated.getTime()) ? "Unknown" : updated.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</dd>
                        </div>
                        <div className="sm:col-span-4">
                            <Link href={`/chat?q=${encodeURIComponent(fullName)}`} className="text-nv-copper-400 underline underline-offset-2">
                                Open {fullName} in chat
                            </Link>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    );
}
