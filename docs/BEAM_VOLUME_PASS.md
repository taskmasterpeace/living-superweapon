# Continuous beam volume — September 8, 2026

Bounded presentation repair, not BFP parity or whole-game acceptance. This uses the same production material in gameplay and Studio; no new profile setting, physics rule, map, asset or render pass was added.

## Finding and retained change

The KANO frame at `artifacts/waistband/fitted/1-59.png` looked like two ribbons. Material isolation showed that its actual tube was filled and correctly facing the camera. The optical body was the defect: rear-view opacity was boosted only where moving decorative filaments happened to pass. A static GPU fixture at the real rear material opacity measured its center oscillating from **.342 to 1.0** while the geometry never changed.

`src/engine/beam-surface.js` now gives the continuous cross-section a stable density profile. Filaments still animate its color. The side-on profile and soft outside edge retain their prior behavior. The shader cache key is v5. The retained boost is **1.2**: the aligned regression fixture holds **.7524** core alpha with **.040306** maximum outside-edge alpha.

The first 1.7 candidate was rejected after the complete-contact test measured only .482 KANO target retention, below its unchanged .5 gate. Final 1.2 calibration measured .569 in that case. This was an occlusion problem, not white bloom: preserving a visible receiving character matters more than maximizing opacity. Global camera fade, tip rendering, packet history, finite travel speed, collision, steering, radius and damage remain unchanged.

## Verification

- New `tools/beam-density-check.mjs`: 192 actual GPU samples, RED on the old formula, GREEN on the final formula. Stable body density, soft edges and non-white rear core. It is not a complete target-readability proof.
- Final focused Node run: **107/107** beam bend, body contact, receiving brace, feedback and gameplay-lock checks (`artifacts/beam-hollow/focused-final.log`).
- GPU radiance (32 cases), filament motion (24 temporal samples plus camera rolls), rear/side contrast, native target visibility and complete held-beam contact were also run independently on the final shader. All passed. The complete contact matrix includes SOL at -90/0/90 degrees and charged KANO at 15 degrees. See the final logs in `artifacts/beam-hollow/`.
- `npm run test:beam-volume` is the repeatable six-browser-gate command. Its latest complete output is `artifacts/beam-hollow/volume-final.log`.
- Real T-key gameplay check passes: off-crosshair rejection, acquisition, unconditional release, phase break; crosshair remains visible. The existing Studio pierce checkbox undo/redo check also passes. This pass does not remove explicit lock tracking or alter aim-assist defaults.
- Final build passes (265 modules, existing large-chunk warning). The broad root run earlier in this pass, before the final 1.2 opacity calibration, reported **1,623 tests / 1,619 passing / four retained cloth failures**. Final shader behavior is covered by the GPU checks above; this is not a green full-suite claim.
- The old `npm run test:effects` chain stops at `beam-stream-check.mjs`: that fixture advances the beam without advancing the caster's required launch pose and reports zero travel. It also still expects full-range travel through a receiving fighter. Reconciliation with current launch/contact contracts remains open; no assertion was loosened or removed.
- Independent read-only review retains the final calibration without Critical or Important findings. No commits or unrelated user changes were made.

## Motion evidence

Final comparison: **`artifacts/beam-hollow/comparison-balanced.mp4`**, six seconds, 120 frames at 20 fps, H.264, 1280×400. Each side advances 360 native Studio simulation states at 60 Hz. The baseline changes only the shader expression through an isolated browser response override; it does not edit the worktree. Actual root/target positions, beam packet positions and velocities, reaction weights and damage match exactly across all 360 states. Both versions produce 487.025 damage, peak 97 draw calls and 34,355 triangles. These are scene counts, not target-hardware performance certification.

Receiving-character clip: **`artifacts/beam-pressure/balanced-core/advance.mp4`**, six seconds, 120 frames at 20 fps, 1280×800. SOL advances under a native KANO Wave Cannon, raises one arm and receives the stopping beam at the near body proxy. Actual recorded damage is 496.1. The motion and camera are scripted Studio inspection, not AI decision-making or human-input feel evidence. Both clips are silent, with no browser errors.

Authoritative comparison captures are `before-verified/` and `balanced/`. The first `before/` capture failed to boot because a raw response bypassed Vite's import rewriting; it contains no valid frames. `after/`, `filled-core/`, and `comparison.mp4` show the rejected 1.7 candidate and are superseded. Other probe folders are material-isolation experiments, not final gameplay acceptance.

## Still open

The material no longer relies on two bright strands to suggest the whole stream. It still looks too smooth from some angles, and tight physical reversals can narrow or pinch. The contact is a body proxy, not forearm/skin-triangle collision. Procedural trunk/cuff/hand art, cloth collisions, takeoff camera witnesses, complete custom-character combinations and subjective BFP/AAA feel remain unfinished. Game Studio's isolation and screenshot checks changed the diagnosis from a geometry rewrite to a narrow material repair; they do not certify the entire game.
