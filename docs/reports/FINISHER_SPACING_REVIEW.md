# Finisher spacing: native finding

Runtime under review: `0c3f2fe`, unchanged source during recording. Ordinary SARGE practice, N target, T focus and V attacks; no actor or physics overrides. Capture: primary checkout `artifacts/marketing/combat-pass-2026-09-12/02-sarge-combo-recovery-review/`.

The driver stops attacking and moving after the first finisher. At simulation 5.2759s, the finisher applies 16.5597 damage and velocity [7.39349, 7.88, -11.64047]. Root separation is 4.1234 units. At 6.044412s, separation is only 5.70966 units; both strike state and victim stagger have ended. Native video, master audio and contact/recovery screenshots were saved, with zero runtime/resource errors and stable source provenance.

Visual review: both bodies remain visible and contact feedback is readable, but the recovery screenshot still shows the fighters at close range. This is a small displacement, not sufficient evidence of the promised meaningful finisher recovery space. Earlier recordings that immediately resumed attacking hid this limitation. Do not accept finisher spacing based solely on nonzero knockback velocity.

Next implementation check: finisher impulse versus launch admission and horizontal damping, preserving strength resistance, frontal block, terrain collision and credited impacts. Review the resulting actual separation and recovery opportunity rather than raising damage. No production balance change was made by this capture.
