# Military Response and Vehicles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task **after parent approval**. Steps use checkbox syntax. This is an architectural planning brief, not authorization to implement it now. Preserve the shared dirty checkout; no staging/commits without a separately authorized, clean task-only boundary.

**Goal:** Extend the existing action-driven police response with independently simulated, fightable tanks, rotorcraft and fixed-wing aircraft, then add bounded native player occupancy without replacing superhero controls or the BFP camera.

**Architecture:** PoliceSystem remains the sole heat/wanted/country/response authority. A bounded VehicleSystem owns non-Fighter physical vehicles; human adapters and vehicle AI produce the same intent consumed by the same motion and weapon executor. Vehicle collision, damage, destruction and occupancy are explicit native lanes, separate from Constructs, world-car props and infantry Fighters.

**Tech Stack:** Existing JavaScript, Three.js 0.169, Vite, node:test and existing browser tooling. Native collision utilities and procedural geometry; no dependencies, migrations or physics-engine replacement.

**Spec:** `docs/COMPLETION_LEDGER.md`, `docs/superpowers/plans/2026-09-08-completion-continuation.md` follow-on passes, and both user attachments read in full:

- `C:/Users/taskm/.codex/attachments/2bcce36c-a5d7-40eb-aeb3-62c0afa8c1e2/pasted-text.txt` — actions raise threat and provoke different responses; tanks/planes/helicopters, distinct aircraft feel, explosions, eventual player control; foundations before spectacle.
- `C:/Users/taskm/.codex/attachments/24eebba6-00c6-44eb-98ed-27f16ec4a37d/pasted-text-1.txt` — preserve precise movement/aim, two attack-selection gestures, readable contact, scalable native systems and moving evidence rather than screenshot-only claims.

The September requirement supersedes July's “everything except vehicles” exclusion in `docs/DESIGN_DECISIONS.md`, as already recorded in `docs/COMBAT_EFFECTS.md:42`. It does not authorize map/road work or turn aircraft-data rows into finished vehicles. Parent accepts the Tasks 1–4 closed-catalog stats, caps, tells, response authority and source-credit policies below as **initial UNBALANCED engineering defaults**, not user-supplied numbers or a balance ruling. Occupancy controls and policies remain proposals; Tasks 5–7 are held for the later geometry/ejection preflight described below. This brief is prepared, not live implementation; nanites implementation is next, not military execution.

## Global constraints

- No cape embellishment, map redesign, architecture migration, paid asset requests or imaginary audio access.
- Traveling beams remain hoses. Preserve BFP camera and existing controls.
- Read-only inventory precedes replacing existing systems.
- Test intended failures before changing behavior, then focused regressions, rendered evidence and build.
- Distinguish code evidence, measured behavior, visual opinion and missing acceptance.
- No infantry kit/animation changes; no nanite, inhibitor, alien or infection implementation.
- Do not import `Construct`, `construct-policy.js`, `construct-tank.js` or their energy/slot ownership into vehicles. A military tank has physical health, ammunition and an operator; a Will Tank remains a power-owned construct. Neither becomes an entry in the other's collection or authoring schema.
- Preserve existing roster identities, source prices, cooldowns, power scaling, player/bot `runSlot` execution, mouse-wheel selection and per-scheme bindings while on foot/in superhero flight.
- Existing Three.js/native collision is an explicit project override of Game Studio's default Rapier recommendation. Its simulation/render/input separation and moving acceptance guidance apply; no scaffold, renderer, physics package or language migration is proposed.
- Single-player/local testing only initially. Police already disables itself in active netplay; vehicle spawning/occupancy must refuse unsupported network sessions explicitly, not produce unsynchronized local vehicles.

## What already exists, and the exact integration points

This reuses `docs/reports/2026-09-08-systems-gap-audit.md`; only affected seams were re-read. Line numbers are the September 8 shared-checkout snapshot and may move during other work.

| Existing source | Preserve / extend |
| --- | --- |
| `police.js:89 ladderGatesFor`, `:155 wantedLevel` | Existing thresholds 35/90/160/240/340/460; sequential country ceilings for federal, military and sanctioned response. A vehicle director consumes their result, never derives a second star ladder. |
| `police.js:186 onCivHarm`, `:203 onCopDown`, `:222 onCopHurt`, `:239 witnessed` | Existing civilian/district heat, officer escalation and witness cadence. Military vehicle damage needs separately named attribution; do not report destroyed hardware as a dead officer. |
| `police.js:256 _responseDelay`, `:285 _corruptionIgnores`, `:291 update` | Preserve country/safety/district timing, once-per-dispatch corruption roll, quiet delay then 1.3 heat/s decay, target fixation and stand-down. |
| `police.js:371–377`, `:381 _sendCruiser`, `:418 _deploy` | Existing dispatch timer, reinforcement gate, 16s cadence and live-infantry cap check remain untouched. `_deploy` creates squads; do not silently “fix” its possible batch overshoot in this pass. Cruiser drive-in is a 1.7s tween; it is not tank/aircraft physics. |
| `game.js:2074 isFoe`, `:1504 pickTarget`, native aim path `:3307` | Fixation protects uninvolved heroes. Vehicles need explicit target descriptors/queries, not insertion into Fighter `entities` or passing them through humanoid target/rig APIs. |
| `projectiles.js:105 Projectile`, `:634 _impact`, `game.js:2274 areaDamage`, `:2374 damageBlock` | Reuse actual projectiles, traveling beams, contact and explosions. Preserve ballistic-vs-explosive routes, delayed/guided contact, earliest collision and one receiver charge per attack lane. |
| `melee.js` active contact resolver and current construct-contact tests | A vehicle receiver must compete with existing Fighter/cover/construct contact by earliest reached point. No Fighter body meshes, grab/guard-crush/ragdoll impersonation. |
| `entity.js:980 lastHitBy`, `game.js:2555 handleKO`, `:2936 onHit` | A non-Fighter damage source cannot enter killer XP/streak/Elo machinery unchecked. Current `handleKO` increments killer fields unconditionally when a killer exists. Vehicle shots require explicit source-versus-Fighter-credit separation. |
| `game.js:731 registerInteractable`, `:752 updateInteractFocus`, `:778 interactVerb`, `:3551` grab/interact chain | Use the existing focused interaction gesture and prompt for entry/exit. Focus is currently P1-global; a local P2 entry query cannot reuse P1 `_focus`. |
| `core/settings.js:8 KEYMAPS`, `core/combat-selection.js:18 sampleMouseCombat`, `core/gamepad.js:8 MAP` | Reuse scheme-selected grab/up/down/guard actions and the existing RMB selection window. New vehicle mode is a context, not a new globally conflicting keyboard layout. |
| `game.js:3284 controlPlayer`, `controlPad`, `controlBot`, `controlRemote`, `:3899 update` | Each controller submits intent; one vehicle executor owns movement/fire. Do not mutate hero definitions or let vehicle input continue to call hero `runSlot`. |
| `game.js:4043 cameraDrive`, `world.js:2588 chase` | CameraDrive remains the single owner. Vehicle camera is a scoped occupied-vehicle branch; unoccupied BFP paths remain unchanged. Do not feed a fabricated Fighter into `_chaseBfp`. |
| `game.js:1838 startMatch`, `:1969 startMode`, reset/removal/swap paths; `police.js:106 reset` | Clear vehicles, pending response tickets, occupants, damage sources, collision handles and audio idempotently before their world/actors disappear. |
| `data/vessels.js:192 AIRCRAFT`, `:298 aircraftById`, `:301 aircraftScale` | Existing procedural aircraft descriptions/size references, not combat controllers. Their part layouts face -Z; convert once to the engine's +Z motion convention. Do not change their original rows to smuggle behavior or claim all models are supported. |

