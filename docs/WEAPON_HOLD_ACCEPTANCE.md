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

## Verified scope

`tools/melee-weapon-hand.test.mjs` reproduces AEGIS's wrong-hand attack through
StudioCombat before the fix and checks the production strike afterward.
It also checks dual-knife selection and hidden-weapon exclusion.
`tools/armed-weapon-fit.test.mjs` checks STORMCALL axe/trunk intersections at
heavy startup on three body types, grounded and airborne. This is one phase,
not full armed-motion acceptance.

## Still required before claiming every hold finished

- Full motion review of every registry weapon: idle, aim, attack, recovery,
  flight, block, grip transitions, equipment removal and ragdoll/respawn.
- Distinct reusable bat swing, axe chop and sword slash; current procedural
  fallback remains a punch reach and is not an approved weapon animation.
- Weapon surface sweeps during the active interval. Current ordinary melee
  contact is still a fist sweep; do not describe its damage as blade contact.
- Two-hand support and weapon-specific support sockets, checked against the
  rendered hands and clothing throughout the motion.
- Bat must graduate from inspection prop to registered gameplay equipment.
- Visual review across body proportions, including thumb placement and wrist
  roll. Passing alignment math alone cannot establish a convincing hold.

No unfinished fleet assets are imported by this repair.
