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
