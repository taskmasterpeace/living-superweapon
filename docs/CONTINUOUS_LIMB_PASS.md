# Continuous limb surfaces

September 6, 2026. A bounded model/rig improvement, not a claim that the game or its BFP feel is complete.

## Change and ownership

The procedural upper/lower arms and thighs/shins used separate capped lofts. Their ends exposed
wedge-shaped seams during flexion; separate knee spheres reinforced the assembled-mannequin look.

`src/engine/hero-limb-surface.js` now builds one connected surface per limb from the loft profiles
recorded by `anatomyGeometry`. It binds after frame scaling and costume installation. The original
meshes remain socket drivers with their own draw ranges disabled: arm children 0/1/2, named leg
members, hand-mounted weapons, and costume attachments are unchanged. The old knee ball is hidden.

Different sleeve/skin materials use two single-material draw views over shared positions, normals,
indices, and bounds. Matching materials use one draw. This preserves the existing material contract
used by invisibility and duplicates, without adding one draw call per cross-section.

The flexion region spreads along the limb according to bend angle and available length. Connector
frames follow the actual curve tangent, including independently oriented 3-D ragdoll bones.
Thickness is bounded by actual curve curvature when near-folded Verlet joints separate slightly.
This is a procedural visual surface, not a new skeleton, collision shape, or imported animation.

The final animation layer updates the surface after combat IK and hit reaction. Ragdoll apply and
restore update it immediately too. Physics positions, hand sockets, aim, beam transport, damage,
camera mechanics, and map design were not changed by this pass.

Holograms snapshot the deforming geometry instead of borrowing live buffers. Expiry and match
cleanup dispose only those owned snapshots; ordinary static geometry remains shared.

## Regression evidence

The new `tools/limb-surface.test.mjs` contains 13 tests:

- Four costume/hero topology cases first failed because no continuous surface existed.
- A draw-budget regression caught the first implementation's per-ring draw groups.
- A material-contract regression caught material arrays incompatible with existing copy powers.
- Signed triangle tests caught seven inward-facing triangles at an ordinary 1.4-rad elbow bend.
- A seeded real-ragdoll test failed at SOL frame 81. Tangent correction alone then exposed a
  near-folded VOLT knee; the actual-curvature correction made all 28,800 tested limb-frames pass.
- Custom frame bends, anchored terminals, finite/unit normals, unchanged-pose caching, loop
  recovery, actual Fighter animation, and immediate ragdoll restore are checked. Disabling surface
  updates in the production animation test is detected as a detached terminal.
- Real hologram creation first failed because it borrowed live buffers; it now proves frozen
  pose ownership and owned-only disposal on expiry.

The independent source review additionally exercised 92,160 varied seeded ragdoll limb-frames
without inverted triangles. That is geometric evidence, not an anatomical or visual quality score.

Final verification:

- 38 model, limb, and Studio profile tests passed.
- `studio-combat-check.mjs`: nine hero/elevation cases, real beam catalogue contact, deterministic
  seek/playback, recovery, unsupported kits, and editor navigation passed with no page errors.
- `studio-encounter-check.mjs`: four moving encounters, three layouts, validation and isolated
  preview state passed.
- `npm run test:flight`, including all 53 roster flight/KO/recovery rigs and wake checks, passed.
- `npm run test:poses` and `npm run build` passed.
- Earlier in the same pass, editor edit/undo/redo/save/reload/import/export and ORIGIN integration
  checks passed. The full `test:studio` command was not completed as one uninterrupted final run.
- The full camera/effects suites were not rerun for this surface-only change. The final moving
  armed capture exercised the production camera and real input and caused 166.215 damage over
  69.225 units of player travel, with no page errors.

Two Studio catalogue runs timed out at the following roster click. Captured pages retained the
roster, had no reload and no page errors. The instrumented rerun passed without a production-code
workaround. The cause is not proven; navigation/context diagnostics and failure capture remain in
the test rather than silently increasing its timeout.

## Final motion evidence

- [Armed rig motion](../artifacts/flight-review/limb-surfaces/rig-motion-labeled.mp4): nine seconds,
  180 frames at 20 fps. Production Fighter flight articulation, real Ragdoll floor contact and
  restore, right-hand rifle, scripted velocity and fixed flight root on Studio's neutral floor.
  Labels identify the review rather than claiming live input or an imported BFP clip.
- [Moving armed fight](../artifacts/flight-review/limb-surfaces/moving-armed.mp4): six seconds,
  120 frames at 20 fps. Real strafe input and production combat/camera, scripted passing opponent.

The rig sequence was inspected at hover, cruise/boost, tumble entry, floor contact, terminal hold
and recovery. The earlier charge sequence also supplied front, both profiles and rear views.
The BFP reference provenance remains in `reference/BFP_CAMERA_AND_POSE_SOURCES.md`; no original
BFP animation data was imported. The animation skill's TypeScript/Vitest paths are absent in this
JavaScript project, so the commands above are the actual gates, not substituted claims of those tools.

## Remaining quality limits

This does not unify the torso, pelvis, shoulders or neck. Their separate silhouettes remain visible,
particularly in a compressed ragdoll. The ragdoll has no anatomical hyperflexion limits: a roughly
171-degree fold can narrow the connector sharply. It remains connected and outward-facing but is
not anatomically credible. Terminal cap normals also still blend with the side surface.

A final local CPU microbenchmark with every limb changing measured about 0.21 ms per fighter for
animation versus 0.01 ms with surface updates disabled (4,000 frames). This is not a GPU/frame-rate
claim. Large crowds need a deformation budget; ordinary unchanged relative poses skip uploads.

The continuous surface removes elbow/knee separation. It does not establish overall AAA quality,
comfortable camera control, or BFP-equivalent play feel. Those remain acceptance work.
