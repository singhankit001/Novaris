import { NextRequest, NextResponse } from "next/server";
import { INVALID_SESSION_REDIRECT_PATH } from "@/lib/session-guard";

const AUTH_COOKIE_PREFIXES = [
    "authjs.",
    "__Secure-authjs.",
    "next-auth.",
    "__Secure-next-auth.",
];

function getSafeCallbackUrl(rawValue: string | null, requestUrl: string): URL {
    const fallback = new URL(INVALID_SESSION_REDIRECT_PATH, requestUrl);
    if (!rawValue || !rawValue.startsWith("/")) {
        return fallback;
    }

    // "//host" and "/\host" are protocol-relative; resolving and comparing origins rejects them.
    const target = new URL(rawValue, requestUrl);
    return target.origin === fallback.origin ? target : fallback;
}

export async function GET(request: NextRequest) {
    const callbackUrl = getSafeCallbackUrl(request.nextUrl.searchParams.get("callbackUrl"), request.url);
    const response = NextResponse.redirect(callbackUrl);

    for (const cookie of request.cookies.getAll()) {
        if (!AUTH_COOKIE_PREFIXES.some((prefix) => cookie.name.startsWith(prefix))) {
            continue;
        }

        response.cookies.set({
            name: cookie.name,
            value: "",
            path: "/",
            httpOnly: true,
            expires: new Date(0),
            maxAge: 0,
            secure: cookie.name.startsWith("__Secure-"),
        });
    }

    return response;
}
