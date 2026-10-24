import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { buttonClasses } from "@/components/nv/button-styles";

interface RepoCardProps {
    name: string;
    owner: string;
    description?: string;
    stars?: number;
    forks?: number;
    language?: string;
}

/** A repository mentioned in an answer. Numbers shown are the ones GitHub returned. */
export function RepoCard({ name, owner, description, stars, forks, language }: RepoCardProps) {
    const facts = [language, stars !== undefined ? `${stars.toLocaleString()} stars` : null, forks !== undefined ? `${forks.toLocaleString()} forks` : null].filter(Boolean);
    return (
        <aside aria-label={`Repository ${owner}/${name}`} className="not-prose my-4 rounded-nv-lg border border-nv-graphite-600 bg-nv-graphite-800 p-5 shadow-[0_8px_26px_-22px_rgba(37,93,76,0.35)]">
            <p className="nv-eyebrow">Repository</p>
            <h3 className="mt-1 break-all font-mono text-nv-body text-nv-ivory-50">{owner}/{name}</h3>
            {description && <p className="mt-2 line-clamp-2 text-nv-small text-nv-ivory-200">{description}</p>}
            {facts.length > 0 && <p className="nv-num mt-2 text-nv-micro text-nv-ivory-300">{facts.join(" · ")}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/chat?q=${encodeURIComponent(`${owner}/${name}`)}`} className={buttonClasses("primary")}>Analyze repository</Link>
                <a href={`https://github.com/${owner}/${name}`} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary")}>
                    GitHub <ExternalLink aria-hidden className="size-4" />
                </a>
            </div>
        </aside>
    );
}
