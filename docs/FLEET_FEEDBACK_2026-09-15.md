# Vehicle feedback — September 15

Runtime fixes:
- Mech binds all four hip/knee/ankle chains and drives a procedural diagonal gait. No terrain foot IK yet.
- Repeated A/D taps no longer trigger barrel rolls. Ordinary mouse deltas no longer compete with vehicle heading; Alt+mouse retains freelook.
- Vehicle practice suppresses B/N rival/dummy spawning, bracket hero swaps and Tab powers.
- Persistent class-specific controls and speed; jet throttle/gear status.
- Jet practice auto-boards at 160 units above bay terrain with matching airspeed/throttle (65% for strike jet). G folds real gear pivots over 1.2 seconds; ground retraction refused.

Verification: 32 targeted tests passed; build passed. Native browser menu/keys with scripted production vehicle selection verified helicopter rise/descent, no repeated-tap roll, no N/B extra actors, mech joint motion, level jet cruise and G retraction. Latest artifacts in artifacts/fleet-feedback-20260915. An earlier run unexpectedly banked/climbed; repeat with input telemetry remained neutral and level. Cause not reproduced; retain as intermittent investigation, not conclusively resolved.

Controls: helicopter W/S forward/back, A/D turn, Space rise, Ctrl or Z descend. Jet W/S pitch down/up, A/D bank, R/F throttle increase/decrease, G gear. J exits, L next vehicle, Alt+mouse looks around. Exit at altitude is possible: jet is a flight-start trial, not a runway/landing certification.

Unfinished: aircraft/rotor recordings and mech servo/step mix. Existing Kenney engine.low, engine.charge and land.metal are possible stylized sources, not verified real aircraft sound. No listening claim. Vehicle damage/weapons, rider visibility and full landing review remain open in #35.
