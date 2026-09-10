# Beam surface flow

The previous full-game crossing capture (`artifacts/flight-review/hud-density/combat.mp4`)
showed a broad pale highlight and uniform bands on a smooth tube. This pass changes the
shared gameplay/Studio core material, not beam geometry, collision, charge width, damage,
travel speed, camera steering, or the map.

## Change

`src/engine/beam-surface.js` now narrows the hottest side-visible highlight and adds
advancing strands derived from world-space surface normals, traveled arc distance, and
time. The world-space field has no ring-angle seam and does not rotate with the camera.
The existing saturated rear-view body and soft silhouette alpha are retained. There are
no additional meshes, buffers, lights, or draw calls. The shader cache key is v3.

## Evidence

`tools/beam-filament-check.mjs` renders the real shared material to a floating-point GPU
target. Before the change, 24 time samples of opposite surface lanes differed by at most
0.000122, with no structured frames. After the change, maximum difference is 0.2773 and
12 frames exceed the 0.08 structure threshold.

Camera-roll samples (0.7, 1.8, 3.1 radians) differ by at most 0.000148. An intentionally
camera-fixed shader mutation differs by 0.2774 and is rejected. Sampling one full old
ring-pulse period later isolates strand motion: maximum difference is 0.2205; an
intentionally frozen strand mutation changes by only 0.000000060 and is rejected.

The 32-case radiance check retains soft edges (maximum edge alpha 0.118), dense core
(minimum core alpha 1), side HDR radiance, and limited axial white. Rear/side shaft
contrast remains visible through all sampled phases. These are regression gates, not
an aesthetic rating.

## Visual review and limitations

`artifacts/flight-review/beam-filaments/combat.mp4` is a six-second, 1280×720, 20 fps
production-input capture with a scripted passing opponent and scripted dialogue.
Damage is 549.251, matching the previous capture, with no captured page errors.
Frames 50, 70, and 119 were inspected for the curved beam, rear-view target, and recovery.
Frame 50 was compared directly with the prior capture: the bright strands are visible
and the opponent remains readable, but the outer silhouette is still a smooth swept
volume. This is an incremental surface improvement, not a completed BFP-quality effect
or a claim that the game/editor is finished. Model anatomy, reactive posing, and overall
combat feel still require visual/play review. Map design remains out of scope.

## Verification

- New GPU filament check passes; camera-fixed and static-strand mutations fail.
- Focused radiance and rear/side contrast checks pass.
- Production build passes (204 modules).
- Full `npm run test:effects` passes (14 checks). Charged-beam silhouette retention
  is 79–81% at 25/50/90 units. Contact cases retain 76–95%, with under 2% near-white
  target pixels and no redundant sustained-hit flashes.
- Studio combat passes nine real beam/elevation/seek/recovery cases plus unsupported
  kit/editor state checks; no page errors.
- Studio encounters pass four moving paths, deterministic seek/playback, validation,
  and three layouts without profile mutations or page errors.
- Independent read-only shader/test review reports no remaining scoped findings.
