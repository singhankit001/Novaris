/**
 * Unified repository query pipeline — A1, A5, A6
 *
 * Single AsyncGenerator-based pipeline for all repo queries.
 * Both streaming and non-streaming callers run the SAME pipeline:
 *   1. File selection via AI
 *   2. File content fetching with token budget
 *   3. AI response generation (chunked)
 *
 * Accepts an optional `deps` object so unit tests can inject stub
 * implementations without mocking the environment or real API calls.
 */
import { analyzeFileSelection, answerWithContextStream } from "@/lib/gemini";
import { getFileContentBatch, getFileContentBatchWithStats, type FileBatchFetchStats } from "@/lib/github";
import { countTokens, MAX_TOKENS, numberLines } from "@/lib/tokens";

export { numberLines };
import {
    resolveAnonymousConsecutivePaths,
} from "@/lib/cache";
import type { FileCachePolicy } from "@/lib/cache";
import type { StreamUpdate } from "@/lib/streaming-types";
import type { GitHubProfile } from "@/lib/github";
import type { ModelPreference } from "@/lib/ai-client";
import { stripEmojiCharacters } from "@/lib/no-emoji";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface RepoQueryParams {
    query: string;
    owner: string;
    repo: string;
    filePaths: string[];
    fileShas?: Record<string, string>;
    fileCachePolicy?: FileCachePolicy;
    history?: { role: "user" | "model"; content: string }[];
    profileData?: GitHubProfile;
    modelPreference?: ModelPreference;
    disableToolCalls?: boolean;
}

/**
 * Injectable dependencies for the query pipeline.
 * Each field defaults to the real implementation when omitted,
 * making this useful for tests (inject stubs) without affecting production.
 */
export interface QueryPipelineDeps {
    /** Selects relevant files for a query — defaults to AI-based selection */
    analyzeFiles?: (
        query: string,
        filePaths: string[],
        owner: string,
        repo: string,
        modelPreference?: ModelPreference,
        history?: { role: "user" | "model"; content: string }[],
        fileCachePolicy?: FileCachePolicy,
        onSelectionSource?: (source: "indexed_tree" | "agentic_scan") => void
    ) => Promise<string[]>;

    /** Fetches file content in batch — defaults to GitHub API */
    fetchFiles?: (
        owner: string,
        repo: string,
        files: Array<{ path: string; sha?: string }>,
        fileCachePolicy?: FileCachePolicy
    ) => Promise<Array<{ path: string; content: string | null }>>;

    fetchFilesWithStats?: (
        owner: string,
        repo: string,
        files: Array<{ path: string; sha?: string }>,
        fileCachePolicy?: FileCachePolicy
    ) => Promise<{ files: Array<{ path: string; content: string | null }>; stats: FileBatchFetchStats }>;

    /** Streams AI response — defaults to Gemini */
    streamAnswer?: (
        question: string,
        context: string,
        repoDetails: { owner: string; repo: string },
        profileData?: GitHubProfile,
        history?: { role: "user" | "model"; content: string }[],
        modelPreference?: ModelPreference,
        disableToolCalls?: boolean
    ) => AsyncGenerator<string>;
}

function classifyPipelineError(error: unknown): { message: string; code?: string } {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    if (/missing a thought_signature|thought_signature/i.test(message)) {
        return {
            message: "AI tool-call handoff failed while streaming (missing thought signature). Please retry.",
            code: "AI_MISSING_THOUGHT_SIGNATURE",
        };
    }
    if (/function response turn comes immediately after a function call turn/i.test(message)) {
        return {
            message: "AI tool-call handoff failed while streaming. Please retry.",
            code: "AI_FUNCTION_TURN_ORDER",
        };
    }
    return { message };
}

// ─── File Pruning ──────────────────────────────────────────────────────────────

