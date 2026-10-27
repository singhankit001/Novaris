"use client";

import { Trash2 } from "lucide-react";
import { deletePostAction } from "@/app/admin/blog/actions";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Notice } from "@/components/nv/notice";
import { Button } from "@/components/nv/button";
import { Dialog } from "@/components/nv/dialog";

interface DeletePostButtonProps {
  id: string;
  title: string;
}

export function DeletePostButton({ id, title }: DeletePostButtonProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePostAction(id);
      setIsConfirmOpen(false);
      router.refresh();
    } catch (e) {
      setIsConfirmOpen(false);
      setError(e instanceof Error ? e.message : "Failed to delete the post.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsConfirmOpen(true)}
        disabled={isDeleting}
        aria-label={`Delete ${title}`}
        title="Delete post"
        className="inline-flex size-11 touch-manipulation items-center justify-center rounded-nv-sm text-nv-danger hover:bg-nv-danger-wash disabled:opacity-45"
      >
        <Trash2 aria-hidden className="size-4" />
      </button>
      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Delete post?"
        message={`This will permanently delete "${title}". This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
      <Dialog
        open={error !== null}
        onClose={() => setError(null)}
        title="Post not deleted"
        footer={<Button onClick={() => setError(null)}>Close</Button>}
      >
        <Notice tone="danger" title={`"${title}" is still published or saved`}>
          {error}
        </Notice>
      </Dialog>
    </>
  );
}
