"use client";

import { Database, File, FileAudio, FileCode2, FileImage, FileJson, FileText, FileVideo, Folder, FolderOpen, Lock, Settings, Terminal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Icons are decorative: the file name is always rendered next to them. Colour groups by kind, never by language brand.
const TONE = { code: "text-nv-copper-400", data: "text-nv-patina-400", doc: "text-nv-ivory-300", config: "text-nv-ivory-300", media: "text-nv-info", lock: "text-nv-warning" } as const;

function pick(filename: string): { Icon: LucideIcon; tone: keyof typeof TONE } {
    const name = filename.toLowerCase();
    const ext = name.split(".").pop() ?? "";
    if (name.endsWith(".lock") || name === "package-lock.json" || name === "pnpm-lock.yaml" || name.startsWith(".env")) return { Icon: Lock, tone: "lock" };
    if (name.includes("config") || name.startsWith(".") || name === "dockerfile" || name.includes("docker-compose")) return { Icon: Settings, tone: "config" };
    if (["js", "jsx", "mjs", "cjs", "ts", "tsx", "py", "go", "rs", "java", "c", "cpp", "h", "rb", "css", "scss", "html"].includes(ext)) return { Icon: FileCode2, tone: "code" };
    if (ext === "json") return { Icon: FileJson, tone: "data" };
    if (["sql", "prisma"].includes(ext)) return { Icon: Database, tone: "data" };
    if (["yml", "yaml", "toml"].includes(ext)) return { Icon: Settings, tone: "config" };
    if (["md", "txt", "log", "pdf"].includes(ext)) return { Icon: FileText, tone: "doc" };
    if (["sh", "bash", "zsh"].includes(ext)) return { Icon: Terminal, tone: "code" };
    if (["png", "jpg", "jpeg", "gif", "svg", "webp", "ico", "tiff", "avif"].includes(ext)) return { Icon: FileImage, tone: "media" };
    if (["mp4", "mov", "avi", "webm", "mkv", "ogv"].includes(ext)) return { Icon: FileVideo, tone: "media" };
    if (["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(ext)) return { Icon: FileAudio, tone: "media" };
    return { Icon: File, tone: "doc" };
}

export function FileIcon({ filename, className }: { filename: string; className?: string }) {
    const { Icon, tone } = pick(filename);
    return <Icon aria-hidden className={cn("size-4 shrink-0", TONE[tone], className)} />;
}

export function FolderIcon({ isExpanded, className }: { name: string; isExpanded: boolean; className?: string }) {
    const Icon = isExpanded ? FolderOpen : Folder;
    return <Icon aria-hidden className={cn("size-4 shrink-0 text-nv-ivory-200", className)} />;
}
