import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Design workbench",
  robots: { index: false, follow: false },
};

export default function WorkbenchLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production" && process.env.NOVARIS_WORKBENCH !== "1") notFound();
  return (
    <div data-nv-root>
      {children}
    </div>
  );
}
