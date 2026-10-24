import { MetadataRoute } from "next";
import { getCanonicalSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
    const baseUrl = getCanonicalSiteUrl();

    return {
        rules: {
            userAgent: "*",
            // Badges and stat cards are embedded in external READMEs.
            allow: ["/", "/api/badge/", "/api/stats/"],
            // Signed-in, admin and API surfaces have nothing to index; shared reports are noindex too.
            disallow: ["/api/", "/admin", "/dashboard", "/report/", "/design-system"],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
        host: baseUrl,
    };
}
