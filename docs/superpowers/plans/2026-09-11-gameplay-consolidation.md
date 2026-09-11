# PowerWorld gameplay consolidation — execution roadmap

> Execution guidance: use the execution skills for implementation. Initially created for audit/planning; the creator subsequently approved autonomous implementation on September 11 through their 10:30 AM return, including dream-loop visual work and selective asset reuse from D:/git/ShootEM. This roadmap does not authorize deleting worktrees, flattening branches or publishing an unverified build.

**Goal:** recover the newer work, make movement/combat legible and controllable, and finish one repeatable research-recovery operation whose outcomes feed equipment and the Newsroom.

**Design:** [consolidated gameplay contract](../../GAMEPLAY.md). **Evidence:** [recovery audit](../../reports/2026-09-11-gameplay-recovery-audit.md). **Living status:** [tracker](../../gameplay/TRACKER.md). **New combat references:** [clip/ESF review](../../reports/2026-09-11-melee-esf-reference-review.md).

**Architecture:** extend the existing shared player/AI action path. Keep view/aim/travel distinct; keep item ownership, media storage, mission state and combat resolution separate. UI renders admitted outcomes. Use versioned data and existing Three.js/Vite modules. Do not introduce a competing weather, damage, inventory catalog or news recorder.

## Constraints and order

Preserve SOL/VEGA feel, City Free Play, original roster identities/alternatives, shared Impact style, finite beam travel, strength asymmetry, save compatibility and bounded effects. Current root `814d322` is behind integration `59d8c79`; all implementation file names below refer to the **reconciled newer tree** unless labeled new. Existing integration files are not instructions to create duplicates in the old root.

Sequence: **recover baseline → Alt/speed/guard/melee/beam → selection/Newsroom/inventory → gadgets/weather/outpost mission → native release acceptance → genome/clone extension**. Visible feedback ships with each combat change, not at the end. Finish existing archive work rather than restarting it. Stage the outpost asset integration after reconciling branches, before full operation acceptance.

## 0. Recover one trustworthy integration baseline

**Responsibility:** source-control integration and failure triage; no gameplay redesign.

**Existing evidence/files:** `docs/reports/2026-09-11-merge-checkpoint.md`, `artifacts/player-systems/merge-node-tests.log`, source and target branch histories, lab `docs/building-delivery/INTEGRATION.md`.

- [ ] Record root and worktree revisions, dirty files and running server roots/ports. Establish which URL the creator actually uses. The integration's historical URL is `http://127.0.0.1:5182/powerworld.html`; root documentation uses port 5180. Treat those as observed configuration history until checked.
- [ ] Classify all 67 recorded failures into missing reproducible fixture, stale environment assumption, preexisting assertion or introduced regression. Compare the relevant base using identical supported fixtures/configuration. Preserve failure logs and thresholds.
- [ ] Repair reproducible causes; do not dismiss contact/cloth/order assertions merely because some other failures are environmental. Reuse fixture acquisition instructions rather than copying arbitrary untracked assets into a commit.
- [ ] Re-run the integration's build and broad gate; confirm failures are resolved or explicitly scoped before merging. Review the 351-file integration rather than blindly applying its diff to the current root.
- [ ] Bring the agreed newer work into the recorded target, preserving local documents/assets. Record the tested revision, runnable URL and remaining acceptance gates in one short handoff. Publishing remains a separate action.

Recorded broad gate to reproduce in the integration checkout:

```powershell
npm run build
node --no-experimental-webstorage --test --test-concurrency=4 'tools/*.test.mjs'
git diff --check
```

**Acceptance:** one identified playable checkout contains the recovered archive/power repairs, the test environment is reproducible, and an existing defect is not mislabeled as a new feature or a fixed failure. No passing claim is inherited from this planning turn.

## 1. Alt look while moving and flying

