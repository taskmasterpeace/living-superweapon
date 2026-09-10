# Melee weight and clinch depth

Scope: combat feel and its existing Character Studio workflow. No map-design or roster-catalog changes.

## Controls

- Tap **V**: light combination. A tap in the last 180 ms of recovery queues the next strike; it never cancels recovery.
- Hold **V**, then release: straight or heavy according to the fighter’s existing Melee Style. A held input queued during recovery starts charging only when recovery ends.
- **G**: grab. While holding an opponent, **G** takes priority over nearby gear, props and interaction prompts.
- In a clinch, tap **V** for a body blow, hold it for at least 0.55 charge seconds and release to **drive down**, or aim and press **G** for the existing throw.
- **C**: guard. Ordinary punches remain blockable; committed haymakers crush guard. Existing style-specific strike access remains intact: power grapplers still have heavy-only taps.

## What changes the feel

Strength now affects light and heavy damage, horizontal displacement, hitstop and impact sound weight. Guard-crush displacement also scales with the attacker. STR 10 anchors the established maximum standing-punch shove, preserving teleport-intercept counterplay; lighter fighters produce less shove. Heavy startup no longer grants free invulnerability. An exposed startup earns a 15% counter bonus; recovery earns a 20% punish bonus, without bypassing guard.

The third boxing beat is a cross with stronger horizontal drive instead of an excessive vertical pop. Heavy animation coils back, rotates through the torso and transfers forward into real swept-fist contact. Body blows keep one hand on the grip and use the same physical contact test against the held fighter. The grip is close and stable instead of orbiting through target-follow feedback.

Body blows have their own cooldown and spend hold time. The slam has a visible hoist; timeout, incoming damage and front-grab escapes can prevent completion. The release launches the victim down from their actual altitude. Ground/roof collision—not the release animation—owns secondary slam damage and the surface effect. Fast descending bodies now cross roof tops correctly without snapping down from far above them.

Sleep and freeze discard queued melee and release the holder. Thorns still injure a grabber without acting as an automatic escape. Fatal throws and drive-downs transfer their launch into the KO ragdoll; a lethal drive-down bypasses the ordinary upward KO pop.

## Authoring

In [Character Studio](http://localhost:5180/studio.html), choose **Motion → Melee sequence**. Rehearse light combination, heavy, guard crush, body blow → throw, aimed throw and drive down. This uses real Fighter/MeleeSystem updates, PowerWorld knockback settings and a KANO test partner. Replays are silent and deterministic for measured damage/position; decorative particles are not deterministic. An event breakdown separates punch, throw and surface damage. Camera inspection follows the pair, including vertical separation; Orbit retains a user zoom multiplier.

Custom fighters already derive strength from **Might**, strike access from **Melee Style**, and pace from **Speedster Reflexes** in **Edit power kit**. These values feed the same gameplay rules. Rehearsal settings do not change or save the character definition.

## Verification

`npm run test:melee-depth` covers 22 real damage/state-machine and preview-state rules, 27 keyboard-to-game clinch paths at 30/60/120 Hz (including sleep, freeze and fatal slams), six Studio replay sequences, inspection frame bounds, wheel zoom retention and mobile overflow. Adjacent checks: `npm run test:impacts`, `npm run test:combat`, `npm run build`.

Verified this pass: all of the above, `npm run test:poses`, and `node tools/studio-combat-check.mjs` passed. Combat regression covered 53 heroes / 371 ability checks, 42 world checks, and a 30-second eight-fighter simulation (1,189 hits, 17 KOs, no invalid states or runtime errors). The independent reviews caught and closed sleep interruption, freeze cleanup, lethal ragdoll launch, preview-physics parity, phase labeling and camera-fit/zoom issues.

Motion/contact evidence is in `artifacts/melee-depth/`. Passing checks establishes these mechanics and regressions, not a subjective 10/10 rating or complete Bid For Power parity.
