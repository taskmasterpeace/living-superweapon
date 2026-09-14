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
1. Single-person pickup and hostile grab: grounded and flying entry, hold, free-hand action where supported, throw and release. Validate contact and interruption in gameplay.
2. Punches, kicks and lunges: review and assign usable full-body clips with explicit startup, contact and control-return timings. Library candidates alone do not satisfy gameplay integration.
3. Zombie locomotion, claw/grab, stagger, disabled-arm and crippled-leg reactions; preserve the rifle locational-damage contract.
4. Extend weapon-family actions and Dec-52 motion, then Thermavari and the second creature.
5. Meter/HUD, fire/gas/swarm integration and studio organization remain subsequent work.

Two-person rescue and two-payload carrying are removed from scope. Avoid prolonged noncritical polish: record the defect and acceptance criteria in a GitHub issue, then advance another priority. Existing visual follow-ups: #17 falling, #19 grab partner reactions, #21 ground-pickup contact. Dec-52 gameplay actor integration is tracked in #20.

Latest focused verification: 63 tests passed across zombie locational damage, zombie encounters and single-person carry. These cover native contact, cover obstruction, limb disablement, lift admission, transport and release at multiple tick rates; they do not establish visual approval of all candidate clips.

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


## Status indicator head anchoring

Existing stun stars and sleep dots now follow the final animated head instead of a fixed standing height, including ragdoll sync when those indicators exist. Seventeen status-anchor/modular tests pass and build passes. Indicator creation/lifetime remains in the existing status presentation; full airborne status visual review remains outstanding.


## Sleep versus stun in airborne lost control

Sleeping airborne characters now use relaxed arms, slight knee bend and a stable limp tilt instead of the active stun/launch flail. Frozen airborne state immediately yields articulation to the existing freeze presentation. Physics, fall damage and resource timing are unchanged. Regression failed before the change; twenty-one lost-control/modular tests and production build pass. Full live sequence visual review remains outstanding.


## Carried object hand support

A shared carry grip pass now aims both native arms at the carried object's local underside bounds. Bounds are cached per payload; the existing fixed-length arm solver remains authoritative. Game.updateCarry reapplies contact after moving the payload, then updates limb surfaces and the modular renderer. Seventeen grip/modular tests and build pass. This does not move the payload or change lift eligibility. Irregular silhouettes, unreachable large-object hold offsets, pickup anticipation and full visual ground/flight review remain outstanding; bounds are a support approximation, not surface collision.

# Sleep and knockdown interrupt committed melee

The native melee state machine now cancels startup, active contact and recovery when sleep or knockdown begins, and clears queued attacks. Previously only startup checked these statuses, allowing an active punch to persist while its owner was incapacitated. This also lets the lost-control presentation take ownership instead of being suppressed by a stale strike.

Regression: six real-fighter phase/status cases; four failed before the fix. Nineteen incapacitation, phase, heavy-strike and moving-contact tests pass, and the production build passes. This is a gameplay cancellation fix; it does not approve new kick clips or complete the broader animation integration.
# Full-body pickup studies

Ground pickup and Flying pickup now use six-key full-body sequences instead of a single spine/arm rotation. Both arms reach and fold into support; ground pickup flexes hips/knees, while flying pickup trails the legs. They are available through the shared animation catalog and character editor under the existing names.

These are candidate authored studies, not approved mocap or assigned gameplay animations. Payload IK, grounded support/root-height adjustment and multi-angle playback review remain required before assignment. Their contact/release markers describe the preview, not a forced duration for a gameplay carry. The real-rig regression failed on the old idle left arm and now passes; shared catalog validation and build pass.
# Deterministic partner base pose

Grab rehearsal now restores the partner from the selected motion's first-key pose on each sample. It no longer inherits the editor's current attacking limbs or overwrites the imported leg rotations with an arbitrary Euler angle. A regression created the preview from a raised-leg attack and failed before the fix; all 16 authoring/pickup tests and build now pass.

This addresses pose contamination only. Issue #19 remains open for distinct victim resistance, suspended hold and release reactions, plus visual approval. A supplied first-key pose must itself be a suitable reference; the tool does not invent an approved victim animation.
# Pickup visual rejection

Browser playback review found that Ground pickup at 0.45 s lacks adequate body lowering/foot support and at 1.20 s brings the support hands near the face. It is rejected for gameplay assignment and the shared catalog now displays the failed review. Issue #21 tracks body support authoring and payload hand contact. Compilation tests are not evidence of visual acceptance. Flying pickup remains unreviewed. Catalog test and build pass after the review-label change.
# Zombie locomotion after non-disabling limb damage

