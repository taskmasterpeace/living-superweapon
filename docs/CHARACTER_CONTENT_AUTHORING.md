# Shared character content: authoring handoff

This is the repeatable Power World costume pipeline, inspired by City of Heroes' modularity. It is original geometry and a shared content contract, not a promise that one human skeleton can animate every species. Preserve existing flight controls and native flight poses; keep authored combat clips.

## Implemented now

- Humanoid workshop: base male/female, athletic/heavy/agile/machine frames; shared face/expression UVs; hair, visor, glasses, eyepatch; four costume color channels plus skin/hair/eyes/gloves.
- Muscle morphs affect chest, deltoids and upper arms without relocating shoulder/elbow seam vertices. Female morphology is independent from frame choice.
- Optional chest gear, shoulder armor, forearm armor, kneepads, wrap belt, backpack, cape, robe panels, flared sleeves, collar and torn shirt tabs. These are starter modules, not a complete wardrobe.
- Bare, full and fingerless gloves use the same joined-finger geometry. Preserve the source finger chains even though four fingers are visually joined.
- Transparent PNG/WebP insignia upload; front/back/both; embedded image survives recipe export/import. Emblem geometry fits the body/vest/backpack, with female and muscle morphs. A cape can obscure a back patch; cape emblems are a separate future mount.
- Vegas workshop recipe: black/old gold, bald, no cape. This is a workshop recipe, not a forced replacement of the native roster model.
- Infected civilian/heavy recipes use the humanoid clips. Their current motions are not yet specialized zombie shuffles, crawling or biting.
- Robe panels follow thighs; flared sleeves follow forearms; cape uses bounded bend. No new cloth simulation.
- New quadruped workshop imports Wolf/Husky with 12 original Quaternius clips each. These are source animals, not custom final alien models. Hunter hound is explicitly a size/color study.
- Humanoid preview ragdoll constrains elbows/knees and retains neck limits. It is not a quadruped ragdoll or full anatomical joint system.

## Rig families and release gates

| Family | Skeleton contract | Reuse | Still required |
|---|---|---|---|
| Human, Ascendant, civilian infected | `ual-deform-v1` | Existing authored clips, face UVs, costume slots, native flight adapter | Full wardrobe fit matrix; dedicated infected clips; native complete recipe save/load |
| Thermavari / digitigrade humanoid | Planned `pw-digitigrade-v1` | Material channels, upload format, equipment categories, upper-body clip sources | Real knee→hock→toe chain, authored retarget, contact validation, family ragdoll |
| Dogs / wolves | `quaternius-animal-v1` | Animal source clips, metric imports, review tools | Distinct trot/run, get-up, knockdown, paired pounce victim; game actor/AI integration |
| Alien quadruped | Planned derivative of animal rig | Animal motion sources after limb-length retarget | Original silhouette, claws, tail/armor modules, support contacts and pounce |

Thermavari knees point forward. The backward lower-leg silhouette is the raised ankle/hock. Never implement a backwards human knee. Reference height is 7–8 ft; first target 7.5 ft. Long low arms, narrow waist, asymmetric shoulder plates, black mask/heat visor, sensor fins and orange heat channels are silhouette requirements. Preserve the Pyre Core as its own effect mount. The user's reference brief is the source of these requirements; heat weapons and powers are separate gameplay tasks.

## Scale contract

Source assets use metres. The engine remains `METERS_PER_UNIT=.19`; import using `metersToUnits`. Never change global physics scale to make one mesh fit.

Humanoids need a documented bare-foot→head-crown height in a reference rest pose, excluding helmet, hair, horns and cape. Quadrupeds need shoulder height plus nose→rump length; total tail length is separate. The animal workshop uses the shoulder landmark and the actual rendered body's ground bound, rather than Blender helper/control bounds. It displays a six-foot head-crown humanoid reference. The old native character workshop retains the established native body envelope for compatibility; a complete per-roster metric height migration is still required before wholesale replacement.

## Clothing production batches

