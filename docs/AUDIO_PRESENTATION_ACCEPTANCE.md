# Audio presentation acceptance

Current runtime mapping audit, 2026-09-15. **Subjective listening is unverified.** Decoder checks, event tests and file provenance do not prove that a mix sounds good. No listening-capable tool was identified in this session. Native browser death inspection also does not constitute audio acceptance.

| Native event | Actual selected files under public/audio | Actor / weapon | Heard and accepted? |
|---|---|---|---|
| Rifle report | sfx-cc0/final/gun_ar15_a.mp3 | M16 / ar556; generic gunshot fallback | No; mapping tested |
| AK report | sfx-cc0/final/gun_ak_a.mp3, gun_ak_b.mp3 | ak762 | No; mapping tested |
| Pistol report | sfx-cc0/final/gun_pistol2_a.mp3 | pistol9 | No; mapping tested |
| Shotgun report | sfx-cc0/final/sfx_shotgun_fire_a.mp3 | shotgun12 | No; mapping tested |
| Concrete steps | sfx-cc0/final/sfx_step_concrete_a..d.mp3 | Ground actors | No; source files tested |
| Grass steps | sfx-cc0/final/sfx_step_grass_a..d.mp3 | Ground actors | No; source files tested |
| Physical contact | sfx-cc0/final/sfx_punch_flesh_a/b.mp3 | Native melee / block default | No; event tests only |
| Charge sustain | ai-pass/final/charge-aura.mp3 | AudioBus.charge callers | No; mapping changed from old engineCircular family |
| Flight sustain | ai-pass/final/flight-loop.mp3 | SoundLibrary flight cue | No; runtime mapping tested |
| Beam sustain | spaceEngineLow_000..004.mp3 | AudioBus.beamVoice | No; older recorded family remains, replacement needs correct sustain selection |
| Vehicle idle | sfx-veh/final/veh_idle_a.mp3 | Wheeled FleetAudio | No; native boarding/idle lifecycle tests |
| Reload | No bundled phase recording mapped | Magazine weapons | Missing; no placeholder substituted |
| Tracked propulsion | No accepted tracked loop mapped | Tank | Missing; car engine intentionally not assigned |

Known cold sample events now suppress synthetic substitution without replaying stale events. Generic gun reports select the approved M16 family. SoundLibrary runtime rejects unavailable recordings; explicit authoring audition can still play placeholder recipes. Charge/beam cold loops no longer start oscillator substitutes. Existing source assets remain intact.

Highwall now awaits `g.audio.prepareSamples()` and `g.audio.soundLibrary.prepare()` before closing its loading screen. The existing gesture handler resumes browser audio separately, so a suspended autoplay context cannot trap a direct-link launch forever. `HOT_SET` includes firearm, library and vehicle families plus common steps/impacts. Missing-source gaps remain separate from preload readiness.

No `public/audio/sfx-gaps/` file was added to the runtime bank. These changes are not a claim that every legacy synthesized method has been replaced. Reloads, tracked propulsion, older beam sustain and subjective listening remain explicit acceptance gaps.

## Native capture

`artifacts/highwall-audio/native-footsteps-fire-reload.webm` records native W walking, left-mouse fire and R reload from the live Highwall master bus. Original audio output remained connected. Browser errors: zero. Final native rifle ammunition: 30 loaded / 172 reserve (8 rounds fired then reloaded).

The recording is 5.33 seconds, Opus 48 kHz stereo, 87,236 bytes. FFmpeg measured mean -38.4 dB and peak -13.4 dB: a non-silent output signal, **not subjective listening acceptance**. Runtime reload/eject/insert/chamber events explicitly reported `recording-not-decoded` because no default phase recordings are mapped. Those phases were silent rather than synthetic.
