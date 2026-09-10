# Resource Constructs — Wall and Tank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This handoff authorizes planning only; it does not itself authorize execution, delegation, staging, or commits.

**Goal:** Deliver a complete first slice of native, physically hittable resource-backed walls and moving tank constructs, authored through the existing portable Attack profile.

**Architecture:** Extend the native `Construct`, its existing cover contacts, and the existing source-bound attack overrides. A small resource-policy module owns energy accounting; a construct-only melee branch handles actual fist contact without pretending constructs are Fighters. Studio calls the same native routes and reports measured construct hits and caster energy separately from damage to its humanoid target.

**Tech Stack:** Existing JavaScript ES modules, Three.js, Vite, Node `node:test`, existing browser inspection harnesses. No dependency or package-format change.

**Spec:** Parent's 2026-09-08 bounded resource-construct task and subsequent refinements; `PRODUCT.md`; `AGENTS.md`; `docs/reports/2026-09-08-systems-gap-audit.md`, especially ownership/collision/portable-profile sections. This brief supersedes that audit's *candidate* schema and explicitly settles the first-slice policy below.

## Global Constraints

- Read `PRODUCT.md` and applicable `AGENTS.md` before execution; preserve unrelated dirty edits. There is no clean feature-only commit baseline.
- `NO PURPLE` except KIVULI. Use existing solid-light construction/surface effects and owner palette.
- `Beams are hoses, not lasers`: contact must be reached by the traveled, clipped stream, never a new hitscan.
- `Player and AI both emit an intent ... routed through the same runSlot. Keep that symmetry.`
- No map, cape, military-vehicle, driver/occupancy, general damage-taxonomy, or arbitrary-target-framework work.
- Existing source definitions, entry cost, cooldown formulas, turret/fist/hammer damage, and energy regeneration remain unchanged. No roster conversion to resource mode.
- Absent lifetime mode means timed. Existing timed constructs retain `def.duration || 9`, current action/hold-trigger behavior, and survival after owner KO. Owner removal/disposal cleanup is the explicitly permitted universal lifecycle repair.
- Tests and inspection described here are future acceptance requirements, not evidence already obtained. This planning pass changes no runtime or tests.

## Decision ledger and completion boundary

| Decision | First-slice contract |
|---|---|
| Forms | Resource modes supported for `wall` and new native `tank` only. Existing fist/hammer/turret remain timed. Reject unsupported resource-mode imports, do not silently downgrade them. |
| Lifetime | Exactly one of `timed`, `upkeep`, `damage`. Resource modes ignore `duration`; no hidden timer or maximum age. |
| Continuous mode | Existence costs caster ki each simulation second. Hits physically stop attacks and show contact, but do not also charge per-hit ki. |
| Damage mode | Existence uses caster ki as the durability pool. Accepted hostile damage is converted to ki loss; no recurring upkeep. |
| Separate health | **Not in the baseline.** Adding HP to upkeep constructs is an unapproved design proposal requiring parent approval; do not add a second destruction budget incidentally. |
| Infinite energy | Recurring and damage-backed charges spend zero; do not collapse or emit DRAINED because of ki. Owner KO/removal/dismissal still apply. Infinite resource walls can therefore remain impervious while their owner lives; this is the existing infinite-core tradeoff, not an accidental exception. |
| Tank | Tracked hull moves toward owner-designated ground aim with limited speed/turn rate and stops at obstacles, then holds/fires a separately aimed native cannon. Not a stationary turret reskin and not a player-drivable military vehicle. |
| Unfinished larger requirement | Resource lifetime and targetability for moving fist/hammer and existing turret are **open follow-ons**, not completed by this slice. Do not mark “all constructs complete” in the completion ledger. |

“Physically hittable” is distinct from “independently killable”: upkeep contacts are real projectile/beam obstruction and melee contact; the lifetime budget is continuously paid energy. Damage mode additionally proves numerical caster-ki loss on those same contacts. No HP field, fake `alive` field, fake skeleton, or insertion into `game.entities` is needed.

## Source evidence and exact integration map

Line numbers are the current 2026-09-08 audit anchors; locate the named methods if parallel work shifts them.

