# PowerWorld release — 10 September 2026

- Repository: https://github.com/taskmasterpeace/powerworld, branch `master`.
- Runtime release revision: `6ab47e2cbd53ee7f3e17d1ce91fb9501e80d650c`.
- Production: https://powerworld-mauve.vercel.app
- Studio: https://powerworld-mauve.vercel.app/studio.html
- Showcase: https://powerworld-mauve.vercel.app/showcase/living-superweapon-gameplay.mp4
- Vercel project: `mklabs-projects/powerworld`; separate from the older `threshold` deployment.

## Delivered

Mobile status is pinned at the top, 238 × 90 px in the tested viewports. Touch actions show weapon names/icons instead of desktop mouse-wheel instructions. Rifle sight and reload reach actual weapon inputs. Desktop Pause → HUD position & size supports dragging, 60–140% scale, keyboard adjustment, reset and saved placement.

The showcase is a 37-second edited, silent, work-in-progress reel from native-input Practice recordings. It is not generated footage or proof of hostile-AI combat. See its source manifest for exact trims and capture provenance.

The release merges the existing PowerWorld history. `/` opens PowerWorld; `/citygame.html` retains the legacy city game. It keeps the newer frontline camera/animation/collision systems, adds the fork's uncaptured mouse-look fallback with focus resets, and preserves third-person view during KO while disabling dead-player combat input. Untested old flight-speed multipliers were not reintroduced. The current radar remains to match the latest HUD direction.

## Verification

- 110 focused HUD, input, combat-view, soldier, block/bot and melee tests passed after integration.
- 93 projectile-contact, flight-split-aim and model-module checks passed during merge review.
- Native HUD browser checks passed drag, keyboard/mouse resizing, persistence, reset, editor key containment and mobile layout at 390×844, 844×390 and 1024×768, without browser errors.
- Vercel built 369 modules successfully from the committed source snapshot. Build still warns about the large shared Studio/profile chunk; this is remaining packaging debt, not a claimed optimization win.
- Root, Studio, city page and MP4 returned HTTP 200; MP4 content type and 8,673,516-byte size verified.
- Live-browser smoke passed root → Practice → gameplay, actual W movement (20.7 units), uncaptured mouse yaw, mobile HUD, Studio and legacy city entry. Zero browser, console or network errors in this smoke. Reproduce with `node tools/powerworld-release-smoke.mjs https://powerworld-mauve.vercel.app`.

This is a playable checkpoint, not completion of the entire backlog. Beam lifecycle defects, the complete nine-gun/inventory set and full audio event coverage remain in the creator-status report. Weather and asset integrations are researched recommendations, not shipped new systems. Aircraft expansion stays deferred.
