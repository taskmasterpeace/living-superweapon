# Source-authored heavy punch

2026-09-07. A bounded animation/authoring improvement, not full-game completion,
an overall quality rating, or a claim to reproduce original BFP melee rules.
No camera calibration, map, damage, bot-reaction or combat-clock edits.

## Play and author

- Standard controls: hold C / Mouse4–5 to block (controller L1), tap V for light,
  hold/release V for heavy, G to grab and throw.
- Studio → Model → Fighting motion → **Heavy punch animation**: authored or
  procedural, independent from **Light strike animation**.
- Authored is the default for bare-handed power punches. Weapon/shield users
  retain their weapon-compatible procedural heavy. The control describes that
  fallback; it does not claim an imported sword/axe animation.
- Motion state → Melee sequence → Charged heavy / Heavy vs guard. Both Grounded
  and Airborne rehearse actual contact. Pause and scrub startup/impact/recovery.
- The choice travels through validated profiles, local save/reload, undo,
  custom-character packages and sparse transformation appearance patches.
  Old version-one profiles remain valid without rewriting saved data on open.

## Exact source and limitations

Creator's [Universal Animation Library 2](https://quaternius.itch.io/universal-animation-library-2),
free Standard archive, CC0. Quaternius credits animator Gonzalo Furnier.
The retained file is `UAL2_Standard.glb`, in-place version, 43 takes / 65 joints.
The 130+ advertised collection is larger than this free subset. Full license,
archive location and file hashes: `assets-src/quaternius/library-2/PROVENANCE.md`.

| Runtime | Actual source | Duration | Sampling |
|---|---|---:|---|
| Power punch | Melee_Hook + Melee_Hook_Rec | 0.466666669 + 0.600000024 s | 65 frames, 60 Hz |

Source contact landmarks 0.300–0.400 s are retimed to the existing power
startup/active/recovery phases. The actual sampled hip/chest counter-rotation,
weight shift and recovery replace the procedural bare-hand heavy carrier.
Final fixed-length hand IK still reaches the committed contact point. It is a
retargeted/contact-adapted hook, not unmodified source playback.

Ground legs follow the source stance and boot support; airborne legs stay on
the existing superhero-flight path. Source root translation is not applied to
physics. No invulnerability, extra hit, auto-homing, range, recovery skip or
damage advantage is granted by choosing an animation.

`npm run ingest:strikes` regenerates both light and heavy banks. The new bank
is separate, 27,409 bytes; the 8 MB source GLB is not in the gameplay bundle.
The source hash is pinned and a test requires a byte-identical fresh bake.

`OverhandThrow` was inspected but not integrated: it is an object throw, not a
two-person grapple. Grabs, guard, weapon-heavy and flight motions still have
procedural components. Arbitrary GLB/FBX/clip import remains unimplemented.

## Evidence

The animation-authoring workflow required actual source inspection, named
provenance, whole sequences and final rendered/contact checks. It kept the
bare-hand source out of armed heavy swings. The editor reuses its established
compact motion controls and displays the actual take/source clock.

- `tools/heavy-source-review.mjs`: source take audition at 0/25/50/75/end,
  continuous front/both sides/rear. `artifacts/heavy-source/motion.webm`.
- `tools/heavy-strike-review.mjs`: source/production comparisons plus actual
  grounded/airborne heavy encounters on procedural, male and female bodies,
  four angles, save/reload/undo checks. `artifacts/heavy-strikes/`.
- `tools/heavy-strike.test.mjs`: exact source/bake identity, armed fallback,
  independent preference, rigid root/fixed limbs, actual skinned-body floor
  bounds, aerial leg ownership and hitstop/30/60/120 Hz phase stability.
- Existing authored-strike tests now cover heavy interruption, form replacement
  and full phase continuity. Character-package tests preserve heavy preference.
