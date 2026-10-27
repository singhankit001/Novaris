import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import JsonLdScript, { serializeJsonLd } from "@/components/JsonLdScript";

describe("JsonLdScript", () => {
    it("cannot be broken out of by data containing a closing script tag", () => {
        const html = renderToStaticMarkup(<JsonLdScript data={{ headline: "</script><script>alert(1)</script>" }} />);
        expect(html.match(/<\/script>/g)).toHaveLength(1);
        expect(JSON.parse(serializeJsonLd({ headline: "</script>" }))).toEqual({ headline: "</script>" });
    });
});
