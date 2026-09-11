# Source-authored ballistic jump

Status: implemented; independent scoped review approved after boundary corrections. Parent final native browser capture and keyframe inspection complete (see final note). No commits or staging.

## Source and playback decision

Exact local source: `assets-src/quaternius/AnimationLibrary_Godot_Standard.gltf` and `.bin`, Quaternius Universal Animation Library Standard, CC0-1.0 (`assets-src/quaternius/LICENSE.txt`). Provenance is carried in `src/data/jump-bank.json`; the source test checks both SHA-256 values and reproduces the runtime bank. Existing locomotion and strike banks were not regenerated.

| Typed channel | Exact take | Original duration | Runtime mapping |
| --- | --- | ---: | --- |
| jump | Jump_Start | 1.33333337 s | Full one-shot in 0.30 s; 0.08 s entry envelope |
| fall | Jump_Loop | 2.5 s | Natural-duration loop after takeoff, or immediately on an unpowered fall |
| landing | Jump_Land | 1.25 s | Full one-shot in 0.36 s, followed by 0.12 s release |

Source quarters and endpoints were inspected before choosing these windows. Start is a crouch/tuck extending into the fall posture; Land compresses at contact then stands. Retiming fits the existing approximately 0.85-second physical jump without delaying input or adding anticipation latency. The loop endpoint is an interpolation sentinel; runtime phase wraps modulo one and never plays a duplicate terminal frame. Start/Land retain their actual distinct source endpoints and are not loop-closed. No source root trajectory or source floor lift is imported: the 45-value anatomy frame keeps normalized directions/rotations and zeroes its lift component for all jump samples.

## Runtime ownership and lifecycle

- `usesFlightPose` separates free ballistic air from powered flight/gliding at the shared presentation seam. Existing exclusive full-body owners keep their prior flight suppression/pose behavior. Source jumping is open-sky only; procedural fallback remains upright. `model.locomotion = 'procedural'` opts out of both source ground gait and source jump; it is not silently ignored or repurposed as a gameplay setting.
- Apply order is ground → jump → existing 0.20 s finite leg bridge → directional/aim/combat → hit. Restore order unwinds bridge → jump → ground inside `restoreGroundBase`, after the later combat/directional/hit overlays unwind. Form replacement includes the jump snapshot in the existing guard and resets the state; disposal releases it. KO retires playback while keeping the final pose/snapshot available to ragdoll capture and subsequent restoration.
- Independent review found two missing first-frame handoffs: ballistic → powered air and first physical touchdown while gait still lagged behind the contact. Both were reproduced with the native fixture. The same bridge now keys **ground / ballistic / flight** presentation families and recognizes actual physical floor contact, rather than only a grounded/airborne gait boolean. The finite duration, exclusive-owner bypass, hitstop handling and form/unwind snapshots are retained. No new physics or second animation loop was added.
- The follow-up body-quaternion probe exposed that bridging local legs alone still let their source parent snap. The bridge now snapshots/blends the source **body transform as well as the legs**; it does not blend head/arm/weapon channels. Final support and emitter solving remain after it. The expanded native tests check body rate over the entire jump, exact boundary-body rate, pause/partial-hitstop body stability and actual KO/respawn. The latter caught stale bridge playback on respawn; KO now clears bridge remaining/family and marks it interrupted while retaining applied snapshots for the existing unwind.
- Landing support is calculated from the actual rendered boots after the finite leg bridge, before emitter solves, and only on physical floor contact. The source does not snap airborne feet to ground. A RED 120 Hz / 1.5-scale touchdown probe found the later `settleBody` smoother could undo support and sink a boot 0.055 units. With parent approval, its existing source-carrier bypass now also recognizes the applied jump source. No other combat-pose logic changed.
- Partial hitstop fix in `Fighter.update`: within the existing hitstop/no-physics early-return branch, `_animate(dt)` now runs **before** `hitstop -= dt` rather than after. A final partial hold (0.001 s remaining, 1/60 s frame) must still be visible to source/bridge clocks because that entire frame skips physics. Final timer value and physics skip are unchanged. RED showed clip time incorrectly advancing from 0.250 to 0.266667 s; GREEN holds it at 0.250 s.
- Studio `Ground jump` is a three-second native physics rehearsal: grounded movement, four-frame rise press at 0.4 s, release, ascent/apex/fall/landing/recovery. The normal 60 Hz replay drives `Fighter.move/update`; there is no manual arc or duplicate pose math. Seek reconstructs silently through the existing StudioAudio scrubbing boundary. Existing combat fixtures and audio controls remain separate.

## RED / GREEN and exact checks

