# Animation equipment and airborne stun checkpoint

Workspace: `D:/lsw/.worktrees/combat-release-review`  
Branch: `codex/playable-integration`

## Current-model native evidence

`artifacts/live-capture/current-model-airborne-stun.mp4` is a 3.30-second silent recording of live gameplay, with both SOL and KANO using loaded `faceted-v1` modular bodies. Original metadata: `artifacts/live-capture/take-ddce2b26-45ef-43be-afe5-dbed1b1c0683.json`.

Reproduce: enter with a flying character, open the visible `>_` console, run `demo prepare stun`, wait for models, then `demo record`. The demonstration invokes the production stun API; gravity, collision, fall rules and recovery execute normally. It does not invent projectile damage. Camera and initial setup are staged; this is not a manual combat-input proof.

Observed native timeline:
- 0.35 s: stun relinquishes flight; limp reaction observed.
- 1.12 s: reaches ground; **zero fall damage** for this setup under existing rules.
- 1.96 s: stun recovery ends and native action eligibility returns.

Visual review found the near-ground body straightens too quickly. This is a working state-transition demonstration, not an approved landing/get-up animation. Follow-up is tracked with issue #24. The existing grab/throw recording remains `artifacts/live-capture/current-model-aerial-grab-throw.mp4`; its separate 48-damage result must not be attributed to this stun recording.

## Equipment review workflow

Open `http://127.0.0.1:5185/animation-library.html`. Select a clip, then use **Preview equipment** in Clip details. Automatic selection recognizes exact sword/shield source names and left/right axe/boomerang studies. Manual choices include sword, axe, boomerang, rifle and pistol, with a hand selector and shield toggle. Settings survive through URL parameters.

Props mount to the actual modular hand bones without modifying animation tracks, inventory or gameplay assignments. A weapon occupying the left hand suppresses the shield. Paired holds reserve their hands and clear equipment. Rifle support-hand contact remains explicitly unproven. Throw previews keep the prop attached: projectile release is not implemented by this panel.

Browser inspection covered sword heavy combo, shield at midpoint, left axe at quarter phase, manual rifle, and clearing/disabling props for friendly carry. This is attachment/interaction review, not approval of all animation contacts. Source poses remain candidates where marked.

## Audio and validation

Confirmed supplied recordings now cover flight travel, guard break, jammer activation and shieldpack activation. Existing author choices, fallback paths and gameplay effects are preserved. `docs/AUDIO_REMAINING_RUNTIME_GAPS_2026-09-14.md` details provenance and remaining gaps. Automated checks do not substitute for a listening review.

33 focused tests passed: animation equipment, native grab/stun at multiple frame rates, flight sound lifecycle, imported audio provenance and gadget activation. Production build passed with its existing large-chunk warning. Logs: `artifacts/animation-equipment-stun-audio-tests.txt` and `artifacts/equipment-stun-audio-build.txt`.

## Remaining priority

1. Replace the rigid/early-upright impact recovery with planted get-up transitions, preserving native status locks.
2. Review rejected kicks, knees, throws and grabs with correct props/partners; retain failed/candidate labels until visual acceptance.
3. Prove rope/anchor contact for grapple and payload contact for ground/air pickup; a preview pose is insufficient.
4. Expand audio wiring from confirmed event semantics, preserving unused recordings in the sound library.

This checkpoint does not complete every animation, alien/Dec-52 integration or the full audio objective.
