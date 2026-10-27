# Group C: premium SaaS interactions

All ten references were fetched from ui.aceternity.com on the date of this work. Every page installs through the shadcn CLI and none states a licence on the component page (it links to a separate Licence page that was not readable). Source was not copied: every component here is an original implementation built on framer-motion, lucide-react, Tailwind and existing `nv` tokens. No new dependencies. Implementations live in `src/components/fx/surface/`; demos in `showcase.tsx`.

Shared rules: hover motion only on `(hover:hover) and (pointer:fine)` (`useFinePointer`, false on the server so there is no hydration mismatch); `useReducedMotion` drops movement; no layout shift from motion (transforms and opacity only, except two user-triggered exceptions noted below).

## 15 Glowing Effect
- URL: https://ui.aceternity.com/components/glowing-effect
- Behaviour: glow on a container border that tracks the pointer. Props: blur, inactiveZone, proximity, spread, variant (default or white), glow, disabled, movementDuration, borderWidth.
- Technique (inferred, page does not say): pointer angle to the element centre drives an angular gradient on the border.
- Deps/licence: React + Tailwind via shadcn; licence not stated.
- Decision: adapt, restrained. Our file: `glowing-border.tsx` (`GlowingBorder`).
- How: 1.5px ring made with a mask-composite ring (`ring-mask.ts`) and one conic-gradient arc (blue to violet, 70 degrees) rotated to the pointer angle. Fades in on enter, fades out on leave. Keyboard focus-within shows the ring statically.
- A11y: decorative `aria-hidden` span, `pointer-events:none`. No motion on touch or reduced motion (only the focus ring remains).

## 16 Bento Grid
- URL: https://ui.aceternity.com/components/bento-grid
- Behaviour: grid of cards with header, title, description. Tagged "hover"; the page does not describe a hover effect. Props: items array of title, description, header, icon.
- Deps/licence: shadcn; licence not stated.
- Decision: adapt, with interaction added. Our file: `bento-grid.tsx` (`BentoGrid`, `BentoItem`).
- How: 1/2/3 column grid. With `href`, the whole card is one link (stretched anchor) and the detail text crossfades over the summary on hover or focus-within (opacity only, same grid cell, so no height change). On touch or without `href`, summary and detail are both shown.
- A11y: both texts are always in the DOM and readable; header art is `aria-hidden`; link focus lifts the card.

## 17 Tracing Beam
- URL: https://ui.aceternity.com/components/tracing-beam
- Behaviour: a beam follows an SVG path as the page scrolls, length varies with scroll speed.
- Deps/licence: shadcn; licence not stated.
- Decision: adapt, simplified. Our files: `tracing-beam.tsx`, shared `scroll-rail.tsx`.
- How: a straight rail filled by `useScroll` progress (spring-smoothed `scaleY`) with a head dot moved by `translateY`. No SVG path: article columns do not curve, and a straight rail avoids measuring path geometry.
- A11y: rail is `aria-hidden`. With reduced motion the rail is fully filled and the head is not rendered. Content never depends on the beam.

## 18 Sticky Scroll Reveal
- URL: https://ui.aceternity.com/components/sticky-scroll-reveal
- Behaviour: right container stays pinned while left text sections scroll and the pinned content changes. Props: content (title, description, content), contentClassName.
- Deps/licence: shadcn; licence not stated.
- Decision: adopt the idea, original build. Our file: `sticky-scroll-reveal.tsx`.
- How: native `position: sticky` panel (no scroll hijacking). `IntersectionObserver` with a centre band picks the active step. From `lg` the panel crossfades visuals; below `lg` each step stacks and shows its own visual inline. Inactive steps dim to 55 percent on `lg` only.
- A11y: the pinned copy is `aria-hidden` (visuals are decorative; the text carries every fact). Reduced motion keeps the fade, drops the translate.

## 19 Comet Card
- URL: https://ui.aceternity.com/components/comet-card
- Behaviour: perspective 3D tilt plus translation following the pointer. Props: rotateDepth (17.5), translateDepth (20), className, children.
- Deps/licence: shadcn; licence not stated.
- Decision: adapt, much gentler. Our file: `comet-card.tsx` (`CometCard`).
- How: framer-motion springs on pointer position drive `rotateX/rotateY` (7 degrees max, not 17.5) and a radial sheen (white highlight plus faint violet, soft-light blend) and a blue edge wash. No translation, which keeps text crisp.
- A11y: purely visual layer. Not rendered on touch or reduced motion; card content stays flat and selectable.

