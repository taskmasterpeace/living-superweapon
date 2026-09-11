# Audio brief v2 — independent scoped review

Date: 2026-09-09. Read-only source/quality review; only this report was written. No implementation, audio runtime, Task4, git or browser harness changes. No agents or full-suite reruns.

## Verdict

**Structure/UX: approved within inspected evidence. Source-accuracy specification: corrections required.** The explicit attack type, phase, timing, playback and direction fields answer the user's request. Twenty entries, all fourteen legacy cue IDs and fourteen dialogue candidates remain in the real exported package. Native versus direction-only status, unrecorded nanite sounds/dialogue, still-derived beam directions and non-importable production export are clearly distinguished. Two materially inaccurate native descriptions should be corrected before calling the brief fully source-grounded; these need metadata changes, not new sound behavior.

## Findings

### P2 — Heavy impact names an explosion recording that native melee deliberately does not use

`src/data/audio-cues.js:24` identifies the current native source as `punch.heavy + boom.deep`. `AudioBus.meleeHit` at `src/core/audio.js:223` calls `impact`, then only for haymaker adds `land.flesh` delayed .035s and `hit.soft` delayed .012s. The adjacent native comment explicitly explains that the explosion sample was removed from body punches. A fresh direct call of the real `AudioBus.prototype.meleeHit` with power1.8/haymakertrue and a recording-only sample sink produced exactly `punch.heavy`, `land.flesh`, `hit.soft` and no `boom.deep`.

This is a production brief's current-asset mapping, so the error can direct a sound designer to restore the deliberately removed explosion layer. Name the actual conditional layers. The same timing sentence's “a miss has only its swing” is too absolute: heavy startup can also emit a native effort grunt/yell (`src/engine/melee.js:155`). Say that no impact is emitted on a miss; keep independent effort cues distinct.

### P2 — Native beam-contact cue incorrectly promises audio for every surface

`src/data/audio-cues.js:13` describes `beam hits a surface` with native pulse timing and `impact / zap`. The actual .18s pulse gate in `src/engine/projectiles.js:1616` only follows positive accepted Fighter damage or local metal contact; rejected immunity/phase/zero damage produces no pulse. Ordinary cover contact at `src/engine/projectiles.js:1444` damages cover and presents particles but does not call these sounds. Construct receiver presentation at `src/engine/summons.js:183` likewise does not add a beam contact sound.

A fresh native `BeamHose` probe stepped60frames at1/60s against one cover box (centerz25,hx5,hz8,top10,HP10000), with no Fighter target. It had54 reached blocked damage frames and43.19999999996 cover damage; first reached frame7 capped tip atz15.9999961853. Recording sinks received **zero impact/zap calls**. The probe uses the actual hose update and cover receiver branch, not a fake sound callback result.

Narrow this native entry to accepted Fighter/Guard/local-module contacts and identify wall/construct contact audio as a gap or future direction. Do not add a new runtime sound merely to make the metadata true.

### P3 — A few source lists are incomplete or name an inactive recording

- `src/data/audio-cues.js:17` lists `blast` but omits its actual `ki.blast` source (`src/core/audio.js:189`).
- `src/data/audio-cues.js:38` presents `gun.light` as a current `gunshot` source. The method at `src/core/audio.js:879` always uses `gun.crack` plus weapon-profile DSP body/tail/mechanism. `gun.light` exists in the sample catalog, but the scoped source search found no runtime user.
- `src/data/audio-cues.js:48` lists `land / impact` but leaves out stone's `rubble`, energy's generated whisper and `impact`'s punch-family choice. Clarify that the list is illustrative or enumerate the actual material-dependent choices.

These do not change playback, but correcting them makes an “exact native source” export more useful and avoids confusing available catalog assets with wired playback.

## Positively verified source boundaries

- Charge uses `engine.charge` and a retained loop handle; paid charge drives its ramp, release/cancel stops it. Native nanite launch cues remain deferred to validated emission; the review made no changes to that path.
- Sustained voice uses `engine.low`; source position/intensity update without a new loop per frame. Released beam uses its .08 voice intensity and stops on disposal, matching the shutdown description rather than claiming a new shutdown recording.
- Explosive `_impact` invokes `boom` at the actual detonation position; the ballistic branch disposes before explosion audio.
- Actual reflection calls `zap(760)`; denied and drained events use the documented120 and140/90 frequencies. Formation uses `power(true)` / `cast.spell`; teleport uses `fx.glitch`.
- Generic pain/KO uses `v.pain` / `v.roar`; optional yell DSP is separately gated. No candidate dialogue or future nanite audio is represented as performed speech.
- Native source labels and all dynamic direction text are escaped in `studio-main.js:223`. Opening the dialog pauses via the existing `playing` setter and sound gate; export creates the v2 JSON Blob and does not invoke AudioBus. Closing restores previous playback, rather than forcing new playback for a paused user.