## Approach selection and staged scope

Three approaches were considered:

1. **Recommended: separate native vehicle actors, bounded contact and controller adapters.** More explicit than a visual prop, but gives distinct motion, fair contact and occupancy without dragging humanoid state into aircraft.
2. Enlarge/reskin Fighters or reuse Construct tanks. Fast to display, but inherits wrong energy, guard, ragdoll, target, owner-KO and locomotion semantics; rejected.
3. Replace collision/control architecture with a general vehicle/rigid-body framework. Broader dependency and map consequences than this request; rejected.

Meaningful gates are: fightable tank in a native training drill → tank dispatched by real heat → fightable rotorcraft response → fightable fixed-wing response → tank entry/drive/fire/exit → rotorcraft occupancy → fixed-wing occupancy. Do not ship a named vehicle source, menu/drill option or response ticket until that gate's actor can move, collide, fire, receive hits, be destroyed and clean up. Private test fixtures are allowed before publication; decorative aircraft, cruiser tweens and “controller coming soon” catalog entries do not pass.

## Initial defaults and approval status

Tasks 1–4 use these parent-accepted, deliberately small UNBALANCED prototype budgets, not difficulty scaling. A superhero may dominate military hardware; no adaptive HP/damage multiplier based on player power. The occupancy portions of Crew / ownership, Entry / exit and Player drills remain proposed and held with Tasks 5–7; accepting prototype combat defaults does not approve those interactions.

| Decision | Initial value/policy (occupancy proposals marked below) |
| --- | --- |
| Response eligibility | Police active, response actually authorized, present living offender, existing `wantedLevel >= 5` and `ladderGatesFor(country).military`. No new country capability inference or edits to country data. |
| Vehicle pressure cap | At most 2 active/pending response vehicles total: at most 1 tank and 1 aircraft. Wrecks are separately capped at 2 for 12s. No change to infantry dispatch numbers/cadence. |
| First support | Tank request after the first real military squad arrival; one 3s audible support warning and validated spawn. No aircraft bypass of an unanswered police call. |
| Aircraft selection | At level 5, rotorcraft after 12 continuous eligible seconds. At level 6 with military capability, fixed-wing may be selected for the next free aircraft ticket; sanctioned Fighter behavior is unchanged. Do not destroy an existing helicopter to replace it with a plane. |
| Replenishment | At least 30s after the previous support ticket was committed for that slot; pending reservations count toward caps. Failed geometry/target validation waits 5s before retry, max 3 candidates per attempt. No queued wave burst after frame stalls. |
| Vehicle offense | Accepted hostile damage to a response vehicle adds `0.2 * actualHpLost` heat to the responsible Fighter; destruction adds 40 once. No `cityStats.cops` increment, no `onCopDown` jump, no vehicle Elo/XP farming. Initial UNBALANCED economy, subject to later measured balance review. |
| AI perception | 5Hz decisions, 0.35s minimum reacquisition, up to 3s last-seen movement memory; no firing without present LOS and weapon reach. At most 1 heavy vehicle discharge across the response group per 1.5s. |
| Crew / ownership | AI crew is an explicit controller token, not hidden immortal infantry. **Held occupancy proposal:** one opaque cabin seat, no passengers/interior camera or visible seated animation claim. Active hostile crew cannot be hijacked in this slice. |
| Vehicle stats | Fixed physical HP and finite ammunition; no ki, regen, repair, force-field armor or owner-power multiplier. Vehicle destruction removes weapons immediately. |
| Entry / exit | **Held occupancy proposal:** existing focused grab/interact action; entry only vacant, alive, supported vehicle, with LOS, near access point, speed <= 2u/s and ground height difference <= 3u. Voluntary exit requires a checked free location; no teleporting through walls. |
| Player drills | Optional labeled native tank-combat drill at Task 1. **Held occupancy proposals:** tank drive, helicopter flight and fixed-wing flight drills. They use the current training world, not a new map. Air-start practice is explicitly labeled, not evidence of runway takeoff/landing. |

### Initial vehicle definitions

Create exact new IDs `response-tank`, `response-rotorcraft`, `response-fixedwing`. They are **not ORIGIN powers or roster characters**. All numeric fields must be finite; HP, dimensions, speeds, accelerations, cadence and range strictly positive; ammo/burst counts positive integers; signed pitch limits ordered within [-Math.PI/2, Math.PI/2]; zero only allowed for explicit idle input/remaining ammo/state timers. Reject unknown keys and incomplete/unsupported kinds before allocation. Do not publish a freeform vehicle import/executable plugin path. No new persistent schema: session vehicles and occupancy are runtime state; existing character/profile saves stay byte-compatible.

| Field | Tank | Rotorcraft | Fixed-wing |
| --- | --- | --- | --- |
| HP | 240 | 150 | 120 |
| Model size | 9m hull length, 3.4m width, 2.7m roof height, using `M2U` | Existing `gunship` length/span; rotor radius `spanM * M2U / 2` | Existing `fighter` length/span |
| Motion | max forward 24u/s, reverse 10u/s; acceleration 12u/s², brake 20u/s²; max hull yaw 0.75rad/s | max horizontal 45u/s; acceleration 16u/s²; climb 18u/s, sink 14u/s; max yaw 0.8rad/s, body tilt <= 0.35rad; spool 2s | trim 95u/s; max 130u/s; stall threshold 55u/s; thrust acceleration 30u/s²; max bank 0.7rad; roll 0.8rad/s; pitch 0.45rad/s, pitch limits -0.6/+0.45rad |
| Main weapon | Ordinary native explosive shell: base damage 24, speed 110, radius 1, blast 12, interval 3s, 12 rounds, 0.7s tell | Native ballistic chin gun: base damage 5, speed 160, radius .35; 3-round burst, .12s shot spacing, 1.8s between bursts, 90 rounds, 0.45s tell | Fixed forward ballistic cannon: base damage 6, speed 200, radius .35; max 5 rounds/pass, .12s shot spacing, min 8s between passes, 60 rounds, 1s attack-run tell |
| Secondary weapon | Ballistic coax gun: base damage 4, speed 150, radius .35, max 3-round burst/.15s spacing, 2s pause, 60 rounds | Unguided native explosive rocket: base damage 18, speed 110, radius .8, blast 9, 4s interval, 6 rounds, .8s tell | Unguided native explosive rocket: base damage 18, speed 150, radius .8, blast 9, max 1/pass, 4 rounds, shares attack-run tell |
| Initial reach / elevation | Both weapons max path 180u; pitch -0.12..0.45rad at .6rad/s; turret full yaw at 0.8rad/s | Gun reach 180u; rockets 200u; chin-gun yaw ±1.05rad/pitch -0.8..0.25rad at 1rad/s; rocket pods fixed forward | Weapon max path 260u; cannon/rockets within .08rad of actual nose; no turret or homing |

