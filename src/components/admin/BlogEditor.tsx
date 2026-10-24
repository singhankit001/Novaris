"use client";

import { useState } from "react";
import { BlogPost } from "@prisma/client";
import { EnhancedMarkdown } from "@/components/EnhancedMarkdown";
import { ArrowLeft, Globe, Image as ImageIcon, Lock, Save, Send } from "lucide-react";
import Link from "next/link";
import { savePostAction } from "@/app/admin/blog/actions";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/nv/badge";
import { Button } from "@/components/nv/button";
import { buttonClasses } from "@/components/nv/button-styles";
import { Input, Textarea } from "@/components/nv/field";
import { Notice } from "@/components/nv/notice";

interface BlogEditorProps {
  initialPost?: Partial<BlogPost>;
}

const CATEGORIES = ["Engineering", "Security", "Product", "Announcement"];
// The upload route enforces type and size on the server; this only gives faster feedback.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const toolbar: { label: string; before: string; after?: string }[] = [
  { label: "Heading 1", before: "# " },
  { label: "Heading 2", before: "## " },
  { label: "Heading 3", before: "### " },
  { label: "Bold", before: "**", after: "**" },
  { label: "Italic", before: "_", after: "_" },
  { label: "Strikethrough", before: "~~", after: "~~" },
  { label: "Inline code", before: "`", after: "`" },
  { label: "Bullet list", before: "- " },
  { label: "Numbered list", before: "1. " },
  { label: "Quote", before: "> " },
  { label: "Link", before: "[", after: "](url)" },
  { label: "Mermaid diagram", before: "```mermaid\n", after: "\n```" },
  { label: "Code block", before: "```\n", after: "\n```" },
];