**Modify:** `src/core/input.js`, `src/engine/game.js`, `src/engine/world.js`, `src/boot.js`; extend the existing reticle/HUD owner.
**New focused tests:** `tools/free-look-input.test.mjs`, `tools/free-look-browser.mjs`.

**Contract:** a camera-only look offset plus captured aim/travel frames; Alt never writes aim or movement merely because the view turns. No new parallel controller.

- [ ] First reproduce ordinary pointer-lock mouse-look through real browser input, addressing PowerWorld issue #1's route. Establish forward flight with an aimed target and record baseline.
- [ ] Add failing behavioral cases: Alt turns the view while aim/travel remain stable; shoulder bounds hold; input release returns camera smoothly; blur/pause/KO clears state. Cover sustained beam aim, collision and offscreen aim-marker behavior.
- [ ] Implement separated view offset and lifecycle clearing through the existing camera/input owners. Proposed ±75° yaw limit remains configurable for the feel review.
- [ ] Run focused cases at 30/60/120 Hz and real mouse/key flight/ground routes. Check default centered and optional shoulder camera, then device equivalents.

**Acceptance:** fly forward, look left/right, continue firing in the original direction, release Alt and retain control. No false center reticle while aim is elsewhere, camera through walls, AltTab latch or hidden target reveal.

## 2. Universal power-up and actual movement gears, including UI

**Modify:** `src/core/input.js`, `src/engine/game.js`, `src/engine/entity.js`, `src/data/progression.js`, `src/core/world-units.js`, `src/engine/player-status.js`, `src/engine/player-status-view.js`, `src/engine/player-status.css`, relevant Studio profile/selection descriptions.
**Proposed new data/state modules:** `src/data/movement-gears.js`, `src/engine/movement-gears.js`.
**New focused tests:** `tools/movement-gears.test.mjs`, `tools/movement-gears-browser.mjs`.

**Decision needed before implementation:** finalize the exact relationship between double-hold power charging, third-press gear III, authored forms and XP. Use the master document's proposed reconciliation as the review artifact. This does not block audit completion or Alt work.

- [ ] Record SOL/VEGA, speedster, levitator and SARGE traversal/braking baselines using the same route and world scale. Define per-profile speed/acceleration/turn/brake/drain tables from those measurements.
- [ ] Add input-state tests for first/second/third hold, timeout, OS repeat, interruption and denied stage. Assert a Shift press cannot charge twice through a legacy slot and the new state owner.
- [ ] Implement the approved gesture and physics profile; keep grounded/traversal/jetpack capability rules and existing unique actions reachable. Preserve old profiles with an explicit migration/default policy.
- [ ] Move redundant generic power-up defaults off attack buttons after the replacement works; preserve meaningful healing/defense/form alternatives. Inventory/Studio/HUD describe actual effective actions.
- [ ] Ship `GEAR I/II/III`, actual speed, power-up progress and `MAX GEAR` together with the controller. Add authored sound/wake transitions and a calibrated threshold only if genuinely crossed.
- [ ] Verify maximum supported speed against thin walls, terrain, diagonal contact, fighters, carried mass, energy depletion and return to hover. Validate 30/60/120 Hz behavior and a clean release/reset.

**Acceptance:** the creator can feel and identify the three supported speeds; the stationary double-hold has a visible result without consuming a power slot; no speed is inferred only from FOV. Capture the whole sequence using native controls.

## 3. Energy-backed guard and bounded control recovery

**Modify:** `src/engine/entity.js`, `src/engine/melee.js`, `src/engine/projectiles.js`, `src/engine/game.js`, player status and resolved-hit feedback owners.
**Extend:** `tools/block-bot.test.mjs`, existing beam-pressure/contact and damage-outcome tests.
**New:** `tools/guard-energy.test.mjs`.

**Contract:** one admitted hit yields blocked amount, energy spent, uncovered damage and break outcome. Presentation consumes that result. Keep shield/armor integrity distinct from active guard.

