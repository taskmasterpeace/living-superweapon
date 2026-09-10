# Nanite forearms — Task 1 implementation report

Date: September 9, 2026. Scope: Task 1 only of the accepted September 8 brief. Final scoped code, automated fitting and parent browser checkpoint approved. This is not a completed cannon or physical shield capability.

## Implemented boundary

- Private, genuine-source configuration for cannon/shield modules, with finite/range/preset/stage validation, forbidden cannon origin controls, sparse source-identity overrides, and atomic effective-loadout forearm conflict rejection. Neither source is published in `POWERS`/ORIGIN. No package recipe is introduced.
- Pure per-Fighter `_nanites` reducer: six cannon cells / nine shield cells, exact assembly and quiet/reform boundaries, local damage, shield damage conservation, cannon structural failure result, no healing through toggles/form changes, frozen simulation clocks during native hitstop, inactive locked slots, new-life epochs, and idempotent retirement. Repair continues while retracted (parent-approved free-repair interpretation), but redeployment always requires fresh assembly.
- Figure-owned fitted metal views after skin binding and before foreground-material installation. Anatomical right is legacy `armL.children[1]`; anatomical left is `armR.children[1]`. No driven rig node was renamed/reparented.
- Fitting uses actual procedural mesh vertices or actual `SkinnedMesh.getVertexPosition` samples selected through the native lower-arm/hand driver records. It does not use the skin bounding sphere or whole-body bounds. Dimensions cancel the forearm mesh's nonuniform frame scale and apply body scale once.
- Cannon: six opaque staves, a true `weapon-muzzle` socket, fitted circular cuff, and an opaque cuff-to-inner-stave saddle. The saddle/cuff are visual fittings, not extra contact/armor cells. Barrel offset also clears the measured open-hand/bounded-wrist envelope. The hand/finger transforms temporarily sampled during construction are restored; no per-frame source-vertex fitting occurs.
- Shield: nine opaque plate cells. Layout matrices define the same unit-box envelope used by the cell snapshots; bevel remains within that envelope. No physical protection route is installed in Task 1.
- Bounded fragment instances (64 cannon / 96 shield maximum): exterior forearm assembly lanes, opaque closure during the final assembly quarter, no settled floating fragments, and bounded local hit/reform presentation following the current forearm. Density changes fragments only.
- Native Fighter lifetime hooks: assembly advances once in the positive-dt live update lane after the hitstop return; `_animate` presents only. KO/dispose immediately hide both pools and retire capabilities. Respawn starts fresh assembly. Form replacement preserves state/epoch/integrity and swaps only views. Removed or genuinely changed slot sources retire immediately (including zero-dt update); semantically identical source reconstruction is preserved using existing canonical `attackIdentity`.
- GPU ownership includes marked InstancedMesh objects in reference-aware figure retirement, alongside geometry/material/skeleton resources. The single `snapshotHeroSkins` hook bakes visible nanite instances into independently owned ordinary geometry. Native decoy and possession cleanup free their baked geometry after source form retirement.

### Deliberate exclusions

No cannon readiness/action handler, physical nanite hit routing, shield absorption in gameplay, final aiming adapter, new guard-fire exception, Studio clock/UI integration, public catalog source, or public package recipe is claimed. Direct `damageNanite` calls in this task are reducer/presentation tests, not native projectile/melee evidence. Existing global Guard legality is unchanged. No cape, physics, balance, military, source clip, migration, dependency, commit, or staging change was made.

Source replacement is retirement-only on an existing Fighter. Activating a newly introduced module requires a freshly built Fighter/figure; there is no hidden lazy source activation. Arbitrary unbaked raw clones remain responsible for their own independently allocated instance buffers; the supported snapshot consumers are explicitly tested.

## RED → GREEN evidence

1. Initial state/Attack run: 16 expected failures, 13 existing Attack tests passing. Failures established missing source-specific controls/state and absent whole-loadout conflict rejection.
2. Real-Fighter fitting run: 52 expected failures at the missing figure-owned view assertion, with reducer tests green. No syntax/import typo is counted as the behavior RED.
3. Native lifecycle/profile additions reproduced missing source-removal retirement and profile-level duplicate-forearm validation, then passed after the narrow hooks.
4. Parent visual review produced explicit assembly RED tests: interior fragment lanes and radially shrinking cuff intersected the fitted sleeve. Exterior per-cell lanes and axial-only cuff closure passed all sampled cube corners at nine assembly fractions. A separate triangle-edge test caught polygon inner faces violating the nominal clearance; fitting the polygon apothem fixed it.
5. Actual open hand/wrist testing found female source finger overlap at open hand and ±0.35 rad wrist rotation. One-time native finger/hand envelope sampling fixed both anatomical sides without changing the final hand pose.
6. Parent visual review found a floating barrel-to-cuff gap. Six body/side RED tests established no saddle; the opaque fitting now touches the actual cuff and a real stave, does not cross skin while assembling, and leaves cannon contact-cell count at six.
7. A reconstructed source with reversed object key order incorrectly retired the module. The RED now passes using canonical source identity rather than key-order-sensitive JSON serialization.

