/** WCAG 2.x relative luminance and contrast ratio. Used by the workbench to measure, not assert. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => {
    const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export type ContrastKind = "text" | "large" | "ui";
export const CONTRAST_MIN: Record<ContrastKind, number> = { text: 4.5, large: 3, ui: 3 };

export function passes(ratio: number, kind: ContrastKind): boolean {
  return ratio >= CONTRAST_MIN[kind];
}