| File / anchor | Responsibility and required edit |
|---|---|
| **Create** `src/engine/construct-policy.js` | Validated policy resolution, saturating ki debit, owner-group upkeep settlement and resource-only exhaustion cleanup. No meshes, UI, storage, or simulation timer of its own. |
| `src/engine/summons.js:112` `Construct` | Native policy state, callback-backed cover, tank hull/turret/motion/cannon, hit feedback, owner/slot registration, idempotent disposal. Existing `ConstructSurface` already accepts `Infinity` remaining life (`construct-surface.js:205`). |
| `src/engine/abilities.js:481` `TYPES.construct`, `:1187` denial | Keep legacy branch intact; resource-wall/tank spawn/dismiss branch; pass slot identity; do not issue false no-ki denial for dismissal. Keep hand/lock/control gates. |
| `src/engine/entity.js:1088` `_ko`, `:634` `dispose` | KO retires **resource** constructs only; dispose/removal retires all owned constructs. Do not put universal construct cleanup into `clearSlotFx`, which KO also calls. |
| `src/engine/game.js:3250` `spawnConstruct`, `:3902` update | Native slot registration and single resource-settlement call after Fighter updates/regen, before projectile/minion/construct steps. Keep legacy projectile-versus-construct update order. |
| `src/engine/game.js:2272` `areaDamage` | Dedicated construct splash loop, after Fighter loop, before world effects; attack damage is the authority for ki conversion. |
| `src/engine/game.js:2313` `worldImpact`, `:2361` `damageBlock`, `:2446` `shatterBlock` | Explicitly exclude construct proxies from city destruction; defensive callback dispatch before ordinary HP checks; no construct crack/vent/shatter/news/police/property path. |
| `src/engine/projectiles.js:316`, `:462` | Carry earliest cover identity into one direct-contact notification on regular and guided/swept contacts, including bounce/arm branches as specified below. |
| `src/engine/projectiles.js:1327`, `:1378` | Separate construct beam receiver before legacy cover's direct HP mutation; only the final reached receiver can be billed. |
| `src/engine/projectile-contact.js:20` `coverBoxEntry` | Optional finite `bottom` support for new proxies; preserve no-bottom behavior for all legacy cover. No alternative beam ray. |
| `src/engine/melee.js:442` `_resolveContact` | Compare native swept fist contact against construct bounds and Fighter contacts; resolve the nearer one once. Do not feed a Construct to `_resolveLight`/`_resolveHeavy`. |
| `src/data/attack-tuning.js:219`, `:246`, `:349` | Add construct fields, wall/tank form restriction, mode-dependent validation and visible field state; existing source-identity reconciliation remains authoritative. |
| `src/data/creator.js:189` command catalog | Add one tank catalog pick; existing `forcewall`, `wall`, `sentry`, `willfist` records remain byte-for-byte unchanged. |
| `src/tool/studio-combat.js:37`, `:222`, `:265` | Wire native game facade methods, matching budget settlement, tank movement rehearsal, resource contact rehearsal, native cleanup and measured readouts. Preserve audio gating. |
| `src/tool/studio-preview.js:68`; `src/tool/studio-main.js:61`, `:294` | Finite inspection duration for non-timed constructs, resource settings/readouts and accurate sequence copy. Effects controls remain presentation-only. |
| `src/engine/creatorUI.js:130`; `src/engine/hud.js:1721` | Concise generated lifetime description and active resource-mode chip; no misleading seconds for indefinite modes. |
| **Test-only by default:** `src/tool/studio-profile.js:52`, `:131`; `src/tool/character-package.js:20`, `:50` | Existing Attack profile propagation and catalog-based package validation already provide the portable path. Change only if a focused round-trip test demonstrates a missing field route; do not add another profile schema. |
| **Call, do not rewrite:** `src/engine/fog.js:98` `refreshFogBoxes` | Refresh on callback-cover insertion/removal. Moving tanks update cover coordinates immediately and batch fog refresh to at most 10 Hz, with a final refresh when stopped/removed. |

New tests: `tools/construct-policy.test.mjs`, `tools/construct-hit.test.mjs`, `tools/construct-tank.test.mjs`, `tools/construct-tuning.test.mjs`, `tools/resource-construct-studio.test.mjs`. Extend `tools/construct-studio.test.mjs` for default compatibility and reuse existing projectile/beam/melee fixtures. Browser script: `tools/resource-construct-browser.mjs`; final evidence report: `docs/reports/2026-09-08-resource-constructs-report.md`.

## Exact data contract

All values are flat fields on the existing attack source/override. Neither callbacks nor runtime owner references are serialized.

| Field | Allowed values / bounds | Fallback | Effective for |
|---|---|---|---|
| `constructLifetime` | enum `timed`, `upkeep`, `damage` | `timed` | Wall/tank authoring. Existing other kinds stay timed. |
| `duration` | finite 1–60 seconds | native `duration || 9` | Timed only; source default preserved. |
| `constructKiPerSec` | finite 0.1–100, step 0.1 | 12 | Upkeep only. |
| `constructKiPerDamage` | finite 0.01–10, step 0.01 | 1 | Damage only. |
| `moveSpeed` | finite 1–40 units/s | 12 | Tank only. |
| `turnRate` | finite 0.1–6 radians/s | 1.8 | Tank hull only. |
| `damage` | finite 1–120 | 18 | Tank cannon, pre-owner multiplier. |
| `interval` | finite 0.1–6 seconds | 1.2 | Tank cannon. |
| `speed` | finite 20–180 units/s | 90 | Native cannon projectile. |
| `range` | finite 10–160 units | 90 | Cannon target acquisition, measured from tank. |
| `blast` | finite 1–30 units | 6 | Native cannon projectile splash. Zero is not offered because Projectile currently has a truthy blast fallback. |

