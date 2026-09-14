---
name: power-world-character-authoring
description: Author and review Power World character appearances, rigid accessories, and animation candidates using the existing Character Foundation editor and shared modular rig.
---

# Power World character authoring

Work in the existing repository and editor. Open `/character-foundation.html` on its running Vite address; use `/studio.html?hero=vega&body=faceted-v1` for the gameplay rig view and `/animation-library.html` for shared clips. Extend these surfaces when requested; do not create another workshop. Read the repository AGENTS.md and inspect current code before treating the capabilities below as unchanged.

## Route the change

- Editor controls and recipe import/export: `character-foundation.html`, `src/tool/character-foundation.js`.
- Build parts, joint keyframes, contact rehearsal, asset import/export and per-character saves: `src/tool/character-authoring-panel.js`.
- Recipe schema, allowed fields and mesh application: `src/engine/modular-costume.js`. Use `validateModularRecipe`; unknown fields are not an implementation.
- Rigid authoring schema, validation, interpolation and clip compilation: `src/engine/character-authoring.js`; named bones: `src/data/character-bones.js`; portable rig contract: `public/authoring/character-contract.json`.
- Headwear and signature attachments: `src/engine/modular-signature-parts.js`; garment tailoring: `src/engine/modular-tailoring.js`; face/eyes: `src/engine/modular-face.js`; patterns and image placement: `src/engine/modular-surfaces.js`, `src/engine/modular-image-placements.js`.
- Stock appearances: `src/data/hero-signature-recipes.js`; gameplay loading: `src/engine/modular-character.js`; body selection: `src/data/hero-models.js`. Gameplay kits and statistics remain in `src/data/characters.js` and `src/data/ranks.js`.

## What exists

| Request | Supported route and limits |
| --- | --- |
| Shirts/clothes | `outfit: separates` or `bodysuit`, torso/arm region colors, sleeves, collar, robe, coat, hoodie and business-suit options; patterns/custom pattern images. There is no arbitrary shirt-mesh importer or freeform garment sewing editor. |
| Masks/helmets | `headwear` includes mask, domino, helmet, tactical, greathelm and other validated choices. A separate boolean `helmet` controls the existing mesh slot. Custom rigid pieces can attach to `DEF-head`; these are primitives, not skinned imported headgear. |
| Glasses | `glasses` boolean uses the existing glasses module. `visor` hides glasses. Custom frames can use rigid authoring; there is no dedicated lens/frame parametric editor. |
| Eye color/glow | `eyeColor` is a six-digit hex color; `eyeGlow` is boolean. Face expression rendering provides the eye emissive mask. Infection appearance can override eye color/glow. |
| Makeup | No dedicated makeup, lipstick or eyeshadow fields/tools. Face/head tattoo image regions and up to eight tattoo layers can approximate painted markings; review their placement and expression interaction. Do not call this a makeup system. |

## Existing workflow

1. Check the actual body first. `heroModelOf(def)` defaults to `faceted-v1` but `def.model` can override it. The modular loader exits for other bodies; a saved modular recipe will not automatically dress a different rig. Check `public/models/modular-hero/modular-hero.glb`, its manifest and motion bank before assuming a bone or clip exists.
2. Choose a base recipe and adjust the existing clothing/face controls. For custom rigid parts, expand **Build parts & animations**, select a named bone and box/sphere/cylinder, then edit size, position and rotation. UI rotations are degrees; asset rotations are radians. Dimensions/offsets are rig metres.
3. For animation, choose a base clip/current pose or an editable action study. Set duration and ordered contact, release, control-return markers. Rotate local joints, adjust visual hip height if needed, capture increasing-time keys, and preview with frame stepping and quarter/half speed. Hip height is a visual body track, not gameplay movement. Prop/partner rehearsal is a visual aid, not a collision or combat proof.
4. Export the character recipe to transfer appearance; export the authoring asset for parts, keys and timing; export an animation clip for Three.js tracks with separate timing metadata. Keep these formats distinct. Recipes use `schema: 1`, `skeleton: ual-deform-v1`, `body: faceted-v1`; assets use `schema: powerworld-authoring-v1`, `rig: ual-deform-v1`.
5. Validate imports. Assets allow up to 64 rigid parts, 1–240 motion keys, normalized quaternions and duration 0.1–30 seconds. Use the validator for exact numeric bounds and bone membership. The editor limits asset files to 4 MB and recipe files to 14 MB.
6. **Save to this browser** stores a roster appearance under `powerworld.character-recipes.v1`, scoped to that browser origin/address/port. Export for backup or transfer. Runtime reads saved recipes and mounts authored parts; an exported animation remains a candidate and is not automatically installed into combat. Wiring a reviewed clip into gameplay is separate work.

## Review and verification

Inspect front, back, side and top, then motion at contact/release/control return. Check skin and cloth seams, headgear/eye visibility, hands, shoulders, body proportions and accessory clipping. Review at normal gameplay distance as well as close-up. Record limitations instead of marking an unreviewed study as approved.

For schema/runtime changes, run the relevant existing tests: `node --test tools/character-authoring.test.mjs tools/modular-character.test.mjs tools/modular-pipeline.test.mjs tools/modular-image-placements.test.mjs`. Use only the relevant subset for a narrow change. Existing visual checks include `tools/character-foundation-review.mjs`, `tools/modular-native-review.mjs`, `tools/modular-recipe-roundtrip.mjs` and `tools/modular-render-budget.mjs`; inspect their URL/port and output locations before running, since some use port 5184 rather than the default dev address.

For a new appearance, verify recipe export/import and same-origin gameplay loading on the intended character. For a new animation, verify the candidate in motion and separately test any gameplay integration actually requested. Report which body, recipe and clip were reviewed; distinguish structural validation from visual and gameplay verification.
