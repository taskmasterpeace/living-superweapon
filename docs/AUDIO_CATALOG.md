# 🎧 MASTER AUDIO CATALOG — PowerWorld / Living Superweapon

_Every game sound we have, categorized, with source · license · status · integration target — so the
merge uses all of it and nothing gets lost. Updated 2026-09-13._

Five bodies of audio work exist across three branches. **None is wired into gameplay yet** — this is
the reconciliation an integrator needs to merge cleanly and pick the best source where they overlap.

## The streams

| # | Stream | Branch | Count | How made | License | Status |
|---|---|---|---|---|---|---|
| 1 | **Baseline (LIVE)** | `master` | 72 families / 266 files | CC0 packs (Kenney, OpenGameArt) | CC0 | ✅ in game now |
| 2 | **ai-pass** — ability + arsenal + world-SFX | `codex/audio-content-pass` | 37 + 43 + 27 = **107** | **AI** (ElevenLabs + AudioX) | mostly CC0-*intent*; ⚠ confirm ElevenLabs commercial-use | staged, unwired |
| 3 | **operation-v1** — ops cues | `codex/pw-operation-audio` | 22 | deterministic synth (owned) | owned/CC0-able | staged, unwired |
| 4 | **sfx-cc0** — real recordings (R1) | `codex/audio-sfx-gaps` | 34 locked + 75 candidates | **real CC0 recordings** | CC0 | ✅ Robert-graded, locked |
| 5 | **sfx-cc0b / sfx-veh** — real recordings (R2+veh) | `codex/audio-sfx-gaps` | 80 + 19 | **real CC0** (+2 synth) | CC0 (footsteps CC-BY congusbongus; ricochet/whizby synth) | grading now |

⚠ **Overlap is the whole reason this doc exists**: streams 2, 4 and 5 all cover bullet impacts,
footsteps, ricochet and casings. Robert graded the **real recordings (4/5) as "top tier"** over the AI
ones — so for those categories, prefer the real CC0. The AI stream's *unique* value is the superhero /
power / distant layer nothing else has.

## Coverage by game function — what we have, and the source to use

| Function | Best source to use | Also exists (fallback / overlap) | Status |
|---|---|---|---|
| **Guns / arsenal** (13 weapons) | **Real CC0 fires** (sfx-cc0 final: wpn.ak/m16/smg/saw/pistol/bolt/battle) where Robert picked; **real shotgun fire + cock** | ai-pass arsenal 43 (AI) for the rest (gear, mines, gadget loops, blades) | ✅ real guns picked; AI covers gear |
| **Shotgun** | **Real** fire (Mossberg) + **real cock** (sfx-cc0) — the cock never existed before | ai-pass wpn-auto12 (AI, "burst-y") | ✅ locked |
| **Bullet impacts** (flesh/metal/wood/glass/concrete/water/dirt) | **Real CC0** (sfx-cc0 final) | ai-pass world-SFX hit-* (AI) — same 7 surfaces | ✅ real locked; drop AI dupes |
| **Ricochet / whiz-by** | **audition both** — ai-pass (AI) vs sfx-cc0b (synth). No real CC0 exists anywhere. | — | ⚠ pick better; neither is a real recording |
| **Shell casings** | **Real** metal-tink (sfx-cc0b) — ai-pass left this "from elsewhere" | — | ✅ mine fills the gap |
| **Footsteps** (concrete/grass/dirt/gravel/metal/water/mud/tile) | **Real CC0** (sfx-cc0 + sfx-cc0b) — 8 surfaces | baseline concrete/grass; ai-pass step-* (AI); ai-pass left step-metal "from elsewhere" (mine fills it) | ✅ real covers all surfaces |
| **Melee** (jab/heavy/grab/guard-break/swing) | baseline + ai-pass ability (light/heavy/grab/guard-break/miss) | — | ✅ |
| **Blade** (swing/slash/draw/sheathe/parry) | ai-pass (draw-blade/sheathe/block-parry) + **real** slash swishes + slash-into-flesh squish (sfx-cc0b) | baseline swing.blade | ✅ complementary |
| **Powers / abilities** | ai-pass ability 37 (beams/charge/construct/nanite/shield/teleport) + ai-pass world charge-bolt/beam/aura/release | operation-v1 (shield deploy/hit/collapse) | ✅ |
| **Flight / movement** | ai-pass world flight-loop / flight-boost / land-hero + baseline footsteps | — | ✅ unique to AI |
| **Distant cues** | ai-pass world distant-rifle / distant-explosion (speed-of-sound delay) | — | ✅ unique to AI |
| **Vehicle** (start/idle/accel/off/doors/hood/trunk/horn/brake/impact) | **Real CC0** (sfx-veh, this session) — nobody else has vehicle | — | 🆕 grading now |
| **Operation loop** (shield dome, scanner, portal, squad radio, pursuit, zombies) | operation-v1 (22) | — | ✅ unique |
| **UI / stingers / doors / voices** | baseline (72 families) | — | ✅ live |
| **Gadgets / mines** | ai-pass arsenal (gear one-shots, mine arm/timer/detonate, gadget loops) | — | ✅ |
| **Weather / mission** | ai-pass ability (weather-rain/domain, record/objective/research/sample-recovery) | operation-v1 scanner/portal | ✅ |
| **Ambient zone beds** (wind / rain / machinery loops) | — | — | ❌ **GAP — not built** |

