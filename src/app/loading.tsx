import { LoadingRegion, Skeleton } from "@/components/nv/skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="Loading page" className="mx-auto w-full max-w-[var(--nv-page-max)] px-[var(--nv-gutter)] py-16">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-5 h-14 w-full max-w-2xl" />
      <Skeleton className="mt-3 h-14 w-full max-w-xl" />
      <Skeleton className="mt-8 h-4 w-full max-w-[var(--nv-measure)]" />
      <Skeleton className="mt-2 h-4 w-3/4 max-w-[var(--nv-measure)]" />
    </LoadingRegion>
  );
}
