import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "lg";

/* Dimensional controls: a lit top edge, a soft contact shadow, and a pressed state that sinks 2%. */
const variants: Record<ButtonVariant, string> = {
  primary:
    "text-nv-on-accent shadow-nv-accent bg-[linear-gradient(180deg,#4a6cff_0%,#2f54ff_100%)] " +
    "hover:bg-[linear-gradient(180deg,#3f62ff_0%,#1f3ee6_100%)] active:bg-nv-copper-300",
  secondary:
    "text-nv-ivory-100 border border-nv-graphite-600 shadow-nv-xs bg-[linear-gradient(180deg,#ffffff_0%,#f5f6f9_100%)] " +
    "hover:border-nv-graphite-500 hover:bg-white active:bg-nv-graphite-850",
  ghost: "text-nv-ivory-200 hover:bg-nv-graphite-850 hover:text-nv-ivory-50 active:bg-nv-graphite-700",
  danger:
    "bg-nv-danger-wash text-nv-danger border border-nv-danger-edge shadow-nv-xs " +
    "hover:bg-nv-danger hover:text-white hover:border-nv-danger active:opacity-90",
};
const sizes: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 text-nv-body",
  lg: "min-h-12 px-6 text-base",
};

export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 rounded-nv-sm font-medium tracking-[-0.01em]",
    "transition-[transform,box-shadow,background-color,border-color,color] duration-150 ease-nv-out touch-manipulation",
    "active:scale-[0.98] motion-reduce:active:scale-100",
    "aria-disabled:cursor-not-allowed aria-disabled:opacity-45 disabled:cursor-not-allowed disabled:opacity-45",
    // Size first: tailwind-merge reads the custom text-nv-body size as a text colour and would drop the variant's colour.
    sizes[size],
    variants[variant],
    className,
  );
}