Keep both resource-rate controls visible with unit labels; disable/annotate the inactive one as “not charged in this mode.” Duration is likewise visibly inactive in resource modes. Never silently execute both rate fields if both are saved. Cost and cooldown are source readouts, not newly offered construct overrides. Construct kind is source-bound, not a free enum that turns a cheap wall into a tank.

Validation rejects unknown mode/form/fields, negative/zero/non-finite rates, rates outside bounds, and resource modes on fist/hammer/turret. Dormant valid rate values may round-trip; only the selected mode has effects. Do not materialize fallback fields into unedited source attacks. Returning a legacy wall to timed must restore native timed semantics rather than leave resource targetability latched on its next cast.

New catalog record (new balance, not a mutation of an existing kit):

```js
{ id: 'willtank', name: 'Will Tank', cat: 'command', cost: 28,
  ab: { type: 'construct', name: 'Will Tank', construct: 'tank',
    cost: 24, cd: 8, duration: 12,
    moveSpeed: 12, turnRate: 1.8, damage: 18, interval: 1.2,
    speed: 90, range: 90, blast: 6, color: '#7dff9e' } }
```

This pick starts timed. Example source-bound override values are `{constructLifetime:'upkeep',constructKiPerSec:12}` or `{constructLifetime:'damage',constructKiPerDamage:1}`. Package identity remains the genuine catalog attack, including cost/cooldown; values cannot replace the source snapshot.

## Lifecycle, energy, and slot invariants

Planned public module interfaces:

```js
// construct-policy.js
resolveConstructPolicy(def)
// -> { mode: 'timed'|'upkeep'|'damage', kiPerSec: number, kiPerDamage: number }
debitConstructKi(owner, amount)
// -> { spent: number, exhausted: boolean }; pure apart from owner.ki
retireOwnedConstructs(game, owner, reason, resourceOnly = false)
// -> number retired; invokes Construct._dispose(game, reason), never splices an iterated array
settleConstructUpkeep(game, dt)
// -> void; called once per positive simulation step, never from every Construct.update

// Existing native surfaces extended compatibly
Game.spawnConstruct(owner, def, slotState = null) // -> Construct|null (null only invalid new tank placement)
Construct.receiveHit(amount, {src, pos, lane})
// lane: 'projectile'|'beam'|'splash'|'melee'|'cover'
// -> { accepted: boolean, amount: number, kiSpent: number, destroyed: boolean }
Construct._dispose(game, reason = 'expired') // idempotent; reason stored on object for inspection
```

`debitConstructKi` must saturate, unlike the existing all-or-nothing `Fighter.spendKi`:

```js
export function debitConstructKi(owner, amount) {
  if (!Number.isFinite(amount) || amount < 0) throw new RangeError('Invalid construct ki debit');
  if (owner.energyInfinite) return {spent:0, exhausted:false};
  const available = Math.max(0, owner.ki);
  const spent = Math.min(available, amount);
  owner.ki = available - spent;
  return {spent, exhausted:owner.ki === 0};
}
```

- Timed: keep native timer decrement and actions, including KO survival; explicitly timed new tanks also expire by duration. No upkeep or damage-backed energy debit.
- Resource: `life=Infinity`, no decrement; surface receives `Infinity`. Check dead/owner KO/removal before motion/fire/contact. `update()` immediately returns false if already disposed.
- At settlement, retire invalid/removed owners' constructs first (all modes); retire KO owners' **resource** constructs only. Group all live upkeep constructs by owner, sum `rate * dt`, debit once, and on exhaustion retire **all that owner's resource constructs**, including damage-backed ones. Never let array order decide which upkeep tank gets a free final shot.
- A damage hit debits synchronously. If available ki is less than or exactly its cost, spend the remaining pool, emit one `game.onDrained(owner)` for that transition, and retire all resource constructs of that owner immediately. Later contacts see `dead` and spend zero. Do not defer destruction until after another projectile/construct update.
- A finite owner already at zero is exhausted even for a zero-time budget check, but `dt=0`/paused/seek presentation must not itself debit or advance simulation. Resource validity is checked before accepting a hit or performing native actions. No changes to ordinary Fighter regeneration or other abilities' payment rules.
- Simultaneous means deterministic engine order: current-step Fighter/ability work and regen, melee resolution, resource settlement, projectiles, then construct motion/fire in gameplay. Multiple hit events settle in native contact order; total spent never exceeds the pool. Studio must use the same resource/projectile/construct order for this slice, rather than its current construct-before-projectile order. Tests should disable regen for exact accounting and separately verify unchanged production regen.
- Entry payment remains a single `pay()` with existing cooldown formula. Legacy spawn/action branch stays intact. New tank placement must succeed before its entry cost/cooldown is charged; an invalid placement spawns no mesh, cover, or FX and records `slotState.placementDenied=true` for clear feedback.
- New tank and resource-wall branch: one live object per owner + stable slot key, not merely slot-state object identity. `spawnConstruct` derives `slotKey` from the supplied state in `owner.slots`, then stores both `slotKey` and `slotState`. Find/rebind a surviving **new tank** after timed KO clears `active`, and never pay/spawn twice while it exists. If the slot state/definition is replaced while its owner remains, retire that slot's old new-mode construct with reason `slot-replaced` before spawning the replacement. On disposal clear `slotState.active` only if it still refers to that object. Do not clear a replacement object accidentally. Direct test-only construction without a supplied slot state is allowed, but does not claim an ability slot.
- Resource wall: release does **not** detonate it even if the source has `holdTrigger`; a fresh second press dismisses it without explosion, fee, or cooldown reset. Tank uses the same press-to-dismiss. Dismiss ignores spawn affordability/cooldown, but does not bypass actor/action/slot-unlock gates. Focus loss or generic input cancellation is not a dismissal gesture.
- Existing timed wall release/detonation and timed fist/hammer/turret actions stay exactly on the old branch. Its old KO slot-clearing behavior is not silently redesigned to extend the new invariant to every legacy summon.
- Fighter `_ko` calls `retireOwnedConstructs(game,this,'owner-ko',true)` before active references are cleared. `dispose()` calls it with `resourceOnly=false`. A membership check catches removal without a normal disposal path. Match/reset already dispose constructs; use the same idempotent route.
- `_dispose` releases any held victim, removes dynamic cover from `world.cover` (never add to `coverAll`), refreshes fog, removes visual/surface resources, and marks dead exactly once. No detonation on depletion/KO/removal. Existing projectiles already fired by a tank retain normal caster attribution/lifetime; disposal stops new fire, it does not invent a global projectile purge.