1. **Foundation:** male/female base suit, bare arms, full sleeves, shorts/trousers; fitted ordinary shoes and boots. Verify muscle extremes .8/1.3 and all four frames.
2. **Military / free companies:** vest, jacket, tactical belt, pouches, backpack, helmet, gloves/fingerless, shoulder and knee protection. Helmet/hair exclusion and arm/vest clearance must be explicit.
3. **Ascendants:** fitted suit, gauntlets, asymmetrical shoulders, wrap belts, short/long capes, chest/back insignia mounts. Rage's skin stays uncovered and his recipe defaults to no insignia; do not stamp logos on every character.
4. **Magic:** split robe, short tunic, high/low collars, flared sleeves, hood, waist sash. Existing robe is a first module; do not claim every attack has zero garment intersection. Check both thigh panels through stride/punch/flight and sleeve/weapon contact.
5. **Infected:** torn versions of civilian and military garments, skin variants and hair. Use discrete silhouettes/damage variants rather than generating new rigs for each zombie.
6. **Thermavari:** digitigrade leg armor, claw feet, mask, asymmetric pauldrons, heat-core chest, vented spine, torn hunting cloak. Build after digitigrade support-motion proof, not on a broken human leg conversion.
7. **Quadrupeds:** harness, collar, segmented body armor, species head/tail/feet variants. Exclude human helmets and boots through family compatibility.

## One AI authoring loop

1. Read `tools/build-modular-character.py`, `src/engine/modular-costume.js`, `public/models/modular-hero/manifest.json` and this contract. Start from `assets-src/modular-character/modular-hero.blend` for humanoids. Do not recreate bones from a reference image.
2. Pick one named module with `slot`, optional `variant`, skeleton version, material channels, supported families/frames, and incompatible modules. Use `MODULAR_SLOTS` as the implemented slot list. Document future slots before adding them.
3. Retain bone names, rest matrices, origins and source actions. Rigid pieces mount to driven bones; deforming garments need appropriate skin weights. Do not parent gear to undriven intermediary objects.
4. Fit the module at all supported proportions. Use authored corrective morphs for clothing fit. Keep insignia planes flush with the garment, and give adjacent trim its own non-overlapping surface.
5. Export GLB plus editable source and recipe. Keep source URL/license/hash, bounds, triangles, slots, skeleton and clip names in a manifest. Do not import fleet assets from the other worktree before the user says they are ready.
6. Validate source→target clip fidelity, normalized weights and finite bounds. Inspect start/25/50/75/end and loop seam; camera front/back/both sides. For garments check standing, walk, sprint, punch, sword hold/swing and native flight. For legs check ground contacts; for hands check the real held prop.
7. Capture one short motion video and a comparison sheet. Record unsupported combinations. Pass the recipe/source/manifest/tests/evidence to the next iteration. A pretty still alone is not acceptance.

## Animal animation source and remaining combat sequence

