# Independent chest articulation — bounded acceptance

This pass repairs concurrent torso/hand ownership. It is not a full-game, all-model clipping or AAA approval. The current objective and remaining requirements are in [the acceptance ledger](INDEPENDENT_COMBAT_ACCEPTANCE.md).

## Reproduced defects and changes

- A slow chest hose and fast palm hose could diverge while the chest continued following the hand-owned body pose. The initial production tests measured **16–25°** of chest/beam error across standing, strafing, hover, flight, ascent and descent at 30/60/120 Hz.
- `chest-pose.js` now supplies a reversible upper-body correction around the pelvis pivot after the movement/body layers, before head/arm aiming. It tracks the predicted chest hose direction; preparation tracks the commanded target. The torso, shoulder origins and head carrier move together. The head and occupied hands then solve their own targets. Physics position, velocity and planted legs are not rewritten.
- Recovery restores the previous base, including form replacement. A test reproduced a **−0.317u torso-Z offset** retained by an airborne replacement rig; the form restore condition now includes the chest overlay. The test permits legitimate idle breathing, but not persistent carrier offsets.
- Independent review reproduced stale chest rotation after KO. Real ragdoll stepping and respawn tests failed at 30/60/120 Hz. Respawn now clears rotational history **after** ragdoll restoration, keeping the saved base for the normal reverse restore. The final death pose is still captured unchanged.
- Frame-by-frame capture found a second handoff defect: shipped TITAN's first Twin Cannon packet could be **12.2/15.7/18.7°** away from the wrist ray at 30/60/120 Hz while Reactor Burst was still charging. An actively emitting hand beam now owns its final wrist ray immediately. Shoulder/elbow release blending remains; preparation and non-sustaining recovery retain their previous blend.

No damage, resource cost, attack timing, steering rate, travel speed, camera preset, roster definition or map was retuned by this pass. Beams remain traveling hoses.

## Studio use

The existing Studio uses the same new production solve. For the shipped overlap: choose **TITAN → Attacks → Q → Chest brace**, then **Motion: Attack sequence**, **Preview level: 10**, **Preview attack: Q**, **Co-fire: LMB**. Choose a grounded left/right/return path or hover and change target elevation. This is the existing reactor charge plus cannon, not a new sustained chest power added to the roster.

The browser fixture also supplies explicitly labeled chest/palm test hoses with steering rates 2 and 12. These isolate independent ownership; they do not overwrite saved kits. Broader custom-origin authoring and competing powers on one arm remain separate gaps.

## Evidence

- `tools/chest-channel.test.mjs`: **29 passing tests**. Eighteen direction/rate/state combinations; release/guard/form lifecycle; sampled real forearm/fist vertices tested against the closed torso mesh; actual boot bounds on the strafe floor; three KO/ragdoll/respawn cases; three native charge-to-cannon handoffs. The surface samples are every sixth frame, not a continuous collision proof.
- `tools/chest-channel-browser.mjs`: four 380-frame production Studio sequences, front/right/back/left/recovery views. Two use shipped TITAN reactor/cannon powers, two use labeled dual-hose test definitions. This stage drives production animation/abilities/projectiles; its prescribed movement/target paths and close inspection cameras are test fixtures, not AI combat or gameplay framing. The recording is silent.
- Final capture: `artifacts/chest-channel/final/chest-motion.webm`; per-frame data: `artifacts/chest-channel/final/results.json`; matching PNGs sit beside them. The earlier `verified/` directory is retained pre-wrist-fix evidence, not the final revision. There is no pre-chest-fix visual recording; that baseline is the failing numerical tests.
- Independent read-only review found and then rechecked the KO issue. A further wrist-change review ran 59 chest/concurrent-emitter tests and found no additional concrete regression.
- Final-version regression: **601/601 tests across 53 files**, then the browser-backed Studio-profile suite **18/18** in a separate GPU lane: **619 tests**, no failures/skips/cancellations. The earlier all-in-one run was 616/616 before the three wrist tests/fix, not the final count.
- Final capture: **1,520 frames, zero browser errors**. The shipped ground sequence's worst active palm/beam mismatch fell from 15.72° to **1.53°** (hover: **0.53°**). In the labeled dual-hose sequences, sampled chest mismatch after entry stayed below **0.006°**; both recovered to zero additional chest correction. These are bounded inspection paths, not an all-angle guarantee.
- `npm run build`: Vite 5.4.21, 249 modules, **exit 0**, 4.51s. Existing large-chunk warning remains: the shared Studio-profile chunk is about **4.90 MB minified / 1.74 MB gzip**. Scoped whitespace and new-module syntax checks passed; Git reports its existing LF-to-CRLF conversion notices.
- `npm run test:chest-channel` is the repeatable focused test-and-capture entry point (Vite must already be on port 5180).

## Tough visual assessment / remaining work

The independently oriented torso is an improvement, but the inspected TITAN still reads as assembled modules. Shoulder/waist seams are conspicuous; the large charged field obscures the upper body from the front. The inspection light also leaves the dark armor underspecified. Those screenshots are evidence of unfinished work, not promotional acceptance shots.

The new **0.8-radian** budget is an *additional* torso correction, with an 8-radian/sec rate cap. It is not a total pelvis-to-spine or neck anatomical bound. Broad target reversals, all custom body/equipment proportions, continuous mesh clearance, jump/land transitions, full-speed prone multi-channel combat and conflicting same-arm powers still need coverage. The shoulder/head/waist surface seams require a separate repair and fresh motion review.

This is a procedural combat overlay over the already retained CC0 Quaternius walk/jog/sprint source; no new imported animation take, BFP code, comic panel or third-party runtime was added. Game Studio's production-runtime playtest workflow and the animation-authoring acceptance checks drove the lifecycle and actual-mesh tests. They do not turn a representative pass into full animation acceptance. No target-hardware frame-time certification was performed.
