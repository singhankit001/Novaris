import { NextResponse } from "next/server";

/**
 * Server-side request validation for the chat routes. No schema library: the payloads are small
 * and flat, and every violation maps to one stable `code` the client can show.
 */

export const GITHUB_NAME_PATTERN = /^[A-Za-z0-9_.-]{1,100}$/;
export const MAX_QUERY_LENGTH = 4000;
export const MAX_HISTORY_TURNS = 40;
export const MAX_HISTORY_CONTENT_LENGTH = 20_000;
export const MAX_FILE_PATHS = 5000;
export const MAX_FILE_PATH_LENGTH = 512;
export const MAX_FILE_SHA_LENGTH = 128;
export const MAX_ID_LENGTH = 128;
export const MAX_CONVERSATION_MESSAGES = 500;
export const MAX_CONVERSATION_BYTES = 1_000_000;

export const BODY_LIMIT_REPO_CHAT = 4_000_000;
export const BODY_LIMIT_PROFILE_CHAT = 2_000_000;
export const BODY_LIMIT_RUN = 8_000;
export const BODY_LIMIT_CONVERSATION = 1_500_000;

export type Validation<T> = { ok: true; value: T } | { ok: false; code: string; message: string };

function fail(code: string, message: string): { ok: false; code: string; message: string } {
    return { ok: false, code, message };
}

export function validationResponse(failure: { code: string; message: string }, status = 400): NextResponse {
    return NextResponse.json({ error: failure.message, code: failure.code }, { status });
}