## Physical receiver and team policy

Resource walls and all new tanks have a separate cover receiver, not Fighter target data:

```js
// Runtime-only record; hp is deliberately absent.
{
  x, z, hx, hz, r: Math.hypot(hx,hz), bottom, top, h:top,
  projectileShape:'box', mesh:construct.body, construct,
  onConstructHit:(amount, options)=>construct.receiveHit(amount, options)
}
```

Use a bounded world-space box around the solid wall or tank hull/turret; surface particles never determine protection or contact. Rotation updates the conservative AABB half-extents. Document that bounds are conservative around rotated hull corners, not per-triangle armor. `coverBoxEntry` supports an optional lower plane for these records; missing `bottom` keeps the old downward-unbounded city/legacy shape. Solid records block bodies, projectiles and traveled beams from **all** teams, as existing walls do; friendly shots are not magically transparent.

Accepted hostile damage uses `game.isFoe(src, construct.owner)`, preserving native teams/fixation. Self hits do not bill. Friendly direct/beam/melee hits obstruct but bill zero. Friendly splash follows the existing `friendlyFire` option: other same-team owners take half damage when enabled, self remains excluded. Unknown/null source is non-billable in this combat slice. Keep accepted amounts already scaled at their damage route; `receiveHit` never reapplies `src.powerBuff`.

No hard lock, homing target, AI target selection, guard, grab, ragdoll, status effects, siphon, XP, kill, or combo credit is attached to a construct. Players can aim at its actual shape, and bots can hit it incidentally while pursuing its owner. The tank selects real hostile Fighters with `nearestFoe`, checks line of fire, and credits its native projectile to its owner. Deliberate AI “break this construct” selection is separately open.

### One damage route per attack event

| Lane | Authoritative amount for construct receiver | Deduplication / exclusions |
|---|---|---|
| Ballistic or other non-explosive direct cover contact | `projectile.damage * projectile.caster.powerBuff` | Notify once in the actual cover-contact branch. Include the guided early-return path. Do not also notify inside `_impact`. A ricochet's later, distinct contact is a new hit, not a per-render-frame repeat. |
| Explosive projectile contact / delayed arm / remote burst | Only native `areaDamage` amount, currently `damage * .8 * caster.powerBuff * falloff` | Do **not** bill direct damage on first cover touch. An armed projectile bills only when it actually detonates; neighbors each receive one splash hit. Native Fighter direct-plus-splash behavior is not changed. |
| Splash from nova/hammer/explosion | `damage * caster.powerBuff * falloff * teamFactor` | Add a separate construct loop to `areaDamage`. Distance is 3D distance to the closest point on its box, falloff `1 - .6*clamp(distance/radius,0,1)` for distance <= radius; skip non-positive radius/damage. No second cover-power debit. |
| Sustaining traveled beam | `dps * caster.powerBuff * dt` | Once per beam step at the first actually reached construct; do not use legacy city-cover `dps * 2 * dt`. A nearer Fighter/interior/clash cutoff must suppress a farther stored `blockedCov` hit. No damage before traveling tip arrival or after sustain ends. |
| Swept melee | Existing unblocked light/heavy amount, once per swing, no counter/punish multiplier on objects | Compare contact time with Fighter contact, choose first, mark `strikeHit` with the construct object, then call dedicated resolver. No second Fighter resolution through a wall. |
| Explicit cover callback | Caller-supplied combat amount and source, lane `cover` | `Game.damageBlock` checks `onConstructHit` before `hp`; returns immediately. This is a defensive native seam, not another worldImpact billing lane. |

