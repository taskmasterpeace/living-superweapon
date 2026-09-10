# Flight split aiming implementation plan

> Execute inline under the creator's standing autonomous implementation authority. Use test-driven development, then a scoped independent code review. Do not commit or clean the shared dirty checkout.

**Goal:** During airborne ranged combat, let the lower body orient toward travel while shoulders and actual emitters aim separately.

**Architecture:** Extend the existing reversible directional-pose layer, not simulation or input. Use bounded advance/retreat heading with hysteresis, separate from ground gait state. Preserve six authored unarmed flight families. Existing final chest/head/hand solves retain responsibility for physical emission alignment.

**Tech stack:** JavaScript, Three.js, Node tests, Vite, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-07-directional-combat-motion.md`, extended to the creator-requested airborne case.

## Constraints

No camera/map redesign, no saved-profile changes, no physics steering, no hitscan beams, no new asset/license claims. Respect guard/melee/grab/KO ownership and the flat-FK rig contract. One GPU lane, source frozen during capture. Existing cloth failures remain open.

## Execution

- [x] Add `tools/flight-split-aim.test.mjs`: real Fighter/StudioCombat, real sustained optic/palm/chest and rifle commands; side travel at 30/60/120 Hz. Require visible pelvis heading toward travel, upper-body separation, actual socket/ray alignment, unchanged velocity. Run it RED before production changes.
- [x] Add `tools/flight-split-aim-browser.mjs`: isolated Studio, constant-velocity side-cast with travel-arrow context, front/side/rear inspection phases, temporal recording and numerical rows. Capture BEFORE without production edits. Actual target context is verified separately through the user-facing Studio path.
- [x] Modify `src/engine/directional-pose.js`: airborne ranged heading state distinct from `_groundHeading`; upper-body compensation while airborne. Use the existing retreat deadband and emitter prediction, and restore before every animation sample. Updated the half-turn tie in `entity.js`; `flight-pose.js` needed no changes and six unarmed authored families remain intact.
- [x] Run new tests plus optic-reversal, chest-channel, concurrent-emitter, directional transitions, flight/hover/weapon/contact tests. Added rendered forearm/fist/gun checks, reversal and interruption/release cases.
- [x] Capture AFTER with identical settings; inspect actual screenshots and temporal sequence states. Run isolated Studio profile regression and real-input game checks in a single GPU lane.
- [x] Request read-only scoped review; repair reproduced findings, rerun the relevant gates and production build. Recorded exact outcomes, visual shortcomings and retained broad-goal gaps in `docs/FLIGHT_SPLIT_AIM_PASS.md` and the acceptance ledger. No global completion or 10/10 claim.

## Execution evidence

24 initial side-flight tests failed before implementation. Added actual airborne Studio rehearsals (three RED→GREEN tests plus browser controls) without saved-profile writes. Independent review drove 12 additional sustained lateral/descent handoff checks and the airborne carrier-lifetime repair. Final `test:flight-aim` passes 152 Node checks, Studio UI, real input and 480 captured frames. Broad suite: 840 total / 836 pass / the same four unresolved cloth failures. Studio-profile 18/18; build passes. No commit, source asset import, camera/map edit or completion claim.
