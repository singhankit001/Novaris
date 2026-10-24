"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { Dialog } from "@/components/nv/dialog";
import { buttonClasses } from "@/components/nv/button-styles";
import { Notice } from "@/components/nv/notice";
import { IndeterminateProgress } from "@/components/nv/skeleton";
import { FileIcon } from "./FileIcon";
import { CodeBlock } from "@/components/nv/code-block";

interface FilePreviewProps {
    isOpen: boolean;
    filePath: string | null;
    repoOwner: string;
    repoName: string;
    onClose: () => void;
}

type FileType = "text" | "markdown" | "image" | "video" | "audio" | "pdf" | "binary" | "unknown";

interface FileInfo {
    size: number;
    html_url: string;
    download_url?: string;
}

type LoadState =
    | { phase: "idle" }
    | { phase: "loading" }
    | { phase: "error"; message: string; githubUrl?: string }
    | { phase: "ready"; info: FileInfo; type: FileType; content: string };

function getFileType(path: string): FileType {
    const ext = path.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "tiff", "avif"].includes(ext)) return "image";
    if (["mp4", "mov", "avi", "webm", "mkv", "ogv"].includes(ext)) return "video";
    if (["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(ext)) return "audio";
    if (ext === "pdf") return "pdf";
    if (["md", "markdown"].includes(ext)) return "markdown";
    if (["zip", "tar", "gz", "7z", "rar", "exe", "dll", "bin", "so", "dmg", "iso"].includes(ext)) return "binary";
    const textExts = ["js", "jsx", "ts", "tsx", "py", "rb", "go", "rs", "java", "cpp", "c", "h", "hpp", "css", "scss", "html", "json", "yaml", "yml", "sh", "bash", "txt", "log", "env", "gitignore", "editorconfig", "dockerfile", "toml", "xml", "sql"];
    return textExts.includes(ext) || !ext ? "text" : "unknown";
}

function decodeBase64(base64: string): string {
    const binary = atob(base64.replace(/\s/g, ""));
    return new TextDecoder("utf-8").decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

const MAX_PREVIEW_LINES = 3000;
const LANG: Record<string, string> = { js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript", py: "python", rb: "ruby", go: "go", rs: "rust", java: "java", cpp: "cpp", c: "c", css: "css", html: "html", json: "json", yaml: "yaml", yml: "yaml", sh: "bash" };

export function FilePreview({ isOpen, filePath, repoOwner, repoName, onClose }: FilePreviewProps) {
    const [state, setState] = useState<LoadState>({ phase: "idle" });
    const [mediaFailed, setMediaFailed] = useState(false);

    useEffect(() => {
        if (!isOpen || !filePath) return;
        const controller = new AbortController();
        const run = async () => {
            setState({ phase: "loading" });
            setMediaFailed(false);
            try {
                const type = getFileType(filePath);
                const encoded = filePath.split("/").map(encodeURIComponent).join("/");
                const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${encoded}`, {
                    headers: { Accept: "application/vnd.github.v3+json" },
                    signal: controller.signal,
                });
                const githubUrl = `https://github.com/${repoOwner}/${repoName}/blob/HEAD/${encoded}`;
                if (!response.ok) {
                    const message = response.status === 404 ? "This file was not found on GitHub." : response.status === 403 ? "GitHub rate limit reached. Try again in a few minutes." : `GitHub answered with ${response.status}.`;
                    setState({ phase: "error", message, githubUrl });
                    return;
                }
                const data = (await response.json()) as { size: number; html_url: string; download_url?: string; content?: string };
                const info: FileInfo = { size: data.size, html_url: data.html_url, download_url: data.download_url };
                if (type === "binary") return setState({ phase: "error", message: "Binary files cannot be previewed.", githubUrl: info.html_url });
                if (type === "unknown" && data.size > 500_000) return setState({ phase: "error", message: "This file is large and its format is unknown.", githubUrl: info.html_url });
                let content = "";
                if (type === "text" || type === "markdown") {
                    if (data.size > 1_000_000) return setState({ phase: "error", message: "This file is over 1 MB, so it is not previewed.", githubUrl: info.html_url });
                    if (data.content) content = decodeBase64(data.content);
                    else if (data.download_url) content = await (await fetch(data.download_url, { signal: controller.signal })).text();
                    else return setState({ phase: "error", message: "GitHub returned no content for this file.", githubUrl: info.html_url });
                }
                setState({ phase: "ready", info, type, content });
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") return;
                setState({ phase: "error", message: "The file could not be loaded. Check your connection and try again." });
            }
        };
        void run();
        return () => controller.abort();
    }, [isOpen, filePath, repoOwner, repoName]);

    const ext = filePath?.split(".").pop()?.toLowerCase() ?? "";
    const links = state.phase === "ready" ? state.info : null;
    const githubHref = state.phase === "error" ? state.githubUrl : links?.html_url;

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            title={filePath ?? "File"}
            placement="center"
            className="h-[min(90dvh,860px)] w-[min(72rem,calc(100vw-1rem))]"
            footer={
                <div className="flex w-full flex-wrap items-center justify-between gap-3 text-nv-small text-nv-ivory-300">
                    <span className="nv-num">
                        {state.phase === "ready" ? `${state.type.toUpperCase()} · ${(state.info.size / 1024).toFixed(1)} KB${state.content ? ` · ${state.content.split("\n").length} lines` : ""}` : ""}
                    </span>
                    <span className="flex gap-2">
                        {links?.download_url && (
                            <a className={buttonClasses("secondary")} href={links.download_url} download target="_blank" rel="noopener noreferrer">
                                <Download aria-hidden className="size-4" /> Download
                            </a>
                        )}
                        {githubHref && (
                            <a className={buttonClasses("secondary")} href={githubHref} target="_blank" rel="noopener noreferrer">
                                <ExternalLink aria-hidden className="size-4" /> View on GitHub
                            </a>
                        )}
                    </span>
                </div>
            }
        >
            {isOpen && (
                <div className="flex min-h-0 flex-col gap-3">
                    {state.phase === "loading" && <IndeterminateProgress label="Loading file" phase={`Fetching ${filePath ?? "file"} from GitHub`} />}
                    {state.phase === "error" && <Notice tone="warning" title={state.message}>You can still open the file on GitHub.</Notice>}
                    {state.phase === "ready" && (
                        <>
                            {mediaFailed && <Notice tone="warning" title="The media file failed to load.">Open it on GitHub instead.</Notice>}
                            {state.type === "image" && state.info.download_url && !mediaFailed && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={state.info.download_url} alt={filePath ?? "Repository image"} onError={() => setMediaFailed(true)} className="mx-auto max-h-[60vh] max-w-full rounded-nv-sm border border-nv-graphite-700 object-contain" />
                            )}
                            {state.type === "video" && state.info.download_url && (
                                <video controls className="mx-auto max-h-[60vh] max-w-full rounded-nv-sm" onError={() => setMediaFailed(true)}>
                                    <source src={state.info.download_url} />
                                </video>
                            )}
                            {state.type === "audio" && state.info.download_url && (
                                <audio controls className="w-full" onError={() => setMediaFailed(true)}>
                                    <source src={state.info.download_url} />
                                </audio>
                            )}
                            {state.type === "pdf" && state.info.download_url && (
                                // Sandboxed with no permissions except scripts: Google's viewer needs script and its own origin for state; it is cross-origin so allow-same-origin is not granted.
                                <iframe
                                    sandbox="allow-scripts"
                                    referrerPolicy="no-referrer"
                                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(state.info.download_url)}&embedded=true`}
                                    title={`PDF preview of ${filePath}`}
                                    className="h-[60vh] w-full rounded-nv-sm border border-nv-graphite-700 bg-white"
                                />
                            )}
                            {state.type === "markdown" && (
                                <div className="max-w-[var(--nv-measure)] text-nv-body text-nv-ivory-100 [&_a]:text-nv-copper-400 [&_a]:underline [&_h1]:nv-display [&_h1]:mb-3 [&_h1]:text-nv-title [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-nv-body [&_h2]:font-medium [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3 [&_img]:max-w-full">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        rehypePlugins={[rehypeRaw, rehypeSanitize]}
                                        components={{
                                            a: ({ href, children }) => (
                                                <a href={href} target="_blank" rel="noopener noreferrer">
                                                    {children}
                                                </a>
                                            ),
                                            img: ({ src, alt }) => {
                                                const raw = typeof src === "string" ? src : "";
                                                if (!raw) return null;
                                                const relative = !/^(https?:|data:)/i.test(raw);
                                                const base = state.info.download_url?.split("/").slice(0, -1).join("/");
                                                const resolved = relative && base ? `${base}/${raw.replace(/^\.\//, "")}` : raw;
                                                // eslint-disable-next-line @next/next/no-img-element
                                                return <img src={resolved} alt={alt || ""} loading="lazy" className="my-3 rounded-nv-sm" />;
                                            },
                                        }}
                                    >
                                        {state.content}
                                    </ReactMarkdown>
                                </div>
                            )}
                            {(state.type === "text" || (state.type === "unknown" && state.content)) && (
                                <>
                                    {state.content.split("\n").length > MAX_PREVIEW_LINES && (
                                        <Notice tone="info" title={`Showing the first ${MAX_PREVIEW_LINES.toLocaleString()} lines`}>Open the file on GitHub for the rest.</Notice>
                                    )}
                                    <CodeBlock code={state.content.split("\n").slice(0, MAX_PREVIEW_LINES).join("\n")} language={LANG[ext] ?? "text"} path={filePath ?? undefined} />
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
        </Dialog>
    );
}
