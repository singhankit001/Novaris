/** Mirror of src/styles/novaris.css raw values, for the workbench contrast table. Keep in sync. */
export const hex = {
  g950: "#0a0b0c", g900: "#101214", g850: "#15181a", g800: "#1b1f22", g700: "#262b2f", g600: "#353b40",
  g500: "#6b747a", g400: "#8d959a",
  i50: "#f7f2e8", i100: "#ede7da", i200: "#d3cdc0", i300: "#aba698",
  c300: "#dfa77f", c400: "#d08f63", c500: "#b8764c", c600: "#8e5636", c700: "#5e3a25", cWash: "#2a1d14",
  p400: "#6fa597", p600: "#3f6b60",
  ok: "#7cc19a", okWash: "#14241c", warn: "#e3b24f", warnWash: "#2a2210",
  bad: "#ee7a6e", badWash: "#2d1715", info: "#82a9d6", infoWash: "#14202d",
} as const;

export interface Swatch { name: string; token: string; value: string; role: string }

export const swatches: Swatch[] = [
  { name: "Graphite 950", token: "nv-graphite-950", value: hex.g950, role: "Page background" },
  { name: "Graphite 900", token: "nv-graphite-900", value: hex.g900, role: "Surface" },
  { name: "Graphite 850", token: "nv-graphite-850", value: hex.g850, role: "Sunken well, inputs" },
  { name: "Graphite 800", token: "nv-graphite-800", value: hex.g800, role: "Raised surface, popovers" },
  { name: "Graphite 700", token: "nv-graphite-700", value: hex.g700, role: "Hairline dividers" },
  { name: "Graphite 600", token: "nv-graphite-600", value: hex.g600, role: "Decorative border" },
  { name: "Graphite 500", token: "nv-graphite-500", value: hex.g500, role: "Control boundary (3:1)" },
  { name: "Graphite 400", token: "nv-graphite-400", value: hex.g400, role: "Muted text, placeholders" },
  { name: "Ivory 50", token: "nv-ivory-50", value: hex.i50, role: "Emphasis, headings, focus ring" },
  { name: "Ivory 100", token: "nv-ivory-100", value: hex.i100, role: "Primary text" },
  { name: "Ivory 200", token: "nv-ivory-200", value: hex.i200, role: "Secondary text" },
  { name: "Ivory 300", token: "nv-ivory-300", value: hex.i300, role: "Tertiary text, metadata" },
  { name: "Copper 300", token: "nv-copper-300", value: hex.c300, role: "Citation text, hover" },
  { name: "Copper 400", token: "nv-copper-400", value: hex.c400, role: "Accent, active, evidence edges" },
  { name: "Copper 500", token: "nv-copper-500", value: hex.c500, role: "Pressed fill" },
  { name: "Copper 600", token: "nv-copper-600", value: hex.c600, role: "Citation border" },
  { name: "Patina 400", token: "nv-patina-400", value: hex.p400, role: "Data series B (never status)" },
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
  p("ivory-100", hex.i100, "graphite-800", hex.g800, "text", "Body text on raised"),
  p("ivory-50", hex.i50, "graphite-950", hex.g950, "text", "Headings on page"),
  p("ivory-200", hex.i200, "graphite-900", hex.g900, "text", "Secondary text"),
  p("ivory-200", hex.i200, "graphite-800", hex.g800, "text", "Secondary on raised"),
  p("ivory-300", hex.i300, "graphite-900", hex.g900, "text", "Metadata"),
  p("ivory-300", hex.i300, "graphite-800", hex.g800, "text", "Metadata on raised"),
  p("graphite-400", hex.g400, "graphite-900", hex.g900, "text", "Muted, placeholder"),
  p("graphite-400", hex.g400, "graphite-850", hex.g850, "text", "Placeholder in input"),
  p("copper-400", hex.c400, "graphite-900", hex.g900, "text", "Link / accent text"),
  p("copper-300", hex.c300, "copper-wash", hex.cWash, "text", "Citation chip"),
  p("graphite-950", hex.g950, "copper-400", hex.c400, "text", "Primary button label"),
  p("graphite-950", hex.g950, "copper-500", hex.c500, "text", "Primary button pressed"),
  p("success", hex.ok, "success-wash", hex.okWash, "text", "Success notice"),
  p("warning", hex.warn, "warning-wash", hex.warnWash, "text", "Warning notice"),
  p("danger", hex.bad, "danger-wash", hex.badWash, "text", "Danger notice"),
  p("info", hex.info, "info-wash", hex.infoWash, "text", "Info notice"),
  p("success", hex.ok, "graphite-900", hex.g900, "text", "Status text on surface"),
  p("warning", hex.warn, "graphite-900", hex.g900, "text", "Status text on surface"),
  p("danger", hex.bad, "graphite-900", hex.g900, "text", "Status text on surface"),
  p("info", hex.info, "graphite-900", hex.g900, "text", "Status text on surface"),
  p("graphite-500", hex.g500, "graphite-900", hex.g900, "ui", "Input / control boundary"),
  p("graphite-500", hex.g500, "graphite-800", hex.g800, "ui", "Control boundary on raised"),
  p("copper-400", hex.c400, "graphite-900", hex.g900, "ui", "Active tab bar, chart series A"),
  p("patina-400", hex.p400, "graphite-900", hex.g900, "ui", "Chart series B"),
  p("ivory-50", hex.i50, "graphite-950", hex.g950, "ui", "Focus ring"),
  p("ivory-50", hex.i50, "graphite-900", hex.g900, "ui", "Focus ring on surface"),
];