In `worldImpact`, explicitly skip `c.construct` even though its HP is absent. In `damageBlock` dispatch the callback first; never run block cracks, vents, property statistics, police heat or `shatterBlock`. Add an early construct exclusion in `shatterBlock` as a safety backstop. The existing beam cover mutation needs its own callback branch before the HP condition—changing `damageBlock` alone misses beams.

An explosion may still legitimately crater ground or destroy a *real* adjacent city block through the existing world-effects path. The prohibition is against counting the construct itself as city property or charging its owner again from cover `power * 20`; it is not immunity for surrounding real scenery.

Body slams into constructs, thrown props, environmental hazards with null source, and non-swept legacy cone-melee receivers are not newly damage-enabled here. Their existing physical obstruction remains; these are explicitly recorded follow-ons rather than fake hit coverage.

## Native tank behavior (bounded, no vehicle framework)

- In `Construct` build a 10u-wide by 14u-long tracked hull, two visible track banks, an independent turret pivot and forward barrel; solid envelope from terrain to 8u high. Use native owner-colored materials and `ConstructSurface`. All unique geometry/materials are disposed once. No primitive cone fallback for `tank`.
- Spawn on open ground 16u ahead of owner using horizontal aim; `heightAt(x,z)` supplies ground height. Reject positions outside `world.ARENA` bounds, overlapping cover/interior walls, or overlapping a live Fighter's body. Perform this check before creating graphics/payment. Surface water/pathfinding are not added.
- Destination is current `game.aimPoint` for the primary player; other owners use their position plus horizontal aim * 26, matching the existing bot construct target convention. Studio supplies the same designated ground point. Two-player independent cursor destinations are not promised by this slice; pad/bot owners get the bounded direction target, never another player's cursor.
- Hull yaw approaches the destination bearing by at most `turnRate * dt`. Move only when heading error <= 0.35 radians; speed <= `moveSpeed`. Stop within 2u of destination. Use substeps with translation <= 0.5u and yaw change <= 0.05rad so a coarse frame cannot tunnel or rotate through an obstacle.
- Candidate move/turn recomputes the AABB; reject overlap with any other cover, room wall, or live Fighter. Ignore only its own proxy. Reject terrain height changes > 1u per substep and arena exits. On rejection keep the last safe transform and mark `state='blocked'`; no sliding solver, ramming damage, climbing or pathfinding. Resume if owner moves the designated aim into a clear direction.
- Hold/fire when within 2u or blocked; do not fire while translating. Turret independently tracks the nearest real foe within `range`, yaw-limited to 3 radians/s and pitch-limited to -0.2..0.6 radians. Fire only within 0.08 radians of the desired aim and with clear native cover/interior line of fire. Ignore own proxy only for this line-of-fire query; do not change global contact filtering.
- Spawn the native projectile from the visible barrel muzzle beyond the expanded own-box boundary (projectile radius 1 plus 0.2u separation). Barrel length/aim must agree with that muzzle. Set caster=owner, radius=1, configured damage/speed/blast, normal projectile ground collision, and `fireCd=interval`. No direct target damage or per-shot ki charge in addition to the selected lifetime mode. No cooldown reset for blocked/ineligible shots.
- Every frame checks dead, resource owner validity and exhaustion before movement or firing; a tank depleted by an earlier projectile does not fire later in that frame. Its collision and solid transform update together; moving fog refresh is batched as specified above.

## Implementation tasks and test gates

### Task 1 — Policy, native ownership, and no-regression lifetime

**Files:** Create `src/engine/construct-policy.js`, `tools/construct-policy.test.mjs`; modify the named native Construct/ability/entity/game seams. Extend `tools/construct-studio.test.mjs` only for compatibility cases. Tank geometry is Task 2, not a new generic summon system.

**Consumes:** native `game.constructs`, `owner.ki`, `owner.energyInfinite`, `owner.alive`, `owner._remove`, `game.entities`, `game.onDrained`.

**Produces:** policy functions and disposal/slot interfaces defined above. `resolveConstructPolicy` returns both rates as zero for timed, only upkeep rate for upkeep, only damage rate for damage. It rejects unsupported resource forms even when raw runtime data bypasses profile validation.

- [ ] Add numerical policy tests before runtime integration:

```js
test('construct debit exhausts exactly and never overdraws',()=>{
  const owner={ki:3,energyInfinite:false};
  assert.deepEqual(debitConstructKi(owner,5),{spent:3,exhausted:true});
  assert.equal(owner.ki,0);
  assert.deepEqual(debitConstructKi(owner,5),{spent:0,exhausted:true});
  owner.energyInfinite=true;
  assert.deepEqual(debitConstructKi(owner,100),{spent:0,exhausted:false});
});
test('resource policies are exclusive and old definitions stay timed',()=>{
  assert.deepEqual(resolveConstructPolicy({construct:'wall',duration:9}),
    {mode:'timed',kiPerSec:0,kiPerDamage:0});
  assert.deepEqual(resolveConstructPolicy({construct:'wall',constructLifetime:'damage',constructKiPerSec:20,constructKiPerDamage:2}),
    {mode:'damage',kiPerSec:0,kiPerDamage:2});
  assert.throws(()=>resolveConstructPolicy({construct:'fist',constructLifetime:'upkeep'}));
});
```

