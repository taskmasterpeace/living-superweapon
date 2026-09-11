# External audio production handoff — September 10, 2026

Produce an original audio asset delivery for Living Superweapon / PowerWorld. This is asset production and validation, not runtime integration. Baseline: `db5b9c945cffc4acfa6d9fa2f32a62662ecae033`, audited in `D:/lsw/.worktrees/sarge-authoring-integration`.

## Isolated checkout and ownership

Run in PowerShell. If the destination or branch already exists, inspect it; do not delete, reset or overwrite it.

```powershell
git -C D:/lsw cat-file -t db5b9c945cffc4acfa6d9fa2f32a62662ecae033
git -C D:/lsw worktree add -b codex/audio-asset-delivery D:/lsw/.worktrees/audio-asset-delivery db5b9c945cffc4acfa6d9fa2f32a62662ecae033
Set-Location D:/lsw/.worktrees/audio-asset-delivery
git rev-parse HEAD
git status --short
npm ci
```

You are not alone in the repository. Preserve others' work. Own **only** new files under:

- `assets-src/audio-delivery/`: masters, runtime derivatives, import packages and listening reels.
- `docs/audio-delivery/`: authoritative brief snapshot, provenance, coverage and validation reports.
- `tools/audio-delivery/`: packaging and validation utilities.

Do not edit `src/`, the source catalogs, runtime, gameplay, animation, equipment, existing `public/audio/`, package manifests or unrelated files. Do not commit dependency changes or other agents' work. Use `apply_patch` for text/code edits. Do not merge your branch into another branch.

## Read the actual contracts first

Paths below are relative to your checkout:

- `src/data/sound-library.js`: `SOUND_CUES`, exact IDs and wiring; `generationBrief()` at line 78.
- `src/data/audio-cues.js`: original directions, two beam families and 14 original dialogue candidates.
- `src/core/sound-library.js`: importer, playback envelope, local storage, speech gate and limits.
- `src/core/samples.js`: separate legacy `MANIFEST` and MP3 loader.
- `src/core/audio.js`: native mixer, spatial behavior and selected melee replacement.
- `src/engine/firearm-ammo.js`, `src/engine/throwable-action.js`: equipment event timing authority.
- `docs/COMPLETION_LEDGER.md:93`: future generated audio is permitted; historical blanket prohibitions are superseded. This does not authorize purchases.
- `docs/AUDIO_SOURCES.md`: existing recording provenance; do not assume its CC0 claims apply to new assets.

Produce the authoritative brief and ID list with these commands; preserve their output in `docs/audio-delivery/` using your delivery-owned exporter. Do not retype the IDs from memory.

```powershell
node --input-type=module -e "import {generationBrief} from './src/data/sound-library.js'; console.log(JSON.stringify(generationBrief(),null,2))"
node --input-type=module -e "import {SOUND_CUES} from './src/data/sound-library.js'; console.log(SOUND_CUES.length); console.log(SOUND_CUES.map(c=>c.id).join('\n'))"
```

The baseline contains **82 cues**: **12 native one-shot/replacement routes**, **4 native loops**, and **66 preview-only entries**. All have audible synthesized preview recipes. Importing recordings does not connect unwired events to gameplay. The generation brief is `lsw.sound-generation-brief`, version 1; it is not the import package.

## Production order and coverage

First deliver the **16 wired cues**, then the remaining **66**, retaining the complete 82-cue delivery as the outcome:

| Native use | Exact IDs |
| --- | --- |
| Melee contact replacements | `light`, `heavy` |
| Weather one-shot | `weather-thunder` |
| Grenade phases | `grenade-prepare`, `grenade-release` |
| Firearm mechanics | `reload`, `reload-eject`, `reload-insert`, `reload-chamber`, `empty` |
| Vehicle one-shots | `scout-gunshot`, `vehicle-explosion` |
| Owned native loops | `weather-vortex`, `weather-rain`, `rotor`, `jet` |

The remaining 66 include all 14 dialogue candidates and catalog bindings for beams, ordinary gunshots, movement, nanites, correspondent/research/UI and other actions. Existing native audio may already serve an action, but its Sound Library binding can still be preview-only. Report that distinction explicitly.

Deliver one selected production recording per current ID. Follow each brief's duration, loop flag and direction; report justified deviations. Separate charge, release, sustain, contact and shutdown. Use the narrow/pressure beam directions as production references; do not claim the supplied stills establish source-game audio. Loops must be seamless and contain no baked pass-by or repeated impact unless the brief explicitly requires it. Avoid music/unrelated voices in isolated effects.

Create consistent original voices for the four dialogue personalities. Preserve all 14 supplied lines and their exact IDs. The synthesized markers do not speak those lines. Do not impersonate known performers. Record distinct nonverbal effort, pain, KO and short/long charge shouts as supplemental assets if expanding voice coverage; there is no importable standalone `yell` ID or per-hero voice-pack resolver. Do not inject unknown IDs into the package. Document proposed new mappings in a supplemental manifest for later integration.

Audit coverage against the separate **72 legacy SampleBank families** (266 referenced unique stems; 300 existing files in `public/audio/`). Map delivered assets to existing samples/DSP, preview-only bindings and missing hooks. This audit must identify gaps; it does not authorize replacing or modifying the legacy bank. The legacy loader fetches `audio/<stem>.mp3`; it does not load this package or arbitrary WAV paths.

