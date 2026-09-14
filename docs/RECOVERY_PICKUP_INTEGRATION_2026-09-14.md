# Recovery and pickup integration checkpoint

Workspace: `D:/lsw/.worktrees/combat-release-review`
Branch: `codex/playable-integration`

## Native recovery

The current modular body now samples the existing Quaternius `LayToIdle` source for nonlethal impact recovery. Source file/hash/license and visual-root policy are retained in `src/data/impact-getup-clip.json`. Rebuild that extraction with `node tools/build-impact-getup.mjs`; the source bank remains unchanged. Entry blends from the native prone pose and exit blends back to native stance; collider position and action timers stay simulation-owned.

`artifacts/live-capture/current-model-planted-getup.mp4` is a fresh 3.86-second silent native SOL/KANO demonstration. Both models are loaded `faceted-v1`. It shows rear aerial capture, carry, downward throw, **48 HP damage**, supported rise and control return. Metadata: `take-9dce957c-fbca-4ebb-8c45-6781813288dd.json`. Reproduce with visible console `demo prepare`, then `demo record` after models load. Scripted decisions invoke native actions; this is not proof of a manually flown curved approach.

Reviewed impact, grounded, early-rise, kneeling and final-standing frames. The rise articulates through support instead of moving the whole body as a rigid slab. Different sizes, face-up/face-down choices and side views still need acceptance; issue #24 stays open for that coverage.

Airborne stun/sleep arrivals now enter the same recovery only after actual downward terrain contact. Native stun/sleep holds the character down before the get-up advances. A separate presentation age settles the supported pose during that hold, preventing a delayed source-pose reversal at stun expiry; freeze and hitstop pause both timers. Standing stunned characters do not acquire an invented knockdown; no extra fall damage is assigned. Roof/platform arrivals and alternative impact orientations remain additional review scope.

Final stun proof: `artifacts/live-capture/current-model-stun-ground-recovery.mp4` (4.44 s, silent), metadata `take-a203faa1-50d3-4ef4-a9f0-9c2dba008512.json`. Flight relinquishes at 0.35 s, terrain contact occurs at 1.12 s, and control returns after recovery at 3.07 s. Native damage is zero in this setup. Reviewed descent, supported hold before/after stun expiry, kneeling and standing; the delayed orientation change at status expiry is removed. Reproduce with `demo prepare stun`, then `demo record`.

## Prop pickup/release correctness

- Prop selection now checks height against actual mesh bounds as well as the existing horizontal reach. Flying far above a ground prop cannot remotely hoist it; a low flying character can still lift a reachable prop.
- Existing weight/capacity rejection remains intact.
- A new carry initializes at its actual carry location, avoiding an origin-frame flash.
- Release and predicted trajectory both start from the carried mesh position. The prop no longer teleports to a separate muzzle point when released.

These fixes do not finish the deep pickup animation. The native pickup still hoists immediately; ground crouch/contact/effort clips remain a separate unapproved assignment tracked by issue #21. No failed pickup candidate was silently installed into gameplay.

## Audio and Dec-52

Flashbang detonation and positive personal-shield absorption now use the confirmed supplied IMPACT recordings. User assignments/source preference and existing fallback paths are retained. See `docs/AUDIO_REMAINING_RUNTIME_GAPS_2026-09-14.md` for exact remaining scope; tests are not a full listening review.

`src/engine/dec52-actor.js` adds a real-asset rendering adapter for rat/hound, with shared animation playback, unit conversion, scene ownership and accepted action tokens. Native creature controller/collision/bite-contact integration is still missing. See `docs/DEC52_RUNTIME_ANIMATION_AUDIT_2026-09-14.md`. The adapter is not presented as a playable hound.

## Evidence boundaries

Final combined verification: **34 tests passed; production build passed** (existing bundle-size warning). Regression checks use native Game/Fighter and actual GLBs. They cover unreachable/overweight/low-flight pickup, immediate release position, swept prop impact, planted source support, root ownership, source-to-native exit, native throw/stun at multiple rates, recorded audio event selection and Dec-52 animation/lifecycle. Logs are in `artifacts/recovery-pickup-audio-tests.txt` and `artifacts/recovery-pickup-audio-build.txt`.

Remaining priorities: finish payload-contact pickup poses; connect one Dec-52 hound controller to the existing Threat Room; review rejected melee/throw candidates with real weapons/targets; expand the verified audio map. Full goal remains unfinished.
