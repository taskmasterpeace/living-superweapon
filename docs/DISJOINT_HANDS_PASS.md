# Independent hand articulation — September 8, 2026

## Retained change

A legal free-hand attack now has its own pose instead of borrowing the dominant
hand's brace. The regression was directly reproduced: a left volley beside a
right beam was paid and emitted, but its closed left hand pointed elsewhere.
Both orders of two separately authored volleys also exposed the issue.

- `cast-channels.js` keeps existing body/head/torso arbitration and adds ranked
  left/right hand owners using the same semantic masks as input contention.
- `hand-pose-channels.js` maintains the independent hand's target filter,
  gather/release weight and firearm description. The description is snapshotted
  because `firearmEmitter` returns shared scratch fields.
- `combat-pose.js` applies that hand's recoil/reach before the existing torso and
  cover constraints and shoulder/elbow settling. Its final wrist follows its own
  ray; guns use their actual barrel sockets and existing parallax/cover solve.
- `hero-hand.js` opens the corresponding unoccupied palm without opening a gun
  grip. The existing fingers-up casting shape and transported wrist roll remain.
- A continuously firing hand keeps its own history when it becomes the primary
  body carrier. It cannot inherit the departing beam's slow ray or charge gather.
- Recovering firearm descriptions refresh against the current form, including a
  rig rebuild after the trigger has already been released.

Movement, payment, projectile trajectories, hose steering, gameplay camera,
lock-on, map geometry and saved attack definitions are not changed by this pass.
This is not new left-hand beam/charge metadata: currently authored left volleys
and real left-mounted firearms are supported alongside a right-hand power.

## Reproducible verification

- Initial twelve dedicated witnesses: **12 failed before / 12 passed after**.
- Review exposed slow-ray and charge-history handoffs: both retained witnesses
  failed before the handoff repair and passed after.
- Review exposed a native MERC plated-to-fitted form change during left-pistol
  recovery: its detached-hand witness failed before refresh and passed after.
- Dedicated tests include both slot orders, actual independently aimed palms,
  asymmetric shot clocks, right-charge/left-volley coexistence, two different
  modeled gun sockets, guard interruption, eight locomotion states, and actual
  forearm/hand vertices against torso triangles at 30/60/120 Hz.
- `npm run test:disjoint-hands` includes the existing contention, volley, firearm,
  optic/two-hand, startup and palm-orientation suites.
- `npm run inspect:disjoint-hands` exercises real Studio controls, including
  undo/redo, then captures native production articulation and powers.

Studio procedure: select **VEGA → Attacks**, set RMB **Beam pose: Palm projection**,
set LMB **Firing hands: Left**, use **Motion state: Attack**, choose RMB as primary
and LMB as **Co-fire**. The dedicated Beam sequence intentionally lists beams
only; mixed power types use Attack. The browser check observed both actual
emissions and 234.76 measured target damage at its sampled time. Energy was
unlimited for the inspection; this is not a balance or AI test.

## Capture scope and rejected evidence

The initial `artifacts/disjoint-hands/before/` captures are partial; capture was
stopped after the ground chapter. The first `retained/` recording is also **not
accepted visual evidence**: its fixture advanced projectiles but omitted VFX and
particle lifetimes, leaving old flashes on screen. The fixture now advances those
production clocks too. This was a capture-harness defect, not a runtime VFX fix.

All fixture recordings are fixed-position articulation with velocity driving
native locomotion. They are not integrated entity travel, live AI gameplay,
imported flight animation, gameplay camera acceptance, or target-hardware FPS.
The real Studio authoring check separately uses the native encounter and damage
path. No stored user draft is replaced: the test has its own browser context.

## Remaining acceptance

The full original objective remains active. This pass does not certify every
custom proportion/equipment combination, first-shot volley anticipation,
hard-cover angular limits, whole-body anatomical limits, capes/cloth, every
locomotion transition, particle art, the complete BFP feature set or overall feel.
Source-gait and procedural combat overlays are not mislabeled as imported attack
clips. No 10/10, AAA or complete-game claim is made.

## Final verification

- `npm run test:disjoint-hands`: **234/234 pass**, including the 29 dedicated
  disjoint-hand cases. Final log: `artifacts/disjoint-hands/final-focused.log`.
- `node --test --test-concurrency=4 tools/*.test.mjs`: **1,413 tests, 1,409 pass,
  four fail**, no skipped/canceled cases; 144.33 seconds. Failures remain the
  stock31/platform60, tall/fixed-wall120, short99/platform120 cloth trajectories
  and virtual-surface artificial-corner constraint. Final log:
  `artifacts/disjoint-hands/final-root.log`.
- The earlier unbounded run had those four failures plus a Studio page-load
  timeout while a capture ran concurrently. It is retained as intermediate
  evidence, not substituted for the final bounded-concurrency result.
- `npm run build`: **passes**, 261 modules, 7.51 seconds; existing large-chunk
  warning remains. HEAD is unchanged at `e6a757f9abcc7473a05bebd229c716621c7d5903`;
  nothing was staged or committed.
- Independent read-only review: **retain within scope**, both reported lifecycle
  defects repaired, no remaining Critical/Important findings in the named change.
- Final browser run: real authored co-fire/undo/redo passes with no page errors;
  480 fixed-timestep native articulation frames and 160 captured video frames.
  Accepted recording: `artifacts/disjoint-hands/final/independent-hands.mp4`.
  Before, first `retained/`, and final recordings are not interchangeable.

Direct inspection of final ground/flight entry, sustain and recovery confirms
raised, open independent palms. The side view exposes both emission lanes;
front views can still be obscured by a projectile passing close to the camera.
The broad tapered torso, simple cape, oversaturated material/flash response and
first-volley anticipation still need an art/feel pass. This is useful animation
progress, not visual acceptance for the whole game.
