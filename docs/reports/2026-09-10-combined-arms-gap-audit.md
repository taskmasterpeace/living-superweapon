# Combined-arms objective: current-state gap audit

Source: creator attachment `C:/Users/taskm/.codex/attachments/da3733fb-16ee-4aea-894d-3ca361cc12e6/pasted-text-1.txt`, read in full September 10, 2026.

This is an evidence inventory, not an approved implementation specification. The entire proposal remains the target under discussion. A small recovery milestone would test the central loop; it would not complete Godfall, the map, the other modes, or the broader objective. Proposed values (250 clones, 1/3/5 costs, 15% inheritance, four minutes, 8×8 km) have not silently become rules.

## Findings that change the next implementation

1. `src/engine/entity.js::_updateKO` resets an ordinary dead fighter or flags a no-respawn fighter for removal after 3.4 seconds. Holding a reference to that fighter is not a durable corpse objective. Recovery identity, integrity, ownership and expiration must survive ordinary fighter cleanup without retaining an entire active AI. Duplicate KO notifications and a new life must not mint extra samples.
2. `src/engine/frontline-encounter.js` has four grounded, no-respawn rifle clones and a sealed case already on the ground. Defeating the squad permits a 1.5-second recovery hold, then a separate two-second extraction. It intentionally says research is not implemented. This is neither blood collection nor a research unlock.
3. PowerWorld's `MODE_IMPL` entry in `src/engine/game.js` has an empty `onKO` and `isOver() { return null; }`. It is an open proving ground. Adding counters to the HUD alone cannot establish a faction victory condition.
4. `src/engine/police.js` implements heat and dispatch, but its normal activation consults `hasCivilians`. `src/data/modes.js` excludes PowerWorld. The proposed enemy-faction authorization economy is also different from city police hunting a civilian attacker. Reuse event facts, not the assumption that enabling police completes escalation.
5. `src/data/education.js::applyResearch` applies declared effects to fighters. That reusable effect vocabulary is not a match-scoped genome ledger, research queue, or derivative ability issuance. Do not mutate shared roster definitions when enhancing a clone.
6. `src/data/scale.js` already has creator-defined rank/designation bands. The proposed six strategic categories should not overwrite those statistics or the existing flight/level tiers without an explicit mapping decision.
7. `src/engine/aircraft-piloting.js` already handles entry, throttle, steering, rudder, collective and firing; `aircraft-combat.js` has finite-volume damage receivers and acquisition/burst timing. Neither code presence nor the model's existence proves the proposed combined-arms air-war experience.
8. `src/engine/terrain-detail.js` supplies render LOD and bounded camera caches. Large ground/airspace radii in `powerworld.js` do not establish an authored 8×8 km military map, objective routing, populated-world simulation, or its performance.

## Full proposal coverage

“Partial” means a relevant existing mechanism, not accepted end-to-end gameplay. “Unproven” includes missing or indirect evidence.

