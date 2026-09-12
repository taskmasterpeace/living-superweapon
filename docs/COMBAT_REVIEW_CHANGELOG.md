# Playable combat review checkpoint

This is a local integration checkpoint, not a completed release. It includes the surrounding operation, lab and transport dependencies needed to reproduce the recorded combat routes.

## Player-visible changes

- Direct melee controls: V attacks, Q guards and E interacts, grabs, carries and throws. C crouches; I opens inventory. Ordinary melee no longer occupies the power carousel.
- Attacks can close distance through a step, agile pounce, heavy bound or flying entry. The approach leads into a strike that still needs contact; focusing a target does not guarantee a hit.
- Light sequences lead into spacing finishers. Funded frontal blocks spend energy without losing health; breaking guard, attacking from behind and interrupting a grab provide counterplay.
- Carry an opponent, fly with them and aim a throw into the ground or cover. Carry time is bounded, and eligible escapes recheck their resource requirements.
- Melee can damage vehicles through their existing damage system. Hit material and damage type are separate: metal contact can read differently from flesh without changing an attack's damage category.
- Beams retain a traveling tip, gain visible scale with charge and make ground contact readable. Releasing or retiring a beam cleans up its active effects.
- The default flight camera sits farther to the right while keeping the same field of view. Alt look moves the head; flight feet, nearby wakes and speed-stage feedback make airborne motion easier to read.
- The second Shift hold requests the intrinsic power-up. Entering the third movement stage does not repeat that request.

## Verification and footage

The isolated candidate passed its build, 237 focused combat/movement/camera tests and 44 audio/driving/building integration checks. Native browser recordings cover SARGE light/finisher contact, VEGAS short/long beam cycles and ground impacts with no reported runtime or same-origin HTTP errors on those routes. Subsequent source changes only normalized trailing file endings.

The primary checkout retains all footage under `artifacts/marketing/combat-pass-2026-09-12/`. Recommended latest folders:

- `02-sarge-combo-isolated-candidate`
- `beam-isolated-candidate`
- `beam-ground-isolated-candidate`
- `02-sol-grab-backside-escape-review-ready`
- `flight-backside-highest-fixed`
- `lab-camera-backside-default`

`combat-guide.png` and its editable HTML explain the combat rules; they are development diagrams, not gameplay footage. Separate recorded master-audio files exist for selected clips. They have not received listening approval. Videos remain local rather than being bulk-added to Git.

## Known remaining work

- Finish representative combat balance and sound listening review before closing #14–16. Recorded training-target hits do not prove every roster matchup is balanced.
- Reconcile scout steering direction and wheel animation in #26. This checkpoint preserves the useful shared mission/manual driving API but does not preserve every fix from the original driving handoff.
- Physical iPhone and controller ergonomics remain separate validation work; synthetic controller tests are not physical-device approval.
- Complete scoped release review and delivery under #4. No release-complete claim or issue closure accompanies this checkpoint.
