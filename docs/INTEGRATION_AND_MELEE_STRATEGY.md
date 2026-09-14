# Power World integration and melee checkpoint — 2026-09-14

Repository: D:/lsw/.worktrees/combat-release-review. Branch: codex/playable-integration.

## Completed in this batch

- Audited 15 local worktrees. Saved tracked working/index binary patches and untracked file inventories; source worktrees were not reset or stashed. Untracked files are NOT backed up by those inventories.
- Verified a complete-history Git bundle for integration HEAD, ground-handling, combat-speed-repair and audio-all. This is a selected-ref checkpoint, not every branch.
- Repaired one reachable corrupt mothership asset blob from an exact SHA-1 matching local copy, preserving its original. See GIT_OBJECT_RECOVERY.md for remaining corruption.
- Selectively ported scout slope response and wheel presentation from ground-handling work. Retained current speed, shared manual/mission advance, obstacle sweep and Threat Room restrictions. Handbrake holds slopes.
- Melee preparation pauses during hitstop; disabling-state cancellation still takes priority.
- Stun HUD now displays the existing wall-clock timer without applying ccRecover a second time.
- Added .agents/skills/power-world-character-authoring/SKILL.md covering the existing editor, actual capabilities, export formats and review workflow. No new workshop.

Validation: 35 scout/camera/gunner/meter/status tests plus 17 operation-driving tests passed; production build passed with existing large-chunk warning. Live wheel presentation and end-to-end aerial grab video remain unverified. Skill references checked; bundled validator unavailable because its Python environment lacks PyYAML.

## Integration decisions

| Stream | Current decision | Benefit / tradeoff |
| --- | --- | --- |
| Ground vehicles | First slope/wheel port complete; aircraft throttle/stall/tuner remain | Keeps shared control/collision safeguards; aircraft needs separate reconciliation. |
| Combat speed | Selectively port runtime/data/tests from 23454f2 next | Avoids 1,352-file dependency snapshot; requires reconciling evolved emitters and inherited motion. |
| Audio | Current runtime already wires many defaults; selectively import approved files from audio-all | Avoids 439 mixed candidates/rejections and preserves library.json/custom bindings; remaining event wiring is manual. |
| Dirty main and vehicle-sim | Preserve and classify changes before integration | Protects unpublished work; cannot honestly call all local work merged yet. |

Audio-content-pass is an ancestor of audio-all. Current firearm, grass/concrete footstep, impact, scout, weather, grenade, grab, nanite and vehicle-explosion mappings must survive. Approved flight/landing, vehicle loops and ambient selections still need reviewed mapping. Source recordings do not prove runtime use.

## Melee design decision

Use the user's one-button regional technique selector for the first prototype. Do not add a new stance or a second technique-selection interface yet. The supplied reports offer conflicting alternatives; they are proposals, not verified runtime documentation.

Press prepares; release commits one technique. Tap selects quick strike. A later named region selects heavy punch, and a subsequent region can select sweep for a style with an implemented sweep. The final region clamps rather than loops. Holding longer selects a different tool, not necessarily more damage. Keep labels visible and record the selected technique at release.

CURRENT runtime remains Combo / Straight / Haymaker (or its style-limited subset), plus clinch Body blow / Finisher. There is no live leg sweep added in this batch. Do not label an existing punch as a sweep. Existing chargeRate changes time to threshold; freeze region timings for the proposed test before comparing characters, rather than covertly changing roster balance now.

First sweep requires a grounded contact clip, foot/leg contact volume, authored startup/active/recovery, allowed target anatomy, explicit damage/stagger and cancellation rules. No automatic stun + launch + guard break package. Flight invalidates low contact; do not replace the selected sweep with another attack. Release selection must remain locked while moving. Approach has a finite travel/turn budget, respects body collision, and can miss.

Tradeoff: a timed selector delays access to a sweep and can overshoot its region. Test wrong-move releases and missed opportunities before adding more regions. Technique-first charging remains an alternative if those failures dominate.

Stats retain existing keys and names: Fighting, Agility, Strength, Resilience, Intelligence, Perception, Mental. Styles/powers grant actions; stats modify admitted actions. Do not turn all stats into damage multipliers or double-count Strength in throw velocity and impact damage. HP and energy remain separate capacities. The report's proposed resilience changes require a separate balance decision because current explicit Resilience also derives HP.

## Next implementation order

1. Reconcile aircraft handling and combat-speed emitter changes, then approved audio mapping. Test before expanding scope.
2. Reuse existing Threat Room consoles to launch current-model ground grab, hovering grab, moving aerial grab and airborne stun scenarios. Capture actual contact/release/impact/get-up. Practice KO reset currently replaces the actor; it is not a get-up animation.
3. Implement one grounded sweep alongside existing quick/heavy strikes with named regions and release/contact/recovery telemetry. Test retreat, guard, flight and cover, not only the stationary bag.
4. Complete ground/object pickups, held-character reactions and recovery transitions. Ordinary aimed throw is sufficient before spin-sling polish.
5. Distinguish acid/fire/poison projectile presentation and sounds; then one alien run/leap/attack loop and nighttime visibility pass.

Do not spend this pass on another workshop, a large wrestling catalog, extra worlds, or a new power audit. Existing Character Foundation and Animation Library supply appearance/keyframe/contact review. Imported clips and procedural studies remain candidates until gameplay and visual checks pass.