“Base damage” means the value passed to the existing Projectile constructor, **not guaranteed final HP loss**. Native direct hit/area falloff, ballistic armor and guard still determine Fighter damage. Explicitly test and report direct-versus-splash outcomes before approving these balances; do not retrofit a different global explosion formula. Blast 0 is not a reliable way to disable native splash; use the native ballistic lane for guns. Weapon range is physical maximum path/lifetime plus no-fire gate, not a visual marker.

Definition shape is closed: `{id, kind, hp, model, motion, weapons}`, with `kind` exactly `tank|rotorcraft|fixedwing`; `model` is either `{source:'procedural-tank',lengthM,widthM,heightM}` or `{source:'gunship'|'fighter'}` matching the kind. Motion keys are the values named in the table, expressed as `maxForward/maxReverse/acceleration/brake/maxYaw` for tank; `maxHorizontal/acceleration/climb/sink/maxYaw/maxTilt/spool/ceiling` for rotorcraft; and `trimSpeed/maxSpeed/stallSpeed/thrust/maxBank/rollRate/pitchRate/pitchMin/pitchMax` for fixed-wing. Weapon keys are `lmb/rmb`, each `{kind:'ballistic'|'explosive',damage,speed,radius,range,interval,ammo,burstCount,burstSpacing,tell,blast?}`; guns omit blast. Single-shot weapons use burstCount 1 and burstSpacing 0 (the explicit zero exception); burst guns use interval as the post-burst quiet period. Gimbal limits belong in an optional closed `{yawMin,yawMax,yawRate,pitchMin,pitchMax,pitchRate}` weapon field; fixed guns omit it. Validate all current shipped rows against these exact key sets; do not imply an open user vehicle editor or mix transient ammo/cooldowns into source data.

Fixed-wing's five cannon rounds and one rocket share a native 8s attack-window cooldown in the vehicle weapon executor, applying equally to AI and humans; AI pass geometry is an additional restriction, not a way for AI to skip the weapon budget. Full tank yaw uses wrapped angular difference with limits -Math.PI..Math.PI rather than a stop at the wrap seam. Ground support limits (2u step/0.3rad slope), group heavy-shot token (1.5s), fixed-wing forward cone (.08rad), AI decision/response budgets and wreck lifetime are named module constants in this initial closed catalog, not undocumented per-instance magic fields.

## Native contracts and file ownership map

Create only the modules required by the current gate; do not land empty placeholders for later kinds.

| Proposed module | Responsibility |
| --- | --- |
| `src/data/military-vehicles.js` | Strict supported definitions, weapon budgets and initial UNBALANCED response tuning; exposes `vehicleDef(id)` and `validateVehicleDef(def)`. Does not modify aircraft reference data or character packages. |
| `src/engine/vehicles.js` | `VehicleSystem`, actor creation, owned procedural meshes/audio/collision handles, fire queue, damage lifecycle, reset/dispose and diagnostics. Simulation state remains authoritative; meshes follow state. |
| `src/engine/vehicle-motion.js` | Pure state integration by kind and bounded swept collision against native world geometry; no AI or keyboard polling. |
| `src/engine/vehicle-combat.js` | Vehicle receivers, earliest contact/LOS helpers, stable shot-source descriptors and Fighter-credit resolution. No hidden Fighters or imports from construct runtime. |
| `src/engine/military-response.js` | Director consumes an authorized PoliceSystem snapshot, reserves support slots, validates spawn/egress and emits intents. It cannot write heat, compute stars or bypass country gates. |
| `src/engine/vehicle-controls.js` | Shared vehicle intent normalization, human input adapter and atomic single-seat entry/exit. Added only when occupancy is implemented. |
| `src/engine/vehicle-camera.js` | Occupied-vehicle chase adapter using native camera collision utilities and BFP look angles; no change to on-foot BFP calculations. |

Proposed exact public interfaces:

```js
// Definitions are shipped trusted data, validated before scene allocation.
vehicleDef(id); // immutable definition or null
validateVehicleDef(def); // validated clone; throws for invalid/unsupported data

const system = new VehicleSystem(game);
system.spawn(id, { pos, yaw, controller, fixation = null }); // actor or null if no safe placement
system.submit(vehicleId, intent); // one normalized intent per frame; later duplicates reject
system.beginFrame();              // snapshot previous poses/receivers once, before either actor family advances
system.stepMotion(dt);            // publish current poses/receivers before final melee resolution; no weapons
system.resolveFire(dt);           // rechecks live state/LOS/muzzle/ammo after native incoming hits
system.responseCount;             // read-only count of response-owned active/disabled actors
system.receiveHit(vehicle, amount, { src, point, lane, attackId });
// => {accepted, hpLost, destroyed}; invalid/nonpositive amount never refunds health
system.reset(reason);             // idempotent, silent teardown, no destruction explosion
system.dispose();

// Intent has no raw meshes, function callbacks or alternate damage numbers.
const intent = {
  throttle: 0, steer: 0, pitch: 0, roll: 0, collective: 0, // finite [-1,1]
  brake: false, aimPoint: {x: 0, y: 0, z: 0},
  slots: {lmb: {pressed:false,held:false,released:false},
          rmb: {pressed:false,held:false,released:false}},
  exit: false,
};

new MilitaryResponse(game, system);
response.onAuthorizedArrival({ offender, level, country, at });
response.update(dt); // reads current PoliceSystem authority each decision; submits AI intent
response.reset();

// Contact is separate from Fighter and Construct membership.
nearestVehicleContact(system, from, to, radius, excludeIds, out);
// => null or {vehicle, t, point, normal, partId}; normalized segment t in [0,1]
vehicleAttackSource(vehicle, controllerAtFire, muzzle); // fresh, immutable identity/credit snapshot
fighterCredit(src); // ordinary src unchanged; vehicle-source controller Fighter or null

tryEnterVehicle(game, fighter, vehicle); // {ok, reason}; state changes atomically
tryExitVehicle(game, fighter, {emergency:false}); // {ok, reason}
```

Controller is either `{kind:'response', targetId}` or `{kind:'fighter', fighter}` or `{kind:'vacant'}`. AI crew tokens do not count as human passengers and are not targetable infantry. Actor state includes stable id, definition id, pos/previousPos/velocity, orientation, hp, `phase: 'active'|'disabled'|'wreck'|'retired'`, controller, ammo/cooldown/tell per weapon and registered contact handles. `disabled` stops weapons immediately while airborne motion can continue into a controlled crash. No `Fighter.parts`, ki, tier, grab or humanoid status fields.

### Contact and source attribution boundary

