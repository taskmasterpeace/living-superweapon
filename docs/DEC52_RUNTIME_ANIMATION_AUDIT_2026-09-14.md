# Dec-52 and Thermavari runtime animation audit — 2026-09-14

Scope: existing character animation paths in this worktree. This is a source/call-site audit plus automated asset tests, not visual gameplay acceptance.

## Current integration

| Family | Existing assets/playback | Native character gameplay |
|---|---|---|
| Dec-52 rat/hound | `public/models/dec52/{rat,hound}/model.glb`; named-pivot clips in `src/engine/dec52-motion-library.js`; continuous preview through `src/tool/character-families.js` | Not connected. `createDec52GameplayMotion` has tests but no production caller. |
| Dec-52 remote mech | Same asset path with `mech`; idle/walk/run/jump/flight/hit/shutdown and left/right fire/claw clips | No production caller for the gameplay adapter. Humanoid nanite forearm powers are a separate existing system, not this actor. |
| Thermavari | Original articulated geometry in `src/engine/thermavari-character.js`; `createCreatureActor` dispatch in `src/engine/creature-character.js`; preview via `src/tool/creature-foundation.js` | Not instantiated as a Fighter. No gameplay movement/combat adapter. |
| Wolf/husky | Imported GLB with mixer, authored shoulder scale, explicit quadruped action map in `creature-character.js` | Same preview-only factory path. These are not substitutes for Dec-52 geometry. |

## Coverage and actual limitations

Dec-52 rat/hound both have idle, walk, run, bite, jump, sniff, flight, hit and shutdown in-place candidates. Jump articulates the body only; it does not move a collision actor. There is no dedicated lunge/pounce contact sequence, victim reaction, knockdown/get-up, or metal-bite damage integration. Formation uses clipping plus an instanced swarm in the existing character-family page; it is not a gameplay spawn transformation.

`src/engine/dec52-gameplay-motion.js` already selects locomotion from horizontal velocity, accepts attack/jump/hit tokens, pauses for hitstop, and completes shutdown. It deliberately does not own movement/collision/damage. Its only importers outside its own module are tests. Therefore "gameplay adapter tested" must not be described as "creatures playable".

Thermavari has five candidates: Idle, Walk, Stalk, Attack, Idle_HitReact1. Separate knee/hock/foot pivots preserve digitigrade anatomy. Height is 7.5 feet. Walk explicitly retains a rejected review because its support foot floats. No death, run, jump, lunge, airborne recovery or weapon-specific animations. Weapon sockets exist on each hand; the requested weapon set is not mounted by this factory.

## Next concrete implementation

1. Add one Dec-52 hound actor in the existing Threat Room, with an explicit non-humanoid body adapter. Reuse the shipped hound and `createDec52GameplayMotion`; do not build another workshop.
2. Keep the existing gameplay actor responsible for position, collision, health and hostile targeting. Disable humanoid pose/weapon assumptions for this body. Convert engine velocity to metres/second before passing it to the adapter (its documented input unit).
3. Drive attack/jump/hit tokens from accepted gameplay actions, not held buttons. Begin with walk/run and one bite with an explicit contact window. Show honest coverage for missing recoveries; do not substitute death as get-up.
4. Prove spawn, locomotion, bite hit/miss, interruption, defeat and disposal. Only then add rat variation and long pounce. Review feet and collision/body alignment in motion.
5. Thermavari follows separately after digitigrade foot planting is corrected. Its skeleton cannot consume humanoid shin tracks directly.

No bounded one-line reconnect exists: the missing seam is actor ownership, not a forgotten call on an otherwise complete playable creature. No runtime edits were made in this audit.

## Verification

Command: `node --test tools/dec52-motion-library.test.mjs tools/dec52-gameplay-motion.test.mjs tools/dec52-fire-pose.test.mjs tools/thermavari-character.test.mjs`

Result: 11 passed. Tests cover real Dec-52 GLBs, loop/one-shot behavior, interruption, side-specific mech fire, no root displacement, and Thermavari GLB roundtrip. They do not prove playable creature collision/damage integration or final visual quality.

## Adapter implementation follow-up

`src/engine/dec52-actor.js` now loads the actual shipped rat/hound GLB and calls `createDec52GameplayMotion`. It owns a scene root and disposal, synchronizes world position/yaw, converts world velocity to metres per second for locomotion selection, and accepts explicit stable bite/jump/hit tokens. It never writes back to controller position, applies damage or invents a collision shape. Two real-asset tests pass for both families, repeated action tokens, hitstop, locomotion, shutdown and disposal.

Remaining integration is explicit: add an existing Threat Room native controller caller (`MeleeTrial.startCreature`, adjacent to `startBag`) only after defining non-humanoid collider/health/attack-contact policy. That controller should own the actor handle and dispose it from `MeleeTrial.clear`; accepted bite contact must use the native combat system. This adapter is not yet a playable character, and no new workshop was added.
