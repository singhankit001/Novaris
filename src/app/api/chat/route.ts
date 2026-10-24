import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import {
    BODY_LIMIT_CONVERSATION,
    bodyStatus,
    readJsonBody,
    validateConversationMessages,
    validateConversationParams,
    validationResponse,
    type Validation,
} from "@/lib/request-validation";
import { getInvalidSessionApiError, getSessionAuthState, getSessionUserId } from "@/lib/session-guard";

type ConversationParams =
    | { scope: "repo"; conversationKey: string; owner: string; repo: string; username: null }
    | { scope: "profile"; conversationKey: string; owner: null; repo: null; username: string };

const STORAGE_DOWN = { error: "Storage is temporarily unavailable. Please try again shortly.", code: "STORAGE_UNAVAILABLE" };

function resolveConversation(owner: unknown, repo: unknown, username: unknown): Validation<ConversationParams> {
    const checked = validateConversationParams(owner, repo, username);
    if (!checked.ok) return checked;
    const value = checked.value;
    if (value.owner !== null) {
        return {
            ok: true,
            value: { scope: "repo", conversationKey: `repo:${value.owner}:${value.repo}`, owner: value.owner, repo: value.repo, username: null },
        };
    }
    return {
        ok: true,
        value: { scope: "profile", conversationKey: `profile:${value.username}`, owner: null, repo: null, username: value.username },
    };
}

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        const authState = getSessionAuthState(session);
        if (authState === "unauthenticated") {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (authState === "invalid") {
            return NextResponse.json(getInvalidSessionApiError(), { status: 401 });
        }

        const userId = getSessionUserId(session);
        if (!userId) {
            return NextResponse.json(getInvalidSessionApiError(), { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const owner = searchParams.get('owner');
        const repo = searchParams.get('repo');
        const username = searchParams.get('username');

        const resolved = resolveConversation(owner, repo, username);
        if (!resolved.ok) return validationResponse(resolved);
        const conversation = resolved.value;

        const record = await prisma.chatConversation.findUnique({
            where: {
                userId_conversationKey: {
                    userId,
                    conversationKey: conversation.conversationKey,
                },
            },
            select: { messages: true },
        });

        const messages = Array.isArray(record?.messages) ? record.messages : [];
        return NextResponse.json({ messages });
    } catch (error) {
        console.error('Error fetching chat history:', error);
        return NextResponse.json(STORAGE_DOWN, { status: 503 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        const authState = getSessionAuthState(session);
        if (authState === "unauthenticated") {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (authState === "invalid") {
            return NextResponse.json(getInvalidSessionApiError(), { status: 401 });
        }

        const userId = getSessionUserId(session);
        if (!userId) {
            return NextResponse.json(getInvalidSessionApiError(), { status: 401 });
        }

        const raw = await readJsonBody(req, BODY_LIMIT_CONVERSATION);
        if (!raw.ok) return validationResponse(raw, bodyStatus(raw.code));
        const body = raw.value;
        if (typeof body !== "object" || body === null || Array.isArray(body)) {
            return validationResponse({ code: "BODY_INVALID", message: "Request body must be a JSON object." });
        }
        const { owner, repo, username, messages } = body as Record<string, unknown>;

        const resolved = resolveConversation(owner, repo, username);
        if (!resolved.ok) return validationResponse(resolved);
        const conversation = resolved.value;
        const checkedMessages = validateConversationMessages(messages);
        if (!checkedMessages.ok) return validationResponse(checkedMessages, bodyStatus(checkedMessages.code));

        await prisma.chatConversation.upsert({
            where: {
                userId_conversationKey: {
                    userId,
                    conversationKey: conversation.conversationKey,
                },
            },
            update: {
                scope: conversation.scope,
                owner: conversation.owner,
                repo: conversation.repo,
                username: conversation.username,
                messages: checkedMessages.value as Prisma.InputJsonValue,
            },
            create: {
                userId,
                conversationKey: conversation.conversationKey,
                scope: conversation.scope,
                owner: conversation.owner,
                repo: conversation.repo,
                username: conversation.username,
                messages: checkedMessages.value as Prisma.InputJsonValue,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving chat history:', error);
        return NextResponse.json(STORAGE_DOWN, { status: 503 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await auth();
        const authState = getSessionAuthState(session);
        if (authState === "unauthenticated") {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (authState === "invalid") {
            return NextResponse.json(getInvalidSessionApiError(), { status: 401 });
        }

        const userId = getSessionUserId(session);
        if (!userId) {
            return NextResponse.json(getInvalidSessionApiError(), { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const owner = searchParams.get('owner');
        const repo = searchParams.get('repo');
        const username = searchParams.get('username');

        const resolved = resolveConversation(owner, repo, username);
        if (!resolved.ok) return validationResponse(resolved);
        const conversation = resolved.value;

        await prisma.chatConversation.deleteMany({
            where: {
                userId,
                conversationKey: conversation.conversationKey,
            },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting chat history:', error);
        return NextResponse.json(STORAGE_DOWN, { status: 503 });
    }
}
