import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StreamStatus } from "@/components/chat/StreamStatus";

describe("StreamStatus", () => {
    it("shows the real phase label in a progressbar with wrap-safe text and no percentage", () => {
        const html = renderToStaticMarkup(
            <StreamStatus
                isStreaming={true}
                message="Calling veryLongToolName.with.deep.parameters(and_more_details_that_should_wrap_on_mobile_without_overflow)"
            />
        );

        expect(html).toContain('role="progressbar"');
        expect(html).toContain("veryLongToolName.with.deep.parameters");
        expect(html).toContain("[overflow-wrap:anywhere]");
        expect(html).not.toContain("truncate");
        expect(html).not.toMatch(/\d+\s*%/);
    });

    it("renders nothing when not streaming", () => {
        const html = renderToStaticMarkup(<StreamStatus isStreaming={false} message="Working..." />);
        expect(html).toBe("");
    });
});
