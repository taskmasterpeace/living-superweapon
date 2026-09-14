# 🔊 AUDIO WIRING SPEC — hand this to the integrator AI

> **Integration status on `codex/playable-integration` (14 September 2026):** The original `codex/audio-all` inventory below is a source-branch handoff, not a current wiring audit. Firearm/scout shots, melee impacts, concrete/grass steps, rain/domain thunder and vehicle explosions already have bundled mappings. Medkit activation now uses the confirmed `gear.ifak` recording imported from `codex/audio-all`, with provenance beside the MP3. Reload/dry-fire phases, jet/rotor loops, ordinary weather thunder/vortex and several other gadget events still require integration or source selection. Check `src/data/firearm-recordings.js`, `src/data/sound-library-recordings.js` and the actual event caller before adding or replacing a mapping. Extra source recordings remain in their library; this pass does not merge the entire divergent audio branch.

_Branch **`codex/audio-all`**. This is the meticulous, do-it-in-order guide to wire every sound into the game. Companion to `docs/AUDIO_INTEGRATION.md` (overview) and `docs/AUDIO_GAP_ANALYSIS.md` (what's still missing). 2026-09-14._

> **Task for the integrator:** for each row in the tables below, (1) add the sample to the bank, (2) hook it at the named game event. Work top to bottom. Every file already exists on this branch as a ready `.mp3`. Nothing here needs new art or new recordings except the handful in the gap doc.

---

## 0. How the sound bank works (read once)

- The bank is **`src/core/samples.js` → `MANIFEST`**. One row per sample:
  ```js
  'sample.name': { f: ['sub/path/stem', 'sub/path/stem2'], g: 0.6, loop: false, reach: 150 },
  ```
  - `f` — array of file basenames **without extension**; the loader fetches `public/audio/<basename>.mp3`. Sub-paths work (`sfx-cc0/final/gun_ak_a` → `public/audio/sfx-cc0/final/gun_ak_a.mp3`). **Multiple files = the engine alternates** (variety).
  - `g` — gain (0–1). `loop: true` — a bed/loop (drive with `sampleLoop`, not `sample`). `reach` — spatial falloff distance for positional sounds.
- **Play a one-shot:** `audio.sample('sample.name', { pos, bus })` — returns true if it handled it. `pos` makes it positional; omit for non-positional (UI/combat confirms). `bus` is one of `sfx|music|voice|ambient|ui`.
- **Play a loop:** `const h = audio.sampleLoop('sample.name'); h.set(intensity, pos); … h.stop();` — create on start, `set` each frame, `stop` on end. Register the loop in `_sus` (the watchdog) — `sampleLoop` already does.
- **Preload hot cues:** add high-frequency names to `HOT_SET` in samples.js so they're decoded before first use (list at the end).
- **Format:** everything on this branch is **44.1k mono 96 kb/s MP3** — the format the bank already uses. (The ai-pass batch shipped as WAV; `tools/ai-pass-to-mp3.mjs` already converted all 131 to MP3 beside the WAVs. Use the `.mp3`.)

---

## 0.5 ⚠ TWO audio systems — vehicles/weather/aircraft/reloads use the OTHER one

Most of the game uses the sample bank (Path A) above. But **vehicles, aircraft, weather, reloads and the scout gun call a SECOND system** — the SoundLibrary (`audio.soundLibrary.play('hyphen-id')`, `src/core/sound-library.js`) — which plays a **placeholder oscillator by default.** Pasting `veh.*` into the sample bank does NOT fix them. For those rows (§2.10 vehicles, §2.12 weather, and the aircraft/scout-gun/reload call sites), you must **re-point the call site** from `audio.soundLibrary.play('scout-gunshot')` to `audio.sample('wpn.saw', {pos})`, or bind the recording into the SoundLibrary. See `docs/AUDIO_GAP_ANALYSIS.md` §0 and §4 for the exact call sites (`scout-gunner.js`, `frontline-aircraft.js`, `systems.js`, `firearm-ammo.js`, …). Everything else in this spec is a normal Path-A bank paste.

## 1. The dedupe rule (do this first, it decides which rows you use)

Several things are covered by BOTH a real CC0 take and an AI (ai-pass) take. **Robert's ruling: use the REAL CC0 for these; they graded "top tier".** The AI batch's unique value is the powers/flight/distant/gear layer nothing else has.

| Overlap | USE (winner) | Drop (loser) |
|---|---|---|
| Bullet impacts (glass/metal/wood/concrete/water/flesh) | **CC0** `impact.*` | ai-pass `hit-*` |
| Footsteps concrete / grass / dirt | **CC0** `step.concrete2 / step.grass2 / step.dirt` | ai-pass `step-concrete/dirt` |
| Guns ak/m16/smg/saw/pistol/bolt/battle/pump | **CC0** `wpn.*` | ai-pass `wpn-*` (same ids) |
| Melee body hit | **CC0** `melee.flesh` | ai-pass `hit-flesh` |

ai-pass **uniquely** covers (no CC0 rival — use ai-pass): footsteps **gravel / water / wood**, guns **magnum / auto12 / m107**, all **gear/mines/blades**, **ricochet / whizby**, **powers/charge/flight/distant/weather**.

---

## 2. MASTER WIRING TABLE

Format: **sample name** · file basename(s) (under `public/audio/`) · gain · where to fire it. `loop` where noted. Source batch in the last column (CC0 = real, AI = ai-pass, OWN = operation-v1 synth).

### 2.1 Firearms — fire sound per weapon (`src/data/armory.js` FIREARMS ids)
Hook: the weapon-fire path (`rifle`-type ability firing → `audio.gunshot(...)`). Play the weapon's sample **when it fires**, positional. Keep the existing per-weapon synth `VOICES` as a fallback/layer if desired, but the recorded sample is the lead.

| sample | file(s) | g | armory id | src |
|---|---|---|---|---|
| `wpn.ak` | `sfx-cc0/final/gun_ak_a`, `gun_ak_b` | .55 | ak | CC0 |
| `wpn.m16` | `sfx-cc0/final/gun_ar15_a` | .55 | m16 | CC0 |
| `wpn.smg` | `sfx-cc0/final/gun_smg_a` | .55 | mp5, pdw | CC0 |
| `wpn.saw` | `sfx-cc0/final/gun_smg2_a` | .55 | saw, machinepistol | CC0 |
| `wpn.pistol` | `sfx-cc0/final/gun_pistol2_a` | .55 | p9 | CC0 |
| `wpn.bolt` | `sfx-cc0/final/gun_bolt_a` | .55 | m24 | CC0 |
| `wpn.battle` | `sfx-cc0/final/gun_battle_a` | .55 | battle | CC0 |
| `wpn.pump` | `sfx-cc0/final/sfx_shotgun_fire_a` | .55 | pump, auto12 | CC0 |
| `wpn.pump.rack` | `sfx-cc0/final/sfx_shotgun_pump_a` | .55 | shotgun rack/cock (play on reload/ready) | CC0 |
| `wpn.magnum` | `ai-pass/final/wpn-magnum` | .55 | magnum | AI |
| `wpn.auto12` | `ai-pass/final/wpn-auto12` | .55 | auto12 (or reuse wpn.pump) | AI |
| `wpn.m107` | `ai-pass/final/wpn-m107` | .55 | m107 (.50 — framed as cannon) | AI |

### 2.2 Bullet impacts — by surface (hook: projectile impact in `projectiles.js`, pick by surface hit)
| sample | file(s) | g | fire when | src |
|---|---|---|---|---|
| `impact.glass` | `sfx-cc0/final/sfx_impact_glass_a/_b/_c` | .7 | bullet hits glass | CC0 |
| `impact.metal` | `sfx-cc0/final/sfx_impact_metal_a` | .7 | bullet hits metal | CC0 |
| `impact.wood` | `sfx-cc0/final/sfx_impact_wood_a` | .7 | bullet hits wood | CC0 |
| `impact.concrete` | `sfx-cc0/final/sfx_impact_concrete_a/_b/_c` | .7 | bullet hits concrete/stone | CC0 |
| `impact.water` | `sfx-cc0/final/sfx_impact_water_a/_b/_c` | .7 | bullet hits water | CC0 |
| `impact.flesh` | `sfx-cc0/final/sfx_impact_flesh_a/_b` | .7 | bullet hits a fighter | CC0 |
| `ricochet` | `ai-pass/final/ricochet` | .55 | bullet ricochets off cover | AI |
| `whizby` | `ai-pass/final/whizby` | .55 | near-miss bullet pass-by the player | AI |

### 2.3 Footsteps — by surface (hook: run-cycle step in `entity._physics`, pick by ground surface)
| sample | file(s) | g | surface | src |
|---|---|---|---|---|
| `step.concrete2` | `sfx-cc0/final/sfx_step_concrete_a…_d` | .4 | concrete/asphalt (UPGRADE existing `step.concrete`) | CC0 |
| `step.grass2` | `sfx-cc0/final/sfx_step_grass_a…_d` | .4 | grass (UPGRADE existing `step.grass`) | CC0 |
| `step.dirt` | `sfx-cc0/final/sfx_step_dirt_a` | .4 | dirt/sand | CC0 |
| `step.gravel` | `ai-pass/final/step-gravel`, `step-gravel-v2` | .4 | gravel | AI |
| `step.water` | `ai-pass/final/step-water`, `step-water-v2` | .4 | shallow water | AI |
| `step.wood` | `ai-pass/final/step-wood`, `step-wood-v2` | .4 | wood decking | AI |
| `step.metal` | — **GAP** — | .4 | metal grate | see gap doc |

### 2.4 Melee (hook: `game.onHit` / `melee.js` on a connecting bare-fist hit)
| sample | file(s) | g | fire when | src |
|---|---|---|---|---|
| `melee.flesh` | `sfx-cc0/final/sfx_punch_flesh_a/_b` | .7 | bare-fist body hit connects | CC0 |
| `blade.parry` | `ai-pass/final/block-parry`, `block-parry-v2` | .55 | blade clash / parry | AI |
| `blade.slash.hard` | `ai-pass/final/evt-slash-hard` | .55 | blade hits armor/wall | AI |

### 2.5 Blades — swing (hook: swing of a `dmgClass:'slash'` weapon, by weapon id)
| sample | file | g | armory blade id | src |
|---|---|---|---|---|
| `blade.katana` | `ai-pass/final/blade-katana` | .55 | katana | AI |
| `blade.knife` | `ai-pass/final/blade-knife` | .55 | knife | AI |
| `blade.claws` | `ai-pass/final/blade-claws` | .55 | claws | AI |
| `blade.tomahawk` | `ai-pass/final/blade-tomahawk` | .55 | tomahawk | AI |
| `blade.nodachi` | `ai-pass/final/blade-nodachi` | .55 | nodachi | AI |
| `blade.draw` | `ai-pass/final/draw-blade`, `-v2` | .55 | unsheathe | AI |
| `blade.sheathe` | `ai-pass/final/sheathe-blade` | .55 | sheathe | AI |
| `evt.blade.thunk` | `ai-pass/final/evt-blade-thunk` | .55 | thrown blade embeds | AI |

### 2.6 Gadgets / gear (hook: `game.useItem` by kind, and armory gear use) — ⚠ these currently all play `audio.zap()`; replace
| sample | file | g | gadget/gear | src |
|---|---|---|---|---|
| `gear.frag` | `ai-pass/final/gear-frag` | .55 | frag detonation | AI |
| `gear.claymore` | `ai-pass/final/gear-claymore` | .55 | claymore detonation | AI |
| `gear.breach` | `ai-pass/final/gear-breach` | .55 | breach charge | AI |
| `gear.flashbang` | `ai-pass/final/gear-flashbang` | .55 | flashbang | AI |
| `gear.plate` | `ai-pass/final/gear-plate` | .55 | plate stops a bullet | AI |
| `gear.shield` | `ai-pass/final/gear-shield` | .55 | shieldpack impact | AI |
| `gear.beacon` | `ai-pass/final/gear-beacon` | .55 | beacon plant/arm | AI |
| `gear.ifak` | `ai-pass/final/gear-ifak` | .55 | medkit/ifak use | AI |
| `gear.jammer` | `ai-pass/final/gear-jammer` | .55 | jammer activate | AI |
| `gear.jammer.loop` | `ai-pass/final/gad-jammer-loop` | .4 (loop) | jammer running | AI |
| `gear.motion` | `ai-pass/final/gear-motion` | .55 | motion tracker ping | AI |
| `gear.mustard` | `ai-pass/final/gear-mustard` | .55 | mustard gas release | AI |
| `gear.teargas` | `ai-pass/final/gear-teargas` | .55 | tear gas release | AI |
| `gear.nvg` | `ai-pass/final/gear-nvg` | .55 | night-vision flip-on | AI |
| `gear.thermal` | `ai-pass/final/gear-thermal` | .55 | thermal activate | AI |
| `gear.thermal.loop` | `ai-pass/final/gad-thermal-loop` | .4 (loop) | thermal running | AI |
| `gear.rappel` | `ai-pass/final/gear-rappel` | .55 | rappel/grapnel deploy | AI |
| `gear.rappel.loop` | `ai-pass/final/gad-rappel-loop` | .4 (loop) | rappel reel-in | AI |
| `mine.arm` | `ai-pass/final/dep-mine-arm` | .55 | mine/spider-mine arm | AI |
| `mine.timer` | `ai-pass/final/dep-mine-timer` | .55 | mine countdown | AI |
| `mine.detonate` | `ai-pass/final/dep-mine-detonate` | .55 | mine detonate | AI |
| `mine.scuttle.loop` | `ai-pass/final/scuttle-loop` | .4 (loop) | spider-mine scuttling | AI |
| `evt.grenade.pin` | `ai-pass/final/evt-grenade-pin` | .55 | grenade pin pull | AI |
| `evt.grenade.bounce` | `ai-pass/final/evt-grenade-bounce` | .55 | grenade bounce | AI |

### 2.7 Powers / charging (hook: `abilities.js` — charge ability build-up + release)
| sample | file | g | fire when | src |
|---|---|---|---|---|
| `charge.bolt` | `ai-pass/final/charge-bolt`, `-v2` | .55 | charging a bolt/orb | AI |
| `charge.beam` | `ai-pass/final/charge-beam` | .55 | charging a big beam | AI |
| `charge.aura` | `ai-pass/final/charge-aura` | .55 | ki-aura charge (guard-charge) | AI |
| `charge.release` | `ai-pass/final/charge-release`, `-v2` | .55 | charged attack launches | AI |

> The wider ability set (`ai-pass/beam-clash, blast, construct, nanite-*, teleport, deflect, shield-raise/lower, grab, guard-break, heavy, light, miss, …`) mostly **duplicates sounds the game already makes**. Treat these as OPTIONAL upgrades — only swap one in if the current synth reads weak. The five the ai-pass author flagged as genuine native replacements are **heavy, light, grenade-release, weather-domain-thunder** (+1); the rest are preview-only.

### 2.8 Movement / flight (hook: `entity._physics` flight state)
| sample | file | g | fire when | src |
|---|---|---|---|---|
| `flight.loop` | `ai-pass/final/flight-loop` | .4 (loop) | while flying | AI |
| `flight.boost` | `ai-pass/final/flight-boost`, `-v2`, `-v3` | .55 | afterburner/boost burst | AI |
| `land.hero` | `ai-pass/final/land-hero` | .55 | heavy hero landing | AI |

### 2.9 Distant fire (hook: far-away combat; add speed-of-sound delay by distance)
| sample | file | g | fire when | src |
|---|---|---|---|---|
| `distant.rifle` | `ai-pass/final/distant-rifle`, `-v2` | .55 | far gunshot (delay by distance) | AI |
| `distant.explosion` | `ai-pass/final/distant-explosion` | .55 | far explosion (delay by distance) | AI |

### 2.10 Vehicles (hook: the vehicle controller — start/idle-loop/accel/off/doors/horn/brake/impact)
_Vehicle controller code lives on `codex/audio-content-pass` (scout-driving/ground-driving); wire there or wherever the drivable is implemented._
| sample | file(s) | g | event | src |
|---|---|---|---|---|
| `veh.start` | `sfx-veh/final/veh_start_a` | .6 | engine start | CC0 |
| `veh.idle` | `sfx-veh/final/veh_idle_a` | .5 (loop) | engine running | CC0 |
| `veh.accel` | `sfx-veh/final/veh_accel_a/_b` | .6 | hit the gas | CC0 |
| `veh.off` | `sfx-veh/final/veh_off_a` | .6 | stop/exit | CC0 |
| `veh.door.open` / `.close` | `sfx-veh/final/veh_door_open_a` / `veh_door_close_a` | .6 | enter / seated | CC0 |
| `veh.hood` | `sfx-veh/final/veh_hood_a/_b` | .6 | open panel | CC0 |
| `veh.trunk` | `sfx-veh/final/veh_trunk_a` | .6 | open trunk | CC0 |
| `veh.horn` | `sfx-veh/final/veh_horn_a` | .6 | horn | CC0 |
| `veh.brake` | `sfx-veh/final/veh_brake_a` | .6 | handbrake | CC0 |
| `veh.impact` | `sfx-veh/final/veh_impact_a/_b/_c` | .7 | vehicle takes damage | CC0 |

_Aircraft (helis, Quinjet) are already covered by the live `rotor`/`jet` soundscape layers — no new wiring._

### 2.11 Ambient beds (hook: the zone/district bed system — `loop:true`, drive with `sampleLoop`)
| sample | file(s) | g | zone | src |
|---|---|---|---|---|
| `amb.machinery` | `sfx-amb/final/amb_machinery_a` | .4 (loop) | industrial/works district | CC0 |
| `amb.bed` | `sfx-amb/final/amb_bed_a`, `amb_bed_b` | .35 (loop) | general zone atmosphere | CC0 |
| `gen.hum` · `amb.wind` · `amb.rain` · `amb.alarm` · `amb.water` | — **pending grade (#16)** — | | generator / wind / rain / alarm / water | CC0 |

### 2.12 Weather / mission (hook: weather state + mission events; ai-pass)
| sample | file | g | event | src |
|---|---|---|---|---|
| `weather.rain` | `ai-pass/weather-rain` | .4 (loop) | rain state | AI |
| `weather.domain.rain` | `ai-pass/weather-domain-rain` | .4 (loop) | weather-domain ult | AI |
| `weather.domain.thunder` | `ai-pass/weather-domain-thunder` | .55 | weather-domain thunderclap | AI |
| `mission.objective` | `ai-pass/objective` | .55 | objective ping | AI |
| `mission.record` | `ai-pass/record-start` | .55 | record/capture start | AI |
| `mission.sample` | `ai-pass/sample-recovery` | .55 | sample recovered | AI |
| `research.loop` | `ai-pass/research-loop` | .4 (loop) | research running | AI |
| `research.start` / `research.unlock` | `ai-pass/research-start` / `research-unlock` | .55 | research begin / unlock | AI |
| `ui.select` | `ai-pass/ui-select` | .55 | UI select (optional) | AI |

### 2.13 Operation loop — shields/scanner/portal/squad/pursuit/zombies (OWN synth)
These **already have a paste-ready bank block** and a full event map — do NOT re-derive. Use `public/audio/operation-v1/manifest.json → integration.sampleBankManifest` and wire the events per `docs/handoffs/operation-audio.md` §"Cue → event map" (it lists eventType, bus, dedup rule, cooldown for all 22). The 22 sample names are `op.hit.confirm · op.block.confirm · op.guard.break · op.shield.deploy/hit/collapse · op.scanner.acquire/lost · op.portal.ready/cross · op.squad.ready/regroup · op.pursuit.spotted/airborne/lost/search/reacquired · op.zombie.idle/alert/attack/hurt/death`. The cue definitions are already in `src/data/audio-cues.js` (`OPERATION_AUDIO_CUES`).

---

## 3. The ONE bit of new runtime code (operation radio)

Squad/pursuit reports (`op.squad.*`, `op.pursuit.*`) need a **radio-channel manager** so they don't spam: one channel, 1.2s min gap, higher priority preempts lower, yield while a spoken line plays. The exact numbers are in `OPERATION_AUDIO_POLICY` (exported from `src/data/audio-cues.js`). This is the only genuinely new code the audio needs; everything else is bank rows + event hooks. Details: `docs/handoffs/operation-audio.md` §"Integration instructions" step 3.

---

## 4. Paste-ready manifest blocks (don't hand-type)

Each batch already ships a `sampleBankManifest`-style block — copy from these into `MANIFEST`:
- **Guns / impacts / footsteps / melee (CC0):** `public/audio/sfx-cc0/final/winners-manifest.json → integration.sampleBankManifest` (paste-ready).
- **Vehicles (CC0):** `public/audio/sfx-veh/final/veh-winners.json` (sample names listed; files under `sfx-veh/final/`).
- **Ambient (CC0):** `public/audio/sfx-amb/final/winners-manifest.json → integration.sampleBankManifest`.
- **Operation (OWN):** `public/audio/operation-v1/manifest.json → integration.sampleBankManifest`.
- **ai-pass (AI):** no pre-baked block — build rows from §2 above (arsenal/blades/gear from `arsenal-manifest.json`, powers/flight/distant/steps from `world-sfx-manifest.json`, ability set from `docs/audio/ai-pass-manifest.json`). Paths are `ai-pass/…` / `ai-pass/final/…` (now `.mp3`).

---

## 5. HOT_SET (preload these — high-frequency)

Add to `HOT_SET` in samples.js: `wpn.ak, wpn.m16, impact.concrete, impact.flesh, impact.metal, melee.flesh, step.concrete2, step.grass2, ricochet, op.hit.confirm, op.block.confirm, op.shield.hit, op.pursuit.spotted, op.zombie.attack`.

---

## 6. Verify each wire

After wiring a batch: load the page, trigger the event, confirm the sound fires (an analyser tap or just listening in a foregrounded tab — a hidden pane can't measure a 40ms transient). The existing audio harness (`LSW.audioSuite()` in a foregrounded tab) spies the audio calls and can confirm a sample was requested. For guns, `audio.gunshot` + the new `wpn.*` sample should both fire (or the sample replaces the synth — integrator's call).

---

## Appendix — attribution (must appear on the credits/options screen when used)
- `amb.wind` — **CC-BY, InspectorJ / AntumDeluge** (Wind Loop, OpenGameArt).
- footstep surfaces sourced from congusbongus packs (if used) — **CC-BY, congusbongus**.
- Everything else: **CC0** (public domain) or **OWN** (operation-v1 = our DSP synthesis). ai-pass = AI-generated (ElevenLabs), license cleared to ship.
