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
