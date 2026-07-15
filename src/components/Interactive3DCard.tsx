"use client";

import React, { useRef, useState } from "react";

interface Interactive3DCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: "cyan" | "purple" | "blue" | "emerald";
  maxTilt?: number;
}

export function Interactive3DCard({
  children,
  className = "",
  glowColor = "cyan",
  maxTilt = 8,
}: Interactive3DCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
  const [isHovered, setIsHovered] = useState(false);

  const glowBorderClasses = {
    cyan: "border-cyan-500/35 shadow-[0_0_25px_rgba(6,182,212,0.06)] hover:border-cyan-400/60 hover:shadow-[0_0_50px_rgba(6,182,212,0.25)]",
    purple: "border-purple-500/35 shadow-[0_0_25px_rgba(168,85,247,0.06)] hover:border-purple-400/60 hover:shadow-[0_0_50px_rgba(168,85,247,0.25)]",
    blue: "border-blue-500/35 shadow-[0_0_25px_rgba(59,130,246,0.06)] hover:border-blue-400/60 hover:shadow-[0_0_50px_rgba(59,130,246,0.25)]",
    emerald: "border-emerald-500/35 shadow-[0_0_25px_rgba(16,185,129,0.06)] hover:border-emerald-400/60 hover:shadow-[0_0_50px_rgba(16,185,129,0.25)]",
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const centerX = rect.left + width / 2;
    const centerY = rect.top + height / 2;

    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    const rotateY = ((mouseX / (width / 2)) * maxTilt).toFixed(2);
    const rotateX = ((-(mouseY / (height / 2))) * maxTilt).toFixed(2);

    setTransformStyle(
      `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.015, 1.015, 1.015)`
    );
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTransformStyle("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: transformStyle,
        transition: isHovered ? "transform 0.08s ease-out" : "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      className={`relative rounded-3xl bg-[#08080a]/85 backdrop-blur-2xl border ${glowBorderClasses[glowColor]} transition-all duration-500 ${className}`}
    >
      {children}
    </div>
  );
}
