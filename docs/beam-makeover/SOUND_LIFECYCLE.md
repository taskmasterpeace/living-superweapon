# The Sound Lifecycle — element-true, five phases (Refs #42, L2/L3)

Robert's ruling (2026-09-16, twice): **a fire impact must never sound like an ice impact.**
The unit of sound identity is **ELEMENT × PHASE**, and every power resolves to a recipe in
that table, with per-ability overrides on top.

## The five phases

| Phase | What it is | Today (measured, aaa audio sweep) |
|---|---|---|
| **CHARGE** | spool-up while held | ONE shared voice for every power in the game (`audio.charge(pos)` — no identity argument) |
| **RELEASE** | the moment it leaves the hand | 3 shared samples pitched by a scalar (`kiRelease`/`blast`/`zap`) |
| **TRAVEL** | the projectile/beam in flight | **SILENCE for projectiles** (verified: no loop is created at spawn); beams share ONE `beamVoice()` loop |
| **IMPACT** | contact/detonation | one shared `boom(power)` for every explosive power |
| **SHUTDOWN** | a sustained emitter closing | ad-hoc (loop `stop()` fades); no voiced tail |

(The phase names align with the `BEAM_SOUND_DIRECTIONS` sketches the concurrent session left
in `src/data/audio-cues.js` — charge/release/sustain/impact/shutdown — so the two efforts
speak one vocabulary. TRAVEL generalizes "sustain" to things that fly away from you.)

## The carrier: `sfx.js` finally gets its wire

`src/data/sfx.js` already derives a 4-axis voice for every ability (ATTACK family from shape ·
GRAIN from material · BODY Hz from mass×rank · TAIL seconds from range+blast), benched at
≥190 distinct vectors — **and is imported by nothing**. It becomes the DERIVED base layer:

```
voiceOf(ability, phase) =
  ELEMENT_PHASE_RECIPES[elementOf(ability)][phase]   // the table below — authored once per element
  ⊕ sfxOf(ability)                                   // per-ability body/grain/tail modulation (derived)
  ⊕ ability.sound?.[phase]                           // authored override — the lab edits this
```

`elementOf(a)` = `materialOf(a)` folded to the sound families:
fire · ice · shock · sonic · toxic/acid · arcane · physical/ballistic · **energy** (default ki).

## The recipe table (L3 content)

One row per element × phase; a recipe = layered samples from the consolidated banks
(`codex/audio-all`: Robert's "top tier" CC0 picks + the 131 ai-pass cues + operation set)
with rate/filter/gain shaping. Where no honest element-true source exists (most of ice,
electric arcs beyond `arc()`, sonic pressure), the gap goes on the ElevenLabs generation
brief (license CLEARED 2026-09-14; **no API key in this session's env** — briefs export from
the Sound Library tool and run when a key lands or via handoff to the audio agent).

Rule inherited from the audio tracker: **prefer REAL recordings over AI where both exist.**

## Engine work (the L2 loop, all at existing choke points)

1. **CHARGE** — `audio.charge(pos)` grows a voice argument: `charge(pos, voice)` where voice
   carries element + body Hz. Call sites: the paid-charge choke point + the growing-orb /
   kinetic / feed charge starts in `abilities.js` (4 sites, all already hold the ability).
2. **RELEASE** — replace the 3 shared one-shots at the fire moments (`abilities.js`
   projectile/quick-blast/charged/growing-orb/bow/gunshot sites + `projectiles.js`
   resolveLaunch) with `voiceOf(ab, 'release')`. The firearm `VOICES` path stays the model —
   it is already per-item and correct.
3. **TRAVEL — the empty stage.** A projectile with a travel voice creates a positional loop at
   spawn and drives it per frame with its own `pos` (`samples.js loop()` already re-evaluates
   pan + falloff per set() — a moving source needs NO new engine plumbing). Stop in `_dispose`
   (the one exit every projectile reaches). **Doppler-lite**: `rate = base × (1 − clamp(vRad/340u, -0.18, 0.18))`
   where vRad = radial velocity toward the listener — the fly-away pitch-drop Robert described
   (fires it, flies backward, it recedes AND drops). One multiply; never a real Doppler graph.
   Beams: `beamVoice(pos)` gains the same voice argument; the loop's timbral param maps to
   intensity I–III.
4. **IMPACT** — `_impact()`'s single `boom(power, p)` becomes `impact recipe + boom bed`:
   the element layer leads, the shared boom becomes the low bed under it. Same at the second
   detonation site + GrowingOrb. Melee already routes via `soundLibrary.native()` — the
   pattern to follow.
5. **SHUTDOWN** — sustained emitters (beam/cone/drain) voice their close: the loop's stop()
   fade plus a short element tail one-shot (steam hiss for fire, crack-tinkle for ice, static
   die-off for shock).

## Ability schema addition

`sound: { charge?, release?, travel?, impact?, shutdown? }` — each either a recipe id or an
inline `{ s: 'family', rate, gain, layer: [...] }`. **Zero abilities author it at ship; the
element table carries everything** — the field exists so the POWER LAB can author exceptions
(same law as `vis`/`vprofile`).

## Gates

- Extension of `LSW.audioSuite()`: fire an A/B pair (fire bolt vs ice bolt) per phase through
  the real engine and assert spectral distinctness on the analyser (the firearm-distinctness
  pattern); travel loop exists while a projectile flies and is silent after `_dispose`
  (0 orphans in `audio._sus`); Doppler sign flips between approach/recede.
- The catalog harness re-run with audio spies: every ability logs which phases voiced —
  the "silent stage" count is the L2 red/green.

## Coordination

- `src/data/audio-cues.js` + `src/core/sound-library.js` carry UNCOMMITTED work by a
  concurrent session in the main tree (BEAM_SOUND_DIRECTIONS, custom-cue support). This
  branch adopts the phase vocabulary and does NOT edit those two files until that work lands;
  reconcile at merge.
- Wiring-spec cross-ref: `docs/AUDIO_WIRING_SPEC.md` on `codex/audio-all` §2.7 covers the four
  generic charge cues — this system supersedes §2.7 with the element table; everything else
  in that spec (guns/gear/steps) is untouched.
