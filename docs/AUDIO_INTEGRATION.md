# 🎧 AUDIO — one branch, and how to make it play in the game

_Branch: **`codex/audio-all`**. Everything below is on this one branch now. 2026-09-14._

---

## Plain version (read this first)

Three separate batches of new game sound used to live on three different branches. **They are all on ONE branch now** (`codex/audio-all`), so an integrator has a single place to pull from.

**Nothing is turned ON in the game yet.** This branch is the *shelf* — all the sound is here, labelled, with pick-lists. Actually making the game play it is one more step (paste a small manifest block per batch — recipe below). That step was left separate on purpose so consolidating the audio couldn't accidentally change how the game plays.

There is **one thing to clear before any of the AI batch can ship** — see the gate right below.

---

## ⚠ The one gate before shipping

- **The AI batch (`ai-pass`) is AI-generated (ElevenLabs).** Confirm commercial / in-game license **before it ships in a build.** Until that's confirmed, ship only the CC0 / owned batches (everything else here is clean).
- **Attribution required** — these must appear on the options/credits screen when used:
  - `amb.wind` — CC-BY, InspectorJ / AntumDeluge (Wind Loop, OpenGameArt)
  - footstep surfaces (gravel/metal/water/mud) — CC-BY, congusbongus
  - Everything else is **CC0** (public domain) or **owned** (operation-v1 is our own DSP synthesis).

---

## What's on this branch

| Batch | What it covers | Files | How made | License | Graded / locked? |
|---|---|---|---|---|---|
| **operation-v1** | shield deploy/hit/collapse · scanner · portal · squad radio · pursuit · zombie · hit/block/guard-break confirms | 22 cues (built mp3s + WAV masters) | our own deterministic DSP synth | **owned / CC0-able** | delivered |
| **sfx-cc0** (guns/impacts/steps) | real gun fires · shotgun + cock · bullet impacts (7 surfaces) · footsteps · melee flesh | 34 locked | **real CC0 recordings** | CC0 | ✅ Robert-graded, locked |
| **sfx-veh** (vehicles) | start/idle/accel/off · doors/hood/trunk · horn/brake · impact | 15 locked (11 events) | **real CC0** | CC0 | ✅ locked |
| **sfx-amb** (ambient loops) | wind push-indicator · rain · generator hum · machinery · zone beds · alarms · water | machinery + bed **locked**; 5 beds pending | **real CC0** (wind CC-BY) | CC0 / CC-BY wind | ⚠ partial — see #16 |
| **ai-pass** (powers/arsenal/world) | beams/charge/construct/nanite/shield/teleport · 40+ arsenal weapons & gear · flight · distant fire · weather | 131 | **AI (ElevenLabs)** | ⚠ **confirm license** | staged |
| _baseline (already LIVE on master)_ | UI · voices · the current combat SFX these replace | 72 families / 266 | CC0 packs | CC0 | live |

---

## How the game plays a sound (the wiring recipe)

The game's sound bank is **`src/core/samples.js` → `MANIFEST`**. Each entry is:

```js
'sample.name': { f: ['basename1', 'basename2'], g: 0.6, loop: false },
```

- `f` = the mp3 basenames (subpaths like `sfx-cc0/final/wpn_ak_a` work); files load from `public/audio/<basename>.mp3`. Multiple = alternate.
- `g` = gain. `loop: true` for beds.
- The game plays it with `audio.sample('sample.name', {pos})` (one-shot) or `audio.sampleLoop('sample.name')` (bed).

**To wire a batch:** paste its ready-made bank block into `MANIFEST`, then point the matching game events at those sample names. That's the whole job — nothing in the combat pipeline needs a new branch.

Each locked batch already ships a **paste-ready `sampleBankManifest`** inside its winners file (below), so you don't hand-write the entries.

---

## By game element — which batch to use

⚠ **Where a real recording and an AI take both exist for the same thing (impacts, footsteps, ricochet, casings), use the REAL CC0** — Robert graded those "top tier" over the AI ones. The AI batch's unique value is the superhero/power/flight/distant layer nothing else has.

| Game element | Use | Pick-list file |
|---|---|---|
| Guns / arsenal (the 13 real weapons) | **real CC0** where Robert picked; AI for the rest of the gear | `public/audio/sfx-cc0/final/winners-manifest.json` |
| Bullet impacts (7 surfaces) · footsteps · melee flesh | **real CC0** | `public/audio/sfx-cc0/final/winners-manifest.json` |
| Vehicles (11 events) | **real CC0** | `public/audio/sfx-veh/final/veh-winners.json` |
| Ambient zone beds (machinery, room tone) | **real CC0**, `loop:true` | `public/audio/sfx-amb/final/winners-manifest.json` |
| Generator hum · wind · rain · alarm · water beds | **pending grade** | issue #16 |
| Operation loop (shields/scanner/portal/squad/pursuit/zombies) | **operation-v1** (owned) | `public/audio/operation-v1/manifest.json` + cue→event map in `docs/handoffs/operation-audio.md` (the cues are already defined in `src/data/audio-cues.js`) |
| Powers / beams / charge / nanite / shield / teleport | **ai-pass** ⚠license | `docs/audio/ai-pass-manifest.json` |
| Arsenal gear / mines / gadget loops / blades | **ai-pass** ⚠license | `public/audio/ai-pass/final/arsenal-manifest.json` |
| Flight loop/boost · land-hero · distant rifle/explosion · weather | **ai-pass** ⚠license (unique to it) | `public/audio/ai-pass/final/world-sfx-manifest.json` |

---

## Open items

1. **Ambient — 5 beds still to grade + lock** (`gen.hum`, `amb.wind`, `amb.rain`, `amb.alarm`, `amb.water`). Tracked in **issue #16** — grade all five in one pass, add to `PICKS` in `tools/sfx-amb-lock.mjs`, re-run.
2. **Content gap: a rocket / missile LAUNCH whoosh** (2–3 weights). Impacts + distant artillery are covered; the launch whoosh isn't. Sourceable as CC0.
3. **ai-pass license confirmation** — blocks that batch from shipping. Everything else can go without it.
4. The ai-pass **"import package" tool** (`src/core/sound-library.js`, `sound-library.html`) stayed on `codex/audio-content-pass` — it's a tool, not needed to wire the assets. Pull it separately if wanted.

---

## What this branch deliberately does NOT include

`codex/audio-content-pass` (where the AI audio came from) also carries a large amount of **non-audio game work** — building-delivery, a squad-transport model, driving/convoy, campaign panels, `vite.config.js` and ~80 engine/core files. **None of that was brought in.** Only the AI *sound assets + their manifests* were taken, so consolidating the audio does not touch the build or the engine. If any of that game work is wanted, it's a separate merge decision, not an audio one.