[Quaternius Ultimate Animated Animals](https://quaternius.com/packs/ultimateanimatedanimals.html), CC0. Source `.gltf` and editable `.blend` are under `assets-src/modular-character/animals`; rebuild with `tools/build-quadruped-library.py`. Source `Attack`, `Death`, `Eating`, `Gallop`, `Gallop_Jump`, `Idle`, `Idle_2`, `Idle_2_HeadLow`, `Idle_HitReact1`, `Idle_HitReact2`, `Jump_ToIdle`, `Walk` are present. `run`, `knockdown`, `recover` and `pounceVictim` intentionally map to null in `QUADRUPED_ACTIONS`.

A dog pounce must be paired: launch → collision contest → bite/contact or miss → victim knockdown/reaction → release → recovery. Simulation determines hits, guard/grab contests and damage. Animation follows that result; a jump clip by itself must not guarantee a knockdown. Canine shoulder/hip/hock constraints must be distinct from humanoid elbow/knee limits. Never reverse `Death` and call it a get-up animation.

## Verification commands

```
node tools/creature-clothing-review.mjs
node tools/modular-emblem-review.mjs
node --import ./artifacts/test-css-loader.mjs --test tools/modular-character.test.mjs tools/ragdoll-joint-limits.test.mjs tools/flight-language.test.mjs tools/studio-profile.test.mjs
npm run build
```

Set `LSW_TEST_URL=http://127.0.0.1:5184` for engine/browser checks. Keep Vite source stable while the tests run. Native full-roster migration, creature gameplay/AI and paired contact actions are outstanding, not implied by workshop playback.

## Shared pipeline update: wardrobe and full skeleton motion

Run `node tools/verify-character-pipeline.mjs` with the development server at port 5184. This runs the focused checks and records a single browser review. Pass `--rebuild` to regenerate the Blender asset and mapped motion bank first. It does not rewrite the roster or edited review workbook.

The COH-inspired contract is a saved recipe over a stable skeleton: anatomy/frame, body proportions, region slots, four outfit color channels, skin/hair/eyes, accessories and front/back insignia. Modules share fitting rules rather than becoming separate character rigs. Female anatomy is supported. Boxing gloves replace hands/hand tips and exclude gauntlets/wristbands; shoes use calves and exclude boots; wristbands require exposed forearms. See the generated manifest's slotContract. Broad mix-and-match compatibility still requires pose review; do not promise every future garment is clipping-free.

Outfit pattern uploads accept PNG/WebP up to 1 MB and 2048 pixels per dimension. Prefer a seamless 512×512 image. New garment UVs use a 0.25-meter tile period; patternScale controls repetition. Skin infection marks use the existing surface, avoiding overlapping transparent geometry. Transparent chest/back insignia remains a separate upload. Gilt is an original black/gold pattern, not a copied fashion logo.

`tools/build-modular-motion-bank.mjs` retains full authored tracks, including wrists/hands. It proves source/target hierarchy and rest/bind compatibility before mapping 53 matching joints on the same anatomical side. The optional bank contains 29 clips; it is about 14.8 MB JSON and must remain lazy-loaded. In Animation Library choose Load full-skeleton motions. These use the modular Vegas reference body; they are source-motion review, not per-roster gameplay assignments. The Character Foundation source-take selector uses the same bank. Do not route this rig through the old reduced segment-direction pose format, which loses hand detail.

Current preview coverage includes bat, axe, sword/shield, boxing mitts, zombie idle/walk/scratch, roll, LayToIdle, sword guard, climbing and slide candidates. Bat and axe currently demonstrate the shared one-handed sword swing: dedicated combat bat/axe and two-handed grips remain unapproved. Source clip availability is not combat readiness. Contact timing, interruption, simulation displacement, recovery, weapon fit and AI usage need explicit gameplay assignments.

Healthy native flight remains procedural. The infected studio overlay points both arms toward world down and preserves bone translations. Live infected state selection remains separate. The side-shooting dive is still a planned action: Sprint + lateral movement + Jump; consume that chord once and suppress accidental flight takeoff until Jump release. A grounded living recovery may use an approved get-up clip; KO never automatically plays one. See ANIMATION_INTEGRATION_AUDIT.md for state ownership and missing footage.

The review exporter preserves existing edits by default. Use the workbook to specify each character's look, sprint and flight before replacing the roster. Before photos are archived; after photos must be captured from the implemented candidate, never fabricated.

Measured visible presets are roughly 1,026–1,852 triangles and 16–26 scene draw calls. This is a geometry audit, not a crowd performance benchmark. Prefer contact/baked shading first; optional screen-space AO needs a representative crowd GPU test.

## Clothing upload and infected readability follow-up
Clothing uploads now accept PNG/JPEG/WebP up to 12 MB, decode before applying, and normalize to at most 512 pixels while preserving aspect ratio. The stored WebP fits the existing recipe format. Feedback is beside the button; a decode failure preserves the last valid pattern. tools/infected-upload-review.mjs verifies a 2200-pixel JPEG, actual loaded fabric texture, recipe validation, and visible decode errors.

Rupture is now the default infected preset: stronger branching crimson marks, raised-looking painted lesions, red eye surrounds and mouth staining, pale eyes and gray skin. Garment colors are muted and default torn clothing is off. This is a surface change on the existing model, with no extra colliders or geometry. Compare infected-before-strengthening.png and infected-stronger-rupture.png under artifacts/marketing/modular-character. Healthy and infected flight poses are unchanged.

Wardrobe follow-up: five reusable cape silhouettes (full, short, split-tail, one-shoulder, high-collar), with an authored horizontal bend row and limited pose deformation. Avoid a cloth-physics rewrite. Keep chest armor, belt/pouches, backpack and cape independent, with explicit compatibility rules. These cape variants remain planned.
