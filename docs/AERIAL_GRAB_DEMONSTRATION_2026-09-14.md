# Power World — current-model aerial grab demonstration

Workspace: `D:/lsw/.worktrees/combat-release-review`  
Branch: `codex/playable-integration`

## What now works

The native Threat Room demonstration takes off, approaches Kano from behind, reaches for him, carries him forward, releases downward, applies terrain impact damage and returns him to standing/control. It calls the production movement, grab, lift and throw methods. Initial positions and decisions are scripted; damage, collision and recovery are live. This is an automated native-controller demonstration, not evidence of a player manually steering a fast curved approach.

Local video: `artifacts/live-capture/current-model-aerial-grab-throw.mp4` (3.872 seconds, silent). Original recording and metadata: `artifacts/live-capture/take-bb0c5490-b3f3-44c0-889b-d72ffd6bb1d6.webm` and `.json`. Both recorded actors identify as loaded `faceted-v1` modular bodies, Sol and Kano. Kano loses 48 health, from 115 to 67. Capture connects at 0.42 seconds, release at 1.07, impact at 1.25 and control returns at 2.46. No loading or selection footage is included. Side camera changes presentation only. The successful earlier gameplay-camera take is retained as `take-284f134a-0437-4908-b71b-1aa97d7b048c`; it obscures the victim below the frame and is not the preferred review video.

The original failed take `take-aa124592-9aec-4707-a52c-81c0920fb95a` remains diagnostic evidence: a helper's arbitrary four-unit approach threshold stalled at live body contact. The demonstration now queries production grab eligibility. Its regression includes body collision.

## Repeat it

1. Open `http://127.0.0.1:5185/`, choose Sol and enter the Threat Room.
2. Open the `>_` console and enter `demo prepare`.
3. After the modular models load, enter `demo record`. It runs the native sequence with a side camera, ends the clip after recovery, and archives the video plus metadata through the existing capture endpoint.
4. `demo play` runs without recording; `demo stop` returns control. Prepare again to repeat. `trial review` opens the recorded pose exchange with camera/slow playback controls; this pose replay does not reproduce terrain or effects.

The preparation command requires an idle, living flier in the Threat Room. It uses the selected player's real capabilities and Kano as the target; other pairings may fail and should report that failure. A twelve-second recording cap remains. Incomplete or replaced scenarios are identified in metadata, not accepted automatically. Normal target controls resume when the demonstration ends.

## Fixes accompanying the demonstration

- Replay capture waits for asynchronous modular model attachment and restarts coherent pose history on model replacement. Replay clones preserve render layers, preventing hidden legacy meshes from reappearing.
- Surviving owned ground/roof throws have a separate brief prone-to-standing recovery. It preserves simulation roots and pauses under stun, freeze, sleep and hitstop. It does not reuse near-death `downedT`; defeated actors do not get up through this path.
- Prone reload no longer rolls its support hand through the floor with the upright wrist-alignment override. This failure also reproduced against the previous committed code.
- Ordinary weather thunder now uses the existing approved thunder recording. No rotor/jet loop was found in the supplied audio branch; those remain actual source gaps. Sound Library assignments and fallback choices are preserved.

## Visual acceptance and remaining work

The side-view video was inspected at capture, carry, impact, prone, rising and upright phases. It proves the complete native sequence on these current models. The procedural get-up is still visibly stiff: the body rises too much as one piece. Replace/refine it with planted hands/knees and an appropriate source recovery clip before artistic approval. The victim's airborne interval in this low-height demonstration is brief, so it does not approve sustained conscious flailing, backward tumbling or stunned limp descent.

Still needed: player-steered fast curved rear acquisition; interrupted/failed-lift demonstrations; friendly underarm and ground/object pickup contact; more body-size/outfit pairings; separate forward/vertical landings; weapon and shield contact and release events; further review of rejected kick/knee/axe/boomerang candidates. Do not label all animation candidates approved. See `ANIMATION_REVIEW_PASS_2026-09-14.md` for repaired library motions, source attribution and the repeatable source-to-modular workflow.

## Verification

102 targeted tests pass, including native modular aerial sequences and repeatable demonstrations at 30/60/120 Hz, body contact, carry/interruption, grounded pose/reload, recording model readiness/layers and audio mapping. Production build passes with the existing bundle-size warning. Logs: `artifacts/aerial-demonstration-tests.txt` and `artifacts/aerial-demonstration-build.txt`.

This is a progress checkpoint. The broader animation, flight/combat, creature, weapon and audio goal remains active.
