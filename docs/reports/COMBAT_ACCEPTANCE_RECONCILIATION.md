# Combat acceptance reconciliation

Reviewed candidate: `75a7511`, draft PR27. The candidate is pushed, clean and mergeable; GitHub reports no status checks. Local test results and native recordings below are the evidence, not the mergeable flag. This document supersedes vague statements that unspecified “final polish” remains.

## #14 melee, defense and throws

| Requirement | Evidence |
| --- | --- |
| Shared direct controls; melee outside power carousel | Controls/gamepad/selection regressions and native controls-final recording. V strike, Q guard, E contextual grab/interact, C crouch, I inventory; selected beams retained. |
| Character approaches and physical contact | Shared step/pounce/bound/flight data, melee-depth and contact tests; native WEBLINE, RAGE, SARGE and SOL representative captures. Grounded jumpers retain their approach family. |
| Connected combo, finisher space and retaliation | LIVE_COMBO_REVIEW.md: live SOL light/light/finisher,14.7u separation and WEBLINE retaliation. FINISHER_SPACING_REVIEW.md records the actual correction and practice/native limitations. |
| Block, guard break, evade, grab interruption | Native guard-contact-audio and air-guard; NATIVE_EVADE_REVIEW.md; grab-interruption capture. Funded guards lose energy rather than HP; direction and exhaustion tested. |
| Grab, carried flight, aim/whirl/throw and attributed terrain impact | SOL grab-backside-escape-review-ready capture and person-carry tests. Release gesture, carry menu ownership, strength/capacity and one attributed impact covered. |
| Escape, invalid targets and cleanup | Native bounded escape timeout and startup interruption; tests cover front traits, energy recheck, KO/dispose/reset, invulnerability and re-grab protection. Controlled cases are not all separate native clips. |
| Repeatable animation and body material | Existing martial/approach data, authored-strike bank/runtime, shared procedural grip and contact owners; authored-strike and pose/contact tests. Native flesh/metal contact reviewed. Expanded per-character clip catalog and recoverable ragdoll remain separate follow-ups, per creator's generic-animation scope. |
| Human/AI/input symmetry | Main controller/AI shared approach and damage tests, live exchanges and synthetic gamepad tests. Physical device ergonomics remain #5. |
| Listen to local confirmation and positional mix | **Rejected by creator; individual AI replacement workflow requested.** Audio-review page contains actual punches, guard/break and beam mixes. Numerical peaks and no-clipping checks do not satisfy this requirement. |

## #15 beams

| Requirement | Evidence |
| --- | --- |
| Traveling hose/tip through ordinary input | beam-isolated-candidate native short/long charge clips; actual delayed moving tip retained. |
| Charge size, energy and damage/blast scaling | Native short/long radius and energy measurements; controlled equal-start target damage at110u; configured Nova Burst native ground blast and real areaDamage regression. Violet Lance stops on second release and does not acquire an invented remote blast. |
| Effective range and moving contact | Native both-moving-inrange:72 resolved contacts totaling125HP, sampled60.71–120.57u; boundary fixtures distinguish140u contact from185u miss at150u authored range. |
| Ground sweep and destructible cover | Native ground/sweep/scorch captures plus BEAM_COVER_NATIVE_REVIEW.md: actual reached command cover falls900→301.143HP. The earlier callback-only failure was an observer error. |
| Oblique/elevated, blocked LOS and guard | Real Fighter/BeamHose controlled oblique/elevated box-occlusion and guard tests; simultaneous shooter/target native movement. Controlled placement is disclosed rather than claimed as native play. |
| Denial, depletion, cancel and interruption | Native lifecycle denial/depletion/pause/resume and regression tests; no frozen charge or retained active slot. Sound-stop listening remains pending below. |
| Kit intent, collision and pooled cleanup | Preserved SOL/VEGAS kits; four native retirement cycles and match restart return zero active beams and14free/14scene pooled lights. This is owned-resource validation, not exhaustive GPU memory profiling. |
| Final recorded sound review | **Rejected by creator; individual AI replacement workflow requested.** Actual beam mix provided; no subjective audio verdict inferred from telemetry. |

## #16 and delivery

CAMERA_FLIGHT_CANDIDATE_REVIEW.md reconciles the seven camera/flight requirements and the native forward/backward dive distinction. No currently reproduced #16 defect is left in that review. Release integration is still pending; the draft does not close the issues automatically.

Updated 2026-09-12: creator rejected mixed sound reviews. Use isolated one-shots/loops and AI replacement prompts; do not request another verdict on the old mixes. Validation runs locally with `node tools/validate-combat-local.mjs`; hosted combat workflow removed.

Concrete remaining work: (1) replace selected sound cues with AI recordings, integrate and verify loop lifecycle; (2) broader PR27 integration review, including known scout steering/wheel mismatch #26 before release merger. The vehicle item belongs to a separate workstream but is included in this candidate's wider history. Do not silently remove it from release disclosure or call it a combat feature requirement.

Primary evidence root: `D:/lsw/artifacts/marketing/combat-pass-2026-09-12/`. Additional moving-beam footage is under `D:/lsw/artifacts/marketing/issue15-native-target-both-moving-inrange/`. Recordings remain local and retain per-run source provenance; later whitespace-only deltas and isolated-candidate sources are disclosed in their reports. The original dirty primary checkout has not been overwritten by the reviewed branch.
