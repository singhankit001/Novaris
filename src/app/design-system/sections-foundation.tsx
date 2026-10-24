import { contrastRatio, passes } from "@/components/nv/contrast";
import { pairs, swatches } from "@/components/nv/tokens";
import { Badge } from "@/components/nv/badge";
import { Section, Specimen } from "./section";

const type = [
  ["Display XL", "text-nv-display-xl nv-display", "Evidence first"],
  ["Display LG", "text-nv-display-lg nv-display", "Read the repository"],
  ["Display MD", "text-nv-display-md nv-display", "Architecture and scope"],
  ["Title", "text-nv-title nv-display", "Dependency surface"],
  ["Body 15/24", "text-nv-body", "Measured: 214 commits across 9 repositories in the last 12 months."],
  ["Small 13", "text-nv-small", "Collected from GitHub REST on 14 Oct, 09:12 UTC."],
  ["Micro 12 / mono eyebrow", "nv-eyebrow", "Collection limit"],
  ["Mono 13 (code, paths, sha)", "font-nv-mono text-nv-small", "src/lib/github.ts#L120-148"],
  ["Tabular figures", "nv-num text-nv-title", "1,204   318   47.2%   9"],
];
const space = [4, 8, 12, 16, 24, 32, 48, 64, 96];
const motion = [
  ["micro", "140ms", "hover, press, toggle"], ["small", "220ms", "menus, notices, tabs"],
  ["large", "450ms", "panel and route transitions"], ["scene", "650ms", "landing and atlas only"],
];

