# Weapon hold and attack acceptance

The user priority is all weapon holds, then Sandra's ring, then the complete
master objective. This checklist does not replace or narrow that objective.

## Implemented shared corrections

- Cylindrical melee handles cross the finger channel with the working end on
  the thumb side. Applies to sword, knife, axe, spear, katana and baton.
- Native attachments and temporary held equipment share the alignment.
- Temporary equipment restores the original hand grip metadata on removal.
- Native strikes choose a visible melee weapon's hand. Dual weapons follow
  the existing alternating hand preference; hidden weapons are excluded.
- Equipped melee strikes do not select a bare-knuckle authored animation.
- First procedural slash/chop families are connected to native strike phases.
  Sword/katana/knife/baton use slash; axe uses chop. These are original
  procedural motions, not imported source animation. Full visual acceptance
  and two-handed variants remain outstanding.
- Weapon surface samples sweep with the live weapon transform during active
  frames, using the same moving-target snapshot as fists. Hidden, detached
  or interrupted weapons cannot leave an active damage path behind.
- Bat is now a registered procedural model with a support socket, native
  swing and barrel contact. The off-hand solves to that socket in ready,
  windup, active and recovery poses. It is not yet a selectable armory item.
- Spear has a committed-direction thrust. Its elbow plane keeps the shaft
  aligned without bending the wrist; extension stays inside that solution.

## Verified scope

`tools/melee-weapon-hand.test.mjs` reproduces AEGIS's wrong-hand attack through
StudioCombat before the fix and checks the production strike afterward.
It also checks dual-knife selection and hidden-weapon exclusion.
Native sword and axe rehearsal sequences must produce real damage against a
stationary target. Only canvas impact artwork is omitted in the Node test;
browser review captures retain it.
`tools/melee-weapon-contact.test.mjs` verifies blade-only reach (fist misses),
phase gating, moving targets, interruption, hiding and detachment. Surface
samples are padded approximations of the registered blade/head geometry,
not triangle-accurate collision.
`tools/armed-weapon-fit.test.mjs` checks STORMCALL axe/trunk intersections at
heavy startup on three body types, grounded and airborne. This is one phase,
not full armed-motion acceptance.

## Equipped melee integration

Registered held melee weapons now use the shared slash/chop/swing/thrust pose
and sampled weapon contact through the ability slot. Item damage, cost and
cooldown remain authoritative. Hidden or detached weapons cannot fall back to
the legacy cone. Startup and recovery cannot authorize physical hits.
The baseball bat is now an armory row, with an explicit model identity retained
by the pickup resolver. Existing class equipment restrictions still apply.

`tools/equipped-melee-contact.test.mjs` uses native `equipFrom` and `TYPES.melee`
to verify hit, miss, startup, recovery, hiding, detachment, stun, single-hit
payment and cooldown. Together with ability pose/Studio, bat support and native
weapon contact/hand tests: 30 tests passed; production build passed.
This is simulation evidence, not a completed inventory-to-combat visual review.

`tools/equipped-swing-review.mjs` records MERC equipping bat, tomahawk, katana
and bat again via native `equipFrom`, attacking through `TYPES.melee`, and
advancing the real Fighter update in Studio. Captures live under
`artifacts/marketing/equipped-swing-review/`, including `equipment-swaps.webm`.
This is an equipment-code rehearsal, not mouse-driven inventory acceptance.
The first capture setup incorrectly retained hover and then omitted physics;
the saved final recording uses grounded gait and the native update.

Two-handed mounts now stow the other hand's native weapon in the reversible
mount record. Tests check stowing and exact restoration alongside the equipped
contact cases (11 focused tests passed). Shield compatibility and all other
two-handed weapon families still require review.

## Still required before claiming every hold finished

Equipment ownership repair: soldier presentation no longer interprets every
equipped slashing attack as permission to reveal the native off-hand sword.
Unmounting an actively attacking held weapon now retires its pose and slot
window together. Four SARGE cases (claws, great blade, katana, tomahawk) verify
both rules; native sword/pistol/shield presentation remains covered. Combined
presentation, equipped contact and lifecycle tests: 33 passed.

Claw clearance measurement supersedes the suspected chest penetration noted
below: `tools/claw-clearance.test.mjs` samples both complete blade sets against
the torso collision geometry with their full padded contact radius. Two
accepted alternating attacks, their active windows and recovery are explicitly
asserted. All three body types pass grounded and airborne (6 checks). No rake
path change was justified by this evidence. This is torso-carrier clearance,
not triangle-level clothing/skin or every flight orientation acceptance.

