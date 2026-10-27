import type { ReactNode } from "react";

/** One entry in the development-only component showcase (/design-system/fx). */
export interface ShowcaseEntry {
  id: string;
  name: string;
  /** Reference the component was researched from, e.g. "Aceternity 3D Card Effect". */
  reference: string;
  /** Routes where the component is intended to appear. */
  routes: string[];
  render: () => ReactNode;
}