export default function BlogEditor({ initialPost }: BlogEditorProps) {
  const router = useRouter();
  const [post, setPost] = useState<Partial<BlogPost>>({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category: "Engineering",
    image: "/assets/landing_page.png",
    author: "Ankit Singh",
    published: false,
    keywords: "",
    ...initialPost,
  });

  const [isPreview, setIsPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const isSaving = saveStatus === "saving";
  const slugLocked = Boolean(post.id && (post.published || post.publishedAt));

  const insert = (prefix: string, suffix = "") => {
    const textarea = document.getElementById("content-textarea") as HTMLTextAreaElement | null;
    if (!textarea) return;
    const { selectionStart: start, selectionEnd: end } = textarea;
    const current = post.content || "";
    const next = current.slice(0, start) + prefix + current.slice(start, end) + suffix + current.slice(end);
    setPost((prev) => ({ ...prev, content: next }));
    setTimeout(() => {
      textarea.focus();
      const pos = start + prefix.length + (end - start);
      textarea.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPost((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (published: boolean) => {
    setSaveStatus("saving");
    setSaveError(null);
    try {
      const result = await savePostAction({ ...post, published });
      setPost(result);
      setSaveStatus("success");
      router.refresh();
      if (!post.id) router.push(`/admin/blog/${result.id}`);
    } catch (error) {
      setSaveStatus("error");
      setSaveError(error instanceof Error ? error.message : "Failed to save the post. Try again.");
    }
  };

  const uploadImage = async (file: File, target: "cover" | "content") => {
    setUploadError(null);
    if (!file.type.startsWith("image/")) {
      setUploadError("Choose an image file (PNG, JPEG, WebP, GIF or AVIF).");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError("Images must be 5 MB or smaller.");
      return;
    }
    setIsUploading(true);
    try {
      const response = await fetch(`/api/admin/blog/upload?filename=${encodeURIComponent(file.name)}`, { method: "POST", body: file });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string" ? body.error : "Upload failed.";
        throw new Error(message);
      }
      const url = (body as { url?: unknown } | null)?.url;
      if (typeof url !== "string") throw new Error("The upload response had no image URL.");
      if (target === "cover") setPost((prev) => ({ ...prev, image: url }));
      else insert(`![image](${url})`);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed. Check your connection and try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const onPick = (target: "cover" | "content") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadImage(file, target);
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-nv-graphite-700 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/admin/blog" aria-label="Back to blog posts" className={buttonClasses("ghost", "md", "size-11 px-0")}>
            <ArrowLeft aria-hidden className="size-4" />
          </Link>
          <div>
            <p className="nv-eyebrow">Admin · blog</p>
            <h1 className="nv-display mt-1 text-nv-display-md text-balance text-nv-ivory-50">{post.id ? "Edit post" : "New post"}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setIsPreview((v) => !v)} aria-pressed={isPreview}>
            {isPreview ? "Back to editing" : "Preview"}
          </Button>
          <Button leading={<Save aria-hidden className="size-4" />} loading={isSaving} onClick={() => handleSave(false)}>
            Save draft
          </Button>
          <Button variant="primary" leading={<Send aria-hidden className="size-4" />} loading={isSaving} onClick={() => handleSave(true)}>
            {post.published ? "Update" : "Publish"}
          </Button>
        </div>
      </header>

      {saveStatus === "success" && (
        <Notice tone="success" title={post.published ? "Post published" : "Draft saved"} />
      )}
      {saveStatus === "error" && (
        <Notice tone="danger" title="The post was not saved">
          {saveError}
        </Notice>
      )}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Content" className="min-w-0 space-y-3">
          {isPreview ? (
            <div className="min-h-[24rem] overflow-y-auto rounded-nv-md border border-nv-graphite-700 bg-nv-graphite-900 p-6">
              <EnhancedMarkdown content={post.content || ""} />
            </div>
          ) : (
            <>
              <div role="toolbar" aria-label="Markdown formatting" className="flex flex-wrap gap-1 rounded-nv-sm border border-nv-graphite-700 bg-nv-graphite-850 p-1">
                {toolbar.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => insert(t.before, t.after)}
                    className="min-h-11 touch-manipulation rounded-nv-xs px-3 text-nv-small text-nv-ivory-200 hover:bg-nv-graphite-700 hover:text-nv-ivory-50"
                  >
                    {t.label}
                  </button>
                ))}
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-nv-xs px-3 text-nv-small text-nv-ivory-200 hover:bg-nv-graphite-700 has-[:focus-visible]:outline has-[:focus-visible]:outline-2">
                  <ImageIcon aria-hidden className="size-4" />
                  {isUploading ? "Uploading" : "Insert image"}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" className="sr-only" disabled={isUploading} onChange={onPick("content")} />
                </label>
              </div>
              <Textarea
                id="content-textarea"
                label="Content (Markdown)"
                name="content"
                rows={24}
                value={post.content ?? ""}
                onChange={handleChange}
                className="font-nv-mono text-nv-small"
                placeholder="Write your post in Markdown"
              />
            </>
          )}
        </section>

        <aside aria-label="Post details" className="space-y-5 rounded-nv-md border border-nv-graphite-700 bg-nv-graphite-900 p-4 lg:sticky lg:top-20">
          <Input label="Title" name="title" value={post.title ?? ""} onChange={handleChange} />
          <Input
            label="Slug"
            name="slug"
            value={post.slug ?? ""}
            onChange={handleChange}
            disabled={slugLocked}
            hint={slugLocked ? "Locked after first publish to keep the canonical URL." : "Used in /blog/<slug>."}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="post-category" className="text-nv-small font-medium text-nv-ivory-200">
              Category
            </label>
            <select
              id="post-category"
              name="category"
              value={post.category ?? "Engineering"}
              onChange={handleChange}
              className="min-h-11 w-full rounded-nv-sm border border-nv-graphite-500/70 bg-nv-graphite-850 px-3 text-nv-body text-nv-ivory-100 shadow-[inset_0_1px_2px_rgb(21_23_29/0.06)] focus:border-nv-copper-400 focus:bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <Textarea label="Excerpt" name="excerpt" rows={3} value={post.excerpt ?? ""} onChange={handleChange} />
          <Input label="Keywords" name="keywords" value={post.keywords ?? ""} onChange={handleChange} hint="Comma separated." />

          <div className="space-y-2">
            <p className="text-nv-small font-medium text-nv-ivory-200">Cover image</p>
            {post.image && (
              // eslint-disable-next-line @next/next/no-img-element -- remote blob URL of arbitrary host
              <img src={post.image} alt="Cover preview" className="aspect-video w-full rounded-nv-sm border border-nv-graphite-700 object-cover" />
            )}
            <label className={buttonClasses("secondary", "md", "w-full cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2")}>
              <ImageIcon aria-hidden className="size-4" />
              {isUploading ? "Uploading" : "Upload cover image"}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" className="sr-only" disabled={isUploading} onChange={onPick("cover")} />
            </label>
            <p className="m-0 text-nv-micro text-nv-ivory-300">PNG, JPEG, WebP, GIF or AVIF, up to 5 MB. 1200 by 630 works best.</p>
            <Input label="Or paste an image URL" name="image" value={post.image ?? ""} onChange={handleChange} />
            {uploadError && (
              <Notice tone="danger" title="Image not uploaded">
                {uploadError}
              </Notice>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-nv-graphite-700 pt-4">
            <span className="text-nv-small text-nv-ivory-300">Status</span>
            <Badge status={post.published ? "success" : "warning"}>
              {post.published ? <Globe aria-hidden className="mr-1 size-3" /> : <Lock aria-hidden className="mr-1 size-3" />}
              {post.published ? "Published" : "Draft"}
            </Badge>
          </div>
        </aside>
      </div>
    </div>
  );
}
