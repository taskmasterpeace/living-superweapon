# PowerWorld: Impact UI and playable-slice release brief
Date: 2026-09-10. Target: 19:00 America/New_York. Based on inspected integration HEAD db5b9c9.
Status: Impact visual direction approved by the creator on 2026-09-10; binding source is root DESIGN.md. Execution order is the deadline plan. This brief is not proof of a finished build and does not close or shrink the full active goal.

## Visual direction
Use Velocity's compact edge HUD plus Impact's purposeful comic language. See docs/design/ui-direction/impact-c.png.
Warm charcoal, bone lettering, gold interactions, coral health/danger and cyan energy. No purple UI.
Game camera stays calibrated centered BFP by default. Generated over-shoulder imagery is NOT camera authority. Shoulder view is an explicit player option.
Mobile vital meters remain small and top-anchored; touch targets remain comfortable. Desktop HUD remains adjustable.
Use native vector/canvas lettering and existing comic machinery, not cropped bitmap words from the generated board.
Generated scenery, character appearances and aircraft are not approved game assets. The illustration is a UI proposal.

## Informative comic feedback
Damage resolution is authority; neither the icon nor the sound chooses damage results.
- ARMOR HIT / TINK or CLANG: actual plate or armor absorption; show actual HP loss separately if partial.
- SHIELD HIT: shieldpack or nanite absorption, not automatically directional guard.
- BLOCK: actual active guard intercepted damage.
- DEFLECT: actual reflected projectile, not a miss or fully absorbed hit.
- THUD / WHAM: bodily blunt impact. Do not use it for every bullet; ballistic body damage uses its own contact family.
- CRACK / GUARD BROKEN: actual guard-meter break only.
- K.O. / DOWN: authoritative knockout/down state, not a large damage estimate.
- BLEEDING, BURNING and CHILLED/FROZEN only when the corresponding status transition really occurs.
Represent actual HP loss and actual absorbed amounts independently; never show incoming raw attack damage as health lost.
Rate-limit repeated automatic hits per target/outcome family; promote guard break, deflect and KO. Place bursts beside targets, never over the reticle or entire enemy.
Color is supplemented by shape, label and icon; reduced-motion mode preserves information without bounce/flash.

## Damage taxonomy policy
Existing categories: physical, ballistic, energy, fire, cold, toxic, acid, magic.
Existing slash metadata and projectile pierce flags are not new damage categories.
For tonight, document ballistic as the current bullet category and physical as the current blunt baseline. Do not rename the resistance model or silently reinterpret pierce as armor piercing.
Authored dtype propagation changes resistance/wound outcomes; fix behind separate regression coverage, not inside a cosmetic word-table patch.
Preserve admission order, immunity, armor, shield, guard, nanite precedence, arithmetic and paid-shot ownership.

## Speech
Reuse mouth/head-anchored balloons: rounded talk, jagged yell, appropriate radio treatment. Tail follows the actual speaker, not a fixed screen location.
Visibility, camera projection, safe-area and distance admission precede placement. Do not reveal hidden opponents through walls by showing their dialogue.
Remote/offscreen allowed communication uses a labeled directional subtitle/radio treatment; never a tail spanning the whole screen.
One short nearby balloon at a time for the initial slice; important warnings preempt idle chatter. Keep line/category/speaker cooldowns, discard stale speech, no delayed pileup.
Audio and text eventually share one admitted dialogue event and actual clip lifetime; auditions remain separate.
Distance and talk/shout reach must be measured against current world scale before claiming realistic meters.

## Tonight's testable encounter
Existing desert map, one original flyer (Vega) and Sarge selectable, four clone enemies, cover and existing recovery objective.
Human-playable loop: select -> move/aim -> fight -> complete or lose -> restart.
Hero: flight, boost/deceleration, aimed beam, flying melee, block/evade.
Soldier: grounded locomotion, crouch/prone, rifle/scoped rifle/shotgun selection, reload, grenade and block/evade where supported by kit.
Do not grant soldiers normal flight or flyers vehicle driving.
No new aircraft expansion for this slice. Existing broader vehicle/flight requirements remain open in the full goal.

## Acceptance gates
1. Correct powerworld.html entrypoint on the tested branch; never mistake citygame.html or original port 5180 for this integration build.
2. Armor/body/guard/deflect/KO matrix produces truthful labels with unchanged damage arithmetic.
3. Held beams end at live contact and have readable pressure/impact; flying attacks keep travel pose; no fighter tunneling.
4. Loadout selection actually equips a firearm and updates its muzzle, ammo, reload, HUD and drop lifecycle.
5. Centered camera is default; optional shoulder and FOV/range/reset live in game Options, collision retained, saved settings behave after reload.
6. Talk and yell are visibly different and identify their speakers without hiding combat.
7. Desktop plus 390px portrait and mobile landscape show legible meters, no vertically wrapped weapon names and no controls under safe areas.
8. Native audio has no duplicated reload/grenade phases; replacing selected recordings does not remove working fallback.
9. Fresh-build 10-minute encounter/restart soak, zero uncaught errors, no stuck input/beam/reload/menu; foreground performance measured with settings/device recorded.
10. Real-input video, screenshots, exact commit, launch URL and open-issue list delivered. Generated concept art is not acceptance evidence.

## Parallel ownership
Main integration owns runtime combat, camera, UI, equipment wiring and acceptance.
External audio task owns assets-src/audio-delivery/, docs/audio-delivery/, tools/audio-delivery/ only.
Optional building asset task owns assets-src/building-delivery/, public/building-delivery/, docs/building-delivery/ only.
Existing authoring/, public/authored-assets/, docs/authoring/ remain with the authoring team.
No concurrent runtime edits without explicit file ownership; main integrates reviewed commits.
