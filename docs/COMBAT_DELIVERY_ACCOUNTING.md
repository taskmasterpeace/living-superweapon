# Combat delivery report and course correction

This report distinguishes implemented code from visually accepted gameplay. It covers the recent weapon/hand work on `codex/playable-integration`, inspected through commit `cf48190`. It is not a claim that the full campaign, combat or authoring goal is finished.

## Straight answer

We spent too long repairing and testing individual weapon attachment cases. Some repairs were necessary, but the work did not deliver the convincing melee animations, Sandra adviser or posters the user expected. Tests proved specific behavior; they did not prove that the result looked good. Repeatedly reporting small green test batches obscured that distinction.

The user has not accepted the current melee appearance. It remains unfinished. We should stop treating another attachment test as the next major deliverable.

## What was actually added or repaired

| Area | Implemented in this branch | What it does not establish |
|---|---|---|
| Hand alignment | Shared cylindrical grip orientation; thumb-side weapon direction; occupied fingers close immediately | Convincing anatomy and wrist orientation in every animation |
| Weapon motions | Procedural bat sweep, axe chop, sword/knife slash, spear thrust and claw rake | Good authored martial-arts or weapon animation |
| Two-handed weapons | Bat and great-blade support-hand sockets and arm solving through ready, swing and guard | Visually accepted poses across the full roster and clothing |
| Weapon damage | Contacts sampled from weapon surfaces during active attack frames; hidden/detached/interrupted weapons cannot keep attacking | Balanced, enjoyable soldier boxing or complete aerial counterplay |
| Equipment | Armory melee issuance, inventory route, preserved model identity on drop/pickup, paired claws, form transfer | Finished inventory UX or all carrying transitions |
| KO/respawn | Seven armory melee items retain mounts and recover holds through native KO/respawn tests | Human-looking ragdoll motion throughout the fall |
| Physical bow | Connected limbs/string, draw-hand contact, temporary knife stowing, nocked arrow, release from the bow, upward/downward aiming, interruption cleanup | Correct arrow proportions, full draw silhouette, or a finished archery experience |
| Arrow collision | Thin-wall swept contact and safe release when the bow extends into nearby cover | Every projectile or damage type visually finalized |
| Review tools | Recorded native-code weapon rehearsals and repeatable front/left/right/rear cameras | Actual opponent playtesting or user visual approval |

Recent changes are mostly procedural pose and equipment work. They are not a newly imported high-quality animation collection or a replacement character rig.

## Where melee stands

There is working machinery for approach, light/heavy attacks, guard, grab, weapon contact, interruption and knockback. This pass improved weapon integration with that machinery. It did not establish that the complete fight is fun or readable.

Outstanding acceptance examples:

- Two soldiers: approach, jab/combo, heavy, block, grab, release and knockdown in one understandable fight.
- Grounded superweapon: visibly distinct entry and impact, without ordinary walking retreat defeating every approach.
- Airborne combat: approach, dodge/block/counter-grab, impact and recovery with readable control state.
- Weapon motion: recognizable windup, contact and follow-through, with correct hands and no wrist/body clipping.
- Grab equipment conflict: MERC successfully enters a native clinch while the bat remains visible in the grabbing hand. This has been reproduced and documented; the shared stowing repair has not yet been implemented.

Do not describe the above as complete based on the current tests.

## Sandra and the ring

Sandra's existing definition contains Twin Pistols, Suppressed SMG, The Ring Sees, Pistol Whip, Tracker Round, Clean Extraction and an Extraction Beacon. The Ring Sees is an existing timed reveal buff.

The requested private adviser has not been delivered in this pass. Required work remains:

- A visible, readable private message from the ring, distinct from public speech.
- Messages grounded in actual game state: stronger opponent, dangerous grab matchup, incoming threat, lost target or useful tactical opportunity.
- Defined information access: the ring's knowledge should be intentional, not an accidental dump of all engine data.
- Quiet/normal/talkative frequency controls, priority, cooldown and repetition suppression.
- Text first, with events suitable for later voiced one-shots from the audio pipeline.
- Physical item/profile ownership so the feature follows the ring rules.

## Posters

No finished poster set was delivered by this recent weapon pass. The inspected marketing folder contains review clips, not a substitute for posters.

Required first set, using verified controls and our characters:

1. Approach -> strike -> recover.
2. Strike / guard / grab, including the real exceptions and why a defense failed.
3. Controlled flight -> knockback -> uncontrolled falling -> KO.
4. Damage types: consistent icon, color, visible reaction and plain-language effect.

Use those same images in the Threat Room and as shareable explanations. Do not print speculative rules as current controls.

## New bow requirements, recorded verbatim in intent

### Physical archer

- Long, recognizable physical arrows, with shaft, head and fletching.
- At maximum draw, the arrowhead must still extend beyond the bow. Current geometry uses a fixed 3-unit shaft and a fixed 1.5-unit offset from the draw hand; it has no full-draw clearance contract.
- Nock follows the string; bow and hand scale determine a sensible arrow length. The released projectile must match the nocked arrow, rather than shrinking into a different short model.
- Poison ammunition must be available. Existing bow code already has poison/flame/explosive payload selection, but that is not a finished damage-type showcase.
- Use repeatable targets to demonstrate the agreed damage types and their effects. Physical arrow injury and an applied poison condition should be distinguishable.

### Magic archer

- A separate recognizable magic bow/arrow character or kit.
- Drawing the string materializes an energy arrow; no physical arrow should appear before drawing.
- One magic arrow type, unlimited ammunition. Unlimited arrows does not by itself decide whether charging costs energy; keep that decision separate.
- The arrow remains long enough to clear the bow at full draw, with the same nock/launch contract.
- Distinct energy silhouette/material, not merely recoloring the physical shaft.
- Reuse the shared bow system with presentation and payload data, rather than cloning the implementation.

These requirements are recorded, not yet implemented by this report.

## Recommendation: animation proof before a full rebuild

Do not remake the whole roster blindly. Produce one directly comparable animation proof using an available source clip and one representative character at the existing height.

1. Verify which source animation files actually exist and identify their skeleton, axes, scale and hand channels. Some previously referenced Quaternius source files are missing from this worktree; do not claim they were imported.
2. Compare the current rig and a properly mapped source animation for one punch and one weapon swing. Show the same angles and a real target. Judge shoulder/elbow/wrist movement, contact and recovery, not only a paused pose.
3. If the current rig can support convincing movement, retain it and repair the shared mapping. If it cannot, replace the shared rig while preserving character height, silhouettes, modular attachment regions and gameplay scale.
4. Once that proof works, reuse its skeleton/socket/animation contract across body types. Avoid bespoke animation code for each hero.

Acceptance is visual and playable: the swing must look good and hit when it visibly connects. Passing mathematical attachment checks is supporting evidence only.

## Revised delivery order

1. Show a convincing melee animation proof and resolve the rig decision. Include a real blade swing, not another attachment-only milestone.
2. Correct physical arrow length and implement the separate magic bow presentation through shared data.
3. Finish the remaining shared grip conflicts exposed by those chosen animations, including person holds; stop adding unrelated corner cases to this pass.
4. Deliver Sandra's visible text adviser and the first posters.
5. Prove a short ground fight and an aerial fight in the Threat Room, with concise clips.
6. Resume the full master objective: movement, inventory, authoring, research, ranged combat, world, vehicles, audio and device/release work. Nothing in this correction removes that scope.

Future updates should state the playable/visible result, show evidence when useful, and name the main unfinished deliverable. Avoid presenting a test count as the primary accomplishment.