- [ ] Run `node --test tools/construct-policy.test.mjs`; expected initial failure is missing exported implementation, not fixture setup failure.
- [ ] Implement policy resolution with explicit finite/bounds checks from the schema; use the exact saturating debit body above. Add grouped settlement and immediate resource-only exhaustion retirement. `_dispose` marks dead before releasing resources; it does not splice `game.constructs` while collision loops iterate.
- [ ] Add native assertions using real `Construct` and existing minimal Three.js test world: timed wall after 1s remains life 8 and unchanged ki; timed wall survives owner KO; upkeep wall survives beyond its source 9s while energy remains; damage wall idles without drain; **post-entry** 20 ki at 5 ki/s for 2s leaves 10 with regen disabled; exact exhaustion and two upkeep walls at 3+4 ki/s with **post-entry** 6 ki both disappear on a 1s step in either array order. Keep entry payment assertions separate from recurring-debit assertions.
- [ ] Add KO/removal/slot tests: resource KO clears cover immediately, legacy timed KO does not; owner dispose removes both; update-after-dispose returns false; low-ki/cooldown dismissal does not emit denied feedback/pay/explode; release/focus loss does not dismiss resource wall; repeated spawn input cannot duplicate; replacing a slot-state object cannot retain a second live construct under the same key; disposal of old object cannot clear a replacement slot reference.
- [ ] Wire the branch without changing generic `ready`, `pay`, regeneration or `clearSlotFx`. Suppress the `runSlot` unaffordable-press message only for a valid existing resource-wall/tank dismissal. Preserve the timed legacy branch as the regression oracle.
- [ ] Run `node --test tools/construct-policy.test.mjs tools/construct-studio.test.mjs tools/construct-surface.test.mjs`. Review new lifetime policy against the ledger before enabling tank authoring.

### Task 2 — Native moving tank with a real projectile cannon

**Files:** Modify `src/engine/summons.js`, named `spawnConstruct`/ability seams; create `tools/construct-tank.test.mjs`. No city movement/pathfinding edits.

**Consumes:** Task 1 policy, slot identity, disposal and update guard. **Produces:** tank geometry, placement result, `state='moving'|'blocked'|'holding'`, one dynamic cover proxy, native projectiles attributed to owner. All constants/data values are specified in the tank section.

- [ ] Create a real-Construct test with `construct:'tank'`; assert it has named hull/track/turret/barrel meshes, not `ConeGeometry`, and one cover record. Assert two casts in one slot cannot yield two live tanks. Initial expected failure: current fallback cone/no tank motion.
- [ ] Add exact movement tests: clear 1s motion does not exceed 12u; 90-degree aim change never exceeds 1.8rad/s; translation waits for heading alignment; a 0.2s step cannot cross a 0.2u-thick wall; an in-place turn into cover is rejected; body/interior/arena/height-step rejection leaves the last safe pose and no ramming damage.
- [ ] Implement candidate-transform collision using native cover extents and interior-wall extents, excluding only own proxy. Substep count is `ceil(max(moveSpeed*dt/.5, turnRate*dt/.05, 1))`; commit pose/proxy only after each accepted candidate. Use `world.heightAt` and update scene matrices before the next contact query.
- [ ] Add cannon tests: target acquisition from tank position, owner attribution, independent turret aim, one shot per configured interval, no shot through a nearer wall, no shot while moving, valid muzzle outside own proxy, projectile contact reduces a real target's HP. Exhaust tank immediately before its update and assert no additional projectile. These tests must not call `foe.takeDamage` directly to simulate the cannon.
- [ ] Implement the native spawn with the ordinary projectile parameters:

```js
game.projectiles.spawnProjectile(owner, {
  pos: muzzle.clone(), vel: aim.clone().multiplyScalar(def.speed ?? 90),
  radius: 1, damage: def.damage ?? 18, blast: def.blast ?? 6,
  color: this.color, color2: '#fff'
});
```

Here `muzzle` and normalized `aim` are computed from the current independently aimed barrel; placement/collision/line-of-fire checks precede this call. Do not fabricate damage or reuse the global temporary vector across spawn calls.

- [ ] Run `node --test tools/construct-tank.test.mjs tools/construct-policy.test.mjs tools/construct-surface.test.mjs`. Verify tank disposal removes proxy/mesh/surface and fog updates after stop/removal.

### Task 3 — Real direct, splash, beam and swept-fist receiver lanes

**Files:** Modify `src/engine/summons.js`, `src/engine/game.js`, `src/engine/projectiles.js`, `src/engine/projectile-contact.js`, the bounded `_resolveContact` branch in `src/engine/melee.js`; create `tools/construct-hit.test.mjs`.

