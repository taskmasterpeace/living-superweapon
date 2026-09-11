# Actual root-entry camera verification — 2026-09-09

## Current verdict

The normal root Free Roam entry now selects the BFP rear camera without changing city identity. The obstructing city nameplate and oversized duplicate attack grid have also been corrected and visually rechecked. **Integration checkpoint only:** full input/contact/lifecycle, responsive HUD and independent task review remain underway.

## Reproduction and change

Parent-owned `tools/main-entry-camera-browser.mjs` opens `/` with fresh browser storage, dismisses actual first-use help if present, selects Free Roam through the real title controls and clicks Start. It skips the native opening with Space if active, then waits for 60 native animation frames. It does not redirect, set a camera flag, seed a mode, alter the simulation or reposition the player.

- Before: `artifacts/main-entry-camera-before/` reproduced `camMode=iso`, `OrthographicCamera`, crosshair hidden, White City, police/news active, `_openSky=false`.
- Intended RED: `artifacts/main-entry-camera-red/` failed exactly `iso !== chase` when the same root flow required BFP.
- First after: `artifacts/main-entry-camera-after/` completed with exit0 and `errors:[]`, using full Chromium and RTX4090 ANGLE D3D11 at1600×900. Camera is perspective/chase, vertical FOV73.74°, position `[0,14.4,4.5]`, direction `[0,0,1]`, player position `[0,0,30]`.
- Native identity stays Free Roam/White City, `_openSky=false`, police active, news enabled. Body classes are `playing combat-chase`, without `powerworld`. Crosshair is visible.

Command:

```powershell
$env:LSW_TEST_URL='http://127.0.0.1:5189'
$env:LSW_CAMERA_EXPECT='bfp'
$env:LSW_CAMERA_OUT='artifacts/main-entry-camera-after'
node tools/main-entry-camera-browser.mjs
```

The parent personally inspected the after screenshot. The player is centered and occupies a useful lower-center portion of the view; projected head center is62.63% down the image and boot centers85.91–86.08%. These are **part centers**, not reference hair/boot extrema, and are not an exact1:1 reference-match claim. Existing scene/model lighting and geometry are unchanged by this verification.

## Open acceptance

- Nameplate rectangle `[520,743,560,49]` overlays the legs. Move it to an edge stack and inspect combined HUD footprint.
- The lower-left status and lower-right full attack rail are still visually heavy in this first capture; check real compact layout, not just class presence.
- Real mouse capture, attack selection/release, moving target contact, pad/touch handoff, near-cover camera,2P/map/KO transitions and small-screen coverage are not proved by this single entry still. Worker evidence and independent review must close their specific gates.
- This run does not measure sustained foreground frame pacing or resolve the recorded cold shader stalls/browser crashes.
- The test uses the isolated5189 development server against the same workspace. It does not claim to have inspected or reset the user's existing5180 tab or local storage.

Game-playtest guidance required actual root UI entry and screenshot review separately from DOM assertions; that caught the nameplate obstruction despite the camera assertions passing.

## Native action checkpoint

With `LSW_CAMERA_ACTION=1` and output `artifacts/main-entry-camera-action/`, the same real root flow also completed native input checks, exit0/8.87s/zero errors. A real middle-click canvas gesture acquired pointer lock without firing. Space raised SOL6.08u and its release left flight active; W traveled20.92u before the following look/settle sample; captured mouse movement changed yaw0→−.312rad and pitch0→.072rad. Escape paused and released actual browser pointer lock. City `_openSky` remained false throughout. No Game/Fighter/camera function or state was replaced.

`root-native-input.webm` is a silent Playwright browser recording, VP8/1600×900/25fps/8.24s (ffprobe checked). It includes the native title/entry and this short flight/look/pause sequence; it is not attack-contact evidence or a subjective responsiveness score. `root-native-flight.png` was inspected. This capture precedes the HUD nameplate correction and must not be presented as the final layout. Trees naturally occupy the view during this particular short city path; no geometry was hidden or moved to improve the recording.

The first updated-layout action repeat (`artifacts/main-entry-camera-layout-action/`) failed the hover assertion despite passing root camera/layout. Diagnostic frame intervals show its60RAF Space hold lasted only about346ms on the high-refresh browser. Native `entity.js` deliberately starts a ballistic jump and only changes to flight when held past `_jumpT`/apex; this sample released while still jumping at5.23u. The harness now holds the actual key until native flight and6u ascent, bounded15s, without stepping simulation or changing the physics. That correction needs a fresh passing run; the failed capture is retained, not counted as an app-error-free full pass merely because its console-error array is empty.

## Corrected layout and native-input repeat

The fresh corrected run at `artifacts/main-entry-camera-final-action/` passed, exit0/8.20s/zero errors. Native Space was held498ms before the actual flight/altitude condition; release left SOL flying at6.42u, W traveled16.91u, captured mouse turned the camera, and Escape paused/released capture. This supersedes the pending-rerun sentence above without erasing that fixture failure.

Cityplate is now at `[18,52,260,57.89]`, clear of the center/player; the correspondent stays visible at `[1396,184,186,126.75]`. Parent inspected the corrected1600×900 root screenshot and the worker's1600×900/1100×720 layout captures. Selected attack names remain visible, with the duplicate large cards reduced to a small icon/hotkey rail. No character, camera-lens or city-geometry retune was made for those layout fixes.

The final silent video is `root-native-input.mp4`, H264/1600×900/25fps/7.84s, transcoded from the native Playwright recording and ffprobe-checked. Sampled post-takeoff RAF means were5.15–7.77ms with p95≤12.5ms; the pause sample had a37.5ms maximum. These short samples exclude boot/shader preparation and may overlap the worker's CPU checks. They are not a general performance or cold-hitch closure.
