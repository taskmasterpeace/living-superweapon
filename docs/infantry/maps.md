# INFANTRY ONLINE — MAPS, ZONES AND WORLD STRUCTURE

Research file for **War World** (`D:/git/ShootEM`) — the base builder and interior combat design.

**How to read this.** Every section is tagged:

- **CONFIRMED** — I read it out of the game's own shipped files, the open-sourced server, or a primary
  document that shipped inside a zone. Where I state a number I got it by parsing the actual binary.
- **LIKELY** — one good secondary source, or a defensible inference from confirmed data. Named as such.
- **UNVERIFIED** — community/fan memory, a single search-result snippet, or my reasoning. Treat as a lead.

**The two source bodies that carry most of this file** (both are the real thing, not fan writeups):

- `github.com/InfantryOnline/Infantry-Online-Server` — the open-sourced FreeInfantry server emulator.
  It contains `Docs/Lio/*.txt` (the level-object format documentation), `dotnetcore/Assets/**` (parsers
  for the level, vehicle, item and config formats), and the arena logic.
- `github.com/InfantryOnline/Zone-Assets` — **92 complete playable zones** plus **139 more** in an
  "Incompatible Zone Archives" folder: real `.lvl` maps, `.lio` object files, `.cfg` zone configs,
  `.veh` vehicle files, and in some cases the in-game help text the zone shipped with.
  *(Counts obtained via the GitHub contents API on the repo, 2026-07-27.)*

I decompressed and parsed real map files for this document. Numbers marked "measured" came out of that.

---

## 0. THE ONE-PARAGRAPH ORIENTATION

**CONFIRMED.** Infantry is a **2-D square-tile game with a 3/4-overhead sprite art style**, not a true
isometric diamond grid. The level file is a plain row-major array of `Width × Height` square tiles
(`dotnetcore/Assets/Lvl/LvlInfo.cs`). The *art* is drawn with the vertical axis compressed — the server's
turret lead-aim math contains the line
`double x_2 = (target.positionY - state.positionY) / 0.7d;  //The Y coordinates are smaller than x, hence 0.7`
(`dotnetcore/ZoneServer/Protocol/Helpers/Math.cs`), i.e. the engine explicitly corrects a **0.7× squash on
one axis** before computing an angle. A contemporary review describes it as "an overhead perspective
similar to Diablo" ([GameVortex review of Infantry Online](https://www.gamevortex.com/gamevortex/soft_rev.php/758/infantry-online-pc.html)).
Marketing called it "isometric"; structurally it is top-down square tiles with a squashed camera.
**For War World this matters: the level data model is a grid, not a diamond. You can build the same
world in 3-D with a top-down camera and lose nothing.**

---

## 1. ZONES

**Status: CONFIRMED for the archived corpus and the per-zone numbers; LIKELY for the SOE-era descriptions.**

"Zone" in Infantry means an entire persistent game world: its own map, its own weapon/item table, its own
classes, its own rules. A zone is a folder of files (`.cfg` `.lvl` `.lio` `.veh` `.itm` `.rpg` `.blo` `.lvb`
`.nws` + scripts) handed to a zone server process. A zone contains one or more **arenas** — instances of
that world; the config has `NamedArena0`–`NamedArena19` sections and per-arena `MaxPlayers`
(measured in `Twin Peaks Modern/assets/ctfpl.cfg`).

### 1a. Hard numbers, straight out of the shipped configs

All figures below were read from `[Arena]` in each zone's own `.cfg` in the Zone-Assets repo.
`FrequencyMax` = number of teams allowed. `MaxPerFrequency` = cap per team. `PlayingMax` = players actually
in the fight. `MaxPlayers` = total connected including spectators.

| Zone (folder) | Map file | Map size (tiles) | Teams | Per team | Playing max | Total |
|---|---|---|---|---|---|---|
| `ctf1` Twin Peaks (classic) | `twinpeak.lvl` | **868 × 647** | 2 | 14 | 28 | 250 |
| `ctf2` Heinrich's Point | `hpoint.lvl` | **849 × 692** | **3** | 16 | 48 | 200 |
| `ctfx` Elite CTF / "Extreme" | `EliteCTF.lvl` | **1489 × 964** | 9999 | 10 | 100 | 250 |
| `ctftpx` Twin Peak X | `TwinPeakX.lvl` | 868 × 727 | — | — | — | — |
| `Twin Peaks Modern` (CTFPL) | `ctfpl2016.lvl` | **1611 × 2048** | 2 | 7 | 100 | 350 |
| `eolclassic` Eol | `eolclassic.lvl` | **1400 × 749** | 9999 | 6 | **150** | 250 |
| `fleet` Alpha Tango | `AlphaTango.lvl` | **1728 × 1222** | 2 | **50** | 100 | 200 |
| `frontlines` River City | `rivercity.lvl` | 555 × 348 | 2 | 20 | 40 | 250 |
| `skirmish5` | `skirmish5.lvl` | — | 2 | 16 | 60 | 100 |
| `groundcontrol` | `elitectf.veh` | — | 9999 (5 desired) | 14 | 125 | 250 |
| `killzone` | — | — | 1000 | 40 | 80 | 250 |
| `mech` | — | — | 2 | 50 | 100 | 250 |
| `BugHunt` | `asteroid.lvl` | **1046 × 1031** | 2 | 15 | 40 | 250 |
| `Ios Landing` | `ioslanding.lvl` | **2052 × 520** | 100 | 12 | 100 | 300 |
| `TDM` | `death.lvl` | 400 × 400 | — | — | — | — |
| `ctf5` Victory City | `victorycity.lvl` | 617 × 910 | — | — | — | — |
| `ctf4` Harun | `harun.lvl` | 809 × 565 | — | — | — | — |
| `football` | `football1sm.lvl` | 660 × 289 | — | — | — | — |

