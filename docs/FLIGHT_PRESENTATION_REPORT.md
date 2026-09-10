# Flight presentation implementation — September 5, 2026

Task 1 of `STUDIO_PLAN.md` is implemented in the shared production flight, motion and camera seams.
No roster source, map layout or geometry was edited. Existing uncommitted flight/rig work was preserved.

## Runtime contract

`src/data/flight-tuning.js` exports frozen plain `POSE_DEFAULTS`, `CAMERA_DEFAULTS`, and
`MOTION_DEFAULTS`. Consumers read per-hero `def.model.poses[state]`, `.camera`, and `.motion`
without mutating defaults. Joint overrides take precedence over procedural flight-style fallback.

- States: hover, forward, backward, brake, boost; all eleven requested joint fields are radians.
- Camera: 58.72° vertical, range 28, view-up height 10.5 from the existing 5.4-unit anchor,
  centered shoulder 0. Boost FOV **adds** 5.28°, boost range **adds** 1 unit.
- Motion response per second: acceleration 9, braking 5.5, boost acceleration 7.5.
- The current procedural state is observable as `f._flightPoseState`; joints blend through
  `f._flightJointPose`. Inputs and simulation remain authoritative.

Backward flight now uses a guarded, slightly rearward upright stance, including backward descent.
The body no longer follows negative-forward `atan2` into a backward Superman or inverted pose.
Knees flex independently and outward leg spread keeps the actual boot bounds apart. The spread
blends back to zero on landing. Boost lifts the chest 0.3 rad from exact horizontal at level speed,
fading that adjustment on steep travel; the centered rear camera can read the body above the boots.

The free chase camera accepts hero lens/framing overrides and keeps direct mouse pitch. It retains
collision traces, now also validating the predicted free-follow anchor before tracing to the eye.
Locked combat keeps its existing two-body framing formula. Motion ownership remains restricted to
uninterrupted PowerWorld flight; city clumsy/levitator physics retain their independent rules.

## RED evidence before fixes

The tests exercised `steerFlight`, real `Fighter._animate`, articulated mesh transforms and
`World.chase` through Vite, not copies of production math.

| Regression | Observed failure |
| --- | --- |
| Different acceleration profiles | Both produced velocity 35.6058 after 100 ms |
| Backward flight | Spine axis `[0, 0.000000107, -1]`, elbow 0.06 rad |
| Pose overrides | Requested arm −1.1/knee 1.2; got arm 0.05/knee 0.48 |
| Camera overrides | Requested centered 26-unit boom/62°; got x −3.5, z −32, 58° |
| Readable level boost | Spine vertical component 0.000000119 |
| Backward boot clearance | Actual boot boxes overlapped by 0.2086 units |
| Landing cleanup | Flight leg roll remained `[-0.08, 0.08]` on the ground |

The city-isolation fixture initially had independent random animation phases, causing different
clumsy wobble samples. Setting the same initial animation time made that comparison deterministic;
no production physics change was needed for that fixture.

## GREEN verification

- `node --test tools/flight-presentation.test.mjs`: **8 passed, 0 failed** after final edits.
  Covers configurable response, backward/downward guard and boot clearance, smooth override
  transitions, boost silhouette, free camera settings/pitch, boost increments/cover collision,
  city tier isolation and landing cleanup.
- `node tools/flight-feel-check.mjs`: **10 passed, 0 browser errors**. At 400 ms the default
  flight reaches 97.27% steady speed. After 650 ms release, speed is 1.48 and coast 9.13 units.
  Hand socket error 0; optic socket error 0.12. A requested 60° look pitch remains 60°.
- `node tools/flight-live-check.mjs`: real keyboard takeoff/release passed; all **53** roster rigs
  preserve sockets through flight → KO → recovery. No browser errors. Level boost pitch reads
  1.2708 rad (~72.8°) instead of 90°. Run after the boot-spread fix, before its final landing-only cleanup.
- `npm run build`: passed, 188 modules. Existing mixed static/dynamic import warning for
  `src/data/visual.js` remains. This build precedes the parallel Studio editor integration.
- `git diff --check -- src/engine/world.js`: passed (Git emitted only its CRLF normalization notice).

## Visual evidence and reference limits

`node tools/flight-presentation.test.mjs --capture` writes 45 production renders to
`artifacts/studio-flight/`: five states × front/left/right/rear/game cameras, plus start/quarter/
half/three-quarter/end samples of forward → backward → brake → hover. Use the direct `node`
invocation for captures; this Node version does not forward `--capture` through `node --test`.
The live-input takeoff/boost/brake/cast samples remain in `artifacts/flight-review/`.

Reviewed the supplied Ultra BFP rear-airborne frame alongside production rear framing, boost
side framing, backward front/both profiles/rear, and backward transition samples. The visible
boot overlap prompted the geometry-bound regression, not an assumption based on pivot spacing.

These are **procedural authored poses**, not imported BFP animation. The provenance and distinctions
in `docs/reference/BFP_CAMERA_AND_POSE_SOURCES.md` still apply: reconstructed camera code supports
the lens/orbit choices, recovered model documentation supports separate direction states, and
screenshots support silhouette intent. They do not provide original joint tracks or prove matching
timing. Full source-vs-target clip comparison therefore remains unavailable, and creator judgment
is still needed for exact feel. Cape bulk can hide elbows from the rear on some heroes; roster-wide
socket integrity is verified, but comprehensive per-costume mesh-clearance approval is not claimed.

The animation-authoring skill guided time-sampled evidence, mesh-volume checking and rig ownership.
Its `src/client`/TypeScript/Mixamo-specific paths do not exist in this JavaScript repository; the
production `entity`/`figure`/`hero-rig` contracts and existing browser checks were used instead.
No lint, TypeScript or Vitest scripts are configured here; no unavailable toolchain was installed.
