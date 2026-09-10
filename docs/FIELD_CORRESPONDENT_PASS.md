# Field-correspondent pass — 2026-09-07

The KMK 9 operator records actual perspective renders of the active match. Event shots crash toward
an impact, hold the attacker or ascending fighter, and settle into a frame containing both fighters.
Reporter stand-ups interrupt quiet coverage; a finished match records a bounded winner shot and
reporter sign-off. The observer does not drive the gameplay camera, input, fighter physics or AI.

## Files and integration

- `src/engine/newscrew.js`: crew movement, event direction, rendering and clip lifecycle.
- `src/engine/news-camera.js`: pure framing and portable camera-profile normalization.
- `src/engine/news-capture.js`: asynchronous JPEG encoding and URL ownership.
- `src/engine/news-figure.js`: lightweight procedural crew anatomy and local-space articulated poses.
- `tools/newscrew.test.mjs`: ownership, rendering restoration, framing, budget, venue and grip regressions.

Call `news.endMatch(result)` when the result becomes authoritative. It records a 5.2-second tail while
the normal game loop still runs. `news.takeClips()` finalizes and transfers footage ownership before
reset/rematch; pending encodes continue resolving into the transferred arrays. `news.flush()` finalizes
and waits for already-admitted encodes. A viewer must hydrate pending frame slots as they become URLs,
ignore dead/null slots, and call `revokeFrames` when it relinquishes transferred footage.

Profiles contain `crashZoom` (0–1), `handheld` (0–1), and `shotHold` (0.6–2.4 seconds).
`setCameraProfile(profile)` applies them without changing the gameplay camera.

## Recording bounds

Frames are 640×360 JPEG at quality 0.78, captured at event-dependent rates up to 20 fps. A smaller
drawing buffer is fitted and upscaled. Only one scene capture is admitted per update, at most three
encodes can be pending, and recording skips work when the scene frame budget is already exceeded.
Clips close after at most 5.5 seconds or 90 frames; retained footage is limited to nine clips, 360
frames, and 24 MiB of compressed images. Low-priority old clips are shed before the latest knockout.

This is a direct scene pass, not the gameplay composer: it has the same world geometry, lighting and
sky but does not reproduce composer bloom/print effects. It contains no recorded audio. JPEG frame
playback is in-session; this pass does not add a video-file exporter.

## Failures reproduced and fixed

The previous pre-roll array was copied when a highlight started. Pending callbacks updated only the
old array, and pre-roll eviction could revoke URLs already used by a clip. Pre-roll now transfers its
array. Reset and short-clip rejection also release active frames, leaving no orphan encoder slots.

The news pass previously overwrote the render target, viewport, scissor, sky position and visibility
without complete restoration. Those values now restore in `finally`, including render failures. The
operator is hidden only for its own camera pass, avoiding a lens inside the operator's head.

The first integrated screenshot, `artifacts/correspondent/reporter-opening.png`, exposed a floating
head, unattached microphone and black sky. The crew now has connected necks, facial features, press
vests, shoulders and elbow arms, separate trouser legs and shoes. Hand endpoints follow actual
microphone/camera grips in standing, walking and ducking poses. This remains a small procedural crew;
it does not alter any fighter model.

The black sky was a clipping error: PowerWorld enlarges its 900-unit dome by 3.4, putting the surface
3,060 units away, beyond the news camera's old 1,100-unit far plane. The news camera now fits the
active sky scale and gameplay far plane while retaining the world's real sky material and uniforms.
Venue captions no longer inherit a city district in PowerWorld/Ascendance.

Crew roots and lens height now sample their actual ground every update, including while stationary
when a new crater changes the surface. City footage uses `world.heightAt`; an active, visible,
scene-attached PowerWorld stage uses its own flat floor. Cached or detached stage objects cannot
override city terrain. LOS origins also include local ground height. The visible shoulder camera
copies the final recorded view's world orientation into its parent frame before the hand grips are
posed, so it films the reporter during stand-ups rather than pointing back toward the battle.

The final serial browser pass confirmed connected anatomy, grounded crew, the active blue sky,
125 valid captured frames, an active KO ragdoll and no console errors after the corrections. At the instant of
one KO, existing rocks partly blocked the field shot; the following winner shot was clear. The crew
can move to another vantage, but it cannot recover an occluded instant already recorded. This pass
does not remove arena cover or add an instantaneous occlusion/camera-teleport system.

## Verification

`node --test tools/newscrew.test.mjs` passes 25 focused Node tests. The newly added failures were
observed before their fixes. These include projected reporter head/mic and aerial framing, real
Three.js bounds for connected anatomy, and world-space hand-to-equipment contact across poses.
The final `artifacts/correspondent/post-match-broadcast.png` was inspected: it reports SOL defeating
KANO in POWERWORLD, shows actual reporter footage and the match's tape, and omits city damage and
fictional civilian witnesses. Nine additional report/data/HUD cases protect PowerWorld, Ascendance,
draws, explicit winners, participant counts and retained city-mode behavior. The browser capture
confirms impact, attacker, action, winner and sign-off phases and fetches every owned frame URL.
Its deterministic background-tab admission override is not a performance benchmark.
