# Studio combat preview — September 6, 2026

The previous editor supplied no opponent to its game-camera preview and could not demonstrate
an attack. This pass adds an anchored beam fixture to the existing authoring surface. It does
not claim to finish the editor, game art, combat feel or BFP fidelity.

## Shared production paths

`StudioCombat` owns only the fixture, scripted input timing and transient lifetime. It calls
`runSlot`, `Game.spawnBeamFor`, `Projectiles`, `Fighter.takeDamage`, `Fighter._animate` and the
production `World.chase` method. The previously inline casting/recovery clock is extracted
unchanged as `Fighter.advanceActionPose`, used by both the game and Studio. No alternate beam
geometry, hand solve, camera equation or damage formula was added to the editor.

This is intentionally not a full Game instance. Fighters are anchored; no AI, world physics,
progression, ambient ki regeneration, audio, camera shake or gameplay compositor is simulated.
The UI names these limits. The target replenishes after measured damage so repeated observation
does not turn into a KO scene. Every new sequence starts the caster at full ki.

## Regressions found during implementation

- Missing beam/opponent workflow: initial editor test failed at mode availability.
- Empty authoring world lacked `interiors`, exposed by production beam collision traversal.
- Numeric camera checks passed but a screenshot was empty: paused OrbitControls overwrote the
  chase camera on the next browser frame. A two-RAF regression failed, then passed after fixing ownership.
- A half-full Fighter constructor tank ended ultimate previews prematurely; the all-slot sweep
  exposed this. The fixture now explicitly starts full, without replenishing the caster every frame.
- Repeated floating-point addition crossed charge release a frame later than seek. Contact at 3s
  differed (205.12097 vs 206.87333 for the KANO fixture). A shared quantized clock removes that drift.
- Studio never advanced base `castPose`, and the target stayed in `hit`. The new casting assertion
  failed; sharing the production presentation-clock method fixes both rather than copying another rule.

## Verification and honest limits

`tools/studio-combat-check.mjs` covers nine hero/elevation combinations, all 25 shipped beam slots,
actual contact, rig emission, camera framing, pause, repeatable seek, release/recovery, base casting
pose, target state, profile isolation and beamless fallback. It is included in `npm run test:studio`.
Read-only review additionally exercised SOL at ±75° and distances 12/60, and reviewed the shared
method extraction. No Critical/Important findings remain; the identified target timer was fixed.

The Impeccable skill kept this an extension of the existing tool layout, with controls beneath
the stage and explicit preview limitations. Its detector found no issues in the edited UI files.
The animation-authoring skill's referenced TypeScript rig/lab files do not exist in this repo;
motion evidence uses this procedural JavaScript rig and does not imply imported BFP clips.

Final source passed build, pose/interruption checks, the 25-slot Studio sweep and gameplay combat
regressions (371 abilities; 30-second eight-fighter soak, 860 hits/16 KOs, no invalid states/errors).
The complete Studio workflow passed after integration, including editing, undo/redo, save/reload,
import/export, ORIGIN integration and the new combat fixture.

Responsive checks initially found a 6327px document at a 390px viewport: the horizontal roster's
minimum-content width expanded the editor grid. A zero-minimum grid track and library now keep
that overflow inside the roster. All 12 width/view combinations pass at 390, 790 and 1440px;
the narrow and medium screenshots were inspected. Run `npm run test:studio-layout` for this gate.

The eight-second recording covers entry, charge, firing, release and recovery. It exposes remaining
art weaknesses, including broad translucent beam shapes and limited character detail. Those are
not hidden, scored as complete or replaced with editor-only effects. Melee, projectiles, opponent
movement and complete combat-scenario authoring remain follow-on work.

Final recording: `artifacts/flight-review/studio-combat/studio-beam-sequence-shared-pose.mp4`
(1440×960, 20fps, 161 frames, 8.05 seconds, silent). This is a scripted anchored-target preview,
not live opponent AI or imported BFP animation.