- Vehicles live only in `game.vehicles`, not `game.entities`, `constructs`, `world.cars` or city `coverAll`. Register explicit dynamic receiver geometry through `vehicle-combat.js`; no `onConstructHit` reuse or city-shatter impersonation. Chassis collision and camera collision may query these receivers, but a flying receiver must not become an infinite floor-to-sky cover column or a free moving platform.
- Tank: hull/turret collision boxes and cannon clearance capsule. Rotorcraft: fuselage/tail solid proxies plus separate conservative rotor hazard/clearance disk; do not treat transparent rotor blur as armor. Fixed-wing: fuselage, wings and tail proxies, not a giant axis-aligned cube that blocks empty air between wings. Keep render-local coordinates, yaw/pitch/roll and finite bottom/top consistent; use a conservative broad phase followed by local-space segment/box/capsule checks.
- Merge native Fighter, static/interior/terrain, construct and vehicle candidates before committing the **nearest reached** projectile or melee contact. Equal-distance ties use stable IDs. Guided early return, armed fuse, ricochet and released-tail rules remain native; no contact callback before the final collision winner. Beam receiver damage only comes from positive-dt sustained contact on the final actually traveled/clipped hose, never future reach or a blocked candidate beyond a nearer receiver.
- Explosive vehicles use the native projectile explosion lane; explicit per-explosion receiver IDs prevent direct-contact plus area/world-impact double application to the same vehicle. Direct guns use native ballistic contact. Area receiver damage is based on closest point of the actual proxy; static building damage remains unchanged. Wreck explosions propagate through native `areaDamage/worldImpact` once, with a bounded queue and retired source receiver excluded; no recursive duplicate detonation.
- Tank impacts against solid world geometry stop rather than bulldoze it. Deliberate vehicle ramming/body-slam/throw/portal interaction is a separate follow-on, not implied by chassis contact; touched Fighters are safely separated without repeated contact-DPS farming. Melee hits can damage armor through one earliest native strike, but grabs/throws do not acquire a vehicle.
- A shot-source descriptor supplies the native projectile's required `team`, `name`, `def`, fixed `powerBuff:1`, `sheet.blastMult:1`, origin/aim and explicit `vehicleSource:true`, `vehicleId`, `credit` fields. Its team/fixation and responsibility are captured at fire time; its `pos` is a copied firing origin, not a shared scratch vector. It is an attack-source adapter, **not a Fighter**, and never enters target lists. Exiting, changing driver, destruction or switching faction cannot transfer an in-flight shot's damage/crime ownership. Police hooks resolve its captured Fighter credit before choosing the heat-map key; AI-crew sources have no Fighter credit and retain existing non-criminal response-collateral policy. They are never keyed as a ghost vehicle offender.
- Apply `fighterCredit` at the relevant native attribution hooks: all `lastHitBy`→killer resolution in `handleKO`, human XP/combo/style/psyche handling in `onHit`, and police offense reporting. Keep the actual source origin for guard direction, contact feedback and shot labels. AI vehicle sources receive no Fighter XP/kill streak/Elo or artificial psyche object; credited player operators may receive normal Fighter-victim credit, but destroying vehicles gives only vehicle event/diagnostics unless separately approved. Ordinary Fighter source behavior must remain identical.
- Response vehicles attack only the current authorized offender/that offender's occupied vehicle. Do not let same-team shortcuts defeat fixation or make an uninvolved hero hostile merely because the military is present. Physical obstruction applies to everyone. Friendly vehicle damage defaults off, including friendly splash; neutral civilians remain native collateral recipients and player-launched ordnance retains their real offense attribution.

### Frame, ownership and pause rules

Native controls/AI submit vehicle intents first. At the native contact-frame boundary, call `vehicles.beginFrame()` alongside `melee.beginContactFrame()` before either Fighter or vehicle simulation advances. Preserve the existing Fighter update loop; then apply vehicle motion and publish current receiver transforms, including any bounded vehicle/body separation, **before** native `resolveBodies()` and final `melee.endContactFrame()`. Native `game.js:3903–3921` currently brackets Fighter updates and body resolution with those melee calls: adding vehicle motion only after `endContactFrame()` would resolve strikes against stale receivers. Snapshot previous position/orientation/proxies once at the frame boundary, retain them through final resolution, and pair them with the final current transforms; never snapshot per Fighter, replace previous transforms after movement, or advance a vehicle twice. Melee must compare same-frame relative sweeps, not only the vehicle's old or final stationary box.

After final melee resolution, preserve native KO detection/removal, items, portals and construct upkeep ordering, then run native projectiles/incoming contacts and only then `vehicles.resolveFire(dt)` so an incoming killing hit cancels a queued shot. Existing constructs/minions retain their native order relative to one another. New vehicle shots first travel on the next native projectile tick, like newly fired constructs. Require a real moving-vehicle contact fixture with both Fighter entity orders before accepting this boundary; no broad Game.update rearrangement.

Vehicle motion subdivides positive dt to <= 1/120s with at most 6 substeps for the native .05s maximum Game step; larger direct inputs clamp to .05s and are reported in debug diagnostics, never catch up with unbounded collision work. Controller decisions consume elapsed simulation time with no burst catch-up. Zero dt, pause and replay display produce no movement, ammunition consumption, offense, fire or dispatch. Slow motion uses Game's simulation dt, not wall-clock timers. Reset is different from destruction: no collateral, wanted increase, explosion or delayed gunshot during teardown.

## Distinct motion and defensive behavior

### Tank

Use differential-track drive: commanded left/right drive from clamped throttle ± steer, acceleration-limited longitudinal velocity, reverse cap and bounded hull yaw; no sideways strafe. Track visual phase follows actual left/right distance, including opposing rotation during pivot turns. Hull follows sampled ground slope with an initial 0.3rad support limit and <= 2u step height; beyond that brake/stop, never climb a facade. Tank cannot hover, take off, teleport to a steering waypoint or snap to aim.

Turret yaw is independent of hull heading, with independent gun elevation/recoil and exact visible muzzle. The AI drives toward a bounded standoff point, brakes to aim, emits the tell and fires only with current LOS, a clear barrel envelope and ammunition. Its limited elevation and turn rate are counterplay: close flanking, hard cover and climbing beyond its elevation/range all work. No predictive ray that guarantees a hit, no instantaneous track reversal, and no firing through the hull or a wall beside the barrel.

### Rotorcraft

Use thrust/gravity with spool, horizontal cyclic acceleration and bounded bank; collective changes altitude, releasing it holds the current commanded hover height only while the motor is healthy. Horizontal velocity decays rather than instantly disappearing. Yaw and gun gimbal have separate limits; recoil and rotor phase remain visual outputs of actual state. Require clearance for the full rotor disk, not just fuselage center. No narrow-alley insertion at toy scale.

AI approaches a clear station, orbits/holds briefly, bursts, then shifts position; it may hover but cannot snap laterally or track behind cover. Lose LOS → stop firing and move only toward last seen within the memory budget; after expiry egress. Damage disables weapons at zero HP and reduces/ends lift into a bounded descending crash; never continue firing as an intact flying wreck. Initial flight ceiling 170u above local terrain, weapon reach finite; a fast/high flyer can disengage. No missiles that follow indefinitely.

### Fixed-wing

