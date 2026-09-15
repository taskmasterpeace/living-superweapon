# Playable integration takeover — 2026-09-14

## Decision
Connect existing work into one verified playable build before expanding assets or worlds. Combat destination: codex/playable-integration at 4bb4d54, D:/lsw/.worktrees/combat-release-review. No merge or gameplay changes were made during this takeover audit. Do not overwrite this checkout with another worktree.

## Verified source map
| Work | Source | Actual boundary |
| --- | --- | --- |
| Combat and paid motion | codex/playable-integration / 4bb4d54 | 22 imported selected clips; two paid receiver overlays assigned. Purchased boxer strikes remain candidates. Complete native-input aerial grab/throw/get-up proof remains outstanding. |
| Desert proving ground | codex/pw-vehicle-sim / 73d86f9, D:/lsw/.worktrees/pw-launch-inheritance | vehicle-sim.js and deployVehicleSim exist there and are absent from combat destination. Source has boxing ring, octagon, maze, gates and tracking-only turrets. Five terrain/AA tests passed again during this audit. Prior handoff reports browser state verification; not independently repeated here. |
| Fleet | codex/playable-campaign-slice, fleet sequence dc4c555 through e0f0beb | Source handoff describes 157 packaged variants/icons, many workshop-only. e0f0beb is not an ancestor of combat destination. Read FLEET_TRANSFER.md before selecting commits; whole-branch history includes other work. |
| Audio content | codex/audio-all / f659822, D:/lsw/.worktrees/audio-sfx-gaps | Four handoff docs exist. Their historical nothing-wired statement does not describe the newer combat checkout. Reconcile each row against existing bindings rather than replacing them blindly. |

## Audio intake rules
Start with source docs/AUDIO_HANDOFF_START_HERE.md, AUDIO_INTEGRATION.md, AUDIO_WIRING_SPEC.md and AUDIO_GAP_ANALYSIS.md. Compare with destination docs/AUDIO_REMAINING_RUNTIME_GAPS_2026-09-14.md.
Prefer selected real CC0 over overlapping AI takes. Never wire rejected public/audio/sfx-gaps/. Keep license/provenance records and authored user overrides. Both SampleBank and SoundLibrary must resolve appropriate recordings; adding files alone is insufficient. Existing concrete/grass footsteps already have recorded manifest rows and an entity movement call, so inaudibility needs runtime diagnosis, not another import claim. Aircraft/hover/reload gaps and decode fallback remain documented; do not invent source recordings. Verify in foreground gameplay with sound enabled, including cold start and repeated playback.

## Build order
1. Establish one checkout-specific launch URL and visible build identity. Prevent testing a different branch. Cost: little new gameplay, but every later result becomes attributable.
2. Integrate the proving ground plus a deliberately selected playable fleet unit. Preserve current combat, input, cleanup and camera behavior while resolving shared game.js changes. Test enter, board, exit, reset and ring restrictions. Benefit: one real place to use existing work. Cost: integration conflicts; do not call all fleet models deployed.
3. Complete audio reconciliation and listening review: footsteps, punches, grabs, throw impact, flight, selected vehicle. Benefit: immediate feedback. Cost: unavailable recordings remain explicit gaps.
4. Prove current-model carry/grab through hover, forward and sideways flight, aimed throw, collision damage and get-up. Fix contact and transitions before importing more clips. Benefit: core superhero loop. Cost: fewer new moves initially.
5. Polish camera/controls and compact inventory after those scenarios work. Trunk contents use the same item ownership/transfer system as backpack; held objects reserve hands but do not create duplicate inventory items. Benefit: coherent interactions. Cost: full inventory overhaul waits.

## Five-owner split
| Owner | Responsibility | Boundaries |
| --- | --- | --- |
| This AI: integration and combat | Final merge, runtime launch identity, flight, grabs, throws, damage, animation transitions and acceptance | Own shared src/engine/game.js, entity.js and final input/state integration. Other owners supply small requested hooks rather than concurrent edits here. |
| AI 1: maps/proving ground | src/engine/vehicle-sim.js, environment modules, arena layout and tests | No combat rules, no unrelated mountain collision fix in this pass. No new building-placement system yet. |
| AI 2: vehicles/fleet | Fleet models, sockets, vehicle behavior modules, boarding and trunk container specification | No second inventory authority; coordinate shared game hooks with integrator. One selected vehicle must work end to end before broad fleet deployment. |
| AI 3: audio | public/audio, samples.js, sound-library mappings, audio tests and row-by-row wiring checklist | Preserve provenance, reject DSP reference set, request shared engine event hooks. Deliver actual listening evidence, not only file existence. |
| AI 4: character/animation assets | Purchased clip intake, modular fit, animation metadata and current-model previews | Prioritize carry/grab/punch/recovery assets over clothes/glasses. Final gameplay pose/contact assignment belongs to integrator. |

Each AI gets an isolated branch/worktree from the agreed baseline. Handoff must contain baseline and commit SHA, scoped changed files, exact launch command/URL and identity, scenario steps, test results, visual/listening evidence, and unresolved issues. No blanket all-done language. A project-manager AI can maintain this checklist and question evidence without changing shared runtime files.

## User-reported backlog, not fixes claimed
- Ground projectile slides: reproduce with exact power/projectile; distinguish intended ricochet from missed terrain impact.
- Mountain invisible boundary: acknowledged, deliberately deferred per user instruction.
- Rock carry arms: verify all movement directions and the actual modular hand contact.
- Alt freelook: increase camera orbit separately from anatomical head limits.
- Throw behavior: strength and object mass govern launch capacity; agility should govern aim error. Tune flatter high-speed throws before deciding whether to hide trajectory guidance.
- Jump/landing, beam legs and purchased punch: gameplay transition/assignment checks required.
- Low-energy warning: threshold crossing with hysteresis/cooldown; speech is a separate later layer.
- Jet chase: compare world-relative velocity and displayed units; speed display alone does not prove pursuit balance.
- Tab powers/stance behavior: audit actual input context before changing it.
- Trunk/backpack: compact contextual window showing container, capacity, equipped/held ownership and transfer action; mock-up is not a shipping inventory system.

## Definition of playable acceptance
One identified build, current models, audible recorded cues, repeatable native-input scenarios, no setup footage in short proof clips. Show success and interruption, actual damage and recovery. A passing pure test, a workshop preview and a playable feature are separate statuses. This audit did not independently verify the current browser URL or replay the handoff's full live scenario.