Initial native RED failures at 30/60/120 Hz caught unpowered carrier pitch exceeding the upright bound. The source-ingestion assertion also failed before the bank/ingest function existed. Additional RED probes caught post-bridge landing support, the second carrier smoothing pass, final-partial-hitstop advancement, actual KO playback cleanup, and missing Studio native jump replay. Source serialization comparison normalizes JSON's representation of negative zero; emitter tests use actual rendered output directions rather than an incorrect guessed beam-origin property.

```text
node tools/ingest-jumps.mjs
Jump_Start: 81 samples / 1.3333s; Jump_Loop: 151 / 2.5000s; Jump_Land: 76 / 1.2500s.

node --test tools/jump-motion.test.mjs tools/jump-source.test.mjs tools/ground-air-handoff.test.mjs tools/air-cast-locomotion.test.mjs tools/ground-motion.test.mjs tools/flight-split-aim.test.mjs tools/spine-envelope.test.mjs tools/ground-axial-support.test.mjs tools/hero-hover.test.mjs tools/flight-language.test.mjs tools/studio-audio.test.mjs tools/locomotion-source.test.mjs tools/strike-source.test.mjs
259 tests passed; 0 failed. Includes 30 jump/source tests and the preserved 18-check ground-air bridge suite.

# Post-review boundary correction (the earlier 259-check run predates this correction):
node --test tools/jump-motion.test.mjs tools/jump-source.test.mjs tools/ground-air-handoff.test.mjs tools/air-cast-locomotion.test.mjs tools/directional-transition.test.mjs
93 tests passed; 0 failed. Includes six new exact boundary-frame regressions.

node --test --test-name-pattern="native first" tools/jump-motion.test.mjs
6 passed, 0 failed; native first-frame measured deltas are listed below.

npm run build
Passed: 272 modules transformed; existing large-chunk advisory only.
```

Review RED → GREEN maximum hip/knee quaternion changes on the exact first native boundary frame:

| Boundary | 30 Hz | 60 Hz | 120 Hz |
| --- | ---: | ---: | ---: |
| Ballistic → powered RED | 74.60° | 82.51° | 87.50° |
| Ballistic → powered GREEN | 2.6478° | 0.4198° | 0.0594° |
| Fall → landing RED | 86.77° | 46.25° | 53.24° |
| Fall → landing GREEN | 3.0799° | 0.2353° | 0.0361° |

Body-carrier follow-up (not just local legs):

| Boundary body change | 30 Hz | 60 Hz | 120 Hz |
| --- | ---: | ---: | ---: |
| Powered RED (independent probe) | 16.429° | 16.429° | 16.389° |
| Powered GREEN | 0.5831° | 0.0836° | 0.0111° |
| Landing RED (independent probe) | 22.623° | 15.205° | 12.394° |
| Landing GREEN | 0.8030° | 0.0774° | 0.0084° |

The local expanded RED also caught an earlier takeoff-body discontinuity exceeding 14.6/37.4/79.1 rad/s. The final body bridge keeps the entire native jump sequence below 12 rad/s and the first family-boundary body frame below 3 rad/s; measured final boundary rates are 0.3053/0.0875/0.0233 rad/s powered and 0.4204/0.0810/0.0176 rad/s landing. Each regression checks zero-dt and final-partial-hitstop stability for the body and legs, plus finite bridge completion. All 93 focused tests were rerun successfully after the body and KO correction. The final build was rerun after this correction.

Coverage includes native short press and hold-to-flight; 30/60/120 Hz; 0.65/1/1.5 scales; fixed thigh/forearm lengths; actual boot OBB separation and rendered forearm/torso surface clearance; head/chest/hand/rifle emitter aim; guard/melee/launch/grab/KO priority; zero-dt and full/partial hitstop; form/actual ragdoll-respawn; procedural/missing-source fallback; source loop wrap and one-shot exits; Studio seek/repeat.

## Browser evidence

`artifacts/ballistic-jump/source-target-quarters.png`: all three exact source takes at 0/25/50/75/100% and 99.9%, alternating with the armed SARGE target through the existing shared anatomical retargeter. The target rows explicitly exclude source root travel. This is source/retarget inspection, not gameplay timing approval.

`artifacts/ballistic-jump/studio-native-jump.png` and `studio-results.json`: Ground jump in Studio; seek 0.75 s → 2 s → 0.75 s reproduces position/take/phase exactly, lands at zero, and remains silent.

`artifacts/ballistic-jump/native-jump.webm`, `game-results.json` and seven `game-*.png` key frames: 120 native input/physics frames, four-frame Space tap while moving, all three exact source takes, carrier pitch zero throughout, no powered flight, and landed at y=0. The original production camera is retained. `armed-aim-inspection.png` is a separate still of SARGE's native Studio physics jump while the native rifle slot fires toward a supplied target, using the explicitly labelled side inspection lens.

