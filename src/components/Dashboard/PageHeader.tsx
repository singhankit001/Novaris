import type { ReactNode } from "react";

/** Shared page hierarchy for every dashboard view: editorial headline on the canvas, a signal hairline beneath. */
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
        <header className="relative flex flex-col gap-6 pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <p className="nv-eyebrow mb-4 flex items-center gap-2 !text-nv-copper-400">
                    <span aria-hidden className="size-1.5 rounded-full bg-nv-copper-400 shadow-[0_0_0_3px_rgb(47_84_255/0.16)]" />
                    {eyebrow}
                </p>
                <h1 className="nv-display text-balance text-nv-display-md text-nv-ivory-50">{title}</h1>
                {description && <p className="mt-3 max-w-[var(--nv-measure)] text-pretty text-nv-body text-nv-ivory-200">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-nv-graphite-700" />
            <span aria-hidden className="absolute bottom-0 left-0 h-px w-40 bg-[linear-gradient(90deg,#2f54ff,#7a4dff_55%,transparent)]" />
        </header>
    );
}
