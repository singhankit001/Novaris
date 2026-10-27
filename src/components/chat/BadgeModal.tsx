"use client";

import { CopyBadge } from "@/components/CopyBadge";
import { Dialog } from "@/components/nv/dialog";

interface BadgeModalProps {
    isOpen: boolean;
    owner: string;
    repo: string;
    onClose: () => void;
}

export function BadgeModal({ isOpen, owner, repo, onClose }: BadgeModalProps) {
    return (
        <Dialog open={isOpen} onClose={onClose} title="Share this analysis" className="w-[min(36rem,calc(100vw-2rem))]">
            <CopyBadge owner={owner} repo={repo} />
        </Dialog>
    );
}
