# Voice Lines & Sound Effects Manifest

> ⚠ **STRUCK 2026-07-28 — THE AUDIO CONTRACT KILLS THE TTS PLAN.** This document once said barks are
> *"generated per-character with country-appropriate accents (Ad Lab voice pipeline)"* — i.e. 52 × 8
> AI-TTS lines via `generate-voice.js`. Robert's ruling is **"generated sounds for all attacks, NO AI
> sounds"**, and the audio contract (audio.js header · `docs/AUDIO_SOURCES.md` ·
> `docs/powerworld/aaa-07-audio.md` §0) forbids any AI audio model. **Hero voice lines are OUT unless
> a human records them.** `audio.heroVoice` is `false` by default and `yell/grunt/cry` all gate on it.
> The engine never implemented the TTS pipeline (nothing in `src/` calls `generate-voice.js`), so
> nothing is ripped out — but the plan below is a WRITING PROMPT for human VO or a reference, never an
> instruction to synthesise. The bark TEXT is kept because a human could record it; the *pipeline* is
> gone. The SFX table at the foot is superseded by `src/core/samples.js` MANIFEST (300 CC0 files
> already shipped) and `docs/AUDIO_SOURCES.md`.

Living Superweapon — the audio bible. Voice-line TEXT below is a script for HUMAN recording only;
there is no AI/TTS generation path. Keep barks under ~2.5s. `[ ]` = delivery note.

## Bark slots (every character records these 8)

1. **intro** — match start
2. **kill** — scored a KO
3. **firstblood** — first KO of the match
4. **lowhp** — dropped under 28%
5. **drained** — ki hit zero mid-attack
6. **overdrive** — refilled ki with fists
7. **ult** — firing the R ability
8. **tierup** — crossing a power tier

## Sample lines (per character, voice-casting notes)

### SOL (USA, warm Kansas drawl)
- intro: "Plenty of daylight left."
- kill: "Stay down. Please."
- drained: "Clouds... need a minute of sun."
- tierup: "Now THAT'S a sunrise."

### VEGA (imperious, clipped)
- intro: "You are already beneath me."
- kill: "As expected."
- drained: [disgusted] "Impossible—!"
- ult: "FINAL... FLASH!"

### VOLT (motor-mouth, fast)
- intro: "Try to keep up. You won't."
- kill: "Didn't-even-see-it-did-you?"
- overdrive: "Batteries? I AM the battery!"

### KIVULI (Uganda, low, measured, Luganda-accented English)
- intro: "Breathe deep, my friend."
- kill: "The air keeps what it takes."
- ult: [whisper] "Asphyxia."
- tierup: "Kampala remembers."

### TITAN (vocoded, flat German cadence)
- intro: "Combat protocol. Consent recorded."
- kill: "Target archived."
- drained: "Battery critical."
- overdrive: [error tone] "Improvised recharge. Inefficient. Effective."

### SARGE (gravel, tired)
- intro: "No cape. Don't need one."
- kill: "Chalk one."
- lowhp: "Been worse. Not much worse."
- ult: "Danger close — hit the deck!"

### GALE (UK, dry)
- intro: "One quiver. Twenty of you. Seems fair."
- kill: "Told you it was poisoned."
- ult: "Sky's full — sorry."

### KRAKEN (Ghana, coastal, slow-rolling)
- intro: "The deep is patient. I am not."
- kill: "The tide takes everything."

(…every remaining hero gets the same 8 slots — as a HUMAN VO script only; the `generate-voice.js`
AI-TTS path is struck, see the header.)

## Announcer (already partially implemented via hud.announce)
- "FIRST BLOOD" · "DOUBLE KO" · "TRIPLE KO" · "QUAD KO" · "RAMPAGE" · "UNSTOPPABLE" · "GODLIKE"
- "TIER I/II/III/MAX — [NAME] ASCENDS"
- "GUARD CRUSH" · "DEFLECT" · "FROZEN" · "SLAM"
- Mode calls: "WAVE [n]" · "VICTORY" · "DEFEAT" · "TIME"

## SFX manifest (needed / current source)

| System | Sound | Status |
|---|---|---|
| Melee | jab whiff, jab hit, straight hit, HAYMAKER windup hum, haymaker hit (bassy), guard-crush shatter | synth `audio.zap/impact` — needs bespoke samples |
| Guard | guard raise hum, block tick, barrier drone (loop), deflect PING, guard break glass | partial (`zap`) |
| Ki | charge loop (have), drained fizzle (have), overdrive slurp per fist, no-ki dud (have) | partial |
| Beams | hose loop, clash grind loop, overpower blast | synth — clash loop needed |
| Slam | wall crunch, ground crater thud, border boom | reusing `impact/boom` |
| Frost | freeze crystallize, frozen heartbeat muffle, shatter | `zap(180/90)` placeholder |
| Gas | veil hiss loop, solidify THUNK, gas-form exhale | needed |
| Portals | door open (orange), door open (blue), pass-through whoosh | `teleport` placeholder |
| Guns | pulse shot, hand-cannon bark, arrow loose, arrow draw creak, arrow impact thunk | `blast/zap` placeholder |
| Tentacles | lash whip, seize grip, constrict creak | needed |
| World | grass rustle (wind bed), debris crumble (have), block shatter (have) | partial |
| UI | tier-up sting, select hover, threat-badge reveal | needed |

Priority order for real samples: haymaker/guard-crush → slam → freeze/shatter → deflect ping → portal doors.
