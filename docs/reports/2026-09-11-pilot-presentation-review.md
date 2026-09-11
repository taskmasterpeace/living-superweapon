# Reference video and pilot presentation

## What the clip actually shows

Source: user-supplied `comet_cN0fMlI4BH.mp4`, 1192×644, 30 fps, 19.633 seconds. The beginning includes a paused video player; the useful movement and attack frames come later.

- Around 11 seconds: backward/sideward movement keeps the character facing the fight while lifting and bending the legs. It is an airborne brace, not a reverse running cycle.
- Around 18 seconds: long radial intake streaks and a growing source halo precede a large release flash. The energy envelope extends beyond the body. The clip does **not** establish that the entire sustained beam remains that wide.

Extracted contact sheets live in `artifacts/power-pilot/reference/`. Native baseline sequences use `tools/pilot-flight-capture.mjs` on port 5182, normal practice spawn, real keyboard/mouse and the production chase camera. No actor, camera, energy, pose or simulation override is applied. Baseline labels were corrected after discovering that APEX RMB is Tail Sweep, not charge; only the second run actually charges and sustains the LMB Wave Cannon during retreat.

## Findings

1. **Retreat exists but reads weakly.** Measured backward hips reach approximately -.30/-.18 radians and knees .68/.48, yet the legs look almost hanging from behind. Improve the silhouette while preserving velocity-driven state selection and authored overrides.
2. **Charged source and sustained source have different owners.** ChargeGather builds around a charge orb; BeamHose creates the reached, sustaining source and contact. Enlarging the sphere alone would hide the player and repeat the same effect across every attack.
3. **The current beam is visible on release.** The baseline charge frame is not missing emission: it is explicitly CHARGING. Later FIRING frames show the production hose. This does not by itself prove contact/readability against a moving foe.

The second baseline caught one transient HMR parse error while another task was editing the runtime. It remains useful inspection evidence, but is not a clean acceptance recording. Capture again after code settles.

## Recommended beam variety

Keep the Impact bible: comic punctuation, readable target, original character palettes and centered BFP framing. No permanent whiteout.

| Emitter family | Preparation | Release / sustain | What stays legible |
| --- | --- | --- | --- |
| Eyes / precision | Tight facial glow; minimal intake | Compact paired source, narrow continuous core | Head, target and aiming corridor |
| Single palm | Directional intake into the open hand | Brief asymmetric hand flare; compact sustained source | Casting hand and locomotion silhouette |
| Heavy two-hand beam | Larger inward streak radius and readiness envelope extending beyond the shoulders | Short rearward radial release burst, then settle to a bounded source; recoil follows the attack phase | Target remains visible after the initial punctuation |

Reuse existing charge timing, finite buffers, material preparation, light pool and reached-contact authority. Linear's source/orb and layered core/sheath/halo structure are the relevant mechanisms, not its application framework or targeting manager. See the [primary source](https://github.com/achrefelouafi/LinearAbiltyCastingThreeJS/blob/main/src/materials/BeamMaterial.js) and the separate reference-usage audit. Any source adaptation must record the pinned revision and retain the MIT notice.

This table is the next visual implementation proposal, not a claim that these new profiles already ship. Current pilot acceptance must not wait on importing a creature generator or a different animation framework.

## Acceptance status

Native run `artifacts/power-pilot/flight-after/results.json` on revision `5e7db28` completed through normal practice spawning and keyboard/mouse input, with no actor/camera/energy/simulation overrides. The controller inspected the retreat and emission screenshots plus the ordered whole-recording contact sheet. The backward knees now read asymmetrically, the legs remain braced through charge and emission, and recovery returns to hover. No boot crossing or abrupt full-body upright reset was observed in this sequence. The source remains in front of the character; the more expansive three-family treatment above is still a proposal, not shipped VFX.

- Captured at 1440×900, RTX 4090 via ANGLE/D3D11, quality tier 2, pixel ratio 1.
- Zero recorded browser errors or simulation faults. A single renderer draw-call counter after postprocessing is not a whole-scene draw-call/performance measurement; no FPS claim follows from it.
- `retreat-and-beam.mp4` is the normal-input gameplay portion of `native-flight.webm`, trimmed only to remove loading/menu time. It contains **no audio**.
- This accepts the narrowly changed retreat posture/transition readability in the tested APEX view, not AAA animation quality or all-character pose/clipping acceptance. There is no struck target in this flight capture, so it does not prove beam impact quality.
- WEBLINE's separate `web-native/web-gameplay.mp4` shows actual Q contact, the white wrap, 4 direct damage, and expiration. It is close-range readability evidence, not acceptance of every WEBLINE power.

Production-rig regression: 16 retreat cases across 30/60/120 Hz and authored overrides; 52 scoped flight tests passed in the task report. Independent Task3 review accepted spec and implementation, with a minor future test improvement to assert authored overrides on final rendered joints rather than the pose target cache.

Integration rerun on `060ecac`: `flight-final` and `web-final` both completed cleanly and their ordered contact sheets were inspected. Flight capture quality adapted to tier 1 / pixel ratio .86 on the same GPU; no performance acceptance is inferred. Use the `*-final` clips for handoff. A subsequent sleep/downed admission-only amendment is verified separately by controller regressions; these captures do not demonstrate those states.
