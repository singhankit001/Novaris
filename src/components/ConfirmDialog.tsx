"use client";

import { Button } from "@/components/nv/button";
import { Dialog } from "@/components/nv/dialog";

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: "danger" | "primary";
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    confirmVariant = "danger",
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    return (
        <Dialog
            open={isOpen}
            onClose={onCancel}
            title={title}
            description={message}
            destructive={confirmVariant === "danger"}
            footer={
                <>
                    <Button onClick={onCancel}>{cancelText}</Button>
                    <Button
                        variant={confirmVariant === "danger" ? "danger" : "primary"}
                        onClick={() => {
                            onConfirm();
                            onCancel();
                        }}
                    >
                        {confirmText}
                    </Button>
                </>
            }
        />
    );
}
