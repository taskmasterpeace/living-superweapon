# Compatibility with the engine's contracts

## The pose bridge (humanoid motion)

A `humanoid-motion` package's `pose-bank.json` has exactly the shape of the bundled banks the
engine already loads (`src/data/locomotion-bank.json` and siblings): `{version:1, source, clips:
{id: {take, duration, frames[45-float][], loop extras}}}`. `authoring/lib/humanoid-retarget.js`
is the mapping-driven form of `tools/lib/quaternius-source.mjs`'s bake, and
`authoring/test/retarget.test.mjs` proves it reproduces the shipped locomotion, strike, jump and
heavy banks **frame for frame** (compared in JSON form, which is how the engine consumes them).

Frame layout (`authoring/lib/slots.js`):

| floats | meaning |
| --- | --- |
| 0–23 | eight unit segment directions: arm L upper/fore, arm R upper/fore, leg L upper/lower, leg R upper/lower |
| 24–43 | five unit quaternions: hip, chest, head, foot L, foot R |
| 44 | source foot suspension over leg length |

Playback in the viewer uses `samplePoseFrame` and `applyAuthoredPose` from
`src/engine/authored-pose.js` unchanged. The engine's segment lengths, elbow poles, torso frame
and support correction are therefore the engine's; a package cannot bring its own.

**Slot sides.** The engine's `L` slot is the negative-X limb. Both Quaternius mappings and the CMU
mapping feed the anatomical limb that lands on negative X into `L`; `checkBindContract` refuses a
recipe that gets this backwards, and a test drives that refusal.

**Root motion** is never carried. The validator refuses any clip with a `rootMotion` key; the CMU
parser reads the root translation and discards it.

## The rig sockets (bodies and equipment)

`humanoid-body` packages record the engine's own sockets by name — `rightHand`/`leftHand`
(`arm.children[2]`), `pelvis`, `chest` — as parents, plus derived `holster.hip` and `sling.back`
offsets expressed in that parent's local space (with the world offset also recorded, because a
socket parented to a frame-scaled part inherits its scale).

Equipment mounts by its `grip` socket onto the fist exactly as `buildWeapon` output does today:
the GLB root is added under `arm.children[2]` with the inverse of the grip transform, so the grip
coincides with the hand origin and the muzzle runs down the hand's −Y axis. The engine's own rifle
already names `weapon-support-grip`, `weapon-magazine`, `weapon-charging-handle` and
`weapon-stock-contact`; a package's `support`, `magazine` and `muzzle` sockets are the same
concepts, so the runtime carrier can read them without a new convention.

## Hit zones

Body packages carry six derived zones (head sphere, torso capsule, arm and leg capsules) attached
to rig part names (`head`, `pelvis`, `armL`, `armR`, `legL`, `legR`). They are **metadata**: the
viewer draws them; nothing in this branch tests a projectile against them. The runtime collision
and effects design stays with the main task (the brief's body-part section).

## `lsw-character` packages

Unchanged. A visual asset package is not a kit package and `src/tool/character-package.js` is not
touched. The proposed reference from a kit to a visual package is a single field,
`profile.model.assets: {body?: "<id>@<version>", motion?: [...], equipment?: [...]}`, validated
as plain ids by `validateProfile` — recorded in INTEGRATION.md as a proposal, not applied.

## Creatures and props

`creature` packages use their own skeleton (`anycreature@1`, currently 27 bones for the hound) and
carry idle/move/attack animation clips inside the GLB; they are played by a `THREE.AnimationMixer`
on that skeleton and never touch the humanoid bridge. The validator refuses a creature that
declares the humanoid pose bridge. Props carry sockets only.

## Units and axes

All outputs are game units (1u = 0.19 m), +Y up, +Z forward, right-handed. Every manifest carries
`units.sourceConversion` saying how the source got there (Quaternius: identity; CMU: directions
only, 0.0564 m per source unit recorded; anyCreature: ×5.2632 wrapped under a `game-units` node;
procedural factories: authored in game units directly along the weapon axis).
