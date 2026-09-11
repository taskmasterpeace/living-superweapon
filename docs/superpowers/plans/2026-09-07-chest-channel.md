# Independent chest channel repair

**Goal:** A chest weapon owns torso articulation while a concurrent hand/eye weapon retains its own final aim, without overriding locomotion.

**Architecture:** Add a reversible upper-body chest correction after locomotion/directional posing and body settling, before head/arm contact solves. Restore it in reverse application order, including form lifecycle. Follow actual hose direction rather than faster command aim; bound corrections and preserve source gait and authoritative velocity.

**Spec:** Active independent movement/aim objective and `docs/INDEPENDENT_COMBAT_ACCEPTANCE.md`. Existing Three.js/JavaScript/Node/Vite stack; no physics migration, roster expansion or map changes.

## Tasks

- [x] Write production chest+palm tracking tests at 30/60/120 Hz over standing, strafing, hover, flight, ascent and descent. RED: chest direction error 16–25 degrees.
- [x] Implement `animateChestAim(f,dt,slot,blocked)` and `restoreChestAim(f)` in `src/engine/chest-pose.js`. Snapshot upper-body positions/quaternions before correction; the hip/root and legs remain owned by locomotion. Integrate restoration in `entity.js` and apply before child solves in `combat-pose.js`.
- [x] Test release, single-channel fallback, form swaps and rendered arm/trunk/ground contact through complete sequences. Additional correction is bounded; **total anatomical acceptance remains open**. Added real KO/respawn and native charge/cannon handoff tests after review/capture exposed those defects. Twenty-nine focused tests pass.
- [x] Capture the actual Studio chest/hand sequence with representative primary and Co-fire choices, multiple views and target changes. Initial chest baseline is numerical RED only, not a fabricated before screenshot. An initial 1,520-frame capture found the release-wrist error; the final 1,520-frame capture uses `artifacts/chest-channel/final/`, with zero browser errors.
- [x] Review, run regressions/build, update the acceptance ledger with exact evidence and remaining limits. Final runs: 601 regression + 18 Studio-profile tests; build passes with existing large-chunk warning. See `docs/CHEST_CHANNEL_PASS.md`. The full goal remains active; total anatomy, surface seams and broader motion/clearance acceptance remain open.
