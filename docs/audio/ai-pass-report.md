# AI Audio Pass — provenance & delivery report

**Branch:** codex/audio-content-pass · **Lane:** `public/audio/ai-pass/**`, `docs/audio/**`, this report. No combat/UI/vehicle/input/character code touched. Not merged, not deployed.

**Import package:** `artifacts/ai-audio-import.json` (`lsw.sound-library` v1, 3.92 MB < 4 MiB cap). **37 cues bound, 7 seamless loops.** Every binding decode-validated (durations 0.14–7.0 s).

**Provenance:** original AI generations, no third-party samples, no recorded/cloned voice. Generator: **ElevenLabs sound-generation** (loops native + PCM), a few **AudioX** one-shots (self-hosted GX10). Loops 7 s @ 22.05 kHz mono, constant-power crossfade seams. Confirm your ElevenLabs plan permits commercial/game use before shipping.

**No fake speech:** 15 dialogue/voice cues intentionally skipped.

## Bound cues (37)

| cue | kind | gain | source | wiring | prompt |
|---|---|---|---|---|---|
| `grab` | 1-shot | 0.55 | ElevenLabs | preview-only | Cloth snatch and compact body compression on a successful seize. Deliver an isol |
| `guard-break` | 1-shot | 0.55 | ElevenLabs | preview-only | Brittle defensive crack followed by a short descending energy collapse. Deliver  |
| `heavy` | 1-shot | 0.55 | cupcake AudioX | native-replacement | crack + weighty thud |
| `light` | 1-shot | 0.55 | ElevenLabs | native-replacement | A quick light hook landing on a torso: a crisp snappy impact with a tight body p |
| `miss` | 1-shot | 0.55 | ElevenLabs | preview-only | A fast empty swish with a dry cloth flick, no flesh impact. Deliver an isolated, |
| `beam-clash` | loop | 0.40 | ElevenLabs | preview-only | Two pressures colliding: restrained rough electrical crackle above a wavering lo |
| `blast` | 1-shot | 0.55 | ElevenLabs | preview-only | Short, clean energy crack with a small pressure tail. Lighter than a fully charg |
| `release` | 1-shot | 0.55 | ElevenLabs | preview-only | Compressed attack, heavy low body, broad outward tail. Scale with released charg |
| `shutdown` | 1-shot | 0.55 | ElevenLabs | preview-only | Cut the gathering loop or let the native released beam tail fall away. No new sh |
| `deflect` | 1-shot | 0.55 | ElevenLabs | preview-only | Bright compact snap at the redirection point. Existing native zap is available;  |
| `shield-lower` | 1-shot | 0.55 | ElevenLabs | preview-only | A smooth inward electrical fold with a small closing click. Deliver an isolated, |
| `shield-raise` | 1-shot | 0.55 | ElevenLabs | preview-only | Fast compact energy sheet opening with a soft resonant rim. Deliver an isolated, |
| `teleport` | 1-shot | 0.75 | ElevenLabs | preview-only | Compact inward cut and outward arrival impression; avoid a long masking tail. Th |
| `construct` | 1-shot | 0.55 | ElevenLabs | preview-only | Rising formation cast and solid arrival. Separate fracture/reform granules are r |
| `construct-fracture` | 1-shot | 0.55 | ElevenLabs | preview-only | Solid resonant crystal-like fracture with several short scattering pieces. Deliv |
| `nanite-break` | 1-shot | 0.55 | ElevenLabs | preview-only | Dry metallic crack followed by a short granular scatter. Keep it smaller than a  |
| `nanite-form` | 1-shot | 0.55 | ElevenLabs | preview-only | Fine metallic ticks converge into a compact mechanical locking plate. Deliver an |
| `nanite-reform` | loop | 0.40 | ElevenLabs | preview-only | Fine inward metallic ticks gathering into a restrained locking click. Do not loo |
| `blast-impact` | 1-shot | 0.55 | ElevenLabs | preview-only | Sharp initial rupture, weighty low-frequency body and decaying debris tail. Scal |
| `grenade-release` | 1-shot | 0.55 | ElevenLabs | native-replacement | Quick overarm cloth swish and tiny metal lever tick at hand release. No explosio |
| `gun` | 1-shot | 0.55 | ElevenLabs | preview-only | A single sharp rifle report: a fast percussive crack with a quick mechanical act |
| `flight` | loop | 0.40 | ElevenLabs | preview-only | Broad smooth rushing air and faint energy body following travel speed. Deliver a |
| `hover` | loop | 0.40 | ElevenLabs | preview-only | Quiet low floating pressure with a slow airy shimmer; steady with no thrust atta |
| `landing` | 1-shot | 0.55 | ElevenLabs | preview-only | Match material and impact weight: stone selects rubble, energy uses a generated  |
| `run` | 1-shot | 0.55 | ElevenLabs | preview-only | Firm fast heel contact, compressed body weight and brief gravel movement. Delive |
| `walk` | 1-shot | 0.55 | ElevenLabs | preview-only | Soft alternating boot sole taps with a small grit scuff; individual foot contact |
| `flyby` | 1-shot | 0.55 | ElevenLabs | preview-only | Rising approach roar crossing into a falling pitched departure and air wake. Del |
| `weather-domain-rain` | loop | 0.40 | ElevenLabs | native-loop | A localized ceiling of heavy rain with close droplets, soft wind and distant wet |
| `weather-domain-thunder` | 1-shot | 0.55 | ElevenLabs | native-replacement | A strong overhead crack rolling outward into a short low thunder rumble. No weap |
| `weather-rain` | loop | 0.40 | ElevenLabs | native-loop | Steady continuous rain: fine close droplets over a soft distant wash. No thunder |
| `record-start` | 1-shot | 0.55 | ElevenLabs | preview-only | Small tactile camera record latch with a crisp electronic confirmation. Deliver  |
| `objective` | 1-shot | 0.55 | ElevenLabs | preview-only | Warm concise two-tone confirmation with a soft communication click. Deliver an i |
| `sample-recovery` | 1-shot | 0.55 | ElevenLabs | preview-only | Sealed vial click, soft device confirmation and tiny fluid movement. Deliver an  |
| `research-loop` | loop | 0.40 | ElevenLabs | preview-only | Restrained scanner hum and faint repeating analytic pulses. Deliver an isolated, |
| `research-start` | 1-shot | 0.55 | ElevenLabs | preview-only | Quiet laboratory scanner spin-up with small data ticks. Deliver an isolated, cle |
| `research-unlock` | 1-shot | 0.55 | ElevenLabs | preview-only | Measured ascending harmonic confirmation followed by a definite unlock click. De |
| `ui-select` | 1-shot | 0.55 | ElevenLabs | preview-only | Soft rounded tactile tick, short enough for repeated menu selection. Deliver an  |

