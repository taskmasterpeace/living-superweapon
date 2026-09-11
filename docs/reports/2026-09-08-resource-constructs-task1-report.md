# Resource constructs — Task 1 report

Scope: ONLY policy, native ownership/lifetime/dismissal/cleanup from `docs/superpowers/plans/2026-09-08-resource-constructs-brief.md`. Shared dirty workspace preserved; no staging, commits, worktree changes, subagents, tank geometry, attack receivers, or authoring expansion.

Status: Task 1 implementation and self-review complete; focused tests/build and parent-run native lifetime capture pass. Independent final spec/code-quality review approved with no blocking finding. This is not completion of the full resource-construct slice.

## Implemented boundaries

- `src/engine/construct-policy.js`: exclusive timed/upkeep/damage rates, bounded finite validation, saturating debit, same-owner grouped upkeep and proportional final-tick diagnostics, resource-only exhaustion/KO retirement, membership/disposal checks and stable slot reconciliation. The parent's existing fractional-dust exhaustion correction is preserved. Reviewer-found explicit `construct:null/''/false/0` values now reject; only undefined defaults to fist.
- `src/engine/summons.js`: resolves policy before allocating graphics; resource lifetime is `Infinity` and no timer debit occurs. Existing `ConstructSurface` receives that lifetime. All native updates reject disposed/removed ownership before actions; finite resource owners must have ki. Disposal marks dead once, stores its reason, conditionally clears its own slot reference, releases any victim, removes cover, refreshes fog and disposes unique visual resources. Existing wall geometry/cover footprint and legacy actions are unchanged.
- `src/engine/abilities.js`: resource wall/new-tank control branch uses native `runSlot`, retains hand/actor/unlock gates, and pays once using unchanged `pay()`/cooldown. Fresh second press dismisses without an explosion, affordability test or cooldown reset. Release/focus cancellation does not dismiss. A valid owned controlled construct suppresses false unaffordable-press feedback. Old timed wall/fist/hammer/turret branch remains intact.
- `src/engine/game.js`: `spawnConstruct(owner,def,slotState=null)` registers stable slot identity for the controlled branch and reuses a live matching object. Replaced slot state/definition retires the old controlled object before replacement. A single grouped upkeep settlement runs after Fighter updates/regen and melee, before projectiles/minions/construct actions; existing projectile-versus-construct order remains intact.
- `src/engine/entity.js`: resource-only retirement on `_ko`, all-owned retirement on `dispose`. `clearSlotFx`, regeneration, movement, damage, animation and the recent body/leg handoff code are unchanged by this task.

There is no HP budget or Fighter impersonation. Damage mode currently has only its indefinite idle/ownership policy: real hit conversion is Task 3. The tank lifetime/slot branch is prepared, but tank geometry, placement rejection and movement/cannon work are Task 2. No source/catalog entry is converted or added.

## TDD and verification

The first native RED gate had 41 tests: 24 passed and 17 failed for the missing behavior. Specific failures included expiration at source duration, post-entry 20 ki staying 20 instead of 10, no immediate resource KO retirement, release detonating the wall, missing stable slot ownership, and native Game's projectile boundary seeing 1.4 ki instead of .9 (real 8/s Fighter regen followed by requested 10/s upkeep over .05s). The explicit-invalid-form test failed before the policy default was fixed.

Initial integration command:

```powershell
node --test tools/construct-policy.test.mjs tools/construct-studio.test.mjs tools/construct-surface.test.mjs
```

Result: 61 passed, 0 failed. Subsequent test-only self-review added compatibility/edge cases and demonstrated one RED: direct resource construction omitted from `game.constructs` returned false at exhaustion without retiring its own collider. Runtime edits were held while the parent's capture ran. After that capture completed, exhaustion gained a current-instance fallback; it retires that direct object's cover/resources and emits one warning, while preserving grouped retirement for ordinary registered objects.