/** Binary/generated files that add noise without value for AI analysis */
const SKIP_PATTERN =
    /(\.(png|jpg|jpeg|gif|svg|ico|lock|pdf|zip|tar|gz|map|wasm|min\.js|min\.css|woff|woff2|ttf|otf|eot)|package-lock\.json|yarn\.lock)$/i;

export function pruneFilePaths(paths: string[]): string[] {
    return paths.filter(
        (p) =>
            !SKIP_PATTERN.test(p) &&
            !p.includes("node_modules/") &&
            !p.includes(".git/")
    );
}

interface FolderNode {
    dirs: Map<string, FolderNode>;
    files: string[];
}

function createFolderNode(): FolderNode {
    return { dirs: new Map(), files: [] };
}

function buildRepoFolderStructure(paths: string[], maxPaths: number = 500, maxLines: number = 220): string {
    const root = createFolderNode();
    const limitedPaths = paths.slice(0, maxPaths);

    for (const rawPath of limitedPaths) {
        const parts = rawPath.split("/").filter(Boolean);
        if (parts.length === 0) continue;

        let node = root;
        for (let i = 0; i < parts.length - 1; i += 1) {
            const segment = parts[i];
            let next = node.dirs.get(segment);
            if (!next) {
                next = createFolderNode();
                node.dirs.set(segment, next);
            }
            node = next;
        }
        node.files.push(parts[parts.length - 1]);
    }

    const lines: string[] = [];
    const render = (node: FolderNode, depth: number) => {
        const indent = "  ".repeat(depth);
        for (const dir of Array.from(node.dirs.keys()).sort()) {
            lines.push(`${indent}- ${dir}/`);
            if (lines.length >= maxLines) return;
            const child = node.dirs.get(dir);
            if (child) {
                render(child, depth + 1);
            }
            if (lines.length >= maxLines) return;
        }
        for (const file of [...node.files].sort()) {
            lines.push(`${indent}- ${file}`);
            if (lines.length >= maxLines) return;
        }
    };

    render(root, 0);

    if (paths.length > maxPaths || lines.length >= maxLines) {
        lines.push("- ... (folder structure truncated)");
    }

    if (lines.length === 0) {
        return "- (No repository files available)";
    }

    return lines.join("\n");
}

// ─── Pipeline ──────────────────────────────────────────────────────────────────

/**
 * Core repository query pipeline as a streaming generator.
 * Yields StreamUpdate events that consumers can forward directly to the client
 * or collect into a single response.
 */