| Proposal section | Current evidence | Missing acceptance evidence |
| --- | --- | --- |
| 1. Asymmetric battlefield roles | Native hero/clone Fighter, weapon, flight and vehicle pathways; `mobility-policy.js` keeps natural flyers out of driving | A playable battle where infantry capture/infiltrate/sabotage/recover while supers influence separate simultaneous objectives; enhanced classes, logistics, emplacements and role-specific AI |
| 2. Clone reserve / cloning complexes | KO/respawn boundary exists; current recovery clones never respawn | Faction-owned finite stock, ordinary/enhanced/specialist cost policy, unique-super redeployment, exhausted-stock behavior, infrastructure effects on queues/classes/crews, duplicate-event protection |
| 3. Contested biological asset | Sealed-case recovery only; normal corpse lifetime conflicts with recovery window | Real death creates one persistent asset; enemy extraction versus friendly recovery/denial; integrity decay; carry/drop; incineration, artillery, airstrike, contamination and expiry rules; HUD/audio; cleanup/reset |
| 4. Genome research / enhanced clones | Declarative research effects and data-driven ability slots exist | Delivery-to-lab validation, per-faction progression, incomplete inheritance, successive strain levels, costs/limits/counters; demonstrably weaker derivative issued through native spawn/loadout; no global roster mutation |
| 5. Escalation, not morality | City heat/dispatch and attributed damage events | Military event classification, enemy emergency resources/intelligence/production/heavy authorization/super deployment/anti-super response; no escalation for ordinary lawful fighting; clear thresholds and reset |
| 6. Black Site search | City actors/buildings exist outside the proving ground | Team-private scientist placement; 20–30 candidate compounds; evidence-backed search-area narrowing; defenders' information; win/fail and scientist extraction behavior |
| 7. Tactical interrogation | Civilian reactions exist; no field interrogation loop verified | Context interaction with vulnerable hold, interruption, plausible observed information and ignorance; key-binding conflict resolution with current E power/vehicle actions |
| 8. Fast violent search versus slower questioning | Attributed civilian harm/heat is a partial seam | Distinct timed interactions, actual recoverable evidence, lost witnesses, faction escalation and mission consequences; no omniscient intel generated from every body |
| 9. Destruction versus intelligence | Cover destruction and civilian harm hooks exist | Scientist death can fail the mission; destroyed intel stops informing; destruction reveals attackers; ammunition/authorization constraints; no invisible prohibition substituted for consequences |
| 10. Destruction tiers | `game.js::damageBlock/shatterBlock`, custom `onShatter`, physical cover removal, rubble/VFX | Declared static/prop/tactical/major structure tiers; intact/damaged/breached/collapsed states; separate generator/radar/AA/clone/comms/depot functionality; collision/LOS/navigation follows each transition |
| 11. Occupied structure collapse | Collapse presentation and damage pathways | Warning window, actual occupancy volumes, openings/escape, durability-dependent injury, human incapacity, super burst-through; no generic flat damage ignoring capability |
| 12. Named modes | Existing mode setup/tick/onKO/isOver/HUD architecture; none of these proposal names is implemented in the inspected mode registry | Each mode's full loop, opposing incentives, result, reset and native playtest; see mode ledger below |
| 13. Godfall | Existing hero combat, four-clone recovery, vehicle/aircraft pathways and research effects are disconnected | Two factions, one strategic hero each, 40–100 clones per side at target scale, facilities, vehicles/aircraft, core destruction victory, death/recovery/research wager and command decisions; representative performance |
| 14. Red Valley military map | Large desert terrain, canyon composition, terrain LOD | Authored Alpha/Bravo bases, airfield, research complex, village, radar mountain, canyon route, dry lake, SAM ridge and power station connected by tactical routes; surveyed scale and traversability; streaming/simulation budget |
| 15. Anti-air hierarchy | Ground guns and aircraft combat receivers; flight freedom | Meaningful rifle/HMG/autocannon/radar-AA/SAM/experimental-cannon roles; lock warning, seeker limits, terrain masking, radar destruction, ground-force response, countermeasures; no unavoidable anti-flyer punishment |
| 16. Strategic power categories | Creator rank/threat/flight systems already exist and stay authoritative | Deliberate human→catastrophic classification mapping; high-tier deployments trigger intelligible detection/command/emergency responses, not merely larger HP pools |

## Mode ledger (all remain open)

| Mode | Required winning experience |
| --- | --- |
| Black Site | Locate through intel versus protect the scientist; mission consequence for killing the protected asset |
| Genome | Kill opposing superweapon, physically recover biological material, extract before loss/denial |
| Clone War | Destroy cloning infrastructure before finite reserves are exhausted |
| Broken Arrow | Locate a crashed experimental asset and win contested recovery |
| Hunt | A powerful superweapon versus military forces with escalating anti-super response |
| Extraction | Capture a living superweapon; restraint/suppression/transport matter, death fails or reduces reward |
| Convoy | Transport a valuable asset over a long route, with route choice, ambush and reconnaissance |
| Air Superiority | Jets/flyers contest airspace while ground teams seize radar/AA |
| Siege | Assault/defend a fortified installation with working AA, artillery, bunkers and radar |
| Insurgency | Unequal forces and civilian concealment with credible identification/escalation |
| Last Weapon | Find and awaken/control/capture a dormant weapon that changes the battle |
| Godfall | Destroy the enemy cloning core while risking genome capture every time the strategic hero deploys |