- [ ] Encode equal-exposure guarded/unguarded fixtures. Full energy must give zero HP loss; partial payment spends remaining energy and admits only uncovered damage; zero energy cannot sustain defense. Tests must fail against the current chip path.
- [ ] Add direction/barrier/deflection/grab/heavy-crush cases, shield/nanite interaction and infinite-energy archetype cases. Assert repeated beam ticks cannot fund their own block through damage/guard regeneration.
- [ ] Implement authored block conversion/capacity and remove premature hidden-meter breaking for paid energy guard. Migrate HUD values to the actual rule and keep distinct physical defense types.
- [ ] Integrate the saved default Second Wind repair, then reproduce successive hits, beam pressure, low-HP movement and recovery. Fix confirmed stuck states; do not disable every legitimate hit reaction.
- [ ] Compare native guard, depletion, broken guard, successful retreat and AI parity at varied frame rates.

**Acceptance:** holding a valid block visibly spends energy, preserves health while affordable and leaves readable counters. A living character does not remain indefinitely frozen by repeated ordinary pressure.

## 4. Melee exchanges and beam ground contact

These are independently acceptable combat slices; use separate changes even though both improve contact readability.

**Melee files:** `src/engine/melee.js`, `src/engine/melee-pose.js`, `src/engine/entity.js`, `src/data/martial.js`, current authored-strike/Studio rehearsal paths.
**Tests:** existing `tools/melee-depth.test.mjs`, `tools/moving-melee.test.mjs`; new `tools/melee-exchange.test.mjs`.

- [ ] Prototype the creator's rush → short multi-hit exchange → last-hit knockback → recovery-space rhythm. Start with three light contacts plus one finisher and one single-heavy archetype; keep counts authored. Define total damage, defensive gaps, attacker recovery and corner chain limits.
- [ ] Write behavior tests for total damage, missed/interrupted steps, buffered defense between blows, guard rejection, aerial opening, cover obstruction and no duplicate contact at low/high frame rates.
- [ ] Wire timing to actual contact and authored animation; verify target stays reachable through light blows and moves on deliberate finisher. Inspect hands, shoulders and recovery in motion.
- [ ] Complete V-based native exchange and confirmed Tab melee toggle; restore exact previous selected powers on exit and cancel incompatible held input. Relocate conflicting roster/squad controls before enabling Tab; retain ordinary menu focus traversal and Escape access.
- [ ] Extend existing grab/body-blow/throw and credited slam owners for secure → bounded whirl → three-dimensional aimed release. Reconcile hold/release with current controls before replacing any binding. Keep Alt view-only.
- [ ] Add person transport carry as a state of the same relationship: preserve actual victim identity, health/team, lift/mass limits, escape timer and valid flight capability. Support takeoff/hover/travel/landing/set-down, combined occupied collision and transition into aimed throw. Test depletion, KO and reset without orphaning either fighter.
- [ ] Add behavioral cases for unobstructed admission, front/back escape, mass/strength limits, finite hold/energy, swing-wall collision, left/right/up/down release, fast terrain sweeps, one credited impact, interruption/KO/reset cleanup and no duplicate damage at 30/60/120 Hz.
- [ ] Capture a native rush chain, a defender blocking a chain gap, finisher recovery in open terrain and against a corner, a whirl into a mountain/wall and a downward ground slam. Inspect hand attachment, occupied swing space, actual release direction and recovery through time. Source-reference contact sheets are not runtime acceptance.

**Beam files:** `src/engine/projectiles.js`, `src/engine/vfx.js`, `src/engine/world.js`, relevant material/contact helpers.
**Tests:** existing `tools/beam-contact-feedback.test.mjs`, `tools/beam-cover-contact.test.mjs`; new `tools/beam-surface-trail.test.mjs`.

