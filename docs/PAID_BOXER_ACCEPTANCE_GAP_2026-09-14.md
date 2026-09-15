# Purchased Boxer: native contact compatibility blocks default assignment

The imported single jab/cross are real source actions, but they are **not approved default gameplay animations**. The stable existing punch pipeline remains active. Full source clips stay available in the purchased animation library, and the native 45-value bridge is restricted to an explicit internal lab preview (`f._paidBoxerPreview=true`).

## Sources and generated artifacts

- `combo03_1_inplace.fbx` → `Paid_Boxer_Jab`: one anatomical left straight, 1.166667 seconds, 71 samples at 60 Hz.
- `combo01_1_inplace.fbx` → `Paid_Boxer_Cross`: one anatomical right straight, 1.3 seconds, 79 samples at 60 Hz.
- `guard01_inplace.fbx` → `Paid_guard01_inplace`: guard candidate; no new gameplay guard assignment.
- Source reference: supplied `00_T-pose.FBX`. Raw purchased FBX files stay private; generated manifests preserve hashes and licensing separation from CC0.
- Native bridge: `src/data/paid-boxer-strike-bank.json`; full joint/finger sources: `public/models/modular-hero/paid-motion-bank.json`.

The two straights each have one contiguous full-extension interval and the other arm stays below 80% of reference reach. No source trimming or second punch removal was needed. Candidate plateau markers are jab 0.333333–0.716667 and cross 0.333333–0.666667 seconds. These are motion landmarks, not collision authority.

## Reproduction and current measurements

Run `node tools/report-paid-boxer-candidate.mjs`. It records the real Fighter pipeline at 120 Hz using the unchanged combat frame data, both committed sides, startup/contact/recovery, and a committed contact point at `(side*0.3, 7, 3.5)`. Output: `artifacts/paid-boxer/native-compatibility.json`.

| Pipeline | Jab maximum joint step | Cross maximum joint step | Maximum active contact gap |
| --- | ---: | ---: | ---: |
| Accepted default | 0.314 rad | 0.287 rad | below 4e-15 world units |
| Purchased lab candidate | 0.984 rad | 0.661 rad | jab 0.370 / cross 0.388 world units |

Candidate jab worst case is startup sample 9/12 in the committed upper arm. Cross worst case is startup sample 16/20. The acceptance regression limit is 0.6 radians per sampled native joint step; final reachable contact tolerance is 0.02 world units.

The original source torso turns at roughly 23 radians/second around extension. Directly compressing the source into the existing fast jab clock exposed torso and projected elbow-pole flips, reaching 2.49 radians in the initial attempt. A longer entry blend and stable extension markers did not resolve the incompatibility. Retaining native body/pelvis/head while importing source arms/legs reduced the largest discontinuity but still failed the above limits. Experimental shared elbow interpolation changes were reverted.

## Safe current behavior and unblocker

- Ordinary boxing uses existing accepted `Punch_Jab` / `Punch_Cross`; other styles, air actions, armed motion, custom marker overrides, and all heavy-charge regions remain unchanged.
- Native candidate tracks preserve simulation root ownership, fixed arm segment lengths and rendered boot support. Those checks do not establish contact/continuity approval.
- Required next work is an explicitly authored timing/retarget adaptation compatible with the current fast combat clock, plus complete production modular playback with final native contact and visible finger/hand review. Do not lengthen combat startup merely to fit this source.
- No rendered acceptance is claimed. Catalog playback alone cannot approve the native gameplay adapter.

Current regressions: `node --test tools/paid-boxer-strikes.test.mjs tools/authored-strike.test.mjs tools/heavy-strike.test.mjs` — 21 passed. Tests assert the stable default and fallback, while known candidate failures remain a separate diagnostic report.