## Verification performed during this audit

- `node --test tools/frontline-encounter.test.mjs tools/terrain-detail.test.mjs`: **14/14 passed**. Covers current sealed-case holds, damage interruption, no airborne collection, cleanup, crater grounding, patch borders, buffer reuse and camera-cache bounds. Does not cover Godfall or a populated military map.
- `LSW_BASE_URL=http://127.0.0.1:5182`, `LSW_AUTHORED_RIFLE=1`, `LSW_HEADLESS=1`, `LSW_RIFLE_OUT=artifacts/authored-rifle-motion-review`, then `node tools/rifle-contact-browser.mjs`: supplemental inspection passes. 600 simulation samples across idle/move/fire/guard/retreat and front/right/rear/left; support and paid muzzle checks. Recording and20 stills in that directory. Explicitly staged actor/camera, fixed simulation steps, placeholder imported carbine, procedural native articulation; not native-input gameplay, an imported locomotion-clip approval, real-time performance or final military art.
- Inspected move/front, fire/right, guard/left and retreat/rear stills. The carbine remains visibly crude and the fixture does not establish full tactical clothing, ground travel or polished gait. No visual acceptance granted.
- `npm run build`: passes (388 modules). Existing large-chunk and mixed static/dynamic GLTFLoader warnings remain.
- Prior immediately preceding work:95 focused authored equipment/rifle contact/firearm emission tests passed; native portrait/landscape Pause→Loadout→Resume passed. Scope is recorded in the Impact slice report.

## Current decision boundary

First-scenario alternatives were presented to the creator: Godfall Recovery (recommended), sealed-case Genome Raid, or Clone War. No answer has been received at this audit checkpoint. Do not treat the suggested choice or this audit as approval of new match rules. Continue relevant already-authorized infantry/control correctness work while the decision is open; do not repeat the same question every scheduled wake.

The near-term milestone must preserve the full target: a recovery prototype is not a substitute for cloning infrastructure, faction escalation, military-scale maps, anti-air or the named modes. Those remain explicitly open above.

## Creator reminder: hero / plane / missile speeds are a coupled priority

The creator explicitly reiterated flight speed, plane speed and missile speed after this audit. Aircraft expansion is not the immediate implementation task, but their speed relationship is part of the shared foundation and must not be deferred out of the design.

Added repeatable diagnostic: `node tools/air-speed-audit.mjs` → `artifacts/air-speed-audit/current.json`. It runs production velocity controllers in staged, unobstructed CPU fixtures; it is not a native input, rendering, collision-course or performance benchmark.

At the existing `METERS_PER_UNIT = .19`:

| Measured / configured current behavior | u/s | km/h |
| --- | ---: | ---: |
| Open-sky hero wish-speed ceiling (`PW_AIR.top`; not every hero reaches it) | 210 | 143.64 |
| SOL, held cruise after5s, without staged afterburner ignition | 79.315 | 54.252 |
| VEGA, same conditions | 73.775 | 50.462 |
| KANO, same conditions | 80.482 | 55.049 |
| Jet after20s full throttle, level air-start | 260 | 177.84 |
| Helicopter after20s forward throttle | 80 | 54.72 |
| Representative generic homing projectile at launch | 96 | 65.664 |
| That projectile after its first target-guidance step | 90 | 61.56 |

The homing result comes from `projectiles.js`'s legacy90u/s default maximum. It is NOT a military heat-seeking missile test. Aircraft presently fire cannon rounds; `AircraftCombat.pilotTrajectory` adds craft velocity to290u/s forward muzzle velocity. Preserve that distinction when comparing relative versus world speed.

The inspected player controller has held-Shift cruise, not the requested successive-Shift speed gears. Some characters have timed afterburner ignition; that is not equivalent to selecting three gears. HUD flight currently distinguishes FLIGHT/BOOST, not a speed-gear or Mach state.

