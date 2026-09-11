# Movement and emission gap audit — 2026-09-08

The current production system already separates travel heading, torso support, head aim, and individual hand emitters. Two measured gaps remain worth prioritizing: the running-to-jump pose handoff snaps, and sustained aerial casting replaces travel-specific leg articulation with one casting stance.

Scope: read-only production audit except this report; no runtime changes. Read `AGENTS.md` and `PRODUCT.md`. Preserve the BFP camera, simulation-owned movement, and traveling beam packets. No cape or map work. The animation-authoring skill's motion/contact criteria informed the checks; its older `src/client` contract paths are absent here. No visual-quality approval is implied by this source audit or passing tests.

## Prioritized defects

### P1 — Running-to-jump transition discards the previous leg pose in one frame

`src/engine/ground-motion.js:26` disables the authored gait as soon as the gait leaves `GROUNDED`; line 38 sets its weight directly to zero. `src/engine/entity.js:2205` restores the previous overlays before the generic leg cycle is rewritten at line 2233. The airborne pose then starts with a small `_flyPose` blend (line 2236), so it does not bridge from the last rendered source stride. An unpowered fighter above the floor becomes `AIRBORNE` at `src/engine/entity.js:449`.

Measured using the production `spineCombatFixture({motion:'jog', source:'hand', hz})`, without starting an attack: step through 1.7 seconds of running, save both hip/knee quaternions, set `pos.y=.1`, `vel.y=25.5`, `flying=false`, call `_updateGait(1/hz)`, then one fixture step. The actual bank take is Quaternius `Jog_Fwd_Loop`; the jump velocity matches `src/engine/entity.js:75`.

| Rate | Right-knee rotation in one frame | Ground weight after handoff |
|---|---:|---:|
| 30 Hz | 114.17° | 0 |
| 60 Hz | 114.87° | 0 |
| 120 Hz | 115.30° | 0 |

This measures the production pose transition, not integrated jump physics. The near-constant angular jump as the frame interval shrinks identifies a pose discontinuity. Fix at the existing locomotion/air handoff: retain and blend from the last rendered lower-body pose without extending grounded support into flight. Add phase-swept takeoff/apex/landing continuity checks at 30/60/120 Hz, including a short Space tap through real physics. Verify the complete jump sequence in gameplay.

Existing coverage misses this: `tools/ground-motion.test.mjs:64` checks eventual flight/guard priority; `tools/ground-live-check.mjs:42` holds Space for one second and checks the eventual powered-flight state. Neither bounds the first jump frame's knee/hip rotation.

### P2 — Full aerial casting removes travel-specific hip and knee articulation

`src/engine/flight-pose.js:78` weights authored flight limbs by `1-combatWeight`. Then `src/engine/combat-pose.js:182` replaces both hips and knees with fixed values scaled by casting weight; lines 191–194 add beam pressure/recoil, which depends on the attack rather than travel. At sustained weight 1, the final leg joints no longer distinguish hover, cruise, ascent, and descent. Root/body inclination still changes, so this is specifically lost leg articulation, not lost simulation movement or entirely identical world poses.

Measured with `spineCombatFixture`: for each source `hand`, `chest`, and `eye`, start `lmb` and sample frame 180 at 60 Hz in `hover`, `fly`, `rise`, and `descend`. All four hip/knee angles were identical across those states to floating-point precision within each emitter type. For the hand source they were approximately `[-.187646, .075735, .677646, .484265]` radians. Flight heading and emitter alignment tests still pass because they do not require the legs to retain the travel family's articulation.

Keep the existing flight-leg channel authoritative and compose bounded casting counterbalance/recoil onto it. Add a cross-state comparison and transition regression covering hand, two-hand/twin, alternating volley, eye, chest, and firearm emitters; verify actual rendered boot/leg volumes and recovery. Do not change packet direction or travel physics to satisfy a pose assertion.

## Existing coverage and remaining scope boundaries