- A separate real `Fighter.update` / paired `MeleeSystem` test advances a heavy
  into active, freezes its clock through hitstop, and verifies it resumes at
  30/60/120 Hz. The direct-pose test covers convergence/leg ownership only.
- Independent CPU review found no runtime defect. Its exact-source test gap was
  corrected. Its authored/procedural comparison found identical contact timing
  and damage at each tested simulation rate (not cross-rate equivalence).

The broad world test exposed a benchmark input mismatch: its punch aimed +X
while explicitly facing +Z. This made a source hook swing across the torso and
miss slender GALE. A controlled eight-case real-game diagnostic varied heading
and target point independently: correcting only heading restored the hit
(52.0074 damage), as did correcting only the target point. The benchmark now
uses `faceDir(1,0)`, matching its intended +X attack. No attack reach, collision,
strength, or animation was loosened to satisfy that check. The added
`heavy-target-check.mjs` gate keeps correctly facing RAGE → GALE contact covered.

### Final regression refresh

All nine commands in `artifacts/heavy-strikes/verification/results.json` pass:
strike animation, poses, impacts, blocking/fair bots, melee depth, locomotion,
portable character packages, full combat, and the production build. The strike
gate includes 20 CPU tests, real Studio and moving-contact browser checks, and
the eight-case heading diagnostic. The world suite passes 42/42 checks; all
53 kits pass seven ability checks each. The eight-fighter 30-second simulation
records 1,246 hits / 16 KOs with no invalid states or runtime errors.

The build transforms 229 modules. The existing large-bundle warning remains: source-backed body data is currently
synchronous. Passing the build does not close that loading-cost limitation.

### Moving and production-render evidence

- `node tools/heavy-strike-review.mjs --stills`: 30 source-time comparisons and
  78 actual encounter samples, no errors. All three bodies, ground/air, four
  inspection angles. Source and production torso directions agree to under
  0.006 radians at the interior comparison samples; entry/exit deliberately
  blend to the hero's existing stance. This is not full-pose equality: body
  proportions, final hand contact and airborne legs differ intentionally.
- `node tools/heavy-strike-review.mjs --motion-only`: 24 complete 3.5-second
  simulated encounters, 510 logged actual phase samples, six exactly-once
  contact assertions and real editor save/reload/undo checks, no errors.
  Current recording: `artifacts/heavy-strikes/motion/motion.webm` (171.44 wall
  seconds). Unlike the earlier root-folder recording, the phase/time label
  updates during playback. Ground/air sequences on all three bodies were
  inspected as temporal contact sheets, plus frontal/rear male sequences.
  Charged stance flows into the source hook, hitstop, knockback and recovery;
  the rooted version stays supported and the aerial version retains flight
  legs. The inspection camera widens to retain the launched opponent.
- `node tools/melee-visibility-check.mjs --heavy-only`: six real heavy/crush
  contacts with production chase camera and HDR rendering, at 33/83/150 ms
  after impact. No errors/failures. At 83–150 ms, effect-relative anatomy
  retention is 0.872–1.055 and near-white anatomy fraction stays below 0.002.
  Evidence is isolated in `artifacts/flight-review/melee-visibility/heavy/`,
  preserving the earlier full twenty-case results.

**Camera limitation observed, not approved:** that last test removes only
effects, not the foreground fighter. Its passing retention score therefore
does not prove baseline opponent visibility. The near, explicitly locked
five-unit fixture has a steep view and the player's body covers much of the
opponent. It is real production chase behavior, not a source-clip defect, and
needs a separate close-combat readability pass. Do not use its FX score as a
camera acceptance score or an overall BFP-feel verdict.

Studio recordings are silent, scripted rehearsals using custom inspection
cameras, not live BFP-camera framing evidence, player feel approval, or FPS
benchmarks. Temporal-sheet bounds are approximate wall-time segments; the
on-screen simulation clock identifies the action, and initial frames can
include the preceding angle's held endpoint. An attractive still or passing
contact test alone does not approve the complete experience.