Implement continuous airspeed, throttle acceleration, pitch/roll rates, drag, gravity and speed-dependent lift; yaw comes primarily from banked turning, not a helicopter-style yaw command. Initial proposal: lift balances native 62u/s² gravity at the 95u/s trim point when level, drops below the 55u/s stall threshold, and a nose-down recovery can regain speed. Clamp numeric instability, not airspeed to a minimum: a stalled plane must sink rather than receive free velocity or snap level. No hover, reverse, vertical takeoff or point rotation.

Nose points along the body; native gun/rockets leave fixed forward sockets. AI makes a warned approach, one bounded attack pass, break turn and egress/reposition before another pass. It commits aim before the pass and cannot steer a fixed gun independently at a strafing superhero. At aircraft cap/geometry limits or without a feasible turn corridor, do not spawn. Model lengths/spans come from existing `aircraftScale`; normalize procedural part extents once, rotate -Z model frontage to +Z, and test resulting Box3 against the declared size. `rotor.r` in existing data is not a verified radius contract; derive the disk from span instead. No runway construction in this scope; airborne response/drills are labeled as such.

## Eventual occupancy: scoped design, not a current feature

**HOLD — Tasks 5–7 must not begin until a later occupancy preflight supplies actual geometry tests and parent resolves destruction/ejection and accepts the occupancy controls.** The following entry/seat/input/camera design is a proposal, not an approved fallback or a publication gate already met. Tasks 1–4 do not allocate human occupants.

### Entry and state ownership

Use the current remapped grab/interact action (`KM.grab`, pad grab), not hard-coded G and not F flight. Register a cabin access point/prompt through the existing interactable seam for P1. P2 uses a Fighter-specific vehicle focus query; never board P1's global focus. In a clinch/carry state preserve the native action priority and refuse entry. Revalidate vacancy, actor alive, range, vertical separation, LOS and speed atomically when the action is consumed. Two simultaneous requests produce one winner by stable human/controller ID, not two occupants.

Player remains the same Fighter in `game.humans`; do not replace `game.player` with a tank, modify def.speed/flightTier or overwrite the power kit. Store one explicit seat link on both actor and Fighter. Cancel existing hero preparation through native cancellation (no charged release), end guard/grab, and require fresh input after the transition. Proposed first seat is an opaque cabin: hide the hero mesh deliberately, not as an animation-quality claim. Suppress hero control/targetability/body collision while seated, but preserve native status/KO/regen bookkeeping; add a narrowly scoped occupied branch in Fighter physics to synchronize the seat transform and skip independent movement, rather than pause the whole Fighter update. Existing harmful DoTs can still KO an occupant and must clear the link; occupancy cannot cure or pause wounds. Hero vision/KO/respawn/swap paths need explicit occupied handling so they cannot unhide a floating hero or strand control.

### Proposed controls while occupied

| Action | Tank | Rotorcraft | Fixed-wing |
| --- | --- | --- | --- |
| W/S or stick vertical | Forward/reverse throttle | Forward/back cyclic | Pitch down/up |
| A/D or stick horizontal | Differential steer | Left/right cyclic | Roll left/right |
| Native up/down actions | No vehicle action | Collective up/down | Throttle increase/decrease |
| Native guard action | Brake | Air brake/hover request, subject to thrust | Air brake, no instant stop |
| Mouse/right stick | Existing look/aim; turret tracks within limits | Existing look/aim; yaw/gimbal rate-limited | Existing look/aim only; nose still follows flight inputs |
| LMB/RMB, primary/secondary wheel gestures | Mounted weapons | Mounted weapons | Mounted weapons |
| Native grab/interact | Safe exit | Safe landed exit | Safe stopped exit |

Native fly toggle, superhero melee/power keys and gadgets do not execute while seated; display this scoped context, preserve their bindings and restore them on exit. No reserved new keyboard key is assumed. Reuse `sampleMouseCombat` with a separate vehicle input-state record containing mounted slot keys and `mouseMelee:false`; it is already a pure gesture sampler. Its cancel output cancels vehicle tells, never calls hero ability handlers. Both triggers selecting one weapon share one ammo/cooldown owner. Keep hero selections/input state separate and require a fresh gesture after entry/exit, blur, pause, focus loss or pad disconnect. A late scroll cannot undo a previously committed native shot; do not claim otherwise.

Both AI and humans feed the same `submit`/motion/fire checks. AI receives no free ammunition, instantaneous steering, invisible muzzle or shorter cooldown. Auto-aim, autopilot, entry hijacking and passenger gunner seats are not included. Initial controllable vehicles are vacant native drill vehicles; live response units remain crewed. This is genuine occupancy/control, not a promise that GTA-style seizure is already done.

### Exit, destruction and camera

Voluntary exit tests a fixed ordered set of access-side candidates against world, other vehicles and Fighter bodies; inherit bounded vehicle velocity and return the unchanged hero controller only after a safe position is committed. If none is safe, retain occupancy and show “Exit blocked”; do not quietly relocate to the other side of a building. Aircraft normal entry/exit is landed and slow. An explicit airborne practice start may initialize occupancy as part of that scenario, never bypass live entry checks.

**Destruction/ejection is unresolved, not approved.** Vehicle destruction immediately cancels its weapons, but lack of a clear exit candidate must not inflict automatic percentage-of-maxHP trauma or force a Fighter KO. Native explosion/damage/resistance/invulnerability rules govern harm unless a separately justified rule is later approved; geometry failure is not damage and cannot erase superhero power differences. The later occupancy preflight must test a collision-safe seat/last-valid local bounds policy against actual vehicle/world geometry, including a hull wedged beside a wall, fully obstructed access points, moving and airborne destruction, and strong/invulnerable versus ordinary heroes. It must establish a visible, controllable and collision-safe release/ownership outcome without teleporting through a wall, leaving a hidden stranded actor, granting free flight, or inventing a parachute. No fallback is selected by this brief: hold Tasks 5–7 until those fixtures support a parent-approved policy. After a validated release, flying heroes may use their existing flight control and grounded heroes use native fall physics; do not automatically toggle hero flight.

CameraDrive selects the occupied-vehicle camera after explicit map/cinematic ownership and before the ordinary hero chase branch. Reuse current mouse-look yaw/pitch and native terrain/cover camera traces; add own-vehicle clearance, frame the actual bounding volume and keep horizon roll stable. Do not drive camera from turret heading, replay/news events or nearest target. Restore BFP camera state/ownership on exit without an extra mouse delta or aim snap. Two-local-human camera framing uses controlled actor positions/bounds; no network occupancy. Existing on-foot camera tests must remain unchanged.

## Task 1 — Native fightable tank, no decorative publication

**Files:** Create `data/military-vehicles.js`, `engine/vehicles.js`, `engine/vehicle-motion.js`, `engine/vehicle-combat.js`; modify exact native Game/projectile/contact/melee attribution seams listed above; create `tools/vehicle-tank.test.mjs`, `tools/vehicle-contact.test.mjs`, `tools/vehicle-source.test.mjs`, `tools/vehicle-tank-browser.mjs`. Add a labeled optional native training drill in `main.js`/existing training setup only with the completed gate.

