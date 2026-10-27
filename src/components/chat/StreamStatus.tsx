import s from "./chat.module.css";

interface StreamStatusProps {
    message?: string;
    isStreaming: boolean;
}

/** Phase label from the latest real `status` or `tool` chunk. Never a percentage. */
export function StreamStatus({ message, isStreaming }: StreamStatusProps) {
    if (!isStreaming || !message) return null;
    const normalized = message.trim();
    return (
        <div
            role="progressbar"
            aria-label="Analysis in progress"
            aria-valuetext={normalized}
            className="not-prose mb-4 flex w-full max-w-full items-start gap-3 text-nv-small text-nv-ivory-200 [overflow-wrap:anywhere]"
        >
            <span aria-hidden className={`${s.orb} mt-0.5 shrink-0`} />
            <span className={`${s.shimmer} min-w-0 flex-1 font-medium leading-[1.4]`}>{normalized}</span>
            <span role="status" aria-live="polite" className="sr-only">{normalized}</span>
        </div>
    );
}