export function isGithubName(value: unknown): value is string {
    return typeof value === "string" && GITHUB_NAME_PATTERN.test(value) && value !== "." && value !== "..";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Read and parse a JSON body, rejecting oversized payloads before and after buffering. */
export async function readJsonBody(req: Request, maxBytes: number): Promise<Validation<unknown>> {
    const declared = Number(req.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > maxBytes) {
        return fail("PAYLOAD_TOO_LARGE", "Request is too large.");
    }
    let text: string;
    try {
        text = await req.text();
    } catch {
        return fail("INVALID_JSON", "Request body could not be read.");
    }
    if (text.length > maxBytes) {
        return fail("PAYLOAD_TOO_LARGE", "Request is too large.");
    }
    try {
        return { ok: true, value: JSON.parse(text) as unknown };
    } catch {
        return fail("INVALID_JSON", "Request body is not valid JSON.");
    }
}

export function bodyStatus(code: string): number {
    return code === "PAYLOAD_TOO_LARGE" ? 413 : 400;
}

function validateQuery(value: unknown): Validation<string> {
    if (typeof value !== "string" || !value.trim()) return fail("QUERY_REQUIRED", "A question is required.");
    if (value.length > MAX_QUERY_LENGTH) {
        return fail("QUERY_TOO_LONG", `Questions are limited to ${MAX_QUERY_LENGTH} characters.`);
    }
    return { ok: true, value };
}

export interface HistoryTurn {
    role: "user" | "model";
    content: string;
}

function validateHistory(value: unknown): Validation<HistoryTurn[]> {
    if (value === undefined || value === null) return { ok: true, value: [] };
    if (!Array.isArray(value)) return fail("HISTORY_INVALID", "History must be a list of turns.");
    if (value.length > MAX_HISTORY_TURNS) {
        return fail("HISTORY_TOO_LONG", `History is limited to ${MAX_HISTORY_TURNS} turns.`);
    }
    const turns: HistoryTurn[] = [];
    for (const turn of value) {
        if (!isPlainObject(turn) || (turn.role !== "user" && turn.role !== "model") || typeof turn.content !== "string") {
            return fail("HISTORY_INVALID", "Each history turn needs a role and text content.");
        }
        if (turn.content.length > MAX_HISTORY_CONTENT_LENGTH) {
            return fail("HISTORY_TURN_TOO_LONG", `History turns are limited to ${MAX_HISTORY_CONTENT_LENGTH} characters.`);
        }
        turns.push({ role: turn.role, content: turn.content });
    }
    return { ok: true, value: turns };
}

function validateOptionalId(value: unknown, code: string): Validation<string | null> {
    if (value === undefined || value === null || value === "") return { ok: true, value: null };
    if (typeof value !== "string" || value.trim().length === 0 || value.length > MAX_ID_LENGTH) {
        return fail(code, "Identifier is invalid.");
    }
    return { ok: true, value: value.trim() };
}

function validateFilePaths(value: unknown): Validation<string[]> {
    if (value === undefined || value === null) return { ok: true, value: [] };
    if (!Array.isArray(value)) return fail("FILE_PATHS_INVALID", "File paths must be a list.");
    if (value.length > MAX_FILE_PATHS) {
        return fail("FILE_PATHS_TOO_MANY", `At most ${MAX_FILE_PATHS} file paths are accepted.`);
    }
    for (const path of value) {
        if (typeof path !== "string" || path.length === 0 || path.length > MAX_FILE_PATH_LENGTH) {
            return fail("FILE_PATHS_INVALID", `File paths must be text up to ${MAX_FILE_PATH_LENGTH} characters.`);
        }
    }
    return { ok: true, value: value as string[] };
}

function validateFileShas(value: unknown): Validation<Record<string, string> | undefined> {
    if (value === undefined || value === null) return { ok: true, value: undefined };
    if (!isPlainObject(value)) return fail("FILE_SHAS_INVALID", "File hashes must be an object.");
    const entries = Object.entries(value);
    if (entries.length > MAX_FILE_PATHS) {
        return fail("FILE_SHAS_TOO_MANY", `At most ${MAX_FILE_PATHS} file hashes are accepted.`);
    }
    const normalized: Record<string, string> = {};
    for (const [path, sha] of entries) {
        if (path.length > MAX_FILE_PATH_LENGTH || typeof sha !== "string" || sha.length > MAX_FILE_SHA_LENGTH) {
            return fail("FILE_SHAS_INVALID", "File hashes must map paths to short text values.");
        }
        if (sha.length > 0) normalized[path] = sha;
    }
    return { ok: true, value: normalized };
}

export interface RepoChatInput {
    query: string;
    repoDetails: { owner: string; repo: string };
    filePaths: string[];
    fileShas: Record<string, string> | undefined;
    history: HistoryTurn[];
    profileData: Record<string, unknown> | undefined;
    modelPreference: unknown;
    runId: string | null;
}

export function validateRepoChatBody(body: unknown): Validation<RepoChatInput> {
    if (!isPlainObject(body)) return fail("BODY_INVALID", "Request body must be a JSON object.");
    const query = validateQuery(body.query);
    if (!query.ok) return query;
    const details = body.repoDetails;
    if (!isPlainObject(details) || !isGithubName(details.owner) || !isGithubName(details.repo)) {
        return fail("REPO_INVALID", "Repository owner and name are invalid.");
    }
    const filePaths = validateFilePaths(body.filePaths);
    if (!filePaths.ok) return filePaths;
    const fileShas = validateFileShas(body.fileShas);
    if (!fileShas.ok) return fileShas;
    const history = validateHistory(body.history);
    if (!history.ok) return history;
    const runId = validateOptionalId(body.runId, "RUN_ID_INVALID");
    if (!runId.ok) return runId;
    if (body.profileData !== undefined && body.profileData !== null && !isPlainObject(body.profileData)) {
        return fail("PROFILE_INVALID", "Profile data must be an object.");
    }
    return {
        ok: true,
        value: {
            query: query.value,
            repoDetails: { owner: details.owner, repo: details.repo },
            filePaths: filePaths.value,
            fileShas: fileShas.value,
            history: history.value,
            profileData: isPlainObject(body.profileData) ? body.profileData : undefined,
            modelPreference: body.modelPreference,
            runId: runId.value,
        },
    };
}

export interface ProfileChatInput {
    query: string;
    profileContext: Record<string, unknown> & { username: string };
    history: HistoryTurn[];
    crossRepoEnabled: boolean;
    modelPreference: unknown;
    runId: string | null;
}

export function validateProfileChatBody(body: unknown): Validation<ProfileChatInput> {
    if (!isPlainObject(body)) return fail("BODY_INVALID", "Request body must be a JSON object.");
    const query = validateQuery(body.query);
    if (!query.ok) return query;
    const context = body.profileContext;
    if (!isPlainObject(context) || !isGithubName(context.username)) {
        return fail("USERNAME_INVALID", "GitHub username is invalid.");
    }
    const history = validateHistory(body.history);
    if (!history.ok) return history;
    const runId = validateOptionalId(body.runId, "RUN_ID_INVALID");
    if (!runId.ok) return runId;
    return {
        ok: true,
        value: {
            query: query.value,
            profileContext: context as ProfileChatInput["profileContext"],
            history: history.value,
            crossRepoEnabled: body.crossRepoEnabled === true,
            modelPreference: body.modelPreference,
            runId: runId.value,
        },
    };
}

export interface RunInput {
    scope: "repo" | "profile";
    owner: string | null;
    repo: string | null;
    username: string | null;
    clientRequestId: string;
}

export function validateRunBody(body: unknown): Validation<RunInput> {
    if (!isPlainObject(body)) return fail("BODY_INVALID", "Request body must be a JSON object.");
    if (body.scope !== "repo" && body.scope !== "profile") return fail("SCOPE_INVALID", "Scope must be repo or profile.");
    const clientRequestId = body.clientRequestId;
    if (typeof clientRequestId !== "string" || !clientRequestId.trim() || clientRequestId.length > MAX_ID_LENGTH) {
        return fail("CLIENT_REQUEST_ID_INVALID", `clientRequestId must be 1 to ${MAX_ID_LENGTH} characters.`);
    }
    if (body.scope === "repo") {
        if (!isGithubName(body.owner) || !isGithubName(body.repo)) {
            return fail("REPO_INVALID", "Repository owner and name are invalid.");
        }
        return { ok: true, value: { scope: "repo", owner: body.owner, repo: body.repo, username: null, clientRequestId } };
    }
    if (!isGithubName(body.username)) return fail("USERNAME_INVALID", "GitHub username is invalid.");
    return { ok: true, value: { scope: "profile", owner: null, repo: null, username: body.username, clientRequestId } };
}

/** Conversation identity for GET/POST/DELETE /api/chat. Null values are treated as absent. */
export function validateConversationParams(
    owner: unknown,
    repo: unknown,
    username: unknown
): Validation<{ owner: string; repo: string; username: null } | { owner: null; repo: null; username: string }> {
    const has = (value: unknown) => value !== undefined && value !== null && value !== "";
    if (has(owner) || has(repo)) {
        if (!isGithubName(owner) || !isGithubName(repo)) return fail("REPO_INVALID", "Repository owner and name are invalid.");
        return { ok: true, value: { owner, repo, username: null } };
    }
    if (has(username)) {
        if (!isGithubName(username)) return fail("USERNAME_INVALID", "GitHub username is invalid.");
        return { ok: true, value: { owner: null, repo: null, username } };
    }
    return fail("CONVERSATION_REQUIRED", "Missing repository or profile parameters");
}

export function validateConversationMessages(messages: unknown): Validation<unknown[]> {
    if (messages === undefined || messages === null) return { ok: true, value: [] };
    if (!Array.isArray(messages)) return fail("MESSAGES_INVALID", "Messages must be a list.");
    if (messages.length > MAX_CONVERSATION_MESSAGES) {
        return fail("MESSAGES_TOO_MANY", `At most ${MAX_CONVERSATION_MESSAGES} messages are stored per conversation.`);
    }
    if (!messages.every(isPlainObject)) return fail("MESSAGES_INVALID", "Each message must be an object.");
    if (Buffer.byteLength(JSON.stringify(messages), "utf8") > MAX_CONVERSATION_BYTES) {
        return fail("MESSAGES_TOO_LARGE", "This conversation is too large to save.");
    }
    return { ok: true, value: messages };
}

/** Throwing guards for server actions, which have no HTTP response to carry a code. */
export function assertGithubName(value: unknown, label: string): asserts value is string {
    if (!isGithubName(value)) throw new Error(`Invalid ${label}.`);
}

export function assertMaxLength(value: unknown, max: number, label: string): asserts value is string {
    if (typeof value !== "string" || value.length > max) throw new Error(`${label} must be text up to ${max} characters.`);
}
