# Shared impact implementation — 2026-09-14

Implemented in the combat-release-review worktree on codex/playable-integration.

## Delivered behavior

PowerWorld's existing swept posed-core solver now calls `resolveSharedImpact` from the real `Game.resolveBodies` path. Contact still separates the rendered core/legs before anything can cross through another body. Hostile ordinary powered contacts above 24 game units/s of **relative normal closing speed** exchange impulse. Tangential velocity remains untouched. Head-on velocities add to closing speed; equal-speed following has none. The impulse uses restitution 0.08 and inverse mass; unbraced pairs conserve normal momentum.

`impactMass`, pickup/throw `bodyWeight`, wind response and the Studio default mass now consume `src/data/body-mass.js`. Explicit `def.environment.massKg` wins, then explicit pounds, then a fixed authored stock-weight migration table, then 90 kg organic/162 kg metal defaults for new custom bodies. Runtime size scales mass by its cube. The stock table preserves the former pickup weights (RAGE 458 lb, TITAN 962 lb) as data; future strength/HP edits cannot alter them. All runtime person-carry/throw call sites pass the Fighter, so Size Change affects their weight consistently. Neither strength nor HP is converted into physical mass. These are gameplay authoring values, not claims of canonical real-world character weights.

`impactTolerance` takes `def.resilience`, explicit Vigor, or the existing sheet Vigor. Tolerance is `14 + 3 × rank` game units/s of received normal velocity change. Injury is `0.22 × max(0, deltaSpeed − tolerance)`, capped at 28 before the normal damage pipeline. Thus resilience affects injury without adding mass or suppressing physical displacement. These are bounded gameplay tuning values, not SI or medical formulas.

A funded frontal guard can brace when standing or flying, with an aim/contact-normal dot product above 0.25 (perpendicular guard is not bracing). Strength scales structural compliance. Airborne support additionally uses explicit `def.impactDrive` (0–10), defaulting to twice the existing flight tier. Zero drive has no airborne anchor; planted support remains ground reaction. Authored mass does not change. The existing damage pipeline still pays guard energy, consumes shields/armor, records credit, and chooses hit reactions. `bodyImpact` suppresses its extra fixed guard push because contact already applied the impulse. No second knockback/launch is added.

Movement remains the existing movement controller: it supplies the incoming velocity before this contact response, then accelerates again on later simulation frames. There is no extra strength-based propulsion term. The explicit `impactDrive` only controls bracing support; it does not change cruise acceleration or solve a persistent thrust-versus-thrust struggle.

## Ownership and limits

- Existing melee startup/active/recovery, physical ability punches, throw, launch and grab-attempt ownership keep their established body-blocking/attack path; incidental collision damage does not stack over them.
- Actual thrown-body hit callbacks remain active even on tangential contacts, and existing per-target throw deduplication remains authoritative.
- Allies retain body blocking without new impact injury or momentum transfer. This prevents a friendly ramming launcher mechanic.
- Pair injury is debounced for 0.65 seconds using simulation time and weak actor keys; physical response still stops renewed inward pressure. Body contact never auto-grabs and adds no kick.
- The modern response is only reached where the existing body solver operates (`_openSky`). City body blocking is preserved.

## Vehicles

Both swept and endpoint fighter/hull contacts now sample **pre-bounce normal relative speed**, using the scout's actual `vx/vz` or aircraft actor velocity. A fast sideways graze or near-matched following speed therefore cannot charge hull damage from unrelated world speed. Hull damage uses the same body mass source, with a bounded 0.5–3 mass multiplier over the existing damage amount. A per-fighter/per-hull 0.45-second simulation-time debounce prevents a swept/endpoint or repeated pressure double debit.

Ordinary walking/boarding remains harmless to parked hulls. Throws/launches retain launcher attribution and the existing `_slam` admission. Static building/cover/interior side impacts now also use the normal-axis speed, so high tangential speed cannot manufacture wall crash injury or cover damage. This was reproduced first by a launched grazing-wall test. No new terrain, object destruction, vehicle penetration, vehicle knockback or self-powered wall injury system was added. Vehicle response is still kinematic hull blocking plus admitted hull damage, not a two-way rigid-vehicle simulation. Vertical roof/underside contacts retain their existing landing/ceiling behavior.

## Files

- `src/data/body-mass.js`: one physical mass source for pickup, collisions, wind and Studio defaults.
- `src/engine/shared-impact.js`: shared impact mass/tolerance, fighter response, hull normal-speed and damage helpers.
- `src/engine/fighter-body-contact.js`: contact metadata/response callback integration; committed fist velocity preservation.
- `src/engine/game.js`: calls the response alongside the existing throw owner.
- `src/engine/entity.js`: narrow guard impulse and endpoint hull contact/damage integration.
- `src/engine/fighter-environment-contact.js`: swept hull pre-bounce normal relative speed.
- `src/engine/frontline-convoy.js`: live scout velocity reference on its cover record.
- `tools/shared-impact.test.mjs`, `tools/fighter-body-contact.test.mjs`, `tools/vehicle-body-impact.test.mjs`: new gameplay regressions and revised former kinematic-only expectations.

## Verification actually run

Red phase: the new production-Game tests failed for absent momentum/injury/brace/weight response; three vehicle regressions failed for tangential-speed damage, matched hull speed and duplicate damage. Tests require the existing CSS import hook because Game imports the review UI. Plain `node --test` and using that hook as `--loader` are invalid in this environment; `--import` is correct.

Final integration sweep: **252 tests passed, 0 failed**, exit 0, including the optional spear and existing throw/tuning paths. Output: `artifacts/shared-impact-spear-final-tests.txt`.

```powershell
node --import ./tools/helpers/character-css-loader.mjs --test tools/guided-spear.test.mjs tools/shared-impact.test.mjs tools/fighter-body-contact.test.mjs tools/vehicle-body-impact.test.mjs tools/fighter-environment-sweep.test.mjs tools/scout-driving.test.mjs tools/impact-recovery.test.mjs tools/person-carry.test.mjs tools/person-throw-pose.test.mjs tools/melee-flight-entry.test.mjs tools/moving-melee.test.mjs tools/ability-melee-pose.test.mjs tools/physical-stats.test.mjs tools/weather-body.test.mjs tools/throwable-action.test.mjs tools/attack-tuning.test.mjs
```

Independent mass/pickup/wind check: **103 tests passed**, exit 0 (`artifacts/shared-mass-final-tests.txt`):

```powershell
node --import ./tools/helpers/character-css-loader.mjs --test tools/physical-stats.test.mjs tools/shared-impact.test.mjs tools/weather-body.test.mjs tools/person-carry.test.mjs tools/person-throw-pose.test.mjs
```

A broader run that also included `tools/studio-profile.test.mjs` finished **223/225 passing**, with two failures in untouched shipped palette validation ("Purple is reserved for KIVULI"). It was not an exit-zero verification; output remains in `artifacts/shared-impact-final-tests.txt`. No palette change was made. Earlier creator expansion/organization scripts could not run because they hard-code unavailable port 5184; they are unrelated to the optional ability catalog and are not counted as passed.

This includes native Fighter physics, Game contact integration, throws at 30/60/120 Hz, swept environment contact, flight melee entry, moving fist contact, carry/release/recovery and actual scout driving. It does not constitute a human-input browser playtest or visual approval of body crash animation. Production build belongs to the parent integration pass.
