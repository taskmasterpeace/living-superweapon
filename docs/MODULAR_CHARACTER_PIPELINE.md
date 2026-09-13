# Faceted modular character pipeline

## Contract

The body key is `faceted-v1`. It changes presentation only: identity, abilities, collisions, native height and flight controls remain driven by existing data. `/studio.html?hero=vega&body=faceted-v1` opens an unsaved Character Studio draft; the existing save/play-test controls remain available.

Original geometry uses the Quaternius Universal Animation Library deform skeleton, `ual-deform-v1` in the manifest. Parts have rigid bone weights suitable for angular joints; hands use one joined four-finger block plus a separate thumb, each with bending segments. This is a skinned GLB, not a voxel simulation. Preserve bone names, rest transforms, hierarchy and scale for compatible modules.

Authoring units are meters, nominal height 1.8325. Runtime maps this envelope to the existing character's head-height envelope. Preview size multipliers do not redefine gameplay hitboxes.

## Rebuild

Run from the worktree root with Blender 4.5:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 4.5/blender.exe' --background --factory-startup --python tools/build-modular-character.py -- 'assets-src/modular-character/source/AnimationLibrary_Godot_Standard.gltf' 'public/models/modular-hero'
```

Original source files and CC0 license are under `assets-src/modular-character/source/`. They were found in the existing main workspace; previous reduced pose banks omitted sword motion. Do not claim that no sword animation exists.

Outputs:

- `assets-src/modular-character/modular-hero.blend`: editable parts before runtime grouping.
- `public/models/modular-hero/modular-hero.glb`: 2,836 triangles across all optional parts, 28 runtime mesh groups.
- `public/models/modular-hero/manifest.json`: 78 editable modules, source hash, units, skeleton and clips.

The builder overwrites generated outputs. Keep reproducible changes in the builder; archive manual Blender work separately before rebuilding.

## Parts and faces

Slots: head, hair, visor, expression, torso, waist, belt, arms, gauntlets, shoulders, legs, boots, knees, hands, cape, emblem, helmet, vest and backpack. Suit, accent and skin materials can be recolored. Soldier equipment uses shared `heroModelOf` defaults.

`setModularExpression(meshes, id)` supports neutral, happy, angry, talkA, talkB, surprised and sad. Compatible heads must retain the same front expression UV patch. Eyes, eyebrows and mouth use a shared canvas texture; the visor is independently optional. This is expression presentation, not automated lip-sync.

`setModularMuscle(meshes, amount)` accepts 0.8–1.3 and blends authored arm shapes without changing joints. Authored morph targets change only middle arm sections; shoulder and elbow seams stay fixed. No rest vertices are rewritten. Larger body types require deliberate proportion modules; do not stretch every joint arbitrarily.

## Animation ownership

Twelve original clips: A_TPose, Idle_Loop, Walk_Loop, Sprint_Loop, Jump_Loop, Punch_Enter, Punch_Jab, Punch_Cross, Sword_Idle, Sword_Attack, Hit_Chest and Death01.

Authored clips own combat poses. Native strike startup/active/recovery selects animation phases; animation does not apply a second damage event. Heavy unarmed attacks currently reuse Cross and need a dedicated clip. One-handed sword/katana/knife presentations use Sword_Attack; axes, bats and two-handed weapons are not completed by this change.

Native procedural movement owns flight, aim, guard, grab and ragdoll presentation through `modular-flight.js`. The adapter copies orientations while preserving source bone lengths. Aerial authored strikes preserve source arms over the native flight body. The actual equipped sword follows the source hand using its existing grip center, so presentation and contact readers use the same object.

The preview samples TPose fingers for open flight hands and punch fingers for fists. Full native state-driven finger selection remains a follow-up. The rigid cape is not cloth simulation.

## Adding content

1. Use this skeleton in Blender; author geometry with established slot and material names.
2. Import an actual animation source, preserve metadata/license and verify its rest pose. Do not relabel procedural approximations as authored sword animation.
3. Export and compare wrist, fingertip, head and hip transforms against the source at several phases.
4. Inspect punch, weapon grip and flight from multiple angles; use an unsaved Studio draft before roster rollout.
5. Record a short motion clip and document supported actions and gaps.

Validation:

```powershell
$env:LSW_TEST_URL='http://127.0.0.1:5184'
node --import ./artifacts/test-css-loader.mjs --test tools/modular-character.test.mjs tools/flight-language.test.mjs tools/studio-profile.test.mjs
node tools/character-foundation-review.mjs
node tools/modular-expression-review.mjs
node tools/modular-native-review.mjs
npm run build
```

The loader ignores CSS imports for engine tests. Tests check source-motion fidelity within 2 mm, bone lengths, unchanged native motion state, weights/triangle budget, actual sword grip alignment, async teardown and reversible muscle edits. They cannot certify that fighting feels good; browser review remains required.

## Shared recipes and the modularity proof

`src/engine/modular-costume.js` holds four data recipes: athletic Ascendant, broad Black mercenary, agile Black female mercenary and armored automaton. All use the same skeleton and authored clips. Frame ratios change width, height and depth; head scale is compensated to preserve the common head and attachments. The agile torso also uses an authored waist-taper morph. These are starter frame presets, not a complete anatomy editor.

Hair modules use `slot=hair` and `variant=swept|afro|bun|braids`; `none` hides them. Helmet, wraparound visor and eye patch attach to the shared head bone. Face UVs and expressions remain common across all recipes. Cape has a curved, faceted cross-section but remains rigidly weighted, not simulated cloth. Boots have tapered shafts and sloped toes.

Four outfit channels are primary/suit, secondary/armor, trim and insignia. Skin, hair and eyes have separate colors. Emblems include triangle, shield, bolt, star, V and none. Eye emission affects the eyes only. The preview does not automatically map emotions to expressions; the existing runtime is `src/engine/psyche.js` and data is `src/data/psyche.js`.

The workshop exports and imports JSON with `schema:1`, `skeleton:ual-deform-v1`, `body:faceted-v1` and the recipe fields. Imports validate enum values, colors, flags and size/muscle bounds before changing the character. This recipe format is not yet merged into the full native Character Studio save schema; the Studio link opens the base rig, not the entire exported outfit.

The muscle bug was reproduced with an unchanged slider value: it moved rest vertices by up to 1.26 source units because `bindMatrixInverse` included scene scale. Authored local morphs replace that calculation. The regression test runs at nonuniform world scale and verifies that shoulder/elbow seam vertices remain stationary.

Review commands: `node tools/modular-recipes-review.mjs` captures four recipes and motion; `node tools/modular-recipe-roundtrip.mjs` verifies export/import plus expression and eye/headgear controls. Evidence is under `artifacts/marketing/modular-character/`, including `modular-recipes.webm` and `mercenary-example.json`.

## September 13: base-body and creature checkpoint

Current details supersede the early prototype counts above. The humanoid asset is 3,256 optional triangles in 39 material/slot groups. Base male/female, body-wide muscle, wrap belt, optional clothing/armor, glove colors and joined-finger fingerless gloves are implemented. Cape uses a bounded lower-panel bend; it does not run the legacy cloth solver. The new body's ragdoll has bounded knees/elbows in addition to the neck constraint, with a drop-inspection mode. Full anatomical twist limits remain future work.

Transparent PNG/WebP insignia upload is visible in the workshop and roundtrips through recipe JSON. Front/back body and gear mounts are separate. Female chest fit now keeps the emblem visible; robe trim uses adjacent surfaces instead of overlapping polygons. Vegas is bald, black/old gold and capeless in the workshop and opt-in native modular renderer. Existing native models are not migrated wholesale.

Robe panels, flared sleeves, collar, torn shirt tabs and glasses are optional. Infected presets are appearance studies using the humanoid library, not completed zombie AI/animation kits. The quadruped workshop contains Wolf/Husky with 12 original Quaternius clips each; the GLB packager preserves original animation bytes rather than baking shortened tracks. Source comparison: 840 landmark samples, zero position/duration error. Distinct run/trot, knockdown/get-up and paired pounce are still missing.

Character/flight/profile/ragdoll regression suite: 59 passing. Browser clothing/animal review and transparent emblem roundtrip pass. Source fidelity is separately checked by `node tools/quadruped-source-review.mjs`. Footage: `artifacts/marketing/modular-character/creature-and-clothing-review.webm`.

The family/wardrobe handoff is `docs/CHARACTER_CONTENT_AUTHORING.md`. Outstanding digitigrade rigs, alien quadruped art, creature gameplay, full wardrobe and complete native outfit persistence are tracked with concrete approaches in https://github.com/taskmasterpeace/powerworld/issues/56. Do not describe these as completed merely because preview animals animate.
