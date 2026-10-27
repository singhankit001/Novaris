# Group B research: code and developer visualisation

All seven reference pages were fetched (WebFetch) on the build date. None of the three sites state a licence on the component pages; the Magic UI and Aceternity pages point to GitHub or a licence page, which we did not use. No reference source was copied. Every component below is an original implementation using only installed dependencies (framer-motion, @xyflow/react, lucide-react). No packages added, no shadcn CLI run.

Syntax highlighting: `src/components/fx/code/highlight.tsx` is a ~40-line line-based tokenizer (comments, strings, keywords, numbers, types). We chose it over react-syntax-highlighter (already installed, but Prism/hljs grammars are large for marketing pages). Ceiling: no multi-line comments or template literals.

## 8. File Tree
- URL: https://magicui.design/docs/components/file-tree
- What: expandable folder/file tree from an `elements` array; props `initialSelectedId`, `initialExpandedItems`, `indicator`, `sort`, `dir`; folders sorted first.
- Technique: data-driven nested Folder/File components, installed through the shadcn CLI. Keyboard model not described on the page.
- Licence: not stated on the page.
- Decision: implemented as `FileTree`, a WAI-ARIA tree with flat `treeitem` rows (arrows, Home/End, Enter/Space, left to collapse or go to parent), rows animate height/opacity (opacity only under reduced motion), controlled and uncontrolled, plus Novaris `status` states (in context, changed, flagged) shown as text pills.
- File: `src/components/fx/code/file-tree.tsx`

## 9. Code Block
- URL: https://ui.aceternity.com/components/code-block
- What: code with filename, optional tabs (`tabs[]`), `highlightLines`, built on react-syntax-highlighter.
- Licence: the page defers to a separate licence page (not read).
- Decision: implemented as `CodeBlock` with an ARIA tablist (arrow keys), line numbers, highlighted lines, copy button, and annotations pinned under lines (visible and read by screen readers). Light silver chrome; no dark editor panel.
- File: `src/components/fx/code/code-block.tsx` (lines in `code-lines.tsx`)

## 10. Code Comparison
- URL: https://magicui.design/docs/components/code-comparison
- What: before/after panes with `beforeCode`, `afterCode`, `filename`, light/dark themes, highlight colour.
- Technique: the page does not name the highlighter; theme names (`github-light`) suggest Shiki. Not confirmed.
- Licence: not stated on the page.
- Decision: implemented as `CodeComparison`, server-safe, side by side from `md`, stacked below. Changed lines are derived by comparing line content (or passed explicitly). Removed and added lines use danger/success wash plus an sr-only "removed:/added:" prefix, so colour is not the only channel. Dark theme dropped (light only).
- File: `src/components/fx/code/code-comparison.tsx`

## 11. Animated Terminal
- URL: https://magicui.design/docs/components/terminal
- What: macOS-style terminal; `sequence`, `startOnView`; `TypingAnimation` (60 ms/char) and `AnimatedSpan` children play in order.
- Licence: not stated on the page.
- Decision: implemented as `Terminal` driven by a `lines` array (command, output, success, warn, error). Starts when in view, pauses when it leaves, replay button, reduced motion shows the full transcript. Size is reserved (unrevealed lines stay laid out but invisible), and the full transcript is exposed as sr-only text while the animated copy is aria-hidden. Styled as a light silver well, not a dark terminal, to match the ivory system.
- File: `src/components/fx/code/terminal.tsx`

## 12. Animated Beam
- URL: https://magicui.design/docs/components/animated-beam
- What: a light beam travelling between two elements; props `containerRef`, `fromRef`, `toRef`, `curvature`, `reverse`, `duration`, offsets. The page text was truncated, so the rendering method was not confirmed.
- Licence: not stated on the page.
- Decision: implemented as `AnimatedBeam`: one SVG per beam, quadratic path between element centres, measured with ResizeObserver, a dashed highlight (`pathLength=1`) travelling with a blue to violet userSpace gradient. Off-screen: animation unmounts. Reduced motion: static faint gradient line. Offsets omitted (YAGNI). Demo wires several beams around a scanner hub.
- File: `src/components/fx/code/animated-beam.tsx`

## 13. Orbiting Circles
- URL: https://magicui.design/docs/components/orbiting-circles
- What: children orbit on a circle; props `radius` (160 px), `duration`, `delay`, `reverse`, `path`, `iconSize`, `speed`. Animation method not stated.
- Licence: not stated on the page.
- Decision: implemented as `OrbitingCircles` with CSS transform animation (Tailwind `animate-spin` for the keyframes, duration/direction inline) and counter-rotation so icons stay upright. Sized in percent of a square parent (a fixed 160 px radius breaks at 360 px). Paused off-screen, static ring under reduced motion, items are a labelled list. Placement: `/solutions` only, where it can illustrate "what Novaris reads"; `/about` has no data story for it. It is decorative-leaning, so it is kept to one use.
- File: `src/components/fx/code/orbiting-circles.tsx`

## 14. React Flow examples
- URL: https://reactflow.dev/examples
- What: example catalogue: Custom Nodes, Custom Edges, Animating Edges, Touch Device, and others; Pro examples need a subscription. MIT-licensed free examples. No dedicated accessibility category.
- Decision: implemented as `ArchitectureGraph` using the installed @xyflow/react 12, patterns reused from `src/components/journey/FlowCanvas.tsx` (stylesheet import inside the module, `fitView`, `colorMode="light"`, `Controls`). Five node kinds (module, file, service, external, finding with severity as icon + text + colour), a custom edge with an SVG `animateMotion` packet, per-node `ariaLabel`, and an sr-only list of nodes and edges inside the canvas. The canvas is loaded with `next/dynamic` (`ssr: false`) only after the graph is within 200px of the viewport; before that and on the server a semantic list renders in the same reserved height. Packets run only while on screen and not under reduced motion.
- Files: `src/components/fx/graph/architecture-graph.tsx`, `architecture-graph-canvas.tsx`, `graph-list.tsx`, `graph-types.ts`