## Vehicle spec — a way to describe what you're hearing
(sfx-veh, this session — one low-bitrate CC0 car; grade at the vehicle Artifact, then I'll source higher-quality + more vehicle types.)

| Event | Fires when… | Should sound like |
|---|---|---|
| `veh.start` | player starts the vehicle | ignition — starter cranks, engine catches, settles to idle |
| `veh.idle` (LOOP) | engine running/parked | steady low rumble, seamless loop under the vehicle |
| `veh.accel` | player hits the gas | RPM climbs — the boost / pull-away |
| `veh.off` | stop / exit | engine powers down and dies |
| `veh.door.open` / `.close` | enter / seated | handle+hinge open · thunk+latch close |
| `veh.hood` / `veh.trunk` | open panels | metal creak + latch |
| `veh.horn` | horn input | honk |
| `veh.brake` | handbrake | ratchet pull |
| `veh.impact` | vehicle takes damage | metal crunch + debris (a real car-crash pack would beat this) |

**Vehicle wishlist (not yet sourced):** higher-quality engine, tire screech/skid, more vehicle TYPES
(truck, motorcycle, aircraft — some overlap with the existing rotor/jet in baseline). Say the word.

## Coverage confirmation — do we have everything?

**Yes — a complete, playable soundscape exists across the streams for every core game action:** guns,
shotgun (incl. the cock), bullet impacts on every surface, footsteps on every surface, melee, blades,
powers/beams/charge, flight, landings, distant fire, casings, the operation loop (shields/scanner/
portal/squad/pursuit/zombies), gadgets/mines, weather/mission, UI, and now vehicles.

**The only true remaining gaps (all optional/polish):**
1. **Ambient zone beds** — wind / rain / machinery loops (the other agent offered these; nobody's built them).
2. **Real ricochet / whiz-by** — genuinely no CC0 exists; we have AI (ai-pass) and synth (mine) versions to pick from.
3. **Vehicle depth** — one low-q car so far; higher quality + more vehicle types + tire screech.
4. **A few AI-arsenal guns** Robert didn't replace with real fires (fine as-is, or replace later).

**So: the other "doing the sounds" conversation can close.** The missing-SFX list is covered; what's
left is polish that can happen post-merge.

## Merge notes (for the integration owner)
- Three branches carry unwired audio: `codex/audio-content-pass` (AI: powers/arsenal/world),
  `codex/pw-operation-audio` (ops cues), `codex/audio-sfx-gaps` (real CC0: guns/impacts/footsteps/
  vehicle/casings + handoffs).
- **Where they overlap (impacts, footsteps, ricochet, casings), prefer the REAL CC0** per Robert's grade.
- Per-branch integration handoffs: `docs/audio/INTEGRATION-HANDOFF.md` (ai-pass), `docs/handoffs/
  operation-audio.md` (ops), `docs/handoffs/sfx-cc0.md` + `final/winners-manifest.json` (real CC0).
- Add a `docs/AUDIO_SOURCES.md` row for each new pack; footstep surfaces need the CC-BY (congusbongus) credit.
- Nothing is wired or merged; do not present unwired assets as live gameplay.