Cross-check worth noting: the encyclopedia description of CTF map rotation — "a two-team Twin Peaks, a
three-team Heinreich's Point, and a multiple-team 'Extreme'" ([en-academic mirror of the Wikipedia
article](https://en-academic.com/dic.nsf/enwiki/412488)) — **exactly matches** the shipped configs above
(ctf1 = 2 freqs, ctf2 = 3 freqs, ctfx = unlimited freqs). That is two independent sources agreeing, so the
zone descriptions in §1b are more trustworthy than a single fan wiki would normally be.

### 1b. The zone roster as SOE and the community described it

Two independently-fetched encyclopedia mirrors. Descriptions quoted verbatim.

From [Academic Kids](https://academickids.com/encyclopedia/index.php/Infantry_(computer_game)) (an old
Wikipedia mirror; this list reads as the earlier SOE-era one):

- **Capture the Flag** — "Fast-paced basing action. The most popular zone."
- **RPG** — "Role-playing. Player vs. Player action."
- **Fleet** — "Real time strategy action. Massive spaceship battles in asteroid fields."
- **Bug Hunt** — "Marine vs. alien arachnid fighting. Marines are slow-moving and have long-range weapons, bugs are just the opposite."
- **Skirmish** — "Massive team vs. team fighting. Several variants exist. Some include tanks and other vehicles. **Most employ static flags for territory holding.**"
- **Gravball** — "Sport zone. Players play on a large map with various obstacles. Hardest zone in the game."
- **Boom Ball X** — "Sport zone. Players play on a small, hockey-like arena and are restricted to either to aft, mid or fore sections of the field."
- **Ambush** — "Fast-paced action. Players use jetpacks or hoverboards to fly around collecting flags and blowing up other players."
- **Team Deathmatch** — "Fast-paced action. Players use multitudes of weapons against eachother in tight corridors."
- **TankODrome** — "Arcade-style play. Players drive tanks, launch projectiles at other players and computer turrets to collect tokens."

From [en-academic](https://en-academic.com/dic.nsf/enwiki/412488) (later revision, adds these):

- **Chambert's Moon** — King-of-the-Hill, distinct classes/weapons/physics, small teams, alien *Skrall* enemies, vehicles.
- **Chambert's Tournament** — Free Infantry variant with its own classes, weapons, vehicles and a separate map.
- **I:RPG:Eol** — Infantry's action/RPG project.
- **Combined Arms** — "Large-scale warzone with an exhaustive set of weapons, classes and vehicles."
- **Fleet** — "Team-oriented space action. **The main goal of this game is to destroy your enemies Command Post.**"

Current live roster from [freeinfantry.com](https://www.freeinfantry.com/) (fetched 2026-07-27), verbatim:

- **Twin Peaks (CTF)** — "Experience a cornerstone of Infantry-based gameplay in this highly tactical, base-defense driven zone." Titan Militia vs Collective Military.
- **Fleet** — "Two space colonies battle for territory in one of FreeInfantry's biggest zones." Board multi-player ships, harvest supplies, build frigates, assault the enemy mothership.
- **Eol: Reforged** — Collective Military and Titan Militia vs aliens on **Old Heinrich's Point**; KOTH and CTF.
- **Eol: Pioneer Station** — Battle Royale with AI bots and a shrinking play area.
- **Io's Landing** — "Side-scrolling shooting mania, Infantry style!" Co-op RPG; fight through AI soldiers and mechs, capture positions.
- **Bug Hunt: Extermination** — defend scientists against AI aliens at research facility *Saturnalia*.
- **Cage Brawl** — 3v3 update of the classic Soccer Brawl zone.
- **Skirmish (SK)** and **Frontlines** — "player-made game arenas with skirmish-style bloodbath gameplay."
- **Zombie Zone** — survive against computer-controlled AI.

**⚠ "Gravitron" is not a zone.** The Twin Peaks in-game engineer guide lists *Gravitron* as a **weapon**
("Use this for moderate energy drain, and knocking JT rushers away from your flag room" —
`Twin Peaks Modern/assets/engyguide.txt`). The sport zone is **Gravball** / **GravBall League (IGBL)**;
the archive contains ~20 `gb_*` and `igbl_*` zone folders, which are individual league match maps.

### 1c. The archived corpus (CONFIRMED)

92 complete zone folders survive, plus 139 more that no longer load cleanly. Complete list:

```
BoomBallX BugHunt GB_GvN_Kuja GB_LvC_Turtle GB_avp_hw GB_nvs_krono IGBL_IvO_Krono
Ios Landing SKBoardingAction TDM TDMRunning TitanRally Twin Peaks Modern bmctf
chaosJ chaosJ2 chaosadvanced chaosineol cmtest crbl ctf1 ctf2 ctf4 ctf5 ctfalioth
ctfpl ctftpx ctfx ctfx2 eolclassic eolrpg fleet fleet2 football frontlines gb_bounce
gb_dvs2 gb_fvr gb_jvl gb_svd_krono gb_zvh gbavd gbavr gbblitz gbexhibitionwk1
gbexhibitionwk4 gbkvn gbnvs gbx gravball_tactics groundcontrol hardcorps2ba
hardcorps2t hardcorpsex hcassault hcboardingaction hccaverns hctwinpeak hctwinpeak-a
igbl_dvs igbl_jvl igbl_kvn_w igbl_pvk igbl_svd igblallstarweek kf killzone mayhem
mech msl sfctf skassault skbokr skcaverns skec skirmish4 skirmish5 sklavastation
sknomansland sksut sktb sniperschool soccer2 soccer3e soccer4 soccer5 soccermockup
sub sut usl usldome zzv2old
```

Note the naming: `sk*` = Skirmish maps (BoardingAction, Caverns, LavaStation, NoMansLand, Assault, SUT,
TB, BOKR, EC), `hc*` = Hard Corps, `gb*`/`igbl*` = GravBall league. **A "zone" in practice was often
one map**; the Skirmish and GravBall "zones" are really families of maps sharing a ruleset.

---

## 2. BASE AND FACILITY STRUCTURE — the important section

### 2.0 The single biggest structural fact

**CONFIRMED, and it is the thing to take away.**

**An Infantry map is not one continuous world. It is a single flat tile sheet containing several
DISCONNECTED spaces, stitched together by teleports.** The surface battlefield, the cave system, every
building interior, and each team's dropship all live in the same rectangle at different coordinates,
separated by solid rock, and you travel between them through warps, portals and lifts — never by walking.

Evidence, three ways:

1. **The radar image.** `ctf1/twinpeak.png` is 868 × 647 pixels and the map is 868 × 647 tiles — **1 pixel
   per tile**, so the radar image *is* the map. Looking at it: the top-left quadrant is an outdoor city
   grid of streets and blocks; the top-right quadrant is an organic cave network; and the entire bottom
   third is a **row of separate, sealed, rectangular and octagonal room complexes** plus two large
   ship-shaped interiors, one green and one red.
2. **The tile data.** I decompressed `twinpeak.lvl` and located terrain-type 1 ("Titan DropShip") and
   terrain-type 2 ("Collective DropShip"): both are **114 × 37 tiles**, at x 609–722, y 444–480 and
   y 598–634 respectively — those are the green and red ships at the bottom-right of the radar image.
   Rendering the tiles around them shows them **entirely walled in on every side**. You cannot walk out
   of a dropship.
3. **The object file.** `ctf1/twinpeak.lio` contains **40 warps and 34 portals** for a map with only
   4 flags. The warp named `Titan Start` sits at world (10720, 7360) = tile (670, 460) — dead centre of
   the sealed Titan dropship. Warp groups named `LightLift1…8`, `HeavyLift1…2`, `LightLiftDown1…8` come in
   pairs and move you between map regions; the config has a dedicated terrain type named **"Lift Area"**.

**This is how a 2-D engine with no vertical dimension got building interiors, multi-storey structures,
caves and vehicle interiors.** Nothing folds over anything. You are always on one flat plane; you just get
moved to a different part of it.

### 2.1 The anatomy of a base (CONFIRMED — measured from `twinpeak.lvl`)

Here is a real Twin Peaks surface base, rendered from the decompressed physics + terrain layers.
`#` = full-height wall, `o` = **low** wall (see over, cannot walk through), `.` = interior floor
(terrain "Building/Cave Interior"), space = open ground. One character = 2 tiles wide × 3 tiles tall.

```
 297 |#o   #####################################
 300 |#o   #####################################.......###############################
 303 |#o   #####..........................######.......###############################
 306 |#o   ####............................#####............          ....############
 309 |#o   ####........#..........##.......######...........          ......##########
 315 |#o   ####............................######...........          ........########
 318 |#o   ####.......#.#........#..#......######...........          ........########
 321 |#o   ####.......###........###.......#####............          ........########
 324 |#o   ####.......###........###.......#####...........###................########
 327 |#o   ####.....#####........#####.....###########.....###................########
 330 |#o   ####........# ##########........#####..............................########
 333 |#o   ####........############........###########........................########
 336 |#o   ####.......###...##....##.......#####..................ooo...oo....########
 342 |#o   ####............................#####..............................########
 345 |#o   ####.............................###....................o....oo....########
 351 |#o   ####...........................................#..................#########
 357 |#o   ####...........................................#...............############
 360 |#o   ##########....#############################################################
 363 |#o   ##########....#############################################################
```

Read off it:

- **The compound is ~150 tiles wide × ~68 tiles tall** (x ≈ 10–160, y ≈ 297–365).
- **Outer walls are ~8 tiles thick.** They are not a line; they are mass.
- **There is exactly one ground entrance** — the 6–8 tile gap in the south wall at y ≈ 360, x ≈ 30–36 —
  plus one opening in the north wall into the right-hand hall. **Two ways in, both narrow.** That is the
  choke point the whole defence is built around.
- **The interior is two big halls divided by an internal spine wall** at x ≈ 74–83, connected by a doorway.
  Left hall ≈ 55 × 54 tiles; right hall ≈ 56 × 55 tiles.
- **The left hall is furnished with free-standing wall blocks** (`###` clusters, ~6 × 6 tiles each) that
  create internal cover and sub-rooms. These are not rooms with doors — they are pillars and stubs you
  fight around.
- **The right hall is mostly open floor with scattered LOW walls** (`o` clusters, 3–6 tiles) as
  shoot-over cover.
- Outside the base to the south and east is a large field of low wall (`o`) — broken ground.

A **detached interior cell** (one of the sealed rooms in the bottom strip) measures **~66 × 76 tiles**,
one large chamber with a smaller pillared sub-room, fully enclosed, reachable only by warp.

Statistically, across all "Building/Cave Interior" terrain in Twin Peaks, horizontal open spans measured:
**~14 tiles median**, with a strong band at 7–20 tiles and a tail to 40–70 for the big halls. Only ~14% of
spans are 4 tiles or narrower. **Infantry interiors are roomy, not corridor-tight** — the tight feeling
comes from the *entrances*, not the rooms.

### 2.2 What facilities existed, and what each one did

**CONFIRMED.** There are three completely different mechanisms, and it is important not to blur them.

#### (a) Terrain-as-facility — the room *is* the building

The `.cfg` defines **exactly 16 terrain types** (`Terrain0`–`Terrain15`), and the map's per-tile terrain
byte selects one. Each terrain type carries a big property block
(`dotnetcore/Assets/Cfg/CfgInfo.Terrain.cs`). The properties that matter:

| Property | Effect |
|---|---|
| `Message` | Text shown when you walk in ("DropShip (Home)") |
| `StoreEnabled` | **You may open the shop here (F10)** |
| `SkillEnabled` | **You may change class here (F11)** |
| `TeamChangeEnabled` | You may switch team here |
| `EnergyRate` / `HealthRate` / `RepairRate` | Per-tick regen (or damage, if negative) |
| `Safety` | No-damage zone |
| `RepelVehicle` / `RepelWeapons` | Pushes vehicles / weapons out |
| `MaxTimeAllowed` | **Kicks you out after N seconds — anti-camping** |
| `TrickleKill` | Continuous damage |
| `SoccerEnabled`, `GoalPoints`, `GoalFrequency` | Sports goals |
| `StripShadows`, `Starfield`, `FontColor` | Presentation |
| `PrizeExpire`, `PrizeEnableMode`, `PrizeBountyMultiplier` | How long dropped loot lives here |
| `AllowQuitting`, `AllowGoToSpec`, `AllowChangeArena` + delays | Whether you can leave from here |

**The armoury is not an object. It is a floor.** The Twin Peaks armoury/spawn is
`Terrain1 = "DropShip (Home)"` with `StoreEnabled=1 SkillEnabled=1 EnergyRate=999 HealthRate=30
RepairRate=30 MaxTimeAllowed=300`. You buy, re-class and heal by *standing on the right tiles*, and after
**300 seconds** the game throws you out so you cannot camp your own shop.

Real terrain tables from two zones, verbatim from their `Message=` fields:

**Twin Peaks / CTFPL** (`Twin Peaks Modern/assets/ctfpl.cfg`):
`0` (open ground) · `1` **DropShip (Home)** · `2` **DropShip (Away)** · `3` Private Teams Enabled ·
`4` **Raiders Spawn/Store Zone** · `5` **Building/Cave Interior** · `6` **Lava**
(`TrickleKill=1, EnergyRate=-20, HealthRate=-20, RepairRate=-20`) · `7` **Lift Area** · `8` (store+skill) ·
`9` **PubArea Building/Cave** · `10`–`13` (skill-enabled variants) ·
`14` **"Switch area. (Eats ammo drops)"** · `15` **Gladiators Duel Area**.

**Frontlines** (`frontlines/frontlines.cfg`) — a far more modern, architectural set:
`6` **Carrier [F10/F11 Enabled]** · `7` **Outdoors** · `8` **Mountains** · `9` **Barracks** ·
`10` **Trench** · `11` **Drop Zone** · `12` **Roadway** · `13` **Water** · `14` **Indoors** ·
`15` **Alleyway**.

#### (b) LIO objects — the fixtures bolted into the level

The `.lio` file is a flat CSV of level objects. There are **exactly ten types**
(`Docs/Lio/LioTypes.txt`): `1 Door · 2 Switch · 3 Flag · 4 Warp · 5 Hide · 6 Portal · 7 Sound ·
8 Text · 9 Parallax · 10 Nested`.

Measured object counts in real maps:

| Map | Doors | Switches | Flags | Warps | Portals | Hides |
|---|---|---|---|---|---|---|
| Twin Peaks (classic) `twinpeak.lio` | **69** | 9 | 4 | 40 | 34 | 12 |
| Twin Peaks Modern `ctfpl3.lio` | **269** | 49 | 11 | 169 | 104 | 88 |
| Elite CTF `CTFX.lio` | 65 | 26 | 4 | 16 | 6 | 20 |
| Eol Classic `eolclassic.lio` | **0** | 0 | 0 | 10 | 1 | 17 |
| Fleet `Fleet.lio` | **0** | 0 | 0 | 4 | 0 | 10 |

Note the spread: **Eol and Fleet have no doors at all** — their structure is pure wall geometry and,
in Fleet's case, player-built. Twin Peaks Modern has 269. Doors are a *choice*, not a requirement.

**DOOR** (`Docs/Lio/Doors.txt`) — a door has its own **physics footprint** separate from its graphic
(`Relative Physics Tile X/Y`, `Physics Width`, `Physics Height`), an `Initial State`, an `Inverse State`
(so a linked pair opens in opposition — an **airlock**), a **`Linked Door ID`**, an `Open Odds`, an
`Animation Time`, and separate open/close sounds. Measured in Twin Peaks Modern: doors are typically a
**2 × 2 tile** physics block.

**SWITCH** (`Docs/Lio/Switch.txt`) — this is the base's control system, and it is richer than you'd guess.
A switch names **up to 16 LIO IDs** to toggle, plus:
- `Switch Delay`, `Auto Close Delay`
- `Ammo ID` + `Use Ammo Amount` — **a switch can cost ammunition**
- `Use Energy Amount` — **or energy**
- `Skill Logic` — a boolean expression over classes/skills: *only an Engineer may open this*
- `Frequency` — team gate: *only our team may open this*
- and six explicit precedence flags: `Ammo Overrides Logic`, `Frequency Overrides Ammo`,
  `Logic Overrides Frequency`, etc. — so the designer decides which gate wins.

Measured examples from `ctfpl3.lio`: switches named `LiftControl1`…`LiftControl9` each toggle **4–6 door
IDs at once** with `Auto Close Delay = 450`; one named `LoadingDoorControl` toggles a single door. **A
switch operates a group of doors — a bulkhead, not a door.**

**FLAG** (`Docs/Lio/Flags.txt`) — the richest object in the format. Beyond the obvious (`Flag Carriable`,
`Drop Delay`, `Drop Radius`, `Pickup Delay`, `Transfer Mode`, `Periodic Points/Experience/Cash Reward`),
a flag carries:
- **`Turret Group ID`** — **capturing the flag flips a whole group of turrets to your side.**
- **A held-flag aura**: `Flag Owner Special Radius / Heal Rate / Energy Rate / Repair Rate / Shield Percent`,
  and a *separate* set of the same five for **non**-owners. A flag is a **field hospital and a shield
  generator** for whoever holds it, and can be a debuff for whoever doesn't.
- **16 `Flag Droppable Terrain` booleans** — you cannot drop the flag in lava, or in the enemy shop.
- Six independent visibility switches (friendly-owned / enemy-owned / unowned × player / spectator) and
  three line-of-sight switches. **Whether the enemy can see your flag through fog is per-flag data.**
- `Min/Max Player Count` — flags appear and disappear with population.

**HIDE** (`Docs/Lio/Hides.txt`) — the spawner. Defines an area that periodically produces something:
`Initial Count`, `Attempt Delay`, `Succeed Delay`, `Probability`, `Min/Max Players`,
`Min/Max Player Distance` (**won't spawn while someone is watching**), `MaxType In Area`,
`Max Type In Level`, `Hide ID` + `Hide Quantity`, **`Hide Turret Group`**, `Clump Radius` + `Clump
Quantity`, `Announce` string, and an `Rts State Number`.

This is the **resource node**. Measured in `ctfx`/`eolclassic`: hides named **`Pandora 1–4`**
(384–448 unit areas, 4 initial, qty 1), **`Tsolvy 1–4`** (qty 2), **`Titanium 1`** (600-unit area, qty 3).
In `fleet`: `Minerals1/2/3` over huge areas (1500 × 1000 and 3000 × 1500 units) plus
`MeteorStorm1/2` and two 5000 × 250 strips named `Command Sat Red` / `Command Sat Green` — **the legal
placement zones for each team's command post.**

**PORTAL** (`Docs/Lio/Portals.txt`) — teleport into a `Destination Warp Group`, with `Skill Logic`
(class gate), `Reuse Delay`, `Damage Ignore Time` (i-frames on arrival) and a `Gravity` value.
**WARP** (`Docs/Lio/Warps.txt`) — a destination area belonging to a `Warp Group`, with `Warp Mode`,
`Min/Max Player Count` and `Min/Max Players In Area` — **a spawn point that refuses to be used if it is
already crowded**, which is how you stop spawn-stacking without any code.

Measured warp groups in Twin Peaks: `Titan Start`, `Collective Start`, `Titan Start2/3`,
`Collective2/3` (all group 2 — the dropship exits) and **`Titan LZa/b/c/d` and `Collective LZa/b/c/d`**
— four **landing zones** per team, each a strip **25 × 125 tiles**, positioned on that team's side of the
surface map. That is the "drop from the ship onto the map" step.

#### (c) Computer vehicles — the buildings

**CONFIRMED.** Anything with hit points that sits on the ground and shoots or produces is a **vehicle of
type `Computer`** (`Types.Computer = 5`, `dotnetcore/Assets/Veh/VehInfo.cs`). Its fields
(`VehInfo.Computer.cs`) tell you exactly what a "building" was:

`RotateSpeed`, `AngleStart`, `AngleLength` (**firing arc**), `TrackingTime`, `TrackingRadius`,
`TrackingWeightLow/High`, **`FireRadius`**, **`RepairRate`**, **`HitpointsRequiredToOperate`** (a damaged
building stops working before it dies), `RandomizeAim`, **`ObeyLos`** (does it respect fog of war?),
`ComputerEnergyMax/Rate`, **`Destroyable`**, and a full **density/placement rule set**:
`DensityRadius`, `DensityMaxType`, `DensityMaxActive`, `DensityMaxInactive`,
`MaxTypeByPlayerRegardlessOfTeam`, `FrequencyMaxType/Active/Inactive`,
`FrequencyDensityMaxType/Active/Inactive`.

And critically:

- **`ChainedTurretRequiredForBuilding`, `ChainedTurretRequiredForOperation`, `ChainedTurretId`,
  `ChainedTurretRadius`, `NumChainedTurretsRequired`** — **an adjacency/power rule.** A building can
  require *N of turret type X within radius R* before it may be built, and separately before it may
  operate. This is a power grid / supply-chain constraint expressed as pure data.
- **`LogicTakeOwnership`, `LogicStealOwnership`** — boolean skill expressions deciding who may claim it
  and who may **steal** it from the enemy.
- **`Products[16]`** — a build menu of up to 16 entries.

**`ComputerProduct`** (`VehInfo.ComputerProduct.cs`) is the build order: `Title`, `ProductToCreate`,
`Quantity`, `Team`, **`Time`** (build time), `PlayerItemNeededId/Quantity`, `Cost`, `SkillLogic`,
**`TeamItemNeededId/Quantity`** (a *team-shared* resource), **`TeamBuildingLogic`** (a tech-tree gate over
what your team has already built), `TeamQueueRequest`, `Confirm`.

##### Real facility list #1 — Twin Peaks CTF (light base building)

40 computer vehicles. The ones that matter, with real hit points:

| Facility | HP | Note |
|---|---|---|
| Auto Turret-MG | 200 | Engineer-built |
| Auto Turret-Rocket | 200 | Engineer-built |
| Auto Turret-Plasma | 180 | Engineer-built |
| Sentry | 180 | Creates a **teleport-disruption field** |
| Sentry Hunter | 150 | "400 pixel detection radius, points at infiltrators only" |
| Heal Station | 200 | |
| Ammo Box | 200 | |
| SandBag | 100 | |
| Warp Point (green / yellow / purple) | 150–1000 | Player-placeable teleport destinations |
| Warp Point (D3 Elevator / A3 Elevator / Gladiator) | 100 | "If this vehicle is created, it becomes the new destination point for…" |
| AutoTurret Mines / Confusion / Deprize | 180–2000 | |
| Turret Menu (30 sec / permanent) | 1 | **A build menu implemented as a zero-HP vehicle you place, click, and it disappears** |

##### Real facility list #2 — FLEET (full RTS base building) — CONFIRMED

`fleet/Fleet.veh` — 18 computer vehicles, mirrored per faction:

| Facility | HP | Role |
|---|---|---|
| **Command** (Collective / Titan) | 500 | The command post. Refines minerals → Build Points. |
| **Refinery** | 350 | Refines **twice as fast** as Command. |
| **FabSat** (Fabrication Satellite) | 500 | Builds small ships and other structures. |
| **SpaceDock** | 800 | Builds capital ships. Repairs hulls. |
| **SupplySat** | 400 | Arms ships. **Also the class-change station.** |
| **GUNSAT** | 100 | Defensive turret. |
| **KILLSAT** | 150 | Offensive turret. |
| **Drone** (Defense Drone) | 50 | Cheap picket. |
| **Eljaycium Asteroid** | 5 | The mineral node itself. |
| MeteorShower | 50 | Environmental hazard. |

And the **actual tech tree**, read out of the `Products` arrays. `BP` = Build Points, team item id 2001:

```
Command (500hp)   Refine Minerals (50/cycle, 150 ticks)
                  Defense Drone   50 BP     GUNSAT 55 BP     SupplySat 500 BP
Refinery (350hp)  Refine Minerals (100/cycle — 2x Command)
                  Defense Drone 20 BP   GUNSAT 55 BP   SupplySat 500 BP
FabSat (500hp)    Corvette 200 · Bomber 200 · Cutter 150 · Blockade Runner 250
                  Missile Corvette 400 · Strike Corvette 200
                  SpaceDock 2000 BP · Refinery 1500 BP · GUNSAT 100 BP
SpaceDock (800hp) Frigate 600 · Destroyer 1200 · Command Carrier 500 · Missile Frigate 1000
                  KILLSAT 200 · Repair 50 Hull Points for 5 BP
SupplySat (400hp) Load 5 WarShrike / FireHawk / DeathFist Missiles · Plasma Torpedo · Plasma Bomb
                  Purchase FabSat 1000 BP · Transport 50 BP
                  Become Fabricator / Fighter Pilot / Gunship Pilot / Miner / Scout Pilot
```

**Two design details in there worth stealing outright:**

1. **Every purchase has a matching "Return X" product that refunds the BP.** `Return SpaceDock` gives back
   2000 BP, `Return GUNSAT` gives back 100. **You can dismantle your own base and get the resources back.**
   Misplacing a building is recoverable, so players actually experiment with layouts.
2. **The class-change station is a building you have to build and defend.** "Become Miner" / "Become
   Fighter Pilot" are *products of the SupplySat*. Lose your SupplySat and your team can no longer
   re-role. That single decision makes a support structure worth attacking.

##### Real facility list #3 — Frontlines (modern, spawn-driven)

| Facility | HP |
|---|---|
| SpawnPoint A / B / C | 9999 |
| OpFor Barracks / USMC Barracks | 9999 |
| Commander in Chief | 9999 |
| Care Package | 9999 |
| UAV / Auto AA | 9999 |
| Barricade | 300 |
| Sentry Gun | 100 |
| Environment - Car A / B | 200 |

`9999` here means "not meant to be destroyed" — Frontlines used computer vehicles as **markers and
spawn anchors**, not as breakable structures. Compare Twin Peaks' 180–200 HP turrets.

### 2.3 Who built the base, and how it played (CONFIRMED — primary document)

The single best source on this is `Twin Peaks Modern/assets/engyguide.txt`, the **"Guide to being a Combat
Engineer v.1.00" by EngineerSean and Decker**, which shipped inside the zone. Everything in this
subsection is from it unless noted.

- **The Engineer is the base builder.** "A Turret is a computer-controlled structure that will fire on any
  enemy within it's sight. Without this, a base is never very well defended."
- **Turrets are built from mined ore.** Costs, verbatim: **Plasma turret 15 titanium oxide, 180 hp** ·
  **MG turret 25 titox, 200 hp** · **Rocket turret 50 titox, 200 hp**. Repair kit: **5 titox → 75 hp**.
- **Building costs energy, in two stages.** "It takes 200 energy to make the new AutoGun and 300 energy to
  deploy the Turret." Repairing costs 100 energy. Your energy is also your **shield**
  (`concepts.txt`: "If you have 100% energy then the shield will take all the damage… if you have 50%
  energy then 50% of the damage will go through to your health and armor"). **So building makes you
  defenceless while you do it.**
- **The budget is spatial, not just economic.** "4 Turrets + 2 sentries can fit in any base, unless you are
  in an especially large base, such as several in Eol or CTFx, and then you can usually put a second set of
  Turrets in your base spread far apart." Sentries are capped at **2 per team**.
- **Placement doctrine, verbatim:** "You'll want to keep most of your Turrets in or near the flag room so
  that they can attack people as they are grabbing the flags… **Keeping the Turrets in the flag room kind
  of creates a choke point that you can defend a little easier than wide open spaces.**"
- **Turrets screen each other.** "If a Rocket Turret has a Sentry between it and the entrance, an enemy
  cannot fire past the Sentry without destroying the Sentry first."
- **Turret roles are about minimum range**, which is a lovely inversion: the Rocket turret has a long
  *minimum* range so it goes "as far back in your flag room as possible… you want it to fire on a player as
  soon as he rounds the last corner"; the Plasma turret has a "super-short minimum-range" and is "a last
  ditch effort" next to the flags; MG turrets "work well in any situation, sometimes protecting the Rocket
  Turret, sometimes catching the enemy in a deadly crossfire as he enters the flag room."
- **The Sentry is not a gun.** It "will create a teleport disruption field in the area of the Sentry" —
  and offensively, "the teleport disruptor effect from these works through walls… By disabling or crippling
  summons, generally your team will have a noticeably easier time getting the last push they need."
  **Base defence and base attack are both partly about denying teleportation.**
- **You can capture enemy structures.** "Reprogramming Kit: This kit allows you to permanently take control
  of an enemy's Turret unless he re-reprograms it." The attack pattern, verbatim: throw a **Haywire
  Grenade** ("'Jamming' a Turret will make that Turret unable to fire, but it will still aim at an enemy"),
  "Get on top of the Turret and start tapping your reprogram button like mad. Generally on my 3rd or 4th
  hit, the reprogram works." Reprogramming "takes half of your energy."
- **Logistics are physical.** Ore is heavy: "rather than the original **60 KG** of weight maximum, you are
  able to carry **80 KG**" on a hoverboard. "I usually carry 50 titox when I'm not planning on being on a
  board… and about 100 when I plan to stay on my board." Engineers ferry ammo for teammates.
- **Mining is a real trip across the map**, and the Medic teleports you home: "Make sure you get a summon
  from your medic when you are done mining." Alternatively "lay a teleport beacon… go to another mining
  spot, pick up the titox, and teleport back."
- **Mining spots are named by map grid square**: "In Twin Peaks, the G2-I2 mining spots are ideal, as they
  are quite close to one another… In Heinrich's Point, G3-H3 are ideal." (See §3 for how that grid works.)

### 2.4 What interior fighting felt like versus exterior

**LIKELY** — inferred from confirmed data plus the engineer guide, which is a period player document.

- **Outside**, the map is wide, sightlines are long, low walls (`o`) let you shoot over cover, and there
  are vehicles. Frontlines' terrain names — *Outdoors, Mountains, Roadway, Trench, Alleyway* — are the
  outdoor vocabulary.
- **Inside**, everything funnels. A base has **one or two entrances**, the flag sits at the back, and 4
  turrets + 2 sentries are stacked to cover the last corner. The guide's whole tactical section is about
  corners, crossfire, mines on the floor, and grenades round blind angles — "Electron beamer is most
  important to utilize for home defense, as you can **bounce it off of up to 2 walls**."
- **Projectiles bounce.** Confirmed in the item format: `ItmInfo.Projectile` carries
  `horizontalBounceSpeed`, `bounceCount`, `floorBounceVerticalSpeed`, `floorBounceHorizontalSpeed`,
  `floorBounceCount`, `gravityAcceleration`, `startHeightAdjust`. And the FAQ confirms "all plasma weapon
  projectiles bounce" and "All energy weapon projectiles bounce (except for Particle Accelerator)".
  **In a sealed room with 8-tile-thick walls, bouncing energy weapons are an area-denial tool.** That is
  the single biggest difference in feel between inside and outside.
- **Interior floors regenerate differently.** `Terrain5 "Building/Cave Interior"` has `RepairRate=1`;
  `Terrain9 "PubArea Building/Cave"` has `RepairRate=10`; the dropship has `RepairRate=30, HealthRate=30,
  EnergyRate=999`. **Repair rate is a property of the room you are standing in.**
- **The dropship is the only truly safe room**, and it has `MaxTimeAllowed=300` so you cannot live there.

---

## 3. MAP GEOMETRY AND SCALE

**Status: CONFIRMED.** All of this is read out of the level format and the server source.

### 3.1 The tile

- **A tile is 16 world units.** Every coordinate in the game is in world units, and every tile lookup
  divides by 16: `x /= 16; y /= 16; return Tiles[y*Width + x];` (`LvlInfo.getTileAt`). Object positions in
  `.lio` files are world units — e.g. Twin Peaks' `Titan Start` warp at (10720, 7360) is tile (670, 460).
- **The radar image is 1 pixel per tile** (`twinpeak.png` = 868 × 647 px; `twinpeak.lvl` = 868 × 647 tiles).
- **Each tile carries 3 bytes** (`LvlInfo.Tile`): a terrain/floor byte, a second byte, and a packed
  `PhysicsVision` byte where the **low 5 bits are physics (0–31)** and the **high 3 bits are the vision
  type (0–7)**. Physics and sight-blocking are **independent per tile**. That is the most important small
  fact in the whole format.
- **Tile data is stored RLE-compressed in three separate planes** (one pass per byte), so a map of
  3.3 million tiles is a 3.3 MB file.

### 3.2 The map

- **Dimensions are free-form `Width × Height` in the header** — no power-of-two constraint. Measured
  range across the archive: **400 × 400** (`TDM/death.lvl`) up to **1611 × 2048** (`ctfpl2016.lvl`,
  3.3 million tiles) and **1728 × 1222** (`fleet/AlphaTango.lvl`). A typical competitive CTF map is
  **~850 × 650**.
- In world units that is: a 868-tile-wide map = **13,888 units** across.
- The header also carries a 512-entry **minimap palette**, a **128-entry terrain lookup table** (reduced
  `% 16`, hence exactly 16 terrain types), the physics Z tables, four light colours, and counts of
  **floor blobs** and **object blobs** — the graphic tilesets. Measured: Twin Peaks Modern uses
  **63 floor blobs and 197 object blobs**; Fleet uses **2 and 11** (it's space).

### 3.3 The map coordinate grid (CONFIRMED)

Players call out positions as `C7`, `G2`, `A4`. The conversion is in the server
(`Helpers.posToLetterCoord`, `Protocol/Helpers/Math.cs`):

```
xpos = (posX / 80) / 16      →  column letter, A = 0
ypos = ((posY / 80) / 16) + 1 →  row number, starting at 1
```

**One grid square = 80 × 80 tiles = 1280 × 1280 world units.** A classic 868 × 647 map is therefore about
**11 columns × 9 rows**. The engineer guide's "bases C7 and G7" and "G2-I2 mining spots" are in these
units. `?duelbot <id> A4` spawns at the **centre** of that square (`x += 40*16; y -= 40*16`).

**This is a very good idea for War World.** An 80-tile lettered grid gives players a shared, low-precision
vocabulary for a huge map, and it costs two divisions.

### 3.4 The physics model, including the vertical trick

**CONFIRMED** (`LvlInfo.cs` `physicValues` list, `PhysicsLow[32]` / `PhysicsHigh[32]` header arrays,
`isTileBlocked(x, y, VehInfo)`).

The 5 physics bits select one of **32 slots**:

```
0        Clear
1 –  5   Red     : Solid, Upper-Left, Upper-Right, Lower-Left, Lower-Right
6 – 10   Green   : same five
11 – 15  Yellow  : same five
16 – 20  Orange  : same five
21 – 25  Purple  : same five
26 – 29  Red Move Right / Left / Down / Up      ← conveyor belts
30       Teal Solid
31       Blue Solid
```

Two things fall out of that:

1. **Every wall colour has four half-tile diagonal variants**, so the grid supports 45° geometry without
   sub-tile resolution. A source comment draws them:
   `| /  = Red Upper Left`, `/|  = Red Lower Right`.
2. **Colour = height.** Each slot has a `[PhysicsLow, PhysicsHigh]` Z band. Measured from the real
   `ctfpl2016.lvl` header (and matching the engine's own legacy defaults):

   | Colour | Height |
   |---|---|
   | Red | **1024** (full wall) |
   | Green | **16** |
   | Yellow | **32** |
   | Orange | **64** |
   | Purple | **128** |
   | Red-Move (conveyors) | 49 |
   | Teal / Blue | 1024 |

   And a source comment gives the reference body: **"Typical man vehicle: LowZ = 0 HighZ = 55"**.

   So a man (0–55) is stopped by *green* (16). But projectiles have `startHeightAdjust` and
   `gravityAcceleration` — **you can lob a grenade over a green wall that you cannot walk through.**
   Five wall heights × a projectile arc is a whole cover system built out of one byte per tile.

   ⚠ **UNVERIFIED detail:** the emulator's "can I pass over?" test is `vehicle.LowZ > low`, compared
   against `PhysicsLow` — which is **0 for every slot in every shipped map I opened**. Taken literally,
   any vehicle whose body starts above 0 would clear every wall including red. Either that is an emulator
   simplification or the original client used `PhysicsHigh`. **Do not copy that comparison; use
   `LowZ > wallHigh`.** The *design* (colour = height, and things pass over or under by Z band) is solid.

### 3.5 What you could see at once

**CONFIRMED** for the numbers, **LIKELY** for the interpretation.

Sight is a **cone**, and it is a separate system from wall collision. From `Twin Peaks Modern/ctfpl.cfg`:

```
[LOS]  DefaultDistance=256   DefaultAngle=100   DefaultXray=0   TeamSharing=1
[Arena] TeamVisionDistance=3096   ItemPickupDistance=87   VehicleGetInDistance=87
[View]  AdjustDistance=2048   AdjustSpeed=4000   AdjustRotateSpeed=200
```

In tiles: **LOS range 16 tiles**, a **100-unit angle** (the client shades the cone behind you),
**team vision shared out to ~194 tiles**, **camera lead-ahead ~128 tiles**, pickup reach ~5.4 tiles.
Individual vehicles override with their own `LosDistance` / `LosAngle` / `LosXRay`.

The in-game primer says it plainly (`concepts.txt`): *"You cannot see through walls in infantry. Neither
can you see behind you (unless you have a rear cam or a teamate spotting for you)… LOS is defaulted to only
being on when you stand still in the game."*

Per-tile vision is 8 types (`LosType0`–`LosType7`), each with `Solid` and `VisibleDistance`. Real values
from `ctfx.cfg`:

| Type | Solid | VisibleDistance | Meaning |
|---|---|---|---|
| 0 | 0 | −1 | fully transparent |
| 1, 2 | **1** | −1 | **blocks sight** |
| 3 | 0 | 0 | opaque but not "solid" |
| 4 | 0 | 4 | see 4 units in |
| 5 | 0 | 8 | see 8 units in |
| 6 | 0 | 12 | |
| 7 | 0 | 16 | see 16 units in — light haze |

**LIKELY, and this is the good bit:** measured on classic Twin Peaks, sight-blocking tiles (los1) are
**58.5%** of the map and Red Solid walls are **59.7%** — they track. Meanwhile Green Solid is 7.4% and
falls into los0. **Green walls block movement and do NOT block sight.** That is a deliberate two-axis
cover system: *tall opaque walls* vs *low walls you shoot and see over*.

CTFX went the other way: **96.2% of its tiles are los0** while **72.2% of the map is physically blocked**
(40.8% Red, 30.8% Green). **CTFX is a maze you can see across.** That's a legitimate, very different
feel — from the same two bytes.

### 3.6 Measured map density (CONFIRMED — I decompressed these)

| Map | Size (tiles) | Blocked | Physics mix | Sight-blocking |
|---|---|---|---|---|
| Twin Peaks (classic) | 868 × 647 | **68.4%** | Red 59.7 · Green 7.4 | 58.5% |
| Heinrich's Point | 849 × 692 | **45.0%** | Clear 55.0 · Green **23.6** · Red 19.8 | 12.0% |
| Elite CTF (ctfx) | 1489 × 964 | **72.2%** | Red 40.8 · Green **30.8** | 3.7% |
| Frontlines: River City | 555 × 348 | 23.4% | Red 15.5 · Purple 3.5 · Green 2.3 · **Red-Move-Down 0.3** | 15.0% |
| Fleet: Alpha Tango | 1728 × 1222 | **3.2%** | Clear 96.8 | **0%** |

Read the spread: a base-defence CTF map is **~70% solid rock with corridors and rooms carved out of it**;
a field-battle map (Heinrich's Point) is ~45% and leans on **low walls**; a space map is 97% void.
Frontlines is the only one using conveyors.

---

## 4. TERRAIN AND ENVIRONMENT TYPES

**CONFIRMED.** Covered mechanically in §2.2(a); here is the catalogue as designers actually used it.

**There are exactly 16 terrain slots per map** and they are the *only* way the floor talks to gameplay.
Real sets, verbatim from shipped configs:

**Combat/CTF vocabulary** (`ctf1.cfg`, `ctfpl.cfg`): open ground · **Titan DropShip** · **Collective
DropShip** · **Europan DropShip** · Raiders Spawn/Store Zone · **Building/Cave Interior** · **Lava** ·
**Lift Area** · PubArea Building/Cave · Switch area (eats ammo drops) · Gladiators Duel Area ·
Private Teams Enabled.

**Military-map vocabulary** (`frontlines.cfg`): **Carrier [F10/F11 Enabled]** · **Outdoors** ·
**Mountains** · **Barracks** · **Trench** · **Drop Zone** · **Roadway** · **Water** · **Indoors** ·
**Alleyway**.

Hazards are terrain, not entities. Lava is
`TrickleKill=1, EnergyRate=-20, HealthRate=-20, RepairRate=-20` — it drains **energy, health and vehicle
repair simultaneously**. `RepelVehicle` / `RepelWeapons` let a designer make a footpath vehicles cannot
enter and a zone weapons cannot cross, with no scripting.

Water: `Terrain13 = "Water"` in Frontlines. **UNVERIFIED** whether water had swim mechanics or was purely
a movement/terrain modifier — `TerrainModifiers[]` exists on every vehicle
(`VehInfo.cs: public short[] TerrainModifiers`), which strongly implies **per-vehicle speed multipliers per
terrain type**, i.e. a tank is slow in water and fast on `Roadway`. I did not confirm the semantics.

Vehicle-only areas were achieved two ways: `RepelVehicle` on the terrain (keeps vehicles *out*), and the
physics Z-band (a low wall that a man cannot cross but a hovering vehicle can).

Biomes across the archive (from map and zone names — **LIKELY**): city streets, caves, asteroid fields,
space, lava station (`sklavastation`), caverns (`skcaverns`, `hccaverns`), no-man's-land
(`sknomansland`), boarding actions inside ships (`SKBoardingAction`, `hcboardingaction`), and
`frontlines/rivercity`.

---

## 5. THE FRONT / TERRITORY

**Status: CONFIRMED for the mechanics; UNVERIFIED for any persistent metagame.**

### 5.1 How territory changed hands

There were **two objective modes**, stated in the zone's own FAQ (`ctf_faq.txt`):

> "There are essentially 2 types of game. One is to capture **static (unmoving) objectives**. The other is
> to capture the objective and **carry it back to base**."

The static-flag mode is the front-line mode, and it is the one Skirmish used: *"Most employ **static flags
for territory holding**"* ([Academic Kids](https://academickids.com/encyclopedia/index.php/Infantry_(computer_game))).

### 5.2 The win condition is a hold timer over the whole map (CONFIRMED)

From the `[Flag]` sections of the shipped configs. `VictoryHoldTime` is in ticks (100/sec):

| Zone | VictoryHoldTime | = seconds | CarryCount |
|---|---|---|---|
| `ctf1` Twin Peaks | 9000 | **90 s** | 100 |
| `ctfpl` Twin Peaks Modern | 9000 | **90 s** | 100 |
| `ctfx` Elite CTF | 6000 | 60 s | 100 |
| `eolclassic` | 6000 | 60 s | 100 |
| `frontlines` | 6000 | 60 s | **1** |
| `skirmish5` | 2000 | **20 s** | 1 |
| `fleet` | 0 | n/a | — |

Plus, from `frontlines.cfg`: `VictoryWarningBong=20`, `VictoryAbortedBong=13`, `ShowTimer=1`,
`AutoPickup=1`, `AllowJoiningWinningTeam=0`, `RestoreUnownedDroppedFlags=1`,
`WinnerJackpotFixedPercent=1000 / LoserJackpotFixedPercent=500`.

**The shape of a round:** you take flags one at a time; the moment your team owns *all* of them a
countdown starts and the whole server hears it; the enemy has 20–90 seconds to break the hold anywhere on
the map, and doing so aborts it audibly. **Fleet is the exception** — no flag hold at all; its objective is
*"destroy your enemies Command Post."*

`CarryCount` is the other lever: Twin Peaks lets one player carry **100** flags; Frontlines and Skirmish
let you carry **1**. That single number is the difference between "a runner can sweep the map" and "every
capture needs a body in place."

### 5.3 The mechanisms that make a front feel like a front (CONFIRMED)

- **Flags flip turret groups.** `Flag → Turret Group ID`. Taking the point turns its defences on the
  people who just lost it.
- **Flags project an aura.** Owner-side heal / energy / repair / shield-percent within a radius, and a
  separate non-owner set. **Holding ground literally heals you there.** This is the mechanic that makes a
  captured point worth standing on rather than running past.
- **Flags appear and disappear with population** (`Min/Max Player Count`) — the front contracts on a quiet
  night.
- **Resource nodes are on the contested ground.** Hides named `Pandora`, `Tsolvy`, `Titanium` in the
  CTF/Eol maps, `Minerals1/2/3` in Fleet. The engineer guide: your engineer *has* to leave the base to
  mine, "I usually carry 50 titox when I'm not planning on being on a board." **The economy forces
  movement across the front.**
- **Spawn logistics.** Landing-zone warps per team; a Medic can **summon** a teammate home; a Sentry
  **jams teleports in an area**. Attacking a base means first killing its ability to reinforce.

### 5.4 Was there a persistent world map?

**UNVERIFIED, and I believe the answer is no.** Everything in the arena config
(`StartDelay`, `ResetDelay`, `VictoryHoldTime`, `[StartGame]`, `[Rts] Game / StartDelay / MinimumPlayers /
VictoryPointReward`) describes a **round that resets**. There is an `[Rts]` section and `RtsStateDefault`
with eight `InitialState` slots, and hides carry an `Rts State Number` — so there was a notion of
persistent-ish *arena* state across an RTS-style match — but I found **no evidence of a campaign map,
territory persisting between sessions, or zones affecting each other.** Player *progression* persisted
(points, experience, cash, rank — `[Rank]`, `[Experience]`, `[Cash]`, `[ZoneStat]` sections all exist);
*territory* did not.

---

## 6. THE MAP EDITOR

**Status: CONFIRMED for what exists today; LIKELY for the SOE-era history.**

### 6.1 History

- Sony released a **Map Editor as a free download in July 2007**, at the same time as making the game
  fully free ([en-academic mirror of the Wikipedia
  article](https://en-academic.com/dic.nsf/enwiki/412488); the FreeInfantry forum thread
  `freeinfantry.com/forum/viewtopic.php?f=7&t=47` is titled "Infantry Editors" and lists them, but the
  forum returned HTTP 500 when I tried to read it).
- A **Player Content Team (PCT)** was established from May 2007 "to encourage and oversee much of the new
  content being developed for the game", and dedicated player zones ran "custom maps and settings not
  always available or found within the public zones" (search summary of the
  [Codex Gamicus article](https://gamicus.fandom.com/wiki/Infantry_Online); ⚠ I could not fetch that page
  directly — it returned HTTP 402 — so treat the wording as **LIKELY**, not confirmed).
- Alternative servers — most notably **Free Infantry** — started as a free alternative and, once SOE made
  the game free, "transitioned to providing alternative maps and gameplay from the official server"
  (same source, same caveat).
- SOE **shut the servers down at the end of March 2012**; the community relaunched at freeinfantry.com
  ([Wikipedia: Infantry (video game)](https://en.wikipedia.org/wiki/Infantry_(video_game))), and
  FreeInfantry shipped on **Steam in April 2024** ([freeinfantry.com](https://www.freeinfantry.com/)).

### 6.2 The toolchain that survives (CONFIRMED)

`github.com/InfantryOnline/Infantry-Online-Tools` — "All the editors needed to create FreeInfantry zones."
Contents:

- **`Tools.InfantryStudio`** — the map editor. Its source tree has `Rendering/`, `Assets/`,
  `UserControls/MapUserControl`, and windows: **`MainWindow`**, **`MinimapWindow`**, **`DoodadWindow`**,
  `CachingProgressWindow`. So: a scrolling tile canvas, a minimap, and a **doodad/object palette**.
- **`Tools.BlobEditor`** — edits `.blo` / `.lvb` blob archives (the tile and sprite graphics).
- **`Tools.LvbRebase`** — rebases level blob references.
- **`Tools.External/Gibbed`** — third-party format libraries.

The full file-type set a zone author works in, from the Zone-Assets "Orphaned Archive Files" folder
structure: **`blo cfs itm lio lua lvb lvl nws rpg txt veh`** — graphics blobs, sprite files, items,
level objects, Lua scripts, level blobs, the level itself, news, RPG/class data, help text, vehicles.
The server side adds `.cfg` and C# scripts (`scripts/GameTypes/...`).

### 6.3 What a player could actually make

**CONFIRMED, and the answer is: an entire game.** Because nearly everything is data —

- the **map** (`.lvl`: tiles, physics, vision, terrain lookup, lighting, tilesets),
- the **fixtures** (`.lio`: doors, switches, flags, warps, portals, hides — with logic, team gates, ammo
  costs and reward tables),
- the **vehicles and buildings** (`.veh`: including the whole `Computer` type with its 16-entry build menu,
  chained-turret prerequisites and ownership logic),
- the **items and weapons** (`.itm`, incl. projectile gravity, bounce counts, start height),
- the **classes** (`.rpg`),
- and the **rules** (`.cfg`: 16 terrain types, 8 LOS types, flag rules, arena caps, RTS settings, teams,
  ranks, economy, UI art metrics),

…a zone author could build a base-building RTS (Fleet), a sports game (GravBall, BoomBall, Football,
Soccer), a co-op survival mode (Bug Hunt, Zombie Zone), a side-scroller (Io's Landing), a battle royale
(Eol: Pioneer Station), and a Halo homage (SUT Evolved) **without touching engine code.**
The 231 archived zone folders are the proof.

### 6.4 Distribution

**LIKELY.** In the SOE era zones ran as official or PCT-blessed servers, and alternative servers ran their
own. Today it is explicit: FreeInfantry open-sourced the **whole server** and packages zones as
**"plug-and-play" folders** — a `.cfg` listing every required file, a `README.md` in INI style with
`name / description / zone_creators / map_creators / map_name / game_type / scripts_included`, a
`map.png` radar image, and all supporting files; the stated bar is that a zone "should be ready to dump
into the server as-is and run without error"
([Zone-Assets README](https://github.com/InfantryOnline/Zone-Assets)).

---

## 7. WHAT I COULD NOT FIND

Itemised. These are real gaps, not hedges.

1. **The map editor's own documentation or UI.** No manual, tutorial, screenshot or feature list for the
   SOE 2007 editor or for InfantryStudio. `freeinfantry.com/forum/viewtopic.php?f=7&t=47` ("Infantry
   Editors") returned **HTTP 500**. I have the editor's *source-tree shape* only. **I do not know whether
   it had prefab/stamp support, copy-paste of room blocks, symmetry tools, or a physics-layer brush** —
   all of which matter if War World wants an in-game base editor.
2. **A screen resolution / camera viewport figure.** `[View] AdjustDistance=2048` is the camera *lead*, not
   the visible area. The original client is widely described as running at low resolution and the modern
   build ships `cnc-ddraw` for fullscreen/windowed scaling, but **I never found a stated tiles-on-screen
   number.** LOS range of 16 tiles is a floor on the answer, not the answer.
3. **The soldier's physical footprint in tiles.** `VehInfo.PhysicalRadius` exists, but the `.veh` CSV
   layout has a variable-length 6-entry `ArmorValues` block that I could not align with confidence, and my
   two candidate readings disagreed. **I refuse to state a number I can't stand behind.** A corridor width
   in "how many bodies abreast" is therefore missing.
4. **Whether Skirmish had a continuous front or discrete flag points.** I have the flag-hold win condition
   and "static flags for territory holding" but **no map-level analysis of a Skirmish level** — the
   `skirmish5` folder's `.lvl` wasn't among the ones I decompressed, and `skirmish5.veh` has only 2 computer
   vehicles ("Ammo MatterTransceiverA/B"), which suggests Skirmish had **almost no player base-building at
   all**. That would make Skirmish and Twin Peaks structurally very different games, and I did not confirm it.
5. **"Combined Arms" as a shipped zone.** It appears in the later encyclopedia list ("Large-scale warzone
   with an exhaustive set of weapons, classes and vehicles") but **there is no `combinedarms` folder in the
   92-zone archive.** It may be an alternate name for Skirmish, an SOE-era zone that did not survive, or a
   wiki error.
6. **Zone metadata.** Every `README.md` in the Complete Zones archive is an **empty template** — `name=""`,
   `description=""`, `zone_creators=""`, `map_creators=""`. The intended per-zone documentation was never
   filled in. Author credits, intended player counts and design notes are lost with it.
7. **The wayback machine.** WebFetch is blocked from `web.archive.org` in this environment and direct curl
   hit HTTP 429. **The archived SOE zone pages, which would be the authoritative period zone list, were
   unreachable.** This is the biggest single gap and is worth ten minutes of someone's browser time.
8. **Codex Gamicus / Encyclopedia Gamia** returned **HTTP 402** on direct fetch. I have only search-engine
   summaries of them, which is why §6.1's PCT/alternative-server history is marked LIKELY.
9. **TV Tropes** returned **HTTP 403**.
10. **Reddit /r/InfantryOnline** produced nothing usable — no thread from it surfaced in any search.
11. **Whether `Terrain13 "Water"` had swimming.** `VehInfo.TerrainModifiers[]` implies per-terrain speed
    multipliers per vehicle, but I did not confirm the semantics or find a zone using water meaningfully.
12. **A worked example of `TeamBuildingLogic`.** The tech-tree gate field exists on every
    `ComputerProduct`, but **every Fleet product I dumped left it empty** — so Fleet's tree is gated by
    *cost* and by *which building you are standing at*, not by prerequisites. I found no zone that actually
    used the prerequisite gate, nor any using `ChainedTurretRequiredForBuilding`. **The most interesting
    base-building feature in the format may never have been used.**
13. **Any in-period screenshot or video analysis.** Everything visual here comes from the one radar PNG I
    read plus the tile data I decompressed.

---

## 8. WHAT WAR WORLD SHOULD STEAL

Opinionated. Tied directly to the base-builder and interior-combat decision.

### 8.1 Steal the disconnected-sheet trick, but only as a fallback

Infantry put building interiors, caves and dropships in **the same flat tile sheet as the surface, sealed
off, reached by teleport**. It was forced on them — a heightfield cannot fold over itself. **War World is
Three.js and does not have that constraint**, so build real interiors.

But keep the *idea* for the one thing it's still best at: **a spawn/armoury room that is not physically
adjacent to anything.** Infantry's dropship is a sealed 114 × 37-tile box you can only enter by warp and
which throws you out after 300 seconds. That is a strictly better design than a spawn room with a door,
because there is no spawn camping to solve — and it costs nothing to implement.

### 8.2 The terrain table is the single best idea in the engine — copy it wholesale

**16 terrain types per map, each a property block, selected by one byte per tile.** No entity, no trigger
volume, no script. The floor decides whether you can shop, re-class, heal, change team, quit, or be hurt.

```
Terrain { name, canShop, canReclass, canSwitchTeam, hpPerSec, energyPerSec, repairPerSec,
          isSafe, repelsVehicles, repelsProjectiles, maxDwellSeconds, damagePerSec, ... }
```

Concretely for War World: **your armoury is a floor material, not a building.** Paint `ARMOURY` on the
tiles inside a room and that room is an armoury. Paint `MED BAY` and it heals. Paint `MOTOR POOL` with
`repelsInfantry`. **The base builder then reduces to: place walls, place doors, paint floors.** That is a
dramatically smaller feature than "place buildings with behaviours", and it is what Infantry actually
shipped.

Steal `maxDwellSeconds` specifically. A 300-second timer in the shop room is the whole anti-camping system.

### 8.3 Two axes of cover: colour = height, and sight is a separate byte

Per tile, store **movement height** and **sight opacity independently**. Infantry got five wall heights
(16 / 32 / 64 / 128 / full) plus a transparent/opaque flag out of one byte, and used them to make:

- a **full wall** (blocks movement and sight),
- a **low wall** (blocks movement, you see and shoot *over* it),
- **haze** (blocks sight for N units, doesn't block movement — LosTypes 4–7 with VisibleDistance 4/8/12/16),
- and the two extremes on the same map: classic Twin Peaks is 58% sight-blocked; Elite CTF is 96%
  *transparent* while being 72% physically blocked — **a maze you can see across**.

If War World has projectile arcs (it should — Infantry's `startHeightAdjust` + `gravityAcceleration`
+ `bounceCount` are right there), low walls immediately become the most interesting geometry in the game:
you can't walk it, you can see over it, you can lob over it, and you can't shoot straight through it.

### 8.4 Answer to the base-builder question: rooms on a grid, halls not corridors, one way in

The measurements from a real base:

- Compound **~150 × 68 tiles**, walls **~8 tiles thick**.
- **Exactly one ground entrance, 6–8 tiles wide**, plus one secondary opening.
- Split into **two halls of ~55 × 55 tiles** by an internal spine wall with a doorway.
- Halls furnished with free-standing **~6 × 6 tile blocks** (hard cover) and **3–6 tile low walls**
  (soft cover).
- Interior open spans: **median 14 tiles**, band 7–20, only 14% narrower than 5 tiles.

**So: not "rooms connected by short corridors."** Infantry's bases are **a few large halls, thick walls,
and a very small number of entrances.** The tension comes from the *doorways*, not from corridor width.
If you build 3 × 3 cells of small rooms joined by short corridors you will get a maze that fights badly —
turrets have no field of fire, grenades are strictly dominant, and there is no room to flank.

Concrete recommendation for a cell-based builder: make **the cell large** (a hall, ~15–20 m across),
let a facility occupy a cell, and let the interesting decisions be **which walls between cells have
doorways** and **where the perimeter breach is**. One cell = one room = one facility floor type.
Corridors, if any, should be *short links between halls*, not the primary space.

### 8.5 The switch is the base's nervous system — steal it exactly

A switch that toggles **up to 16 doors at once**, gated independently by **class**, **team**, **ammo cost**
and **energy cost**, with explicit override precedence and an **auto-close delay** (measured: 4.5 s).
Infantry's `LiftControl1…9` each drive 4–6 doors.

That gives you, from one data structure and no new code: bulkheads, airlocks (via `Inverse State` on a
linked pair), engineer-only maintenance hatches, doors that cost power to cycle, and lifts. **Do not
implement doors individually.** Implement *switch → door group*.

### 8.6 Buildings are units with a build menu, a prerequisite radius, and a refund

From `VehInfo.Computer` + `ComputerProduct`:

- **`HitpointsRequiredToOperate`** — a damaged facility **stops working before it dies**. This is the best
  single field in the format. It makes suppressing a building worthwhile without destroying it, and it
  gives repair a purpose mid-fight rather than only between fights.
- **`ChainedTurretRequiredForOperation` / `ChainedTurretRadius` / `NumChainedTurretsRequired`** — a facility
  needs *N of type X within radius R* to build, and separately to run. **That is your power grid, in three
  numbers, with no pathfinding and no graph.** (⚠ I found no zone that used it — you'd be shipping the
  feature Infantry designed and never used.)
- **`LogicTakeOwnership` / `LogicStealOwnership`** — capture rules as data. Infantry's Engineer carries a
  Reprogramming Kit that permanently converts an enemy turret, costing **half your energy**, needing 3–4
  attempts under fire, and best set up with a **Haywire grenade** that jams the turret first. **Capturing
  a facility should be a multi-step, high-exposure action, not a hold-E timer.**
- **A matching `Return X` refund on every build.** Dismantling your own SpaceDock gives back all 2000
  Build Points. Players will only experiment with base layouts if mistakes are reversible.
- **Density caps as data**: max of this type per team, per area, per player, active vs inactive. Infantry's
  practical answer was **"4 turrets + 2 sentries fit in any base."** A small, legible cap is better than a
  resource curve.

### 8.7 Make a support building the class-change station

Fleet's **SupplySat** is where you "Become Fabricator / Fighter Pilot / Gunship Pilot / Miner / Scout
Pilot". It costs 500 BP, has 400 HP, and if the enemy kills it your team cannot re-role.

**That is how you make players defend a building that doesn't shoot.** Every base-builder game has the
problem that only the turrets feel worth protecting. Put re-classing, or resupply, behind a fragile
structure and the problem solves itself.

### 8.8 Two-stage construction that costs your shield

Infantry: **200 energy to fabricate the turret item, 300 energy to deploy it, 100 energy to repair** — and
**energy is your shield** (100% energy = all damage absorbed; 50% = half bleeds through to health). So the
engineer who just placed a turret is **standing next to it with no shield**.

This is a beautiful, self-balancing rule and it needs no cooldowns. **Building under fire should cost you
the thing that keeps you alive.**

### 8.9 Deny reinforcement, not just ground

Three separate systems in Infantry all attack a base's ability to reinforce:

- Medics **summon** teammates home (that's how the miner gets back).
- The **Sentry** projects a **teleport-disruption field that works through walls** — placed *offensively*
  inside the enemy base it stops their summons.
- Warp destinations have **`Min/Max Players In Area`** so a spawn refuses to accept more bodies when it's
  crowded, which prevents spawn-stacking with zero code.

**War World's front will be decided by reinforcement rate.** Give attackers a way to attack it directly.

### 8.10 Three cheap things

1. **The 80-tile lettered grid** (`(pos/80)/16` → `C7`). Two divisions, and suddenly a 1500-tile map has a
   shared vocabulary. `?goto C7`, "mining at G2", "they're pushing B5".
2. **The flag aura.** `radius / healRate / energyRate / repairRate / shieldPercent` for the owner, and a
   separate set for everyone else. Holding a point *heals you on it*. This is what makes a capture point
   worth standing on rather than tagging and leaving.
3. **The map-wide hold timer with an audible warning.** Own every point, a 20–90 second countdown starts,
   the whole server hears it, and breaking the hold **anywhere** aborts it with its own sound
   (`VictoryWarningBong=20`, `VictoryAbortedBong=13`). It turns the last minute of a round into a
   map-wide scramble, and it's one integer per zone.

### 8.11 One thing to deliberately *not* copy

Infantry's flag file has **78 fields**, its switch has **52**, its computer vehicle has **~40 plus a
16-entry product array**. The format is magnificently expressive and it is also why the surviving
documentation is a list of numbered CSV columns and why **139 of 231 archived zones no longer load.**

Take the *shape* — everything is data, one choke-point format per concept, terrain as a property block —
but give it names, defaults, and a schema. Infantry's actual lesson is that **a fully data-driven war game
is achievable by a small team**; its actual warning is that an undocumented data format outlives everyone
who understood it.

---

## SOURCES

**Primary — game files and source code:**
- [InfantryOnline/Infantry-Online-Server](https://github.com/InfantryOnline/Infantry-Online-Server) — FreeInfantry server emulator. Specifically `Docs/Lio/{LioTypes,Doors,Switch,Flags,Hides,Portals,Warps}.txt`; `dotnetcore/Assets/Lvl/{LvlInfo,LvlInfo.Header,LvlInfo.Tile,LvlInfo.BlobReference}.cs`; `dotnetcore/Assets/Veh/{VehInfo,VehInfo.Computer,VehInfo.ComputerProduct}.cs`; `dotnetcore/Assets/Cfg/{CfgInfo.Terrain,CfgInfo.Los,CfgInfo.View,CfgInfo.Rts}.cs`; `dotnetcore/Assets/Itm/ItmInfo.Projectile.cs`; `dotnetcore/Assets/Shared/StreamHelpers.cs`; `dotnetcore/ZoneServer/Protocol/Helpers/Math.cs`; `dotnetcore/ZoneServer/Game/Commands/Chat/Commands.cs`.
- [InfantryOnline/Zone-Assets](https://github.com/InfantryOnline/Zone-Assets) — 92 complete zones + 139 archived. Files I parsed directly: `ctf1/{twinpeak.lvl, twinpeak.lio, twinpeak.png, ctf1.cfg, engyguide.txt, ctf_faq.txt, concepts.txt}`, `ctf2/hpoint.lvl`, `ctfx/{EliteCTF.lvl, CTFX.lio, ctfx.cfg}`, `Twin Peaks Modern/assets/{ctfpl2016.lvl, ctfpl3.lio, ctfpl.cfg, ctfpl.veh, engyguide.txt, ctfCoords.txt}`, `fleet/{AlphaTango.lvl, Fleet.lio, Fleet.veh, fleet.cfg}`, `frontlines/{rivercity.lvl, frontlines.veh, frontlines.cfg}`, `eolclassic/{eolclassic.lvl, eolclassic.lio}`, `BugHunt/asteroid.lvl`, `Ios Landing/assets/ioslanding.lvl`, `TDM/death.lvl`, `ctf4/harun.lvl`, `ctf5/victorycity.lvl`, `ctftpx/TwinPeakX.lvl`, `football/football1sm.lvl`, `skirmish5/skirmish5.veh`.
- [InfantryOnline/Infantry-Online-Tools](https://github.com/InfantryOnline/Infantry-Online-Tools) — InfantryStudio, BlobEditor, LvbRebase.
- [InfantryOnline/Playable-Zones](https://github.com/InfantryOnline/Playable-Zones) — live-server zone mirror.

**Primary — documents that shipped inside the game:**
- `engyguide.txt` — "Guide to being a Combat Engineer v.1.00" by EngineerSean and Decker.
- `ctf_faq.txt` — "Infantry Capture the Flag FAQ".
- `concepts.txt` — "Infantry Concepts" (slots, energy, health, line of sight).

**Secondary:**
- [freeinfantry.com](https://www.freeinfantry.com/) — current zone roster, event schedule, project history.
- [Wikipedia: Infantry (video game)](https://en.wikipedia.org/wiki/Infantry_(video_game)) — Harmless Games → Brainscan → SOE (Oct 2000), $6.95/mo from May 2002, free from June 2007, servers shut end of March 2012.
- [en-academic mirror of the Wikipedia article](https://en-academic.com/dic.nsf/enwiki/412488) — later zone list, July 2007 map editor release, population decline.
- [Academic Kids encyclopedia](https://academickids.com/encyclopedia/index.php/Infantry_(computer_game)) — earlier zone list with descriptions.
- [GameVortex review](https://www.gamevortex.com/gamevortex/soft_rev.php/758/infantry-online-pc.html) — "overhead perspective similar to Diablo", "believable, futuristic army bases".
- [FreeInfantry on Steam](https://store.steampowered.com/app/2830720/FreeInfantry/) — current zone types.
- [Codex Gamicus: Infantry Online](https://gamicus.fandom.com/wiki/Infantry_Online) — ⚠ returned HTTP 402; cited only via search-engine summary.
- [Encyclopedia Gamia Archive: Infantry Online](https://gamia-archive.fandom.com/wiki/Infantry_Online) — ⚠ returned HTTP 402; same caveat.
- [Massively OP, 2018](https://massivelyop.com/2018/10/06/1999s-infantry-online-has-been-revived-and-restored-by-its-community/) — community revival.

*Compiled 2026-07-27.*
