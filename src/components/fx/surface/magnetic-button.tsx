"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/nv/button-styles";
import { useFinePointer } from "./hooks";

export interface MagneticButtonProps {
  children: ReactNode;
  /** Renders a real link when set, otherwise a <button>. */
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Fraction of pointer offset the button follows (0 to 1). */
  strength?: number;
  /** Maximum drift in px. */
  maxDistance?: number;
  className?: string;
  "aria-label"?: string;
}

/** Button or link that drifts a few px toward a nearby fine pointer and springs back. Plain element on touch and reduced motion. */
export function MagneticButton({ children, href, onClick, type = "button", variant = "primary", size = "lg", strength = 0.3, maxDistance = 10, className, ...rest }: MagneticButtonProps) {
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const live = fine && !reduce;
  const ref = useRef<HTMLSpanElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 260, damping: 20, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 260, damping: 20, mass: 0.4 });
  const clamp = (v: number) => Math.max(-maxDistance, Math.min(maxDistance, v));
  const classes = buttonClasses(variant, size, className);

  return (
    <span
      ref={ref}
      className="-m-3 inline-flex p-3"
      onPointerMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!live || !r || e.pointerType === "touch") return;
        x.set(clamp((e.clientX - (r.left + r.width / 2)) * strength));
        y.set(clamp((e.clientY - (r.top + r.height / 2)) * strength));
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <motion.span className="inline-flex" style={live ? { x, y } : undefined}>
        {href ? (
          <Link href={href} className={classes} {...rest}>
            {children}
          </Link>
        ) : (
          <button type={type} onClick={onClick} className={classes} {...rest}>
            {children}
          </button>
        )}
      </motion.span>
    </span>
  );
}
