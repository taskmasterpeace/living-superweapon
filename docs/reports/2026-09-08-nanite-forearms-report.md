# Nanite forearms — Task 4 Studio implementation

Date: 2026-09-09. Scope: the accepted Task 4 authoring slice, not a claim that every nanite capability or projectile family is complete. Parent owns final independent review, moving/audio reel acceptance and checkpoint updates.

## Implemented boundaries

- `studio-combat.js`: source-qualified `nanite` pattern, genuine finite-HP hostile incoming Fighter separate from the autohealed outgoing measurement dummy; native movement intent, Guard, `runSlot`, one Fighter update per actor, begin/end melee contact, one native projectile update/launch prepass and presentation-only refresh after contacts. No copied regeneration, hitstop, repair or damage formula; no engine pose/contact changes.
- Fixed eight-second choreography: cannon press/release .8/1.5; Guard 2–3.9; incoming emission 2.4; fresh cannon press/release 4.2/5; shield toggles 6/6.3. Authored assembly/repair can legitimately deny scheduled input. KO retains finite HP and stops new choreography; no owner autoheal or respawn. A post-KO inspection may retain the native terminal body until reset.
- Precision incoming projectile sample: raw30, radius.035, speed30, no splash, finite two-unit initial travel from the current final cell. It is a scripted ballistic contact fixture, **not proof of a source weapon's muzzle or AI firing**. The hostile actor is visibly staged at emission; native contact/defense decides arrival, winning cell, absorption and residual HP. Moving/recoiling cells can miss or change the winner.
- Incoming punch is native `MeleeSystem.chargeStart/chargeRelease`, a light input at2.35/2.4 with a4.8u start. Retained distant-motion settings are inactive for this sample; native recoil still applies. In a dual selected sample the earlier cannon can legitimately knock the attacker out of reach. The browser's clean punch proof explicitly selects only the shield; it does not freeze or undo the cannon's damage/knockback.
- Pose-only model/generic attack previews advance installed nanites once; existing full-update melee/jump paths do not double-tick. Rewind rebuilds nanite-bearing model actors. Ninety seek-settling frames retain positive presentation dt but zero simulation dt. Each native-pattern actor starts from animation time zero, rather than its constructor's randomized idle phase.
- `studio-preview.js`: transient1×/.25× playback rate before the existing fixed60Hz accumulator, source-effective validation before actor/draft mutation, exact8s transient cleanup and atomic two-entry forearm-swap candidate. Eight seconds is an inspection endpoint, not module lifetime. Cleanup retains cells and measured totals. Rate, choreography, HP, runtime cells and telemetry are never profile/package fields.
- `studio-main.js`: Formation in the existing Attack inspector; anatomical forearms; source-owned family/origin; native stage settings; read-only integrity/quiet/reform/HP/absorption/outgoing telemetry; atomic Swap forearms; effective profile validation before history, save, export, import selection and the unsaved-draft save prompt. The portable recipe is rebuilt from the genuine local catalog before package preflight.
- Parent-authorized icon extension only: fixed segmented-shield and forearm-barrel SVG silhouettes, plus `TYPE_META.naniteShield={family:'defense',req:[],hold:false}`. No old type mapping, hold scheduling, ability implementation or source cost/cooldown changed. Malformed sources do not acquire the source-specific symbol or ordinary Studio rehearsal eligibility.

## Callable inspection seams

`preview.setCombat({pattern:'nanite',slot,secondarySlot,naniteSample})` accepts a genuine selected cannon, shield, or opposite-arm pair. `naniteSample` is `shield`, `cannon` or `punch`; the requested form must be selected. Non-nanite secondary selection is rejected. `preview.setPlaybackRate(1|.25)` validates transient transport; `advancePlayback(wallSeconds)` uses capped wall time and the native fixed step. Camera/pause/zero-time calls do not replay input or advance cell state.

`combat.naniteStats()` returns fresh plain objects:

```text
hp, maxHp, ki, maxKi, alive, contacts, bodyDamage,
outgoingDamage, outgoingContacts, emitted, launches,
events[{time,attacker,target,slot?,cell?,kind,absorbed,bodyDamage,blocked}],
modules[{slot,form,attachment,phase,intactCells,totalCells,absorbed,
         bodyDamage,muzzleError,liveFragments,deployed,guarding,assemblyT,cells}]
```

