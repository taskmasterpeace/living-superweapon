# Full roster and power inventory

Source: src/data/characters.js, including MILITARY_ROSTER. Snapshot: integration branch after 3c719c7.

## What exists versus what was audited

**55 characters, 382 equipped slots, 26 equipped power types.** This is not 382 unique mechanics and not 382 gameplay-accepted powers. The 18 retained pilot slots belong only to WEBLINE/APEX/VANGUARD; they were a repair sample, never the complete roster.

This document covers EVERY current default slot. Names and numerical settings are code-derived. The effect sentence identifies delivery and important authored flags, not a promise of passed gameplay acceptance. Base damage is not final damage; defenses, strength, charge, forms and runtime modifiers matter. Omitted settings use runtime defaults; omission is NOT zero. Range/speed use engine units, not meters. The speed column is authored base movement, NOT measured flight top speed. Slot F is the data key (normally H on keyboard); mouse-wheel selections can remap attacks.

## Find a playstyle

- Speed-focused: **JELANI** (grounded strength-speed, base speed 46) and **VOLT** (base speed 44, sprint evade, limited flight). Names such as Mach Sprint are not proof of sonic speed.
- Beam-focused choices: **KANO, SOL, APEX, NOVA, MAJESTY**; compare the individual beam entries below, not just their names.
- Fast full-flight candidates: **VANGUARD** (42), **TORCH** (40). These are base-speed comparisons, not a flight-race result.
- Grounded traversal: **WEBLINE** (web zip), **KNIGHTFALL** (grapnel). They should not be presented as flyers.
- Heavy lifting candidates: **RAGE** (strength 10, grounded); **VANGUARD / STORMCALL** (strength 9, full flight). Liftable objects still depend on runtime mass/capacity and carry compatibility.
- Infantry: **SARGE, MERC, BREACH, RECON**. **SANDRA** is a grounded hunter rather than a generic soldier.

## Entire roster at a glance

| Character | Authored role | Movement | Base speed | Strength /10 | Slots |
|---|---|---|---:|---:|---:|
| SOL | Bruiser / Beam | Full flight | 34 | 8 | 7 |
| KANO | All-Rounder | Full flight | 36 | 6 | 7 |
| VEGA | Charge Artillery | Full flight | 33 | 7 | 7 |
| AURUM | Constructs | Full flight | 32 | 5 | 7 |
| NOVA | Sky Artillery | Full flight | 33 | 5 | 7 |
| RIME | Cryo Control | Levitation | 31 | 4 | 7 |
| VOLT | Speed / Lightning | Limited flight | 44 | 3 | 7 |
| WARDEN | Control / Slam | Levitation | 30 | 8 | 7 |
| HIVE | Summoner | Limited flight | 32 | 3 | 7 |
| PYRE | Fire Bruiser | Levitation | 32 | 7 | 7 |
| TORCH | Fire Flyer / Air | Full flight | 40 | 4 | 7 |
| APEX | Absorb / Regen | Full flight | 32 | 8 | 6 |
| SPECTER | Phase / Flight | Full flight | 34 | 6 | 7 |
| VANGUARD | Air Combat / Invuln | Full flight | 42 | 9 | 6 |
| KRAKEN | Tentacle Grappler | Limited flight | 29 | 8 | 7 |
| RIFT | Portal Tactician | Levitation | 34 | 3 | 7 |
| TITAN | Armored Juggernaut | Levitation | 29 | 9 | 7 |
| SARGE | Human Arsenal | Grounded | 33 | 4 | 7 |
| MERC | Gun Combat | Grounded | 34 | 3 | 7 |
| KIVULI | Gas Controller | Levitation | 33 | 4 | 7 |
| GALE | Archer / Trick Arrows | Grounded | 36 | 3 | 7 |
| KING STEFANOS | Formed Explosives | Full flight | 33 | 5 | 7 |
| SANDRA | LSW Hunter | Grounded | 37 | 4 | 7 |
| IRONCLAD | Powered Armor | Full flight | 30 | 7 | 7 |
| RAGE | Pure Strength | Grounded | 30 | 10 | 7 |
| STORMCALL | Storm God | Full flight | 31 | 9 | 7 |
| WEBLINE | Web Acrobat | Grounded | 42 | 6 | 6 |
| RIPCLAW | Regenerating Slasher | Grounded | 35 | 6 | 7 |
| MAJESTY | Cosmic Powerhouse | Full flight | 34 | 8 | 7 |
| MYSTWARD | Mystic Defender | Levitation | 31 | 4 | 7 |
| ONYX | Kinetic Duelist | Grounded | 38 | 7 | 7 |
| CHAINFIRE | Hellfire Chains | Limited flight | 31 | 7 | 7 |
| TEMPEST | Weather Control | Full flight | 32 | 4 | 7 |
| KNIGHTFALL | Tactical Vigilante | Grounded | 37 | 5 | 7 |
| AEGIS | Warrior Princess | Levitation | 35 | 9 | 7 |
| OLYMPUS | Divine Champion | Full flight | 33 | 8 | 7 |
| MARSHAL | Phasing Telepath | Full flight | 33 | 8 | 7 |
| CIRCUIT | Cybernetic Arsenal | Levitation | 28 | 8 | 7 |
| TRENCH | Ocean Sovereign | Grounded | 33 | 8 | 7 |
| DECIBEL | Sonic Screamer | Grounded | 37 | 4 | 7 |
| COLDSNAP | Cryo Gunslinger | Grounded | 32 | 3 | 7 |
| CRUCIBLE | Hammer Engineer | Limited flight | 27 | 9 | 7 |
| TALON | Acrobat Duelist | Grounded | 40 | 5 | 7 |
| ABEO | Metal Bodyguard | Grounded | 27 | 9 | 7 |
| JELANI | Strength-Speed | Grounded | 46 | 9 | 7 |
| KAMARIA | Phasing Guardian | Levitation | 36 | 5 | 7 |
| RAMIRO | Cartel Hunter | Grounded | 31 | 6 | 7 |
| JAWAH MATU | Sound Absorber | Grounded | 34 | 5 | 7 |
| MOSES APIO | Symbiont Host | Limited flight | 35 | 7 | 7 |
| DUNE | Sand Shaper | Grounded | 30 | 6 | 7 |
| GRAVEN | Gravity Controller | Levitation | 29 | 6 | 7 |
| BULWARK | Fortress | Grounded | 25 | 9 | 7 |
| FERAL | Beast Rusher | Grounded | 43 | 7 | 7 |
| BREACH | Military / Shield Breacher | Grounded | 30 | 4 | 7 |
| RECON | Military / Rifle Scout | Grounded | 36 | 3 | 7 |

## Every equipped power

### SOL

Bruiser / Beam · Full flight · strength 8/10 · base HP 130 · base energy 120.

A living solar reactor. Thin heat-ray, wide freezing breath, and a flight-fist that ends arguments.

