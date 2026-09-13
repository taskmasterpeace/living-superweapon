# Modular character checkpoint — 2026-09-13

This replaces the rejected procedural-sword proof. Open http://127.0.0.1:5184/character-foundation.html with the local review server running.

The original faceted body now uses the original Quaternius deform skeleton and authored punch/sword clips. Upper arms have angular muscle profiles, gauntlets taper toward the wrists, the torso has a shallower side profile, and hair has a swept silhouette. Eyes are visible by default; the visor is optional. Seven expressions share one face layout. The preview exposes muscle size, overall scale, soldier/Ascendant clothing, colors, expressions and flight hand poses.

Existing native procedural flight poses are adapted onto this skeleton. Flight input, speed, energy and physics are unchanged. The prototype is available as an opt-in Character Studio body; existing roster defaults are not replaced.

## Evidence

- artifacts/marketing/modular-character/character-motion-review.webm: refreshed punch, sword, flight, open-hand flight, soldier and larger frame preview.
- refined-neutral.png and refined-side.png in that folder: body review. face-*.png: all seven expressions.
- native-review.json: native Studio loading and pose stepping; does not establish combat balance or damage correctness.
- 40 focused modular-character, flight-language and Studio-profile tests passed; production build passed. Three older bow-geometry assertions in the separate hero-hover suite also fail on untouched HEAD; they are not caused by this change.

These checks and visual evidence do not establish user approval of final art or completion of all melee animations.

## Remaining scope

No roster-wide conversion yet. Dedicated heavy strikes, kicks, paired grabs, axes/bats and two-handed weapons need authored clip coverage. Expressions and muscle controls currently live in the foundation preview; they are not saved as full Studio fields or connected to dialogue events. The cape is rigidly weighted to the chest. Native state-driven finger selection needs further integration; the preview offers open/fist flight hands. No fleet-branch work was imported.

See MODULAR_CHARACTER_PIPELINE.md for reproducible authoring details. Sandra's ring remains a separate next feature and was not implemented during this repair.

## Modularity refinement

The workshop now includes athletic Ascendant, broad Black mercenary, agile Black female mercenary and robot recipes. Shared options include swept/afro/bun/braid hair, wraparound visor, eye patch, four outfit colors, skin/hair/eye colors, emissive eyes and five emblem shapes. Body frame changes preserve common head size. The boots are tapered with sloped toes; cape has a faceted curve. Four fingers form one bending block with a separate thumb.

Muscle uses authored local morphs with pinned shoulder/elbow seams; the old scene-scale vertex rewrite was removed. The regression test reproduces the original scale conditions. Visible recipe geometry: Ascendant 1,348 triangles; heavy mercenary 1,932; agile mercenary 1,824; robot 1,280. The whole optional-parts asset contains 2,836 triangles.

Portable recipe export/import is verified. Full native Studio profile persistence for these outfit recipes remains separate. Current expressions are manually selected; the existing Psyche runtime can supply emotion events in a future integration. New gallery: artifacts/marketing/modular-character/index.html; motion: modular-recipes.webm; portrait: mercenary-portrait.png.

## Latest checkpoint

See `CHARACTER_CONTENT_AUTHORING.md` and the September 13 addendum in `MODULAR_CHARACTER_PIPELINE.md` for current implementation and verified limits. The earlier four-recipe/rigid-cape/count notes above are historical. Vegas is now bald and capeless. Female emblem and robe trim intersections are repaired. The animal workshop preserves the exact original clips; creature gameplay and digitigrade bodies remain tracked in issue #56. No fleet work was imported.
