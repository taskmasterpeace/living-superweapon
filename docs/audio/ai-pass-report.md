# AI Audio Pass — provenance & delivery report

**Branch:** codex/audio-content-pass  ·  **Owner lane:** `public/audio/ai-pass/**`, `docs/audio/**`, this report. No combat/UI/vehicle/input/character code touched. Not merged, not deployed.

**Import package:** `artifacts/ai-audio-import.json` (format `lsw.sound-library` v1, 3.83 MB, under the 4 MiB cap). 33 cues bound, 7 seamless loops. Validated: every binding decodes; durations 0.14–7.0 s.

**Generators / provenance:** All original AI generations, no third-party samples, no recorded or cloned human voice. Primary generator **ElevenLabs sound-generation** (loops use its native `loop`, kept as PCM); a few one-shots from **AudioX** (self-hosted, cupcake GX10). Loops compressed to 7 s @ 22.05 kHz mono, seams via constant-power crossfade. **Use terms:** confirm your ElevenLabs plan permits commercial/game use of generated SFX before shipping; AudioX is self-hosted (open model).

**No fake speech:** the 15 dialogue/voice cues were intentionally skipped (separate authored category per the handoff).

## Bound cues

| cue | kind | gain | source | wiring | prompt |
|---|---|---|---|---|---|
| `grab` | 1-shot | 0.55 | ElevenLabs | preview-only | Cloth snatch and compact body compression on a successful seize. Deliver an isolated, clea |
| `guard-break` | 1-shot | 0.55 | ElevenLabs | preview-only | Brittle defensive crack followed by a short descending energy collapse. Deliver an isolate |
| `heavy` | 1-shot | 0.55 | cupcake AudioX | native-replacement | crack + weighty thud |
| `light` | 1-shot | 0.55 | ElevenLabs | native-replacement | A soft light gut-punch: a dull low muffled body thud with minimal high end, close and shor |
| `miss` | 1-shot | 0.55 | ElevenLabs | preview-only | A fast empty swish with a dry cloth flick, no flesh impact. Deliver an isolated, clean one |
| `beam-clash` | loop | 0.40 | ElevenLabs | preview-only | Two pressures colliding: restrained rough electrical crackle above a wavering low roar. De |
| `release` | 1-shot | 0.55 | ElevenLabs | preview-only | Compressed attack, heavy low body, broad outward tail. Scale with released charge. This is |
| `shutdown` | 1-shot | 0.55 | ElevenLabs | preview-only | Cut the gathering loop or let the native released beam tail fall away. No new shutdown sam |
| `deflect` | 1-shot | 0.55 | ElevenLabs | preview-only | Bright compact snap at the redirection point. Existing native zap is available; a bespoke  |
| `shield-raise` | 1-shot | 0.55 | ElevenLabs | preview-only | Fast compact energy sheet opening with a soft resonant rim. Deliver an isolated, clean one |
| `teleport` | 1-shot | 0.75 | ElevenLabs | preview-only | Compact inward cut and outward arrival impression; avoid a long masking tail. This describ |
| `construct` | 1-shot | 0.55 | ElevenLabs | preview-only | Rising formation cast and solid arrival. Separate fracture/reform granules are requested a |
| `construct-fracture` | 1-shot | 0.55 | ElevenLabs | preview-only | Solid resonant crystal-like fracture with several short scattering pieces. Deliver an isol |
| `nanite-break` | 1-shot | 0.55 | ElevenLabs | preview-only | Dry metallic crack followed by a short granular scatter. Keep it smaller than a full-body  |
| `nanite-form` | 1-shot | 0.55 | ElevenLabs | preview-only | Fine metallic ticks converge into a compact mechanical locking plate. Deliver an isolated, |
| `nanite-reform` | loop | 0.40 | ElevenLabs | preview-only | Fine inward metallic ticks gathering into a restrained locking click. Do not loop through  |
| `blast-impact` | 1-shot | 0.55 | ElevenLabs | preview-only | Sharp initial rupture, weighty low-frequency body and decaying debris tail. Scale with the |
| `grenade-release` | 1-shot | 0.55 | ElevenLabs | native-replacement | Quick overarm cloth swish and tiny metal lever tick at hand release. No explosion; the lat |
| `gun` | 1-shot | 0.55 | ElevenLabs | preview-only | A single sharp rifle report: a fast percussive crack with a quick mechanical action click  |
| `flight` | loop | 0.40 | ElevenLabs | preview-only | Broad smooth rushing air and faint energy body following travel speed. Deliver an isolated |
| `hover` | loop | 0.40 | ElevenLabs | preview-only | Quiet low floating pressure with a slow airy shimmer; steady with no thrust attack. Delive |
| `landing` | 1-shot | 0.55 | ElevenLabs | preview-only | Match material and impact weight: stone selects rubble, energy uses a generated whisper, a |
| `run` | 1-shot | 0.55 | ElevenLabs | preview-only | Firm fast heel contact, compressed body weight and brief gravel movement. Deliver an isola |
| `walk` | 1-shot | 0.55 | ElevenLabs | preview-only | Soft alternating boot sole taps with a small grit scuff; individual foot contact. Deliver  |
| `flyby` | 1-shot | 0.55 | ElevenLabs | preview-only | Rising approach roar crossing into a falling pitched departure and air wake. Deliver an is |
| `weather-domain-rain` | loop | 0.40 | ElevenLabs | native-loop | A localized ceiling of heavy rain with close droplets, soft wind and distant wet splashes. |
| `weather-domain-thunder` | 1-shot | 0.55 | ElevenLabs | native-replacement | A strong overhead crack rolling outward into a short low thunder rumble. No weapon chirp,  |
| `weather-rain` | loop | 0.40 | ElevenLabs | native-loop | Steady continuous rain: fine close droplets over a soft distant wash. No thunder, no music |
| `sample-recovery` | 1-shot | 0.55 | ElevenLabs | preview-only | Sealed vial click, soft device confirmation and tiny fluid movement. Deliver an isolated,  |
| `research-loop` | loop | 0.40 | ElevenLabs | preview-only | Restrained scanner hum and faint repeating analytic pulses. Deliver an isolated, clean sea |
| `research-start` | 1-shot | 0.55 | ElevenLabs | preview-only | Quiet laboratory scanner spin-up with small data ticks. Deliver an isolated, clean one-sho |
| `research-unlock` | 1-shot | 0.55 | ElevenLabs | preview-only | Measured ascending harmonic confirmation followed by a definite unlock click. Deliver an i |
| `ui-select` | 1-shot | 0.55 | ElevenLabs | preview-only | Soft rounded tactile tick, short enough for repeated menu selection. Deliver an isolated,  |