- [ ] Reproduce and record end reasons for pending close charge and held-beam termination. Distinguish normal owner/target KO from an unexplained end.
- [ ] Add contact-only residue tests: no mark on miss; no bridge between disconnected surface contacts; bounded counts under stationary sustain; terrain normals and reset disposal.
- [ ] Add distance-spaced dark contact marks and surface-appropriate dust/steam using existing bounded VFX. Reuse pooled light/contact ownership and avoid per-tick ground-normal rebuilds.
- [ ] Record moving beam tip on sloped ground, wall/roof, enemy and shield. Check the contact remains readable through weather and normal HUD.

**Acceptance:** actual multi-blow exchange with defensive input and recovery space, an aimed grab/whirl/throw with one physical credited slam, plus a ground beam whose point and trail can be understood without reading test numbers. No instant/hitscan conversion.

### 4a. Bounded zombie combat encounter

- [ ] Add an opt-in encounter through the real menu using existing fighter/AI/damage/ragdoll owners. Begin with grounded infected, finite spawn count and telegraphed attacks; no full infection simulation prerequisite.
- [ ] Prove moving melee contact, guard, throw/terrain impacts, multi-attacker recovery and soldier ammunition under bounded population and spawn pacing. Spawn outside occupied/player/camera space with navigable approach.
- [ ] Complete encounter results, real highlights, restart and teardown. Compare native hero and grounded-soldier runs; keep the outpost operation and Free Play available.

**Acceptance:** a player can choose the encounter, fight readable enemies with real punches/weapons, finish or lose and retry without stuck actors or unbounded counts.

## 5. Finish selection, shared Impact UI and recovered Newsroom

**Modify existing newer files:** `src/engine/pwTitle.js`, `src/engine/hudSelect.js`, `src/engine/hudUtil.js`, `src/engine/player-status-portrait.js`, `src/core/combat-selection.js`, `src/engine/newsroom-ui.js`, `src/styles/newsroom.css`, `src/styles/tokens.css`, `src/engine/news-archive-adapter.js`.
**Reuse:** `src/core/news-archive.js`, existing archive/Newsroom browser tests and `tools/hud-roster-transition-browser.mjs`.

- [ ] Preserve existing archive implementation; reproduce real capture → commit → reload → hero-filtered playback before changing the UI.
- [ ] Replace parallel Newsroom color primitives with the shared semantic tokens. Keep scoped later HUD health-color override explicit. Review typography and hierarchy at actual size.
- [ ] Provide face grid, role/favorites/holds, one live hero preview and accurate power descriptions across all identities. Invalidate portrait caches with asset/profile revision; do not start one live renderer per face.
- [ ] Place the two actually selected LMB/RMB actions bottom-center, retaining useful secondary selection access. Selection changes cannot accidentally fire the old action or leave a sustain loop running.
- [ ] Finish archive management: empty state, favorite/rename/delete confirmation, exact hero filtering, export/import, storage usage/failure and bounded autoplay. Test stale readers, all-favorites storage pressure and interrupted writes without losing live footage.
- [ ] Verify keyboard/controller/touch navigation and responsive layouts. Keep captures labeled silent and historical appearances unchanged.

**Acceptance:** select SOL/VEGA/soldier, understand their actual powers, play, return, see a real matching highlight after reload and manage it. Newsroom visibly belongs to the same game. A staged fixture gallery alone is insufficient.

## 6. Owned inventory, gadgets and TEMPEST

Use the recovered **owned-inventory plan** and **gadget/storm seam report** from integration. They are detailed donors, not completed implementations.

**Inventory owners:** new pure item-instance/ownership module under `src/core`; existing `src/data/armory.js`, `src/engine/armoryUI.js`, `src/engine/game.js`, native weapon-ammo and gadget handlers. Keep definitions versus issued instances explicit.