export async function* executeRepoQueryStream(
    params: RepoQueryParams,
    deps: QueryPipelineDeps = {}
): AsyncGenerator<StreamUpdate> {
    const {
        analyzeFiles = analyzeFileSelection,
        fetchFiles = (owner, repo, files, fileCachePolicy) => getFileContentBatch(owner, repo, files, fileCachePolicy),
        fetchFilesWithStats,
        streamAnswer = answerWithContextStream,
    } = deps;

    const { query, owner, repo, filePaths, fileShas, fileCachePolicy, history = [], profileData, modelPreference, disableToolCalls = false } = params;

    try {
        const pipelineStartMs = Date.now();
        let selectionMs = 0;
        let fileFetchMs = 0;
        let contextBuildMs = 0;
        let answerMs = 0;

        // Step 1: Select relevant files
        yield {
            type: "status",
            message: "Selecting files...",
            progress: 15,
        };

        const prunedPaths = pruneFilePaths(filePaths);
        const selectionStartMs = Date.now();
        let selectionStatus: "indexed_tree" | "agentic_scan" | null = null;
        const relevantFiles = await analyzeFiles(
            query,
            prunedPaths,
            owner,
            repo,
            modelPreference,
            history,
            fileCachePolicy,
            (source) => {
                selectionStatus = source;
            }
        );
        selectionMs = Date.now() - selectionStartMs;

        if (selectionStatus) {
            yield {
                type: "status",
                message: selectionStatus === "indexed_tree"
                    ? "Selecting files from indexed tree..."
                    : "Selecting files using agentic scan...",
                progress: 22,
            };
        }

        yield {
            type: "status",
            message: `Selection complete: ${filePaths.length.toLocaleString()} paths -> ${prunedPaths.length.toLocaleString()} candidates -> ${relevantFiles.length} selected.`,
            progress: 28,
        };

        yield { type: "files", files: relevantFiles };
        yield {
            type: "status",
            message: `Reading ${relevantFiles.length} selected file${relevantFiles.length !== 1 ? "s" : ""}...`,
            progress: 40,
        };

        // Step 2: Fetch file content with token budget
        let effectiveFileCachePolicy = fileCachePolicy;
        if (fileCachePolicy?.audience === "anonymous") {
            const consecutivePaths = await resolveAnonymousConsecutivePaths(
                owner,
                repo,
                relevantFiles,
                fileCachePolicy
            );
            effectiveFileCachePolicy = {
                ...fileCachePolicy,
                consecutivePaths,
            };
        }

        const fileTargets = relevantFiles.map((path) => {
            const sha = fileShas?.[path];
            return sha ? { path, sha } : { path };
        });
        const fetchStartMs = Date.now();
        let fileResults: Array<{ path: string; content: string | null }> = [];
        let fetchStats: FileBatchFetchStats | null = null;
        if (fetchFilesWithStats) {
            const fetched = await fetchFilesWithStats(owner, repo, fileTargets, effectiveFileCachePolicy);
            fileResults = fetched.files;
            fetchStats = fetched.stats;
        } else if (!deps.fetchFiles) {
            const fetched = await getFileContentBatchWithStats(owner, repo, fileTargets, effectiveFileCachePolicy);
            fileResults = fetched.files;
            fetchStats = fetched.stats;
        } else {
            fileResults = await fetchFiles(owner, repo, fileTargets, effectiveFileCachePolicy);
        }
        fileFetchMs = Date.now() - fetchStartMs;

        if (fetchStats) {
            yield {
                type: "status",
                message: `Cache hit ${fetchStats.cacheHits}/${fetchStats.requested}; fetched ${fetchStats.fetchedFromGitHub} from GitHub${fetchStats.failed > 0 ? ` (${fetchStats.failed} unavailable)` : ""}.`,
                progress: 55,
            };
        }

        const selectedFilesList = relevantFiles.length > 0
            ? relevantFiles.map((path) => `- ${path}`).join("\n")
            : "- (No specific files selected)";
        const folderStructure = buildRepoFolderStructure(prunedPaths);

        const contextBuildStartMs = Date.now();
        let context =
            `\n--- REPOSITORY FOLDER STRUCTURE ---\n${folderStructure}\n` +
            `\n--- SELECTED FILES ---\n${selectedFilesList}\n`;

        let tokenTotal = countTokens(context);
        let contextTruncated = false;

        const skippedForBudget: string[] = [];
        for (const { path, content } of fileResults) {
            if (!content) continue;
            const numbered = numberLines(content);
            const tokens = countTokens(numbered);
            if (tokenTotal + tokens > MAX_TOKENS) {
                // Skip this file but keep going: a smaller, lower-ranked file may still fit.
                skippedForBudget.push(path);
                contextTruncated = true;
                continue;
            }
            context += `\n--- FILE: ${path} ---\n${numbered}\n`;
            tokenTotal += tokens;
        }
        if (skippedForBudget.length > 0) {
            context += `\n--- NOTE: Not loaded (over the ${MAX_TOKENS.toLocaleString()} token limit): ${skippedForBudget.join(", ")} ---\n`;
        }
        contextBuildMs = Date.now() - contextBuildStartMs;

        if (contextTruncated) {
            yield {
                type: "status",
                message: `Context token budget reached (${MAX_TOKENS.toLocaleString()}); using highest-priority files only...`,
                progress: 65,
            };
        }

        if (!context) {
            context = "No file content could be retrieved for the selected files.";
        }

        // Step 3: Stream AI response
        yield {
            type: "status",
            message: "Preparing answer from selected context...",
            progress: 70,
        };

        yield {
            type: "status",
            message: "Preparing answer...",
            progress: 85,
        };

        if (disableToolCalls) {
            yield {
                type: "status",
                message: "Tool calls are paused for this window. Continuing without repository tools.",
                progress: 86,
            };
        }

        const stream = streamAnswer(
            query,
            context,
            { owner, repo },
            profileData,
            history,
            modelPreference,
            disableToolCalls
        );
        const toolsUsed = new Set<string>();
        let commitFreshnessLabel: string | undefined;
        const answerStartMs = Date.now();

        for await (const chunk of stream) {
            if (chunk.startsWith("THOUGHT:")) {
                yield { type: "thought", text: chunk.replace("THOUGHT:", "") };
            } else if (chunk.startsWith("STATUS:")) {
                yield {
                    type: "status",
                    message: chunk.replace("STATUS:", "").trim(),
                    progress: 85,
                };
            } else if (chunk.startsWith("TOOL:")) {
                try {
                    const parsed = JSON.parse(chunk.replace("TOOL:", "").trim()) as {
                        name?: unknown;
                        detail?: unknown;
                        usageUnits?: unknown;
                        billable?: unknown;
                    };
                    if (typeof parsed.name === "string") {
                        toolsUsed.add(parsed.name);
                        yield {
                            type: "tool",
                            name: parsed.name,
                            detail: typeof parsed.detail === "string" ? parsed.detail : undefined,
                            usageUnits: typeof parsed.usageUnits === "number" ? parsed.usageUnits : undefined,
                            billable: typeof parsed.billable === "boolean" ? parsed.billable : undefined,
                        };
                    }
                } catch {
                    // Ignore malformed TOOL payloads.
                }
            } else if (chunk.startsWith("META:")) {
                try {
                    const parsed = JSON.parse(chunk.replace("META:", "").trim()) as {
                        commitFreshnessLabel?: unknown;
                    };
                    if (typeof parsed.commitFreshnessLabel === "string" && parsed.commitFreshnessLabel.trim().length > 0) {
                        commitFreshnessLabel = parsed.commitFreshnessLabel;
                    }
                } catch {
                    // Ignore malformed META payloads.
                }
            } else {
                yield { type: "content", text: stripEmojiCharacters(chunk), append: true };
            }
        }
        answerMs = Date.now() - answerStartMs;
        const nonWebToolsUsed = Array.from(toolsUsed).filter((tool) => tool !== "googleSearch");
        const sourceScope = toolsUsed.has("googleSearch")
            ? (nonWebToolsUsed.length > 0 ? "Repository + GitHub tools + web snapshot" : "Repository + web snapshot")
            : (nonWebToolsUsed.length > 0 ? "Repository + GitHub tools" : "Repository only");
        const processingSummary = [
            `Selection: ${selectionMs}ms`,
            `File fetch: ${fileFetchMs}ms`,
            `Context build: ${contextBuildMs}ms`,
            `Answer generation: ${answerMs}ms`,
            `Total: ${Date.now() - pipelineStartMs}ms`,
        ];

        yield {
            type: "complete",
            relevantFiles,
            metadata: {
                commitFreshnessLabel,
                toolsUsed: toolsUsed.size > 0 ? Array.from(toolsUsed) : undefined,
                processingSummary,
                sourceScope,
            },
        };
    } catch (error: unknown) {
        console.error("Query pipeline error:", {
            owner,
            repo,
            modelPreference: modelPreference ?? "flash",
            filePathCount: filePaths.length,
            queryPreview: query.slice(0, 160),
            error,
        });
        const classified = classifyPipelineError(error);
        yield { type: "error", message: classified.message, code: classified.code };
    }
}