**Consumes:** native world collision, actual Projectile/BeamHose/MeleeSystem, Fighter damage and existing VFX/audio. **Produces:** `response-tank` with real tracks/turret/cannon, both mounted weapons, received damage/destruction and complete reset; shared interfaces above. No response dispatch yet.

- [ ] Write native scene fixtures using real Fighter, Projectiles, MeleeSystem and tank, stubbing only renderer/HUD/audio sinks. Test forbidden definition data before allocation and silent reset before implementing geometry.

```js
const tank = g.vehicles.spawn('response-tank', {pos: clearPoint, yaw: 0,
  controller:{kind:'response',targetId:hero.id}, fixation:hero});
assert.equal(g.entities.includes(tank), false);
assert.equal(g.constructs.includes(tank), false);
const before = tank.hp;
const beforeCityBlocks = g.cityStats.blocks;
g.projectiles.spawnProjectile(hero, nativeRoundAimedAt(tank));
stepNativeGameUntilContact(g);
assert.ok(tank.hp < before);
assert.equal(g.cityStats.blocks, beforeCityBlocks);
```

`nativeRoundAimedAt` and `stepNativeGameUntilContact` are local test helpers: use the tank's actual receiver center and a native ballistic Projectile, then bounded `Game.update(1/60)` until its recorded contact; do not invoke `receiveHit` as a substitute for this case.

- [ ] Run `node --test tools/vehicle-tank.test.mjs tools/vehicle-contact.test.mjs tools/vehicle-source.test.mjs`; record intended RED (missing native actor/receiver), not a syntax/setup failure.
- [ ] Implement tank data/model, differential drive, swept geometry, independent gun solve, ammunition/tells and source attribution. Keep a firearm source test that kills a real Fighter to expose non-Fighter XP/streak assumptions; no hidden Fighter caster.
- [ ] Test direct bullet, native explosive direct+splash dedup, guided/armed projectile, traveling/released beam, and one earliest real melee strike against tank, with a closer Fighter/cover/construct in each blocking permutation. Test finite altitude and barrel clearance, same-team/fixation policy, source credit after operator/actor retirement, and one wreck explosion.
- [ ] Add a real `Game.update` moving-vehicle melee regression at 30/60/120Hz: a tank approaches, retreats and crosses the active strike sweep, with a competing nearer Fighter. Reverse Fighter entity order in every case (the vehicle remains outside `entities`); assert identical earliest winner, single HP debit, coherent previous/current receiver snapshots and no stale-pose hit/miss. A lethal winning contact cancels that frame's queued vehicle shot. A stationary receiver/helper-only test is insufficient.
- [ ] Test 30/60/120Hz motion over equal time, pivot/reverse/braking, just-too-high steps, thin walls, ground slope, world edge and water rejection. Ammo cannot catch up in a burst after dt spike. An incoming killing hit on the ready-fire tick emits no shot.
- [ ] Run new tests plus `tools/projectile-contact.test.mjs`, `tools/beam-cover-contact.test.mjs`, `tools/beam-body-contact.test.mjs`, `tools/moving-melee.test.mjs`, `tools/construct-hit.test.mjs`, `tools/construct-tank.test.mjs`, and `npm run build`.
- [ ] Publish the tank training drill only now; capture moving tracks/reverse, hull-turret separation, fire/contact/cover stop and destruction with real player control of the hero. Report actual base/final damage and omitted vehicle-control functionality. Stop for independent review before response integration.

## Task 2 — Existing heat dispatches and recalls bounded tank support

**Files:** Create `engine/military-response.js`, `tools/military-response.test.mjs`, `tools/military-response-browser.mjs`; modify `police.js` only named arrival/offense/reset seams and `game.js` owned system lifecycle. No COP/SWAT/FED/GUARD definitions or existing heat/response formulas changed.

**Consumes:** complete tank from Task 1, PoliceSystem authority. **Produces:** real action-driven tank arrival, finite support budget, honest unavailable/stand-down behavior.

- [ ] Add deterministic native PoliceSystem fixtures for country gates, district harm, response delay, once-per-call corruption, badge offense, unchanged infantry reinforcement gate and sanctioned dispatch. Control random input in the fixture; compare preexisting police outcomes without vehicle support.

```js
police.onCivHarm(offender, harmCount, protectedDistrictPoint);
const heat = police.heatOf(offender);
assert.equal(heat, expectedNativeDistrictHeat);
assert.equal(police.wantedLevel(offender), expectedNativeLevel);
// A data row/timer alone must not allocate support before native authorization.
response.update(20);
assert.equal(g.vehicles.responseCount, 0);
```

The fixture then advances the real initial dispatch and `_deploy` arrival before asserting a warned tank ticket. Do not call `onAuthorizedArrival` manually as the only integration test.

- [ ] Run `node --test tools/military-response.test.mjs` and record RED on the new integration, not changed old threshold expectations.
- [ ] Add `onAuthorizedArrival` from successful military `_deploy`, not wanted-level observation alone. Reserve before warning; commit only after safe geometry/target/country revalidation. Preserve unanswered calls and the old infantry cap path. Add separately named vehicle-offense handling with captured Fighter credit.
- [ ] Test two offenders/target change, casualty and removal during warning, country change, no military, no feds, sanctioned-only capability, netplay, training/no civilians, pending-cap and failed placement. Falling below eligibility aborts pending tickets; active units stop attacking and egress. Blocked egress brakes safely, then retires only after an initial 8s timeout when out of every human's view; if still visible retain an inert bounded stopped unit rather than popping it away. Wreck budgets still apply.
- [ ] Test no visible instant spawn: candidate is outside every human view and clear, with a traversable local ingress; no safe candidate means “support unable to enter” and bounded retry. No road generation, broad pathfinder or teleport through buildings.
- [ ] Run native response/tank/source/contact gates and build; browser escalation from real civilian/badge events → support warning → moving tank → LOS escape → stand-down. Record country, district, seed, heat, timestamps, infantry count and response reservations. Review before aircraft.

## Task 3 — Rotorcraft response with hover, drift and a real rotor envelope

**Files:** Extend `military-vehicles.js`, `vehicles.js`, `vehicle-motion.js`, `military-response.js`, `vehicle-combat.js`; create `tools/vehicle-rotorcraft.test.mjs`, `tools/vehicle-rotorcraft-browser.mjs`.

**Consumes:** bounded response tickets, native receivers and source attribution. **Produces:** `response-rotorcraft` through the same weapons/motion executor, only published after real airborne combat works.

- [ ] Write failing thrust/spool/hover/brake/yaw tests and actual muzzle/rotor/body contact tests. Assert the rendered rotor radius matches declared span/2 at world scale and that its clearance prevents a narrow-gap spawn.

```js
submitCyclic(heli, {throttle:1, collective:0});
stepMotionFor(heli, 2);
const moving = heli.vel.clone();
submitCyclic(heli, {throttle:0, brake:true});
stepMotionFor(heli, 1/60);
assert.ok(heli.vel.length() > 0 && heli.vel.length() < moving.length());
assert.ok(Math.abs(heli.roll) <= heli.def.motion.maxTilt);
```

