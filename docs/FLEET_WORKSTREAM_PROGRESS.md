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
| 1 | Shared control/camera contract (VehicleSession) | accepted (headless) | vehicle-session.js + 8-test gate; FleetPilot routed through it; solid() gap fixed |
| 2 | Tank player movement (incl. contact/support conflict fix) | accepted (headless) | fleet-support-repair 8-test gate; full sweep 144/144 |
| 3 | Tank camera / turret separate aim | accepted (headless + browser) | vehicle-turret gate (7) + Gate A browser run |
| 4 | Tank firing / ammo / reload | accepted (headless + browser) | vehicle-fire gate (4) + Gate A browser run |
| 5 | Tank target/damage integration (enemy awareness) | accepted (headless + browser) | vehicle-hull gate (5) + Gate A: hull 420→281 under AI shells; infantry belief err 0u |
| 6 | Tank AI intent (drive/aim/fire through same paths) | accepted (headless + browser) | vehicle-ai gate (6) + Gate A: AI tank drove 128u and shelled the player |
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

## GATE A — ACCEPTED (2026-09-15)
Browser evidence in `artifacts/fleet-gate-a/` (result.json + screenshots), harness
`tools/fleet-gate-a-browser.mjs` (needs `npx vite --port 5193 --strictPort --host 127.0.0.1`).
enter → drive/turn (not reversed) → Alt freelook (gun untouched) → mouse aims turret separately
from hull → real main-gun shell → ammo down → reload on envelope timing → AI-crewed hostile tank
drives + shells the player tank (hull 420→281) → infantry perceives the occupied tank (belief
error 0u) → J exit restores character control. 0 page errors.

## Recorded gaps (deliberate, not hidden)
- GIANT platforms (carrier/mothership, span>200) have NO hull damage model — a single cover box
  that size blankets LOS/fog/placement scans (it killed the research-lab pad search); a capital
  ship needs per-section receivers.
- Destroyed vehicles hide the wrapper; no wreck model yet.
- Reticle rendering for the turret solution is not yet drawn on the HUD (the ammo line + feed are);
  the aim/muzzle truth layer exists and is what any reticle must read.
- Fleet input remains keyboard/mouse only (pad/mobile unclaimed, as before).
- No verified aircraft/rotor engine recordings (pre-existing; fleet-audio still wheeled-only).

## Blockers
- **Push blocked**: no GitHub credentials on this machine (`gh auth login` not configured,
  terminal prompts disabled). All work is committed locally on `fleet/vehicle-combat`.

## Session log
- 2026-09-15: branch created, baseline verified (59 tests, build green). Survey complete.
- 2026-09-15: story 2 shared repair — contact/support adapter fixed (one ground number, real
  wheeled air branch, hover cushion, wall slide). Highwall fleet presets re-anchored (the layout
  had grown under them; pre-existing red). Sweep 136/136.
- 2026-09-15: story 1 — vehicle-session.js: shared seat/ownership/restore contract (driver+gunner
  layouts, player|ai source, death-inside + destroyed-vehicle release, one restore path).
  FleetPilot enter/exit/seat routed through it. fighter-body-contact solid() now excludes
  _fleetVehicle occupants (was an oversight vs scout/aircraft). Sweep 144/144.