export function FoundationSections() {
  return (
    <>
      <Section id="color" title="Color and contrast" lede="Every pair below is computed from the token hex values with the WCAG 2.x formula, in this page. Text needs 4.5:1; UI boundaries and focus 3:1.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {swatches.map((s) => (
            <div key={s.token} className="nv-card overflow-hidden !rounded-nv-md">
              <div className="h-16 border-b border-nv-graphite-700" style={{ background: s.value }} aria-hidden />
              <div className="p-3">
                <p className="text-nv-small font-medium text-nv-ivory-100">{s.name}</p>
                <p className="font-nv-mono text-nv-micro text-nv-ivory-300">{s.value} · {s.token}</p>
                <p className="mt-1 text-nv-micro text-nv-ivory-200">{s.role}</p>
              </div>
            </div>
          ))}
        </div>
        <Specimen label="Measured ratios">
          <div role="region" aria-label="Contrast table" tabIndex={0} className="overflow-x-auto rounded-nv-md border border-nv-graphite-700">
            <table className="w-full text-left text-nv-small">
              <caption className="sr-only">Contrast ratios for every defined foreground and background pair</caption>
              <thead className="bg-nv-graphite-850"><tr>
                {["Foreground", "Background", "Use", "Needs", "Ratio", "Result"].map((h) => <th key={h} scope="col" className="nv-eyebrow px-3 py-2 font-normal">{h}</th>)}
              </tr></thead>
              <tbody>
                {pairs.map((p) => {
                  const r = contrastRatio(p.fg, p.bg);
                  const ok = passes(r, p.kind);
                  return (
                    <tr key={p.fgName + p.bgName + p.use} className="border-t border-nv-graphite-700">
                      <td className="px-3 py-2 font-nv-mono">{p.fgName}</td>
                      <td className="px-3 py-2 font-nv-mono">{p.bgName}</td>
                      <td className="px-3 py-2 text-nv-ivory-200">{p.use}</td>
                      <td className="nv-num px-3 py-2">{p.kind === "ui" ? "3:1" : "4.5:1"}</td>
                      <td className="nv-num px-3 py-2">{r.toFixed(2)}:1</td>
                      <td className="px-3 py-2"><Badge status={ok ? "success" : "danger"}>{ok ? "Pass" : "Fail"}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Specimen>
      </Section>

      <Section id="type" title="Typography" lede="Sora for display and interface text, Instrument Serif italic for one or two accent words per headline, JetBrains Mono for paths, hashes and eyebrows. All SIL OFL 1.1. Metrics use tabular figures.">
        <div className="flex flex-col divide-y divide-nv-graphite-700">
          {type.map(([name, cls, sample]) => (
            <div key={name} className="grid gap-2 py-4 md:grid-cols-[14rem_1fr] md:items-baseline">
              <p className="nv-eyebrow">{name}</p>
              <p className={cls}>{sample}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="space" title="Spacing, radius and elevation" lede="4px base grid. Depth comes from layered, ink-tinted shadows on white surfaces over the ivory canvas: a hairline and a contact shadow for cards, a lift on hover, a wider cast for popovers and dialogs. Inputs sit in an inset silver well. No neon glow.">
        <Specimen label="Spacing (px)">
          <div className="flex flex-wrap items-end gap-4">
            {space.map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                <span className="block bg-nv-copper-500" style={{ width: s, height: s }} aria-hidden />
                <span className="nv-num text-nv-micro text-nv-ivory-300">{s}</span>
              </div>
            ))}
          </div>
        </Specimen>
        <Specimen label="Elevation: well, control, card, lift, popover, overlay">
          <div className="grid gap-5 rounded-nv-xl bg-nv-graphite-950 nv-aurora p-6 sm:grid-cols-2 lg:grid-cols-6">
            {[
              ["Well", "bg-nv-graphite-850 border border-nv-graphite-700 shadow-[inset_0_1px_2px_rgb(21_23_29/0.06)]"],
              ["xs", "bg-white border border-nv-graphite-700 shadow-nv-xs"],
              ["Card", "bg-white border border-nv-graphite-700 shadow-nv-card"],
              ["Lift", "bg-white border border-nv-graphite-700 shadow-nv-lift"],
              ["Popover", "bg-white shadow-nv-popover"],
              ["Overlay", "bg-white shadow-nv-overlay"],
            ].map(([n, c]) => <div key={n} className={`${c} grid h-24 place-items-center rounded-nv-lg text-nv-small text-nv-ivory-200`}>{n}</div>)}
          </div>
        </Specimen>
        <Specimen label="Holographic ring and signal gradient">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="nv-holo-ring rounded-nv-xl bg-white p-6 shadow-nv-card">
              <p className="nv-eyebrow">.nv-holo-ring</p>
              <p className="mt-2 text-nv-body text-nv-ivory-200">One hairline of pastel light, reserved for the single hero surface on a view.</p>
            </div>
            <div className="rounded-nv-xl border border-nv-graphite-700 bg-white p-6 shadow-nv-card">
              <p className="nv-eyebrow">--nv-gradient-signal</p>
              <p className="nv-display mt-2 text-nv-title">One <span className="nv-gradient-text">highlighted</span> word, never a button.</p>
              <div className="mt-4 h-1 rounded-full bg-[var(--nv-gradient-signal)]" aria-hidden />
            </div>
          </div>
        </Specimen>
        <Specimen label="Radius xs / sm / md / lg">
          <div className="flex gap-4">
            {["rounded-nv-xs", "rounded-nv-sm", "rounded-nv-md", "rounded-nv-lg"].map((r) => <div key={r} className={`${r} size-16 border border-nv-graphite-500`} />)}
          </div>
        </Specimen>
      </Section>

      <Section id="grid" title="Responsive grid" lede="Mobile 4 columns (360), tablet 8 (768), desktop 12 (1440). Gutters 16/24/40. Page max 1280. The ruler below re-flows live; resize the window or open at 360, 768 and 1440.">
        <div className="grid grid-cols-4 gap-[var(--nv-gutter)] md:grid-cols-8 xl:grid-cols-12" aria-hidden>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className={`nv-num grid h-14 place-items-center rounded-nv-xs bg-nv-graphite-800 text-nv-micro text-nv-ivory-300 ${i >= 4 ? "max-md:hidden" : ""} ${i >= 8 ? "max-xl:hidden" : ""}`}>{i + 1}</div>
          ))}
        </div>
        <p className="text-nv-small text-nv-ivory-300">Breakpoints: sm 640, md 768 (tablet), lg 1024 (side nav appears), xl 1280 (12 columns).</p>
      </Section>

      <Section id="motion" title="Motion tokens" lede="Micro 120-220ms, larger 350-650ms. Reduced motion removes transforms and loops and leaves a crossfade or a static state. Nothing here is required to understand a flow.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {motion.map(([n, d, u]) => (
            <div key={n} className="rounded-nv-md border border-nv-graphite-700 p-4">
              <p className="nv-eyebrow">{n}</p>
              <p className="nv-num nv-display text-nv-title">{d}</p>
              <p className="text-nv-small text-nv-ivory-300">{u}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
