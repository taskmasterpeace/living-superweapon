# Authored light strikes and synchronous melee contact

2026-09-07. Implemented combat/authoring slice; not a full-game completion, BFP parity or quality-score claim. No map or camera calibration changes.

Later same-day extension: [source-authored heavy hook](AUTHORED_HEAVY_PASS.md).
The heavy gap described below is the historical state of this light-strike pass;
bare-hand heavies now have a separately selectable licensed source/recovery.
Armed heavies and two-person grabs still use procedural motion.

## Play and author

In [Character Studio](http://localhost:5180/studio.html?hero=sol), **Model → Fighting motion → Light strike animation** selects authored jab/cross or procedural fallback. Legacy profiles default to authored. **Motion state → Melee → Melee stage** switches the production rehearsal between grounded and airborne. Pause/scrub the light combination, heavy, block, guard break, clinch, throw or slam sequences. Stage is a rehearsal setting; animation selection is saved character data.

Standard controls remain: hold C / Mouse4–5 to block; V tap for light punches, hold/release for heavy; G grab. Guard is L1 on a controller. The earlier [blocking/fair-bot pass](BLOCKING_AND_BOT_FAIRNESS.md) retains finite bot acquisition/reaction, bounded aim rates and one observed defensive decision per threat. Unequal superhero strength is intentional; no blanket equal-matchup or comprehensive balance certification is implied.

## Exact source and runtime ownership

Uses the same retained CC0 Quaternius files, pinned mirror revision and SHA-256 hashes as [the ground-motion provenance record](AUTHORED_LOCOMOTION_PASS.md#asset-provenance). The creator's [Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html) has separate free/paid tiers. This is the 46-take local subset, not every advertised clip. No additional downloaded asset or dependency.

| Runtime | Exact source take | Source duration | 60 Hz samples | Contact landmarks in source seconds |
|---|---|---:|---:|---|
| jab | Punch_Jab | 0.8333333134651184 s | 51 | 13/60 → 20/60 |
| cross | Punch_Cross | 1 s | 61 | 16/60 → 28/60 |

`npm run ingest:strikes` uses GLTFLoader/AnimationMixer against the actual named takes. One-shots preserve their real endpoints; loop endpoint correction is never applied to them. Source-time landmarks map to the existing startup/active/recovery clock. The source does not change attack durations, damage data or simulated root travel. `Punch_Enter` is not wired. Heavy punches, guard, grabs and aerial leg poses retain their procedural ownership.

`authored-pose.js` is shared with ground locomotion. It samples normalized limb directions, torso/hip/head/ankle orientation and measured foot support, preserving target segment lengths. `strike-motion.js` mirrors source anatomy to the committed hand and snapshots its visual transforms. Ground strikes own their stance/hips/boot support; airborne strikes keep superhero leg articulation. The final fixed-length fist solve aims at the point committed when the strike began, never a homing target.

## Corrections exposed by review

- **Core axis:** source bind leans about 6.5° forward, while the target's torso-to-pelvis rest axis is +Y. Transferring a bind-relative delta added 0.113056 rad of backward bias. The bake now emits the anatomical core frame in the target's correct basis. A rendered torso/pelvis regression failed before the fix and passes afterward. This deliberately changes the ground bank too; keeping the original byte hash would preserve the defect.
- **Independent hips:** the first strike version let the legs inherit the full shoulder twist, causing a 0.713778 rad hip-line mismatch. Grounded strikes now compensate the pelvis and existing hip anchors using the separate source hip frame, with no hierarchy or segment-length changes. Mirrored cases are checked too.
- **Occupied off-hand:** the bare-knuckle source guard put SARGE's real shield surface inside his chest. An attachment-aware forward carry/tucked elbow replaces that off-hand channel, while the attacking hand still resolves contact. The regression tests vertices and triangle centroids against the actual closed torso mesh, not joint-center distances.
- **Extension twist:** a source elbow direction almost parallel to the fully extended contact arm produced a 0.629 rad shoulder twist within one 120 Hz sample. Contact extension now blends toward a stable anatomical elbow pole. Full startup/active/recovery playback checks both hands and armed/unarmed rigs without changing limb reach.
- **Moving targets:** endpoint-only target bounds missed a victim moving 7 units per 30 Hz frame at the legal 210 u/s flight cap. Game now snapshots current driven parts after controls and before physics, resolves both fighters and body separation, then flushes melee contacts and KO bookkeeping. Relative root broadphase and previous/current part-local sweeps cover actual target travel. Studio uses the same paired frame. Direct standalone Fighter.update retains immediate resolution.

Contact snapshots do not persist between frames: pre-physics control teleports and post-contact portals/recalls do not create swept paths through the arena. Replaced target parts and attacker rigs cannot reuse old transforms. The final active segment is evaluated before recovery, hard interruption prevents damage, and hitstop does not enqueue a stale segment. This is a linear swept approximation of driven parts between frames, not arbitrary rotating-mesh continuous collision. Simultaneous attacks retain sequential damage/tie policy; independent simultaneous-trade resolution was not added.

## Bank identity

| Generated local bank | Bytes | SHA-256 |
|---|---:|---|
| strike-bank.json | 46,537 | `6c11ef4c652e90184ca4e2181385a6a3946ef2ec9acb54f6820f07b4e0516593` |
| locomotion-bank.json | 136,023 | `19f19e61da27219e4cd54a5d2e449c59976f66c0464da3e2c1ee4e897831bcc7` |

Both banks regenerated byte-for-byte on the final source. The source binaries remain outside the gameplay bundle. JSON profiles/packages carry the two authored/procedural choices, not those source files.

## Verification and visual evidence

The final serial regression refresh is recorded by `tools/verify-strike-pass.mjs` in `artifacts/strikes/verification/results.json`, with complete logs per command. Current completed CPU refresh: 71/71 source/strike/contact, ground, model/limb/shoulder/head and progression-rig tests. The focused strike gate includes 14 Node tests, exact Studio replay/save/undo/narrow-layout browser and real Fighter physics/contact at 30/60/120 Hz with both entity orders (six cases, one real hit each, zero page errors), recorded in `artifacts/strikes/moving-contact-results.json`.

All nine final commands exited 0: `test:strike-animation`, `test:poses`, `test:impacts`, `test:blocking`, `test:melee-depth`, `test:locomotion`, `test:character-packages`, `test:combat`, and `build`. The package browser explicitly selects procedural strikes, exports a new custom fighter, imports into a clean context, reloads, edits its power kit and launches PowerWorld with that selection intact. Blocking covers 18 CPU and 18 real input/contact cases; melee depth includes 22 CPU tests plus live/editor sequences. Combat passed all 53 kits × seven checks, world 42/42, and a 30-second eight-fighter soak with 527 hits / three KOs, no invalid states or errors. Build passed with 224 modules. The earlier 1,420-hit / 25-KO soak preceded the final elbow/interruption corrections and is not substituted for these final results. These randomized soak counts are observations, not balance scores.

Independent bounded code re-review found no remaining concrete runtime defect after the moving-contact, shield and deferred-interrupt fixes. Its additional CPU mesh-boundary sweep found no torso crossings for the checked SOL/SARGE hands/forearms/shield; the committed shield regression is explicitly a vertex/centroid containment sampler, not a mathematically exact triangle-intersection proof. The animation skill's sample TypeScript/Vitest/lint paths do not exist in this JavaScript repository; the actual Node/browser/build gates above were used instead.

`tools/strike-motion-review.mjs` compares the real source skin with the production target at start/quarter/mid/three-quarter/end and continuous side/three-quarter sequences, then runs actual SOL/SARGE contact rehearsals from front/both profiles/rear. Source material is neutralized only in the inspection scene. The source comparison uses source time with phase retiming, not live attack speed; actual encounter clips exercise production timers/contact. Entry/exit blend to hero idle rather than the source boxing guard.

Final contact recording: `artifacts/strikes/page@e48fc16a7f851177515cb353a8b7a378.webm`. All four SOL/SARGE ground/air rehearsals complete with real damage and zero page/console errors. Grounded knockback allows only the first light to connect in this fixed-position choreography; aerial combinations connect three times. This is not forced combo reach. `sarge-grounded-cross-threequarter.png` is an explicitly labeled posed attachment inspection, not a separate damage event. The full source-phase segment is in `page@272450ba65874b19b1385f5f1a0b3843.webm`; its later extra cross-capture setup used an obsolete pre-seek actor reference and aborted. That diagnostic script was corrected, and `--contacts-only` completed the final contact/armed/desktop/mobile capture above. The source-phase PNGs and continuous source segment precede that script-only failure; do not represent the interrupted recording as a fully successful contact run.

The corrected ground-bank source/target refresh also completed with zero errors, all three loops at 0/quarter/mid/three-quarter/end/two cycles, continuous side/three-quarter playback and armed SARGE views. Recording: `artifacts/locomotion/page@069a3168ec968f62efdfa6dd7e56bdd2.webm`; numerical phase records remain in `artifacts/locomotion/review-results.json`.

These custom inspection cameras are not BFP framing evidence. Recorded fixed-step sequences are not foreground FPS measurements or proof of player feel. The animation-authoring review drove core/hip/attachment/contact corrections; Impeccable/frontend-design kept choices and telemetry in the existing inspector/transport rather than adding an unrelated editor layout.

## Still open

Dedicated heavy/grab/weapon-combat source clips, arbitrary GLB/FBX import and retarget authoring, asset-backed portable packages, eight-direction ground coverage, speed-aware foot locking, model art refinement and direct BFP feel/mode/network verification remain unfinished. There is no claim that procedural figures have become final AAA character art or that a passing test establishes a 10/10 game.