Final focused verification after that correction:

```powershell
node --test tools/construct-policy.test.mjs tools/construct-studio.test.mjs tools/construct-surface.test.mjs tools/focus-release.test.mjs tools/dual-trigger.test.mjs tools/studio-audio.test.mjs tools/jump-motion.test.mjs
npm run build
```

Result: **126 tests passed, 0 failed**, including all 66 construct policy/native/Studio/surface cases. Build passed, **273 modules**, 6.71 seconds; existing large-chunk advisory remains. This focused gate includes the recent native ballistic body/leg boundaries and restoration to detect overlap with the two adjacent Fighter cleanup seams.

Tests use actual `Construct`, `Fighter`, `runSlot`, cancellation, `Game.spawnConstruct`, native geometry and `ConstructSurface`. The Game-order test executes the real update through Fighter/regen/melee and deliberately stops at the projectile boundary, without running unrelated city/camera work. The small Three.js/Studio test world supplies only renderer/audio/world presentation. Numerical pure-policy tests separately exercise 30/60/120 Hz, exact/fractional final ticks, reverse iteration, infinite pools and proportional diagnostics.

Covered behaviors include post-entry numerical upkeep, duration independence, idle damage mode, resource/legacy KO distinction, owner disposal/removal, idempotent visual disposal, victim release, resource release/focus cancellation, low-ki/cooldown dismissal, actor/slot gates, stable keys/rebinding, replacement-state/definition cleanup, and retained legacy timed release/detonation. Legacy Studio tests still rehearse all four original constructs; the new compatibility case verifies a timed wall survives KO but not owner disposal.

## Browser evidence and remaining work

Parent owns and ran `tools/resource-construct-lifetime-browser.mjs` against native `Game.update`, AURUM's existing q slot and `runSlot`. Saved evidence in `artifacts/resource-construct-lifetime/results.json` records:

- Initial 72 ki becomes **60** after the unchanged 12-ki entry payment.
- At **10.5 seconds**, beyond the original 9-second source duration, the wall remains active with **7.5 ki** at 5 ki/s; regeneration is deliberately disabled for measurement.
- At exactly **12 seconds**, ki is **0**, the construct is disposed/detached and actual cover is gone.
- Fresh second press at **1 ki** dismisses without further payment or a denied warning.
- **0 console/page errors.** Saved frames: `formed.png`, `beyond-original-duration.png`, `exhausted.png` in the same directory. Parent is responsible for visual review; no extra worker recording batch was run.

Parent visually inspected all three frames: solid-light wall remains at the later checkpoint and is absent at depletion with native DRAINED feedback. This browser evidence predates only the isolated unregistered-direct-instance fallback above. The ordinary native registered-object behavior tested by the browser is unchanged. It is lifetime/control evidence, not proof of resource hit routing, tank movement or portable editing.

Independent review freshly passed 15 focused native lifecycle tests and an additional actual timed-tank KO → respawn → low-ki/cooldown dismissal probe. No duplicate spawn, repayment or denial occurred. Review approved Task 1 without claiming later tank geometry, hit receivers or Studio resource settlement were implemented.

Open tasks remain explicit:

- Task 2: actual tank hull/tracks/turret/barrel, safe placement, bounded movement and native cannon.
- Task 3: real callback cover bounds and direct/splash/traveled-beam/swept-melee hit receivers, hostility/accounting and obstruction tests.
- Task 4: validated portable Attack settings/catalog/UI and matching native resource Studio sequencing/readouts.
- Fist/hammer/turret resource policies, deliberate AI construct targeting, broader environmental lanes and vehicles remain follow-ons as specified.

No claim of full construct completion, final hit readability or tank motion approval is made. Executing-plans/TDD skills supplied the bounded red-green checkpoints; Three.js lifecycle guidance kept accounting outside visual meshes and disposal native. The project stack and physics were not replaced by skill defaults.
