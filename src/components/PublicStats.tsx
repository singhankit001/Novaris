export type PublicStatsData = {
    totalVisitors: number;
    totalQueries: number;
    totalScans: number;
};

// Floor to a multiple of 5 and mark as a lower bound so the figure never overstates.
export function formatStat(num: number) {
    if (num < 10) return num.toString();
    return `${(Math.floor(num / 5) * 5).toLocaleString()}+`;
}

/**
 * Real usage counters only. Renders nothing when a counter is zero or the source failed (the
 * analytics layer falls back to 0), so an outage never shows as "0 searches".
 */
export default function PublicStats({ stats }: { stats: PublicStatsData }) {
    const items = [
        { label: "Searches run", value: stats.totalQueries },
        { label: "Security scans run", value: stats.totalScans },
    ].filter((item) => Number.isFinite(item.value) && item.value > 0);

    if (items.length === 0) return null;

    return (
        <section aria-labelledby="public-stats-h">
            <h2 id="public-stats-h" className="nv-eyebrow mb-3">
                Usage on this site
            </h2>
            <dl className="m-0 grid grid-cols-2 gap-6">
                {items.map((item) => (
                    <div key={item.label} className="flex flex-col-reverse justify-end">
                        <dt className="text-nv-small text-nv-ivory-200">{item.label}</dt>
                        <dd className="nv-display nv-num m-0 text-nv-display-md text-nv-ivory-50">{formatStat(item.value)}</dd>
                    </div>
                ))}
            </dl>
            <p className="mt-2 text-nv-micro text-nv-ivory-300">Measured · Novaris usage counters, rounded down, refreshed about every 5 minutes.</p>
        </section>
    );
}
