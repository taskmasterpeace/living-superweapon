# Animation implementation checkpoint - September 14

Implementation authorized by Robert's request to proceed while he sleeps. No further planning approval is needed.

## Implemented
- Modular renderer preserves existing native grapple/hanging, object carry, grab state, melee charge, crouch, jump motion, downed, launched and slide pose ownership. Air strike override no longer steals these interaction states.
- Hollow infection blends exposed skin toward pallor while preserving different base complexions and restoring healthy color when disabled.
- Three full-body editable candidates added: flailing fall, curled backward fall, disoriented ground stun. Studio labels now identify the active candidate instead of falsely showing Idle_Loop. Loop candidates play repeatedly.
- Studio provides generated combat-reference Markdown and JSON for all 55 roster definitions, attack timings, seven attributes, damage types, resistance and derived multipliers.
- User's Thermavari and leaping-creature references copied into docs/reference/animation-2026-09-14. Plan now includes 7.5-foot Thermavari, named weapons, creature leap/spit/sniff, and vehicle lifting.

## Evidence and limits
Two regressions were observed failing before fixes: native wall hold lost to idle; hollow infection did not change exposed skin. Both pass after fixes. Combined targeted suite: 37 passed. Full-body studies compile against actual rig; loop endpoints and bilateral limb changes tested.
Browser review of flailing candidate revealed arm articulation still needs refinement. NOT visually approved and NOT connected to gameplay. Other new candidates have not received full phase/angle review. These are a starting point, not finished falling clips.
The studio statistics are base definition data. Rank lift table values are not an alternative runtime capacity rule. See docs/combat-states-and-damage-report.md for ordered defense resolution and known stun recovery scaling issue.

## Next work, in order
1. Complete full-phase visual review and correct full-body local-axis articulation; actual flight scenario context.
2. Extend pose-state regressions to real moving wall contacts and carried victims; verify geometry clearance, not just preserved rotation.
3. Build actual rescue and hand-occupancy contract; two payloads, vehicle lifting, safe releases, failure feedback.
4. Dedicated kicks and weapon-family clips, paired entries/attacks/throws, timing and contact tests.
5. Actual Thermavari digitigrade rig and second creature, weapons and gaits.
6. Meter/HUD, fire/gas/swarm runtime integration and studio library organization from the complete plan.

Nothing in this checkpoint marks the overall objective complete. Keep all scope in docs/superpowers/plans/2026-09-14-power-world-animation-and-interactions.md.

## Contact-driven modular strikes (2026-09-14)

Fixed a renderer ownership gap: a committed native melee motion was overwritten by generic modular jab/cross playback, losing the chosen hand and contact solver adjustments. Unarmed contact-driven strikes now use the shared native-to-modular adapter on ground and in flight. The native pipeline still samples its authored light/heavy take and finishes against the committed contact point. Existing source-driven one-handed swords retain their separate attachment path.

