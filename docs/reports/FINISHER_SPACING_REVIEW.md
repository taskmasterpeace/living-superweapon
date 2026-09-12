# Finisher spacing: native finding

Runtime under review: `0c3f2fe`, unchanged source during recording. Ordinary SARGE practice, N target, T focus and V attacks; no actor or physics overrides. Capture: primary checkout `artifacts/marketing/combat-pass-2026-09-12/02-sarge-combo-recovery-review/`.

The driver stops attacking and moving after the first finisher. At simulation 5.2759s, the finisher applies 16.5597 damage and velocity [7.39349, 7.88, -11.64047]. Root separation is 4.1234 units. At 6.044412s, separation is only 5.70966 units; both strike state and victim stagger have ended. Native video, master audio and contact/recovery screenshots were saved, with zero runtime/resource errors and stable source provenance.

Visual review: both bodies remain visible and contact feedback is readable, but the recovery screenshot still shows the fighters at close range. This is a small displacement, not sufficient evidence of the promised meaningful finisher recovery space. Earlier recordings that immediately resumed attacking hid this limitation. Do not accept finisher spacing based solely on nonzero knockback velocity.

Next implementation check: finisher impulse versus launch admission and horizontal damping, preserving strength resistance, frontal block, terrain collision and credited impacts. Review the resulting actual separation and recovery opportunity rather than raising damage. No production balance change was made by this capture.

## Implemented correction

Practice dummies now receive the field's knockback coefficient through `spawnDummy`, without enabling open-sky flight. A damaging field finisher below the heavy-launch threshold receives a bounded 0.55-second launch window. Existing resistance scales the impulse; funded guard returns before launch admission; city behavior is unchanged. Damage values are unchanged.

`02-sarge-combo-recovery-carry-fixed` records a finisher at 3.1026s and recovery at 3.849948s. Separation grows from 4.99861 to 14.14576 units, rather than the prior 4.1234 to 5.70966. Both characters are visible in the inspected recovery screenshot; attacker strike and victim stagger states have ended. Zero runtime/resource errors and unchanged source during capture. This run records only one connected finisher, so it proves displacement rather than a complete connected combo. Video and actual master audio are retained.

91 melee-depth, energy-guard and person-carry checks pass, including funded guard admission, strength resistance and city isolation. Production build passes with existing chunk warnings. Representative live combo balance and sound audition remain open.
