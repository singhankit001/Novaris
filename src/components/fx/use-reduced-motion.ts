import { useSyncExternalStore } from "react";
import { useReducedMotion as useFramerReducedMotion } from "framer-motion";

const noSubscribe = () => () => {};

/**
 * framer-motion's useReducedMotion reads the media query during the first client render, so any markup derived
 * from it differs from the server HTML and breaks hydration. This returns false until hydration completes.
 */
export function useReducedMotion(): boolean {
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  const reduce = useFramerReducedMotion();
  return hydrated && Boolean(reduce);
}