Recommended relationship was presented as a selectable design question, not silently installed: combat → pursuit → top-tier supersonic; best flyers can exceed jets; powered missiles usually exceed both but have limited turning, acquisition, fuel/range and terrain visibility. An alternative permits brief extreme flyers to outrun missiles. Choice pending.

Required joint acceptance for the speed work:

- Shared physical units, per-character accessible speed gears and per-aircraft acceleration/top speed; no fake km/h/Mach labels or global speed inflation that also accelerates infantry.
- Successive-Shift controls, braking/downshift, energy cost, insufficient-energy feedback, landing/KO/reset and AI/pad/touch parity; no conflict with ground evade or existing held attacks.
- Acceleration, turn radius and stopping distance measured at each gear. Highest-speed flight must be distinct from near-instant combat strafing.
- Chasing, overtaking and interception tested with native actors, including a head-on pass and a fleeing target. Show actual closure speed, not independent speedometer screenshots.
- Missiles need a distinct motor/seeker contract: acquisition warning, field of view, tracking/turn limit, launch velocity policy, powered/coast phases, expiration/range, obstruction and loss/reacquisition behavior. Generic nearest-foe homing is not sufficient.
- Sonic crossing audio/visual event must trigger on actual threshold crossing with hysteresis, not every frame or whenever BOOST is held. Keep targets readable; motion effects cannot hide missiles or hijack aim.
- Raise speed only together with tested camera tracking, swept body/building/projectile collision, hit reactions, beam tip travel/steering and map traversal. Beams remain travelling hoses, not hitscan replacements.
- Current aircraft integration subdivides travel into roughly2u steps; substantially higher speed increases work per frame. Measure the full collision workload at30/60/120Hz and representative battlefield load.

### Native flight input finding (before gear implementation)

The speed diagnostic now exercises `Game.controlPlayer` with a real SOL fighter and real ability payment, using staged input state (not browser-dispatched events). One forward-flight frame produces:

| Input | Sustained cruise | Energy spent | Dash cooldown started |
| --- | --- | ---: | --- |
| Left Shift | Yes | 6.043 | Yes |
| Right Shift | Yes | 0.043 | No |
| Gamepad dash | No | 6.000 | Yes |

This is a live controller asymmetry, not just a suspected source-code conflict. Left Shift feeds both `cruiseHeld` and the `shift` ability slot; Right Shift only feeds cruise; gamepad dash only feeds the ability slot. Adding a tap counter without changing ownership would retain double-action energy spending and unequal input behavior. The next flight-control change must explicitly route airborne gear selection separately from ground dash, use a shared keyboard/pad/touch intent, and cover release, overlays, landing and respawn. No gear behavior or new speed caps were installed by this diagnostic.

Fresh existing regression run: `node --test tools/fighter-body-contact.test.mjs tools/fighter-environment-sweep.test.mjs tools/aircraft-piloting.test.mjs tools/world-units.test.mjs` passed **53/53**. Cases include opposing flyers, rendered core separation, thin cover at30/60/120Hz, terrain ridges, ceilings, roof landing and aircraft ownership. This is bounded CPU evidence; no claim of all collision arrangements, populated-battlefield performance or final high-speed flight feel. Node emitted its existing missing local-storage-path warning.

## Equipment ownership maintenance supporting clone scale

The real carbine extraction allocated106 geometries beyond the loaded asset;104 received no disposal call. Many were transient CPU copies, so this is not a claim of104 retained GPU buffers. The loader snapshots original resources, while replacement receiver geometry and partial-extraction failure paths lacked explicit ownership.

`authored-equipment.js` now reads indexed triangles directly and owns every generated split/remainder, including intermediate geometry and failed mounts. Measured generated count is4. Original asset resources retain their loader ownership, and repeated retirement does not dispose another live carbine. RED success-cleanup and partial-failure tests were observed before the fix; corrected malformed-bolt input then reproduced the intended failure.

Fresh verification:38 tests across authored equipment, aircraft piloting and world units pass; production build passes with existing chunk warnings. Equipment runtime wiring, native graphics-resource measurements and all-pose approval remain open. Speed diagnosis does not mean speed tuning has shipped.
