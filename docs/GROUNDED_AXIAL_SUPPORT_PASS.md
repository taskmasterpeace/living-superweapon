# Grounded axial support — September 8, 2026

Retained functional repair, **not visual-feel or whole-goal acceptance**. The
full independent-combat objective and ten-part attachment remain active.

## Defect and implementation

Grounded chest attacks could remain preparing for ten seconds at steep targets.
The source forward lean plus the directional and chest pitch limits could not
reach the captured launch ray. The initial 18-case witness had six passes and
twelve failures; standing +1000u and moving +250/+1000u exposed the problem.

`ground-aim-support.js` adds a reversible body-support layer after the ordinary
carrier and before chest/spine/head/hand articulation. It distributes elevation
beyond .9 rad into a maximum .65 rad pelvis/body lean, approaching at 4 rad/s.
These are gameplay pose budgets, not anatomical certification. It rotates around
the rig hip and reconstructs the legs to the source stride's actual boot world
positions and sole orientations. Joint offsets and bone lengths are not stretched.
The current-rig snapshots restore before native locomotion; guard/form/KO and
takeoff retain their existing ownership. Takeoff fades support without foot IK.
Physics position, velocity, aim, camera, payment and source-bank data are unchanged.

Independent review rejected the initial implementation for two Important defects:

- Native `setSize` scales leg groups, unlike the editor's baked frame scale.
  Unscaled solve lengths displaced boots by .97u / 3.57u. The solve now uses the
  actual native group scale. Review rechecks measured errors below 2e-7u.
- Projecting a nearly straight knee onto the leg axis reversed its bend plane.
  Jog/sprint produced approximately 180-degree rolls in one frame. The retained
  solve uses the source knee's front direction and a stable basis at extension.
  Review measured turns below .43 rad/frame in those witnesses, not 3.14 rad.

A lower-severity ground/air/ground/downward-reversal witness exposed horizontal
overreach: lowering the body alone cannot satisfy it. The retained layer bounds
the requested support to a pose both legs can carry, instead of silently clamping
a boot away from its source target. The .079u displacement now measures below
1.3e-8u. This contact constraint can limit the requested presentation lean; it
does not grant unlimited chest aiming at every possible target.

## Fresh verification

- `tools/ground-axial-support.test.mjs`: **42/42 pass**. Includes 30/60/120 Hz
  first-launch witnesses, preparing-without-packets/voice, source/beam alignment,
  both boot transforms, unmodified joint offsets, frame scales .65/1/1.5, native
  size powers .65/1.9/3.2, jog/sprint front continuity, real forearm/fist versus
  torso surfaces, releases, form replacement, guard, takeoff and KO/respawn.
  Logs: `artifacts/ground-axial-support/{red,review-red,reach-red,review-repair}.log`.
- Earlier focused suite: **210/210 pass**; independent retained review also
  reran **42 support + 43 ground-motion/spine checks**, all passing.
- Final root command `node --test --test-concurrency=4 tools/*.test.mjs`:
  **1,491 tests, 1,487 pass, 4 fail**, exit 1, **128.09s**.
  `artifacts/ground-axial-support/retained-root.log` is authoritative. Failures
  remain stock31/platform60 torso face144 frame127, tall/wall120 cover face0
  frame95, short99/platform120 torso face80 frame84, and the fictitious per-corner
  cloth-wall constraint. No cloth implementation changed in this pass.
- `npm run build`: exit 0, **263 modules**, **6.26s**, existing large-chunk warning.
  `retained-build.log`. `git diff --check` exits 0 with existing CRLF warnings.
- `node tools/ground-live-check.mjs`: exit 0, no errors. Native key edges exercise
  movement, guard/release, takeoff, descent/landing, restored ground gait and
  light/heavy punching on ground and in air. Rendering is batched, not FPS proof.
- `node tools/ground-axial-gameplay-browser.mjs`: exit 0, no page errors. Actual
  Studio TITAN Chest-brace authoring and Undo/Redo precede a native-gameplay test
  of a **local test hose** using that pose. D/LMB and pointer lock are browser
  inputs; the subsequent relative mouse move is dispatched after acquiring lock.
  **300 native steps, 174 emitting samples**, first emission on the seventh held
  step (about .12s), minimum torso/beam dot **.995215**, **67.90u** lateral travel,
  .384 rad camera-yaw change, grounded throughout and support zero after release.
  Results: `artifacts/ground-axial-support/gameplay/results.json`.

The first gameplay harness wrongly tried to select a chest pose for SOL's optic
emitter. Studio correctly rejected that incompatible choice. It was replaced
with native TITAN chest-pose authoring; `gameplay.log` is the rejected harness,
`gameplay-retained.log` the passing one. **This does not add arbitrary chest-hose
origin/type authoring to Studio.** The native chest power remains a charged orb;
the continuous hose is explicitly a local test definition, with no saved-kit edit.

## Inspectable motion and visual criticism

Matching standing/strafe inspection:

- `artifacts/ground-axial-support/before/grounded-chest.mp4`
- `artifacts/ground-axial-support/final/grounded-chest.mp4`

Additional retained jog/sprint inspection:
`artifacts/ground-axial-support/running-final/grounded-chest.mp4`.
Both final videos are **8 seconds, 1280x800, 160 frames at 20fps**, each generated
from 480 native simulated states, with no page errors. Forty stills per sequence
record entry, held phases, recovery, front, both sides and rear. Native source
gait, projectile, particle and VFX clocks advance. These are **fixed-position
articulation inspections**, not integrated travel or target-hardware FPS evidence.
The intermediate `candidate` capture predates review repairs and is not final.

Directly inspected final standing, strafe, jog and sprint stills show that shots
now release and the knees retain their forward side. Recovery restores upright
locomotion. They also show an excessively limbo-like near-vertical chest pose,
conspicuous belt/waist separation, saturated shoulder/gauntlet shapes and cape
intersections/folds. Those are not accepted as polished superhero art. The native
near-vertical gameplay screenshot also obscures the character; its input/physics
test is not camera-composition acceptance. The existing BFP framing should be
preserved while that extreme-elevation clearance is examined separately.

Existing local locomotion metadata identifies the Quaternius Universal Animation
Library — Standard, CC0-1.0; the jog source is `Jog_Fwd_Loop`, sampled at 60 Hz,
mirror commit `e24c23cf2a1323488a3faa226ea7ea21f644b73e`. This is retained local
provenance, not a fresh web/license audit. Body support and independent combat
remain procedural. No new animation asset or dependency was imported.

The animation-authoring and Game Studio playtest workflow required the distinction
between source motion, procedural support, actual geometry checks and integrated
input evidence. No absent TypeScript/Vitest/lint contracts are claimed as passing.
Full pitch/roll anatomy, custom proportions/equipment, cloth, new emitter
authoring, steep-angle camera readability, art, performance and creator feel
remain open. No map changes, staging, commits or unrelated rollback; HEAD remains
`e6a757f9abcc7473a05bebd229c716621c7d5903`.
