# Ground / air pose handoff

Measured defect: movement audit reproduces approximately 115 degrees of knee rotation in a single takeoff frame when the source jog channel is discarded. Preserve source locomotion and physics; fix only this discontinuity.

Implement in `src/engine/ground-motion.js` with one call in `entity.js` after ground/flight locomotion and before directional/combat emitter solving. Keep previous lower-body transforms, detect ground/air transitions, blend a short finite transition to the current native destination. Restore this overlay before restoring source gait bases, so no pose bakes into a later frame/form. Exclude KO and exclusive combat/guard/grab owners. Grounded support, if needed after the blend, happens before emitter solving. Never write physics position, velocity or fixed segment lengths.

New tests: `tools/ground-air-handoff.test.mjs`: source-phase-swept takeoff and landing at 30/60/120 Hz, zero-dt stability, physics invariance, no persistent bridge past its duration, ground boot support. Native browser short Space tap (not hold-to-fly) through controller/physics with takeoff/apex/landing evidence and continuous frames. Relevant regressions: ground-motion, directional-transition, ground-axial-support, flight-split-aim. Preserve intentional planted authored melee.