## Evidence and limits

Read `docs/STUDIO_AUDIO.md`, current `src/data/audio-cues.js`, the provided honest-additions patch snapshot, exact dialog/import/export source, relevant native AudioBus methods and actual ability/melee/projectile/construct call sites. Read metadata tests and the parent's browser harness. Used review/verification skill guidance: checked native code and performed targeted suspect probes rather than treating passing string-schema tests as semantic proof.

Fresh package inspection found20 cues,14 dialogue candidates and no missing original IDs (`charge`, `release`, `beam`, `contact`, `light`, `heavy`, `swing`, `guard`, `construct`, `gun`, `teleport`, `depleted`, `pain`, `landing`). Fresh native heavy-layer and reached-cover probes are reported above. The four existing metadata tests verify required fields/phase/status/IDs, but do not detect these wrong native mappings or overly broad event scope.

Inspected saved desktop and mobile images at `artifacts/audio-cue-brief/desktop.png` and `mobile.png`: readable warm/gold inherited typography, contained native dialog scrolling and no visible horizontal overflow. Read `results.json`: document390/390, dialog356/356,20 cues,2 beam profiles,errors[]. Read the harness's real download/no-AudioContext checks. This was inspection of the parent's browser evidence, not a fresh independently driven UI run or new audio listening test. The parent-reported35-test/build result was not rerun, as requested.

The two beam references are explicitly direction-only, and their evidence strings acknowledge that stills cannot establish motion or source-game sound. No installed recording, source-game audio identification, AAI integration, new sonic performance or subjective listening approval is inferred from these stills or metadata.

## Authorized correction follow-up

After the read-only findings above, the parent explicitly authorized a separate metadata-only correction in `src/data/audio-cues.js`, its cue tests, the browser's expected count, and `docs/STUDIO_AUDIO.md`. The original findings remain above as review history; they no longer describe the final metadata. No AudioBus, projectile, sound output, Studio dialog/runtime or Task4 behavior was changed.

- Corrected heavy layers and miss wording using actual native `meleeHit` calls; recorded conditional body layers are `land.flesh`/.035s and `hit.soft`/.012s, not `boom.deep`.
- Added `ki.blast`, removed inactive `gun.light` from current firearm playback, named weapon-profile DSP, and clarified native material-dependent landing/impact sources.
- Restricted native `contact` to positive accepted Fighter damage or local metal contact at the existing .18s pulse gate.
- Added `beam-cover-contact` as a separate direction-only entry with `method:'none'`, `source:'not recorded'`. Ordinary cover/construct damage remains native; dedicated contact sound is still an open integration. Cue count is now21; all fourteen old IDs remain.

RED evidence: `node --test tools/audio-cues.test.mjs` produced4 passed/6 intended failures before production edits, not import/device errors. Native methods actually selected samples, while only the unavailable audio output device was replaced; the cover case stepped a real reached damaging hose and confirmed zero impact/zap calls before rejecting missing metadata. The actual UI download browser then failed specifically at20!==21 before the new entry existed.

Final commands and outcomes:

```powershell
node --test tools/audio-cues.test.mjs tools/studio-audio.test.mjs tools/studio-profile.test.mjs tools/character-package.test.mjs
$env:LSW_TEST_URL='http://127.0.0.1:5189'
node tools/audio-cue-brief-browser.mjs
npm run build
```

**41/41 tests passed, zero failures/skips/cancellations**,31,430.3698ms. The fresh browser exited0 and exported21 cues/2 beam directions; `results.json` records errors[], document390/390,dialog356/356. No-autoplay assertion remained in the real UI harness. The actual downloaded JSON was separately read and confirmed the corrected sources and direction-only cover cue. Refreshed mobile evidence was visually inspected. Build exited0,280modules,5.93s; existing large-chunk warning only.

**Corrected metadata verdict: ready for parent acceptance; source-accuracy findings resolved within this bounded slice.** The inherited actual wall/construct contact-audio gap remains explicit, not “fixed.” Audio metadata production ownership is returned/frozen before the separately assigned Task4 KO inspection repair.