**Consumes:** callback proxy and synchronous energy/disposal contract. **Produces:** `receiveHit` results; no new Fighter target contract. Record `construct.hitCount`, `construct.damageReceived`, `construct.kiSpent` for Studio diagnostics, not score/XP.

- [ ] Add tests using actual native projectiles/beam updates and a damage-mode wall with **post-entry** 100 ki, conversion 2, source powerBuff 1: ballistic damage 10 spends 20; explosive damage 10 centered on receiver spends only 16 from native 0.8 splash (not 36 and not another cover-power amount); remote/armed payload spends nothing before explosion. A neighboring receiver in the same blast is billed once with its own falloff.
- [ ] Add native traveled-beam tests: dps 20 for an actually contacting 0.25s spends 10; zero before tip arrival; zero through a nearer real wall/Fighter; zero from ended sustain; zero city stats/shatter calls. Add two-construct 15-ki pool with two 10-ki accepted hits: first spends 10, second spends 5, both retire, any third spends zero.
- [ ] Run `node --test tools/construct-hit.test.mjs`; expected initial failures are missing ki loss/contact callbacks, not render/browser dependencies.
- [ ] Implement exactly the route table. Direct callback happens in native contact dispatch, not `_impact`; splash is exclusively `areaDamage`; `worldImpact` skips proxies. Keep legacy city-cover HP mutation in its existing branch. Add `bottom` clipping only for opted-in box records.
- [ ] Extend `_resolveContact` with a separate construct candidate from the same fist segment, radius 0.42, active interval and authored reach. Use the existing earliest obstacle query so a nearer city cover/interior prevents billing a construct behind it; do not replace the Fighter resolver or extend all legacy cover-melee behavior. Measure authored reach to the actual contact point rather than a large wall's center. Compare segment parameter against Fighter hits and select nearest; add the construct object to `strikeHit` so repeated active frames cannot bill again. For the non-humanoid resolver use the existing damage formula without guard/counter logic:

```js
const wound = 1 - .08 * (f._wounds?.arm || 0);
const jab = f.sheet?.jabMult || 1;
const mom = swingMult(f);
const heavy = f.mKind !== 'light';
const weight = punchWeight(f, heavy);
const damage = heavy
  ? (f.mHay ? 20 + f.mP * 14 : 13) * weight.damage * f.powerBuff *
      (f.mHay ? 1 : jab) * wound * mom
  : ((f.strikeIdx === 2 && f.mId === 'cross') ? 17 : 8) *
      mom * weight.damage * f.powerBuff * jab * wound;
construct.receiveHit(damage,{src:f,pos:impactPoint,lane:'melee'});
```

`swingMult` and `punchWeight` are existing melee helpers; `impactPoint` is the selected segment/box intersection. Preserve native attacker recovery/combo timing and use existing contact/melee audio once. Do not give the object guard crush, lifesteal or humanoid status fields.

- [ ] Add fist tests with native active swings: contact spends ki once; just-outside/above/below misses; a construct before a Fighter prevents that swing reaching the Fighter; a nearer Fighter prevents a farther construct hit; friendly contact spends zero; actual heavy formula applies exactly once. Include all-team physical obstruction, friendlyFire splash half-rate, self exclusion, infinite core and removal during iteration.
- [ ] Run `node --test tools/construct-hit.test.mjs tools/projectile-contact.test.mjs tools/beam-cover-contact.test.mjs tools/beam-body-contact.test.mjs tools/moving-melee.test.mjs tools/construct-policy.test.mjs`. Any change to ordinary beam, Fighter melee or legacy cover outcomes is a blocker for this task.

### Task 4 — Portable authoring and truthful Studio rehearsal

**Files:** Modify registry/catalog and Studio/UI seams in the map; create `tools/construct-tuning.test.mjs`, `tools/resource-construct-studio.test.mjs`, `tools/resource-construct-browser.mjs`. Extend existing profile/package tests; only change profile/package production code for demonstrated gaps.

**Consumes:** exact schema, native Game methods and hit diagnostics. **Produces:** same effective construct attack in gameplay and Studio, existing validated character export/import, labeled budget/contact inspection and evidence report.

- [ ] Add source-bound override tests with `attackFields`, `setAttackOverride`, `applyAttackOverrides`, `resetAttackOverride`: unedited old wall is deeply equal to source; mode/rates survive; cost/cd/kind cannot be overwritten; mismatched source identity strips override; unsupported resource forms and invalid values reject; resetting restores old timed semantics.

```js
const def={abilities:{q:{type:'construct',construct:'wall',cost:12,cd:7,duration:9}}};
const attacks=setAttackOverride({},def,'q',{constructLifetime:'damage',constructKiPerDamage:2});
const tuned=applyAttackOverrides(def,attacks);
assert.equal(tuned.abilities.q.constructLifetime,'damage');
assert.equal(tuned.abilities.q.cost,12);
assert.equal(tuned.abilities.q.cd,7);
assert.equal(tuned.abilities.q.construct,'wall');
assert.deepEqual(applyAttackOverrides(def,{}).abilities.q,def.abilities.q);
assert.throws(()=>setAttackOverride({},def,'q',{construct:'tank'}));
```

