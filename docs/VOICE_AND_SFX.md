# Voice Lines & Sound Effects Manifest

Living Superweapon — the audio bible. Voice lines are written to be generated per-character with
country-appropriate accents (Ad Lab voice pipeline). Keep barks under ~2.5s. `[ ]` = delivery note.

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

(…every remaining hero gets the same 8 slots; generate with `generate-voice.js` per accent.)

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
