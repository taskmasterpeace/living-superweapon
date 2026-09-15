# FLEET / VEHICLE COMBAT WORKSTREAM — durable progress

Branch: `fleet/vehicle-combat` (from `origin/codex/playable-integration` @ 03ea017b).
Owner: autonomous Dominion fleet workstream. Do NOT merge into codex/playable-integration directly —
deliver this branch for the integrator to review.

Baseline (2026-09-15): 59 fleet tests green (`node --import ./tools/helpers/character-css-loader.mjs
--test tools/vehicle-pilot.test.mjs tools/vehicle-rig.test.mjs tools/vehicle-sim.test.mjs
tools/fleet-handling.test.mjs tools/fleet-lifecycle.test.mjs tools/vehicle-motion.test.mjs
tools/fleet-motion-repair.test.mjs tools/fleet-controls-feedback.test.mjs`); `npm run build` passes.
⚠ fleet-lifecycle (and anything importing abilities/game) REQUIRES
`--import ./tools/helpers/character-css-loader.mjs` or Node dies on `.css`.

## Governing acceptance
A vehicle is accepted only when it completes:
enter → control → perceive → move → collide → fight → receive damage → recover/reset → exit
through the SAME systems the rest of the game uses (takeDamage choke point, real projectiles,
faction/sensing rules). AI vehicles must use the same intent interfaces — no mesh-along-waypoints fakes.

## Ordered stories

| # | Story | State | Evidence |
|---|-------|-------|----------|
| 1 | Shared control/camera contract (VehicleSession) | todo | — |
| 2 | Tank player movement (incl. contact/support conflict fix) | todo | — |
| 3 | Tank camera / turret separate aim | todo | — |
| 4 | Tank firing / ammo / reload | todo | — |
| 5 | Tank target/damage integration (enemy awareness) | todo | — |
| 6 | Tank AI intent (drive/aim/fire through same paths) | todo | — |
| 7 | Motorcycle presentation/handling (visible rider, lean) | todo | — |
| 8 | Helicopter completion (+1 mounted weapon) | todo | — |
| 9 | AA + missile interception (Gate B) | todo | — |
| 10 | Jet envelope (throttle/stall/landing) | todo | — |
| 11 | Mech locomotion (physics owns travel) | todo | — |
| 12 | Fleet catalog/status UI (honest per-capability states) | todo | — |

States: `todo · in-progress · accepted · blocked(reason)`.
Never mark accepted on compilation alone — needs the story's playable/headless verification.

## Known starting limitations (from the 2026-09-15 integration docs)
- Turret/torso inputs `aimX`/`aimY` hardcoded zero in FleetPilot; no vehicle weapons or damage.
- All occupants hidden (no visible motorcycle rider); no seat sockets used.
- Boarding is XZ-nearest demo logic; jet is a flight-start trial, no landing certification.
- AA turrets in vehicle-sim are TRACKING-ONLY set dressing (fire behaviour deliberately removed).
- Mech gait is procedural diagonal without terrain foot IK.
- Fleet input is keyboard-only.

## Blockers
(none yet)

## Session log
- 2026-09-15: branch created, baseline verified (59 tests, build green). Codebase survey in progress.
