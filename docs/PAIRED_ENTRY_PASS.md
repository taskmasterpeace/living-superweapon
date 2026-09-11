# Concurrent attack entry and physical arm handoff — September 8, 2026

This continues the full independent-superhero-combat goal. It is not full clipping, anatomical, custom-character, BFP-feel, cloth or AAA acceptance. The camera, maps and saved character definitions are unchanged. The fixes run in the shared gameplay/Studio rig.

## Diagnosis and retained work

- Extending the existing 12 rad/s torso-relative shoulder/elbow assertion from final recovery to the whole active sequence exposed eight reproducible entry failures. The original paired-flight jump reached roughly 19/37/74 rad/s at 30/60/120 Hz. Inspection of the pre-correction visible mesh found no crossing: the old predicate used the widest arm radius everywhere and inflated every nearby chest height by that entire radius.
- Contact now uses the limb profile's local radius, physical sphere cross-sections through short torso slabs, and a conservative planar ellipse-distance calculation. It does not replace the hand or move the physics root.
- Independent review found three supported narrow/tall custom-body witnesses at the elbow's upper join. The renderer and contact now share `limbJoinTrim`. The actual join polygon edges are checked against torso slabs; a sphere around the entire join was rejected because it filled empty axial space and recreated a startup jump. The tests include the first upper-driver row and adjacent triangle centroids, previously omitted by the lower-driver/t-row selection.
- The actual chest sculpt is not the ellipse used to generate it. Its off-axis muscle relief exceeded those old bounds. Geometry construction now records per-row enclosing ellipses from actual Float32 vertices, with definition-specific radial expansion (about 0–4%, not a global all-height pad). These are captured before animated waist deformation. The three review witnesses demonstrated red→green.
- The corrected sculpt bounds exposed two renewed single-palm entry failures. Exact tracing found that the old fixed upper-driver sphere represented a section already removed by the rounded fillet; even the incoming pose was being projected by about .26 rad despite zero measured visible vertices/triangle-centroid crossings. Removing only that obsolete sphere, while retaining rendered join edges and all forearm samples, closes both 60/120 Hz failures. Independent review reran those native sequences and all seven helper cases on the final files: 9/9 passed.
- Screenshot comparison exposed an additional upper-body lurch: the flight aiming carrier became active in one frame. Initial airborne carrier acquisition now connects through a bounded shoulder/pitch path. Directional and thoracic support share the initial rendered-torso budget, including a first optic packet emitted before the carrier finishes connecting. Established live tracking remains direct and emitter solves run afterward. The explicit off-axis pending→live regression was added.
- Both the emitting and resting arms now aim for physical destinations before joint interpolation. Contact-aware progress retains a projected pose only if it satisfies the open-space angular budget; it does not interpolate corrected limbs back through the torso. If even the prior pose is infeasible, contact takes priority rather than claiming an unconditional motion bound.
- Recovery persists until the accepted joints actually reach the source pose, rather than ending at the scalar overlay cutoff. Hard cover retains immediate retraction priority: forcing it into the open-space budget stranded legal shots at the wall indefinitely. All eight thin-wall startup fixtures pass without moving the emitter away from the actual hand.
- Pressure-brace recovery compares an unhit control at the same animation time, not a hand position four seconds earlier. The old comparison differed by .02357 in Y due to idle breathing; the same-time hands matched exactly and the reaction had retired. The replacement checks all three coordinates and shoulder orientation to 1e-6 and requires a null reaction.

## Evidence and current verification

The animation-authoring acceptance matrix and Game Studio plain-Three.js/playtest guidance required native powers, actual rendered surfaces and multiple phases/angles. No new online reference, clip, comic panel or model was imported. Airborne footage is a procedural flight/combat overlay, not a named source animation. Existing imported ground locomotion remains in its separate pipeline.

`artifacts/paired-entry/before-clean/entry.mp4` and `artifacts/paired-entry/retained-contact/entry.mp4` contain matched hover and flight chapters: 480 simulation steps, 160 rendered JPEG samples at 20 fps, eight seconds, 1280×800 (confirmed with ffprobe). These are silent, fixed-position articulation inspections using the production Studio renderer and real native beam channels. They are not integrated travel, AI combat, continuous-video-playback inspection or an FPS benchmark. Front/left/right/rear stills exist at frames 0, 11, 12, 13, 30, 60, 120, 180 and 239.

Directly inspected: before-clean flight 11/12 left; intermediate reviewed contact flight 12 left, 30 right, 180 rear, 239 left and hover 30 front; final retained contact flight 12 left, 30 right and hover 13 front. The retained paired capture's shoulder peak changes from 18.19→12 rad/s in hover and 37.32→12 in flight; final flight torso peaks at 10 rad/s. The faceted/folding cape remains visibly unfinished. The initial `before/` flight chapter had a duplicate old body due to missing fixture scene removal and is rejected. `after-profile-contact/`, `final-joined-entry/` and `reviewed-contact/` are intermediate captures, not the retained result.

Fresh real F/D/mouse input checks at 30/60/120 Hz translate SOL about 109.4 units, retain lower-body/travel dot≥.98065 and eye/emission dot≥.9999965, then release/brake cleanly. Studio's real Co-fire control launches and recovers a 16.6-second secondary-charge rehearsal. Both browser checks report no page errors. They do not certify every hand-controller combination.

An eight-rig Node CPU isolation (240 steps, native animation plus separate beam managers, no rendering or inter-fighter contacts) measures 4.92 ms mean, 7.52 ms p95, 29.26 ms maximum on the retained code. This is not target-hardware game FPS or a dense-combat performance guarantee. A rare feasible-path search can evaluate multiple whole-rig matrices/constraints; its worst-case cost remains an explicit limit.

Retained full-root result: `artifacts/paired-entry/retained-root.log`, **1,362 tests, 1,358 pass, 4 fail**, 186.50 seconds under concurrent verification load. The only failures are the four retained cloth cases: stock31 platform60, tall fixed wall120, short99 platform120, and virtual-sample per-corner wall overconstraint. The earlier `final-root.log` with two additional single-palm entry failures is superseded, not accepted. The final build passes (260 modules, 36.58 seconds; existing large-chunk warning). The focused suite is **172/172** (`final-focused.log`), including full-sequence shoulder/elbow bounds, actual join vertices and triangle centroids, twelve body-entry cases, three custom static witnesses, three sculpt-envelope cases and all eight thin-wall startups. Final real-key gameplay-lock checks pass off-crosshair rejection, deliberate acquisition/release and phase break; the portable Studio piercing field and undo/redo also pass, with zero page errors. No changes were staged or committed. The complete goal remains active.

Reproduce with the running 5180 server:

```sh
npm run test:paired-entry
npm run inspect:paired-entry
node tools/flight-split-live-check.mjs
node tools/cofire-lifecycle-browser.mjs
node tools/gameplay-lock-browser.mjs
```

## Remaining acceptance

The identified paired/single-palm entry failures are closed in their retained fixtures. Continuous whole-limb triangle containment, the animated waist envelope, infeasible contact paths, arbitrary equipment/skin/custom proportions, broad total anatomical limits, conflicting same-arm powers, the four cloth cases, full-game performance and creator feel acceptance remain open. Hard cover may override the open-space angular budget to retract safely. The sampled limb envelope and representative trajectories do not prove broader requirements.