A stored limb-hit counter no longer forces the modular zombie into native pose adaptation forever. After the hit/stagger ends, zombies with no disabled limb resume their authored idle/walk/sprint. Actually disabled limbs still retain the injury presentation. A production-rig/motion-bank regression failed before the change; 25 modular/zombie tests and build pass. Disabled-limb gait polish and full encounter visual review remain open.
# Regional disabled-arm animation

Disabled zombie arms now use a regional native-pose overlay after authored locomotion. The healthy arm, torso and walking legs retain the source clip. The shared native-to-modular adapter accepts explicit native arm regions, preserving its existing left/right mapping and joint lengths. Incapacitated actors and crippled legs continue through their existing full native presentation.

The actual-rig regression failed when the healthy arm was overwritten; 25 modular/zombie tests and build pass. Multi-angle visual review of injury transitions remains required.
# Portable visual-review notes

Authored motion JSON, compiled clip metadata and the editor's separate clip export now preserve optional `visualReview: {rejected, note}`. The catalog reads the validated motion's review instead of separate display-only data. Ground pickup's issue #21 rejection therefore travels with handoffs. All exports remain candidates; a non-rejected note does not grant gameplay approval.

The production-catalog regression failed before the fix because compiled metadata lost the rejection. Sixteen catalog/authoring tests and build pass.
# Distinct combat review status labels

The melee recorder/review now distinguishes Stunned, Staggered, Asleep, Knocked down, Frozen and Shocked with each displayed condition's own remaining timer. Previously stun was mislabeled as stagger and sleep/knockdown could show Ready. Existing KO/held priority remains intact; overlapping conditions display one priority condition, not a claim that all conditions have ended when that timer expires.

For authors: recovery is the remaining commitment after your own attack; stagger is an imposed interruption from a hit; stun is a separate disabling status. The displayed labels read native timers and do not change the rules or durations. Thirteen phase/recording/incapacitation tests and build pass; two tests failed before the correction.
# Repeatable study loading

Loading an action study now ends the previous draft, samples the selected Base clip at zero, and records that base clip name. It no longer adds the new study's rotations to the previous draft's current frame. The running editor was checked by visiting Ground pickup contact, advancing to release, reloading and returning to contact: the contact silhouette remained consistent. Build passes. Ground pickup is still rejected for support/hand placement under #21; this fixes repeatability, not its choreography or missing body-height authoring.
# Body-height authoring

The editor now exposes Hip height (rig metres), captures it with each key, interpolates it when scrubbing, and exports a DEF-hips.position track. The control projects through the imported rig parent's actual up axis; UAL local Y is not vertical. Body keys store absolute parent-local `bodyPosition: [x,y,z]`; all keys must supply this field when the track exists. Legacy rotation-only assets remain valid.

The release rehearsal samples the exact release-time body position and restores the actor after measuring hand contact. The actor/entity root remains separate from visual hips. Browser verification captured a lowered contact key, sought to recovery and returned to confirm the saved height. Sixteen production-rig/authoring tests and build pass. This supplies the missing tool; ground-pickup choreography remains rejected until foot and payload contacts are re-authored and reviewed.
# Ground-pickup body-support pass

Grounded studies can now bake hip-position keys from the production rig's foot anchors, preserving their baseline support plane at each authored key and restoring the editor actor afterward. Ground pickup uses this in both the shared catalog and editor. Its support arms were lowered from the face toward the waist. Browser contact/release inspection confirmed the new lowering and support silhouette.

Seventeen actual-rig/catalog/authoring tests and build pass. The ground-pickup rejection remains: foot-anchor alignment is not sole-volume contact, between-key foot planting and payload grip still need review, and the full sequence is not approved for gameplay. Issue #21 remains open.
# Two-handed pickup contact metadata

Ground and flying pickup now declare `hand: both`; validation and clip metadata preserve that alongside left/right actions. Contact rehearsal centers the object at the midpoint of both hand sockets, including its sampled release origin, instead of attaching a two-handed load to the right hand. Existing one-handed throws and neck holds keep their selected hand.

The actual-rig contact regression failed before the change. Eighteen authoring/catalog/pickup tests and build pass. This is a contact-preview and authoring contract, not a new gameplay carry mode; hand-to-payload surface alignment remains part of #21.
