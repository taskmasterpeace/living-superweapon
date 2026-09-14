# Power World: interaction first, clips second

## Core fantasy found in the code

Flight changes where and how you fight. Strength lets you seize people and turn the environment into weapons. Skill, positioning, guard and recovery give opponents counterplay. The critical loop is approach → reach/capture → hold or lift → aim → committed throw/strike → collision and damage → visible reaction → regained control.

Evidence: `src/engine/melee.js` owns capture, clinch and throw; `person-carry.js` owns paired transport; `game.js` owns prop capacity, carrying and thrown collision; `impact-recovery.js` owns recovery locks. The library is a review surface, not the authority for combat travel or damage.

## Current checkpoint

- Three is the existing maximum number of ordinary melee-release regions: Combo (0–.18 charge), Straight (.18–.55), Haymaker (.55–1.3). Charge rate changes elapsed time. Styles with fewer available strikes collapse unavailable regions; clinch has its separate body-blow/finisher choice. Keep this behavior for now; do not add four/five regions or hide a ground sweep in an aerial attack. These are three release choices, not three newly implemented heavy-punch animations.
- Ground/low-flight prop pickup now reaches, lifts, then carries overhead. Capacity ratios choose .55/.85/1.2-second easy/effort/struggle timing. Early release or interruption drops at the current mesh position; hit-stop pauses the lift. The early-release trajectory now shows a drop, not a forward hurl. KO drops instead of deleting the payload.
- Contact is unfinished: measured modular rock wrists miss by approximately .5–.6 world units overhead. Low pickup also needs better knee/hip support. Issue #21 remains open.
- Person throws currently release immediately in `MeleeSystem._throw`; `person-throw-pose.js` blends the old arm pose away for .3 seconds. That is continuity, not a throw windup and follow-through. The user's observation that it looks like dropping is valid.
- Current fall/stun studies use corrected anterior arm arcs. The disoriented study's remaining sign error was fixed. Source slides/swords/zombie idle, walk and scratch that the user liked are preserved.
- The source inventory contains 253 unique names across the full UAL1/UAL2 packs. It confirms new kicks/knees, bow and directional zombies, but no explicitly named paired grab/choke/wrestling, spear or nunchuck family. See `ANIMATION_PACK_INVENTORY_2026-09-14.md`. Source availability is not playback or gameplay acceptance.
- Existing Dec-52 hound actor now has an opt-in Threat Room encounter (`creature hound`) with health, movement, conditional bite contact and measured low body bounds. Structural/native-fixture checks passed; it is not a finished creature combat family or a visually approved encounter.

## Shared animation language — proposed contract

Describe actions with separate fields rather than one ambiguous “two-handed attack” label:

| Field | Examples | Why |
| --- | --- | --- |
| Action | aim, strike, block, reach, lift, carry, throw, reload, hit, recover | Names what is happening. |
| Weapon family | unarmed, pistol, long-gun, blade, blunt, polearm, bow, flexible | Selects the base movement family. |
| Hand use | right, left, paired-grip, independent-dual | One rifle/sword in both hands is distinct from two independent pistols. |
| Body mode | ground, hover, forward-flight, falling | Lower body/controller context cannot be guessed from a weapon. |
| Carry shape | person-underarm, hostile-neck, overhead-wide, shoulder-load, long-lever | Chooses contact points and body support. |
| Effort | easy, effort, struggle, cannot-lift | Comes from capacity versus mass, not weapon size. |
| Phases | anticipation, contact, release, follow-through, control-return | Keeps hands attached until release and damage inside actual contact windows. |

Weapon assets supply primary/support grip sockets, striking edge/tip, emission point and throwable state. Character style grants moves explicitly; owning a spear does not grant every martial art. This contract is a proposal, not a claim that all fields are implemented.

Bat and battle-axe can share a two-handed swing base, but differ in grip spacing, centre of mass, active contact region, reach, damage and release. Spear thrust and spear throw need separate clips. Akimbo needs two independent ownership tracks. Nunchucks are feasible later, but need chain/contact treatment and a real source or authored study; they are not confirmed in these downloads.

## Build order

| Order | Deliverable | Benefit | Tradeoff / acceptance |
| --- | --- | --- | --- |
| 1 | Correct ordinary person throw: load body/arms while still attached, release on a marker, follow through and recover. Start with ground and hover downward throws. | Makes the central grab/throw fantasy read as deliberate force. | Requires two-body contact and interruption checks; spinning throws wait. Test missed aim, stun before release and size differences. |
| 2 | Shape-aware pickup/carry: small object, broad heavy object/car, long tree/pole. Use PickUp_Kneeling as a candidate; finish grounded support. | Mass controls effort; geometry controls how it is held. | One generic overhead pose is insufficient. Tree-as-bat needs a long-lever grip and collision contact; it is not implemented yet. |
| 3 | Import/review a small source batch: Kick, PunchKick_Enter/Exit, Melee_Knee/Rec, Melee_Uppercut, LiftAir_Fall/Impact. | Replaces weak studies with inspectable source motion and explicit recovery. | Retargeting, visual review and hit windows still cost work. Do not load both full banks into every actor. |
| 4 | Distinct victim reactions and infected attacks. Add zombie directional movement/bite, conscious resistance versus limp stun, then visible bullet-hit reactions. | Opponents communicate what happened and zombies gain readable intent. | Hit reactions must layer without erasing a committed attack unless its interruption rule permits it. Choke victim source remains missing. |
| 5 | Weapon families in controlled batches: pistol and long-gun; sword/shield and blunt; spear/throwable axe; dual wield/flexible weapons later. | Broadens combat without multiplying mismatched poses. | Per-weapon grip/release/contact and ammo events must be checked, not inferred from similar silhouettes. |

Destruction extension: detached props must leave their original collision/availability once, then take wear on impact and eventually break. Surface dust should use impact material colour (terrain/material metadata or mesh base colour fallback), with short upward drift. Do not blindly sample faction accents or a random texture texel. A car's durability and thrown-person HP are separate damage recipients; never transfer all damage automatically.

## Repeatable pipeline

Archive source + license/hash → metadata inventory → select exact takes → full-track retarget on current modular rig → mount matching prop/partner → inspect at quarter phases and full speed → set contact/release/control-return markers → assign to a native action → test approach through recovery. Keep source-available, candidate, accepted and gameplay-proven statuses separate. Review rejected hand contact before expanding the move count.

Use the existing Animation Library and Character Foundation authoring controls. Expand preview / Inspect pose make the current review usable at close range; Show trajectory restores the illustrative air path. No extra workshop, new world or video work is needed for this checkpoint.

Sources checked: Quaternius official library pages https://quaternius.com/packs/universalanimationlibrary.html and https://quaternius.com/packs/universalanimationlibrary2.html; local ZIP GLB take metadata is authoritative for the downloaded contents. Mixamo https://www.mixamo.com/ offers another humanoid preview/retarget source, but no specific choke/wrestling take has been downloaded or accepted here.
