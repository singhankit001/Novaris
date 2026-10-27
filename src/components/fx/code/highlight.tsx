import type { ReactNode } from "react";

/*
 * Tiny line-based token highlighter (comments, strings, keywords, numbers, types).
 * Chosen over react-syntax-highlighter (large Prism/hljs grammars) so marketing pages stay light.
 * Ceiling: no multi-line comments or template literals; each line is tokenised alone.
 */
export type CodeLang = "ts" | "tsx" | "js" | "prisma" | "sh" | "json" | "text";

const KEYWORDS = new Set(
  "import export from const let var function return if else for while await async new throw try catch class interface type extends implements default as of in typeof null undefined true false model enum datasource generator String Int Boolean DateTime".split(" "),
);

const TONES: Record<string, string> = {
  c: "text-nv-graphite-400 italic",
  s: "text-nv-ion-600",
  k: "text-nv-copper-300",
  n: "text-nv-violet-600",
  t: "text-nv-ivory-50",
};

export function highlightLine(line: string, lang: CodeLang = "ts"): ReactNode {
  if (lang === "text" || !line) return line;
  const comment = lang === "sh" ? "#.*" : lang === "json" ? "(?!)" : "\\/\\/.*";
  const re = new RegExp(
    `(${comment})|("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\`)|(\\b\\d+(?:\\.\\d+)?\\b)|([A-Za-z_$][\\w$]*)|(\\s+|.)`,
    "g",
  );
  const out: ReactNode[] = [];
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(line))) {
    const [text, c, s, n, w] = m;
    const kind = c ? "c" : s ? "s" : n ? "n" : w ? (KEYWORDS.has(w) ? "k" : /^[A-Z]/.test(w) ? "t" : "") : "";
    out.push(kind ? <span key={i++} className={TONES[kind]}>{text}</span> : text);
  }
  return out;
}
