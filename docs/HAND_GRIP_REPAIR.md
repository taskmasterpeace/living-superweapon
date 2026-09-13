# Shared hand and grip repair

The reach solver previously coupled wrist roll to elbow pole placement. A forward reach reproduced downward thumbs on procedural, superhero-male and superhero-female bodies, both hands. The thumb opposition change alone did not solve this.

`orientNeutralGrip` now separates roll from elbow placement, preserves longitudinal forearm/hand alignment and hand position, and gives free fists a neutral thumbs-up frame. Near vertical forearms fade out the correction because up has no unique projected direction. Existing occupied firearm/weapon sockets are excluded unless explicitly authored `gripKind: cylinder`; later firearm/casting pose owners retain authority.

No body height, skeleton lengths, character origin, scale or wardrobe dimensions changed. Future modular bodies must preserve anatomical handedness and hand sockets. Cylinder prop models run through the closed finger channel across the palm, not along the forearm; the bat inspection prop demonstrates this and is not an unlocked gameplay weapon. A fully authored source wrist channel remains a future fidelity extension; this correction is the common anatomical fallback, not recovered source motion.

Evidence: artifacts/marketing/hand-second-review. Native Studio combo review uses production melee simulation; static bat views are grip fixtures, not attack acceptance. 57 skin/weapon/emission/hand tests pass. 107 additional strike/retreat tests pass; three source-ingestion checks cannot load missing raw Quaternius assets in this checkout. Build passes.