Events are capped64. Module bodyDamage attributes only the actual local winning contact; aggregate owner damage is not duplicated across modules. Quiet delay and active reform are separate phases. Retired/locked/retracted/KO/structural denial precede ordinary readiness. Muzzle error is null before a committed launch, otherwise measured against actual aperture + launch direction × full physical radius. A committed shot remains counted even if its native travel contacts something in that step.

## RED → GREEN evidence

The first six native failures were genuine shield selection, late effective-pair rejection after actor removal, assembly never advancing, paid cannon not starting in either selected order, and missing quarter-rate transport. The90 zero-sim settling invariant already passed and was retained.

Subsequent discriminating REDs:

1. Model-only seek zero retained assembled state.
2. Native incoming punch telemetry used the wrong event discriminator.
3. No atomic forearm-swap candidate existed; sequential single-arm edits conflict.
4. Broken cells were labeled reforming during their quiet delay.
5. Stage instrumentation ran the native launch prepass twice; it now observes around the single production Projectiles update.
6. Native actors retained randomized constructor animation time through replay.
7. Disabled punch-path controls still drove the owner50.52197u away before contact.
8. Public shield icon was the generic utility plus.
9. Real package import with conflicting arms opened “Keep your draft? Save & continue” before discovering the conflict. It now rejects inside Import, before closing the dialog or touching the valid draft/storage/actor.
10. Actual Play Test boot reported public `naniteShield` missing TYPE_META; the new non-held defense entry closes that registration gap.

The seek matrix covers .65,1.5,2.45,2.8,4.1,5.2,6.1,6.8 and8 seconds. Semantic floating comparisons allow1e-6 for geometry-derived values; repeated zero-time snapshots must be exactly unchanged. Rebuilt epochs and their fragment seeds are intentionally not forced equal. Native clocks/cell HP/quiet/reform, finite KO, paid charges, Guard age, partial-hitstop freeze, singleton public sources, both selected orders, source replacement, exact endpoint and three moving body families are exercised.

## Verification

Full23-file gate (no test-name filtering):

```powershell
node --test tools/nanite-contact.test.mjs tools/attack-interception.test.mjs tools/beam-body-contact.test.mjs tools/beam-contact-feedback.test.mjs tools/moving-melee.test.mjs tools/melee-depth.test.mjs tools/nanite-emission.test.mjs tools/nanite-state.test.mjs tools/nanite-fit.test.mjs tools/attack-tuning.test.mjs tools/charged-emission.test.mjs tools/charge-energy.test.mjs tools/hand-contention.test.mjs tools/progression-rig.test.mjs tools/firearm-emission.test.mjs tools/construct-hit.test.mjs tools/nanite-studio.test.mjs tools/attack-icons.test.mjs tools/resource-construct-studio.test.mjs tools/studio-inspection.test.mjs tools/studio-audio.test.mjs tools/studio-profile.test.mjs tools/character-package.test.mjs
npm run build
$env:LSW_TEST_URL='http://127.0.0.1:5189'; node tools/nanite-browser.mjs
node .agents/skills/impeccable/scripts/detect.mjs --json src/tool/studio-main.js src/tool/studio-preview.js src/tool/studio-combat.js
```

Initial full gate783/783 passed in32,858.199ms; the punch-path addition brought the repeated full dot-reporter gate to784, exit0. The final registration case is included in the completed785 gate below. The UI detector returned `[]`. Existing project has no generic TypeScript/Vitest/lint scripts; native Node/browser/build commands are the documented adaptation, not a claim those absent scripts ran.

Browser outputs: `artifacts/nanite-studio/`. Actual UI workflow imports a genuine ORIGIN q/e pair, edits repair/stage/density, swaps anatomical forearms and tests Undo/Redo, rejects conflicting profiles and packages without valid-state mutation, saves, exports, imports under a newID, reloads and reopens both module inspectors. It also exercises silent audio-enabled seeks, moving shield contact, endpoint cleanup, reversed selected order, explicit one-HP KO and Play Test/HUD symbols. The original missing `/favicon.ico` is explicitly routed204 by the harness, not counted as a fixed application asset. No other browser error is filtered.

