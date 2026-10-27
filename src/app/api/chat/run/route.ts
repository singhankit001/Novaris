import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ANON_COOKIE_NAME, getAnonymousActorId } from "@/lib/actor-id";
import { BODY_LIMIT_RUN, MAX_ID_LENGTH, bodyStatus, readJsonBody, validateRunBody, validationResponse } from "@/lib/request-validation";
import { getInvalidSessionApiError, getSessionAuthState, getSessionUserId } from "@/lib/session-guard";

const STORAGE_DOWN = { error: "Storage is temporarily unavailable. Please try again shortly.", code: "STORAGE_UNAVAILABLE" };

function isUniqueViolation(error: unknown): boolean {
    return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}

/** errorMessage is stored as "CODE: message"; split it so clients get a stable code field. */
function splitStoredError(stored: string | null): { errorCode: string | null; errorMessage: string | null } {
    if (!stored) return { errorCode: null, errorMessage: null };
    const match = /^([A-Z_]+): ([\s\S]*)$/.exec(stored);
    return match ? { errorCode: match[1], errorMessage: match[2] } : { errorCode: null, errorMessage: stored };
}

export async function POST(req: NextRequest) {
    const session = await auth();
    const authState = getSessionAuthState(session);
    if (authState === "invalid") {
        return NextResponse.json(getInvalidSessionApiError(), { status: 401 });
    }

    const userId = getSessionUserId(session);
    const anonCookieId = req.cookies.get(ANON_COOKIE_NAME)?.value ?? null;
    const actorId = userId ?? getAnonymousActorId(req.headers, anonCookieId);

    const raw = await readJsonBody(req, BODY_LIMIT_RUN);
    if (!raw.ok) return validationResponse(raw, bodyStatus(raw.code));
    const parsed = validateRunBody(raw.value);
    if (!parsed.ok) return validationResponse(parsed);
    const { scope, owner, repo, username, clientRequestId } = parsed.value;
    const conversationKey = scope === "repo" ? `repo:${owner}:${repo}` : `profile:${username}`;

    const lookup = {
        actorId_conversationKey_clientRequestId: { actorId, conversationKey, clientRequestId },
    };
    const select = { id: true, status: true, partialText: true, finalText: true } as const;

    try {
        // Idempotent by (actor, conversation, clientRequestId): a retry returns the existing run.
        let existing = await prisma.chatRun.findUnique({ where: lookup, select });
        if (!existing) {
            try {
                const run = await prisma.chatRun.create({
                    data: {
                        actorId,
                        userId: userId ?? null,
                        conversationKey,
                        scope,
                        owner,
                        repo,
                        username,
                        clientRequestId,
                        status: "RUNNING",
                        partialText: "",
                    },
                    select: { id: true },
                });
                return NextResponse.json({ runId: run.id, status: "RUNNING", partialText: "", finalText: null });
            } catch (error) {
                // Two concurrent creates: the loser reads the winner's row.
                if (!isUniqueViolation(error)) throw error;
                existing = await prisma.chatRun.findUnique({ where: lookup, select });
                if (!existing) throw error;
            }
        }
        return NextResponse.json({
            runId: existing.id,
            status: existing.status,
            partialText: existing.partialText,
            finalText: existing.finalText,
        });
    } catch (error) {
        console.error("Chat run create failed:", error);
        return NextResponse.json(STORAGE_DOWN, { status: 503 });
    }
}

export async function GET(req: NextRequest) {
    const session = await auth();
    const authState = getSessionAuthState(session);
    if (authState === "invalid") {
        return NextResponse.json(getInvalidSessionApiError(), { status: 401 });
    }

    const userId = getSessionUserId(session);
    const anonCookieId = req.cookies.get(ANON_COOKIE_NAME)?.value ?? null;
    const actorId = userId ?? getAnonymousActorId(req.headers, anonCookieId);

    const { searchParams } = new URL(req.url);
    const runId = searchParams.get("runId") ?? "";
    if (!runId.trim() || runId.length > MAX_ID_LENGTH) {
        return NextResponse.json({ error: "Missing or invalid runId", code: "RUN_ID_INVALID" }, { status: 400 });
    }

    let run;
    try {
        run = await prisma.chatRun.findFirst({
            where: { id: runId, actorId },
            select: {
                id: true,
                status: true,
                partialText: true,
                finalText: true,
                errorMessage: true,
                updatedAt: true,
            },
        });
    } catch (error) {
        console.error("Chat run read failed:", error);
        return NextResponse.json(STORAGE_DOWN, { status: 503 });
    }

    if (!run) {
        return NextResponse.json({ error: "Not found", code: "RUN_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({
        runId: run.id,
        status: run.status,
        partialText: run.partialText,
        finalText: run.finalText,
        ...splitStoredError(run.errorMessage),
        updatedAt: run.updatedAt.toISOString(),
    });
}
