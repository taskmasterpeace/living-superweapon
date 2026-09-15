## Approach rehearsal found a RAGE contact gap

Character Studio now has Melee sequence → Approach → punch. Grounded starts at 65% of the native profile range and runs production Fighter/MeleeSystem on the empty authoring stage. JELANI (39u) and SOL (26u) connect with real damage and repeatable scrubbing after resetting the rehearsal idle phase.

RAGE at 46.8u moved to approximately z=40.88 but recorded zero contacts/damage against stationary KANO. Evidence: local `artifacts/marketing/studio-approach-2026-09-13/rage-observed.json`. This is a failed authoring simulation, not yet a confirmed native-input gameplay failure. Do not shorten the fixture to hide it.

Next solution investigation: reproduce in the Threat Room via the shared runner; compare RAGE's power-only heavy contact window, committed arrival budget, vertical bound and physical fist contact. Fix the native owner if reproduced. Keep a stationary target inside the advertised range and a sideways-dodge counterexample. Add both to regression coverage; do not replace committed collision with a guaranteed hit. Also verify airborne rehearsal separately.
