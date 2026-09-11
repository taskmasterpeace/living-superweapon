# Sarge authoring integration specification

Approved user direction: checkpoint the current game, integrate the separate authoring branch on an isolated integration branch, then pilot Sarge with packaged locomotion, carbine, sidearm, reload and grenade animation; fix rifle reach, connect sound events without duplicates, expose Studio selection/save/load, and capture real gameplay before acceptance.

## Ownership and scope

- The external authoring task owns `authoring/`, `public/authored-assets/`, and `docs/authoring/`. It is correcting supine labels, documenting unsupported rifle poses, proving clean-checkout reproduction and supplying recordings. Main integration must not overwrite its in-progress work.
- Main task owns runtime, Studio, verification, merge and release. Runtime workers have disjoint file ownership; main task alone edits shared Fighter lifecycle and profile assembly.
- Preserve Sarge's carbine, grenade, blade and shotgun kit. The sidearm is exercised through the existing armory/equipment path, not by removing an ability.
- Supine/get-up source clips must never replace prone hold/crawl. Keep current prone pose, collision and camera.
- Weapons and hound are structural pipeline demonstrations, not approved final art. Creature runtime is outside this first pilot.
- Preserve current map, third-person camera, flight attack posture, physics roots, sound replacement harness, weather settings and unrelated user changes. Aircraft expansion stays deferred.

## Acceptance

1. New integration branch descends from a verified current-game checkpoint and a recorded, reviewed authoring commit. No deployment merely because merge/build passes.
2. Missing, malformed or unavailable selected packages leave the current bundled/procedural presentation working, with an actionable status. Fetching/decoding never happens inside per-frame animation.
3. Studio selects body/motion/equipment references, saves and reloads them, exports/imports the character, and Play Test uses those exact references. Selection remains undoable.
4. Sarge walks/runs, aims, reloads and throws using the selected packages and current authoritative action clocks. Existing prone remains anatomically face-down.
5. Carbine support uses the actual handguard with feasible arm reach across standard/heavy/lean frames. Primary-hand pullback cannot stretch arms, rotate the paid shot away from its muzzle, or solve clipping by moving a socket independently of its weapon.
6. Sidearm armory equip/fire/drop works. Loaded geometry arriving after swap, form, KO or disposal cannot attach to a retired rig or leak resources.
7. Footsteps, magazine removal/insertion, chamber action and grenade release use one owner each. Pause, inspection seeks and interruption do not emit catch-up bursts. Ammo commits and grenade spawning remain single native gameplay events.
8. Native recordings show move/aim/fire/reload/throw/prone and equip/drop, plus regression recordings of flying attacks and form/KO transitions. Timed sounds require actual audible capture, not only cue logs.
9. Related tests and production build pass. Performance evidence includes actual foreground hardware/resolution/entity count, frame distributions and resource lifecycle; a quiet viewer is not a combat benchmark.

Completion of this pilot does not complete the full game goal or approve placeholder art.