## Equipment and voice integration boundaries

Reload is separate preparation, magazine release, magazine seat and chamber sounds, not a baked full reload. `requestReload` emits start; `updateFirearmReload` owns subsequent cues. Imported motion `mag-out`, `mag-in` and `bolt`/`chamber` events provide phase timing; procedural fallback is .20/.65/.90 of reload duration. Interruptions cancel pending phases. `beginThrowAction` owns grenade preparation; `resolveThrowRelease` emits the release cue when the held projectile actually releases, using imported `grenade-release` timing where available. Never add a parallel audio event clock or emit sounds from equipment mesh loading.

Speech suppression exists as a tested harness: 8s global gap, 45s same-line cooldown, 12s category cooldown, 3s expiry, no immediate repeat, context/paused checks and priority checks. Speaker gaps: default/Sol 18s, Vega 24s, Titan 30s, Sarge 22s, Decibel 10s. There is no wired gameplay dialogue dispatcher. The gate uses catalog duration, not imported clip duration; long lines need later integration review.

3D distance and camera-relative pan are implemented when playback receives a world position; audition bypasses them. Generic library reach defaults to 150; package settings cannot author reach or a talk/shout mode. Optional native `yell()` remains DSP, defaults off through `heroVoice=false`, and uses reach 190 plus a 1.4–1.9s per-fighter gate. Recorded native pain/KO cues are separate and precede that synth flag. Do not claim new recorded dialogue or yell behavior is live from a successful import.

## Output and exact import schema

Use WAV masters and compact MP3 derivatives (`audio/mpeg`) for the package. Suggested asset subdirectories: `masters/`, `runtime/`, `packages/`, `demos/`. Place provenance and coverage under `docs/audio-delivery/`. Keep originals and processing recipes recoverable.

The following is a structural example; replace the descriptive base64 placeholder with actual bytes and include all selected cue bindings:

```json
{
  "format": "lsw.sound-library",
  "version": 1,
  "bindings": {
    "light": {"name": "light.mp3", "type": "audio/mpeg", "data": "ACTUAL_RAW_BASE64_BYTES"}
  },
  "settings": {
    "light": {"source": "chosen", "gain": 0.55, "loop": false}
  }
}
```

Bindings accept `name`, `type`, raw base64 `data`; no data-URL prefix or external path. MIME allowlist: `audio/wav`, `audio/x-wav`, `audio/wave`, `audio/mpeg`, `audio/ogg`, `audio/webm`, `audio/mp4`, `audio/flac`; actual browser decoding must succeed. Each recording must be **32 bytes–1 MiB**, **positive duration ≤30s**; the entire serialized JSON must fit **4 MiB**. Settings accept only `gain` (0–1), `loop` (boolean), `source` (`chosen`/`placeholder`). Unknown IDs fail validation. Keep provenance, additional variants and proposed event metadata outside this package.

**Import replaces the entire library; it does not merge packages.** Produce one complete package within the limit. If that is impossible at acceptable quality, document it and deliver explicitly alternative audition subsets; do not claim sequential imports install the whole collection. Local storage is `lsw.sound-library.v1`; reload an already-open PowerWorld page after changing recordings. Studio exports `powerworld-sound-library.json` and `powerworld-sound-generation-briefs.json`.

## Provenance and authorization

For each asset record source/provider/model or recording session, exact prompt, date, license/terms reference, applicable performer consent, processing, filename, duration, format and checksum. Do not label generated assets CC0 without evidence. Existing source-ledger status does not transfer to new audio. Use only available generation access within explicit user authorization; no paid generation, credit purchases or subscriptions without such authorization. If access is absent, report the exact production dependency; do not fabricate completed audio or silently substitute a placeholder.

## Acceptance and return

Validate all files with actual browser decoding and the exact existing importer: IDs/counts, size/duration limits, corruption rejection and export/import round-trip. Create delivery-owned validators. Existing `tools/sound-library-browser.mjs`, `tools/frontline-native-audio-input.mjs`, `tools/studio-audio-reel.mjs` illustrate infrastructure; their synthetic fixtures are not proof of your assets. Baseline focused verification passed 24/24 tests; it was not a listening acceptance of this future delivery.

Run the game in your isolated checkout on a free port, for example `npm run dev -- --port 5181`, and use `/studio.html` and `/powerworld.html`. Do not operate another agent's server. Audition every delivered recording through the actual Sound Library and record labeled listening reels. Review clipping, unintended silence, intelligibility, attack quality, truncation and seamless loops. The existing harness applies its own attack/fade envelope to recordings; report audible defects without changing runtime. Include isolated assets plus contextual near/far/left/right examples for already-wired cues. Demonstrate native reload/grenade phase alignment without new emitters. Pause/mute/stop/disposal must retire owned loops; no autoplay. Report what was actually listened to and any tools/access preventing listening; signal measurements alone are not a listening review.

Commit only your three owned directories, with a clean focused message and no Co-Authored-By line. Return branch and commit, the complete package path, authoritative brief snapshot, 82-ID coverage matrix, legacy-family gap mapping, provenance/license report, labeled reels, exact validation commands/results and unresolved integration dependencies. Keep preview-only and supplemental assets clearly labeled. A successful import is not evidence that all gameplay audio has been replaced.
