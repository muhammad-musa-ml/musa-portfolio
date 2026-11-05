# Visual study sources and design

These are three original portfolio hero alternatives, made with the project's existing Three.js 0.171.0 and React Three Fiber dependencies. On November 4, the owner selected “A space of possibilities” for the site's spotlight background. The original studio options remain intact. There are no downloaded models, external textures, added packages, copied paid website scenes, or model-inference claims.

## Actual reused code

- **Tokens:** directly imports and executes `hilbert3D` from `three/examples/jsm/utils/GeometryUtils.js`. The generated 64-point path becomes the target of the original 256-token instanced morph. Exact version: https://github.com/mrdoob/three.js/blob/r171/examples/jsm/utils/GeometryUtils.js . The arrangement, interpolation, palette, pointer response and morph choreography are original.
- **Latent:** directly imports and executes `SimplexNoise.noise4d` from `three/examples/jsm/math/SimplexNoise.js`, passing a deterministic random generator. Its fourth coordinate changes with scroll progress. Exact version: https://github.com/mrdoob/three.js/blob/r171/examples/jsm/math/SimplexNoise.js . The point-field geometry, contour extraction, terrain-to-sphere morph and color mapping are original. The upstream file credits Stefan Gustavson's Java implementation and Sean McCullough's port.
- **Hypercube:** original tesseract vertex/edge construction, rotations in 4D coordinate planes, perspective projection and material arrangement. Uses the existing Three.js `InstancedMesh` implementation to batch beams/corners: https://github.com/mrdoob/three.js/blob/r171/src/objects/InstancedMesh.js . No website's scene code is presented as reused here.

All three upstream modules are covered by the Three.js MIT license at https://github.com/mrdoob/three.js/blob/r171/LICENSE . Its full notice is retained in `THREE-LICENSE.txt` beside this file, and in the installed package. Include that notice when distributing these reused dependencies.

## Design decisions

The palette follows the user's selected Interference study: matte charcoal `#0b0c10`, amber `#ffb454`, teal `#63e2c6`, coral `#ff7a6b`, warm text `#f2ebdd`. Light mode uses darker pigments: amber `#b06420`, teal `#16796f`, coral `#bd4b3b`. No new type system is added; page typography belongs to the surrounding studio.

Each alternative spends its visual emphasis differently: a sparse impossible geometric cage, a dense fold of computational tokens, and a continuous field of sampled points. All are centered sculptures with generous surrounding space. None uses an infinity ribbon, an AI sparkle, a logo, or a decorative bloom layer.

## Performance contract

The studio contract below still applies to the three standalone studies. The selected background now shares the original latent geometry sampler in `latent-surface.ts`, with an 88×88 point grid projected onto Canvas 2D. It animates continuously only while revealed, fades to a completely transparent canvas on pointer exit, and stops when hidden. Reduced motion holds it still. Its maximum spotlight radius is 245px (previously 290px), with proportionally smaller mobile/preview sizes. Geometry alone receives the alpha mask; the matte surface receives no colored overlay. Theme colors remain those of Interference. This does not add the full Three.js renderer to the main page.

- Demand rendering; no idle time-based animation. Scroll/scrub changes geometry; pointer changes only the enclosing group's orientation.
- The parent accepts `progress` in `[0,1]`. Geometry smoothing is time-dependent and stops at the target. Reduced motion updates directly without smoothing or pointer tilt.
- An IntersectionObserver and document visibility listener stop rendering when out of view or in a hidden tab. No automatic global scroll listener is added.
- DPR is capped at 1.5. Orthographic fitting uses both container width and height, including narrow mobile surfaces.
- Hypercube uses 32 instanced edges and 16 corners; tokens use 256 instances and a single line buffer; the latent field uses 4,624 points and nine contour lines. Geometry buffers are allocated once and reused.
- Lighting is local and simple. No postprocessing, shadow maps, environment downloads or background blur pass.
- WebGL failure displays an inline vector fallback. Supporting page controls should provide a labeled progress slider, which also makes the scroll transformation accessible without scrolling.

Reference: https://r3f.docs.pmnd.rs/advanced/scaling-performance . These budgets are implementation facts, not a measured FPS claim. Test the integrated studio on the target device before promising frame rates.

## Integration

```tsx
import VisualStudy, { VISUAL_STUDIES, type VisualVariant } from './visuals/VisualStudy'

<div style={{ height: 500 }}>
  <VisualStudy variant="hypercube" theme="dark" progress={0.35} />
</div>
```

The component does not choose the site's final hero, mutate document styling, store a preference, or navigate. `VISUAL_STUDIES` exposes `id`, `name`, `kicker`, `description`, `interaction`, `source`, and `sourceUrl` for the studio controls and credits.
