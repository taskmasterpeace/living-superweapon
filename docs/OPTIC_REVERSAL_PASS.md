# Optic turn coordination — September 8, 2026

This is a bounded movement/aim correction in the existing Three.js runtime, not full-game acceptance. The complete objective and attached brief remain active in `INDEPENDENT_COMBAT_ACCEPTANCE.md`. No map, camera preset, beam speed, damage, control binding, or saved character profile was changed.

## Reproduced defects

- Running SOL retargeted from 170° to −100° while the actual eye hose was sustaining. The original 30/60/120 Hz tests measured **78–87°** of face/ray disagreement and source-gait weight falling to **.416–.488**. The matched Studio baseline measured **78.12°**.
- The shoulder carrier followed command yaw/pitch, while the hose followed its independently steered 3-D path. Near-rear targets can produce a near-vertical intermediate ray even when the requested endpoint elevations are modest.
- Head and arm smoothing retained rotations in the body parent’s coordinates. Turning the torso moved its shoulder sockets without carrying those joint histories. Actual connected forearm surface rows and fists entered the closed torso; the new mirrored/scaled tests failed four of six cases before the arm repair.
- Independent review found excessive neck twist during .15-second target alternation, and a preparing chest attack incorrectly taking priority over a live slow-steering optic hose.

## Changes

`directional-pose.js` follows an actually sustaining torso/optic emission when choosing the grounded presentation heading and upper-body orientation. A charging torso cannot mask live optics. Free-flight/standing optics also orient their visual carrier to the physical ray when no chest beam is emitting. Authoritative velocity, player/bot intent, aim commands and collision position remain unchanged.

`entity.js` resolves nearly antipodal advance/retreat ties toward the threat side. `ground-motion.js` keeps the sampled gait through those lateral pivots, instead of blending back into generic casting legs. This preserves the source walk/jog/sprint animation; it does **not** add a separately authored pivot or sidestep clip, or establish a full foot-slide audit.

`combat-pose.js` transports head/arm history relative to the preceding torso and reconstructs it under the current torso. The elbow and shoulder still ease as a coordinated articulation. A live optic ray already has steering, so it does not receive a second delayed gaze filter. Neck limits are checked relative to the actual torso in both ground and airborne states, not the unrelated parent node.

`chest-pose.js` reuses the existing reversible upper-body carrier to supply the minimum additional support needed by an optic ray outside a 1-radian neck allowance, with the existing .8-radian additional correction cap. A preparing chest yields this support to live optics; a sustaining chest keeps its own channel. Release and form/KO restoration use the existing lifecycle. This additional cap is not proof of a complete anatomical spine model.

Beam packets still travel independently. Neither their steering parameters nor previously emitted trajectories were rewritten to make the pose tests pass.

## Verification

- **39 new optic checks:** normal reversals across strafe/hover/flight/ascent/descent at 30/60/120 Hz; mirrored visible lower-arm/fist surface and boot-floor checks at .65/1/1.5 scale; rapid reacquisition; slow optics plus chest preparation.
- `npm run test:optic-turns`: **109/109 Node checks**, three production Studio captures, and real SOL/SARGE movement/fire/release input checks pass. The captures contain **540 inspection frames**, with no browser errors.
- Final broad runtime/data/rig regression: **765 tests, 761 passing, four failing**. The failures are the retained cloth contact-velocity, material-rest metric, 60 Hz settling and 120 Hz settling cases. They were not weakened, skipped, or relabeled.
- `node --test tools/studio-profile.test.mjs`: **18/18 pass**, including untouched production flight joints across the shipped roster.
- `npm run build`: passes, 257 modules. The existing large shared Studio-profile bundle warning remains: 4,935.84 kB / 1,755.32 kB gzip.
- Independent read-only review closed its two reported defects. Its exact rapid-turn fixtures measured maximum neck angle **58.96°**, maximum eye/ray error **1.99°**; slow optics plus preparing chest measured **.323°** maximum error. Release restored the supporting carrier to identity.

## Captured evidence and critique

`artifacts/optic-reversal/before/` is the actual pre-change grounded recording, not a reconstruction. `artifacts/optic-reversal/corrected/` is an intermediate result and is superseded by `final/`.

| Final capture | Maximum eye/ray error | Maximum neck angle |
| --- | ---: | ---: |
| `final/optic-reversal.webm` — matched running sequence | .202° | 38.49° |
| `final/rapid-hover/optic-reversal.webm` | 1.450° | 58.34° |
| `final/prep-fly/optic-reversal.webm` — labeled configurable test powers | .302° | 57.08° |

The running source weight remains effectively 1 throughout the matched final sequence. Real input moved SOL 50.91 units and SARGE 49.40 units, with both recovering from fire. Those input checks step simulation with rendering disabled; the recordings are silent, fixed-velocity pose inspections. Neither is a foreground frame-rate benchmark or gameplay-camera/BFP-framing certification.

The actual final images were inspected. Face/ray coordination and arm carriage improve, but the cape still reads as a sheet, shoulder/waist forms remain visibly unfinished, and sharp hose curvature remains apparent during deliberately rapid aim alternation. Do not call the art, combat feel, or whole game 10/10.

The animation-authoring workflow required temporal and real visible-surface checks; the latter caught the additional forearm clipping. The BFP still at Ultra BFP 2:44 was re-examined for silhouette/context. Existing source provenance in `reference/BFP_CAMERA_AND_POSE_SOURCES.md` and `reference/BFP_ATTACK_AUTHORING.md` still applies: recreation code is not recovered original code. No new animation asset, comic panel, dependency or copied BFP source was shipped in this repair.

## Still open

Physically incompatible simultaneous live chest/optic directions need explicit multi-emitter constraints; this pass does not pretend one torso can satisfy every independently authored steering rate. Complete airborne travel/body independence, custom equipment clearance, dedicated directional/pivot clips, foot sliding during turns, cloth settling/shape, character art, dense-combat performance and creator feel acceptance remain open. The full objective is not complete.
