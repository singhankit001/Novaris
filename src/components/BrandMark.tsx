import Image from "next/image";
import { cn } from "@/components/nv/cn";

// Brand artwork ships on a white field; multiply blending drops that field on light surfaces.

/**
 * The Novaris "N" mark (public/brand/novaris-n-mark.png, 4096px): the supplied artwork cropped to a square
 * centred on the N, sized so the whole letter sits inside the circular frame.
 */
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span aria-hidden className={cn("relative block shrink-0 overflow-hidden rounded-full", className)} style={{ width: size, height: size }}>
      <Image
        src="/brand/novaris-n-mark.png"
        alt=""
        fill
        sizes={`${size * 3}px`}
        quality={100}
        priority
        className="object-contain mix-blend-multiply"
      />
    </span>
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