Regression failed on ground jab startup before the fix. Afterward, 60 tests pass across modular-character, authored-strike, heavy-strike, melee-flight-entry and moving-melee. Run with `node --import ./tools/helpers/character-css-loader.mjs --test` followed by those tools/*.test.mjs paths. Source ingestion now reads the actual assets-src/modular-character/source location. Production build passes. This proves ownership and simulation regressions; full visual combat review and missing kick/lunge/grab variants remain outstanding.

## Kick library candidates

Added six editable full-body studies: front kick, roundhouse and knee strike, each left/right. Each has chamber, contact, retraction and return keys with explicit timing markers. Existing action-study selector and clip export consume them. These are original procedural key poses, not imported/approved martial arts takes. Browser contact inspection caught reversed guard arms; corrected their local rotation direction and rechecked the front-kick contact view. Ten authoring tests pass and production build passes.

Still required: complete sequence visual review on multiple bodies, foot support/contact targets, tuning against actual reach, interruption blending and gameplay assignment. Do not treat these candidates as completed combat moves. Recovered Mixamo roundhouse assets remain a separate retarget/review source.

## Throwing studies and hand metadata

Replaced the single-arm boomerang study with full-body anticipation/release/follow-through keys, added overhead axe throwing, and supplied left-handed versions of both. Authored motion now validates and preserves left/right hand selection through clip metadata/export; prop/partner rehearsal uses that hand instead of always using the right hand. Eleven authoring tests pass, including actual-rig compilation and left-hand prop contact; build passes. Full visual weapon-contact review and gameplay assignment remain outstanding. These studies are still explicitly candidates.

## Live person-throw release recovery

The hostile person-throw path now captures the holder's actual arm pose before release and blends it back over 0.3 seconds. Modular rendering preserves this visual owner. No launch velocity, damage, control lock or friendly setdown changes. New actions/guard/incapacitation cancel recovery and hitstop freezes its clock. Fifty-one person carry, friendly carry and release-pose tests pass; build passes. Live visual transition review remains required; this is continuity from an existing pose, not a newly imported throw animation.

## Grounded reload and throwable ownership

Fixed grounded modular reload/throw poses being overwritten by idle playback: live _firearmReload and _throwAction now retain the native articulation through the shared adapter. Regression failed on reload before the fix; fourteen modular and sixteen reload/throwable tests pass afterward. Build passes. This restores existing action poses; full visual weapon-contact acceptance remains outstanding.

Missing phase-specific reload audio is tracked at https://github.com/taskmasterpeace/living-superweapon/issues/18; existing event timing and fallback remain in place.

## Infected passive flight

Connected the existing workshop infected-flight arm overlay to the modular gameplay renderer for sick/hollow appearance recipes during passive unarmed flight/gliding. Combat, held weapons, grabs/carry, reload/throw, guard, incapacitation, active ability channels and injury poses retain ownership. Overlay does not move joint positions or change flight simulation. Fifteen modular tests pass and build passes. This is appearance-driven (saved recipe), not a new infection progression mechanic; live visual review remains outstanding.

## Ranged recovery ownership

Modular bodies now retain native ranged aiming while the shared cast channel reports an active recovery, even after state returns to idle. Expired timers restore normal idle playback; melee ownership remains unchanged. The regression failed before the fix. All sixteen modular tests and production build pass. This preserves existing aiming animation; visual weapon contact review remains outstanding.


## Injured zombie claw handedness

The surviving left-arm attack now mirrors torso twist, chamber, approach arc, elbow pole and grip orientation after right-arm loss. Previously it selected the left arm but retained right-arm geometry. Real Fighter chamber regression failed before the fix. Thirty-five locational damage, zombie encounter and equipped melee tests pass; production build passes. Full visual clip acceptance remains outstanding.


## Studio motion inspection controls

Added quarter/half/normal playback, pause/resume, 60 fps frame stepping, and exact contact/release/control-return seeks to the editable animation panel. These controls only change preview time; exported duration and markers retain their authored seconds. Browser review of Front kick / right confirmed contact at 0.37 seconds, next frame at 0.38, and control return at 0.85. Production build passes. This improves candidate review and is not approval of the kick's gameplay contact.


## Deterministic contact release review

Partner and prop release previews now sample the exact authored release frame rather than the last visited frame. Direct seeks, backward scrubs and sequential playback therefore share the same release origin. Partner torso alignment includes its scale; temporary source sampling restores the actor's current pose. The real exported rig regression failed before the fix; all twelve authoring tests and production build pass. Preview release trajectories remain illustrative, not gameplay throw physics.


## Full-body grab blocking studies

Front clinch, rear body lock, side grab and left-hand neck hold are selectable in the authoring panel. The old Paired grab name now resolves to the full-body front study. Six keys cover entry, contact at .42 s, sustained hold, release at 1.05 s, control return at 1.3 s and base recovery by 1.4 s. Neck hold retains explicit left-hand metadata so the right hand is free. Thirteen authoring tests pass; production build passes. Browser contact silhouette inspected for neck hold. These are editable candidates, not approved gameplay clips. Upright/directional partner alignment, dynamic contact and full sequence acceptance remain outstanding; the current partner rehearsal still uses its generic carry orientation.


## Directional partner preview contract

Validated contactStyle metadata (carry/front/rear/side/neck) survives asset and clip export. Grab studies select upright partner facing and neck or upper-torso socket; legacy carry keeps its horizontal orientation. Fourteen authoring tests pass, including small/large partner socket alignment; build passes. Browser neck-hold review exposed inherited partner limb posing that still needs a dedicated victim animation channel, tracked in https://github.com/taskmasterpeace/living-superweapon/issues/19. These previews remain candidates, not visually approved interaction clips.


## Shared study catalog integration

Animation Library now loads 29 editable studies alongside 31 mapped source clips. Both views use the same ACTION_DRAFTS definitions; entries show source, duration, contact, release, control return and hand, retain candidate warnings, support existing search/favorites/export, and link directly to the selected study in Character Foundation. One real-rig catalog test passes, production build passes, and browser review verified the 29-study filter and neck-hold editor handoff. This is library/authoring integration; it does not assign candidates as gameplay attacks.

