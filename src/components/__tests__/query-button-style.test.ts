import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ChatInput } from "@/components/ChatInput";

vi.mock("next-auth/react", () => ({ useSession: () => ({ data: null }) }));

function renderComposer(props: Partial<Parameters<typeof ChatInput>[0]> = {}) {
    return renderToStaticMarkup(createElement(ChatInput, {
        value: "",
        onChange: () => undefined,
        onSubmit: () => undefined,
        ...props,
    }));
}

function submitButton(markup: string) {
    return markup.match(/<button[^>]*type="submit"[^>]*>/)?.[0] ?? "";
}

describe("chat composer controls", () => {
    it("disables sending an empty message and enables a question", () => {
        expect(submitButton(renderComposer())).toContain('disabled=""');
        expect(submitButton(renderComposer({ value: "Explain this repository" }))).not.toContain('disabled=""');
    });

    it("prevents duplicate sending while a response is running", () => {
        const html = renderComposer({ value: "Explain this repository", loading: true });
        expect(submitButton(html)).toContain('disabled=""');
        expect(submitButton(html)).toContain('aria-busy="true"');
        expect(html).toContain("Working");
    });

    it("labels the question field and explains a disabled composer", () => {
        const html = renderComposer({ disabled: true, disabledReason: "Choose a repository first" });
        expect(html).toContain("Your question</label>");
        expect(html).toContain("aria-describedby=");
        expect(html).toContain("Choose a repository first");
    });
});