Helpers submit the same normalized intent and step the production motion solver; they cannot directly animate pos/rotor meshes.

- [ ] Implement motor spool, thrust/hover target and rate-limited cyclic/gimbal; bounded station/shift/egress AI, native gun/rockets and finite ammo. Recheck rotor clearance throughout turns, not only spawn.
- [ ] Test behind-cover LOS loss, overhead/out-of-elevation target, crossing targets/gimbal limit, no firing at uninvolved heroes, out-of-range projectile expiry, no aircraft-cap breach and no aircraft arrival before authorized military response.
- [ ] Kill the aircraft with a real beam/projectile at altitude: guns stop immediately; physical descent/impact yields one explosion, no hovering dead hull or live collider after cleanup. Test pause/slowmo/reset during spool, tell, flight and crash.
- [ ] Run rotorcraft, response, tank, contact and source tests plus build; browser reel compares hover, strafing inertia, altitude changes, turn, near-building rotor clearance, burst/rocket and crash. Include a hero successfully escaping by cover or range. Review before fixed-wing.

## Task 4 — Fixed-wing response that cannot behave like a helicopter

**Files:** Extend the same vehicle-specific modules; create `tools/vehicle-fixedwing.test.mjs`, `tools/vehicle-fixedwing-browser.mjs`. Do not modify airport props or create runways.

**Consumes:** response airborne slot, native collision/fire/source handling. **Produces:** `response-fixedwing`, bounded attack runs and physical stall/destruction; existing other AIRCRAFT rows remain unsupported.

- [ ] Write RED tests for trim flight, bank-limited turn radius, speed loss under braking, stall sink/recovery and forward-only muzzle alignment. Test no reverse/hover/pivot at zero airspeed.

```js
const startPosition = plane.pos.clone(), startY = plane.pos.y;
plane.vel.copy(forward).multiplyScalar(40); // below initial UNBALANCED 55u/s stall threshold
g.vehicles.submit(plane.id, neutralVehicleIntent());
stepVehicleNative(g, 1);
assert.ok(plane.pos.y < startY);
assert.ok(plane.vel.dot(forward) < plane.def.motion.trimSpeed);
assert.ok(plane.pos.distanceTo(startPosition) < 130); // one second, no warp to a flight waypoint
```

`neutralVehicleIntent` supplies the exact interface above; `stepVehicleNative` steps motion/incoming contacts/fire in native order. This low-speed, clear-air one-second fixture starts high enough not to touch terrain; additionally retain each substep position and assert displacement is bounded by actual velocity and acceleration. Do not add an unimplemented teleport counter or animate the plane along the expected path.

- [ ] Implement finite thrust/drag/lift and banked turns, continuous swept wing/tail/world collision, approach→tell→pass→break→egress intents. A rocket and cannon share the run budget; no behind-the-plane gimbal. Failed approach/turn-space proof denies dispatch.
- [ ] Test current LOS at release, a moving hero leaving the committed run, finite projectile reach, 8s between passes, 5-round/pass limit, one aircraft slot and unchanged sanctioned response. Test both high and low FPS without path teleport/altitude snapping.
- [ ] Use actual projectile/beam receiver hits on fuselage and wings; test empty space between proxies remains a miss. Destruction stops fire and produces physical crash/contact once; no live vehicle resurrection after a reset.
- [ ] Run fixed-wing, rotorcraft, tank, response, source/contact tests and build; browser moving evidence must include straight fast transit, bank turn, stall sink/recovery, attack run miss/counterplay, hit/destruction and real-scale comparison to a hero/car. A still jet or an invisible remote airstrike is not this gate.

## Task 5 — Tank occupancy with native controls, attribution and camera return

**HOLD:** Do not execute or publish this gate until the later occupancy geometry preflight and parent-approved destruction/ejection policy described above are complete. Controls, seat and acquisition choices below remain proposals, not approval to implement them.

**Files:** Create `engine/vehicle-controls.js`, `engine/vehicle-camera.js`, `tools/vehicle-occupancy.test.mjs`, `tools/vehicle-input.test.mjs`, `tools/vehicle-camera.test.mjs`, `tools/vehicle-occupancy-browser.mjs`; modify only named Game controller/interact/camera/lifecycle seams, scoped Fighter occupied physics/visibility seams, existing HUD/drill UI. Keep on-foot `KEYMAPS` and `sampleMouseCombat` semantics unchanged.

**Consumes:** complete physical tank and shared intent executor. **Produces:** vacant native tank drill: approach, enter, drive/aim/fire, safe exit, return to the same superhero. Aircraft occupancy remains unavailable until its own gates pass.

- [ ] Write RED atomic-ownership, blocked-entry/exit and same-actor restoration tests; preserve the hero definition/abilities/selections exactly across the transaction.

```js
const saved = structuredClone(hero.def);
assert.equal(tryEnterVehicle(g, hero, tank).ok, true);
assert.equal(tryEnterVehicle(g, otherHuman, tank).ok, false);
assert.equal(g.player, hero);
assert.equal(g.humans[0].fighter, hero);
assert.deepEqual(hero.def, saved);
assert.equal(g.entities.includes(tank), false);
```

- [ ] Implement scoped seat link/physics synchronization, native cancel-on-entry, preserved status/KO clocks, vehicle input state and explicit HUD prompt. Reuse remapped interaction action, two-trigger gesture sampling and mounted weapon slot state; a scroll/exit cannot release a paid hero attack or fire the next selected weapon.
- [ ] Test P1 and P2 separately and together, same-seat races, pad disconnect, blur, pause, held triggers, quick RMB tap, RMB+wheel released between frames, shared-weapon triggers, KO/DoT while seated, hero swap/removal, reset and destruction while entering. Refuse unsupported netplay before any mutation.
- [ ] Add occupied camera branch with real own-hull/world near-plane clearance; preserve actual input look angles across entry/exit. Native on-foot BFP motion and camera tests must remain unchanged. No new orbit/cinematic takeover.
- [ ] Run occupancy/input/camera and all vehicle tests plus existing `tools/combat-selection.test.mjs`, `tools/dual-trigger.test.mjs`, `tools/focus-release.test.mjs`, `tools/dual-trigger-network.test.mjs`; discover/run the existing camera suite by its current filenames rather than inventing one; build.
- [ ] After the preflight hold is released, browser P1/P2 entry-drive-fire-exit, wall-blocked exit, native explosion/resistance and the approved destruction/ejection cases, plus reset. Include strong/invulnerable and ordinary heroes; inspect visible ownership, motion and aim, not only seat-link state. No geometry-triggered forced KO or fixed trauma. Parent reviews this gate before aircraft controls.

## Task 6 — Rotorcraft occupancy, bounded flight/land/exit

**HOLD:** Requires the same later occupancy geometry/policy approval plus the completed and reviewed Task 5 gate; helicopter occupancy is not authorized by Tasks 1–4 prototype acceptance.

**Files:** Extend vehicle controls/camera/drill UI only as required; create `tools/vehicle-rotorcraft-occupancy.test.mjs` and its browser evidence case.

**Consumes:** approved seat transaction and complete rotorcraft physics. **Produces:** player collective/cyclic/hover control using the same limits as response AI, with landing and safe exit on already-clear native ground.

