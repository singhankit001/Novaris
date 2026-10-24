import Image from "next/image";
import { cn } from "@/components/nv/cn";

// Brand artwork ships on a white field; multiply blending drops that field on light surfaces.

/** The Novaris "N" mark, used uncropped exactly as supplied (public/brand/novaris-n.png, 1254px). */
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/novaris-n.png"
      alt=""
      aria-hidden
      width={size}
      height={size}
      quality={100}
      priority
      className={cn("shrink-0 object-contain mix-blend-multiply", className)}
    />
  );
}

/** The NOVARIS logotype exactly as drawn in the brand lockup (public/brand/novaris-wordmark.png). */
export function BrandWordmark({ height = 14, className }: { height?: number; className?: string }) {
  return (
    <Image
      src="/brand/novaris-wordmark.png"
      alt=""
      aria-hidden
      width={Math.round((height * 872) / 122)}
      height={height}
      quality={100}
      priority
      className={cn("shrink-0 mix-blend-multiply", className)}
    />
  );
}
