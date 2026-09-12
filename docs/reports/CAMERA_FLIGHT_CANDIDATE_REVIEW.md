# Camera and flight candidate review

Native runtime: `9ec466f`, clean committed gameplay with capture-tool changes only. Normal selection, squad entry, Space, WASD, Alt, Shift and Ctrl inputs. Capture and provenance: primary checkout `artifacts/marketing/combat-pass-2026-09-12/camera-alt-candidate-transitions/`.

Observed: settled hover at Y147.0066; travel velocity [31.72608,0,-42.30144] remains stable through Alt side/down/opposite-up samples. Head projection remains inside the viewport, including upward look Y=-0.54139. All sampled FOV values are 73.74 degrees. Shift stages report 1, 2 and 3; release returns stage 0. The subsequent dive has vertical velocity -57.1548 and Y134.9202. Ctrl descent ends nonflying at terrain Y97.7609. Zero recorded browser errors; source remains stable before/after.

Inspected dive screenshot shows the character and nearby wake clearly, but the body appears upright in that transition frame. Downward velocity proves travel, not satisfactory nose-down pose. Keep the rig's dive-transition review open. This capture does not replace prior room/transport and melee-to-flight evidence.

Camera/settings/cover/wake/readability test batch passed its non-free-look tests. The first free-look invocation failed to load CSS because the Node hook was omitted. Rerunning `node --import ./tools/helpers/css-test-hook.mjs --test tools/free-look-input.test.mjs` passes all28 tests. Preserve both logs under primary `artifacts/issue-drafts/candidate-camera-flight-final.txt` and `candidate-free-look-final.txt`; do not describe the initial invocation as passing.