Paired-claw follow-up: shared mounting now creates an off-hand set, stows native
off-hand weapons and removes/restores both sides on unmount. Accepted equipped
attacks alternate right/left; contact uses the selected hand's geometry and
history. A right-left-right contact/removal regression passes (16 equipped
tests, build passed). Updated `claws-review/equipment-swaps.webm` records two
native slot attacks, with a brighter steel material. Left-side close-body
clearance still needs tuning: the blades sweep very close to the chest in the
frame-83 view. Bilateral equipment is implemented; final visual approval is not.

Claw contact update: claws use a knuckle attachment (no cylinder-handle roll)
and a shared rake pose. Each of the three rendered blades supplies its own
line of padded contact samples. Equipped claw hit/miss, startup/recovery,
hidden/detached/stunned and payment/cooldown checks pass; 25 tests with sword
contact and grip regressions passed. Studio clip:
`artifacts/marketing/claws-review/equipment-swaps.webm`.
The current catalog equips one right-hand set; the description's paired-hand
set is not yet fulfilled. Material/readability and close-up bilateral review
are also still required. Do not treat this as complete claw presentation.

Great blade update: `nodachi` now owns a distinct tapered blade, extended hilt,
support socket and shared two-handed swing. Contact samples match its longer
blade. Catalog and pickup retain `nodachi` instead of substituting `katana`.
The existing bat support suite now checks both weapons on all three body types,
through startup/active/recovery and ready (13 tests with lifecycle suite passed).
Recorded native equipped swing on MERC:
`artifacts/marketing/great-blade-review/equipment-swaps.webm`; stills include
`nodachi-23.png` and `nodachi-60.png`. These are Studio equipment rehearsals;
aerial, shield and interruption acceptance is still outstanding.

Catalog lifecycle: all seven BLADES rows now carry an explicit `ab.weapon`
matching their registered mesh. Native equip → drop → pickup → removal is
covered by `tools/melee-equipment-lifecycle.test.mjs`, including slot restoration,
scene removal, hand attachment and immutable catalog data. Combined with
equipped contact and firearm loadout regression: 23 tests passed. This fixes
katana/tomahawk/baton/claw fallback misidentification; it does not certify their
animations or claim the great blade already has a unique two-handed model.

Inventory acceptance update: `tools/melee-inventory-browser.mjs` passed real
keyboard/mouse Inventory → Open armory → Blades → bat LMB assignment → Equip →
Escape → mouse attack in PowerWorld as SARGE. Native pose ownership confirms
the attack used the bat. No page errors. Recording and two screenshots are in
`artifacts/marketing/melee-inventory-review/`. Build passed. This does not prove
target damage or every inventory item; those retain their separate checks.
The old firearm-only issuance gate now accepts catalog melee weapons, with
soldier restrictions unchanged. Inventory has an explicit route to the armory.

- Full motion review of every registry weapon: idle, aim, attack, recovery,
  flight, block, grip transitions, equipment removal and ragdoll/respawn.
- Approve and tune full slash/chop sequences, and add bat swing and spear
  thrust to the complete weapon review, including aerial and blocked motions.
- Extend surface-contact verification to thin obstacles, frame-rate variation,
  every weapon and whole-body collision/guard scenarios.
- Two-hand support and weapon-specific support sockets, checked against the
  rendered hands and clothing throughout the motion.
- Capture the actual inventory-to-equipped attack flow and inspect its hand
  transitions, including swapping to and from two-handed equipment.
- Visual review across body proportions, including thumb placement and wrist
  roll. Passing alignment math alone cannot establish a convincing hold.

No unfinished fleet assets are imported by this repair.

### Paired equipment survives body replacement
- Fixed paired-claw resources entering the retired body resource set during form changes. Both mounts now leave the old rig before its resources are collected.
- Regression reproduced premature disposal, then passed after the shared transfer fix. Bat, claws and nodachi each survive three form changes, remount onto the new hands, and release held resources exactly once when dropped.
- 36 focused equipment/contact/presentation tests pass. This proves equipment lifecycle behavior, not complete visual approval of every weapon hold.


