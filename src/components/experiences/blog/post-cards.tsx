import Image from "next/image";
import Link from "next/link";
import type { BlogPost } from "@prisma/client";
import { cn } from "@/components/nv/cn";
import s from "@/components/seo/seo.module.css";
import { PostArt } from "./post-art";

type CardPost = Pick<BlogPost, "slug" | "title" | "excerpt" | "category" | "date" | "author" | "image">;

const lift =
  "transition-[transform,box-shadow] duration-200 ease-nv-out motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-nv-lift";

export function FeaturedPost({ post }: { post: CardPost }) {
  return (
    <article className={cn(s.feature, "relative", lift)}>
      <div className={s.featureImg}>
        {post.image ? (
          <Image src={post.image} alt="" fill sizes="(min-width: 1024px) 56vw, 100vw" className="object-cover" priority />
        ) : (
          <PostArt seed={post.slug} className="size-full" />
        )}
      </div>
      <div>
        <p className={s.articleMeta}>
          <span className={s.chip}>{post.category}</span>
          <span className="nv-num">{post.date}</span>
        </p>
        <h2 className={cn(s.featureTitle, "nv-display")}>
          <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {post.title}
          </Link>
        </h2>
        <p className={cn(s.postExcerpt, "!max-w-[48ch] !text-base")}>{post.excerpt}</p>
        <p className="mt-6 text-sm text-nv-ivory-300">By {post.author}</p>
      </div>
    </article>
  );
}

export function PostGrid({ posts }: { posts: CardPost[] }) {
  return (
    <ul className="m-0 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <li key={post.slug} className={cn("nv-card relative flex flex-col overflow-hidden", lift)}>
          <div className="aspect-[33/16] overflow-hidden border-b border-nv-graphite-700">
            <PostArt seed={post.slug} className="size-full" />
          </div>
          <div className="flex flex-1 flex-col p-6">
            <p className={cn(s.articleMeta, "!mb-0")}>
              <span className="nv-num">{post.date}</span>
              <span>{post.category}</span>
            </p>
            <h3 className={cn(s.postTitle, "nv-display")}>
              <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 after:content-['']">
                {post.title}
              </Link>
            </h3>
            <p className={s.postExcerpt}>{post.excerpt}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Empty state: the same illustration language, with the real next steps. */
export function EmptyShelf() {
  return (
    <div className="grid items-center gap-8 rounded-nv-xl border border-nv-graphite-700 bg-white p-8 sm:p-12 md:grid-cols-2">
      <div className="overflow-hidden rounded-nv-lg border border-nv-graphite-700">
        <PostArt seed="empty-shelf" className="aspect-[33/16] w-full" />
      </div>
      <div>
        <h2 className="nv-display m-0 text-nv-display-md">No posts published yet</h2>
        <p className="mt-3 max-w-[44ch] text-nv-body leading-relaxed text-nv-ivory-200 text-pretty">
          Articles will appear here when they are published. The solution guides cover the same topics in the meantime.
        </p>
      </div>
    </div>
  );
}