## Notes / caveats (from your audition)

- **teleport** — you said 'needs to be louder' -> gain raised to 0.75
- **blast-impact** — you noted 'metallic' -> bound anyway; say the word for a fleshier/energy version
- **gun** — bound gun_r2_b2 (your 'single-fire hunting rifle'), NOT gun_el_b1 ('cheap pistol')
- **shutdown** — first take was silent -> regenerated
- **heavy** — 'like a final punch'
- **empty** — you rejected every `empty` candidate (incl. the gun dry-fire fold); left **UNBOUND**. Regenerate on request.

## Alternates kept (multi-pick cues; in `candidates/` for a one-line swap)

- **grab** → bound `grab__1`, alt: grab__2
- **heavy** → bound `heavy_ax`, alt: heavy_ax3
- **construct** → bound `construct__1`, alt: construct__2
- **nanite-break** → bound `nanite-break__1`, alt: nanite-break__2
- **nanite-form** → bound `nanite-form__1`, alt: nanite-form__2
- **gun** → bound `gun_r2_b2`, alt: gun_el_b1 / gun_r3_b2
- **weather-rain** → bound `rain_el_a`, alt: rain_el_b / rain_el_c
- **ui-select** → bound `ui-select__2`, alt: ui_from_heavy_b1 (your menu-tick fold)

## Rejected

beam__1, depleted__2, melee-recovery__1/2, reload*/reload-eject/insert/chamber, empty__1/2, empty_from_gun_ax, heavy-weapon__1/2, light_r3_meaty1/2, gun_r3_a1/a2/b1, ui-denied__1

## Remaining unmapped cues (candidates generated, awaiting your pick)

These have ElevenLabs candidates in the audition harnesses but no winner yet:

`charge`, `beam`, `contact`, `beam-cover-contact`, `blast`, `swing`, `guard`, `depleted`, `weather-vortex`, `weather-thunder`, `grenade-prepare`, `boost`, `brake`, `windup`, `throw`, `melee-recovery`, `shield-lower`, `reload`, `reload-eject`, `reload-insert`, `reload-chamber`, `empty`, `heavy-weapon`, `scout-gunshot`, `environment-hit`, `rotor`, `jet`, `vehicle-explosion`, `record-start`, `broadcast`, `highlight`, `objective`, `objective-complete`, `return-sample`, `ui-confirm`, `ui-denied`

## Wiring status

Asset delivery only — nothing is wired into gameplay by this pass. Each cue's `wiring` above says how the main/integration AI should connect it: `native-replacement` / `native-loop` = the chosen recording replaces/feeds the existing native event on import; `preview-only` = asset delivered, event mapping still to be wired by the main AI. Ambient loops need owner/zone lifecycle integration by the main AI; fade/loop guidance: loops are seamless and meant to run continuously at the listed gain.

## How to load

1. Open `sound-library.html`. **Export your existing library first** — import **replaces** the package.
2. Use the Import control → select `artifacts/ai-audio-import.json`. The browser decodes/validates durations and lets you audition.
3. Use a fresh browser profile for a clean test.
