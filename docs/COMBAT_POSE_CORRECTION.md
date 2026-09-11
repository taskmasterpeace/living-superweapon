# Combat pose correction — 2026-09-05

Follow-up: [charged beam sequence](CHARGE_SEQUENCE_PASS.md) adds two-handed gather/thrust,
braced casting legs and a smaller beam charge-preview core. The notes below describe the
earlier aiming correction and its evidence.

This is a bounded animation correction, not a claim that the game has reached BFP quality.
No map, ability balance, collision, control, or camera behavior changes in this pass.

## What failed

Real SOL and KANO beam slots were sampled at level aim and ±0.7 radians of elevation.
The old head stayed horizontal; palms stayed in a fixed forward cast pose. SOL also raised
both hands as though heat vision were a hand beam. Seven assertions failed before the fix.

## Shared implementation

`src/engine/combat-pose.js` selects an overlay from the active beam's data, not hero IDs:

- Face/chest source: fists braced below the ribs; head follows the attack.
- Hand source: primary palm tracks the target in 3D, with a bent elbow and a guarding off hand.
- Entry, moving aim and release are smoothed. Guard, strike, grab, charged melee and disabling
  states suppress the overlay. KO clears its cached target and weight.
- The prior base rotations restore before locomotion runs. Physics position, rig hierarchy,
  flat arm FK, equipment attachments and ragdoll ownership are unchanged.

This is procedural animation. It does not import or claim to reproduce original BFP clips.
The animation-authoring skill's referenced TypeScript lab does not exist in this JS repository;
verification uses the actual runtime, articulated sockets and production slots instead.

## Verification

`npm run test:poses` exercises six real beam cases with entry/hold phase samples, moving aim,
stagger priority, release-to-hover and KO/respawn. It also captures chase, side and front views
under ignored `artifacts/flight-review/combat-poses/`. Numeric results are in `checks.json`.
The KO regression was reproduced failing for all six cases before adding lifecycle cleanup.

Related regression commands: `npm run test:camera`, `npm run test:flight`,
`npm run test:combat`, `npm run build`.

## Still open

The lower-body casting hover remains stiff; large charged beams dominate some close front
angles. Single-arm casting is not a bespoke two-handed charge/release sequence. Those need
further visual work. Camera visibility and pose alignment tests are safeguards, not a quality score.
