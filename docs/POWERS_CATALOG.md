# THE POWERS CATALOG — 60 powers in three engine-cost tiers

Commissioned 2026-07-24 ("give me 20 powers this engine could handle now, 20 that would take
some coding, and 20 that would require adding new things to the engine"). Every row is grounded
in the REAL capability surface as of this writing — the 26 registered TYPES in
`engine/abilities.js` (melee · rush · projectile · volley · beam · cone · charge · growingorb ·
teleport · phase · dash · summon · construct · buff · tentacle · portal · bow · quiver · rifle ·
facebomb · nova · mindcontrol · grapple · mine · lifedrain · meteor), the projectile flags
(homing / grav / boomerang / blade / canister / arrow+payload / bullet+ballistic / pierce /
shock / face / siphon / dtype), the def traits (thorns · phase · grabHeal · teleEscape · metal ·
guardType³ · strength · overdrive · frostResist · energyInfinite · flightTier · glider ·
meleePace · items · reveal), and the standing systems (freeze, DoTs, corrode, mind control,
nova, portals, tentacles, summons, constructs, grapple/hang, slam physics, carry & throw,
beam clash, guard crush, police heat, belief/hearing AI).

Inspiration names are the archetype, not the license. House law applies everywhere: NO PURPLE,
data-driven types (never `if (def.id === …)`), ≥2 carriers via ≥2 delivery systems for any new
mechanic (or deliberately rare and written down), a counter, readable VFX/HUD tells, and
headless verification.

---

## TIER 1 — twenty powers the engine handles TODAY (pure data)

Each of these is a kit line in `data/characters.js` or a catalog row in `data/creator.js`.
Zero engine code.

| # | Power (inspiration) | The data recipe |
|---|---|---|
| 1 | **Heat Vision** (Superman, Homelander) | `beam`, `dtype:'fire'`, thin `radius:0.9`, high dps, red-gold colors — a surgical cutting beam vs SOL's wide ray |
| 2 | **Shield Ricochet** (Captain America) | `projectile` + `boomerang:true, blade:true` — one heavy disc out-and-back, hits both passes (`dmgClass:'slash'` rides the boomerang clip) |
| 3 | **Poisoned Throwing Knives** (Elektra, ninjas) | `volley` + `blade:true, payload:'poison'` — payload stacks the DoT through the choke point, spinning steel reads matte |
| 4 | **Acid Spit** (Reptile, Anti-Venom) | `projectile`, `dtype:'acid'` — applies `_corrode`, the anti-armour type; melts TITAN's plate, weak vs bare flesh |
| 5 | **Sonic Scream** (Black Canary, Banshee) | `cone`, huge `push`/`lift`, low dps, pale colors — a control cone that shoves squads off rooftops (slam physics finishes the job) |
| 6 | **Concussive Gas Grenade** (Mister Fear) | `projectile` + `canister:true, grav, payload:'gas'` — the KIVULI recipe on a new carrier |
| 7 | **Speed Blitz** (The Flash) | `rush` with `hits:12, interval:0.06` + `evade:{kind:'sprint'}` + `meleePace:1.5` — VOLT proves the whole stack |
| 8 | **Frost Nova** (Iceman, Sub-Zero) | `cone` cold at 360°-ish arc (`arc:6.28` narrow range) building `frost` → encase; countered by strength break-outs + frostResist |
| 9 | **Orbital Judgment** (Zod, Sentry) | `meteor` — STORMCALL's SKYFALL retuned: fewer, bigger `radius`/`blast`, longer `interval` for an artillery ult |
| 10 | **Life Leech Field** (Rogue, vampires) | `lifedrain` — held siphon, self-heal; already AI-usable |
| 11 | **Dominion** (Professor X, Mesmero) | `mindcontrol` — MARSHAL's R on a psychic-flavoured carrier; the honesty/Elo guards are load-bearing and already built |
| 12 | **Supernova Feed** (Phoenix, Cyclops full-release) | `nova` — hold feeds the whole tank, omnidirectional; <12-ki taps fizzle loudly |
| 13 | **Blink Strike** (Nightcrawler) | `teleport` + high-damage short-range `melee` + `evade:{kind:'phase'}` — port in, crack, phase out |
| 14 | **Sentry Turret** (Engineer archetypes) | `construct` kind `turret` (HIVE's Sentinel proves it) + `summon` drones for the full engineer fantasy |
| 15 | **Gravity Orb** (Graviton) | `growingorb` slow-swelling + `homing:0.35` — a drifting doom sphere that curves toward the target |
| 16 | **Regenerative Fury** (Wolverine, Deadpool) | `buff` with `heal` + `def.grabHeal` + `overdrive:true` — the comeback loop is all standing tech |
| 17 | **Deflector Discipline** (Daredevil billy-club zone) | `guardType:'deflect'` + `blade` volley — bounce their bullets back, answer with steel |
| 18 | **Wall of Will** (Invisible Woman) | `guardType:'barrier'` + `construct` kind `wall` — 360° ki-drain guard plus a placeable cover wall |
| 19 | **The Marletta Variant** (weaponized devotion — COF canon) | `facebomb` with different `armDelay`/charge curve — a second carrier makes the type honest |
| 20 | **Grapnel Ranger** (Green Arrow + Batman hybrid) | `grapple` + `bow`/`quiver` payload cycling + `oneHand:true` sidearm for ledge-hang sniping — every piece shipped 2026-07-24 |

## TIER 2 — twenty powers that take SOME coding (a flag, a branch, one file)

Ordered roughly by cost, cheapest first. Each names where the change lands.

| # | Power (inspiration) | What's missing (and where it goes) |
|---|---|---|
| 21 | **Homing Missile Pod** (War Machine) | `volley` doesn't forward `homing` — a one-line pass-through in abilities.js `volley()` |
| 22 | **Chain Lightning** (Storm, Force Lightning) | projectile flag `chain:N` — on hit, re-spawn toward nearest foe within ~26u, N hops, damage decay (projectiles.js hit branch) |
| 23 | **Ricochet Rounds** (Deadshot) | bullet flag `bounce:N` — reflect velocity off cover AABB faces instead of impacting (the wall-hit branch already knows the face) |
| 24 | **Sticky Bomb** (Gambit's charged cards) | canister flag `stick:true` — on contact, parent to the target/wall, det on timer; reuses `armDelay` plumbing |
| 25 | **Caltrop Field** (Green Arrow, Batman) | `mine` variant `field:true` — instead of one blast, a lingering DoT patch (DoT system exists; mines exist; the marriage is ~20 lines) |
| 26 | **Shield Bash** (Captain America charge) | `rush` flag `guardCrush:true` — a connecting rush hit triggers the existing guard-crush stagger (melee.js already owns the move) |
| 27 | **Magnetic Pull** (Magneto lite) | `cone` with negative `push` (a PULL) — clamp + verify foes drag toward the caster; pairs with grab for the throw loop |
| 28 | **Get Over Here** (Scorpion) | `grapple` variant `target:'foe'` — the ray already exists; on fighter hit, reel THEM to YOU (tentacle drag logic is the donor) |
| 29 | **Absorption Stance** (Sebastian Shaw, Bishop) | new `guardType:'absorb'` — blocked ENERGY damage converts to ki at ~40% (one branch in takeDamage's guard block; counter: grabs + physical) |
| 30 | **Elemental Infusion** (Amazo, enchanted blades) | `buff` fields `meleeDtype`/`meleePayload` — your fists carry fire/poison for the duration (melee.js reads the active buff) |
| 31 | **Ground Pound** (Hulk landing) | falling-speed check in `entity` landing: slot-armed leap-slam does `areaDamage` scaled by fall height — slam physics is the donor |
| 32 | **Air Juggle** (Marvel vs Capcom launchers) | `melee` flag `airChase:true` — after a launch hit, teleport-snap above the launched target for the follow-up (launch state already tracked via `launchT`) |
| 33 | **Decoy** (Loki, Mysterio lite) | spawn a no-attack Fighter clone + feed `game.noise`/belief at its position — the AI honesty system makes bots genuinely hunt it |
| 34 | **Neck-Snap Assassinate** (Black Widow) | back-grab flag `execute:true` — unescapable back-grabs already exist; add a damage multiplier vs full-health targets + a hard cap |
| 35 | **Smoke Wall** (Daredevil foes, ninja vanish zones) | `construct` wall variant that's VISION-only (registers in fog raster but not collision) — both systems exist, the split flag doesn't |
| 36 | **Burrow Strike** (Sandman, Graboids) | `phase` variant `underground:true` — sink below grade (heightfield y), move blind, erupt with launch; needs marker + un-targetable rules |
| 37 | **Overwatch Drone-Buddy** (BT-7274, F.R.I.D.A.Y.) | `summon` variant that BUFFS/heals the owner instead of shooting — drones exist; the support doctrine branch doesn't |
| 38 | **Kinetic Charge-Up** (Sebastian Shaw full loop) | damage-taken → `powerBuff` ramp with decay + aura ramp on the existing tier system (overdrive is the donor; needs caps + HUD tell) |
| 39 | **Weather Gust Call** (Storm lite) | timed world-space wind pushes using cone-push math at plan-driven strength — climate data says WHAT the sky can do; this makes it shove |
| 40 | **Wall Run** (Prince of Persia, Spider-Man lite) | `hanging`'s cousin: brief cling+run along a cover face when airborne beside it (grapple's face-ray is the donor; ~40 lines in entity) |

## TIER 3 — twenty powers that need NEW ENGINE SYSTEMS

Each names the missing pillar. Several pillars unlock MULTIPLE rows — build the pillar, not
the one-off.

| # | Power (inspiration) | The missing pillar |
|---|---|---|
| 41 | **Giant Form** (Giant-Man, Atom) | RUNTIME SCALE: fighter scale changes must propagate to hitboxes, melee reach, camera framing, ragdoll masses, cover collision — `frameOf` proves proportions, not live re-scale |
| 42 | **Shrink** (Ant-Man) | same SCALE pillar, other direction, plus targeting rules for a 0.2u fighter (aim magnet, lock-on, AI vision) |
| 43 | **True Shapeshift** (Beast Boy, Mystique) | MID-MATCH BODY/KIT SWAP: a second figure() + ability set hot-swapped on one entity, with HUD/AI/rankings identity continuity |
| 44 | **Duplication** (Multiple Man) | CLONE SQUADS: N player-owned Fighters sharing an HP/ki pool, squad AI, kill attribution folding back to the prime |
| 45 | **Telekinesis** (Jean Grey) | RANGED PHYSICS CHANNEL: seize any prop/fighter at range, hold it in a physics constraint, throw with the arc preview — carry & throw is melee-range only |
| 46 | **Elastic Limbs** (Mr. Fantastic, Luffy) | STRETCH RIG: verlet limbs ON the humanoid rig (tentacles are external chains; arms are FK capsules the ragdoll owns) |
| 47 | **Ghost Walk** (Kitty Pryde) | TRUE WALL INTANGIBILITY: passing THROUGH buildings breaks collision, fog occupancy, AI belief, and the interior contract — phase today is i-frames, not traversal |
| 48 | **Possession** (Deadman) | BODY TRANSFER: player input/camera migrating into a cop/civilian/rival body — mindcontrol flips a bot's team; possession moves the HUMAN |
| 49 | **Time Rewind** (Tracer's Recall) | STATE SNAPSHOT RING: per-fighter position/hp/ki history buffer + interpolated playback, with netcode implications |
| 50 | **Bullet-Time Sense** (Spider-Sense, Max Payne) | PER-ENTITY TIME RATE: the sim clock is global (`game.slowmo` scales everyone); one fighter moving at full speed in a slowed world is a scheduler change |
| 51 | **Weather Dominion** (Storm full) | RENDERED WEATHER: rain/snow/lightning-storm systems driven by the climate join, with combat effects (visibility, slick ground, lightning strikes) — ATLAS knows; nothing renders |
| 52 | **Hydrokinesis** (Aquaman, Hydro-Man) | DYNAMIC WATER: waves, floods, water columns as combat volumes — the deep has bathymetry and drag, not moving water |
| 53 | **Juggernaut Tunnel** (Juggernaut, Doomsday) | THROUGH-STRUCTURE PATHS: carving a persistent hole THROUGH a building needs real structural voxels/portals — shatter removes whole blocks; heightfield can't fold (manual §6) |
| 54 | **Vehicle Pilot** (any driver, mech pilots) | DRIVABLE VEHICLES: seats, vehicle physics, enter/exit, AI traffic honoring the road graph — cars are throwable cover today |
| 55 | **Summon Mount** (Valkyrie's pegasus, sandworms) | RIDER ATTACHMENT: fighters parented to moving entities with shared control and combined hitboxes |
| 56 | **Illusion Theater** (Mysterio full) | PER-VIEWER REALITY: geometry/entities that exist for one viewer and lie to AI belief coherently — fog is per-player visibility of TRUE things; illusions are false things |
| 57 | **Gravity Zones** (Graviton full) | LOCAL GRAVITY VECTORS: physics assumes -y everywhere (entity, ragdoll, projectiles, particles); zone-based gravity is a physics-wide retrofit |
| 58 | **Persistent Firewalls** (Dormammu, Human Torch trails) | HAZARD FIELDS: lingering damage volumes the AI pathfinds around — mines are points bots don't avoid; fields need navigation awareness |
| 59 | **Fusion** (DBZ fusion dance) | ENTITY MERGE: two fighters (possibly two HUMANS) becoming one super-kit entity with merged stats/controls, then splitting — touches control, HUD, rankings, netcode |
| 60 | **The Living City** (Ultron seizing infrastructure) | CITY AS COMBATANT: streetlights, cars, cranes, billboards as controllable weapon nodes — needs a powered-infrastructure graph over the road/plan layer |

---

## The pillar map (tier 3 grouped by shared engine work)

- **SCALE** → 41, 42 (and retro-improves frame variety)
- **BODY/IDENTITY SWAP** → 43, 48, 59
- **RANGED/CONSTRAINT PHYSICS** → 45, 46, 55
- **TRAVERSAL THROUGH SOLIDS** → 47, 53
- **TIME** → 49, 50
- **WEATHER + WATER** → 51, 52 (climate + bathymetry already laid the data groundwork)
- **FIELDS + AI AVOIDANCE** → 58, 25→ (the tier-2 caltrop is the scout for this pillar)
- **DRIVABLES/ATTACHMENT** → 54, 55, 60
- **PER-VIEWER REALITY** → 56 (builds on belief + fog honesty)
- **SQUAD OWNERSHIP** → 44 (builds on summons + Elo attribution)

## Delivered alongside this catalog (2026-07-24)

The "do what we did to bullets" pass: `blade` (STORMCALL's Hurled Axe, KNIGHTFALL's Batarang
Fan) and `canister` (SARGE's Frag Grenade, KIVULI's Gas Canister) projectile bodies, arrow
air-wakes, per-projectile material ownership in disposal, and drones crediting their owner
(kill attribution + Elo + heat). Tier-1 rows 2, 3, 6, 17 lean on those flags directly.
