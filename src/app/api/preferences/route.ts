import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getInvalidSessionApiError, getSessionAuthState, getSessionUserId } from "@/lib/session-guard";
import { getPreferences, parsePreferencesUpdate, savePreferences } from "@/lib/preferences";

async function requireUserId(): Promise<{ userId: string } | { response: NextResponse }> {
    const session = await auth();
    const authState = getSessionAuthState(session);
    if (authState === "unauthenticated") {
        return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    const userId = getSessionUserId(session);
    if (authState === "invalid" || !userId) {
        return { response: NextResponse.json(getInvalidSessionApiError(), { status: 401 }) };
    }
    return { userId };
}

export async function GET() {
    const actor = await requireUserId();
    if ("response" in actor) return actor.response;
    try {
        return NextResponse.json({ preferences: await getPreferences(actor.userId) });
    } catch {
        return NextResponse.json({ error: "Failed to load preferences" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const actor = await requireUserId();
    if ("response" in actor) return actor.response;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Body must be valid JSON." }, { status: 400 });
    }
    const parsed = parsePreferencesUpdate(body);
    if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    try {
        return NextResponse.json({ preferences: await savePreferences(actor.userId, parsed.value) });
    } catch {
        return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
    }
}
