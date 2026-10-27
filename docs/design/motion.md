# Motion specification: repository atlas and analysis transition

Components: `src/components/atlas/*`. Fixture: `/design-system/fixtures/atlas` (development only).

## Storyboard (each frame tied to a real event)

| Frame | Real event | Visual |
|---|---|---|
| 1 | User submits owner/repo | Identity chip stays on screen. It is wrapped in `AnalysisIdentity` (`layoutId="nv-analysis-identity"`), so it moves into the results header instead of being replaced. |
| 2 | `phase="acquiring"`, tree not yet arrived | Atlas mounts (opacity 0 to 1, 450ms, 16px settle). Indeterminate progress bar with the phase label. No percentage. |
| 3 | Tree data arrives (`tree` prop non-empty) | Strata appear at once with a 650ms camera dolly-in from 1.14x to 1x. Real files only. A copper scan sweep runs through the layers while `acquiring` or `analyzing`. |
| 4 | `phase="analyzing"` | Same sweep, slower period. Indeterminate bar remains. |
| 5 | `phase="complete"` | Sweep stops. Cited files turn copper and evidence edges appear. 450ms dolly to the stable reading position (1.05x to 1x). Result groups (children of `AnalysisTransition`) fade up 8px with a 40ms stagger, capped at 5 steps. |
| 6 | `phase="failed"` | Atlas is removed, the `failure` slot fades in (220ms). Scene is not left running. |

Results are rendered the moment they exist. No animation holds content, and no timer gates a phase change.

## Timings and easing

Tokens from DESIGN.md section 9. Micro 140 to 220ms: result stagger, failure fade (`--nv-ease-out`, `[0.2,0.7,0.2,1]`). Large 450 to 650ms: atlas reveal, identity flight, camera dolly (`--nv-ease-in-out`, `[0.65,0,0.35,1]`; the dolly uses a cubic in-out). Only transform and opacity are animated in DOM. Camera motion is a perspective dolly only: no orbit, no auto-rotate, no pointer tilt, no scroll binding.

## Reduced motion mapping

Effective reduced = `motion === "reduced"`, or (`motion === "system"` and `prefers-reduced-motion: reduce`). `motion === "full"` overrides the OS flag as an explicit opt-in.

| Effect | Full | Reduced |
|---|---|---|
| 3D scene | WebGL | Not mounted. Static SVG strata with identical data and labels |
| Camera dolly, sweep | yes | none |
| Atlas reveal | fade plus 16px settle | fade only, 150ms |
| Identity flight | 450ms | duration 0 |
| Result stagger | fade plus 8px, staggered | fade only, no delay |

## Fallback matrix

| Condition | Behavior |
|---|---|
| WebGL unavailable or `new WebGLRenderer` throws | Scene init error is caught (the module promise rejects or `createScene` throws); the SVG strata render. Verified with `--disable-webgl`: 0 canvases, 2 SVGs, filter works. |
| Reduced motion | SVG strata, no canvas (verified: 0 canvases). |
| Touch-only small screen (`pointer: coarse` and width under 768px) | SVG strata by default. A visible "Use 3D view" button opts in. |
| Low power (`saveData`, 4 or fewer cores, 4GB or less memory) | quality `low`: pixel ratio 1, no antialias, `low-power` GPU hint. Otherwise ratio capped at 1.5. |
| Context lost | `webglcontextlost` is prevented, the loop stops, a status message is shown, the list stays complete. On restore the scene redraws. |
| Offscreen or hidden tab | `setAnimationLoop(null)` through IntersectionObserver and `visibilitychange`. |
| Server render / before hydration | SVG strata only. 3D is an enhancement mounted after hydration. |
| Always | `AtlasList2D` (filter, counts, Cited markers, arrow/Home/End keys, details panel) renders under the visual. |

## Data rules

Nodes are files from the `tree` prop. Edges come only from the `edges` prop and each carries `evidence.source`. Edges are drawn and cited files are coloured only in `phase="complete"`. Edges whose endpoint is not drawn (cap) stay visible in the text details. Cap: 8 layers, 60 files per layer, remainder shown as "+N more directories" or "+N not drawn"; the list holds every file. Box height encodes size only when `size` is measured.

## Integration (lead)

Landing slot:

```tsx
import { IllustrativeAtlas } from "@/components/atlas/IllustrativeAtlas";
<div data-atlas-slot="landing"><IllustrativeAtlas motion={prefs.motion} /></div>
```

Repository slot (tree entries are `{ path, type: "blob" | "tree" | "file" | "dir", size?, language? }`; edges are files cited together in an answer):

```tsx
import { RepositoryAtlas } from "@/components/atlas/RepositoryAtlas";
<section data-atlas-slot="repository">
  <RepositoryAtlas tree={tree} edges={edges} phase={phase} identity={{ owner, repo }}
    selectedPath={sel} onSelect={setSel} motion={prefs.motion} />
</section>
```

Pass `edges={[]}` when nothing is collected. Keep `tree`/`edges` identities stable between renders (state or props), because the layout recomputes when identity changes. Chat page transition:

```tsx
import { AnalysisTransition } from "@/components/atlas/AnalysisTransition";
<AnalysisTransition phase={phase} motion={prefs.motion}
  identity={<IdentityChip owner={owner} repo={repo} />}
  atlas={<RepositoryAtlas ... />}
  failure={<ErrorState ... />}>
  {evidenceGroups /* array of nodes, rendered as they exist */}
</AnalysisTransition>
```

Map real events to `phase`: request sent = `acquiring`, tree/first chunk received and model running = `analyzing`, stream finished = `complete`, error = `failed`. Do not render `AnalysisIdentity` elsewhere with the same layoutId at the same time.

## Performance (lab, this Mac only)

Hardware: Apple M3, 10-core GPU, Metal 4; Chromium via Playwright, `--use-angle=metal`, 1440x900, dev server (unoptimized). Renderer string: "ANGLE (Apple, ANGLE Metal Renderer: Apple M3)". Not representative of low-end devices; no such device was measured.

| Case | Result |
|---|---|
| rAF delta, 5s, 3D acquiring (looping) | 301 frames, mean 16.62ms, p95 16.7, max 16.8 |
| rAF delta, 5s, 3D complete (on demand, no loop) | mean 16.66ms, p95 16.7, max 16.8 |
| rAF delta, 5s, reduced motion | mean 16.69ms, p95 16.8, max 33.3 |
| Click on phase button to second rAF (7 clicks) | 27.5 to 34.2ms |
| Without WebGL | 0 canvases, 2 SVG strata, filter present. Console shows three.js "could not create WebGL context" errors from the attempted init |
| 10 soft navigations away and back | away: 0 renderers, 0 geometries, 0 textures; back: 2 renderers, 10 geometries, 11 textures every time (identical across all 10) |
| 10 toggles of 3D off/on in one document | 2 live renderers to 1 and back; geometries 10 to 5 to 10; no growth over 10 cycles |

The page has two atlases (data-backed and illustrative), hence 2 renderers; each atlas owns one. The click-to-paint figure is a proxy, not a measured INP. Raw data: scratchpad `atlas/results.json`; screenshots in the same folder.

## Known limits

The scan sweep is a flat translucent plane and can look heavy at oblique angles. Layer labels can overlap file boxes on the top layer. No device-level low-end measurement. Context loss was implemented but not triggered in a test.