- [ ] Add failing transaction scenarios: issue once, equip/fire/reload, swap/drop/recover identical remaining ammo, split/merge quantities, bag/stash transfer, failed save, lost cargo, retained owned loadout.
- [ ] Implement ownership and versioned persistence with separate mission cargo. Menus cannot issue free catalog weapons or reset cooldowns. Preserve existing saves until migration succeeds.
- [ ] Prove SARGE end-to-end, then SOL/VEGA native powers plus permitted equipment. Add nine gun identities only through the working shared inventory.
- [ ] Add KNIGHTFALL projectile-grounding with post-recovery immunity; one soldier turret with placement/ammo/arc/health/caps; reuse finite Jump Jets. Test counterplay and KO/reset ownership.

**Weather owners:** `src/engine/systems.js`, `weather-lightning.js`, `rain-field.js`, `weather-body.js`, `weather-vortex.js`, abilities/effective-slot/HUD cleanup. Proposed new focused test: `tools/weather-layers.test.mjs`.

- [ ] Before implementation, tests must show that global ambient rain/wind/state continue through a local owned storm; ending owner A does not end owner B or revert an ambient change made mid-storm.
- [ ] Implement capped local fields through Weather's existing authority, with owner/lifecycle and spatial sampling. Add rain masking/roof shelter and warn-before-strike lightning.
- [ ] Implement reversible Storm Command effective slots; cancel conflicting holds, preserve underlying kit/cooldowns/selections, restore on ending/depletion/KO/form/reset.
- [ ] Prove targeted lightning, gust and hail with paid resources and finite physical response. Hear loops end; verify no residual light/debris/slot owner.

**Acceptance:** SARGE's equipment and KNIGHTFALL/TEMPEST's signature systems create distinct tactical choices. Weather outside the storm and after it ends stays correct.

## 7. Enterable outpost and the complete recovery operation

**Donor:** `D:/lsw/.worktrees/enterable-building-pilot` at `862f65a`, especially `public/building-delivery/lab.v1/` and `docs/building-delivery/INTEGRATION.md`.
**Runtime owners:** `src/engine/frontline-encounter.js`, `frontline-outpost.js`, `world.js`, entity/projectile collision, AI navigation, game/mode/result and archive event owners.

- [ ] Integrate only the accepted lab delivery. Use real wall/door/floor pieces; do not retain a solid whole-building collider over an open doorway. Verify transformations/units and pad placement.
- [ ] Capture the exact liked desert scene/map/seed before integration and compare it afterward. Preserve terrain silhouette, sightlines and open traversal; add the outpost locally. Use existing solid slopes/mountain faces as throw targets before expanding destruction.
- [ ] Extend stairs/roof/hatch/per-piece break state where needed; publish breach changes to movement, LOS, shots and navigation together. Verify soldier clearance and interior camera before placing mission objectives inside.
- [ ] Replace “kill all four first” with case access by fighting, bypass or breach; add one case owner, drop/recover, one authored reinforcement wave and bounded extraction.
- [ ] End win/loss once, preserve intended equipment/cargo policy, produce results/highlight events and reset all transient state on retry.
- [ ] Complete native win and loss as SOL, VEGA and SARGE. Repeat with KNIGHTFALL and TEMPEST for promised role breadth; validate City Free Play remains available.

**Acceptance:** the 5–8-minute candidate mission has a beginning, meaningful route decisions, pressure, a finish and a reason to replay. Passing through a static asset or extracting in a harness is not full mission acceptance.

### 7a. Prove police-to-military escalation in the preserved desert

**Existing owners:** `src/engine/police.js` (`wantedLevel`, jurisdiction gates, `_deploy`), map/country configuration, dispatch presentation and existing Newsroom events. Current code already selects military `GUARD_DEF` at rung five; this is integration/behavior verification and refinement, not a new ladder.