### Equipped two-hand contact on soldiers
- Fixed presentation order: soldier equipment visibility and shield occupancy now update before combat grip solving. Previously SARGE's first equipped bat/great-blade frame left the support hand more than 3 units from its handle.
- New native-update regression covers SARGE and MERC, bat and nodachi, ground and airborne, ready plus two accepted attacks and recovery (120 frames each). All eight keep support contact within 0.12 units. With body-family and soldier presentation checks: 24 passed.
- This extends supported motion evidence; it does not certify all camera angles, guard transitions or every registry weapon.


### Two-handed guard and return
- Two-handed weapons now use a supported defensive hold instead of empty-hand boxing targets. A visible forearm shield keeps its own arm; when stowed, the support grip resumes during guard release.
- Native update regression now includes 20 guard frames between two attacks on both soldiers, bat/great blade, ground/air. Previously all eight cases lost support during guard or its release. All pass after the shared guard pose change.
- 24 grip/presentation checks plus 29 energy/Studio guard checks pass; build passed with existing bundle warnings. New recorded reviews: artifacts/marketing/weapon-guard-merc and weapon-guard-sarge. These are Studio native-code rehearsals, not live opponent acceptance.


### Bow attachment foundation
- Replaced the disconnected legacy torus/string with a continuous bow limb, physical handle and named primary grip, limb-tip and nock sockets. String endpoints meet the limb tips.
- Bow grip now uses the shared cylindrical palm alignment on either hand while remaining excluded from melee weapon selection. GALE retains the bow on the left and knife as the melee weapon.
- Three new regressions failed before the repair; 12 bow/grip/wrist tests now pass. Production build passed.
- Still required: drawing hand/string contact, temporary knife stowing, release/arrow origin, interruption and complete visual motion review. This model correction does not claim the bow draw is finished.


### Bow draw hand and stowing
- Added a shared bow draw pose using fixed-length arm solving. The string's middle follows the actual drawing fingers; the limbs retain their endpoint attachments.
- Drawing temporarily stows the other hand's weapon and restores its original visibility and grip metadata when the pose ends. Form replacement and disposal also restore this record.
- Three body variants pass 65 draw frames and release restoration; combined bow/weapon-support checks: 14 passed. Build passed. Recorded artifacts/marketing/bow-draw-review/bow-draw.webm and phase stills; this rehearses the native animation clock, not input-to-projectile firing.
- Remaining bow work: nocked arrow, release origin and aim alignment, full interrupt/control-path and multi-angle review. No claim of complete bow combat acceptance.


### Nocked arrow and native release
- Added a visible shaft/head/fletching while drawing. Its center supplies the bow-launch socket, and the arrow disappears from the bow on release.
- Native bow release now resolves from that semantic socket after the final pose, aims toward the commanded point and travels independently afterward. Charge/payment/damage behavior is preserved.
- Seven bow checks pass. Firearm suite: 41 passed; the remaining stale IRONCLAD pickup fixture violated soldier equipment policy. Replaced it with MERC and verified the corrected case passes. Build passed with existing warnings.
- Bow review recording now invokes the native bow ability, release and projectile update, replacing the earlier animation-clock-only capture.
- Still required: upward/downward draw alignment and cover clearance, interruption/KO/form timing, all views and payload presentation. The current body brace does not yet track arbitrary pitch through the full bow plane.


### Immediate bow interruption cleanup
- Cancellation now clears the draw blend, restores hidden equipment and resets the string immediately, including paused/focus-loss paths. KO cleanup cancels the bow slot and its sustain loop; repeated cleanup remains idempotent.
- Direct slot admission now cancels an existing bow draw when incapacitated. Sleep/downed presentation also refuses to reapply the draw.
- Eight interruption cases cover explicit cancellation, stagger, stun, freeze, grabbed, sleep, downed and KO. They assert immediate knife restoration, one sustain stop and no delayed arrow on release. Bow and held-action regression set passed (25 before the three additional status cases; all eight interruption cases pass). Build passed.


### Bow pitch and final attachment frame
- Both arm targets now follow aim in the body frame, including upward/downward pitch. The string and nocked arrow are recomputed after final hand/torso adjustments.
- Arrow alignment uses the inverse world matrix instead of a rotation-only approximation, preserving direction through nonuniform model scaling.
- Three body variants pass lowered/level/raised aim with string contact and rendered shaft direction checks; all 15 bow aim/draw/interruption/release tests pass. Build passed.
- Recorded native draw/aim sweep/release: artifacts/marketing/bow-aim-review/bow-draw.webm. Restarted the stopped local Vite server on 5184 for capture.
- Full extreme-angle/body-clearance, cover and form-change release review remain outstanding.

