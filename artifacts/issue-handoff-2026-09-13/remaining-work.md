## Purpose
Master handoff for the remaining combat/movement slice and deferred requests. Existing issues remain the implementation owners. This is not a claim that every existing feature is broken, nor that a prior unit test proves final acceptance. Inspect current code and evidence before repeating work.

## Verified local checkpoints to preserve
- f0d9d69: transport Z seat cycling, prototype pilot station, 16-gate curved Threat Room circuit. Manual piloting remains separate.
- b50340b: integrated staged six-person sample recovery -> return -> native lab analysis -> combat again passed; lab-doorway yielding improved. Sample research is operation-local +10 energy capacity, up to +30; no automatic energy refill or replacement-reserve minting.
- 36ebcbb: WEBLINE instanced chain presentation and native player pull/hold/release.
- 363adaa: visible-target AI anchor planning, paid native pull and release. Not general roof navigation.
- These are LOCAL checkpoints on codex/playable-integration, not proof of a correct GitHub release or physical iPhone validation.
- Report/evidence index: docs/reports/TRAINING_FACILITY_CHECKPOINT.md; artifacts/marketing/. Full objective remains the original combat-and-movement goal, including all 27 requirements.

## Action order and ownership

### 1. Combat and movement first
- [ ] #14: finish approachable melee against moving opponents on ground/in air, committed dodgeable entries, combos, heavies, energy-first frontal guard, grabs/counterplay, aimed terrain throws and vehicle/prop contact. Solve through shared move families and native hit/guard/grab events, not per-character bespoke controllers. Prove walking retreat cannot trivially defeat entry while timely dodges and obstructions still work.
- [ ] #19: finish JELANI tackle identity, RAGE limited-steering leaps and WEBLINE chain/leap transitions. Audit JELANI first: current search found its character definition but no dedicated tackle evidence in the checkpoint report. Reuse approach/contact/animation ownership; distinguish ordinary traversal from damaging committed tackle. Match AI to player capability, energy and interruption rules.
- [ ] #36: retain VOLT ground speed/momentum glide; verify the enlarged bubble's 0.25 projectile speed inside and restoration outside, without permanently altering shot velocity. Preserve counters, energy cost and independent visual identity.
- [ ] #30: finish projectile velocity inheritance, attack-specific speed, controllable grenade arcs and capable airborne AI. TEMPEST needs native wind/hover/combat evidence and bounded storm cleanup preserving map weather. RIME board ascent/descent needs pose review.
- [ ] #15: finish traveling-beam range, charge scaling, bounded boosted charge, ground impacts and varied attack shapes. Never replace traveling hoses with hitscan. Show useful hit feedback at the actual contact, including night/day ground illumination if retained in scope.
- [ ] #20 + #37: distinguish controlled flight, recoverable launch, uncontrolled fall and KO ragdoll; constrain bodies, blend recovery and track the launched body from the anchored death camera. Define landing protection before general fall damage.
- [ ] #34: friendly pickup, flight carry, drop/catch/rescue without friendly attack damage or duplicate movement ownership; verify grab eligibility by strength/body/capability policy.
- [ ] #16 + #18 + #29: back-side camera/Alt head look, upward framing, prone clipping across relevant conditions; keep C crouch, contextual Z seat switching aboard, double-tap directional dodge and Shift speed tiers. Preserve the deferred existing-HUD flight icon whose wake grows with actual speed; no standalone gear box or wider-FOV substitute.

### 2. Teaching and reusable authoring
- [ ] #6 + #41: Danger Room-style threat selection, preview then fight, stationary/retreat/block/dodge drills, moving/airborne soldier targets, gadgets, teammates, flight circuit and multi-angle/slow review. Real walls/collisions, reset ownership and replay TV remain testable. Make the room explain the actual rules without a sprawling extra HUD.
- [ ] #14/#22: actual-reach reticle; explicit range/dodge/obstruction/interruption miss reasons; combo step; block flash/sound; guard-break countdown; pre-grab eligibility; actual throw trajectory; damage symbols/colors and flesh/metal impacts. Verify cues correspond to native outcomes, not predicted guaranteed hits.
- [ ] #6: station control labels from live bindings, one-action last-scenario repeat, melee/beam distance markers, measured damage/energy/recovery. Verify resets retire actors, effects, sounds and colliders once.
- [ ] #35: animation library includes current clips, multi-angle preview, scrub, editable contact/recovery markers, favorites, assignment to reusable move families and AI-facing import/validation contract. Validate hands/grips, paired grab/carry, interrupted recovery and body-size compatibility. Missing animation/audio badges must reflect real assignments.
- [ ] #23 + #38: canonical character data feeds selection, squad type/threat hierarchy, attack summaries, sortable comparison/details and spreadsheet export. Class, movement and equipment policy stay independent. Favorites and per-attack drill-down must use the same live records.
- [ ] #23 + #39: modular body/outfit/color/emblem/emitter proof, front/back preview, appearance consistency between studio/select/runtime; Vegas black/old-gold identity and correct fists. Extensible aura recipes and text-to-hero validation are authoring work, not a second runtime. Use our art style. Arma reference is https://github.com/bohemiainteractive/cwr; character-creator references require actual source analysis before claiming adaptation.
- [ ] #21: reusable weapon/grip/animation authoring for swords and other signature melee weapons. Keep generic supported shared families first.