- [ ] Run `node --test tools/construct-tuning.test.mjs`; expected initial failure: construct is currently unsupported by attack tuning.
- [ ] Add only this schema to `ATTACK_TUNING_FIELDS`, constrain definitions to source wall/tank for resource settings and tank-only cannon/motion fields, preserve sparse overrides and strict source reconciliation. Use the existing enum/number metadata renderer, not another settings panel. Add the genuine `willtank` catalog record above.
- [ ] Add a profile/package round-trip using a real ORIGIN `willtank` pick with resource mode: export, import to new local id, apply profile, compare effective attack in gameplay and native Studio. Tamper source snapshot/cost and assert rejection or reconciliation stripping, never runtime execution. No package callbacks/raw arbitrary definitions are accepted.
- [ ] Wire `settleConstructUpkeep` and Game's native `areaDamage`/`damageBlock` surfaces into Studio. For resource wall/tank previews suppress legacy .7+cd second press and hold release; do not let them dismiss before the inspection hit. Keep old timed previews unchanged. The resource sequence is spawn at 0.6s, native incoming projectile at 2.5s aimed at the actual proxy, resource observation, dismiss at 6s, and cleanup by 8s. For moving tank designate clear ground at 1s, then a holding point at 3s; cannon uses real target contact. Fixed 8s resource inspection is a preview transport limit, never a runtime lifetime cap.
- [ ] Rehearsal controls expose finite owner starting ki, infinite-core status, native budget mode/rate, construct accepted-hit count/amount and ki spent. Keep existing humanoid `damage/contacts` readout separate; label upkeep “physical hit; no per-hit ki charge.” Low-energy runs visibly collapse and use the existing debounced native Studio DRAINED audio route. Add melee/beam verification to the native automated tests rather than fake Studio animation-only hits.
- [ ] Add Studio tests: same numerical wall hit as gameplay with regen controlled; upkeep and damage mode exclusivity; duration does not end resources; seek rebuild produces same ki/contact count once; pause/zero-dt does not spend; reset/hero swap/dispose removes every cover/mesh and stops future charges/fire; source/secondary slot isolation; no sound on seek and no replayed warning after reset. Existing timed construct lifecycle test remains green.
- [ ] Run the focused gate below, then one browser evidence pass. Record exact measured amounts, console errors, collision/cleanup observations and omitted follow-ons in the report; do not infer movement feel or hit readability solely from passing tests.

```powershell
node --test tools/construct-policy.test.mjs tools/construct-tank.test.mjs tools/construct-hit.test.mjs tools/construct-tuning.test.mjs tools/resource-construct-studio.test.mjs tools/construct-studio.test.mjs tools/construct-surface.test.mjs tools/attack-tuning.test.mjs tools/studio-profile.test.mjs tools/character-package.test.mjs tools/projectile-contact.test.mjs tools/beam-cover-contact.test.mjs tools/moving-melee.test.mjs tools/studio-audio.test.mjs
node tools/resource-construct-browser.mjs
```

Browser acceptance: native game wall shot drains exactly the selected caster budget; tank assembles as a tank, travels/turns/stops against cover, aims/fires visibly from its barrel and damages a real enemy; hit/exhaustion removes actual protection; owner KO and hero removal clean resources; timed wall still survives KO until expiry; Studio edits/export/import/rehearsal match; no stale collider, ghost shot, city-property credit or console error. Capture before/contact/depleted states, not only assembly particles.

## Open follow-ons — remain open in the completion ledger

- Resource life/physical target volumes for cursor-steered fist, moving hammer and existing turret; grabbing-victim cleanup under mid-contact destruction needs its own native cases.
- Direct AI construct targeting, lock-on/homing support and dedicated tactical team policy beyond current owner hostility.
- Body-slam/throw/environmental damage and non-swept legacy cone-melee damage receivers; do not claim these are tested by projectile/swept-melee coverage.
- Per-player independent ground-designation interface for second-player tanks; this slice uses cursor for primary and directional ground designation for other owners.
- Tank navigation around obstacles, ramming, drive/entry/exit controls, military tank AI, planes and helicopters. None is implied by a native construct tank.
- Optional upkeep HP is a separate **unapproved** design proposal; it must not appear in runtime/schema without parent approval.

## Planning self-review

- Coverage: Tasks 1–3 cover native lifecycle, OR-mode energy, collision accounting, team/infinite-energy/simultaneous-exhaustion rules; Task 2 covers moving native tank; Task 4 covers source-bound portable authoring and native Studio evidence.
- Compatibility: explicit legacy timed/KO branch retained; only owner removal/disposal universally repaired. No source/cost/cooldown/regen rewrite, city damage change, or Fighter impersonation.
- Scope: wall+tank is the complete first slice; other forms and receiver lanes remain visibly open above. No runtime/test execution was performed to prepare this brief.
