import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-nv-copper-400 text-nv-graphite-950 hover:bg-nv-copper-300 active:bg-nv-copper-500",
  secondary:
    "bg-nv-graphite-800 text-nv-ivory-100 border border-nv-graphite-600 hover:border-nv-graphite-500 hover:bg-nv-graphite-700 active:bg-nv-graphite-850",
  ghost: "text-nv-ivory-200 hover:bg-nv-graphite-800 hover:text-nv-ivory-50 active:bg-nv-graphite-700",
  danger:
    "bg-nv-danger-wash text-nv-danger border border-nv-danger-edge hover:bg-nv-danger hover:text-nv-graphite-950 active:opacity-90",
};
const sizes: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 text-nv-body",
  lg: "min-h-12 px-6 text-base",
};

export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 rounded-nv-sm font-medium",
    "transition-colors duration-150 ease-nv-out touch-manipulation",
    "aria-disabled:cursor-not-allowed aria-disabled:opacity-45 disabled:cursor-not-allowed disabled:opacity-45",
    variants[variant],
    sizes[size],
    className,
  );
}