### 3. Audio, gadgets and the operation
- [ ] #28 + #17: standalone organized Sound Library, add/reassign AI one-shots/loops/variants, missing assignments and ambient emitters, documented worker import contract. Complete remaining assignment/mix/interruption/concurrency work. Browser clips without audio and synthetic dispatch tests do not prove listening quality.
- [ ] #31 + #32: live gadget catalog/inventory rules (soldier guns/backpack; non-soldier LSW max two gadgets/no backpack), both slots usable, compact military scanner gated by its gadget, throwable transport beacon, worn jump jets, anchored grapple, dome and turret. Dome rule: allies shoot out, incoming shots stop, everyone can walk through. Use shared equipment/placement/ownership/cleanup, not bespoke full-screen overlays for handheld gadgets.
- [ ] #33 + #6: deepen blood/body recovery, degradation display and research without replacing the already working mechanical loop. Define clear win conditions and research choices. Loss rule: no player-controlled fighter alive and no eligible replacement remains. Keep clone/portal reserves finite and prevent duplicate rewards. Soldier side recruits one LSW; LSW side supports five companions, stress configurations separately gated.
- [ ] #42: shared vehicle seats/boarding/role system. Z already works on squad transport; migrate a second vehicle to prove reuse. Do not spend repeated full-route runs on isolated failures.
- [ ] #11 + #24: remaining native raised-ramp beam/projectile contact, blocked exits, crash/KO/reset, varied landing rotation and exact parked-jeep/invisible-mountain/jet collider repros. Preserve truthful physical boundaries. The integrated staged route pass is not acceptance of every vehicle layout.
- [ ] #26 + #10: vehicle handling, manual pilot controls when scheduled, cockpit and authored scale/door/chair contracts. Reconcile other worker contributions before changing their modules.

### 4. World/art and release gates
- [ ] #12 + #13 + #7: consistent transport-inspired world style, useful enterable lab and industrial spaces, wilderness roads/trees, bounded damaged-state swaps and affordable shading. Measure foreground performance with representative combat cues preserved; do not infer GPU cost from throttled background RAF.
- [ ] #25/#33: terrain destruction research, building wreckage/cover removal, destructible/pickable tree starter kit, blood/body presentation. Validate collision/LOS changes with visible damage states. Skyscraper interiors and wholesale destruction are not currently established.
- [ ] #5: landscape touch-first controls, target assistance, context buttons and legible inventory/gadgets; full combat/operation through real input adapters. Controller acceptance remains required too. Physical iPhone testing is explicitly unverified and needs device evidence.
- [ ] #4: scoped review, local checks, clean commits, push to the correct powerworld remote (not unrelated origin), player changelog, collected evidence index, Mac setup and versioned save transfer/rollback. Keep workers' changes intact. No paid cloud CI required for local verification.

## Deferred requests retained, not silently discarded
- #8 native ambush interception/campaign continuity; #9 background channel behind approved character selector.
- #40 arcane duplicate caster/body switching; #3 TRENCH water-specialist redesign.
- Future asset family: fighter jet, tank, motorcycle, armed ATV, passenger van using shared seat/scale/rig contracts (#10/#42).
- Campaign resources/research progression, branching operations, zombie reskins/behaviors/audio, explicit police-to-military pursuit and radio callouts (#6/#33/#17).
- Side-by-side character comparison, shareable Threat Room scenario codes, training attack-path visualization, cue-preserving performance preset, last-three-hits death explanation, optional tutorial input display, content dependency view, one-click bug bundle, reduced flash/shake and versioned character saves. Place these in the relevant authoring/training/accessibility owner when scheduled; #41 covers the reusable scenario/event/bundle substrate. These requests are not certified implemented by this issue.

## Remaining validation policy — stop wasteful repetition
Use #41's shared scenario runner. Inspect existing evidence first; run focused tests for a change, then one meaningful native capture/integrated gate. If two equivalent failures occur, retain the live handle or collect a diagnostic bundle and fix the identified cause before another full run. Never alter acceptance to match what happened. Distinguish fixture, simulation, native keyboard/controller/touch, physical device and listening evidence. Close children only when their own requirements are demonstrated; do not close this rollup because the list is documented.
