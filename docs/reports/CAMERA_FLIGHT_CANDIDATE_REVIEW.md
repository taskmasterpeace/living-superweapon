# Camera and flight candidate review

Native runtime: `9ec466f`, clean committed gameplay with capture-tool changes only. Normal selection, squad entry, Space, WASD, Alt, Shift and Ctrl inputs. Capture and provenance: primary checkout `artifacts/marketing/combat-pass-2026-09-12/camera-alt-candidate-transitions/`.

Observed: settled hover at Y147.0066; travel velocity [31.72608,0,-42.30144] remains stable through Alt side/down/opposite-up samples. Head projection remains inside the viewport, including upward look Y=-0.54139. All sampled FOV values are 73.74 degrees. Shift stages report 1, 2 and 3; release returns stage 0. The subsequent dive has vertical velocity -57.1548 and Y134.9202. Ctrl descent ends nonflying at terrain Y97.7609. Zero recorded browser errors; source remains stable before/after.

Inspected dive screenshot shows the character and nearby wake clearly, but the body appears upright in that transition frame. Downward velocity proves travel, not satisfactory nose-down pose. Keep the rig's dive-transition review open. This capture does not replace prior room/transport and melee-to-flight evidence.

Follow-up diagnosis: `camera-alt-candidate-dive-trace` records body-facing-relative forward velocity -83.19, then -87.54 units/s, with `poseState: backward` and body pitch -0.1095 then -0.1646 radians. These are backward descents, where the existing attack-ready pose is intentional. The screenshot does not establish a forward-dive defect. The new real-Fighter regression in `flight-language.test.mjs` distinguishes forward descent (nose-down pitch over1.6 radians) from backward descent (absolute pitch under0.3); all7 language checks pass. This is a controlled rig test, not a native forward-dive clip. Production flight and movement remain unchanged.

## Native forward dive resolved

`camera-alt-candidate-forward-dive` on runtime `3f8f9c3` records a forward descent before the high-speed traversal: vertical velocity -19.7605, body-relative forward speed48.8531, pose `forward`, body pitch1.76477 radians. Head projection [-0.16555,-0.36956] remains onscreen. Inspected `02b-forward-dive.png` shows the nose-down body and nearby wake. No runtime errors and stable source provenance. This supplies the previously missing native forward-dive evidence without changing flight behavior.

## #16 requirement reconciliation

| Requirement | Evidence and scope |
| --- | --- |
| Alt left/right/up/down, bounded head movement | Candidate transitions and forward-dive captures; side/down/opposite-up head screenshots and telemetry; free-look tests28/28. |
| Preserve travel and aim, recover on release | Native Alt sequence plus free-look input regressions; no FOV widening. |
| Rear-side visibility near targets, walls, rooms, transport | Live combo review, ground-camera/cover tests, lab-camera-backside-default and transport-camera-squad-native recordings. |
| Toes, hover, launch, cruise, dive, landing, airborne combat transitions | Native forward dive/landing and earlier hover/feet, carried-flight and live airborne-contact records; flight-language7/7 and readability checks. |
| All speed tiers and highest-tier recognition | Candidate native stages1/2/3, existing dock and near-body trail screenshots. |
| Double-tap/hold, energy and interruption; no power slot | Movement/power-state regressions and native highest-stage/release plus restricted RIME/pause capture. |
| Restrained optional turbulence and unobscured aiming | Readability tests cover bounded amplitude and reduced-motion suppression; native screenshots retain character/reticle. |

The identified dive gap is resolved. This table is a runtime evidence reconciliation, not a pushed or merged release. #14/#15 sound audition remains separate; mobile adaptation stays #5. Original evidence includes controlled fixtures and native clips as explicitly labeled, rather than treating fixtures as user-input recordings.

Camera/settings/cover/wake/readability test batch passed its non-free-look tests. The first free-look invocation failed to load CSS because the Node hook was omitted. Rerunning `node --import ./tools/helpers/css-test-hook.mjs --test tools/free-look-input.test.mjs` passes all28 tests. Preserve both logs under primary `artifacts/issue-drafts/candidate-camera-flight-final.txt` and `candidate-free-look-final.txt`; do not describe the initial invocation as passing.