## 20 Liquid Glass
- URL: https://ui.aceternity.com/components/liquid-glass
- Behaviour: glass surface that refracts content behind it; curved rim, colour fringing, frosted finish. Chromium gets refraction; Safari and Firefox get frost only. Opaque under reduced transparency. Props: radius, bevelDepth, scale, aberration, frost, tint.
- Technique: SVG filter used as `backdrop-filter`.
- Deps/licence: shadcn; licence not stated.
- Decision: reject the reference technique, ship a restrained alternative under the same name. Our file: `liquid-glass.tsx` (`LiquidGlass`).
- Why rejected: DESIGN.md allows backdrop blur only on the header, dialog scrim and journey HUD ("depth through light, not glass"); refraction works in Chromium only, so the design would differ per browser; backdrop filters over moving content are expensive.
- Alternative: no backdrop filter at all. A lit silver body, inset highlight and rim shadow, a chromatic conic rim (cyan, white, violet) and a specular highlight that follows a mouse pointer. Intended for one hero element per view.
- A11y: all layers decorative; text sits on a near-white body (contrast unaffected). Pointer highlight only for `pointerType: mouse`.

## 21 Magnetic Button
- URL: https://ui.aceternity.com/components/magnetic-button
- Behaviour: wrapped element drifts toward the cursor and springs back. Props: strength (0.8), maxDistance (100).
- Deps/licence: shadcn; licence not stated.
- Decision: adapt, restrained. Our file: `magnetic-button.tsx`.
- How: real `next/link` or `<button>` styled by the existing `buttonClasses`. A spring-driven wrapper moves it up to 10px at 0.3 strength; the wrapper has 12px of padding so the pull starts just outside the button.
- A11y: native element, native focus ring. Motion only on fine pointers and not in reduced motion. The 100px drift of the reference was rejected: it makes a click target move away from the pointer.

## 22 Expandable Cards
- URL: https://ui.aceternity.com/components/expandable-card
- Behaviour: click a card to expand it; click outside collapses (`useOutsideClick` on mousedown and touchstart). Standard and grid variants. Props are not documented.
- Deps/licence: shadcn plus a hook; licence not stated.
- Decision: replace the modal-style card with an inline disclosure. Our file: `expandable-cards.tsx`.
- Why: the reference's outside-click pattern has no keyboard story on the page. An inline disclosure needs no focus trap and cannot lose focus.
- How: heading containing a `<button aria-expanded aria-controls>`; panel is `role="region"` with `aria-labelledby`, animated with `grid-template-rows`, and `inert` while collapsed so hidden links are not focusable. Escape collapses and returns focus to the header button. The row-height animation is user-triggered and runs only on click; it is the one deliberate layout transition.
- A11y: verified with Playwright: Enter sets `aria-expanded=true`; Escape sets it false and focus returns to the button. 44px minimum header target.

## 23 Timeline
- URL: https://ui.aceternity.com/components/timeline
- Behaviour: timeline with sticky header and a scroll beam. Props: data of title and content.
- Deps/licence: shadcn; licence not stated.
- Decision: adapt. Our file: `timeline.tsx` (reuses `scroll-rail.tsx`).
- How: ordered list; the label and title column is sticky on `md+`; the rail fills with scroll progress; each node lights once reached (one-shot `IntersectionObserver`, treats elements already above the viewport as reached).
- A11y: real `<ol>`; nodes are decorative. With reduced motion the rail is full and all nodes are lit. Single column under `md`.

## 24 Gooey Input
- URL: https://ui.aceternity.com/components/gooey-input
- Behaviour: search field expands from 115px to 200px; a detached icon bubble separates with a gooey SVG filter; shared layout animation. Props: placeholder, widths, offset, gooeyBlur, value/defaultValue, onValueChange, onOpenChange, disabled. Credits Chris Coyier's gooey effect.
- Deps/licence: shadcn; licence not stated.
- Decision: adapt, with the goo kept decorative. Our file: `gooey-input.tsx`.
- How: two decorative layers behind the field (a grey outline copy and a white fill copy) each contain a pill and a circle, filtered with blur plus alpha-contrast `feColorMatrix`. On focus or when there is text, the pill shortens and the circle separates, forming a neck. The native `type=search` input and the submit `<button>` sit above the filter, unfiltered.
- A11y: labelled input (visually hidden label), `role=search`, paste never intercepted, global focus outline kept, 48px submit target. Submit is prevented and reported through `onSubmitValue`. Reduced motion removes the transitions (shapes snap).

## Known limits
- `GlowingBorder`, `CometCard` and `LiquidGlass` set per-pointer-move CSS variables or motion values on one element; cost is small but should be kept to a few instances per view.
- Dev server note: with a symlinked `node_modules`, Turbopack fails ("outside workspace root"); `next dev --webpack` works.