## Notes / caveats (from your audition)

- **teleport** — 'needs to be louder' -> gain 0.75
- **blast-impact** — you noted 'metallic'; bound anyway
- **gun** — bound gun_r2_b2 (your 'single-fire hunting rifle'), not the 'cheap pistol'
- **heavy** — 'like a final punch'
- **blast__2** — you tagged it 'PISTOL' — a candidate for the gun/pistol cue if you want it there
- **empty** — every candidate rejected (incl. gun dry-fire fold); left UNBOUND.

## Alternates kept (multi-pick cues; in `candidates/` for a one-line swap)

- **grab** → bound `grab__1`, alt: grab__2
- **guard-break** → bound `guard-break__1`, alt: guard-break__2
- **heavy** → bound `heavy_ax`, alt: heavy_ax3
- **light** → bound `light_r3_snap1`, alt: light_r3_dull1
- **deflect** → bound `deflect__1`, alt: deflect__2
- **construct** → bound `construct__1`, alt: construct__2
- **nanite-break** → bound `nanite-break__1`, alt: nanite-break__2
- **nanite-form** → bound `nanite-form__1`, alt: nanite-form__2
- **gun** → bound `gun_r2_b2`, alt: gun_el_b1 / gun_r3_b2
- **weather-rain** → bound `rain_el_a`, alt: rain_el_b / rain_el_c
- **objective** → bound `objective__1`, alt: objective__2
- **ui-select** → bound `ui-select__2`, alt: ui_from_heavy_b1 (menu-tick fold)

## Cues where you rejected EVERY candidate — need a fresh take

`charge (inaudible)`, `beam`, `depleted`, `melee-recovery`, `reload / reload-eject / reload-insert / reload-chamber`, `empty`, `heavy-weapon`, `broadcast`, `highlight`, `objective-complete`, `return-sample`, `ui-confirm`, `ui-denied`

## Remaining unmapped cues (candidates exist in the harness, no winner yet)

`charge`, `beam`, `contact`, `beam-cover-contact`, `swing`, `guard`, `depleted`, `weather-vortex`, `weather-thunder`, `grenade-prepare`, `boost`, `brake`, `windup`, `throw`, `melee-recovery`, `reload`, `reload-eject`, `reload-insert`, `reload-chamber`, `empty`, `heavy-weapon`, `scout-gunshot`, `environment-hit`, `rotor`, `jet`, `vehicle-explosion`, `broadcast`, `highlight`, `objective-complete`, `return-sample`, `ui-confirm`, `ui-denied`

## Wiring status

Asset delivery only — nothing wired into gameplay by this pass. Each cue's `wiring` says how to connect it: `native-replacement`/`native-loop` = chosen recording replaces/feeds the native event on import; `preview-only` = asset delivered, event mapping pending (main AI wires it). Loops are seamless, meant to run continuously at the listed gain.