The native video/key frames predate the independent-review family/body-boundary corrections. They show the source retarget, upright carrier and unchanged native trajectory, **not final transition-smoothness approval**. The armed/aimed Studio still was refreshed after the family correction but before the final body-carrier correction; exact native boundary tests above verify the final handoffs. No additional video batch was created, per the parent's bounded-capture instruction.

The normal-server first attempt was interrupted by dependency/HMR navigation, so capture used an isolated HMR-disabled server on port 5188. The native run's initial assertion incorrectly assumed SOL's >4-unit apex for lower-speed SARGE. Recorded SARGE physics starts at vy=24.5, then its existing movement speed clamp lowers vy to 17.6518 on frame 2, producing a 3.54555-unit apex. The corrected saved-run validator checks the actual native SARGE behavior and succeeds; source/procedural SARGE trajectories also compare identically in the native test. No physics or source timing was changed to accommodate the capture.

An immediate-after-swap diagnostic initially suggested a missing `_openSky` flag. Inspection confirmed `powerworld.mode.tick` in `game.js` supplies that flag to late arrivals before the recorded jump. A redundant harness copy in the second run did not change the already-active world semantics and has been removed. This is not a claimed production mode-flag fix. Native game shots still show the old SOL HUD because the direct diagnostic `setPlayerChar` call did not also call `hud.setPlayer`; the visible SARGE rig/weapon, labelled fixture, and JSON are authoritative here. Future UI proof should update the HUD or start the selected native mode directly. No extra video was generated just to replace this limitation.

```powershell
$env:LSW_JUMP_URL='http://127.0.0.1:5188'
node tools/ballistic-jump-browser.mjs
# Source/target + Studio passed; native run captured, then the overstrict apex assertion failed.
node tools/ballistic-jump-browser.mjs game
# Focused native capture completed; original SOL-specific apex assertion again failed.
node tools/ballistic-jump-browser.mjs verify
# Saved 120-frame native SARGE run passes: apex 3.54554640857, upright, landed, zero errors.
node tools/ballistic-jump-browser.mjs inspection
# Single armed/aimed native Studio jump still; zero page errors.
```

The isolated capture server was stopped after verification. The normal development server and the parent's separate browser server were untouched.

## Scoped files and limits

New: `src/engine/jump-motion.js`, `src/data/jump-bank.json`, `tools/ingest-jumps.mjs`, `tools/jump-motion.test.mjs`, `tools/jump-source.test.mjs`, `tools/ballistic-jump-browser.mjs`, this report. Extended: source sampler; flight-pose; ground-motion restore/support seam; entity presentation/lifecycle; minimal Studio preview and Motion option; parent-approved source-carrier condition in combat-pose.

No velocity, position, gravity, collision, jump impulse, root-motion, flight permission, key semantics, gameplay camera defaults, physics balance, audio subsystem, source walk/strike bank, cape or environment changes. Existing unrelated shared edits were preserved.

The animation skill's TypeScript/Vitest ingestion contract paths belong to a different repository layout; this project's actual equivalents are the procedural Fighter/source sampler, node:test and Vite gates above. No imported-root-motion claim is made. Final human motion/feel acceptance remains required; this is not completion of the full user brief or an AAA approval.

## Parent final evidence and review

Independent original-probe review approved the final body-and-leg bridge. Across
30/60/120Hz, the largest first-frame body delta is0.803° and leg delta3.08°.
The reviewer independently reran all six native boundary cases, including zero-dt
and partial hitstop. These figures distinguish body from leg, not a claim that all
joint changes are below one degree.

Parent reran `LSW_JUMP_URL=http://127.0.0.1:5189 node tools/ballistic-jump-browser.mjs game`
after the final body bridge correction, on an isolated HMR-disabled server. Final
`native-jump.webm`, `game-results.json`, game keyframes and armed-aim inspection now
supersede the earlier pre-correction recording.120 native frames, SARGE apex3.54555,
all three source takes, upright carrier throughout, grounded end, zero page errors.
The diagnostic HUD setup now names SARGE and shows the actual kit instead of stale
SOL cards. No `_openSky` fixture override is needed: the existing native mode tick
supplies it after character replacement.

Parent viewed source/target quarters, final rise/apex/fall/landing screenshots and
native rifle-aim inspection. The ballistic silhouette stays upright and articulation
changes across the sequence. A stage rock obscures the body in landing frame052;
this existing scene/foreground issue remains open rather than being counted as a
fully approved player-view landing. The full browser video includes harness/setup
and browser-paced draws (VP8,1280×720,39.52s), not a real-time performance benchmark.
