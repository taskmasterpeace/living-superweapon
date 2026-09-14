# 🕳️ AUDIO GAP ANALYSIS — what's still missing / weak

_Branch **`codex/audio-all`**. Companion to `docs/AUDIO_WIRING_SPEC.md` (how to wire what we HAVE) and `docs/AUDIO_INTEGRATION.md` (overview). Verified against the live engine, 2026-09-14._

> Plain version: most of the game's sound is **on the shelf but not switched on**. On top of that there's a real shopping list of sounds that don't exist anywhere yet. This doc is that shopping list, plus the one structural gotcha that explains why things sound wrong today.

---

## 0. THE GOTCHA — two audio systems, and half the game uses the placeholder one

There are **two independent sound paths** in the code, and this is the single most important thing to understand before wiring:

- **Path A — the sample bank.** `audio.sample('name')` → `src/core/samples.js` `MANIFEST`. Real recordings. This is what punches, booms, ki, footsteps, UI already use. **The wiring spec targets this.**
- **Path B — the SoundLibrary.** `audio.soundLibrary.play('hyphen-id')` → `src/core/sound-library.js`. **By default it plays a crude oscillator-sweep + noise PLACEHOLDER** (`sound-library.js:112`). It only plays a real file if someone *bound* one through the authoring UI (localStorage; nothing bound by default).

**Vehicles, aircraft, weather, reloads and the scout gun all call Path B — so they play placeholder synth in the shipped game right now.** Pasting `veh.*` into the sample bank does NOT fix them, because those call sites don't read the bank. Each Path-B call site needs one of:
- **(preferred) re-point** the call from `audio.soundLibrary.play('scout-gunshot')` to `audio.sample('wpn.saw', {pos})`, or
- **bind** the recording into the SoundLibrary so its id resolves to a real file.

Every one of the seven staged batches is **UNWIRED** — grep of `src/` finds zero of the new sample names in the MANIFEST or any call site. The batches ship paste-in blocks nobody has pasted.

---

## 1. TRUE CONTENT GAPS — no take exists anywhere, must be sourced

These need new audio (source as CC0, or accept an AI take). Nothing on any branch covers them.

| # | Gap | Where it fires | Fix |
|---|---|---|---|
| 1 | **Rocket / missile LAUNCH whoosh** | Anti-Armor Rocket · Rocket Boots · Micro-Missiles · Seeker Micro-Missiles launch. Impacts are covered; the *launch* isn't. (`abilities.js` meteor uses a synth `blast(1500)`, not a whoosh.) | Source **2–3 CC0 whooshes** (heavy rocket vs micro-swarm). |
| 2 | **Weapon reloads** | `firearm-ammo.js:40/48/54` — `reload / reload-eject / reload-insert / reload-chamber / empty (dry-fire)`. Only the shotgun **pump/cock** exists (sfx-cc0). | Source a **CC0 reload set** (mag out/in, bolt, dry-fire click). Real content gap. |
| 3 | **Tank cannon + track loop** (WILL TANK) | `construct-tank.js:158` fires the cannon with a generic synth `audio.blast(600)`; track loop is a `rolling` stand-in. | Source a **CC0 tank cannon** + a tracked-vehicle loop. |
| 4 | **Turret servo hum** | turret aim/rotate — no sample. | A soft servo loop (could reuse the pending `gen.hum` / `amb.machinery`). |
| 5 | **Beam-vs-cover contact** | `data/audio-cues.js` id `beam-cover-contact` — direction-only, never recorded. | Source or synth a sizzle-on-cover. |

---

## 2. STAGED BUT NOT GRADED — real CC0 candidates exist, need a pick/lock pass

The recordings are downloaded and auditionable; they just need Robert (or anyone) to pick winners, same as the guns/vehicles rounds.

- **5 ambient beds** — `gen.hum` (generator), `amb.wind`, `amb.rain`, `amb.alarm`, `amb.water`. Tracked in **issue #16**. (`amb.machinery` + `amb.bed` already locked.)
- **sfx-cc0b round 2** (`public/audio/sfx-cc0b/`, ~80 real-CC0 candidate files, ungraded) covers several things listed elsewhere as gaps: **shell casings**, footstep **metal / water / mud / tile / gravel**, **vehicle door/boost/impact**, **blade slash + slash-into-flesh**. Grade + lock these (a `sfx-cc0b-lock.mjs` like the others) and gaps #below shrink. ⚠ ricochet/whizby in that batch are labelled **synth** — no real CC0 ricochet exists anywhere.

---

## 3. STAGED BUT UNWIRED — takes exist, just wire them (see the wiring spec)

