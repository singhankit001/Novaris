import { IndeterminateProgress } from "@/components/nv/skeleton";

interface StreamStatusProps {
    message?: string;
    isStreaming: boolean;
}

/** Phase label from the latest real `status` or `tool` chunk. Never a percentage. */
export function StreamStatus({ message, isStreaming }: StreamStatusProps) {
    if (!isStreaming || !message) return null;
    const normalized = message.trim();
    return (
        <div className="not-prose flex w-full max-w-full items-start gap-2 text-nv-small text-nv-ivory-200 [overflow-wrap:anywhere]">
            <div className="min-w-0 flex-1">
                <IndeterminateProgress label="Analysis in progress" phase={normalized} />
            </div>
        </div>
    );
}