Completed pre-final UI run: small source-skinned female mirrored pair, ground-left owner / orbit-left target at requested10u/s. Incoming arrived2.45s: cell4 integrity12→0, absorbed12, owner106→98.44HP (7.56residual); no owner healing. Outgoing measurement60.79648HP across two direct/splash callbacks, separate from owner damage. Two committed cannon launches by5.5, finite sphere-center error0, shield restored9/9. Desktop1600×1050 and390×844 client/scroll width390 pass. The clean punch and native metadata/HUD extension are included in the final run below.

## Skill application and limits

Read the accepted brief/preflight, PRODUCT/design decisions and Studio DESIGN; used executing-plans/TDD, Game UI/Three WebGL guidance, project Impeccable craft floor/manual detector, Game Playtest and animation-authoring acceptance references. They kept the inherited gold/warm-neutral/Inter inspector and required real moving bodies/native contacts. No new animation clip, renderer, shader, source body, contact kernel, sound implementation, map or physics was added. Existing procedural and bundled Quaternius CC0 male/female bodies and native locomotion/Guard/cannon adapters remain authoritative. Parent's prior native Task1–3 source/target fit and real-control evidence remains separate from this scripted Studio fixture.

Open evidence is not erased: the first eight-Fighter/16-module Chromium pressure crash remains unexplained and unreproduced by two subsequent native4090 runs. A bounded no-render15-second/320-shot read-only soak found no runaway, but excluded GPU/DOM/news and used a1×1 impact-texture adapter. Parent's cold news/default-canvas shader stalls are also a separate open reliability/performance observation. Neither editor tests nor a warm reel closes those findings.

Task3 explicitly excluded sticky/delayed-arm/boomerang and unusual guided combinations from local-cell billing, plus piercing hoses/cones/AoE/DoT/grab/crush special lanes as documented there. This Task4 does not expand those claims. The bounded endpoint moving-cell approximation and inherited .03-scale bevel fit tolerance are unchanged. Arbitrary imported meshes, all attachment origins, future nanite capabilities and full user feel acceptance remain out of scope.

## Final worker verification / handoff

- Full exact23-file list above, `--test-reporter=tap`: **785 tests passed, 0 failed, 0 skipped, 0 cancelled**;31,562.1741ms, exit0. This includes32 nanite Studio tests and3 attack-icon tests. No filters or fixture-only skips.
- Final `npm run build`: exit0,280modules,6.58s. Existing large-chunk warning remains. Final three-file Impeccable detector: `[]`.
- Final `node tools/nanite-browser.mjs` against the isolated5189 server: exit0; `artifacts/nanite-studio/result.json` has `errors:[]`. Every real UI import/edit/swap/Undo/Redo/save/export/import/reload/reopen, rejection-before-mutation, playback/sample, mobile and Play Test assertion completed.
- Final moving ballistic sequence retained the measurements above: owner7.56HP residual, actual shield cell4 absorbs12 and breaks; two native committed launches by5.5s with sphere-center error0; repaired9/9 and empty stage ordnance at8s. Reverse primary/co-fire UI order also produced the native local cell4 contact and7.56HP residual (separate run outgoing60.7857341471HP).
- The explicit shield-only native punch sample emitted once and produced one real guarded body contact at2.5s,1.14605568HP chip. **It did not touch a shield cell** (absorbed0;9/9 intact); this is proof of native melee sequencing/ordinary Guard behavior, not a local panel-soak claim. The screenshot and telemetry retain that distinction.
- Explicit one-HP owner fixture reachedHP0/alivefalse on the native incoming contact, both modules phaseKO/deployedfalse, and did not autoheal or replay the second charge. This is an inspection fixture, not authored balance.
- Native Play Test used the genuinely imported copy, with effective Q left-forearm and E right-forearm. Actual public HUD SVG symbols are `nanite-cannon` and `nanite-shield`, visually inspected in `native-hud.png`. Desktop Formation/contact, final punch and390px mobile images were also inspected; mobile clientWidth=scrollWidth=390. These stills do not replace the parent's moving/audio reel.

