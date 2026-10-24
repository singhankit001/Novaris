import { cn } from "@/components/nv/cn";
import s from "@/components/seo/seo.module.css";

/** Skeleton mirrors the page header: eyebrow pill, two title lines, lead lines. */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading page" className={s.loadWrap}>
      <div className={cn(s.loadBar, "nv-indeterminate")} aria-hidden />
      <div aria-hidden className="space-y-4">
        <div className="nv-skeleton h-8 w-40 rounded-full" />
        <div className="nv-skeleton mt-6 h-16 w-full max-w-3xl rounded-nv-md" />
        <div className="nv-skeleton h-16 w-full max-w-xl rounded-nv-md" />
        <div className="nv-skeleton mt-8 h-4 w-full max-w-[var(--nv-measure)] rounded-full" />
        <div className="nv-skeleton h-4 w-3/4 max-w-[var(--nv-measure)] rounded-full" />
      </div>
      <span className="sr-only">Loading page</span>
    </div>
  );
}