| Area | Production seam and concrete coverage | Limitation |
|---|---|---|
| Walk/run/strafe plus ranged aim | `directional-pose.js:32`, `ground-motion.js:40`; `tools/directional-pose.test.mjs:21`, `tools/directional-transition.test.mjs:44`, `tools/ground-motion.test.mjs:17` | Strong source-stride, recoil, heading, scale, and recovery checks; no ballistic-jump articulation sequence. |
| Single hand, eyes, chest, firearm in flight | `tools/flight-split-aim.test.mjs:26`, line 48, line 72, line 90 | 30/60/120 Hz, bilateral travel, three scales, rendered arm/gun clearance, braking/guard/landing, repeated descent handoffs. Lower-body heading is checked; travel-specific leg articulation is not. |
| Twin/two-hand and alternating/disjoint hands | `cast-channels.js:7`, `hand-emission.js:13`, `power-emission.js:29`; `tools/concurrent-emitter.test.mjs:63`, `tools/volley-hands.test.mjs:31`, `tools/disjoint-hands.test.mjs:146` | Real palms, midpoint/convergence, slot ownership, recoil and multi-state transitions exist. Coverage is not a complete source × locomotion × transition matrix. |
| Anatomical support | `spine-pose.js:10`, `aim-limits.js:3`, `ground-aim-support.js:72`; `tools/spine-envelope.test.mjs:8`, `tools/ground-axial-support.test.mjs:33` | Final relative torso yaw, rotation rate, neck cone, fixed leg lengths, boot targets, and sampled surface clearance are measured. These checks do not establish universal absence of clipping or natural motion. |
| Fists/melee | `directional-pose.js:16` excludes melee from the ranged travel split; `strike-motion.js:28` deliberately gives grounded authored strikes the legs and hips; `tools/authored-strike.test.mjs:40` explicitly requires a planted strike stance | If independent moving legs must also apply during light punches, this is an existing behavior to revise deliberately. Do not call its current passing test proof that the new requirement is met. `tools/moving-melee.test.mjs` tests moving-target contact, not locomotion independence. |
| Idle and authoring provenance | `entity.js:2227` supplies procedural breathing; the bank contains `Idle_Loop`, but `ground-motion.js:43` samples only walk/jog/sprint | The loaded idle take is not current idle playback. Do not present it as imported idle animation or judge it from source metadata alone. |

The shared fixture explicitly does not integrate entity travel (`tools/helpers/disjoint-combat-fixture.mjs:4`). Browser/gameplay verification remains necessary for physics, live input, camera readability, and motion quality.

## Regression commands

Executed from `D:/lsw` on the audited workspace: **190 tests passed, 0 failed**.

```powershell
node --test tools/spine-envelope.test.mjs tools/ground-axial-support.test.mjs tools/flight-split-aim.test.mjs tools/directional-transition.test.mjs tools/volley-hands.test.mjs tools/ground-motion.test.mjs tools/moving-melee.test.mjs
```

After adding the two missing behavioral assertions to the existing movement/flight test files, rerun that same command. Additional exact regression commands relevant to any implementation:

```powershell
node --test tools/directional-pose.test.mjs tools/directional-arm-transition.test.mjs tools/disjoint-hands.test.mjs tools/concurrent-emitter.test.mjs tools/hand-carrier.test.mjs tools/flight-language.test.mjs tools/hero-hover.test.mjs tools/authored-strike.test.mjs tools/heavy-strike.test.mjs
```

With the dev server at `http://127.0.0.1:5180`, existing integrated checks to retain are:

```powershell
node tools/ground-live-check.mjs
node tools/flight-split-live-check.mjs
node tools/flight-split-studio-check.mjs
node tools/flight-cast-recovery-browser.mjs
node tools/bfp-camera-check.mjs
npm run build
```

Those additional commands were identified, not executed in this audit. Add a gameplay jump sequence that releases Space before the apex and samples transition frames; the existing scripts alone do not close that gap. Review continuous gameplay sequences for all requested emitters and locomotion states before claiming the requested motion quality.
