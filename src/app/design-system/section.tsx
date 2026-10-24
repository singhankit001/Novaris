import type { ReactNode } from "react";

export function Section({ id, title, lede, children }: { id: string; title: string; lede?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-20 border-t border-nv-graphite-700 py-12">
      <div className="mb-8 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:gap-x-12">
        <h2 id={`${id}-h`} className="nv-display text-nv-display-md">{title}</h2>
        {lede && <p className="max-w-[var(--nv-measure)] text-nv-ivory-200">{lede}</p>}
      </div>
      <div className="flex flex-col gap-8">{children}</div>
    </section>
  );
}

export function Specimen({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="nv-eyebrow mb-3">{label}</p>
      {children}
    </div>
  );
}
