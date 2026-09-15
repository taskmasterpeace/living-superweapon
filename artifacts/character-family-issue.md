## Current checkpoint

Local branch `codex/playable-integration` now contains the modular humanoid workshop and an authored quadruped workshop. Humanoid modules include body-wide musculature, female morphology, optional gear, joined-finger glove styles, robe panels/sleeves/collar, glasses, transparent image insignia front/back, and portable recipes. Vegas is black/old gold, bald and capeless. Wolf/Husky each preserve 12 original Quaternius CC0 clips. Existing flight controls and native flight posing remain intact.

The detailed implementation handoff is `docs/CHARACTER_CONTENT_AUTHORING.md`. These workshop additions are not yet a complete in-game roster/creature replacement.

## Remaining work and concrete approach

- [ ] Thermavari digitigrade proof: separate `pw-digitigrade-v1` skeleton with forward knee, raised backward hock and toe contact. Target 7.5 ft head-crown height, excluding fins. Retarget authored locomotion using ground-contact landmarks before authoring the full armor. Never reverse a human knee.
- [ ] Original alien quadruped: author the supplied silhouette on the animal family; retain toe/shoulder/hip contact landmarks and retarget to its longer forelimbs. Current hunter hound is only a tinted/resized wolf study.
- [ ] Complete canine suite: source or author a distinct trot/run, knockdown and get-up; add a paired pounce/victim sequence. Keep missing mappings null until real clips exist. Do not reverse Death as recovery.
- [ ] Pounce gameplay: simulation owns launch, hit contest, contact, damage, release and recovery; source animations follow outcomes. Test miss, blocked/evaded strike, successful knockdown and interrupted bite. Both native player and AI consume the same intent/outcome rules.
- [ ] Creature ragdoll: species-specific shoulder/hip/hock constraints and mass/contact radii; don't apply humanoid elbow/knee limits to dogs.
- [ ] Dedicated infected clips: shuffle, lunge/bite, crawling and recovery. Existing infected recipes currently reuse humanoid motions. Test different body sizes and torn clothing through full clips.
- [ ] Wardrobe batches: base body garments → military/free company gear → Ascendant suit/armor/cape → caster robe/hood → infected tears → Thermavari armor → quadruped harness. Use skeleton/slot/material/compatibility metadata and the authoring loop in the handoff document.
- [ ] Full native recipe persistence: validated workshop recipe, including uploaded insignia, must survive Character Studio save/load, selection, spawn and respawn. Current Studio link opens the base rig rather than the entire outfit recipe.
- [ ] Per-roster metric heights: one head-crown measurement excluding hair/gear; quadruped shoulder/length measurements. Preserve `.19 metres/world unit`; do not change physics scale to fit art.
- [ ] Insignia policy: no automatic insignia on exposed Rage skin; separate cape mount; native roster mapping and portraits use the same appearance source. Confirm Sol/Sandra symbols with character designs.
- [ ] Clothing fit coverage: source rest pose + muscle extremes, male/female and frame variants; stand/walk/sprint/punch/sword/flight front/back/both sides. Robe trim surfaces must not overlap; female chest insignia uses fit morph.

## Acceptance

Every shipped family includes editable source, runtime GLB, source/license/hash manifest, explicit supported/missing clip list, normalized weights, finite bounds, a reproducible builder and motion video. Compare source and exported bone paths at 0/25/50/75/end plus loop seam. The animal conversion now packages original track bytes rather than Blender baking that shortened clips. Screenshots alone do not certify animation quality.

Dependencies: #23 character catalog, #35 animation library, #21 melee equipment, #20 airborne recovery, #41 repeatable AI tests. Do not import the separate fleet worktree until the creator says it is ready.
