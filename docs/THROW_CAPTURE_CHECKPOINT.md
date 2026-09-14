# Power World throw capture checkpoint

Worktree: `D:/lsw/.worktrees/combat-release-review`; branch: `codex/playable-integration`.

## Implemented
- Recorded actor frames include throw ownership state and velocity.
- Combat review has a Throw follow camera, positioned ahead and to the side of the latest moving thrown actor. Backward seeking is deterministic.
- Record action clip exports the review canvas as a silent 30 fps WebM plus JSON identifying actors, events, camera and playback speed. Recording begins at the recorded exchange, excluding menus. Closing discards an unfinished take.
- This remains **pose review**: environment, collision geometry, impact effects and audio are not replayed. It is not yet a marketing-ready impact capture system.

## Verification
Nine camera, pose-recording and recorder lifecycle tests pass, including cancellation while asynchronous stop is pending. Production build passed before the final lifecycle fix; rerun recorded with this checkpoint. Browser: game loads into the Threat Room, but a native grab/throw capture and downloaded WebM have not yet been verified. No finished video is claimed.

## Requested work still outstanding
1. Viewer deferred to GitHub issue 23: https://github.com/taskmasterpeace/living-superweapon/issues/23.
2. Capture a fast curved rear aerial approach, native grab, hold and aimed downward release; include spin/slingshot variation. Existing numerical rear-grab tests do not prove this complete visual scenario.
3. Three distinct lift studies: easy, braced effort, struggling; review reach, contact, hold and release. Proposed starting duration ranges: easy 0.45–0.7 s, effort 0.9–1.3 s, struggle 1.6–2.2 s. These are tuning proposals, not installed gameplay timings. Over-capacity attempts fail and release ownership cleanly.
4. Two-hand large-object throws, left/right ownership, weapon compatibility and swept person-to-person impact verification.
5. World-inclusive throw camera clips and screenshots, with actual target impacts and damage readouts. Verify captured playback before presenting it as evidence.

## Current impact rules, not a new physics model
Thrown-body contact in Game.updateThrownBodies uses speed >=24, endpoint proximity, target damage min(30,8+speed*0.22), thrown victim damage 60% of that and velocity retention 55%. Endpoint-only contact may tunnel at high speed and needs swept collision coverage.
Fighter._wallContact can damage registered cover/vehicles at speed >34 (vehicle contact additionally requires powered movement), using speed*0.55. Fighter._slam computes launch impact up to 32 damage from (ownedSpeed-22)*0.5 with threshold checks and existing fall damage. Do not describe this as mass-based kinetic-energy damage.

## Mountain collision finding
Some FRONTLINE_FORMATIONS use tapered octagonal cylinder meshes while registering box-shaped cover. Shared projectile and fighter checks can therefore hit invisible corners. A fix must cover native fighter endpoint contact, swept movement, projectiles and carried objects consistently. This is a likely cause, not yet a verified fix.

## Follow-on backlog
Keep paired wrestling expansion, weapon-specific side dives, dual swords, spear/pole and nunchuck handling, arrow defense dispenser, and destructible training arena. Two-person rescue is not a priority. Accessories should use socket-relative editable geometry, emissive material settings and bounded secondary motion; do not rebuild a separate character rig for glasses.