Authored double-tap evade: {"kind":"dash","name":"Solar Step"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Heat Ray | held traveling beam | cost=4; cd=0.25; radius=0.55; tipSpeed=3600; maxLen=145; dps=60; kiPerSec=16; steer=13; faceOrigin=true; dtype=fire |
| RMB | Arctic Breath | Held area cone with frost | kiPerSec=20; range=38; arc=1.15; dps=26; cold=true |
| Q | Sky Smash | Close-range strike | cost=14; cd=1.1; damage=30; range=13; arc=0.75; lunge=64; knock=58; launch=18; fly=true |
| E | Solar Flare | Homing projectile with area blast | cost=8; cd=0.5; damage=18; speed=78; radius=1.5; blast=7; homing=2.4; dtype=fire |
| F | Heat Flurry | Repeated projectile volley | cost=3; interval=0.08; damage=7; speed=108; radius=0.8; blast=3.4; spread=0.11; dtype=fire |
| SHIFT | Super Dash | Burst movement | cost=6; cd=0.6; power=104; iframes=0.26 |
| R | Solar Overload | Temporary self power-up + healing | cost=30; cd=22; mult=1.7; dur=12; heal=40; dtype=fire |

### KANO

All-Rounder · Full flight · strength 6/10 · base HP 115 · base energy 130.

Charge the Wave Cannon like a firehose of light. Blink behind them. Then drop a sky-sized Star Sphere.

Authored double-tap evade: {"kind":"blink","name":"Instant Step","range":24}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Wave Cannon | Chargeable held traveling beam | cost=8; cd=0.6; radius=2.6; tipSpeed=518; maxLen=150; dps=88; kiPerSec=22; charge=true; maxCharge=1.6; kiChargePerSec=14; chargePower=1.7; chargeWidth=true; steer=9 |
| RMB | Comet Rush | Multi-hit rush | cost=16; cd=2.2; range=72; hits=7; interval=0.09; damage=9; finisher=34 |
| Q | Ki Blast | Homing projectile with area blast | cost=6; cd=0.28; damage=12; speed=92; radius=1.1; blast=4.5; homing=2 |
| E | Snap Transit | Teleport movement | cost=12; cd=1.4; range=58 |
| F | Ascend | Temporary self power-up | cost=26; cd=20; mult=1.6; dur=11 |
| SHIFT | Flash Step | Burst movement | cost=5; cd=0.5; power=96; iframes=0.24 |
| R | Star Sphere | Charge and throw a growing orb | cost=20; cd=16; minR=5; maxR=20; growRate=8; kiPerSec=16 |

### VEGA

Charge Artillery · Full flight · strength 7/10 · base HP 120 · base energy 130.

Left-right-left-right blaster storm, a size-scaling Nova Burst that cracks the ground, and the Final Arc.

Authored double-tap evade: {"kind":"dash","name":"Royal Sidestep"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Volley | Repeated projectile volley | cost=3; interval=0.07; damage=7; speed=112; radius=0.85; blast=3.6; spread=0.1 |
| RMB | Violet Lance | Chargeable held traveling beam | cost=8; cd=0.6; radius=1.45; tipSpeed=583; maxLen=150; dps=80; kiPerSec=22; charge=true; maxCharge=1.4; kiChargePerSec=16; chargePower=1.5; chargeWidth=true; steer=9; spiral=true |
| Q | Nova Burst | Charge then release a projectile | cost=6; cd=1; kiPerSec=12; maxCharge=2.4; minR=1.3; maxR=6.2; dmgMin=22; dmgMax=84; maxBlast=32; speedMin=40; speedMax=76; chargePower=3 |
| E | Rush Combo | Close-range strike | contact=fist; cost=12; cd=1.2; damage=24; range=12; arc=0.8; lunge=52; knock=46; launch=12 |
| F | Prince’s Pride | Temporary self power-up | cost=24; cd=20; mult=1.7; dur=11 |
| SHIFT | Burst Dash | Burst movement | cost=5; cd=0.55; power=98; iframes=0.24 |
| R | Final Arc | Chargeable held traveling beam | cost=24; cd=14; radius=3.4; tipSpeed=648; maxLen=170; dps=130; kiPerSec=30; charge=true; maxCharge=2; kiChargePerSec=20; chargePower=2; chargeWidth=true; steer=6 |

### AURUM

Constructs · Full flight · strength 5/10 · base HP 125 · base energy 120.

Solid-light constructs you fly with your cursor: a rocket fist, a falling hammer, a wall, a sentry turret.

Authored double-tap evade: {"kind":"dash","name":"Will Surge"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Will Fist | Create a construct: fist | cost=14; cd=5; construct=fist; duration=11 |
| RMB | Will Hammer | Create a construct: hammer | cost=16; cd=6; construct=hammer; duration=10 |
| Q | Barrier | Create a construct: wall | cost=12; cd=7; construct=wall; duration=9; holdTrigger=true |
| E | Sentry | Create a construct: turret | cost=16; cd=8; construct=turret; duration=12 |
| F | Emerald Bolt | Traveling projectile with area blast | cost=7; cd=0.4; damage=18; speed=88; radius=1.4; blast=6 |
| SHIFT | Will Surge | Burst movement | cost=5; cd=0.6; power=96; iframes=0.24 |
| R | Overcharge Ring | Temporary self power-up + healing | cost=28; cd=20; mult=1.6; dur=11; heal=35 |

### NOVA

Sky Artillery · Full flight · strength 5/10 · base HP 110 · base energy 130.

Rains stars from orbit. A precision Star Lance, a swelling Nova Core, and a sky-wide Meteor Storm.

Authored double-tap evade: {"kind":"dash","name":"Star Step"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Star Lance | held traveling beam | cost=4; cd=0.3; radius=1.1; tipSpeed=907; maxLen=150; dps=60; kiPerSec=16; steer=12 |
| RMB | Nova Core | Charge then release a projectile | cost=6; cd=1; kiPerSec=12; maxCharge=2.2; minR=1.4; maxR=5.8; dmgMin=22; dmgMax=76; maxBlast=30; speedMin=42; speedMax=74; chargePower=2.8 |
| Q | Plasma Orb | Lobbed projectile with area blast | cost=8; cd=0.5; damage=20; speed=60; radius=1.8; blast=10; grav=10; shock=true |
| E | Solar Wind | Held area cone | kiPerSec=16; range=34; arc=1; dps=18; push=46; lift=4; dtype=fire |
| F | Ember Spray | Repeated projectile volley | cost=3; interval=0.08; damage=6; speed=104; radius=0.8; blast=3.2; spread=0.14; dtype=fire |
| SHIFT | Sun Step | Burst movement | cost=5; cd=0.6; power=98; iframes=0.24 |
| R | Meteor Storm | Targeted falling-projectile barrage | cost=34; cd=18; count=14; interval=0.18; spread=28; radius=3; damage=34; blast=18 |

### RIME

Cryo Control · Levitation · strength 4/10 · base HP 115 · base energy 120.

Freezes the battlefield: breath that slows to a crawl, walls of ice, and an Absolute Zero detonation.

Authored double-tap evade: {"kind":"slide","name":"Ice Skate","slideT":0.7,"power":135}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Frost Breath | Held area cone with frost | kiPerSec=18; range=40; arc=1.2; dps=24; cold=true |
| RMB | Shard Volley | Repeated projectile volley | cost=3; interval=0.09; damage=7; speed=120; radius=0.8; blast=3; spread=0.08; dtype=cold |
| Q | Ice Wall | Create a construct: wall | cost=10; cd=6; construct=wall; duration=9; holdTrigger=true; dtype=cold |
| E | Cryo Beam | held traveling beam | cost=5; cd=0.4; radius=1.6; tipSpeed=734; maxLen=130; dps=46; kiPerSec=18; steer=10; dtype=cold |
| F | Glacier Spike | Traveling projectile with area blast | cost=9; cd=0.6; damage=22; speed=70; radius=1.6; blast=8; shock=true |
| SHIFT | Ice Skate | Burst movement | cost=4; cd=0.5; power=100; iframes=0.24 |
| R | Absolute Zero | Charge then release a projectile | cost=10; cd=14; kiPerSec=14; maxCharge=2.2; minR=2; maxR=7; dmgMin=26; dmgMax=80; maxBlast=36; speedMin=36; speedMax=60; chargePower=3; dtype=cold |

### VOLT

Speed / Lightning · Limited flight · strength 3/10 · base HP 100 · base energy 120.

Faster than you can track. Grab him and the current bites back. Lightning flurries, arc-beams, and Overclock.

Authored double-tap evade: {"kind":"sprint","name":"Mach Sprint","mult":1.95,"dur":1.3,"through":true,"lightning":true,"cost":7}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Lightning Flurry | Multi-hit rush | cost=10; cd=1.1; range=60; hits=12; interval=0.05; damage=6; finisher=30 |
| RMB | Arc Beam | held traveling beam | cost=4; cd=0.3; radius=1; tipSpeed=1080; maxLen=140; dps=58; kiPerSec=16; steer=15 |
| Q | Chain Bolt | Homing projectile with area blast | cost=6; cd=0.35; damage=14; speed=120; radius=1; blast=5; homing=3.4 |
| E | Static Field | Held area cone | kiPerSec=16; range=28; arc=1.3; dps=20; push=40 |
| F | Zap Step | Teleport movement | cost=8; cd=0.8; range=44 |
| SHIFT | Blink | Burst movement | cost=3; cd=0.35; power=130; iframes=0.28 |
| R | Overclock | Temporary self power-up | cost=26; cd=18; mult=1.8; dur=9 |

### WARDEN

Control / Slam · Levitation · strength 8/10 · base HP 140 · base energy 120.

Bends weight itself. Shove crowds with force cones, drop a Singularity, then Collapse the arena.

Authored double-tap evade: {"kind":"dash","name":"Gravity Shift","power":92}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Force Push | Held area cone | kiPerSec=16; range=32; arc=1.25; dps=16; push=60; lift=6 |
| RMB | Graviton | Lobbed projectile with area blast | cost=9; cd=0.6; damage=22; speed=56; radius=1.9; blast=12; grav=9; shock=true |
| Q | Singularity | Charge and throw a growing orb | cost=18; cd=12; minR=3.5; maxR=15; growRate=9; kiPerSec=15 |
| E | Anchor Slam | Close-range strike | cost=12; cd=1.1; damage=28; range=13; arc=0.8; lunge=44; knock=40; launch=20 |
| F | Phase | Teleport movement | cost=10; cd=1.2; range=40 |
| SHIFT | Slide | Burst movement | cost=4; cd=0.5; power=92; iframes=0.22 |
| R | Collapse | Charge then release a projectile | cost=10; cd=15; kiPerSec=13; maxCharge=2.4; minR=2; maxR=7.5; dmgMin=28; dmgMax=90; maxBlast=40; speedMin=34; speedMax=58; chargePower=3.2 |

### HIVE

Summoner · Limited flight · strength 3/10 · base HP 105 · base energy 130.

Never fights alone. Swarms of seeker-drones, a fixed sentinel, and an Overmind that empowers the hive.

Authored double-tap evade: {"kind":"dash","name":"Scramble"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Drone Swarm | Summon combat helpers | cost=16; cd=4; count=3; max=6; duration=12; damage=7; interval=0.7; speed=82 |
| RMB | Sentinel | Create a construct: turret | cost=16; cd=7; construct=turret; duration=12 |
| Q | Formic Sting | Homing projectile with area blast | dtype=toxic; cost=6; cd=0.35; damage=12; speed=96; radius=1; blast=4; homing=3; payload=acid |
| E | Hunter Pack | Summon combat helpers | cost=24; cd=8; count=2; max=8; duration=14; damage=12; interval=0.55; speed=92 |
| F | Scatter | Held area cone | kiPerSec=14; range=26; arc=1.2; dps=16; push=38 |
| SHIFT | Scramble | Burst movement | cost=5; cd=0.6; power=94; iframes=0.24 |
| R | Overmind | Temporary self power-up + healing | cost=28; cd=20; mult=1.5; dur=12; heal=25 |

### PYRE

Fire Bruiser · Levitation · strength 7/10 · base HP 135 · base energy 120.

Walking eruption. Lobbed fireballs, a roaring flame cone, a swelling Magma Bomb, and a Rain of Fire.

Authored double-tap evade: {"kind":"dash","name":"Flare Step"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Fireball | Lobbed projectile with area blast | cost=7; cd=0.4; damage=18; speed=72; radius=1.6; blast=10; grav=8; shock=true; dtype=fire |
| RMB | Flamethrower | Held area cone | kiPerSec=18; range=34; arc=1; dps=30; push=14; dtype=fire |
| Q | Magma Bomb | Charge then release a projectile | cost=6; cd=1; kiPerSec=12; maxCharge=2.2; minR=1.5; maxR=6.5; dmgMin=24; dmgMax=82; maxBlast=34; speedMin=40; speedMax=68; chargePower=3; dtype=fire |
| E | Burning Fist | Close-range strike | cost=12; cd=1; damage=26; range=12; arc=0.8; lunge=54; knock=48; launch=12; fly=true; dtype=fire |
| F | Cinder Burst | Repeated projectile volley | cost=3; interval=0.08; damage=6; speed=100; radius=0.9; blast=3.6; spread=0.16 |
| SHIFT | Flare Dash | Burst movement | cost=5; cd=0.6; power=98; iframes=0.24 |
| R | Rain of Fire | Targeted falling-projectile barrage | cost=32; cd=18; count=12; interval=0.2; spread=26; radius=3; damage=32; blast=18; dtype=fire |

### TORCH

Fire Flyer / Air · Full flight · strength 4/10 · base HP 105 · base energy 130.

Flame on. A fast flyer wrapped in fire — grab him and you burn. Jets, homing fireballs, and a supernova.

Authored double-tap evade: {"kind":"sprint","name":"Jet Sprint","mult":1.7,"dur":1.6}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Flame Jet | held traveling beam | cost=4; cd=0.3; radius=1.4; tipSpeed=821; maxLen=120; dps=56; kiPerSec=16; steer=12; dtype=fire |
| RMB | Fire Blast | Held area cone | kiPerSec=18; range=34; arc=1.05; dps=30; push=20; dtype=fire |
| Q | Fireball | Homing projectile with area blast | cost=7; cd=0.4; damage=16; speed=80; radius=1.5; blast=8; homing=2.4; dtype=fire |
| E | Flaming Fist | Close-range strike | cost=12; cd=1; damage=24; range=12; arc=0.8; lunge=60; knock=48; launch=14; fly=true |
| F | Ember Storm | Repeated projectile volley | cost=3; interval=0.08; damage=6; speed=104; radius=0.85; blast=3.4; spread=0.14; dtype=fire |
| SHIFT | Jet Dash | Burst movement | cost=4; cd=0.45; power=120; iframes=0.26 |
| R | Supernova | Charged radial burst | cost=0; cd=22; feedRate=55; maxFeed=120; minRadius=16; maxRadius=44; dmgMin=30; dmgMax=95 |

### APEX

Absorb / Regen · Full flight · strength 8/10 · base HP 145 · base energy 120.

A bio-engineered predator. His throws drain your life to heal him, he regenerates, and charges a perfect wave.

Authored double-tap evade: {"kind":"blink","name":"Afterimage","range":22}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Wave Cannon | Chargeable held traveling beam | cost=8; cd=0.6; radius=2.4; tipSpeed=540; maxLen=150; dps=84; kiPerSec=22; charge=true; maxCharge=1.6; kiChargePerSec=14; chargePower=1.6; chargeWidth=true; steer=9 |
| RMB | Tail Sweep | Close-range strike | cost=12; cd=1; damage=22; range=14; arc=1.1; lunge=36; knock=52; launch=16 |
| Q | Consume | Held damage-to-healing siphon | kiPerSec=14; range=26; arc=0.9; dps=22; ratio=0.6 |
| E | Afterimage | Teleport movement | cost=12; cd=1.4; range=52 |
| F | Regenerate | Temporary self power-up + healing | cost=20; cd=16; mult=1.3; dur=8; heal=46 |
| SHIFT | Burst Step | Burst movement | cost=5; cd=0.5; power=98; iframes=0.24 |

### SPECTER

Phase / Flight · Full flight · strength 6/10 · base HP 120 · base energy 130.

Controls his own density. Phase through everything with energy, or turn diamond-hard to hit like a truck.

Authored double-tap evade: {"kind":"phase","name":"Ghost Slip"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Solar Beam | held traveling beam | cost=4; cd=0.3; radius=1; tipSpeed=994; maxLen=150; dps=58; kiPerSec=16; steer=13; dtype=fire |
| RMB | Density Punch | Close-range strike | cost=14; cd=1.1; damage=30; range=12; arc=0.75; lunge=44; knock=60; launch=20 |
| Q | Intangibility | Intangible state | kiPerSec=18 |
| E | Stone Bolt | Homing projectile with area blast | cost=8; cd=0.5; damage=18; speed=78; radius=1.4; blast=7; homing=2 |
| F | Max Density | Temporary self power-up + invulnerability window | cost=24; cd=18; mult=1.6; dur=8; invuln=1.2 |
| SHIFT | Phase Step | Burst movement | cost=4; cd=0.5; power=100; iframes=0.3 |
| R | Solar Nova | Charge then release a projectile | cost=8; cd=14; kiPerSec=12; maxCharge=2.2; minR=1.6; maxR=6.5; dmgMin=24; dmgMax=82; maxBlast=34; speedMin=40; speedMax=68; chargePower=3; dtype=fire |

### VANGUARD

Air Combat / Invuln · Full flight · strength 9/10 · base HP 150 · base energy 110.

Bulletproof and airborne. Tackles across the sky, laser-visions from range, and turns briefly untouchable.

Authored double-tap evade: {"kind":"sprint","name":"Blitz Run","mult":1.75,"dur":1.4}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Eye Beam | held traveling beam | cost=4; cd=0.28; radius=0.55; tipSpeed=3600; maxLen=150; dps=56; kiPerSec=16; steer=13; faceOrigin=true |
| RMB | Flying Tackle | Close-range strike | cost=14; cd=1.1; damage=28; range=13; arc=0.7; lunge=74; knock=64; launch=16; fly=true |
| Q | Thunderclap | Held area cone | kiPerSec=16; range=30; arc=1.2; dps=16; push=56; lift=5 |
| E | Sky Combo | Multi-hit rush | cost=16; cd=2; range=72; hits=8; interval=0.08; damage=9; finisher=32 |
| SHIFT | Blitz | Burst movement | cost=4; cd=0.4; power=126; iframes=0.28 |
| R | Unbreakable | Temporary self power-up + healing + invulnerability window | cost=30; cd=24; mult=1.6; dur=8; invuln=2; heal=40 |

### KRAKEN

Tentacle Grappler · Limited flight · strength 8/10 · base HP 140 · base energy 125.

Four living tentacles grown from raw energy. They reach, they constrict — and then they slam you through the nearest wall.

Authored double-tap evade: {"kind":"slide","name":"Undertow","slideT":0.6,"power":120}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Abyssal Grab | Reach, seize and throw | cost=18; cd=4.5; range=36; holdT=0.55; damage=16; throwSpeed=92 |
| RMB | Riptide Lash | Close-range strike | cost=12; cd=1; damage=24; range=15; arc=1.25; lunge=30; knock=54; launch=14; dmgClass=slash |
| Q | Corrosive Ink | Held area cone | kiPerSec=16; range=30; arc=1.2; dps=18; push=44; dtype=acid |
| E | Abyss Bolt | Homing projectile with area blast | cost=7; cd=0.4; damage=16; speed=82; radius=1.4; blast=6; homing=2 |
| F | Deep Hunger | Temporary self power-up + healing | cost=24; cd=18; mult=1.5; dur=10; heal=30 |
| SHIFT | Surge | Burst movement | cost=5; cd=0.6; power=96; iframes=0.24 |
| R | Leviathan Maw | Charge then release a projectile | cost=8; cd=14; kiPerSec=13; maxCharge=2.3; minR=1.8; maxR=7; dmgMin=26; dmgMax=84; maxBlast=36; speedMin=36; speedMax=62; chargePower=3 |

### RIFT

Portal Tactician · Levitation · strength 3/10 · base HP 110 · base energy 135.

Opens doors in the world itself. Orange in, blue out — fighters, fireballs, everything goes through. Geometry is a suggestion.

Authored double-tap evade: {"kind":"blink","name":"Side Door","range":36,"cost":14,"cd":1.5,"iframes":0.3}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Rift Ray | held traveling beam | cost=4; cd=0.3; radius=1; tipSpeed=950; maxLen=145; dps=56; kiPerSec=16; steer=13 |
| RMB | Dimensional Door | Paired portals | cost=14; cd=1.2; range=85; dur=14; colorA=#ff8a2a; colorB=#37c7ff |
| Q | Fracture Bolt | Traveling projectile with area blast | cost=7; cd=0.4; damage=17; speed=88; radius=1.3; blast=6 |
| E | Step Through | Teleport movement | cost=11; cd=1.3; range=52 |
| F | Untethered | Temporary self power-up | cost=24; cd=18; mult=1.5; dur=9 |
| SHIFT | Slip | Burst movement | cost=5; cd=0.5; power=98; iframes=0.26 |
| R | Event Horizon | Charge then release a projectile | cost=8; cd=14; kiPerSec=12; maxCharge=2.2; minR=1.6; maxR=6.6; dmgMin=24; dmgMax=80; maxBlast=34; speedMin=38; speedMax=66; chargePower=3 |

### TITAN

Armored Juggernaut · Levitation · strength 9/10 · base HP 165 · base energy 140.

Not a man — a machine of war. Battery-fed twin cannons, a pulse rifle, thruster exhaust, and armor that showers sparks instead of blood.

Authored double-tap evade: {"kind":"dash","name":"Thruster Burn","power":100,"dtype":"fire"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Twin Cannon | Chargeable held traveling beam | cost=8; cd=0.6; radius=2.6; tipSpeed=562; maxLen=150; dps=82; kiPerSec=22; charge=true; maxCharge=1.5; kiChargePerSec=14; chargePower=1.6; chargeWidth=true; steer=8 |
| RMB | Pulse Rifle | Firearm projectile fire | cost=2; interval=0.09; damage=7; speed=175; radius=0.55; blast=2.4; spread=0.04; recoil=1.2 |
| Q | Reactor Burst | Charge then release a projectile | cost=6; cd=1; kiPerSec=12; maxCharge=2.2; minR=1.5; maxR=6.4; dmgMin=24; dmgMax=80; maxBlast=33; speedMin=110; speedMax=150; chargePower=3; chest=true |
| E | Vent Blast | Held area cone | kiPerSec=16; range=30; arc=1.2; dps=18; push=50; lift=4 |
| F | Overdrive Core | Temporary self power-up + healing | cost=26; cd=20; mult=1.6; dur=11; heal=30 |
| SHIFT | Thruster Dash | Burst movement | cost=6; cd=0.7; power=96; iframes=0.22 |
| R | Annihilator Array | Chargeable held traveling beam | cost=24; cd=14; radius=3.4; tipSpeed=626; maxLen=170; dps=126; kiPerSec=30; charge=true; maxCharge=2; kiChargePerSec=20; chargePower=2; chargeWidth=true; steer=6 |

### SARGE

Human Arsenal · Grounded · strength 4/10 · base HP 125 · base energy 100.

No powers. Just a pulse carbine, a plasma blade, a riot shield, grenades, and legs that clear a building. Somehow still terrifying.

Authored double-tap evade: {"kind":"leap","name":"Combat Leap","up":48,"fwd":68}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Service Carbine | Firearm projectile fire | weapon=rifle; gear=true; magazine=30; reserveAmmo=120; reloadTime=2.2; cost=0; interval=0.08; damage=5; speed=180; radius=0.5; blast=2; recoil=1.6 |
| RMB | Frag Grenade | Lobbed projectile with area blast | gear=true; cost=9; cd=0.8; damage=24; speed=58; radius=1.3; blast=13; grav=11; shock=true; canister=true; throwWindup=0.38; throwRecovery=0.32 |
| Q | Plasma Blade | Close-range strike | gear=true; cost=10; cd=0.9; damage=26; range=12; arc=0.9; lunge=40; knock=50; launch=12; dmgClass=slash |
| E | Breaching Shotgun | Firearm projectile fire | weapon=shotgun; gear=true; magazine=8; reserveAmmo=32; reloadTime=2.8; cost=0; interval=0.62; damage=9; pellets=8; speed=150; radius=0.7; blast=2.4 |
| F | Stim Shot | Temporary self power-up + healing | cost=18; cd=16; mult=1.35; dur=8; heal=34 |
| SHIFT | Combat Roll | Burst movement | cost=4; cd=0.55; power=92; iframes=0.3 |
| R | Airstrike | Targeted falling-projectile barrage | cost=32; cd=18; count=12; interval=0.16; spread=24; radius=3; damage=32; blast=17 |

### MERC

Gun Combat · Grounded · strength 3/10 · base HP 120 · base energy 110.

A mercenary with a gun for every range and a short-range combat teleporter. Charged pistol, blaster rifle, thermal detonators — double-tap a direction to blink out of the firing line.

Authored double-tap evade: {"kind":"blink","name":"Combat Blink","range":16,"cost":6,"cd":0.9,"iframes":0.18}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Blaster Rifle | Firearm projectile fire | weapon=rifle; gear=true; cost=2; interval=0.09; damage=6; speed=190; radius=0.5; blast=2; recoil=2.1 |
| RMB | Charged Pistol | Charge then release a projectile | gear=true; cost=4; cd=0.4; kiPerSec=8; maxCharge=1.4; minR=0.6; maxR=2.2; dmgMin=12; dmgMax=34; maxBlast=9; speedMin=110; speedMax=150; chargePower=1.8 |
| Q | Scatter Blaster | Firearm projectile fire | weapon=shotgun; gear=true; cost=7; interval=0.65; damage=8; pellets=9; speed=150; radius=0.7; blast=2.2 |
| E | Thermal Detonator | Lobbed projectile with area blast | gear=true; cost=9; cd=0.9; damage=26; speed=55; radius=1.2; blast=14; grav=11; shock=true; canister=true |
| F | Heavy Pistol | Firearm projectile fire | weapon=pistol; gear=true; cost=4; interval=0.42; damage=17; speed=210; radius=0.55; blast=2 |
| SHIFT | Combat Roll | Burst movement | cost=4; cd=0.55; power=92; iframes=0.3 |
| R | Rail Detonator | Homing projectile with area blast | gear=true; cost=26; cd=8; damage=38; speed=95; radius=1.4; blast=16; homing=2.6; shock=true; canister=true |

### KIVULI

Gas Controller · Levitation · strength 4/10 · base HP 115 · base energy 135.

From Kampala, Uganda. Exhales a living purple gas that chokes, blinds — and turns SOLID on his command. Walls, blades, coffins of hardened vapor.

Authored double-tap evade: {"kind":"phase","name":"Mist Walk"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Choking Veil | Held area cone | dtype=toxic; kiPerSec=17; range=34; arc=1.15; dps=14; push=6 |
| RMB | Solid Smoke | Create a construct: wall | cost=12; cd=6; construct=wall; duration=9; holdTrigger=true |
| Q | Gas Form | Intangible state | kiPerSec=17 |
| E | Creeping Cloud | Homing projectile with area blast | dtype=toxic; cost=8; cd=0.5; damage=12; speed=54; radius=1.9; blast=9; homing=1.6; payload=gas |
| F | Second Wind | Temporary self power-up + healing | cost=22; cd=18; mult=1.4; dur=9; heal=30 |
| SHIFT | Vapor Slip | Burst movement | cost=5; cd=0.55; power=98; iframes=0.26 |
| R | Asphyxia | Charge then release a projectile | dtype=toxic; cost=8; cd=14; kiPerSec=12; maxCharge=2.3; minR=1.8; maxR=7; dmgMin=22; dmgMax=78; maxBlast=36; speedMin=32; speedMax=56; chargePower=3 |

### GALE

Archer / Trick Arrows · Grounded · strength 3/10 · base HP 105 · base energy 100.

No powers — a bow, a knife, and a quiver of nasty ideas. Draw deep and switch broadheads: poison bleeds, flame burns, explosive erases, acid eats armour.

Authored double-tap evade: {"kind":"leap","name":"Vault","up":42,"fwd":60}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Longshot | Draw-scaled arrow | gear=true; cost=6; cd=0.25; drawTime=0.85; dmgMin=8; dmgMax=30; speedMax=215; blast=11; payloads=["explosive","flame","poison","acid","sleep"] |
| RMB | Concussion Shot | Traveling projectile with area blast | gear=true; cost=8; cd=0.7; damage=16; speed=130; radius=0.8; blast=7; arrow=true; shock=true |
| Q | Switch Broadheads | Change arrow payload | gear=true; payloads=["explosive","flame","poison","acid","sleep"] |
| E | Ranger Knife | Close-range strike | gear=true; cost=8; cd=0.8; damage=20; range=11; arc=0.85; lunge=38; knock=40; launch=8; dmgClass=slash |
| F | Deadeye | Temporary self power-up | cost=18; cd=16; mult=1.5; dur=8 |
| SHIFT | Tumble | Burst movement | cost=4; cd=0.5; power=94; iframes=0.3 |
| R | Arrow Storm | Repeated projectile volley | gear=true; cost=4; interval=0.07; damage=8; speed=150; radius=0.6; blast=3; spread=0.12; arrow=true |

### KING STEFANOS

Formed Explosives · Full flight · strength 5/10 · base HP 120 · base energy 140.

President of Greece. His energy takes SHAPE before it strikes — jagged motes, concussive forms, and one shape he can never put down: her face, arriving slow, leaving nothing.

Authored double-tap evade: {"kind":"dash","name":"Propulsion Step"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Formed Charge | Traveling projectile with area blast | cost=7; cd=0.38; damage=17; speed=96; radius=1.3; blast=7 |
| RMB | Mote Storm | Repeated projectile volley | cost=3; interval=0.08; damage=6; speed=110; radius=0.8; blast=3.6; spread=0.13 |
| Q | Concussive Form | Held area cone | kiPerSec=16; range=32; arc=1.1; dps=16; push=52; lift=5 |
| E | Pressure Sphere | Charge then release a projectile | cost=6; cd=1; kiPerSec=12; maxCharge=2.2; minR=1.4; maxR=6; dmgMin=22; dmgMax=76; maxBlast=30; speedMin=42; speedMax=72; chargePower=2.8 |
| F | These Wounds Will Not Heal | Temporary self power-up | cost=26; cd=20; mult=1.65; dur=10 |
| SHIFT | Propelled Slip | Burst movement | cost=5; cd=0.55; power=100; iframes=0.25 |
| R | THE MARLETTA | Charged delayed-explosion projectile | cost=30; cd=17; kiPerSec=13; maxCharge=2.4; minR=2; maxR=5.5; dmgMin=30; dmgMax=85; blastMin=16; blastMax=36; armDelay=0.65; homing=2.3; speed=34 |

### SANDRA

LSW Hunter · Grounded · strength 4/10 · base HP 115 · base energy 105.

The first Jackal. Hunts living superweapons for a living — twin pistols, a ring that sees through every camera on Earth, and a beacon she plants BEFORE the fight starts.

Authored double-tap evade: {"kind":"dash","name":"Jackal Roll","iframes":0.3,"cost":4,"cd":0.55}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Twin Pistols | Firearm projectile fire | gear=true; cost=3; interval=0.16; damage=10; speed=165; radius=0.6; blast=2.6; spread=0.03; recoil=1.2 |
| RMB | Suppressed SMG | Firearm projectile fire | gear=true; cost=2; interval=0.07; damage=4; speed=175; radius=0.5; blast=2; spread=0.06; recoil=0.8 |
| Q | The Ring Sees | Temporary self power-up | cost=16; cd=15; mult=1.15; dur=8; reveal=true |
| E | Pistol Whip | Close-range strike | gear=true; cost=8; cd=0.8; damage=18; range=11; arc=0.85; lunge=34; knock=42; launch=8 |
| F | Tracker Round | Homing projectile with area blast | gear=true; cost=7; cd=0.6; damage=12; speed=140; radius=0.7; blast=3; homing=4; payload=sleep |
| SHIFT | Slip the Frame | Burst movement | cost=4; cd=0.5; power=96; iframes=0.28 |
| R | Clean Extraction | Multi-hit rush | cost=18; cd=12; range=64; hits=7; interval=0.08; damage=8; finisher=34 |

### IRONCLAD

Powered Armor · Full flight · strength 7/10 · base HP 135 · base energy 140.

A genius in a furnace-gold shell. Repulsors, a chest unibeam, and enough thrust to argue with gravity.

Authored double-tap evade: {"kind":"dash","name":"Thruster Slip"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Repulsor Bolts | Firearm projectile fire | cost=2; interval=0.11; damage=7; speed=170; radius=0.6; blast=2.6; spread=0.03; recoil=1 |
| RMB | Unibeam | Chargeable held traveling beam | cost=8; cd=0.6; radius=2.4; tipSpeed=583; maxLen=150; dps=78; kiPerSec=22; charge=true; maxCharge=1.5; kiChargePerSec=14; chargePower=1.5; chargeWidth=true; steer=8 |
| Q | Micro-Missiles | Homing projectile with area blast | cost=7; cd=0.4; damage=15; speed=100; radius=1; blast=7; homing=3 |
| E | Flare Vent | Held area cone | kiPerSec=16; range=28; arc=1.2; dps=18; push=44 |
| F | Overpower | Temporary self power-up | cost=24; cd=18; mult=1.55; dur=10 |
| SHIFT | Vector Thrust | Burst movement | cost=5; cd=0.55; power=100; iframes=0.24 |
| R | Housewarming Party | Chargeable held traveling beam | cost=24; cd=14; radius=3.4; tipSpeed=626; maxLen=170; dps=122; kiPerSec=30; charge=true; maxCharge=2; kiChargePerSec=20; chargePower=2; chargeWidth=true; steer=6 |

### RAGE

Pure Strength · Grounded · strength 10/10 · base HP 220 · base energy 90.

The angrier he gets, the simpler the fight becomes. Strength 10. Leaps counties. Only knows haymakers.

Authored double-tap evade: {"kind":"leap","name":"Rage Leap","up":52,"fwd":74}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Smash | Close-range strike | cost=10; cd=0.9; damage=34; range=13; arc=0.8; lunge=44; knock=66; launch=20 |
| RMB | Thunder Clap | Held area cone | kiPerSec=15; range=30; arc=1.25; dps=14; push=66; lift=6 |
| Q | Boulder | Lobbed projectile with area blast | cost=9; cd=0.8; damage=26; speed=60; radius=2; blast=12; grav=10; shock=true |
| E | Rampage | Multi-hit rush | cost=14; cd=2; range=56; hits=6; interval=0.1; damage=10; finisher=36 |
| F | Fury Rising | Temporary self power-up + healing | cost=20; cd=16; mult=1.5; dur=9; heal=40 |
| SHIFT | Bull Charge | Burst movement | cost=5; cd=0.6; power=104; iframes=0.2 |
| R | WORLD BREAKER | Charged radial burst | cost=8; cd=16; feedRate=60; maxFeed=88; minRadius=14; maxRadius=34; dmgMin=26; dmgMax=82; groundslam=true |

### STORMCALL

Storm God · Full flight · strength 9/10 · base HP 160 · base energy 130.

An axe that remembers lightning. Skies answer when he shouts.

Authored double-tap evade: {"kind":"dash","name":"Storm Step"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Axe Cleave | Close-range strike | gear=true; cost=11; cd=0.9; damage=30; range=13; arc=0.9; lunge=42; knock=56; launch=16; dmgClass=slash |
| RMB | Hurled Axe | Returning projectile with area blast | gear=true; cost=10; cd=0.9; damage=22; speed=110; radius=1.3; blast=6; boomerang=true; blade=true; range=62 |
| Q | Godblast | Charge then release a projectile | cost=6; cd=1; kiPerSec=12; maxCharge=2.2; minR=1.5; maxR=6.2; dmgMin=24; dmgMax=80; maxBlast=32; speedMin=42; speedMax=70; chargePower=2.9 |
| E | Tempest Breath | Held area cone | kiPerSec=16; range=32; arc=1.15; dps=18; push=50; lift=5 |
| F | Wrath of the Sky | Temporary self power-up | cost=26; cd=20; mult=1.6; dur=11 |
| SHIFT | Bolt Dash | Burst movement | cost=5; cd=0.55; power=100; iframes=0.24 |
| R | SKYFALL | Targeted falling-projectile barrage | cost=34; cd=18; count=14; interval=0.16; spread=28; radius=3; damage=34; blast=18 |

### WEBLINE

Web Acrobat · Grounded · strength 6/10 · base HP 100 · base energy 110.

Too fast to hit, too chatty to ignore. His webs pull you in — the wall does the rest.

Authored double-tap evade: {"kind":"leap","name":"Web Vault","up":46,"fwd":70}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Web Snare | Web snare: seize and throw | web=true; cost=16; cd=4; range=38; holdT=0.5; damage=13; throwSpeed=86 |
| RMB | Spider Flurry | Multi-hit rush | cost=16; cd=2.4; range=60; hits=6; interval=0.08; damage=7; finisher=25 |
| Q | Web Darts | Traveling web-control shot (slow on admitted hit) | cost=7; cd=0.55; damage=4; speed=130; radius=0.55; blast=0; ground=false; webControl={"duration":1.2,"moveMult":0.45,"immunity":1} |
| E | Sting Kick | Close-range strike | cost=9; cd=0.8; damage=22; range=12; arc=0.8; lunge=46; knock=44; launch=14; fly=true |
| F | Danger Sense | Temporary self power-up + invulnerability window | cost=18; cd=16; mult=1.3; dur=7; invuln=1 |
| SHIFT | Web Zip | Web zip to an anchor | zip=true; cost=6; cd=0.65; range=150; zipSpeed=90; oneHand=true |

### RIPCLAW

Regenerating Slasher · Grounded · strength 6/10 · base HP 155 · base energy 105.

Claws, healing, and a very short temper. What he does isn't very nice.

Authored double-tap evade: {"kind":"dash","name":"Feral Weave"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Ripping Claws | Close-range strike | cost=8; cd=0.55; damage=19; range=11; arc=0.85; lunge=40; knock=34; launch=6; dmgClass=slash |
| RMB | Lunge Shred | Close-range strike | cost=12; cd=1; damage=28; range=13; arc=0.75; lunge=62; knock=50; launch=14; fly=true; dmgClass=slash |
| Q | Berserker Slashes | Multi-hit rush | cost=14; cd=2; range=54; hits=7; interval=0.08; damage=9; finisher=30 |
| E | Intimidate | Held area cone | kiPerSec=14; range=24; arc=1.2; dps=12; push=38 |
| F | Regeneration | Temporary self power-up + healing | cost=18; cd=14; mult=1.2; dur=8; heal=55 |
| SHIFT | Pounce Step | Burst movement | cost=4; cd=0.5; power=100; iframes=0.26 |
| R | Berserker Rage | Temporary self power-up + healing | cost=26; cd=20; mult=1.75; dur=9; heal=25 |

### MAJESTY

Cosmic Powerhouse · Full flight · strength 8/10 · base HP 130 · base energy 145.

A star wearing a person. When she goes binary, look away.

Authored double-tap evade: {"kind":"dash","name":"Photon Slip"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Photon Stream | held traveling beam | cost=4; cd=0.3; radius=1.2; tipSpeed=907; maxLen=150; dps=62; kiPerSec=16; steer=12 |
| RMB | Star Barrage | Repeated projectile volley | cost=3; interval=0.08; damage=6; speed=112; radius=0.85; blast=3.6; spread=0.11 |
| Q | Nova Fist | Charge then release a projectile | cost=6; cd=1; kiPerSec=12; maxCharge=2.2; minR=1.4; maxR=6; dmgMin=24; dmgMax=78; maxBlast=31; speedMin=42; speedMax=72; chargePower=2.8 |
| E | Comet Punch | Close-range strike | cost=12; cd=1; damage=26; range=12; arc=0.8; lunge=58; knock=52; launch=16; fly=true |
| F | BINARY | Temporary self power-up | cost=28; cd=20; mult=1.8; dur=10 |
| SHIFT | Light Speed | Burst movement | cost=5; cd=0.5; power=108; iframes=0.26 |
| R | Supernova Lance | Chargeable held traveling beam | cost=24; cd=14; radius=3.4; tipSpeed=648; maxLen=170; dps=128; kiPerSec=30; charge=true; maxCharge=2; kiChargePerSec=20; chargePower=2; chargeWidth=true; steer=6 |

### MYSTWARD

Mystic Defender · Levitation · strength 4/10 · base HP 115 · base energy 140.

Doors, wards, and sigils. He was a surgeon once; now he closes wounds in the world. The whip drinks the power right out of you.

Authored double-tap evade: {"kind":"blink","name":"Fold Step","range":12,"cost":6,"cd":0.7,"iframes":0.18}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Crimson Bands | Homing projectile with area blast | cost=6; cd=0.35; damage=13; speed=96; radius=1; blast=4.5; homing=2.6; dtype=magic |
| RMB | Seraphim Shield | Create a construct: wall | cost=12; cd=6; construct=wall; duration=9; holdTrigger=true |
| Q | Fold Space | Teleport movement | cost=11; cd=1.3; range=54 |
| E | Eldritch Whip | held traveling beam | cost=4; cd=0.3; radius=1; tipSpeed=950; maxLen=140; dps=56; kiPerSec=16; steer=13; dtype=magic; siphon=1.1 |
| F | Vishanti Ward | Temporary self power-up + invulnerability window | cost=22; cd=18; mult=1.4; dur=9; invuln=1 |
| SHIFT | Cloak Drift | Burst movement | cost=5; cd=0.55; power=96; iframes=0.28 |
| R | Sigil Rain | Targeted falling-projectile barrage | cost=32; cd=18; count=12; interval=0.18; spread=26; radius=3; damage=32; blast=17 |

### ONYX

Kinetic Duelist · Grounded · strength 7/10 · base HP 135 · base energy 115.

A king in a suit that drinks the hit and hands it back. Claws first, questions later.

Authored double-tap evade: {"kind":"leap","name":"Panther Pounce","up":42,"fwd":66}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Kinetic Claws | Close-range strike | cost=9; cd=0.6; damage=21; range=12; arc=0.85; lunge=44; knock=40; launch=8; dmgClass=slash |
| RMB | Hunt Sequence | Multi-hit rush | cost=14; cd=1.9; range=58; hits=6; interval=0.09; damage=8; finisher=28 |
| Q | Kimoyo Dart | Homing projectile with area blast | cost=6; cd=0.35; damage=12; speed=120; radius=0.8; blast=4; homing=2.4 |
| E | Sonic Overload | Held area cone | kiPerSec=16; range=28; arc=1.15; dps=16; push=46 |
| F | Kinetic Release | Temporary self power-up | cost=22; cd=16; mult=1.55; dur=9 |
| SHIFT | Shadow Step | Burst movement | cost=4; cd=0.5; power=100; iframes=0.28 |
| R | Kinetic Burst | Charge then release a projectile | cost=8; cd=14; kiPerSec=12; maxCharge=2.2; minR=1.6; maxR=6.4; dmgMin=24; dmgMax=80; maxBlast=33; speedMin=40; speedMax=68; chargePower=3 |

### CHAINFIRE

Hellfire Chains · Limited flight · strength 7/10 · base HP 140 · base energy 120.

A skull full of fire and a chain that always finds its debtor. It drags you back to the wall you owe.

Authored double-tap evade: {"kind":"dash","name":"Burnout","dtype":"fire"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Hellfire Chain | Reach, seize and throw | cost=17; cd=4.5; range=38; holdT=0.55; damage=15; throwSpeed=90; dtype=fire |
| RMB | Soul Furnace | Held area cone | kiPerSec=18; range=32; arc=1.05; dps=28; push=12 |
| Q | Brimstone Ball | Lobbed projectile with area blast | cost=8; cd=0.5; damage=18; speed=70; radius=1.6; blast=9; grav=8; shock=true |
| E | Chain Lash | Close-range strike | cost=10; cd=0.9; damage=24; range=15; arc=1.1; lunge=26; knock=50; launch=12; dmgClass=slash |
| F | Penance Stare | Temporary self power-up | cost=24; cd=18; mult=1.6; dur=9 |
| SHIFT | Hell Ride | Burst movement | cost=5; cd=0.55; power=102; iframes=0.24 |
| R | Rain of Hellfire | Targeted falling-projectile barrage | cost=32; cd=18; count=12; interval=0.18; spread=26; radius=3; damage=33; blast=18; dtype=fire |

### TEMPEST

Weather Control · Full flight · strength 4/10 · base HP 115 · base energy 135.

The forecast answers to her. Hail, gale, and lightning filed under mood.

Authored double-tap evade: {"kind":"dash","name":"Wind Shear"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Chain Lightning | held traveling beam | cost=4; cd=0.3; radius=1; tipSpeed=1037; maxLen=145; dps=58; kiPerSec=16; steer=14 |
| RMB | Gale Force | Held area cone | kiPerSec=16; range=34; arc=1.2; dps=14; push=58; lift=7 |
| Q | Hail Volley | Repeated projectile volley | cost=3; interval=0.09; damage=6; speed=118; radius=0.8; blast=3; spread=0.1 |
| E | Flash Freeze | Held area cone with frost | kiPerSec=19; range=30; arc=1.1; dps=18; cold=true; frost=0.55 |
| F | Eye of the Storm | Temporary self power-up | cost=24; cd=18; mult=1.5; dur=10 |
| SHIFT | Tailwind | Burst movement | cost=5; cd=0.55; power=98; iframes=0.24 |
| R | Stormfront | Targeted falling-projectile barrage | cost=34; cd=18; count=14; interval=0.16; spread=30; radius=3; damage=33; blast=18 |

### KNIGHTFALL

Tactical Vigilante · Grounded · strength 5/10 · base HP 125 · base energy 105.

No powers. A plan for yours, though. Grapnel to the roofline, cape-glide off it, and he is suddenly somewhere above you.

Authored double-tap evade: {"kind":"leap","name":"Grapnel Vault","up":44,"fwd":64}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Blade Fan | Repeated projectile volley | gear=true; cost=3; interval=0.11; damage=7; speed=125; radius=0.7; blast=2.6; spread=0.12; blade=true; oneHand=true |
| RMB | Cross Counter | Close-range strike | cost=9; cd=0.7; damage=24; range=11; arc=0.85; lunge=40; knock=44; launch=8 |
| Q | Smoke Vanish | Teleport movement | cost=10; cd=1.4; range=40; oneHand=true |
| E | Caustic Charges | Proximity explosive | gear=true; cost=10; cd=1.1; max=3; trigger=7; damage=24; blast=12; armT=0.6; duration=20; range=55; dtype=acid |
| F | Grapnel Line | Grapnel traversal | gear=true; cost=8; cd=1.1; range=95; oneHand=true |
| SHIFT | Cape Slip | Burst movement | cost=4; cd=0.5; power=96; iframes=0.3 |
| R | Wing Support | Create a construct: turret | cost=18; cd=9; construct=turret; duration=12 |

### AEGIS

Warrior Princess · Levitation · strength 9/10 · base HP 155 · base energy 125.

Bracelets that hand bullets back and a golden lasso that ends arguments against the nearest wall.

Authored double-tap evade: {"kind":"dash","name":"Amazon Step"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | God-Forged Blade | Close-range strike | gear=true; cost=10; cd=0.7; damage=27; range=12; arc=0.9; lunge=42; knock=50; launch=12; dmgClass=slash |
| RMB | Golden Lasso | Reach, seize and throw | cost=17; cd=4.5; range=36; holdT=0.55; damage=15; throwSpeed=92 |
| Q | Aegis Wave | Charge then release a projectile | cost=6; cd=1; kiPerSec=12; maxCharge=2.2; minR=1.4; maxR=6; dmgMin=22; dmgMax=76; maxBlast=30; speedMin=42; speedMax=70; chargePower=2.8 |
| E | Shield Shout | Held area cone | kiPerSec=15; range=28; arc=1.2; dps=15; push=50 |
| F | Blessing of Ares | Temporary self power-up | cost=24; cd=18; mult=1.6; dur=10 |
| SHIFT | War Stride | Burst movement | cost=5; cd=0.5; power=100; iframes=0.26 |
| R | Wrath of Themyscira | Charge then release a projectile | cost=10; cd=14; kiPerSec=13; maxCharge=2.3; minR=1.8; maxR=7; dmgMin=26; dmgMax=84; maxBlast=36; speedMin=36; speedMax=62; chargePower=3 |

### OLYMPUS

Divine Champion · Full flight · strength 8/10 · base HP 150 · base energy 130.

Say the word and the sky says it back. A kid's grin wearing a god's wattage.

Authored double-tap evade: {"kind":"dash","name":"Bolt Step"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Living Lightning | held traveling beam | cost=4; cd=0.3; radius=1.1; tipSpeed=994; maxLen=145; dps=60; kiPerSec=16; steer=13 |
| RMB | Thunder Fist | Close-range strike | cost=12; cd=1; damage=28; range=12; arc=0.8; lunge=52; knock=54; launch=16 |
| Q | Thunderbolt | Charge then release a projectile | cost=6; cd=1; kiPerSec=12; maxCharge=2.2; minR=1.5; maxR=6.2; dmgMin=24; dmgMax=80; maxBlast=32; speedMin=42; speedMax=70; chargePower=2.9 |
| E | Static Storm | Repeated projectile volley | cost=3; interval=0.08; damage=6; speed=112; radius=0.85; blast=3.4; spread=0.12 |
| F | THE WORD | Temporary self power-up + healing | cost=28; cd=20; mult=1.75; dur=10; heal=25 |
| SHIFT | Mercury Step | Burst movement | cost=5; cd=0.5; power=104; iframes=0.25 |
| R | JUDGMENT BOLT | Charge then release a projectile | cost=10; cd=15; kiPerSec=13; maxCharge=2.4; minR=2; maxR=7.5; dmgMin=28; dmgMax=90; maxBlast=40; speedMin=34; speedMax=58; chargePower=3.2 |

### MARSHAL

Phasing Telepath · Full flight · strength 8/10 · base HP 140 · base energy 130.

Walks through walls, reads the room literally, hits like a freight train from a world that no longer exists.

Authored double-tap evade: {"kind":"phase","name":"Ghost Drift"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Alien Vision | held traveling beam | cost=4; cd=0.3; radius=1; tipSpeed=1015; maxLen=150; dps=58; kiPerSec=16; steer=13; dtype=magic; siphon=0.7 |
| RMB | Density Hammer | Close-range strike | cost=13; cd=1; damage=30; range=12; arc=0.75; lunge=46; knock=58; launch=18 |
| Q | Ghost Body | Intangible state | kiPerSec=17 |
| E | Mind Skip | Teleport movement | cost=12; cd=1.4; range=52 |
| F | Resolve of the Dead | Temporary self power-up | cost=24; cd=18; mult=1.55; dur=10 |
| SHIFT | Wraith Dash | Burst movement | cost=5; cd=0.5; power=98; iframes=0.28 |
| R | Dominion | Temporary enemy control | cost=30; cd=18; range=42; arc=0.7; dur=6 |

### CIRCUIT

Cybernetic Arsenal · Levitation · strength 8/10 · base HP 155 · base energy 130.

The accident left him half machine — the machine half never runs dry. BOOYAH is a technical term.

Authored double-tap evade: {"kind":"dash","name":"Boost Vector"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Sonic Cannon | Firearm projectile fire | cost=3; interval=0.14; damage=11; speed=165; radius=0.7; blast=3.4; spread=0.03; recoil=1.6 |
| RMB | White Noise Beam | Chargeable held traveling beam | cost=8; cd=0.6; radius=2.2; tipSpeed=605; maxLen=150; dps=76; kiPerSec=22; charge=true; maxCharge=1.5; kiChargePerSec=14; chargePower=1.5; chargeWidth=true; steer=8 |
| Q | Shock Grapple | Homing projectile with area blast | cost=8; cd=0.5; damage=16; speed=110; radius=1; blast=6; homing=2.6 |
| E | Overload Vent | Held area cone | kiPerSec=16; range=28; arc=1.2; dps=17; push=46 |
| F | System Surge | Temporary self power-up + healing | cost=26; cd=20; mult=1.55; dur=10; heal=25 |
| SHIFT | Servo Burst | Burst movement | cost=6; cd=0.6; power=96; iframes=0.22 |
| R | BOOYAH Cannon | Chargeable held traveling beam | cost=24; cd=14; radius=3.2; tipSpeed=626; maxLen=165; dps=120; kiPerSec=30; charge=true; maxCharge=2; kiChargePerSec=20; chargePower=2; chargeWidth=true; steer=6 |

### TRENCH

Ocean Sovereign · Grounded · strength 8/10 · base HP 160 · base energy 120.

A trident, a temper, and a court of things with too many teeth that answer when he whistles.

Authored double-tap evade: {"kind":"slide","name":"Tidal Rush","slideT":0.65,"power":128}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Trident Pierce | Close-range strike | gear=true; cost=10; cd=0.7; damage=26; range=14; arc=0.7; lunge=44; knock=48; launch=12; dmgClass=slash |
| RMB | The Drowned Court | Summon combat helpers | cost=18; cd=5; count=3; max=6; duration=12; damage=8; interval=0.65; speed=84 |
| Q | Riptide | Held area cone | kiPerSec=16; range=32; arc=1.15; dps=16; push=54 |
| E | Harpoon Throw | Traveling projectile with area blast | cost=8; cd=0.5; damage=20; speed=115; radius=1; blast=5 |
| F | King's Tide | Temporary self power-up + healing | cost=24; cd=18; mult=1.55; dur=10; heal=25 |
| SHIFT | Current Ride | Burst movement | cost=4; cd=0.5; power=100; iframes=0.24 |
| R | MAELSTROM | Charge and throw a growing orb | cost=20; cd=14; minR=4; maxR=17; growRate=8; kiPerSec=16 |

### DECIBEL

Sonic Screamer · Grounded · strength 4/10 · base HP 110 · base energy 120.

Trained fists and a voice that files buildings under rubble. You'll hear her before you see her. Everyone does.

Authored double-tap evade: {"kind":"dash","name":"Offbeat"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Siren Scream | Held area cone | kiPerSec=18; range=36; arc=1.05; dps=22; push=62; lift=4; sonic=true |
| RMB | Combat Cadence | Multi-hit rush | cost=14; cd=1.9; range=56; hits=7; interval=0.08; damage=8; finisher=30 |
| Q | Heel Turn | Close-range strike | cost=9; cd=0.7; damage=22; range=11; arc=0.9; lunge=40; knock=44; launch=10 |
| E | Focused Note | Traveling projectile with area blast | cost=7; cd=0.4; damage=16; speed=130; radius=0.9; blast=5 |
| F | Crescendo | Temporary self power-up | cost=22; cd=16; mult=1.5; dur=9 |
| SHIFT | Staccato Step | Burst movement | cost=4; cd=0.5; power=98; iframes=0.28 |
| R | THE CANARY CRY | Held area cone | kiPerSec=34; range=52; arc=0.9; dps=44; push=90; lift=8; sonic=true |

### COLDSNAP

Cryo Gunslinger · Grounded · strength 3/10 · base HP 115 · base energy 115.

Rules: plan the job, freeze the hero, walk away. The gun doesn't miss because he never hurries.

Authored double-tap evade: {"kind":"slide","name":"Ice Slide","slideT":0.6,"power":122}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Cold Gun | Firearm projectile fire | cost=4; interval=0.28; damage=15; speed=150; radius=0.8; blast=3.5; spread=0.01; recoil=2 |
| RMB | Flash Frost | Held area cone with frost | kiPerSec=19; range=32; arc=1.1; dps=20; cold=true; frost=0.6 |
| Q | Glacier Wall | Create a construct: wall | cost=11; cd=6; construct=wall; duration=9; holdTrigger=true |
| E | Cryo Charge | Lobbed projectile with area blast | cost=9; cd=0.7; damage=20; speed=72; radius=1.4; blast=9; grav=8; shock=true |
| F | Cold Read | Temporary self power-up | cost=20; cd=16; mult=1.45; dur=9 |
| SHIFT | Getaway | Burst movement | cost=4; cd=0.5; power=96; iframes=0.26 |
| R | Absolute Frost | Charge then release a projectile | cost=10; cd=14; kiPerSec=13; maxCharge=2.3; minR=1.8; maxR=7; dmgMin=24; dmgMax=80; maxBlast=36; speedMin=34; speedMax=58; chargePower=3 |

### CRUCIBLE

Hammer Engineer · Limited flight · strength 9/10 · base HP 165 · base energy 115.

Built the suit, forged the hammer, earned the S he paints on it. The hammer comes back. Eventually.

Authored double-tap evade: {"kind":"leap","name":"Rocket Boots","up":46,"fwd":62}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Foundry Hammer | Close-range strike | cost=11; cd=0.9; damage=32; range=13; arc=0.85; lunge=40; knock=58; launch=18 |
| RMB | Hammer Toss | Traveling projectile with area blast | cost=10; cd=0.8; damage=26; speed=100; radius=1.4; blast=9 |
| Q | Rivet Gun | Firearm projectile fire | cost=3; interval=0.12; damage=8; speed=160; radius=0.6; blast=2.8; spread=0.04; recoil=1.2 |
| E | Forge Vent | Held area cone | kiPerSec=16; range=28; arc=1.2; dps=18; push=44 |
| F | Tempered | Temporary self power-up + healing | cost=24; cd=18; mult=1.5; dur=10; heal=30 |
| SHIFT | Piston Drive | Burst movement | cost=5; cd=0.6; power=94; iframes=0.22 |
| R | Orbital Forge | Targeted falling-projectile barrage | cost=32; cd=18; count=12; interval=0.18; spread=26; radius=3; damage=33; blast=18 |

### TALON

Acrobat Duelist · Grounded · strength 5/10 · base HP 115 · base energy 110.

Raised in a circus, trained by the night. Two sticks, zero fear, unreasonable hang-time.

Authored double-tap evade: {"kind":"leap","name":"Quadruple Somersault","up":44,"fwd":66}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Escrima Cross | Close-range strike | gear=true; cost=8; cd=0.55; damage=18; range=11; arc=0.9; lunge=42; knock=36; launch=8 |
| RMB | Flying Grayson | Multi-hit rush | cost=14; cd=1.8; range=58; hits=7; interval=0.08; damage=8; finisher=30 |
| Q | Wing-Ding Fan | Repeated projectile volley | cost=3; interval=0.1; damage=6; speed=125; radius=0.7; blast=2.6; spread=0.11; arrow=true |
| E | Staff Sweep | Close-range strike | gear=true; cost=10; cd=0.8; damage=24; range=13; arc=1.15; lunge=30; knock=46; launch=12 |
| F | Flow State | Temporary self power-up | cost=20; cd=16; mult=1.45; dur=9 |
| SHIFT | Tumbler | Burst movement | cost=4; cd=0.45; power=102; iframes=0.3 |
| R | Finale Routine | Multi-hit rush | cost=18; cd=12; range=66; hits=9; interval=0.07; damage=8; finisher=34 |

### ABEO

Metal Bodyguard · Grounded · strength 9/10 · base HP 175 · base energy 110.

COF canon: Hand of Uganda LSW bodyguard. Living metal. Stands between the president and everything.

Authored double-tap evade: {"kind":"leap","name":"Iron Bound","up":40,"fwd":58}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Iron Palm | Close-range strike | cost=10; cd=0.8; damage=30; range=12; arc=0.85; lunge=38; knock=56; launch=16 |
| RMB | Shockwave Stomp | Held area cone | kiPerSec=16; range=28; arc=1.3; dps=16; push=54; lift=5 |
| Q | Shrapnel Fist | Traveling projectile with area blast | cost=8; cd=0.6; damage=20; speed=95; radius=1.2; blast=6 |
| E | Guard Break | Close-range strike | cost=12; cd=1.1; damage=26; range=12; arc=0.75; lunge=44; knock=50; launch=14 |
| F | Tempered Oath | Temporary self power-up + healing | cost=22; cd=18; mult=1.45; dur=10; heal=30 |
| SHIFT | Bulwark Rush | Burst movement | cost=5; cd=0.6; power=92; iframes=0.2 |
| R | Foundation Breaker | Charge then release a projectile | cost=8; cd=14; kiPerSec=12; maxCharge=2.2; minR=1.6; maxR=6.6; dmgMin=26; dmgMax=84; maxBlast=34; speedMin=36; speedMax=62; chargePower=3 |

### JELANI

Strength-Speed · Grounded · strength 9/10 · base HP 135 · base energy 115.

COF canon: Hand of Uganda bodyguard. Strength AND speed — the combination treaties were written about.

Authored double-tap evade: {"kind":"sprint","name":"Warpath","mult":1.85,"dur":1.4}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Piston Blow | Close-range strike | cost=9; cd=0.55; damage=26; range=11; arc=0.8; lunge=48; knock=44; launch=10 |
| RMB | Blur Assault | Multi-hit rush | cost=14; cd=1.8; range=60; hits=8; interval=0.07; damage=9; finisher=32 |
| Q | Sonic Wake | Held area cone | kiPerSec=15; range=26; arc=1.2; dps=15; push=46 |
| E | Spear Tackle | Close-range strike | cost=12; cd=1; damage=28; range=13; arc=0.7; lunge=66; knock=56; launch=16; fly=true |
| F | Second Wind | Temporary self power-up + healing | cost=20; cd=16; mult=1.5; dur=9; heal=25 |
| SHIFT | Afterburn | Burst movement | cost=4; cd=0.45; power=112; iframes=0.26; dtype=fire |
| R | A Hundred Hands | Multi-hit rush | cost=18; cd=12; range=68; hits=11; interval=0.05; damage=8; finisher=34 |

### KAMARIA

Phasing Guardian · Levitation · strength 5/10 · base HP 115 · base energy 130.

COF canon: Hand of Uganda bodyguard. Assassins' blades pass through her; hers do not return the courtesy.

Authored double-tap evade: {"kind":"phase","name":"Through the Veil"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Veiled Edge | Close-range strike | cost=9; cd=0.6; damage=23; range=11; arc=0.85; lunge=42; knock=40; launch=8; dmgClass=slash |
| RMB | Untouchable | Intangible state | kiPerSec=17 |
| Q | Veil Step | Teleport movement | cost=11; cd=1.2; range=46 |
| E | Phase Bolt | Homing projectile with area blast | cost=7; cd=0.4; damage=15; speed=105; radius=0.9; blast=4.5; homing=2 |
| F | Half-Here | Temporary self power-up + invulnerability window | cost=22; cd=18; mult=1.4; dur=9; invuln=0.8 |
| SHIFT | Slip Veil | Burst movement | cost=4; cd=0.5; power=100; iframes=0.3 |
| R | Ten Veils | Multi-hit rush | cost=18; cd=12; range=62; hits=8; interval=0.07; damage=9; finisher=32 |

### RAMIRO

Cartel Hunter · Grounded · strength 6/10 · base HP 140 · base energy 100.

COF canon: a heavyset cop in clown makeup who terrorizes the cartels one district at a time. "My son has to go home."

Authored double-tap evade: {"kind":"dash","name":"Lawman's Roll"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Riot Scattergun | Firearm projectile fire | cost=6; interval=0.55; damage=26; speed=140; radius=1.1; blast=6; spread=0.06; recoil=4.5 |
| RMB | Service Revolver | Firearm projectile fire | cost=4; interval=0.3; damage=14; speed=155; radius=0.7; blast=3; spread=0.015; recoil=2 |
| Q | Nightstick | Close-range strike | gear=true; cost=9; cd=0.7; damage=24; range=11; arc=0.9; lunge=36; knock=46; launch=8 |
| E | Gas Canister | Lobbed projectile with area blast | gear=true; cost=9; cd=0.8; damage=12; speed=62; radius=1.4; blast=10; grav=10; payload=gas; canister=true; dtype=toxic |
| F | My Son Goes Home | Temporary self power-up + healing | cost=20; cd=18; mult=1.5; dur=10; heal=35 |
| SHIFT | Duck & Cover | Burst movement | cost=4; cd=0.55; power=92; iframes=0.28 |
| R | Backup Called | Summon combat helpers | cost=26; cd=16; count=3; max=6; duration=13; damage=8; interval=0.6; speed=86 |

### JAWAH MATU

Sound Absorber · Grounded · strength 5/10 · base HP 125 · base energy 135.

COF canon: absorbs sound through exposed skin. Your scream, your gunshot, your charge-up roar — he eats them all and grows stronger.

Authored double-tap evade: {"kind":"phase","name":"Soundless Step"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Absorption Field | Held area cone | kiPerSec=14; range=32; arc=1.15; dps=12; push=8; kiDrain=14 |
| RMB | Dead-Air Palm | Close-range strike | cost=9; cd=0.7; damage=24; range=11; arc=0.85; lunge=40; knock=44; launch=10 |
| Q | Null Wave | Traveling projectile with area blast | cost=7; cd=0.45; damage=15; speed=110; radius=1; blast=5 |
| E | Returned Thunder | Held area cone | kiPerSec=18; range=34; arc=1; dps=24; push=56 |
| F | Stored Decibels | Temporary self power-up | cost=22; cd=16; mult=1.55; dur=9 |
| SHIFT | Hush | Burst movement | cost=4; cd=0.5; power=98; iframes=0.28 |
| R | EVERY SOUND AT ONCE | Charge then release a projectile | cost=8; cd=14; kiPerSec=12; maxCharge=2.3; minR=1.8; maxR=7; dmgMin=26; dmgMax=84; maxBlast=36; speedMin=36; speedMax=60; chargePower=3 |

### MOSES APIO

Symbiont Host · Limited flight · strength 7/10 · base HP 140 · base energy 125.

COF canon: a young Mbarara mechanic bonded to the Atlas Protocol symbiont — it watches, it regenerates, it reaches.

Authored double-tap evade: {"kind":"phase","name":"Symbiont Shift"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Atlas Tendrils | Reach, seize and throw | cost=16; cd=4.5; range=34; holdT=0.55; damage=14; throwSpeed=88 |
| RMB | Symbiont Fist | Close-range strike | cost=10; cd=0.8; damage=25; range=12; arc=0.85; lunge=44; knock=46; launch=12 |
| Q | Protocol Surge | Multi-hit rush | cost=14; cd=2; range=56; hits=6; interval=0.09; damage=9; finisher=30 |
| E | Bio Spike | Homing projectile with area blast | cost=7; cd=0.4; damage=15; speed=100; radius=1; blast=5; homing=2 |
| F | Regenerative Bond | Temporary self power-up + healing | cost=20; cd=16; mult=1.35; dur=9; heal=45 |
| SHIFT | Adaptive Slip | Burst movement | cost=4; cd=0.5; power=98; iframes=0.26 |
| R | FULL BOND | Temporary self power-up + healing | cost=28; cd=20; mult=1.7; dur=10; heal=35 |

### DUNE

Sand Shaper · Grounded · strength 6/10 · base HP 130 · base energy 130.

Original: every grain within a mile answers to him. Walls, fists, storms — the desert is a toolbox.

Authored double-tap evade: {"kind":"slide","name":"Dune Surf","slideT":0.65,"power":126}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Sandblast | Held area cone | kiPerSec=17; range=32; arc=1.1; dps=20; push=30 |
| RMB | Sand Rampart | Create a construct: wall | cost=12; cd=6; construct=wall; duration=9; holdTrigger=true |
| Q | Fist of the Waste | Lobbed projectile with area blast | cost=9; cd=0.6; damage=22; speed=66; radius=1.7; blast=10; grav=9; shock=true |
| E | Dust Sentry | Create a construct: turret | cost=15; cd=8; construct=turret; duration=12 |
| F | Hardpack | Temporary self power-up + healing | cost=22; cd=18; mult=1.45; dur=10; heal=25 |
| SHIFT | Grain Drift | Burst movement | cost=4; cd=0.55; power=96; iframes=0.26 |
| R | SANDSTORM | Targeted falling-projectile barrage | cost=32; cd=18; count=13; interval=0.17; spread=28; radius=3; damage=31; blast=17 |

### GRAVEN

Gravity Controller · Levitation · strength 6/10 · base HP 130 · base energy 140.

Original: gravity is his native language. He levitates because falling is optional — and his wells swallow the battlefield.

Authored double-tap evade: {"kind":"blink","name":"Mass Shift","range":22}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Gravity Shear | Held area cone | kiPerSec=17; range=32; arc=1.1; dps=16; push=44; lift=8 |
| RMB | Event Well | Charge and throw a growing orb | cost=18; cd=12; minR=3.5; maxR=15; growRate=9; kiPerSec=15 |
| Q | Dense Star | Lobbed projectile with area blast | cost=9; cd=0.6; damage=22; speed=58; radius=1.8; blast=11; grav=9; shock=true |
| E | Displacement | Teleport movement | cost=11; cd=1.3; range=48 |
| F | Zero-G Field | Temporary self power-up | cost=24; cd=18; mult=1.5; dur=10 |
| SHIFT | Slingshot | Burst movement | cost=5; cd=0.55; power=100; iframes=0.24 |
| R | SINGULARITY SEED | Charge then release a projectile | cost=10; cd=15; kiPerSec=13; maxCharge=2.4; minR=2; maxR=7.5; dmgMin=28; dmgMax=92; maxBlast=40; speedMin=32; speedMax=56; chargePower=3.3 |

### BULWARK

Fortress · Grounded · strength 9/10 · base HP 195 · base energy 120.

Original: a one-man fortification. His barrier covers a squad, his walls rewrite the map, and he does not move unless he chooses to.

Authored double-tap evade: {"kind":"dash","name":"Groundbreak","power":88}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Rampart Fist | Close-range strike | cost=10; cd=0.85; damage=30; range=12; arc=0.85; lunge=34; knock=54; launch=16 |
| RMB | Bastion Wall | Create a construct: wall | cost=11; cd=5; construct=wall; duration=10; holdTrigger=true |
| Q | Repulse Field | Held area cone | kiPerSec=16; range=28; arc=1.3; dps=15; push=56 |
| E | Watchtower | Create a construct: turret | cost=16; cd=8; construct=turret; duration=12 |
| F | Hold the Line | Temporary self power-up + healing | cost=22; cd=18; mult=1.4; dur=11; heal=35 |
| SHIFT | Advance | Burst movement | cost=5; cd=0.65; power=88; iframes=0.2 |
| R | SIEGE END | Charge then release a projectile | cost=8; cd=14; kiPerSec=12; maxCharge=2.3; minR=1.8; maxR=7; dmgMin=26; dmgMax=86; maxBlast=36; speedMin=34; speedMax=58; chargePower=3 |

### FERAL

Beast Rusher · Grounded · strength 7/10 · base HP 145 · base energy 110.

Original: they made him a weapon; the wild took him back. Claws, hide like barbed wire, and a roar that moves crowds.

Authored double-tap evade: {"kind":"leap","name":"Pounce","up":46,"fwd":72}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Rend | Close-range strike | cost=8; cd=0.5; damage=22; range=11; arc=0.9; lunge=46; knock=36; launch=8; dmgClass=slash |
| RMB | Pack Hunt | Multi-hit rush | cost=14; cd=1.8; range=58; hits=7; interval=0.08; damage=9; finisher=32 |
| Q | Apex Roar | Held area cone | kiPerSec=16; range=30; arc=1.2; dps=16; push=52 |
| E | Savage Lunge | Close-range strike | cost=12; cd=1; damage=27; range=13; arc=0.75; lunge=64; knock=50; launch=14; fly=true; dmgClass=slash |
| F | Blood Frenzy | Temporary self power-up + healing | cost=22; cd=16; mult=1.6; dur=9; heal=20 |
| SHIFT | Predator Weave | Burst movement | cost=4; cd=0.45; power=106; iframes=0.26 |
| R | NO CAGES | Multi-hit rush | cost=18; cd=12; range=66; hits=10; interval=0.06; damage=8; finisher=24; dmgClass=slash |

### BREACH

Military / Shield Breacher · Grounded · strength 4/10 · base HP 135 · base energy 100.

[PROPOSED] An armored entry specialist. Flechettes control close range, a concussive launcher opens space, and the shield holds a frontal line. Flank or grab the shield; make the shotgun chase you.

Authored double-tap evade: {"kind":"dash","name":"Entry Roll"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Breach Shotgun | Firearm projectile fire | weapon=shotgun; voice=shotgun12; gear=true; cost=8; interval=0.78; damage=7; pellets=7; speed=155; radius=0.5; blast=1.5; spread=0.15; recoil=5 |
| RMB | Concussion Launcher | Lobbed projectile with area blast | gear=true; cost=14; cd=1.5; damage=23; speed=85; radius=1.1; blast=12; grav=8; shock=true; canister=true |
| Q | Shield Check | Close-range strike | gear=true; cost=8; cd=1.2; damage=14; range=9; arc=0.85; lunge=26; knock=37; launch=3 |
| E | Entry Charge | Proximity explosive | gear=true; cost=14; cd=3; damage=25; blast=12; trigger=8; duration=20 |
| F | Field Dressing | Temporary self power-up + healing | gear=true; cost=20; cd=20; mult=1; dur=3; heal=26 |
| SHIFT | Entry Roll | Burst movement | cost=5; cd=0.8; power=84; iframes=0.23 |
| R | Demolition Round | Traveling projectile with area blast | gear=true; cost=30; cd=12; damage=42; speed=75; radius=1.4; blast=18; shock=true; canister=true |

### RECON

Military / Rifle Scout · Grounded · strength 3/10 · base HP 110 · base energy 115.

[PROPOSED] A mobile rifle scout. Fast blaster fire, a charged sidearm and a deliberate marksman shot reward clean aim. Jump jets buy brief altitude, not permanent flight; a close fighter can overwhelm the light armor.

Authored double-tap evade: {"kind":"dash","name":"Scout Roll"}. Separate from equipped Shift power.

| Data slot | Power | Delivery / effect family | Authored settings |
|---|---|---|---|
| LMB | Scout Blaster | Firearm projectile fire | weapon=rifle; voice=ar556; gear=true; cost=2; interval=0.13; damage=6; speed=205; radius=0.45; blast=1.5; spread=0.03; recoil=1.4 |
| RMB | Charged Sidearm | Charge then release a projectile | gear=true; cost=4; cd=0.65; kiPerSec=9; maxCharge=1.3; minR=0.55; maxR=1.7; dmgMin=10; dmgMax=32; maxBlast=7; speedMin=130; speedMax=180; chargePower=1.7 |
| Q | Scoped Marksman Rifle | Firearm projectile fire | weapon=rifle; voice=sniper762; gear=true; cost=0; magazine=5; reserveAmmo=30; reloadTime=2.6; scopeZoom=4; life=3; interval=1.2; damage=31; speed=320; radius=0.45; blast=0; spread=0.0015; recoil=3.6 |
| E | Scout Grenade | Lobbed projectile with area blast | gear=true; cost=10; cd=1.2; damage=23; speed=58; radius=1.1; blast=12; grav=11; shock=true; canister=true |
| F | Trauma Patch | Temporary self power-up + healing | gear=true; cost=20; cd=20; mult=1; dur=3; heal=22 |
| SHIFT | Scout Roll | Burst movement | cost=5; cd=0.7; power=92; iframes=0.23 |
| R | Anti-Armor Rocket | Traveling projectile with area blast | gear=true; cost=30; cd=12; damage=39; speed=100; radius=1.1; blast=15; shock=true; canister=true |

## Selection-screen contract

- All 55 faces, searchable by name and filterable by movement and actual equipped mechanics.
- Large selected character, authored role, full/limited/no flight, strength and lift capability; no unlabeled heuristic stat as a measured outcome.
- Every equipped power: effect, resource, range semantics, charge/hold behavior, and what differentiates it from the selected comparison character.
- Show equipment alternatives separately from default powers, not as missing characters.
- Hero-specific field-footage TV behind/beside the selected hero: reuse existing bounded frame playback. Store actor/target IDs at capture; do not infer identity from clip title. No matching footage means an honest empty state with a practice action, not another hero's highlights.
- Existing recordings are silent and session-only; persistence is a separate feature.
- Keep verification badges in the audit/harness. Do not confuse unverified with unavailable or silently hide 52 characters.

## Repetition findings (counts, not automatic removal decisions)

- dash: 54 equipped slots.
- buff: 50 equipped slots.
- projectile: 43 equipped slots.
- melee: 41 equipped slots.
- cone: 36 equipped slots.
- charge: 25 equipped slots.
- beam: 24 equipped slots.
- rush: 17 equipped slots.
- rifle: 17 equipped slots.
- construct: 14 equipped slots.
- volley: 13 equipped slots.
- teleport: 10 equipped slots.
- meteor: 9 equipped slots.
- tentacle: 5 equipped slots.
- growingorb: 4 equipped slots.
- summon: 4 equipped slots.
- phase: 4 equipped slots.
- nova: 2 equipped slots.
- grapple: 2 equipped slots.
- mine: 2 equipped slots.
- lifedrain: 1 equipped slots.
- portal: 1 equipped slots.
- bow: 1 equipped slots.
- quiver: 1 equipped slots.
- facebomb: 1 equipped slots.
- mindcontrol: 1 equipped slots.

54 dash-type slots, 50 buffs and 17 rushes are a clear identity-review workload. Shared delivery code is desirable; repeated tactical purpose inside a kit is the problem. Do not remove defaults across the roster on counts alone. Preserve alternatives and review each kit's target, timing, range, resource tradeoff and counterplay.