## Verification

Focused files: `nanite-state` 13 tests, `nanite-fit` 87 tests, `attack-tuning` 17 tests (117 total, included in the full gate below).

Exact final scoped regression command:

```text
node --test tools/nanite-state.test.mjs tools/nanite-fit.test.mjs tools/attack-tuning.test.mjs tools/construct-tuning.test.mjs tools/resource-construct-studio.test.mjs tools/hero-skin.test.mjs tools/progression-rig.test.mjs tools/charge-energy.test.mjs tools/charged-emission.test.mjs tools/hand-contention.test.mjs
```

Result: 296 tests passed, 0 failed, 0 skipped; 5.189 seconds. This includes resource-authoring/endpoint regressions, native source skins and form/resource borrowers, paid charge behavior, final charged emission, and hand contention.

```text
npm run build
```

Result: exit 0; 277 modules transformed, Vite built in 6.24 seconds. Existing large-chunk warning remains; no dependency change.

## Inspectable seams

`f._nanites.modules.get(slot)` holds `{slot, epoch, config, sourceKey, deployed, assemblyT, unlocked, retired, cells}` and derived `ready`.

`f.parts.nanites.get(slot)` holds `{root, arm, config, fit, layout, hull, fragments, cuff, saddle, socket, capacity, epoch}`. Shield `saddle`/`socket` are null. The root is directly under the actual driven forearm. `fit` contains sampled sleeve/hand dimensions and sample provenance; it contains no live collision receiver.

`snapshotNaniteCells(f)` returns intact, fully assembled, deployed cells as `{slot, epoch, cell, matrix}`. Every matrix is independently cloned and maps the unit box `[-0.5, 0.5]` to world space. `layout` has `{cell, center, size, quaternion, matrix}` in the scale-cancelled attachment frame. These snapshots are geometry/state evidence only until the later native-contact task.

## Browser / independent review

Parent-owned `tools/nanite-assembly-browser.mjs` initially captured nine body/frame/mirror variants and 54 images with zero app errors, but those images exposed the corrected closure-path and floating-saddle defects and are intermediate evidence only. Parent is regenerating the fitting images and adding labeled direct-reducer local break/reform motion evidence after the saddle gate. No browser gameplay/input/authoring claim is made here.

Final parent browser run after all corrections passed with **nine body/frame/mirror cases, six moving local-repair cases, 81 images and zero app errors**. The final run uses a private capeless SOL-based fixture so the rear attachments remain visible; it does not change SOL or any shipped character. Parent inspected representative procedural/male/female front, side, rear and orbit images, closure fractions, walking local holes/restoration and flying reform. Both the fitted mounting saddle and clear hands are visible; the locally damaged shield retains its other eight panels.

`tools/nanite-assembly-browser.mjs` uses the shared reducer and the actual production rig in Studio's native moving scene. It does **not** advance nanites through the future Studio authoring integration, inject a real incoming attack or certify gameplay camera/feel. A direct 20-integrity test hit absorbs 12 and returns 8 to its caller; the geometry snapshot count is 14 immediately, 14 during repair and 15 at completion. During the 1.15-second quiet/reform interval, each ground fixture travels 8.625 units and each flight fixture travels approximately 50.6736 units; snapshot matrices follow the actual animated forearms. Repeated zero-dt calls leave the inspected state identical.

Artifacts: `artifacts/nanite-assembly/results.json`, the nine fitting and six motion folders, and `private-moving-assembly.webm` / `private-moving-assembly.mp4`. The optional recording is silent: 240 explicitly stepped walking frames / four simulated seconds, with direct local damage at frame 75. Browser-paced video duration is 29.546 seconds (H264, 930×714), **not real-time performance or input-feel evidence**. No replacement animation, composited attack or synthetic audio is used.

Final independent review passed 117/117 focused tests. Additional independent probes covered 48 body/frame/side/offset combinations with open-hand and bounded wrist/assembly fractions, found zero sampled saddle/hand volume intrusions, retained six cannon cells, and verified reference-safe saddle/cuff geometry and exactly-once instance-buffer disposal through native decoy/possession cleanup. Canonical source identity preserves key-reordered reconstructions without healing or epoch changes. Existing undefined-color clone warnings trace to the preexisting `ShieldSurfaceMaterial.clone`, not the nanite material.

Parent final regression command also passed 286/286 tests, zero failures/skips, 49.389 seconds:

```text
node --test tools/nanite-state.test.mjs tools/nanite-fit.test.mjs tools/attack-tuning.test.mjs tools/form*.test.mjs tools/character-package.test.mjs tools/studio-profile.test.mjs tools/hand-*.test.mjs
```

This approval closes only Task 1's private reducer/fitted-view/lifecycle checkpoint. The complete nanite ledger row remains open.
