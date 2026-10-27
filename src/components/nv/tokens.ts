/** Mirror of src/styles/novaris.css raw values, for the workbench contrast table. Keep in sync. */
export const hex = {
  g950: "#fafaf7", g900: "#ffffff", g850: "#f1f2f5", g800: "#f6f7f9", g700: "#e6e8ee", g600: "#d5d8e0",
  g500: "#868b99", g400: "#626775",
  i50: "#0b0d13", i100: "#14161d", i200: "#3a3e4a", i300: "#5a5f6e",
  c300: "#1f3ee6", c400: "#2f54ff", c500: "#2f54ff", c600: "#7d93ff", c700: "#cdd6ff", cWash: "#eef1ff",
  v400: "#7a4dff", v600: "#5b2fe0", vWash: "#f3efff",
  n400: "#19b6e6", n600: "#0a7aa3", nWash: "#e9f8fd",
  onAccent: "#ffffff",
  ok: "#11744a", okWash: "#ebf7f0", warn: "#9a5a00", warnWash: "#fff6e3",
  bad: "#c22c25", badWash: "#fff0ee", info: "#1d6aae", infoWash: "#ecf5fd",
} as const;

export interface Swatch { name: string; token: string; value: string; role: string }

export const swatches: Swatch[] = [
  { name: "Canvas", token: "nv-graphite-950", value: hex.g950, role: "Page background" },
  { name: "Surface", token: "nv-graphite-900", value: hex.g900, role: "Cards, panels, dialogs" },
  { name: "Silver well", token: "nv-graphite-850", value: hex.g850, role: "Inputs, inset tracks" },
  { name: "Hover tint", token: "nv-graphite-800", value: hex.g800, role: "Row and item hover" },
  { name: "Hairline", token: "nv-graphite-700", value: hex.g700, role: "Dividers, card edges" },
  { name: "Border", token: "nv-graphite-600", value: hex.g600, role: "Decorative border" },
  { name: "Control boundary", token: "nv-graphite-500", value: hex.g500, role: "Input edge (3:1)" },
  { name: "Muted ink", token: "nv-graphite-400", value: hex.g400, role: "Muted text, axes, placeholders" },
  { name: "Ink", token: "nv-ivory-100", value: hex.i100, role: "Primary text" },
  { name: "Ink strong", token: "nv-ivory-50", value: hex.i50, role: "Headlines" },
  { name: "Ink 2", token: "nv-ivory-200", value: hex.i200, role: "Secondary text" },
  { name: "Ink 3", token: "nv-ivory-300", value: hex.i300, role: "Tertiary text, metadata" },
  { name: "Electric blue", token: "nv-copper-400", value: hex.c400, role: "Action, active, focus, series A" },
  { name: "Blue hover", token: "nv-copper-300", value: hex.c300, role: "Hover on solid" },
  { name: "Blue wash", token: "nv-copper-wash", value: hex.cWash, role: "Selected row, citation chip" },
  { name: "Violet", token: "nv-violet-400", value: hex.v400, role: "Secondary accent, series B" },
  { name: "Ion", token: "nv-ion-400", value: hex.n400, role: "Series C, holographic highlight" },
  { name: "Ion text", token: "nv-ion-600", value: hex.n600, role: "Ion as text" },
  { name: "Success", token: "nv-success", value: hex.ok, role: "Status: verified, passing" },
  { name: "Warning", token: "nv-warning", value: hex.warn, role: "Status: inferred, caution" },
  { name: "Danger", token: "nv-danger", value: hex.bad, role: "Status: failing, destructive" },
  { name: "Info", token: "nv-info", value: hex.info, role: "Status: neutral information" },
];

export type PairKind = "text" | "large" | "ui";
export interface Pair { fg: string; bg: string; fgName: string; bgName: string; kind: PairKind; use: string }

const p = (fgName: string, fg: string, bgName: string, bg: string, kind: PairKind, use: string): Pair => ({ fg, bg, fgName, bgName, kind, use });

export const pairs: Pair[] = [
  p("ivory-100", hex.i100, "graphite-900", hex.g900, "text", "Body text on surface"),
  p("ivory-100", hex.i100, "graphite-950", hex.g950, "text", "Body text on canvas"),
  p("ivory-100", hex.i100, "graphite-850", hex.g850, "text", "Input value on silver well"),
  p("ivory-50", hex.i50, "graphite-950", hex.g950, "text", "Headings on canvas"),
  p("ivory-200", hex.i200, "graphite-900", hex.g900, "text", "Secondary text"),
  p("ivory-200", hex.i200, "graphite-850", hex.g850, "text", "Secondary on silver well"),
  p("ivory-300", hex.i300, "graphite-900", hex.g900, "text", "Metadata"),
  p("ivory-300", hex.i300, "graphite-850", hex.g850, "text", "Metadata on silver well"),
  p("graphite-400", hex.g400, "graphite-900", hex.g900, "text", "Muted, axes"),
  p("graphite-400", hex.g400, "graphite-850", hex.g850, "text", "Placeholder in input"),
  p("copper-400", hex.c400, "graphite-900", hex.g900, "text", "Link / accent text"),
  p("copper-400", hex.c400, "copper-wash", hex.cWash, "text", "Active nav, citation chip"),
  p("violet-400", hex.v400, "graphite-900", hex.g900, "text", "Violet accent text"),
  p("violet-600", hex.v600, "violet-wash", hex.vWash, "text", "Violet chip"),
  p("ion-600", hex.n600, "ion-wash", hex.nWash, "text", "Ion chip"),
  p("on-accent", hex.onAccent, "copper-500", hex.c500, "text", "Primary button label"),
  p("on-accent", hex.onAccent, "copper-300", hex.c300, "text", "Primary button hover"),
  p("success", hex.ok, "success-wash", hex.okWash, "text", "Success notice"),
  p("warning", hex.warn, "warning-wash", hex.warnWash, "text", "Warning notice"),
  p("danger", hex.bad, "danger-wash", hex.badWash, "text", "Danger notice"),
  p("info", hex.info, "info-wash", hex.infoWash, "text", "Info notice"),
  p("success", hex.ok, "graphite-900", hex.g900, "text", "Status text on surface"),
  p("warning", hex.warn, "graphite-900", hex.g900, "text", "Status text on surface"),
  p("danger", hex.bad, "graphite-900", hex.g900, "text", "Status text on surface"),
  p("info", hex.info, "graphite-900", hex.g900, "text", "Status text on surface"),
  p("graphite-500", hex.g500, "graphite-900", hex.g900, "ui", "Input / control boundary"),
  p("graphite-500", hex.g500, "graphite-850", hex.g850, "ui", "Control boundary on silver well"),
  p("copper-400", hex.c400, "graphite-900", hex.g900, "ui", "Focus ring, chart series A"),
  p("violet-400", hex.v400, "graphite-900", hex.g900, "ui", "Chart series B"),
  p("ion-400", hex.n400, "graphite-900", hex.g900, "ui", "Chart series C"),
];
