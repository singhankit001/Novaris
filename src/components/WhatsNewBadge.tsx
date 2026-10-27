"use client";

import { useState } from "react";
import { WhatsNewModal } from "./WhatsNewModal";

export function WhatsNewBadge() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="nv-num inline-flex min-h-11 items-center rounded-nv-sm px-2 font-nv-mono text-nv-micro text-nv-copper-400 underline decoration-nv-copper-600 underline-offset-4 hover:text-nv-copper-300"
            >
                v2.0 release notes
            </button>
            <WhatsNewModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
}