- [ ] Add RED input-to-intent equivalence tests: a recorded human sequence and identical direct AI intent sequence produce the same pose, velocity, ammo and receiver transforms at 30/60/120Hz.
- [ ] Enable the vacant helicopter drill only after motor spool, lift, brake/hover, descent and full-rotor landing-clearance checks pass. Landed means physical support, low vertical/horizontal speed and safe rotor envelope, not `pos.y = 0` on button press.
- [ ] Test ordinary exit refused in midair, successful clear landing/exit, blocked landing, no forced superhero flight, pad/focus loss, passenger KO and the later geometry-tested, approved destruction/ejection policy. No pilot-in-cockpit animation/interior-view claim.
- [ ] Run occupancy, rotorcraft, input/camera, contact/source and response regressions; moving browser proof includes takeoff, drift, independent gimbal firing, braking, deliberate landing and unchanged hero movement after exit. Review before fixed-wing occupancy.

## Task 7 — Fixed-wing player air-start with genuine handling

**HOLD:** Requires the same later occupancy geometry/policy approval and reviewed preceding occupancy gates. Air-start does not bypass unresolved occupant release/destruction safety.

**Files:** Extend vehicle controls/camera/drill UI; create `tools/vehicle-fixedwing-occupancy.test.mjs` and its browser evidence case. No road/runway generation or airport-prop conversion.

**Consumes:** approved seat ownership and complete fixed-wing physics. **Produces:** explicitly labeled airborne native aircraft practice with pitch/roll/throttle/air-brake, nose-aligned weapons, stall/collision consequences and native occupant cleanup.

- [ ] Add RED intent equivalence tests and a frozen/neutral-input test proving no free hover. Air-start is a trusted scenario setup transaction, not a second unchecked live entry method.
- [ ] Enable the occupied air-start drill with displayed airspeed/altitude/throttle, control hint and explicit “air-start practice; runway takeoff/landing not included.” Voluntary in-air exit remains refused; end-practice is an explicit menu/reset operation, not an invulnerable bailout exploit inside a live battle.
- [ ] Verify turn and stall recovery remain within the same physics limits as AI, fixed guns cannot aim behind the plane, cockpit look does not instantly steer it, and reset/destruction cannot strand a hidden Fighter/camera. Airborne emergency ejection must use the later geometry-tested, parent-approved occupancy policy; no fixed trauma, geometry-triggered forced KO, free parachute or flight.
- [ ] Run fixed-wing occupancy, flight, input/camera, contact/source, all occupancy and native superhero controls regressions; build. Moving proof: responsive pitch/roll/throttle, banked turn with actual path curvature, finite attack pass, stall/recovery, collision/ejection and return to hero control. Runway takeoff, airfield landing and live aircraft acquisition remain separately open, not marked complete by air-start.

## Cross-gate evidence and budgets

- Every gate records test command, native fixtures versus stubs, exact measured final damage/ammo/motion, console/shader errors, cleanup counts and skipped cases. Tests of helpers alone do not establish game integration.
- Initial prototype limits: <= 2 active response vehicles, <= 2 pending/active total reservations, <= 2 wrecks; <= 64 simultaneously live vehicle projectiles; <= 3 spawn candidates/5s retry; <= 5Hz AI decisions/vehicle, one actual decision per update without backlog; <= 6 collision substeps. Shape budgets: tank <= 5 solid/clearance primitives, rotorcraft <= 6 plus disk, fixed-wing <= 7. Render budget <= 30 draw calls/vehicle and no unique live point light per vehicle; use existing pooled flashes. These are caps to verify, not measured performance claims. No forced extra render pass.
- A tracked/rotor/jet loop, warning/tell, muzzle report, receiver impact and destruction need audible identity. Use existing native local AudioBus cues/DSP only; if no honest rotor/engine loop exists, list the missing asset explicitly and implement a bounded native synthesis placeholder labeled as such—do not claim a recording or buy a provider. One loop handle per live motor, no loops after pause/retirement/reset; same positional listener and volume settings.
- Foreground browser moving capture at current gameplay camera and quality tier, documented hardware/resolution; compare baseline versus capped mixed-response simulation CPU/draw calls/projectile counts. Proposed incremental CPU budget <= 2ms/frame at cap on the tested host; report measured value, do not universalize it. Do not use background RAF throttling as GPU evidence.
- Capture real hero counterplay: break LOS, outrun finite weapons, climb above tank elevation, dodge a plane's committed pass, destroy a vehicle during its tell. No perfect tracking, guaranteed hits or invisible fire to make the AI look effective.
- News may record existing real vehicle events through `matchLog`/`news.highlight` only after the underlying event exists. Do not change reporter framing/replay architecture or commandeer the gameplay camera. A vehicle explosion isn't automatically a destroyed building or officer casualty.
- Final soak: normal police plus capped vehicles, constructs and two human actors; repeated reset/mode change/hero removal; counts return to baseline and no orphan shot, audio handle, occupant link, collision proxy or pending dispatch remains. Preserve native city/property accounting and complete resource-construct regressions.

## Explicit follow-ons / not completion claims

Live hostile hijacking/crew abandonment, visible pilot/passenger animations, multiple seats/cooperative gunners, cockpit/first-person view, repair/fuel economies, runway takeoff/landing, airport interactions, vehicle inventory/import authoring, long-range navigation/roads, bridges/destructible tracked terrain, intentional ramming/throwing/portals/moving-platform riders, VTOL/quinjet/transport/naval craft, network occupancy, new country air-force data and expanded police/infantry tactics remain separate scopes. Infection, inhibitors, aliens and nanites remain in their own briefs. Aircraft air-start practice is not full acquisition or a landing system.

## Planning self-review and parent decisions

- Requirements mapped: response/heat preservation → Task 2; genuine combat tank → Task 1; distinct helicopter/plane → Tasks 3/4; eventual native human control → Tasks 5/6/7; collisions/attribution/cleanup/AI parity → every gate; moving visual/performance acceptance → every gate and cross-gate checklist.
- Existing source evidence is separated from the proposed actor/physics/input design. No vehicle implementation, test run, footage inspection or performance measurement was performed for this document.
- Parent accepts Tasks 1–4 closed-catalog stats/caps/tells, native response authority, new vehicle heat and source-credit/no-vehicle-XP policies as initial UNBALANCED engineering defaults. This is planning acceptance, not military implementation authorization or a claim the user supplied those numbers. Nanites implementation is next; this military document is prepared, not live.
- Tasks 5–7 remain explicitly held. Later parent review must resolve collision-safe seat/last-valid local bounds and destruction/ejection from actual geometry tests, preserving native damage/resistance and hero power differences; no automatic percentage trauma or forced KO for blocked geometry. Single opaque seat/vacant acquisition, mounted controls and fixed-wing air-start limitations remain occupancy proposals until those gates are approved.
- Planning skills influenced the isolated actor/renderer/input boundaries, complete playable gate publication and explicit motion/browser evidence; the project overrides their default physics-stack and commit suggestions. No subagents or unrelated files were changed.
