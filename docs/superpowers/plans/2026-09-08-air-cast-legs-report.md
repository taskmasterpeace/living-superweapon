# Airborne ranged-cast locomotion legs

Status: implemented and verified; ready for the parent's independent review. No commits.

## Scoped changes

- `src/engine/flight-pose.js`: preserve the authored velocity/style leg layer during ranged preparation, emission and recovery. Full-body ownership still uses the previous suppression. Rebuild ranged leg spread from its base to prevent repeated zero-time redraws from accumulating a partial-takeoff offset.
- `src/engine/combat-pose.js`: replace the fixed ranged hip/knee pose with a small additive hover brace over the flight layer. The brace fades as travel engages. Existing emission-age kick/pressure remains bounded, and hips/knees stay within the authorable limits. Emitter, upper-body carrier, physics and exclusive full-body branches retain their existing rules.
- `tools/air-cast-locomotion.test.mjs`: 30 native Fighter/slot regressions for palm, two-hand, eye, chest and rifle; 30/60/120 Hz travel/hold/release; portable authored leg differences; pause redraws; high authored flexion; rendered boot OBB separation and actual forearm surface clearance; guard/melee/ground ownership.
- `tools/air-cast-locomotion-browser.mjs`: labeled procedural motion fixture with native Fighter/runSlot/projectile presentation, representative screenshots and continuous browser videos.

No Studio, audio, camera, cape, simulation movement, balance or resource code was edited. No commit, staging or worktree operation was performed.

## RED / GREEN evidence

Before production edits, all 20 primary travel/profile cases failed: each emitter collapsed hover/cruise knee differences and discarded the separately authored forward-leg profile. Example palm left knee: hover 0.735 rad, cruise 0.738 rad; authored hip delta was approximately zero instead of the specified -0.46 rad.

The initial broader test file also exposed differing random Fighter animation phases in a comparative melee fixture. Both fixture clocks now start at zero. The continuity allowance uses the existing 12 rad/s articulated transition budget rather than the initial arbitrary 8 rad/s bound.

An additional RED pause regression reproduced accumulation during repeated `_animate(0)` calls at partial takeoff. Rebuilding the ranged spread base made it pass. No new animation loop or wall-clock animation source was added.

Commands and actual results:

```text
node --test tools/air-cast-locomotion.test.mjs tools/flight-split-aim.test.mjs tools/directional-transition.test.mjs tools/spine-envelope.test.mjs tools/ground-axial-support.test.mjs tools/volley-hands.test.mjs tools/hero-hover.test.mjs tools/flight-language.test.mjs
224 tests passed; 0 failed.

npm run build
Passed: 270 modules transformed. Existing large-chunk advisory only.
```

The earlier required regression selection passed 208/208 before the final two pause/flexion checks and additional hover/language checks. The 224-test run includes those final changes.

## Browser evidence

Output root: `artifacts/air-cast-locomotion/`. Each emitter gets native recorded motion and neutral/entry/hover/cruise/rise/descent/release/recovered frames, plus sampled joints and positions in JSON.

Five completed recordings contain 390 simulated frames each (1,950 total), no page errors, eight phase screenshots each (40 total), and five named `motion.webm` videos. Representative frames were visually inspected for all five emitters, including the rifle's recovered neutral pose.

The first run completed palm, then a parallel-development hot reload destroyed the next page context. The stable rerun used an isolated local Vite server on port 5188 with HMR disabled. Four emitters passed; the rifle assertion then exposed an overstrict fixture expectation: its native thruster profile has nearly identical hover/cruise knee targets and only a 0.15 rad additive brace. The browser threshold was corrected from 0.2 to 0.1 rad, and a rifle-only rerun passed. No production code changed for that correction. The completed rows were merged into the aggregate results. The temporary capture server is stopped; the parent's normal development server was untouched.

```powershell
$env:LSW_AIR_LEG_URL='http://127.0.0.1:5188'
node tools/air-cast-locomotion-browser.mjs
# Four passed, then the rifle harness assertion described above failed.
node tools/air-cast-locomotion-browser.mjs rifle
# Rifle passed after correcting the native-profile expectation.
```

Measured left knee angles from completed native browser frames:

| Emitter | Hover (rad) | Cruise (rad) |
| --- | ---: | ---: |
| Palm | 1.185 | 0.328 |
| Two-hand | 1.185 | 0.328 |
| Eye | 1.140 | 0.261 |
| Chest | 1.165 | 0.275 |
| Rifle | 0.270 | 0.120 |

The inspected frames show the tucked hover leg extending into the travel profile while the upper body keeps emitting. The velocity arrow and captions explicitly identify supplied-velocity, fixed-position procedural inspection. Rifle uses SARGE forced airborne solely as an authoring fixture; this does not change his gameplay flight permission. This is not integrated player-input, imported animation, gameplay-camera or performance evidence.

## Self-review / limits

- Simulation position/velocity are checked around the production `_animate` call throughout the new tests. The rifle fixture uses an authored zero recoil value so supplied travel remains fixed; production rifle recoil was not changed.
- Default rise/descent may intentionally use the same lower-body profile; their carrier motion, not invented different knee targets, communicates vertical travel.
- Checked boot volumes use OBBs from real boot geometry, and forearm clearance probes rendered limb surfaces. The required existing suites additionally exercise weapon/fist clearance, emitter direction, spine limits, grounded foot support, forms, guard and KO handoff.
- Extreme arbitrary combinations of valid custom poses are bounded anatomically, but this patch does not claim universal collision-free authoring across all combinations or an independent artistic approval.
- The animation skill's ingestion-specific `src/client`/TypeScript/Vitest contract paths belong to another repository layout and do not exist here. This procedural JavaScript fix uses this project's real Fighter/slot contracts, node:test suites and Vite build. No source-clip/import claim is made.
- Parent independent review and final visual/feel acceptance remain required. The separately identified unpowered-jump/prone-carrier fault and unrelated movement-ledger gaps remain outside this patch. Parent ground-motion/entity handoff edits were untouched.
