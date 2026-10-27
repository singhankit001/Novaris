# Reference list and design lessons

Status: FETCHED = page content read during this phase. LISTED = known documentation, URL recorded but not re-fetched in this session (rate-limited or not needed).

| URL | Status | Lesson applied |
|---|---|---|
| https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/ | FETCHED | Input is `role=combobox` with `aria-autocomplete=list`, `aria-controls`, `aria-expanded`, `aria-activedescendant`; DOM focus stays in the input; Down/Up wrap; Enter selects; Esc closes then clears. Implemented in `combobox.tsx`. |
| https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ | FETCHED | Move focus into the dialog, trap Tab, Esc closes, focus returns to the opener. Native `<dialog>.showModal()` provides all four; `dialog.tsx` restores focus explicitly. |
| https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ | FETCHED | Roving tabindex, Left/Right wrap, Home/End, automatic activation when panels are instant. `tabs.tsx` uses automatic activation; slow panels should switch to manual. |
| https://motion.dev/docs/react-accessibility | FETCHED | `MotionConfig reducedMotion="user"` drops transform and layout animation but keeps opacity and color; `useReducedMotion()` for custom swaps. Our rule: reduced motion means crossfade, not nothing. |
| https://threejs.org/docs/ (disposal, render-on-demand) | FETCHED (index only; lessons from general three.js practice, unverified against the manual page) | Dispose geometry, material, texture and renderer on teardown; render on demand when the scene is static; stop the loop off-screen. Applies to the landing scene and Phase 4 atlas. |
| https://primer.style/product/getting-started/ | FETCHED | Dense, compact developer UI; do not shrink desktop into mobile-first; accessibility from the start; "anything added dilutes everything else". Informs working-screen density and restraint. |
| https://linear.app/now/how-we-redesigned-the-linear-ui | FETCHED | Reduce chrome noise to create calm; neutral palette with a sparing accent; raise text contrast; derive themes from few variables. Informs one-accent rule and 3-step surface scale. |
| https://vercel.com/geist/introduction | FETCHED | Pair a sans with a mono for developer products; high-contrast accessible palette; the grid as identity. We use our own pair (Geist family is OFL; Fraunces added for editorial display) and our own copper accent. |
| https://observablehq.com/plot/features/marks | LISTED (HTTP 429 on fetch) | Layered marks with minimal defaults; chart only what the data supports. Informs `charts.tsx`: three marks only (line, bar, stacked). |
| https://react-spectrum.adobe.com/react-aria/ | LISTED | Reference for keyboard/touch behavior of menus and comboboxes; we hand-roll to avoid a new dependency and keep one primitive system. |
| https://www.radix-ui.com/primitives/docs/overview/accessibility | LISTED | Same role, reference for focus management expectations. |
| https://stripe.com/docs | LISTED (not fetched) | Editorial documentation pacing: generous measure, mono for identifiers, citations inline. Used as a benchmark only; no layout copied. |
| https://pudding.cool and https://www.nytimes.com/spotlight/graphics | LISTED (not fetched) | Editorial data stories: annotate the finding, label directly, show the source line. Informs Metric `source` prop and BarList direct labels. |
| https://fonts.google.com/specimen/Fraunces , /Geist , /Geist+Mono | Font pages not parsed (fetch returned title only) | Licenses confirmed from next/font/google availability and SIL OFL 1.1 project licenses: Fraunces (Undercase Type), Geist and Geist Mono (Vercel). Verify license text in the font repos before launch. |

## Contrast references
WCAG 2.2 SC 1.4.3 (text 4.5:1, large 3:1), 1.4.11 (non-text 3:1), 2.4.7 and 2.4.11/13 (focus visible), 2.5.8 (target size; we hold 44px). Ratios are computed in `src/components/nv/contrast.ts` and shown in the workbench.