Production is frozen and ownership is returned to the parent for independent review/reel/checkpoint append. The parent's new audio brief import/dialog seam in `studio-main.js` is not owned by this worker. Parent review/reel verdict remains pending; no blanket user-feel or reliability closure is claimed. No commits, staging, installs, subagents or other workers' edits were reverted.

## Task4 independent-review correction round — 2026-09-09

Read the full `docs/reports/2026-09-09-nanite-task4-review.md`. Its two real lifecycle findings were reproduced before production changes, then fixed only at the authorized Studio boundary:

- Non-positive/ended nanite presentation now uses the existing `ragdoll.apply(actor)` followed by `_sync()` for a native KO ragdoll. It does **not** call `ragdoll.step`, full `Fighter.update`, a new clock or a hand-authored restoration. Living actors retain the previous `_animate(poseDt)` path, including zero-simulation pose settling.
- The staged incoming emitter rejects an already-dead incoming Fighter before repositioning or spawning new ordnance; scheduled punch input also requires that source to be alive. The genuine owner's tuned cannon blast still kills that actor. Nothing heals/replaces it or deletes its previously committed projectiles.
- New transient `naniteStats().incomingStatus` is `ready` or `unavailable-ko`; the existing measurement line explicitly shows “fixture unavailable: incoming KO.” It is not a profile/package/source field. All prior actual emitted/arrived counters remain separate from availability.

Seven intended REDs were established: procedural, source-skinned male and source-skinned female KO zero/view matrices, their final seek matrices, and a genuine public cannon override `{dmgMin:500,dmgMax:600,maxBlast:100}` applied with `setAttackOverride` at valid distance12. That last native blast killed incoming KANO by2s, but old code emitted one new damaging projectile at2.4s. No direct damage reducer was used. The test preserves a separate real pre-KO traveling projectile. A living-pose control was added and remains stable. Tests also check the KO owner at the8s endpoint and the incoming actor's KO view, keeping physics points, `koT`, `animT` and cell state unchanged during inspection. Body matrices include driven meshes, pivots and available source bones.

Final focused commands:

```powershell
node --test tools/nanite-studio.test.mjs tools/studio-inspection.test.mjs tools/studio-audio.test.mjs tools/resource-construct-studio.test.mjs tools/ragdoll-core.test.mjs tools/ragdoll-limb.test.mjs
$env:LSW_TEST_URL='http://127.0.0.1:5189'
$env:LSW_NANITE_KO_ONLY='1'
node tools/nanite-browser.mjs
npm run build
node .agents/skills/impeccable/scripts/detect.mjs --json src/tool/studio-main.js src/tool/studio-preview.js src/tool/studio-combat.js
```

**98/98 focused tests passed, zero failures/skips/cancellations**,14,222.5305ms, including all40 nanite Studio tests. Build280modules passed5.61s; existing chunk-size warning only. UI detector `[]`. This is the scoped post-correction gate, not a fresh rerun of the earlier785-test broad gate.

Focused fresh Chromium/GPU browser output is isolated at `artifacts/nanite-studio-ko/` and does not replace the earlier full authoring capture. It imports the genuine portable pair via UI, uses an explicitly labeled one-HP inspection owner, and reaches KO through the native incoming projectile. At3s, ownerHP0/koT.55; zero step and front/side/rear/orbit changes had maximum matrix-element difference **3.552713678800501e-15**, with unchanged native points and clocks. Final seek agreed with `ragdoll.apply` on its own existing physical points to the same tolerance; it does not assume a separately reconstructed random ragdoll trajectory is identical. Front/side isolation and the finite body were visually inspected. The figure is shown partway through native knockdown, not claimed to be a settled corpse or a new death animation.

The valid high-blast profile capture shows the incoming actor KO and measurement label unavailable; emitted0, owner contacts0 and no owner damage. The earlier committed-shot lifetime control is in the Node native test, not fabricated into this image. Final browser exited0 with errors[]. A first closeup-only attempt used the wrong accessible button name (`Front` versus the actual `Front view`) and timed out; the harness selector was corrected, with no application change, before the final passing run. Four images are sufficient for this bounded fix; no new motion/audio or performance approval is claimed.

Implementation is frozen and ownership returned to the parent. No root-camera, native ragdoll, animation, damage, projectile/audio runtime or reel-crash changes were made. Parent independent recheck and overall moving/audio acceptance remain separate gates.
