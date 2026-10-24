"use client";
import { useReducedMotion } from "framer-motion";
import type { MotionPreference } from "./types";

/** "reduced" always wins; "full" is an explicit opt-in over the OS flag; "system" follows the OS. */
export function useEffectiveReduced(motion: MotionPreference = "system"): boolean {
  const system = useReducedMotion() ?? false;
  if (motion === "reduced") return true;
  if (motion === "full") return false;
  return system;
}
