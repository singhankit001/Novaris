import { NextRequest, NextResponse } from "next/server";
import { trackAuthenticatedQueryEvent, trackEvent } from "@/lib/analytics";
import { auth } from "@/lib/auth";
import {
    acquireRunLock,
    releaseRunLock,
    reserveToolBudget,
    type CacheAudience,
    type ToolBudgetReservation,
    type ToolBudgetScope,
} from "@/lib/cache";
import {
    ANON_COOKIE_NAME,
    getAnonymousActorId,
    getAnonymousCookieIdFromActorId,
    getAnonymousNetworkId,
    isValidAnonymousCookieId,
} from "@/lib/actor-id";
import { enforceRateLimit, RATE_LIMIT_CHAT } from "@/lib/rate-limit";
import { bodyStatus, readJsonBody, validationResponse, type Validation } from "@/lib/request-validation";
import { getInvalidSessionApiError, getSessionAuthState, getSessionUserId } from "@/lib/session-guard";
import { toSafeStreamError, type SafeStreamError, type StreamUpdate } from "@/lib/streaming-types";
import { prisma } from "@/lib/db";
import type { ModelPreference } from "@/lib/ai-client";
import { normalizeModelPreference, resolveVisualModelPreference } from "@/lib/visual-intent";

/**
 * Shared request lifecycle for POST /api/chat/repo and /api/chat/profile.
 * Protocol and policies: docs/STREAM-PROTOCOL.md.
 */

export interface ChatInputBase {
    query: string;
    modelPreference: unknown;
    runId: string | null;
}

export interface ChatGenerateContext {
    audience: CacheAudience;
    actorId: string;
    modelPreference: ModelPreference;
    disableToolCalls: boolean;
}

export interface ChatRouteConfig<T extends ChatInputBase> {
    scope: ToolBudgetScope;
    label: string;
    bodyLimit: number;
    validate: (body: unknown) => Validation<T>;
    /** Extra access gates (premium modes) evaluated server-side after validation. */
    gate?: (input: T, userId: string | null) => NextResponse | null;
    generate: (input: T, ctx: ChatGenerateContext) => AsyncGenerator<StreamUpdate>;
    logContext: (input: T) => Record<string, unknown>;
}

function errorCodeOf(error: unknown): string | undefined {
    if (!error || typeof error !== "object") return undefined;
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
}

function safeErrorResponse(error: SafeStreamError): NextResponse {
    const status = error.code === "STORAGE_UNAVAILABLE" || error.code === "AI_UNAVAILABLE" ? 503 : 500;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
}

async function settleRun(runId: string | null, data: Record<string, unknown>, label: string): Promise<boolean> {
    if (!runId) return true;
    try {
        await prisma.chatRun.update({ where: { id: runId }, data });
        return true;
    } catch (error) {
        console.error(`${label}: run persistence failed`, { runId, error });
        return false;
    }
}

