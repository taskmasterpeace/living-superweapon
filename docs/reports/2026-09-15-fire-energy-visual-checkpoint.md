# Fire and energy presentation checkpoint

Status: technical checks pass, but visual acceptance for "fire looks like fire" is NOT met. This is a bounded presentation candidate, not a finished elemental-effects replacement.

## Implemented candidate

- TORCH Flame Jet/non-eye fire beams: warm advecting flame tongues, uneven silhouette contained within the existing visual envelope, a faint soot sheath, bounded embers and a warm source. Existing tube/detail geometry and contact path remain authoritative.
- SOL Heat Ray: remains an optical ray even though its damage type is fire. It is not turned into a flamethrower.
- Energy beams: existing surface/source radiance lowered from 2.5 to 1.6 before the existing compositor. No second bloom compositor or new global bloom setting.
- Fire cones: tapered animated flame particles and orange/yellow palette, at 90 emissions/second across tested 30/60/120Hz. A normal-blending pass shares the existing particle geometry and simulation, and adds one draw while flames are alive. Ordinary energy/cold particles retain additive rendering.
- All damage, energy costs, target tests, packet velocities and gameplay reach remain unchanged. Firebeam soot is an envelope, not a detached volumetric smoke simulation.

## Technical evidence

`node --import ./tools/helpers/character-css-loader.mjs --test tools/beam-material-families.test.mjs tools/beam-body-contact.test.mjs tools/frontline-beam-speed.test.mjs`: 37 passing tests. The new deterministic test compares identical flame/energy visual branches and confirms equal traveled paths, packet velocities, DPS, radius and energy cost. Particle recycling and the fire-only blend pass are covered.

`node tools/beam-material-families-browser.mjs`: foreground Chromium, actual application's World compositor and production BeamHose/ability code; five isolated visual fixtures, zero page/shader errors, finite geometry. Screenshots in `artifacts/beam-material-families/`: TORCH, KANO, RIME, SOL, TORCH cone. The cone fixture had 48 live flames. Screenshots were inspected.

The harness disables ordinary simulation and hides menu/HUD elements to isolate rendering after application boot. It does not prove native-input gameplay. An earlier normal-entry preparation wait timed out; two intermediate runs lost their context during shared Vite reloads. Final fixture succeeded. These passes establish functioning rendering and unchanged tested gameplay calculations; they do not establish artistic quality.

## Visual review: not accepted

The screenshot review found two material shortcomings: TORCH's cone reads as separated flame icons, and TORCH's beam still reads as a thin straight yellow energy hose. The new palette, shader motion and particles do not yet satisfy the requested coherent fire appearance. Do not report this as finished fire or as visually approved.

The next artistic pass needs a cohesive plume with connected, irregular flame shapes, visible breakup and rising motion, then comparison against the supplied visual reference in motion and against terrain. Increasing bloom alone will not resolve the shape problem. Implementation is paused at this checkpoint; no further runtime expansion was made after this review.

## Frost/reference audit

The supplied attachment (`4b9f182e-b769-4690-9a4d-2ce4e7968158/pasted-text.txt`) contains a Three r120 noise/polar-coordinate and selective-bloom example. Its approach informed visual separation only; it was not copied into the renderer and it does not establish a previous frost implementation.

Existing cold work is real: RIME Cryo Beam (`src/data/characters.js`) is cold-typed; `src/data/visual.js` maps ice material to crystal temper; `src/engine/projectiles.js` implements crystal detail movement. Cold cones in `src/engine/abilities.js` apply frost buildup/chill through existing gameplay. The body still uses the shared beam surface, so the present cryo beam should not be presented as a fully distinct new frost shader. No separately identifiable older external frost shader/source was found in the targeted local audit. Preserve that distinction in user reporting.

## Remaining

First resolve the rejected beam/cone fire appearance. Native-input visibility against terrain and receivers; fireball/projectile and explosion families; detached smoke; full cold mist/crystal presentation; optional color-tunable magical fire also remain separate work.

## Primary implementation references

- [Three.js ShaderMaterial](https://threejs.org/docs/pages/ShaderMaterial.html): custom GLSL programs and per-frame uniform values used by the existing WebGL renderer. This documents the integration mechanism, not artistic acceptance.
- [Three.js Material](https://threejs.org/docs/pages/Material.html): material blending and shader customization API. Check the project's installed Three.js version when applying current documentation; no engine upgrade is part of this change.
