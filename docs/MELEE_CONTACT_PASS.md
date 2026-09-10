# Directed melee contact and close-range camera

September 6, 2026. Incremental correction, not game/editor acceptance.

Follow-up: [authored light strikes and synchronous contact](AUTHORED_STRIKE_PASS.md) adds licensed jab/cross stance, grounded/airborne Studio rehearsal, and moving-victim sweeps after both fighters' final poses. Its 30/60/120 Hz reversed-order checks extend the endpoint-only evidence below. The original checkpoint and remaining wider BFP acceptance limits are retained as history.

## Changes

Power World strikes now use their startup/active/recovery clock to drive a fixed-length,
two-bone punch toward the committed world aim point. The third combo beat is a cross,
not the old kick. An off-hand guard and body counter-rotation accompany the extension.
The existing combat base restoration removes the overlay before the next pose; weapons
stay attached to the existing driven hand hierarchy.

Contact is resolved after Fighter physics/animation, by sweeping the actual fist against
the transformed torso/head/pelvis bounds with 0.42 units of glove allowance. The authored
reach remains an outer limit, not permission to hit through empty air. Impact effects use
the detected contact point. City cone combat and grab selection are unchanged.

The added approach impulse is budgeted against the committed aim distance. Previously,
the power punch could travel past a nearby opponent before its wind-up finished. An
additive step channel preserves this approach through flight-controller hover braking;
it does not remove incoming player momentum or teleport the character. Freeze cancels
the committed strike rather than preserving an old swept-fist sample until thaw.

Close lock-on now rotates its automatic sideways opening around the authored horizontal
camera distance. Previously, adding the side offset increased a 34-unit rear boom to
roughly 44 units horizontally. Normalizing those two components keeps contact larger in
frame. Explicit authored shoulder and frame-claim offsets remain additive. Free aim and
long-range framing, where the automatic opening is zero, are unchanged.

## Evidence

- `node tools/melee-contact-check.mjs`: 36 scenarios at 30/60/120 Hz, using real movement,
  Fighter updates, strike damage and rendered body bounds. Includes left/right jabs,
  cross, power, block, crush, interrupted startup, freeze, distance and elevation misses.
  An additional KeyV event→controlPlayer→damage check produces one 8.32-damage locked jab.
- The initial regression exposed damage with visible gaps exceeding six units. The
  controller-inclusive fixture separately failed when braking erased the approach;
  frozen-swing coverage separately failed before cancellation was added.
- `npm run test:impacts`: recoil and altitude regressions plus the new contact suite.
  Altitude effects use fixed roots and the production pose/contact resolver; they do
  not claim terrain/locomotion coverage.
- `npm run test:camera`: the level-target clinch fixture increased player head-to-foot
  screen height from about 16.6% to 20.5%; opponent height from 12.9% to 15.4%. Existing
  53-rig checks at four level-target distances report no self-occlusion.
- Beam pose, flight, Studio/ORIGIN, full ability regression, 30-second combat soak and
  production build were also run. The soak reported 1,098 hits, 15 KOs, no invalid states
  or page errors. This is not a subjective balance or melee-tactics acceptance test.

`tools/melee-contact-reel.mjs` records jab and power from the production chase camera,
cross and a falling-target miss from labeled inspection cameras. Motion uses the real
movement/strike/update pipeline, with scripted inputs and no AI. The inspection camera
fits the falling pair after the first capture cropped them. Artifacts are in
`artifacts/flight-review/melee-contact/`.

Independent read-only review found the controller and freeze issues above; both were
fixed and re-tested. The camera follow-up found no new regression in its scoped change.
The animation-authoring skill's TypeScript/Vitest files are absent here; this JavaScript
project uses its production rig and existing Playwright/npm verification instead.

## Remaining acceptance gaps

The small procedural models and clenched hands still limit visual quality. The stacked
white contact layers are addressed by [the close-contact readability pass](MELEE_READABILITY_PASS.md).
This is not authored fight choreography, and the camera still
needs moving melee review across the roster. Fast moving targets with reversed entity
update order, ground separation, and all interruption combinations are not established
by this suite. A steep, very close underfoot self-occlusion was reproduced by the reviewer
both before and after the camera correction; it remains open.

Studio still needs an opponent/attack simulation in its game-camera preview. No map
design was changed. BFP feel and broad readiness remain unaccepted.