Nothing to source; these are done, just not switched on. Full mapping in `docs/AUDIO_WIRING_SPEC.md`.
- **Firearms** (real CC0 `wpn.*` + AI for magnum/auto12/m107) — today the game plays a synth plate-crack (`audio.gunshot`), not the recordings.
- **Bullet impacts / footsteps / melee flesh** (real CC0) — wired nowhere.
- **Gadgets/gear** — ⚠ 8 of 10 items are `audio.zap()` at different pitches today (`game.js` `useItem`, 3203–3307). Real one-shots are staged (`ai-pass` gear-ifak/jammer/nvg/thermal/mustard/teargas/beacon/frag/claymore/breach/flashbang/plate/shield + running loops). Each `useItem` kind needs its own.
- **Powers / charge / flight / distant / blades** (ai-pass) — staged, unwired.
- **Operation loop** (shields/scanner/portal/squad/pursuit/zombies) — owned DSP, unwired; events not emitted yet.

---

## 4. PATH-B PLACEHOLDER CALL SITES — re-point these (this is where the game sounds worst today)

Each of these plays the oscillator placeholder right now. Fix = re-point to `audio.sample()` with the staged recording, or bind into the SoundLibrary.

| Call site | Plays today | Wire to |
|---|---|---|
| `frontline-aircraft.js:140` | `soundLibrary.play('rotor'/'jet', {loop})` = sawtooth sweep | a real heli/jet loop (or the soundscape `rotor` layer) — **no recording staged; minor gap** |
| `scout-gunner.js:71`, `aircraft-combat.js:70/79` | `'scout-gunshot'` placeholder | `wpn.saw` / `wpn.ak` (real CC0, staged) |
| `frontline-convoy.js:118`, `aircraft-combat.js:114` | `'vehicle-explosion'` placeholder | `boom.deep` + `veh.impact` |
| drivable scout (start/idle/accel/brake/door/crash) | Path-B placeholder | `veh.*` (sfx-veh, real CC0, staged) |
| `systems.js:159/188`, `weather-layer.js:90`, `weather-vortex.js` | `'weather-rain'/'weather-thunder'/'weather-domain-thunder'/'weather-vortex'` placeholder | `amb.rain` (pending) + AI `weather-*` (staged) |
| `firearm-ammo.js:40/48/54` | `'reload*'/'empty'` placeholder | **no recording — content gap #2** |

⚠ Some of these controllers (aircraft/convoy/scout driving) live on `codex/audio-content-pass`; confirm the exact file/line on the branch you integrate on.

---

## 5. DOUBLE-COVERED — pick ONE (Robert prefers the real CC0)

| Family | Winner (use) | Losers (drop) |
|---|---|---|
| Bullet impacts (7 surfaces) | **real CC0** `impact.*` (sfx-cc0) | ai-pass `hit-*`, sfx-gaps DSP |
| Footsteps (8 surfaces) | **real CC0** `step.*` (sfx-cc0 + sfx-cc0b) | ai-pass `step-*`, sfx-gaps DSP |
| Firearms | **real CC0** `wpn.*` where it exists; AI for magnum/auto12/m107/kuchler | sfx-gaps DSP |
| Shell casings | **real CC0** (sfx-cc0b) — closes the gap ai-pass punted on | sfx-gaps DSP |
| Vehicle impact/door/boost | **real CC0** (sfx-veh / sfx-cc0b) | sfx-gaps DSP |
| Ricochet / whiz-by | **no real CC0 anywhere** — audition AI (ai-pass) vs DSP | — |

There is a **third, DSP-synth copy** of impacts/footsteps/ballistic/shotgun/vehicle in `public/audio/sfx-gaps/` (superseded — kept for reference). Don't wire it; it's the "Atari" set Robert rejected.

---

## 6. DELIBERATELY SYNTH — not gaps, by design (leave unless upgrading)

- **Beam sustained voice** (`beamVoice()`) and **non-fire cone sustains** (`gas/ice/acid/drain/phase/bow` — only `fire` resolves to a recording). Parameter-driven synth, not placeholder. AI alternatives exist (`ai-pass beam-clash/charge-beam`) if you want to swap.
- **Incidental power zaps** (teleport/deflect/guard/evade). ai-pass has recorded/AI alternatives for most.
- The two-tone **siren**, the **radio filter chain**, **squelch**, the **KMK 9 sting**, and **civilian formant speech** stay synth on purpose (no sample improves them).

---

## The short shopping list (if you only read one thing)
**Source as CC0:** (1) rocket/missile launch whoosh ×2–3 · (2) weapon reload set · (3) tank cannon + track loop · (4) turret servo · (5) beam-on-cover sizzle · (6) a real heli/jet loop.
**Grade + lock (already downloaded):** the 5 ambient beds (#16) · sfx-cc0b round-2 (casings, metal/mud/tile/water footsteps, vehicle door/boost/impact, blade slash/flesh).
**Everything else is wiring** — follow `AUDIO_WIRING_SPEC.md`.
