"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SceneHandle } from "./scene";
import type { AtlasEdge, AtlasLayout, AtlasPhase } from "./types";

export interface AtlasCanvasProps {
  layout: AtlasLayout;
  edges: AtlasEdge[];
  phase: AtlasPhase;
  selectedPath?: string;
  onSelect?: (path: string) => void;
  label: string;
  /** Rendered instead of the canvas when WebGL or the scene module is unavailable. */
  fallback: ReactNode;
}

type Status = "loading" | "ready" | "lost" | "unavailable";

/** Owns the single renderer: lazy module load, visibility pause, context loss, full dispose. */
export function AtlasCanvas({ layout, edges, phase, selectedPath, onSelect, label, fallback }: AtlasCanvasProps) {
  const host = useRef<HTMLDivElement>(null);
  const select = useRef(onSelect);
  const [handle, setHandle] = useState<SceneHandle | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    select.current = onSelect;
  });

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    // A fresh canvas per mount: a force-lost context cannot be reused (StrictMode, remount).
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:pan-y";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", label);
    el.appendChild(canvas);
    let h: SceneHandle | undefined;
    let io: IntersectionObserver | undefined;
    let inView = true;
    let cancelled = false;
    const apply = () => h?.setVisible(inView && !document.hidden);
    import("./scene")
      .then(({ createScene, detectQuality }) => {
        if (cancelled) return;
        h = createScene(canvas, {
          quality: detectQuality(),
          onSelect: (p) => select.current?.(p),
          onContext: (lost) => setStatus(lost ? "lost" : "ready"),
        });
        io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; apply(); });
        io.observe(canvas);
        document.addEventListener("visibilitychange", apply);
        setHandle(h);
        setStatus("ready");
      })
      .catch(() => { if (!cancelled) setStatus("unavailable"); });
    return () => {
      cancelled = true;
      io?.disconnect();
      document.removeEventListener("visibilitychange", apply);
      h?.dispose();
      canvas.remove();
      setHandle(null);
    };
  }, [label]);

  useEffect(() => { handle?.setData(layout, edges); }, [handle, layout, edges]);
  useEffect(() => { handle?.setPhase(phase); }, [handle, phase]);
  useEffect(() => { handle?.setSelected(selectedPath); }, [handle, selectedPath]);

  if (status === "unavailable") return <>{fallback}</>;
  return (
    <div className="relative h-[340px] w-full overflow-hidden rounded-nv-md border border-nv-graphite-700 bg-nv-graphite-950 sm:h-[440px]">
      <div ref={host} className="absolute inset-0" />
      {status !== "ready" && (
        <p role="status" className="absolute inset-x-0 bottom-0 bg-nv-graphite-900 px-3 py-2 text-nv-small text-nv-ivory-200">
          {status === "loading" ? "Loading the 3D view. The list below is already complete." : "Graphics context lost. Waiting for the browser to restore it. The list below is complete."}
        </p>
      )}
    </div>
  );
}
