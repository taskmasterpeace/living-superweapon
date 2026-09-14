# Zombie rifle hit contract

Scope: common and sprinter encounter zombies, ballistic `weapon: rifle` (the current M16-class weapon family). Other weapons and characters retain existing damage rules.

- Common zombie: 100 HP. Rifle head contact kills immediately. Torso contact removes 50 HP.
- Sprinter: 50 HP, speed 42 vs common 21, independently sampled at 1% probability per encounter spawn. One torso contact kills.
- Arm contact: no HP damage, interrupts melee and adds a brief stagger. Four hits to the same arm disable it. Remaining usable arm can perform the claw strike; both arms disabled prevents claw damage and native grabs.
- Leg contact: no HP damage. Two hits to the same leg cripple it, reducing movement to 35% for that life with a bent-leg pose. This is a permanent limp choice, not a knockdown implementation.
- Registered rifle head and torso impacts intentionally bypass zombie difficulty/defense multipliers. World obstacles still block bullets. Remote authority remains unchanged.
- Hit regions are swept against animated native anatomical collision proxies, not screen-height bands. This pass applies anatomical refinement to encounter zombies; it does not claim universal locational damage on all character rigs.
- Existing hit reaction, ragdoll/KO and hit-outcome reporting are reused. Limb hits do not add hidden lethal bleed damage.

Tests: tools/zombie-locational-damage.test.mjs verifies native receiver behavior, anatomical contact, cover obstruction and disabled limb effects. Full third-person visual feel review remains outstanding.

Deferred noncritical fall polish: https://github.com/taskmasterpeace/living-superweapon/issues/17

Priority: single-person pickups, hostile grabs, punches, kicks, lunges and Dec-52 hound/rat/mech motion. Two-person rescue is removed from current scope.

Disabled-arm presentation now resets the elbow and hand through the shared fixed-length FK helper instead of lowering only the shoulder. This prevents the previous attack's bent elbow from persisting. Injury articulation runs before native skin synchronization and modular conversion. Both real-rig regressions failed before the fix; 27 injury, locational-damage and modular tests pass, and production build passes. Full moving visual review remains outstanding.

A disabled arm now prevents the existing two-handed grab and invalidates an active clinch. The healthy arm can still attack; both disabled arms still block claw damage. Regression failed before the change. Fifty-six zombie/carry tests and build pass. A future one-handed zombie grab would need a distinct pose and rule, not reuse the current two-handed grip.
