import Image from "next/image";
import { cn } from "@/components/nv/cn";

/** The Novaris "N" mark, cropped from the brand lockup (public/brand). */
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/novaris-mark.png"
      alt=""
      aria-hidden
      width={size}
      height={size}
      priority
      className={cn("shrink-0 rounded-[28%] shadow-nv-xs ring-1 ring-nv-graphite-700", className)}
    />
  );
}
