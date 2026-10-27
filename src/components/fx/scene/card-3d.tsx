"use client";

import { createContext, type ElementType, type ReactNode, use, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/components/nv/cn";
import { useFinePointer } from "./shared";

/**
 * Card3D: CSS perspective card with depth layers.
 * <CardContainer> sets perspective and tilts on hover (fine pointers only; keyboard focus gets the
 * same depth emphasis without tilt). <CardBody> is the preserve-3d surface. <CardItem translateZ={n}>
 * lifts a child n px toward the viewer while active. Mark decorative items aria-hidden.
 */
const ActiveCtx = createContext(false);

export function CardContainer({
  children,
  className,
  bodyClassName,
  maxTilt = 8,
}: {
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  maxTilt?: number;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const [active, setActive] = useState(false);
  const canMove = fine && !reduced;

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const body = bodyRef.current;
    if (!canMove || !body) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    body.style.transform = `rotateY(${(x * maxTilt * 2).toFixed(2)}deg) rotateX(${(-y * maxTilt * 2).toFixed(2)}deg)`;
  };
  const reset = () => {
    if (bodyRef.current) bodyRef.current.style.transform = "";
    setActive(false);
  };

  return (
    <div
      className={cn("[perspective:1000px]", className)}
      onPointerEnter={() => canMove && setActive(true)}
      onPointerMove={move}
      onPointerLeave={reset}
      onFocus={() => setActive(!reduced)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setActive(false);
      }}
    >
      <ActiveCtx value={active}>
        <div
          ref={bodyRef}
          className={cn("[transform-style:preserve-3d] transition-transform duration-200 ease-[var(--nv-ease-out)] will-change-transform", bodyClassName)}
        >
          {children}
        </div>
      </ActiveCtx>
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "nv-card relative h-full [transform-style:preserve-3d] transition-shadow duration-200 hover:shadow-[var(--nv-shadow-lift)] focus-within:border-nv-copper-700 focus-within:shadow-[var(--nv-shadow-lift)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardItem({
  as,
  children,
  className,
  translateZ = 0,
  translateX = 0,
  translateY = 0,
  rotateZ = 0,
  ...rest
}: {
  as?: ElementType;
  children?: ReactNode;
  className?: string;
  translateX?: number;
  translateY?: number;
  translateZ?: number;
  rotateZ?: number;
} & Record<string, unknown>) {
  const active = use(ActiveCtx);
  const Tag: ElementType = as ?? "div";
  return (
    <Tag
      className={cn("w-fit transition-transform duration-200 ease-[var(--nv-ease-out)]", className)}
      style={{
        transform: active ? `translate3d(${translateX}px, ${translateY}px, ${translateZ}px) rotateZ(${rotateZ}deg)` : undefined,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
