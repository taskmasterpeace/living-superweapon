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

## Still required before claiming every hold finished

- Full motion review of every registry weapon: idle, aim, attack, recovery,
  flight, block, grip transitions, equipment removal and ragdoll/respawn.
- Approve and tune full slash/chop sequences, and add bat swing and spear
  thrust. Spear still uses the generic procedural reach; bat is preview-only.
- Extend surface-contact verification to thin obstacles, frame-rate variation,
  every weapon and whole-body collision/guard scenarios.
- Two-hand support and weapon-specific support sockets, checked against the
  rendered hands and clothing throughout the motion.
- Bat must graduate from inspection prop to registered gameplay equipment.
- Visual review across body proportions, including thumb placement and wrist
  roll. Passing alignment math alone cannot establish a convincing hold.

No unfinished fleet assets are imported by this repair.
