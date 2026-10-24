import type { ReactNode } from "react";

/** Shared page hierarchy for every dashboard view. */
export default function PageHeader({
    eyebrow,
    title,
    description,
    actions,
}: {
    eyebrow: string;
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
}) {
    return (
        <header className="relative flex flex-col gap-6 rounded-3xl border border-nv-graphite-700 bg-nv-graphite-900 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
            <div className="min-w-0">
                <p className="mb-3 inline-flex items-center rounded-full bg-nv-copper-wash px-3 py-1 text-xs font-medium text-nv-copper-400">{eyebrow}</p>
                <h1 className="nv-display mt-2 text-nv-display-md tracking-[-0.045em] text-balance text-nv-ivory-50">{title}</h1>
                {description && <p className="mt-3 max-w-[var(--nv-measure)] text-nv-body text-pretty text-nv-ivory-200">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </header>
    );
}
