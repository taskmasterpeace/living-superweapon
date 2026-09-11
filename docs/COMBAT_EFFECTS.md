# Combat effects — September 8 pass

## Try it

Open `studio.html?hero=aurum`, choose **Effects**, then **Preview constructs** or **Preview shield hits**. Press Play or scrub the timeline. Under Attack sequence, choose Will Fist, Will Hammer, Barrier, or Sentry to rehearse their production actions. Choose **Game camera** to judge framing; Orbit is an inspection view.

Effects settings are presentation only:

| Setting | Range | Default |
| --- | --- | --- |
| Shield surface intensity | 0–2 | 1 |
| Shield hit ripple duration | 0.2–1.5 s | 0.7 s |
| Charge gathering intensity | 0–2 | 1 |
| Construct assembly time | 0.15–2 s | 0.65 s |
| Construct particle density | 0–2 | 1 |

**Save local** applies the profile the next time a game page loads. **Play Test** opens PowerWorld. Export/import includes these settings; custom-character packages retain them through ORIGIN power-kit edits. Shipped source data is not overwritten. Zero construct density disables the particle skin but keeps the gameplay object visible.

## Runtime changes

- Particle skins sample real construct triangles in root-local space, assemble into the solid, settle, and dissolve. Fist knuckles/thumb and hammer handle distinguish their shapes. Walls stay upright. Existing damage, cover dimensions, activation and lifetime rules remain authoritative during formation.
- Shield surfaces carry four local hit waves, driven by actual blocked/deflected contacts. Projectiles pass their contact point; fallback directions project onto the actual sphere/partial cylinder. Zero damage and status-only ticks do not create hit waves. KO clears them; the reused respawn rig restores visibility.
- Beam contact sends short pressure spray back toward the source, with a compressed contact ring. Close-view beam detail stays near the stream as elongated flow instead of detached balls. Traveling tips, collisions, damage and movement rules are unchanged.
- Beam and spherical projectile charges share socket-attached inward gathering and a near-full-charge readiness ring. Simulation time drives all staging, including pause/scrub.

No cape, map, input, camera-preset, damage-balance, framework or dependency changes were made for this pass. Original implementations use the supplied repositories as visual/architectural references; no third-party source or assets were imported.

## Verification and evidence

- Focused node:test regression suites cover beam/body/cover/clash contact, charged emission and energy, shield hit provenance/geometry/lifecycle, construct formation/cleanup, editor profiles and portable character packages.
- A mixed lifecycle test runs twelve simultaneous constructs through four spawn/expiry cycles: every skin stays at or below 2,048 points and leaves no scene object or cover entry behind.
- `tools/combat-effects-browser.mjs`: Studio fields → save → JSON export → import → reload → Play Test → native gameplay construct, with authored assembly time verified; no browser or shader errors.
- `tools/effects-action-browser.mjs`: 213 frames, silent scripted native wall/fist/guard/charged-beam rehearsal. `artifacts/combat-effects/action/effects-reel.mp4`.
- `tools/beam-pressure-browser.mjs effects-final --frames`: native traveling beam into SOL's scripted advancing reaction; accepted damage is measured. `artifacts/beam-pressure/effects-final/advance.mp4`.
- Representative editor/game screenshots and browser results: `artifacts/combat-effects/`.
- Production Vite build passes. The existing large-bundle advisory remains; this was not a bundling/performance audit.

These are scripted visual checks and focused automated regressions, not evidence of a completed AAA game, human feel-testing, or a many-player performance target. Construct sampling currently uses bounded CPU-updated Points; the solid shapes remain procedural. Beam pressure rejects along the incoming direction rather than computing full surface-normal fluid response.

## Future direction recorded, not implemented here

September 8 supersedes the earlier vehicle exclusion: action-driven threat escalation and military response; distinct tank/fixed-wing/helicopter handling; eventual player vehicle control; inhibitors and alien factions; human-zombie infection and hordes with finite-range spitting variants. Flight should remain a valid escape. These require separate simulation/gameplay designs and are not silently folded into VFX.