- [ ] Identify whether police are enabled in the selected desert scenario and assign its appropriate existing military-capable jurisdiction. Keep ordinary countries' capability gates intact.
- [ ] Reproduce incident → police → backup/SWAT/federal → actual military infantry using native play; preserve officer-down escalation. Record heat, rung, dispatched type, arrival and stand-down. Exercise threshold boundaries and reset without hardcoded forced-star acceptance.
- [ ] Keep mission defenders/reinforcements and police dispatch ownership explicit; prevent duplicate force creation. Add a total population/vehicle budget and re-use current reinforcement caps.
- [ ] Make arriving military readable through equipment/tactics and dispatch feedback. Separate "deploying" from "on scene"; publish archive events from actual stage transitions, not merely threshold crossing.
- [ ] Prove escape/cooldown/stand-down, a jurisdiction without military, and restart clearing heat/units. Tanks/aircraft are separately scoped future work.

**Acceptance:** the current desert is still recognizable, ordinary play can escalate police into visible military opposition, and the player can end pursuit. No military completion claim from wanted stars alone.

## 8. Release evidence and the final gameplay document

**Repeatable authoring across every asset family:** retain source/provenance, deterministic conversion or generator command, versioned output manifest, scale/axes/rig/socket and collision contracts, material/LOD/resource budgets and representative native regression evidence. Runtime consumes those artifacts, not hand-edited one-off exports. Use D:/git/ShootEM as an explicitly authorized donor for soldier/weapon/vehicle assets where compatible; review source and license metadata and port through the same pipeline. AK74/other grounded firearms need visible loadout availability and real ammo/reload/firing, not just an imported mesh. Unlock presentation follows actual ownership/progression rules. Reuse existing pilotable vehicle functionality before adding duplicate helicopter/jet systems.

- [ ] Give Audio Workshop its direct page and navigation; for every required cue record one-shot/loop/ambient, start/stop, replacement and heard runtime evidence. Separate capture-with-audio work from playback of silent footage.
- [ ] Test desktop native inputs, standard gamepad, landscape touch and portrait menus. Resolve mobile safe areas, held-input cancellation and menus reclaiming pointer lock.
- [ ] Run the same mixed fight/record/weather/impact/restart workload repeatedly; report device, resolution, quality, frame p50/p95/worst, entity/effect/media counts and resource growth. Establish budgets on actual target hardware.
- [ ] Keep one acceptance row per release behavior: requirement, source decision, exact revision, input route, observed result, evidence file and remaining risk. Known-bad injections must make relevant tests fail, including the issue #14 harness paths.
- [ ] Update `docs/GAMEPLAY.md` only with approved decisions; move measured speeds/timings into authored data tables and reference those. Keep an explicit future-mode section rather than mixing future plans into current feature claims.

**Final-document acceptance:** no duplicate or conflicting control ownership; every release claim has native evidence; every open creator request has an owner/milestone; all Draft/proposed details remain labeled until resolved. The final document is a usable play contract, not a history of every test run.

## 9. Next slice: genuine clone/genome loop

After the short operation is repeatable, implement sample identity/recovery/denial → lab research → one derivative clone loadout; then finite clone stock/production/facility capture and team victory. Carry over the 41 supplied draft answers rather than asking them again.

Before this slice, resolve sample degradation, denial attribution, research time/cost, superweapon redeployment and the finite-reserve win/stalemate rules. Test no double harvest, interrupted research, stolen cargo, zero stock with surviving units, restoration and complete match reset.

Then build Black Site from actual intel/extraction, expand City Free Play consequences, and pilot opt-in infected. Large-map/8–32-player/aircraft work depends on performance and networking evidence. External GODFALL numbers are not commitments.

## Remaining small review set

No broad questionnaire is needed. Only these decisions affect the immediate implementation contract:

1. Exact double-hold power-up versus third-press speed/form behavior, and Recovery's XP policy.
2. Tab melee is now approved; implement accessible menu/squad remapping and test mode transitions.
3. Guard conversion/heavy-crush/physical-shield exceptions, tuned with equal-exposure tests.

Later art/character checks: confirm KANO/VEGA appearance mapping and whether DECIBEL's downward scream propels himself or launches targets. These do not prevent the shared controls/mission work.
