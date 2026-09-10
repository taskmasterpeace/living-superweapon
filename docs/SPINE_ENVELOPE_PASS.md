# Composed spine and physical axial aim — September 8, 2026

This is a bounded retained animation correction, not whole-game or AAA approval.
The full independent-combat goal and attached ten-part brief remain active.

## Defect and retained behavior

The directional layer limited the shoulders, then the chest layer added another
rotation. Final native strafing chest fire reached **94.47°** torso/pelvis yaw;
reversals changed the relative pose by **31.28° in one 60 Hz frame**. The initial
18 new production tests failed before implementation.

`spine-pose.js` now evaluates the composed torso in the pelvis frame after
directional/chest planning and before head/hand solves and contact. Ordinary
ranged articulation is limited to **1.2 rad yaw** and **12 rad/s relative turn**.
The projected interpolation path respects both budgets. This is a gameplay yaw
envelope, not a complete clinical pitch/roll anatomical model.

The reversible upper-body overlay uses current-rig snapshots. Guard and exclusive
combat/physics states retain ownership; form replacement and KO/respawn retire
the old history without changing the ragdoll's captured final pose. A bounded
presentation-only heading bias lets the body resolve sustained reach limits.
Physics position/velocity, mouse aim, camera, attack costs and saved kits are not
rewritten by that bias.

For native pose-launched eye/chest beams, new energy follows the actual final
source when a fresh pose exists. Planning still pursues the command through hose
steering, initial emission still waits for the captured target/readiness/payment,
and old packets retain their velocities. Simulation-only projectile-manager steps
keep ordinary steering rather than replaying a stale animated source.

Independent review caught an additional optic feedback error: primary eye aim
used a finite target point sampled before the body carrier moved. Committing that
slightly wrong gaze back to the beam caused permanent **7.80° / 23.77°** misses in
the elevated-flight witnesses. All live optics now refresh after the final carrier
and use the predicted ray directly, removing the artificial 100-unit parallax.
Both failing convergence witnesses now pass. The reviewer independently measured
command alignment above `.9999994` and unchanged sampled old packet velocities.

## Verification and scope

- `node --test tools/spine-envelope.test.mjs`: **36/36 pass**. Includes 30/60/120 Hz
  hand/chest/eye reversals, early/middle/late release, native form replacement,
  real forearm-surface/trunk intersections, guard handoff, held-target convergence
  and emitted-ray-to-command checks (not just beam-to-head agreement).
- Review-fix suite: **153/153 pass** across spine, axial launch/co-fire, chest
  channel and paired entry. Independent reviewer rerun: **141/141 pass** before
  the final six held-target witnesses were added.
- Full-suite follow-up exposed five pose-only fixtures without a real BeamHose.
  Their supported command-point fallback is retained; the optic post-carrier ray
  path requires the actual prediction/socket interface. Directional/spine
  compatibility tests then passed **45/45**.
- `node tools/ground-live-check.mjs`: passes real key-edge movement, guard/release,
  Space takeoff, descent/landing, source-gait restoration and light/heavy punches
  on ground and in air, with no browser errors. Full native simulation advances;
  rendering is batched, so this is not an FPS claim.
- Final root suite: **1,449 tests, 1,445 pass, 4 fail**, exit 1, **135.08s**.
  `artifacts/spine-envelope/retained-root.log` is authoritative. The failures are
  the existing stock31/platform60 torso face144 at frame127, tall/wall120 cover
  face0 at frame95, short99/platform120 torso face80 at frame84, and retained
  fictitious per-corner cloth-wall constraint.
- Final `npm run build`: exit 0, **262 modules**, **6.11s**, existing large-chunk
  warning. `artifacts/spine-envelope/retained-build.log`.
- `git diff --check`: exit 0, existing CRLF warnings only. No TypeScript/Vitest/
  lint gates are claimed for contracts absent from this JavaScript checkout.

`tools/spine-envelope-probe.mjs` uses native source gait and procedural combat
with fixed position. Its retained strafe hand/chest/eye maxima are **68.755°**;
fly chest is **65.766°** and fly hand/eye **68.755°**. All six measured maximum
60 Hz relative turns are **11.459°**, the 12 rad/s budget.

## Inspectable action

- Matching before/final native chest reversals:
  `artifacts/spine-envelope/before/chest-reversals.mp4` and
  `artifacts/spine-envelope/final/chest-reversals.mp4`.
- Each is **8 seconds, 1280×800, 160 frames**, with 480 simulated samples across
  ground strafe and flight. Front, left, right and rear stills capture entry,
  reversals and recovery. Production projectile, particle and VFX clocks advance.
- These are **fixed-position articulation inspections**, not integrated travel,
  real AI combat, or target-hardware FPS evidence. Chest beam definitions are
  explicitly fixture-authored; they are not claimed as a shipped chest-hose kit.
- `tools/spine-gameplay-browser.mjs` separately exercises actual Studio SOL
  Optic-focus authoring and undo/redo, then native game controller, physics,
  camera and beam updates using browser D/mouse input. Relative pointer motion
  is a dispatched mouse event after real pointer-lock acquisition. It uses an
  isolated browser draft and does not save over the user's character settings.
  Final check: **300 native steps, 180 emitting samples**, pointer lock acquired,
  camera yaw changed `.384 rad`, over 124u of lateral movement, minimum actual
  eye/beam dot `.99995994`, no page errors. It seeds an airborne starting position;
  it is not itself a takeoff/landing or automatic-AI check. An earlier concurrent
  screenshot run timed out and is not the final result. The retained harness
  submits one render per simulation batch, not hundreds of background GPU frames.

Local locomotion-bank metadata identifies **Jog_Fwd_Loop** from Quaternius
Universal Animation Library — Standard, **CC0-1.0**, sampled at 60 Hz. Mirror
commit `e24c23cf2a1323488a3faa226ea7ea21f644b73e`; source animation length
`.9166667s`, 56 samples. These are existing local provenance records, not a new
web/license audit. Flight, independent aiming and pressure remain procedural.

## Open limitations (not hidden by the pass)

- Extreme grounded chest preparation at **170° / +250u** can remain pending for
  ten seconds at the existing `.8` additional chest pitch cap. Review did not
  establish it as new here; it is unresolved and excludes universal first-shot
  or pitch-authority acceptance. A coherent grounded pitch/support solution is
  still needed, not a larger unbounded torso clamp.
- Four existing cloth-contact regressions remain. The cape is not accepted.
- Close-up silhouettes still show simple/tapered anatomy, conspicuous shoulder
  caps, saturated materials and belt/waist readability issues. Old released beam
  tails can clutter the frame. This is not a polished-art signoff.
- Studio tunes origins already represented by a kit; it does not currently expose
  arbitrary new chest-hose origin authoring through the beam inspector. That is
  a separate outstanding editor capability, not something this pass pretends to add.
- Full pitch/roll anatomy, all custom proportions/gear, lower-body turn-in-place
  and foot-slide acceptance, dense-combat performance and creator feel remain open.
- No map work, dependency changes, saved-profile writes, stage, commit or rollback
  of unrelated work. HEAD remains `e6a757f9abcc7473a05bebd229c716621c7d5903`.