export async function handleChatRequest<T extends ChatInputBase>(
    req: NextRequest,
    config: ChatRouteConfig<T>
): Promise<Response> {
    const encoder = new TextEncoder();
    try {
        const session = await auth();
        if (getSessionAuthState(session) === "invalid") {
            return NextResponse.json(getInvalidSessionApiError(), { status: 401 });
        }

        const userId = getSessionUserId(session);
        const audience: CacheAudience = userId ? "authenticated" : "anonymous";
        const anonCookieValue = req.cookies.get(ANON_COOKIE_NAME)?.value ?? null;
        const validAnonCookie = isValidAnonymousCookieId(anonCookieValue) ? anonCookieValue : null;
        const actorId = userId ?? getAnonymousActorId(req.headers, validAnonCookie);
        const anonCookieIdToSet = !userId && !validAnonCookie ? getAnonymousCookieIdFromActorId(actorId) : null;

        const limited = await enforceRateLimit(req.headers, actorId, RATE_LIMIT_CHAT);
        if (limited) return limited;

        const raw = await readJsonBody(req, config.bodyLimit);
        if (!raw.ok) return validationResponse(raw, bodyStatus(raw.code));
        const parsed = config.validate(raw.value);
        if (!parsed.ok) return validationResponse(parsed);
        const input = parsed.value;

        const requestedModelPreference = normalizeModelPreference(input.modelPreference) as ModelPreference;
        if (requestedModelPreference === "thinking" && !userId) {
            return NextResponse.json(
                { error: "Login required for Thinking mode.", code: "LOGIN_REQUIRED_THINKING_MODE" },
                { status: 401 }
            );
        }
        const gated = config.gate?.(input, userId);
        if (gated) return gated;
        const visualRouting = resolveVisualModelPreference(requestedModelPreference, input.query, Boolean(userId));

        // Run ownership: only the actor that created the run may write to it.
        const runId = input.runId;
        if (runId) {
            const run = await prisma.chatRun.findFirst({
                where: { id: runId, actorId },
                select: { id: true, status: true },
            });
            if (!run) return NextResponse.json({ error: "Invalid runId", code: "RUN_NOT_FOUND" }, { status: 403 });
            if (run.status === "COMPLETED") {
                return NextResponse.json(
                    { error: "This run already completed. Fetch its result instead.", code: "RUN_ALREADY_COMPLETED" },
                    { status: 409 }
                );
            }
        }

        // Missing AI configuration: fail fast, settle the run, charge nothing.
        if (!process.env.GEMINI_API_KEY) {
            console.error(`${config.label}: GEMINI_API_KEY is not set`);
            const safe = toSafeStreamError(null, "AI_UNAVAILABLE");
            await settleRun(runId, { status: "FAILED", errorMessage: `${safe.code}: ${safe.message}` }, config.label);
            return safeErrorResponse(safe);
        }

        // Duplicate POSTs for one run must not generate or persist twice.
        let lockHeld = false;
        if (runId) {
            if (!(await acquireRunLock(runId))) {
                return NextResponse.json(
                    { error: "This request is already being processed.", code: "RUN_IN_PROGRESS" },
                    { status: 409 }
                );
            }
            lockHeld = true;
        }

        // Reserve tool budget atomically. Anonymous callers are limited by cookie actor AND network.
        const budgetActors = userId ? [userId] : [actorId, getAnonymousNetworkId(req.headers)];
        let reservation: ToolBudgetReservation;
        try {
            reservation = await reserveToolBudget(config.scope, audience, budgetActors);
        } catch (error) {
            console.error(`${config.label}: budget reservation threw`, error);
            reservation = { status: "unavailable" };
        }
        const disableToolCalls = reservation.status !== "granted";

        const userAgent = req.headers.get("user-agent") ?? "";
        const country = req.headers.get("x-vercel-ip-country") ?? "Unknown";
        const device = /mobile/i.test(userAgent) ? "mobile" : "desktop";
        try {
            if (userId) {
                await trackAuthenticatedQueryEvent(userId, {
                    anonId: validAnonCookie ? `anon_${validAnonCookie}` : undefined,
                    country,
                    device,
                    userAgent,
                });
            } else {
                await trackEvent(actorId, "query", { country, device, userAgent });
            }
        } catch (error) {
            console.warn(`${config.label}: analytics failed (ignored)`, error);
        }

        const logContext = { ...config.logContext(input), queryPreview: input.query.slice(0, 160) };

        const stream = new ReadableStream({
            async start(controller) {
                let closed = false;
                const send = (payload: StreamUpdate) => {
                    if (closed) return;
                    try {
                        controller.enqueue(encoder.encode(JSON.stringify(payload) + "\n"));
                    } catch {
                        // Client disconnected. Policy: generation continues and the run is persisted.
                    }
                };

                let toolUnits = 0;
                let contentText = "";
                let lastPersistAt = 0;
                const persistEveryMs = 400;
                let outcome: "completed" | "failed" | null = null;
                let pendingError: SafeStreamError | null = null;
                let generator: AsyncGenerator<StreamUpdate> | undefined;

                const failRun = async (safe: SafeStreamError) => {
                    outcome = "failed";
                    pendingError = safe;
                    await settleRun(
                        runId,
                        { partialText: contentText, status: "FAILED", errorMessage: `${safe.code}: ${safe.message}` },
                        config.label
                    );
                };

                try {
                    if (visualRouting.autoPromotedToThinking) {
                        send({ type: "status", message: "Detected visual request. Using high-detail diagram mode.", progress: 18 });
                    } else if (visualRouting.fellBackToFlashForAnonymous) {
                        send({ type: "status", message: "Sign in to unlock higher-detail diagram mode. Continuing in Flash mode.", progress: 18 });
                    }
                    if (reservation.status === "unavailable") {
                        send({
                            type: "status",
                            message: "Tools are temporarily unavailable. Answering without them.",
                            progress: 19,
                            code: "TOOLS_UNAVAILABLE",
                        });
                    }

                    generator = config.generate(input, {
                        audience,
                        actorId,
                        modelPreference: visualRouting.effectiveModelPreference,
                        disableToolCalls,
                    });

                    for await (const chunk of generator) {
                        if (chunk.type === "tool" && chunk.billable !== false && chunk.name !== "googleSearch") {
                            toolUnits += Math.max(1, chunk.usageUnits ?? 1);
                        }
                        if (chunk.type === "content") {
                            contentText = !contentText && chunk.text ? chunk.text.trimStart() : contentText + chunk.text;
                            const now = Date.now();
                            if (runId && now - lastPersistAt >= persistEveryMs) {
                                lastPersistAt = now;
                                const ok = await settleRun(runId, { partialText: contentText, status: "RUNNING" }, config.label);
                                if (!ok) {
                                    await failRun(toSafeStreamError(null, "STORAGE_UNAVAILABLE"));
                                    break;
                                }
                            }
                            send(chunk);
                        } else if (chunk.type === "error") {
                            console.error(`${config.label}: generator reported error`, { ...logContext, upstream: chunk });
                            await failRun(toSafeStreamError(chunk.message, chunk.code));
                            break;
                        } else if (chunk.type === "complete") {
                            const ok = await settleRun(
                                runId,
                                { partialText: contentText, finalText: contentText, status: "COMPLETED" },
                                config.label
                            );
                            if (!ok) {
                                await failRun(toSafeStreamError(null, "STORAGE_UNAVAILABLE"));
                                break;
                            }
                            outcome = "completed";
                            send(chunk);
                            break; // exactly one terminal chunk; anything after it is dropped
                        } else {
                            send(chunk);
                        }
                    }
                    if (!outcome) {
                        await failRun(toSafeStreamError(null, "STREAM_TRUNCATED"));
                    }
                } catch (error: unknown) {
                    console.error(`${config.label}: stream generation error`, { ...logContext, error });
                    await failRun(toSafeStreamError(error, errorCodeOf(error)));
                } finally {
                    if (pendingError) {
                        const { code, message } = pendingError as SafeStreamError;
                        send({ type: "error", code, message });
                    }
                    try {
                        await generator?.return(undefined);
                    } catch {
                        // generator already finished or failed
                    }
                    if (reservation.status === "granted") {
                        try {
                            await reservation.settle(toolUnits, outcome === "completed");
                        } catch (error) {
                            console.error(`${config.label}: budget settle failed`, error);
                        }
                    }
                    if (lockHeld && runId) await releaseRunLock(runId);
                    closed = true;
                    try {
                        controller.close();
                    } catch {
                        // already closed by the runtime
                    }
                }
            },
        });

        const response = new NextResponse(stream, {
            headers: {
                "Content-Type": "application/x-ndjson; charset=utf-8",
                "Cache-Control": "no-cache, no-transform",
                "X-Accel-Buffering": "no",
            },
        });
        if (anonCookieIdToSet) {
            response.cookies.set({
                name: ANON_COOKIE_NAME,
                value: anonCookieIdToSet,
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
                maxAge: 60 * 60 * 24 * 365,
            });
        }
        return response;
    } catch (error: unknown) {
        console.error(`${config.label}: route error`, { path: req.nextUrl.pathname, error });
        return safeErrorResponse(toSafeStreamError(error, errorCodeOf(error)));
    }
}
