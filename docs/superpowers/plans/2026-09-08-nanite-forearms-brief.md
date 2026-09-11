# Native Nanite Forearms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This handoff is planning only; delegation, runtime edits, staging and commits are not authorized by the planning task.

**Goal:** Ship two reusable, source-bound forearm capabilities: an assembled charge cannon that fires from its moving barrel and an assembled shield that physically intercepts attacks, each with local damage, visible breakaway/reform and portable Studio authoring.

**Architecture:** Add a small per-Fighter nanite state reducer and a figure-owned attachment adapter, not a second actor, generic component framework or particle-only power. Reuse native charge payment/projectiles, guard eligibility, final-pose transforms and existing collision managers. Studio supplies repeatable inputs to those same native objects.

**Tech Stack:** Existing JavaScript ES modules, Three.js procedural geometry/InstancedMesh/MeshStandardMaterial, Vite and Node's native test runner. No new dependency, model provider, physics engine or purchased asset.

**Spec:** `docs/COMPLETION_LEDGER.md:7–8,21–22` identifies the exact supplied attachments: `C:/Users/taskm/.codex/attachments/2bcce36c-a5d7-40eb-aeb3-62c0afa8c1e2/pasted-text.txt` and `C:/Users/taskm/.codex/attachments/24eebba6-00c6-44eb-98ed-27f16ec4a37d/pasted-text-1.txt`. Both were read for this brief. Read `PRODUCT.md`, applicable `AGENTS.md` and `docs/DESIGN_DECISIONS.md` before execution.

## Global Constraints

- User requirement: metallic fragments travel along the forearm, form a cannon or shield, break away locally on impact and reform. Settled formations must be solid and readable, not fuzzy holograms; the capability must not be hardcoded to one character.
- User requirement: expose formation shape, attachment, assembly timing, material, particle density, charge stages and impact response; save/export; moving-character previews; gameplay-camera readability; custom-body fit; pause/slow motion; simultaneous fighters; KO cleanup.
- Preserve independent movement/aim, actual animated emission, native cover occlusion and Strike > Grab > Guard > Strike. Beams remain traveling hoses. Existing non-nanite source data, payment, cooldowns, damage and guard behavior remain unchanged.
- No purple; use warm-neutral metal and gold/amber highlights. Do not touch the movement, audio, correspondent or resource-construct plans as part of this slice.
- Do not call a Studio scripted path an AI playtest or a still image motion evidence. This document contains proposals and source inspection, not new runtime verification.

## Scope and accepted initial defaults

The complete first slice is **one charge-cannon source plus one physical shield source**, usable separately or equipped together on opposite forearms by a custom ORIGIN fighter. They automatically assemble when the life starts and their slot is unlocked. The cannon's slot charges/releases; the shield's slot toggles deployment, while ordinary Guard input raises/lowers the deployed shield. Opposite-arm support does not grant a new sustained guard-and-fire mode; the exact native action policy is recorded below. Initial assembly and each broken cell's reform are mandatory capability gates, not decoration.

The attachment did not specify numerical balance, passive repair, deployment controls or damage absorption. The parent accepted the following on September 8 as **initial, explicitly unbalanced new-source settings**. They are engineering/design defaults, not numbers or controls supplied by the user:

1. Six structural cells for the cannon; nine for the shield. Each has 12 integrity by default. All cannon cells must be intact to charge/fire. A shield protects only intact cells physically struck while native guard is eligible; a hole is not protected by the nanite module.
2. A hit subtracts local integrity. After 0.40 s without another hit, an injured cell visibly repairs over 0.75 s; integrity returns to maximum only at completion. Intact-but-dented cells remain functional during repair; broken cells remain absent/non-protective until completion. There is no shared invisible shield HP pool.
3. An eligible shield cell absorbs up to its remaining integrity; excess goes through the existing Fighter damage pipeline once. Cannon armor is **not** free body protection: a cannon contact damages its cell and delivers the original hit to its owner. An unraised/retracted shield grants no nanite absorption. Unblockable attacks, true damage and grabs never gain a new shield defense; haymaker guard-crush remains authoritative.
4. Nanite repair/deployment has no energy cost in this first slice. Cannon charging uses native finite/infinite-core rules. No existing character gets this capability automatically. New ORIGIN prices and cannon values below are accepted starting settings, not demonstrated balance.

### Global Guard policy and staged source publication

- **Equipment coexistence, no new guard-fire exception.** `Game.controlPlayer`, `controlPad` and `controlBot` include `guarding` in their global `busy` predicate (`game.js:3556,3615,3817`). The hand mask is an additional anatomical restriction, never permission to bypass that predicate. A held Guard therefore blocks a new cannon charge, continued charge input and the shield deployment-toggle press even on opposite arms. Lower Guard before issuing a fresh cannon/toggle press; the installed shield remains visible but grants no nanite absorption while unguarded.
- **Preserve the native transition release.** `feedSlot` (`game.js:67–71`) masks `pressed`/`held` while busy but forwards `released`; `TYPES.charge` (`abilities.js:379–416`) also resolves an existing charge on `!inp.held`. Thus a previously paid player/pad charge can produce its one normal release/fizzle on entry into Guard. Do not suppress that cleanup, invent a refund, or claim zero possible projectiles on the guard-transition frame. The shield may protect during that ordinary guard frame if all its native/local eligibility checks pass. Bots' existing `!busy` dispatch (`game.js:3817–3824`) is different; preserve it rather than changing bot charge scheduling in this slice.
- `MeleeSystem.guard` (`melee.js:336–345`) does not itself forbid a ranged charging slot, and `ready`/`runSlot` (`abilities.js:27,1143`) do not implement Game's global guard mask. Direct calls to `runSlot` with `guarding=true` are therefore **not evidence** that a new gameplay guard-fire mode is legal. The nanite Studio pattern must apply the same busy input mask, including forwarded release, and test actual player/pad control separately. Existing ki-recovery Guard remains unchanged: city `chargingKi` can become defenseless (`entity.js:1486–1512,954–956`), while ordinary slot `st.charging` is a different state.
- **Task 1 publishes no actionable source.** Keep nanite source definitions private to its native test fixtures; do not add either entry to user-facing `POWERS`, examples, ORIGIN choices or package recipes yet. Publish the cannon only at the end of Task 2 after its readiness/charge/emission gates pass. Publish the shield at the end of Task 3 after actual protection/local damage passes; publishing it with only Task 2's toggle would still expose a non-protecting shield. Task 4 verifies the resulting public pair and their package round trip. This is deferred publication, not an inert source silently offered to users.

Do not mark the full nanite/authoring ledger rows complete from this document. Completion requires the native feature and acceptance evidence below. Different body parts, arbitrary meshes, nanite vehicles, full-body armor, swarm attacks, global dismemberment, bespoke recorded audio and online synchronization are separate follow-ons.

## Existing seams that determine the implementation

Line anchors were inspected September 8; use symbols if concurrent edits move them.

| Native seam | Evidence and consequence |
| --- | --- |
| Figure build and rig | `src/engine/figure.js:103,335,357,441–447`; `src/engine/hero-rig.js:46,62,98`. Forearm is `arm.children[1]`; hand is its **sibling**, child 2. `bendArm` moves both independently. Attach to the driven forearm, not the arm pivot or hand; do not rename/reparent the rig contract. |
| Anatomical side | `src/engine/hand-emission.js:1–13`; `src/engine/hero-skin.js:96`. New **right-forearm maps to legacy `parts.armL.children[1]`**, left-forearm to `parts.armR.children[1]`. Preserve old hand/socket names and volley conventions. |
| Custom body and resource ownership | `src/engine/hero-skin.js:127,169–184` hides procedural skin, keeps gear and exposes `parts.skin.meshes/records/skeleton`. Add attachments after skin binding but before `installForegroundVisibility` in `figure()`. `Fighter.applyForm` (`entity.js:535–605`) and `dispose` (`:635`) retire geometry/material/skeleton resources reference-safely, but `figureResources` (`:65`) does **not** yet retire InstancedMesh-owned attribute buffers. This slice needs the explicit ownership adaptation below. |
| Actual firing | `weapon-emission.js:3` searches only fist children; final firearm correction in `combat-pose.js:433–455` rotates the hand. A forearm cannon cannot use that wrist correction unchanged. `power-emission.js:30,47` and `projectiles.js:325–360` resolve final-pose charge positions and aperture-to-orb cover checks. |
| Costs and interruption | `abilities.js:28–40,69–92,363–407,1129–1192`: native paid charge, `cancelHeldSlot`, unlocks and hand contention. A nanite readiness denial belongs before payment and input-use stamping; a broken charging cannon uses `cancelHeldSlot`, not an invented refund path. |
| Real incoming contact | `attack-interception.js:49–100` chooses earliest ordinary projectile contacts, with a generous body cylinder; `beam-body-contact.js:54–105` finds traveled beam/body contact; `projectiles.js:522–565,1162–1181,1493–1540` carries contacts to damage. Attached modules must join these actual routes, not become world cover or fake Fighters. |
| Swept melee | `melee.js:83–101,441–481` snapshots both actors then sweeps actual fists against rendered-part bounds; `melee-pose.js:87` accepts the previous matrix. Add a bounded cell lane to that frame, preserving active windows, reach, one hit per strike and entity-order independence. |
| Guard and material | `melee.js:336`, `guard-pose.js:20`, `entity.js:818–988`; `shield-surface.js:68`. Native guard owns eligibility, direction, guard meter/crush and baseline chip. Existing translucent guard-ripple material is not an opaque nanite shell. Metal contacts must use the actual cell hit point. |
| Portable authoring | `attack-tuning.js:48,246,292,340,349,386`; `studio-profile.js:75,131`; `character-package.js` rebuilds a catalog recipe before applying profiles. Keep source-identified flat Attack overrides, not a new package format or trusted imported runtime definitions. |
| Stage clocks | `studio-combat.js:81,191,260–267`, `studio-preview.js:56–64,145–177,211`. Studio animates Fighters without calling their full update; seeking also performs 90 pose-settling frames. Tick nanite state explicitly once, and **never during pose settling**. |

## Exact source/configuration proposal

At the publication gates above, add catalog entries `nanite-cannon` (ORIGIN price 28, category `charge`) and `nanite-shield` (price 20, category `buff`). They use the immutable native marker `naniteForm: 'cannon' | 'shield'`; this marker/type is **not** an Attack override. A shield is a small `TYPES.naniteShield` handler, not the existing dome, shieldpack, barrier or returning-shield projectile.

```js
// Proposed catalog bases; all other nanite settings come from NANITE_DEFAULTS.
{ type: 'charge', name: 'Nanite Forearm Cannon', naniteForm: 'cannon',
  naniteAttachment: 'right-forearm', castStyle: 'palm', castHand: 'right',
  cost: 6, cd: 1.2, kiPerSec: 12, maxCharge: 1.8,
  minR: .55, maxR: 1.8, dmgMin: 20, dmgMax: 64, maxBlast: 18,
  speedMin: 65, speedMax: 105, chargePower: 2.2,
  color: '#ffd97a', color2: '#ffffff' }
{ type: 'naniteShield', name: 'Nanite Forearm Shield', naniteForm: 'shield',
  naniteAttachment: 'left-forearm', cost: 0, cd: .2 }
```

For tagged cannon sources the renderer says **Forearm cannon**, not Palm projection: `castStyle:'palm'` is only the existing single-arm carrier basis. Hide/reject `emissionOrigin`, `faceOrigin`, `chest`, `castStyle` and `castHand` overrides for this source; derive the internal hand from `naniteAttachment` in `materializeAttack`. The dedicated forearm adapter owns its final aiming. Existing generic source choices are untouched.

The Formation section exposes Cannon / Shield through the existing ORIGIN source chooser. Within that source, expose the following flat fields through `attackFields`; none can grant a nanite capability to an ordinary source. Shape is deliberately limited to these two source families and their measured dimensions/edge profile.

| Field | Proposed default | Accepted values / units |
| --- | --- | --- |
| `naniteAttachment` | right cannon / left shield | `right-forearm`, `left-forearm` |
| `naniteContour` | `beveled` | `flat`, `beveled`; same outer contact envelope, bevel at most 0.03 body-scale units |
| `naniteLength`, `naniteWidth` | 1, 1 | 0.8–1.2 and 0.8–1.3, relative to the fitted template |
| `naniteOffset` | 0 | −0.15…0.15 forearm-length units along its axis; never a free world-space offset |
| `naniteAssemblyTime` | 0.65 | 0.15–2 s |
| `naniteMaterial` | `steel` | `steel`, `titanium`, `blackened`; preset opaque standard materials |
| `naniteDensity` | 0.75 | 0–1; visual fragments only, never HP/cell count/readiness |
| `naniteCellHp` | 12 | 4–40 integrity per structural cell |
| `naniteRepairDelay` | 0.40 | 0.1–3 s of quiet after the last accepted cell hit |
| `naniteReformTime` | 0.75 | 0.15–3 s |
| `naniteBreakSpeed` | 6 | 0–12 world units/s; visual breakaway only |
| `naniteStage1`, `naniteStage2` | 0.25, 0.70 | Cannon only; normalized charge thresholds 0.05–0.65 and 0.35–0.95, with stage 2 at least 0.10 after stage 1 |

Keep native cannon cost/cooldown/charge/radius/damage/speed controls. Shield cost stays 0 and toggle cooldown stays 0.2 s in this first source; do not show misleading generic projectile fields. Palette presets: steel `#aeb7bb` / metalness .8 / roughness .35; titanium `#bdc2b8` / .85 / .4; blackened `#4b5256` / .7 / .55. Gold contact/charge accents may brighten bounded vents; settled hull opacity remains 1 with depth writing enabled.

Validation is atomic: reject non-finite/out-of-range fields, unknown presets, forbidden origin/type injection and two modules assigned to one forearm before replacing the live preview or saving. `applyAttackOverrides` validates the **effective whole loadout**, not just each patch in isolation. A source replacement resets incompatible overrides through the existing identity reconciliation. No migration or automatic edits to old profiles/packages; absent markers mean zero nanite allocation/behavior.

## Runtime and geometry contract

### State and ownership

- At most two modules per Fighter, one per anatomical forearm and one per genuine slot. A module is `{slot, epoch, config, deployed, assemblyT, cells}`; a cell is `{hp, quietT, reformT, broken, hitPoint, hitNormal}`. `epoch` changes on slot/source retirement or a new life, **not** a costume/form rebuild. No geometry, material or Fighter clone lives inside this reducer.
- New life/unlocked slot starts deployed and assembling, with no enabled contact cells until assembly completes. A locked slot has no visible/active module. Death or slot removal immediately clears capability/contact state and fragment presentation; respawn starts fresh assembly. A shield press toggles deployment using normal action/unlock/cooldown gates; retract is immediate. Redeploy takes assembly time and preserves damage and repair progress; repeated toggles cannot heal or reset a damaged cell.
- Use scaled simulation `dt`, not `performance.now`, RAF or wall-clock timers. Pause/zero-dt advances nothing; slow motion advances proportionally. Proposed hitstop policy: freeze assembly/repair along with the struck body. Native `Fighter.update` and Studio's explicit step each call the same advance function once; `_animate` only presents current state.
- A critical cannon break cancels **only that slot** via `cancelHeldSlot`, stopping its orb/gather/loop and retaining native spent energy/cooldown. A blocked readiness press has no payment, cooldown, orb or queued shot. Require a fresh press after repair, just like the current hand-contention retry contract. Feed “Cannon assembling”, “Cannon reforming”, “Muzzle obstructed” or “Forearm occupied” on an actual denied player press and expose the same reason in Studio; do not label a structural failure “no ki”.
- Figure resources own the GPU allocations: create `parts.nanites` views inside `figure()`, after `bindHeroSkin` and before foreground-material installation. Mark each owned InstancedMesh `userData.naniteOwned=true`. Extend `figureResources` to include those InstancedMesh objects themselves and `_releaseFormResources`'s live visitor to `use(node)` for those marked objects; their `dispose()` releases instanceMatrix/instanceColor buffers, while existing geometry/material retirement remains reference-aware. The installed Three.js `WebGLObjects.onInstancedMeshDispose` confirms material/geometry disposal alone is insufficient. The state controller must not dispose those resources again. KO hides hull and fragment counts and unregisters contacts; it does not create free-flying collectible meshes. `applyForm` rebinds surviving state without repair. Repeated dispose/reset is idempotent.
- Existing possession/decoy copies both call `snapshotHeroSkins` (`systems2.js:66`, `game.js:2086`). Add one narrow `snapshotNaniteForearms(root)` hook there: bake only the currently visible instances of marked nanite meshes into ordinary merged static geometry, mark it `_snapshotGeometry=true`, and remove the copied instanced node. Existing snapshot cleanup then frees those baked buffers; no live controller, readiness or collision travels into a spectral copy. This avoids requiring unrelated possession/decoy cleanup rewrites. A raw unbaked clone's independently allocated instance buffers remain its caller's responsibility; test reference-safe actor retirement separately rather than claiming arbitrary raw-clone lifecycle is solved.
- A not-yet-launched cannon projectile stores `{slot, epoch}`, not a retired Object3D. Resolve its current socket after the final pose. On source removal, KO, broken barrel or occupied/obstructed muzzle, retire it before any collision, flash or damage; already traveling projectiles keep native ownership. Form rebind may reacquire the same capability on the new rig. No palm fallback or delayed surprise launch.

### Fitted solid assembly

- Bind to the final driven forearm. For procedural bodies use the actual forearm geometry in forearm-local space. For native skinned bodies sample `SkinnedMesh.getVertexPosition`, using lower-arm/hand skin weights and current skeleton transforms to obtain the fitted forearm radius and wrist clearance; use `parts.skin.records` to map the driver, not hardcoded source-bone indices. Never fit from the deliberately oversized skin bounding sphere or the whole body's box.
- Define the local forward axis as `−Y`. Measure forearm length `L` from the rig and transform dimensional points back into the scaled forearm's local frame, so `frame.scale/bulk` are not multiplied twice. Cuff inner clearance is 0.08 × body scale. Keep the proximal edge at least 0.12 × scale away from the elbow. Reject dimensions that cannot satisfy this instead of silently intersecting the joint.
- Cannon: a fitted cuff plus an outboard, forearm-parallel six-stave barrel, not a gun substituted into the fist. Barrel length 1.45 L × `naniteLength`; outer half-width 0.38 × body scale × `naniteWidth`; its outboard offset is measured skin radius + barrel half-width + clearance. End the muzzle at least 0.10 × scale beyond the actual closed-hand front. Place a real `weapon-muzzle` socket on that aperture with local firing axis −Y. Keep the fist free for native melee and other non-concurrent palm actions.
- Shield: a fitted cuff plus a 3×3 opaque plate, 2.6 × scale × `naniteWidth` wide and 2.5 × scale × `naniteLength` long, thickness 0.12 × scale. Fit its rear plane outside the measured skin; the guard pose presents its normal toward the aimed incoming lane. It is a **physical panel**, not an invisible full circle. Each cell's visible hull and contact box derive from the same layout data; edge bevel is the only declared conservative tolerance.
- Allocate a fixed plate instance layout and a single fragment pool per module (cannon ≤64, shield ≤96 fragments). One cell may own cuff/barrel pieces, but at most two contact boxes per cannon cell and one plate box per shield cell: at most 21 contact boxes for a dual-module Fighter. Cuffs that are not part of an explicitly damaged cell are visual fittings, not bonus collision armor.
- Assembly visibly moves the selected fragment count from proximal forearm lanes toward their final cells, then closes opaque plates during the final 25% of assembly. At completion, settled fragments no longer float around the hull. Density 0 still assembles the same solid plates and reaches exactly the same capability state; default density must visibly demonstrate traveling fragments.
- A hit seeds local chips at its actual surface point/normal. Broken-cell pieces kick outward for 0.12 s, then converge to that cell's **current moving forearm** during reform. Neighbor cells do not vanish. Particle samples are deterministic from slot/epoch/cell/sample index, with a bounded last-hit record per cell; no unbounded event queue or per-hit mesh allocations.
- Charge presentation uses the native gathering/core and charge ratio: before stage 1 only the nozzle gathers; stage 1 closes bright vent bands; stage 2 compresses the visible core in front of the real aperture. Physical charge radius, damage and payment still come from the native charge definition. Existing `effects.charge` settings remain active; vents cannot hide the metal outline under a full-arm bloom sphere.

### Aim, cover and contact

- Add a dedicated final **forearm** aiming adapter; the existing firearm wrist loop cannot orient the parent forearm. Use `reachArm`/`bendArm`, not bone reparenting or changes to movement/root yaw. A feasible solve chooses an outward elbow `E` on the shoulder's upper-arm-length sphere and hand `H = E + foreLength * aimDirection`; iterate at most three times for the offset muzzle-to-target correction. Enforce current joint/torso limits and keep the opposite arm's action channel intact.
- Run that adapter in the final attachment phase after body hit-reaction carriers, before `updateLimbSurfaces`, `updateHeroSkin` and `syncChargePresentation`. Refresh matrices and contact cells after the resulting pose. Measure offensive fist velocity before this new presentation correction, as with the existing recoil carrier, so cannon aiming cannot buff melee damage.
- `castHandMask` reserves the actual cannon arm. Opposite-arm modules may be equipped together, but no hand rule overrides the global Guard busy mask described above. Do not add a raised-shield hand conflict that accidentally eats the existing cannon's native transition-release cleanup. Native hard interruptions/guard legality still win. Same-arm carried/held gun overlap denies that module's use with an explicit reason rather than hiding another owner's weapon or firing through it. Hanging/carrying restrictions remain native; these modules do not grant extra hands.
- Reuse the existing native aperture-to-expanded-charge-center cover sweep. Also test the fitted barrel/plate envelope against cover/interiors and the actual torso/head surfaces at the final pose. A correct socket inside a wall is not sufficient. If a final cannon release exceeds 3° muzzle-axis error or the barrel/aperture is obstructed, retire the unresolved shot and report the reason; consumed charge remains an interrupted native charge, not a refund exploit. No hitscan, independent invisible aiming ray or future-tip extension.
- Query intact module cells against real projectile sweeps, already-traveled beam segments and active fist sweeps. Contacts return the genuine owning Fighter plus `{slot, epoch, cell, point, normal}`; they never enter `game.entities` as pretend Fighters, `world.cover`, fog boxes or destruction statistics. Keep `game.isFoe`, phase, banishment, invulnerability and native direct-hit ownership rules. No self/team damage beyond the existing friendly-fire policy.
- **Do not simply take the minimum of the generous body cylinder and a cell OBB.** The cylinder can be encountered before the visible shield. For a nanite-equipped candidate, compare cell entry with the first physical torso/head/pelvis entry (the existing driven-part bounds suffice for this tie decision). If a cell is in front of physical body, offer that cell's true entry instead of the generous body event; otherwise keep the native body event. A cell can also be hit when the body proxy misses. Cover/interior and other world events still compete at their real earlier time, with existing tie precedence. Non-nanite Fighters retain the exact old query.
- Apply the same ordering to beam contact and propagate module metadata through `_packetContact`, not just the immediate `_bodyContact`. A missing cell must let a later traveled segment reach the owner or another target, never pin the hose to yesterday's panel. A sustained beam spends `dps * dt` against the one contacted cell; it does not spend that amount again as a separate module hit. Full absorption still produces bounded local metal feedback even though body HP damage is zero.
- Native melee snapshots cell identities and previous matrices in `beginContactFrame`, then considers cell boxes alongside torso/head/pelvis in `_resolveContact`. Carry the winning point/metadata through light, straight and heavy paths. Never run a second cone attack. Clear metadata when another target/part wins, and reject retired epoch records. Grab/clinch and unblockable guard-crush retain their native bypass; ordinary strikes remain subject to the current trifecta.
- Route accepted local damage at `Fighter.takeDamage`, after its immunity/resistance multipliers but before ordinary armor/shieldcell/guard consumption. The native phase check currently sits below those pools (`entity.js:946`): suppress module metadata when that check would reject the hit, without reordering legacy damage for untagged Fighters. Eligibility includes the existing source-direction guard arc and `!chargingKi`, not merely `this.guarding`; a ki-charge stance remains defenseless. A shield-cell hit takes precedence over projectile deflection only for that genuine physical interception; a surviving residual follows the existing damage/guard pipeline once, not a recreated reflected projectile. Full panel absorption must still reach native guard-meter/push/hitstop/blocked-strike consequences exactly once, without debiting body armor or shieldpack HP. Do not early-return before those consequences or let shieldpack's zero-amount early return swallow them. Hits that did not touch a cell keep current reflection/barrier behavior. Maintain `onHit` body damage separately from `naniteAbsorbed`; never award body-damage XP for absorbed integrity.
- **Direct and splash are different lanes.** Metadata is attached only to a verified direct contact. Native explosion/AoE, DoT and generic `areaDamage` calls do not inherit it, do not re-damage the cell, and are not blocked by a local panel. The projectile's original direct-plus-splash behavior still applies to body HP. Piercing beams, cones and unusual non-contact powers retain their existing body damage but are explicitly not claimed as nanite-local destruction lanes in this slice. Cover/beam callbacks never count a panel as city destruction.

## File map and proposed public interfaces

Create only these focused runtime modules during execution:

| New file | Responsibility |
| --- | --- |
| `src/data/nanite-tuning.js` | Defaults/metadata, source eligibility and whole-loadout validation; no Three.js. |
| `src/engine/nanite-state.js` | Bounded deployment, assembly, integrity, repair and lifecycle reducer; no scene imports. |
| `src/engine/nanite-forearms.js` | Fitted figure views, shared cell layout, material/fragment presentation, final-pose contact queries. |
| `src/engine/nanite-pose.js` | Bounded anatomical forearm aim/shield presentation and final geometric readiness. |

Existing integration files are limited to `src/data/creator.js`, `src/data/attack-tuning.js`; `src/engine/figure.js`, `entity.js`, `abilities.js`, `cast-channels.js`, `weapon-emission.js`, `power-emission.js`, `guard-pose.js`, `attack-interception.js`, `beam-body-contact.js`, `projectiles.js`, `melee.js`, plus the single snapshot hook in `hero-skin.js`; and `src/tool/studio-combat.js`, `studio-preview.js`, `studio-main.js`. `hero-rig.js`, `weapon-cover.js`, `shield-surface.js`, `studio-profile.js` and `character-package.js` are contracts to reuse, not automatic refactor targets. If a new necessary mutation emerges there, identify the concrete failing contract first.

```js
// Proposed interfaces, not implemented by this document.
// data/nanite-tuning.js
naniteConfig(source)             // -> normalized frozen config, or null if untagged
validateNaniteLoadout(abilities) // -> void; throws for duplicate forearms/invalid tagged source

// engine/nanite-state.js; modules/cells have the record shape above.
createNaniteState(abilities)              // -> { modules: Map<slot, module>, disposed: false }
advanceNanites(state, dt, unlockedSlots)  // -> void; dt supplied as 0 for hitstop/settling/pause
toggleNanite(state, slot)                 // -> deployed boolean; no heal/refund
damageNanite(state, contact, amount, canAbsorb) // -> { remaining, absorbed, disabledSlot }
resetNanites(state)                      // -> void; new-life epochs and initial assembly
retireNanites(state, slot = null)         // -> void; all or one capability, idempotent

// engine/nanite-forearms.js
buildNaniteForearms(parts, def)          // -> parts.nanites, figure-owned GPU resources
presentNanites(fighter)                  // -> void; no simulation-time advancement
naniteEmitter(fighter, slot, epoch)      // -> { socket, arm, side, axis } or null; no fallback
naniteContact(fighter, from, to, radius, out, previousCells = null)
// -> earliest t or Infinity; out = { slot, epoch, cell, point, normal }.
snapshotNaniteCells(fighter)             // -> bounded cell identities and cloned matrices
snapshotNaniteForearms(root)             // -> root; bake copied visual instances, no controller

// engine/nanite-pose.js
poseNaniteForearms(fighter)              // -> void; uses current state/aim/guard
naniteUseReason(fighter, slot)           // -> null | 'assembling' | 'reforming' | 'occupied' | 'obstructed'
```

`damageNanite` rejects a missing/retired/mismatched cell without changing body damage. Callers, not the pure reducer, apply `cancelHeldSlot` when `disabledSlot` is returned. `remaining` and `absorbed` conserve incoming damage for the shield; a cannon cell may lose integrity while `remaining === amount`. The view's current state binding supplies the epoch for queries; form replacement cannot accidentally reuse a retired view's contact record.

## Task 1 — Source-bound state and a real fitted assembly

**Checkpoint:** Completed and independently approved September 9; final parent 81-image / six-moving-case browser gate passed. See `docs/reports/2026-09-08-nanite-forearms-task1-report.md`. This checkpoint publishes neither source and grants no native firing or interception.

**Files:** Create the tuning/state/forearm modules above and `tools/nanite-state.test.mjs`, `tools/nanite-fit.test.mjs`; modify `attack-tuning.js`, `figure.js`, the single snapshot hook in `hero-skin.js`, and only the nanite lifetime/resource hooks in `entity.js`. Add targeted assertions to `tools/attack-tuning.test.mjs` using private trusted fixture definitions. No `creator.js` catalog publication or public nanite package recipe in Task 1.

**Interfaces:** Produces all tuning/state functions and `buildNaniteForearms`, `presentNanites`, `snapshotNaniteCells`; no attack/collision capability is declared complete at this checkpoint.

- [ ] Write reducer tests for both templates, exact assembly completion, density independence, local damage, quiet reset, repair threshold, preserved damage on toggle, new-life epochs and repeated retirement. For example:

```js
const state = createNaniteState({q: {type:'naniteShield', naniteForm:'shield',
  naniteAttachment:'left-forearm'}});
advanceNanites(state, .65, new Set(['q']));
const module = state.modules.get('q');
const contact = {slot:'q', epoch:module.epoch, cell:4,
  point:{x:1,y:2,z:3}, normal:{x:0,y:0,z:-1}};
assert.deepEqual(damageNanite(state,contact,20,true),
  {remaining:8, absorbed:12, disabledSlot:null});
assert.equal(module.cells[4].broken,true);
assert.equal(module.cells.filter(cell=>cell.broken).length,1);
advanceNanites(state,1.14,new Set(['q']));
assert.equal(module.cells[4].broken,true);
advanceNanites(state,.01,new Set(['q']));
assert.equal(module.cells[4].broken,false);
```

- [ ] Run `node --test tools/nanite-state.test.mjs tools/nanite-fit.test.mjs` and record the missing implementation/behavior failures, not a syntax/import typo as final RED evidence. Add malformed profile/source-identity and same-forearm conflict cases before changing validation.
- [ ] Implement the bounded cell reducer and atomic configuration validation. Use elapsed interval splitting so a large step crosses quiet/reform boundaries exactly; e.g. consume quiet time first, then apply only the remaining `dt` to reform. A hit resets that cell's quiet/reform timer, not every cell. Keep unrelated source handling unchanged.
- [ ] Implement the fitted opaque views in the specified figure build order. Validate procedural, `superhero-male`, `superhero-female`; use actual skinned vertices and exact final cell layout to assert skin clearance, muzzle beyond the hand and elbow freedom. Include scale 0.65/1.5, bulk 0.65/1.65 and mirrored forearms. Both contour presets must fit; no source skin may hide the new attachment.
- [ ] Verify state/fit tests and targeted Attack tests using the private native fixture sources. Assert same-arm conflicts are rejected atomically and the public `POWERS`/ORIGIN catalog still contains neither nanite ID; the real public package round trip belongs to Task 4 after both publication gates. The view/resources must retire correctly across form swaps, native possession/decoy snapshots, KO, respawn and repeated disposal; no repair is granted by form replacement. Assert InstancedMesh disposal events as well as geometry/material disposal, and prove baked copies have no controller and survive source-form retirement until their native cleanup.

## Task 2 — Cannon aim, native charge/fire and shield guard eligibility

**Checkpoint:** Completed and independently approved September 9 after the native ledge-interruption and source-only firm-fist corrections. Final 321-test gate/build and corrected three-body full-charge moving browser pass; see `docs/reports/2026-09-09-nanite-forearms-task2-report.md`. The cannon is published; shield contact and portable Studio remain later gates.

**Execution preflight:** `docs/reports/2026-09-09-nanite-emission-preflight.md`, fully parent-read September 9. Preserve permanent tag-scoped retirement of unresolved cannon shots on critical break/KO/source removal, including before a deleted-slot early return; readiness after repair must not revive an old shot. Keep native launch commitment before ordinary incoming projectile damage and after final melee resolution. For the new tagged cannon only, defer the existing release sound/punch/shake to successful final launch validation alongside its flash, using the same native amounts/cues; do not play a firing thump for a terminally rejected barrel. Do not change generic charged-power feedback timing, payment/refunds, or the barrel-clear/full-radius-sphere contact behavior.

**Files:** Create `nanite-pose.js`, `tools/nanite-emission.test.mjs`; modify the named branches of `abilities.js`, `cast-channels.js`, `weapon-emission.js`, `power-emission.js`, `guard-pose.js`, `entity.js` and `projectiles.js`. Modify `creator.js` only at this task's final cannon publication gate. Reuse the current arm solver; do not rewrite locomotion, Game's busy policy or `combat-pose.js` firearm correction.

**Interfaces:** Consumes Task 1 state/views; produces `naniteEmitter`, `poseNaniteForearms`, `naniteUseReason`, the source-specific readiness gate and final-position cannon emission.

- [ ] In a native Fighter/StudioCombat fixture patterned on `tools/firearm-emission.test.mjs` and `tools/charged-emission.test.mjs`, press an unassembled cannon and assert no entry cost, cooldown, charge orb or projectile. Then finish assembly, perform a paid charge/release and assert its aperture is the **final current forearm socket**, not the fist or previous frame's point. Preserve native finite-sphere semantics: on a clear launch, `launchOrigin` is the sphere center one physical projectile radius forward of that aperture along the launch direction. Do not move a finite sphere onto the socket or shrink its physical radius to satisfy the emitter assertion.
- [ ] Run `node --test tools/nanite-emission.test.mjs`; record real RED for anatomical side, parent-forearm aim and lifecycle. Include a forearm rotation that leaves the sibling hand at a different orientation, so a fake wrist-only implementation cannot pass.
- [ ] Add the forearm adapter and source-specific origin propagation. `syncChargePresentation` must carry slot/epoch through radius fitting, gather and `powerEmissionPosition`; `resolveLaunch` reacquires that same source/socket, validates axis/cover and retires invalid pending shots before their normal update. Gate new charge creation before `beginPaidCharge`; handle a broken charging module with `cancelHeldSlot`.

```js
// Required final-release assertions (native fixture variables):
const liveEmitter = naniteEmitter(fighter, 'lmb', module.epoch);
const aperture = liveEmitter.socket.getWorldPosition(new THREE.Vector3());
const expectedCenter = aperture.clone().addScaledVector(shot.vel.clone().normalize(), shot.radius);
assert.ok(shot.launchOrigin.distanceTo(expectedCenter) < 1e-5); // clear launch only
assert.ok(shot.vel.clone().normalize().angleTo(liveEmitter.axis) <= Math.PI / 60);
assert.equal(otherSlot.charging, true); // unrelated opposite-arm ranged action, with guarding=false
```

- [ ] Add the shield deployment toggle and guard-pose adapter against the private shield fixture. Require the normal native guard state before protection; missing shield panels cannot disable ordinary block, and the module must not mutate `def.guardType/guardStrong`. Verify both modules equipped, Guard blocking a fresh cannon/toggle press without payment, the native paid-charge transition release, a fresh charge after lowering Guard, forbidden same-arm contention, carry/hanging restrictions and an already mounted weapon's ownership. Use real `controlPlayer`/`controlPad` paths for the busy-mask assertions; a direct `runSlot` fixture alone cannot validate them. Preserve bot dispatch and test it separately.
- [ ] Verify native charge-energy, final-muzzle, hand-contention and form-retirement regressions with `node --test tools/nanite-emission.test.mjs tools/charged-emission.test.mjs tools/charge-energy.test.mjs tools/hand-contention.test.mjs tools/progression-rig.test.mjs`. Check finite and infinite energy, full/partial charge, release during damage, KO before post-pose launch, behind-target aim, thin cover at the barrel and cramped charge-core radius. Do not accept an accurate damage ray from a visibly misaligned cannon.
- [ ] After those gates pass, publish only `nanite-cannon` in `creator.js`; assert catalog selection reconstructs its real handler/source identity and cannot fire before assembly. Keep `nanite-shield` private until Task 3's protection gate. No ready/public cannon flag may precede its working handler and readiness check.

## Task 3 — Local physical damage, real holes and bounded reform

**Checkpoint:** Accepted September9: unfiltered687 tests/build, independent145 native contact cases and focused pose/fit/residual reviews, public six-case native browser contact/hole/moving-repair gate. See `docs/reports/2026-09-09-nanite-forearms-task3-report.md`. Shield published. Two16-module pressure/cleanup repeats passed; an initial unexplained Chromium target crash remains an open reliability observation, not a fixed bug. Approved positive-receiver-absorption-only residual feedback exception suppresses duplicate body flash/guard sphere, preserving all native HP/Guard/credit and untagged/cannon behavior.

**Execution preflight:** `docs/reports/2026-09-09-nanite-contact-preflight.md`, fully parent-read September 9. Clarified reflection precedence: preserve native deflection for a cannon or currently ineligible/unraised shield; if reflection wins, no local cell damage or copied owner damage is generated. Only a currently eligible actual shield-panel absorption intercept preempts reflection. A cannon hit that reaches the accepted damage pipeline still damages its own cell and passes the original amount to its owner once. Revalidate held beam-cell metadata before restoring geometry (a break preserves epoch); missing plates require newly traveled continuation, never an old pinned cap or a jump to a later body. Plain ordinary projectiles do not all use the swept manager today: add only a bounded nanite-aware contact path and prove legacy early returns unchanged. A narrow nanite-full-block-only `game.js` extra-flash exception is authorized only after a native city RED demonstrates duplicate generic feedback; no broad `onHit` rewrite. Full soak must skip the shieldpack zero-amount early return but retain ordinary guard consequences and zero body-damage credit.

**Files:** Complete `nanite-forearms.js` contact query; create `tools/nanite-contact.test.mjs`; modify the specified local lanes in `attack-interception.js`, `beam-body-contact.js`, `projectiles.js`, `melee.js` and `entity.js`. Publish the shield source in `creator.js` only after this task's actual protection gate passes.

**September 9 review extension (still in progress):** Native zero-resistance/ballistic-plate reflection REDs authorize `damage-admission.js`, one canonical pure pre-armor calculation shared with the existing receiver through a private synchronous one-use cache. Side effects remain in their original native branches; no public numeric bypass or second arithmetic implementation. Independent review also isolated a raw-aim shield-pose discontinuity: an aim flip rotated its actual panel by 3 radians even at `_animate(0)`. The earlier separately sampled half-step/end-step probes were not an authoritative within-frame trajectory and must not be called proven collision tunneling. A narrowly source-only `nanite-pose.js` correction is authorized: full world orientation bounded by the existing pose dt at 8 rad/s, including vertical-pole continuity and exact zero-dt stability, current-view/lifecycle reseeding, fixed-length arm clearance, and genuine native turning contacts. Do not widen invisible armor, resample animation secretly inside collision, alter body/root physics, or silently filter failing probes from the final gate.

**Interfaces:** Consumes final-pose cell layouts/state; produces `naniteContact` and propagates contact metadata to `damageNanite`. Retains actual Fighter targets and existing world collision priority.

- [ ] Write native projectile cases with an intact shield between projectile and body, a missing cell in the same lane, a visible forearm outside the body cylinder, a cell behind the torso, an intervening thin cover block and an unrelated untagged defender. Aim at real cell centers/surfaces from their matrices, not handpicked generic body coordinates. Assert both local integrity and actual body HP deltas.
- [ ] Run `node --test tools/nanite-contact.test.mjs` for RED. Include the generous-cylinder-before-shield case and a full-soak case where `onHit` must not count absorbed integrity as body damage; these tests must fail a particles-only implementation.
- [ ] Implement physical-cell precedence and strict metadata propagation. Keep the damage accounting explicit at the native chokepoint:

```js
// At the specified point in Fighter.takeDamage, using already-scaled amount.
const dx = (opts.src?.pos.x ?? this.pos.x) - this.pos.x;
const dz = (opts.src?.pos.z ?? this.pos.z) - this.pos.z;
const distance = Math.hypot(dx, dz) || 1;
const inArc = this.def.guardType === 'barrier' ||
  dx / distance * this.aim.x + dz / distance * this.aim.z > -.15;
const localContact = this.phase && !opts.unblockable && !opts.trueDamage
  ? null : opts.naniteContact;
const result = damageNanite(this._nanites, localContact, amount,
  !!opts.src && this.guarding && this.staggerT <= 0 && !this.chargingKi &&
  inArc && !opts.unblockable && !opts.trueDamage);
if (result.disabledSlot) cancelHeldSlot(this, result.disabledSlot);
amount = result.remaining; // ordinary armor/guard receives this once
// Native contact callback reports {point, normal, absorbed}; no synthetic city hit.
```

`damageNanite` itself checks shield form, deployment, intact state and matching epoch. A bare `opts.contactPoint` cannot authorize absorption. When `result.absorbed > 0 && amount === 0`, mark a full nanite block: bypass ordinary armor/shieldpack consumption and continue through the existing guard consequences with zero HP damage, emitting only the module's local metal impact rather than a second energy-arc ripple. In particular, guard meter, blocked-strike recovery and hitstop must still happen once. For residual damage preserve native attribution/hit reaction. Skip projectile reflection only for the real panel interception, not every nanite-equipped Fighter.

- [ ] Add traveled-hose tests for intact/broken/reformed cells, packet-held contact metadata, short unreached tip, cover before panel and `dps * dt` conservation at 30/60/120 Hz. Add native active-window melee tests, both entity orders, moving defender and previous-cell matrices; one swing can damage only its winning target/cell. Preserve haymaker crush and grab bypass.
- [ ] Verify direct-plus-splash does not double-bill a cell, DoT/splash cannot use a stale contact token, phase/invulnerability cannot lose local integrity, cannon damage disables only its own charge, deflect/barrier behavior without a panel hit is unchanged, full soak preserves guard-meter/blocked-strike consequences, repair is isolated to hit cells and no cover/demolition statistic changes. Run `node --test tools/nanite-contact.test.mjs tools/attack-interception.test.mjs tools/beam-body-contact.test.mjs tools/beam-contact-feedback.test.mjs tools/moving-melee.test.mjs tools/melee-depth.test.mjs`.
- [ ] Publish `nanite-shield` only after native cell interception/absorption, holes and repair pass. Test a catalog-built dual-module fighter, not only private fixture definitions, and confirm neither a new global guard-fire exception nor silent source-balance changes were introduced.

## Task 4 — Portable moving Studio sequence and live acceptance

**Execution checkpoint:** Authorized and active September9 after Task3 code/public-browser acceptance. Preserve the initial stress crash and cold-frame findings as open evidence; neither a passing editor nor a repeat stress run closes them. Parent uses the Game Studio UI guidance for bounded additions to the existing inspector, not a redesign.

**Execution preflight:** `docs/reports/2026-09-09-nanite-authoring-preflight.md`, fully parent-read September 9. Accepted smallest approach: a pattern-scoped full native Fighter/Melee/Projectiles step with choreography supplying movement/aim intent, not a second root integrator or copied defensive clocks. Keep generic/timed/resource preview behavior untouched; tick installed nanites once in non-combat pose-only previews and never twice in existing full-update jump/melee paths. Owner retains finite authored HP and real KO, stops its choreography on KO, and is never autohealed; the outgoing autohealed measurement dummy stays explicitly separate. Accept transient 1×/.25× transport rate, a dedicated exact8s endpoint, separate incoming/absorbed/outgoing telemetry and atomic pair-forearm swap. Effective source-aware profile validation must precede history/save/disposal/live replacement. These are bounded authoring choices, not changed native balance or a new profile format. Task 4 execution still waits for Task 3's actual protection gate.

**Files:** Modify only nanite controls/fixtures in `studio-main.js`, `studio-preview.js`, `studio-combat.js`; create `tools/nanite-studio.test.mjs`, `tools/nanite-browser.mjs` and, after evidence exists, `docs/reports/2026-09-08-nanite-forearms-report.md`. No audio implementation or movement-bridge edits are part of this task.

**Public icon correction:** Parent inspected the actual published shield chip and verified `attackSymbol` falls back to a medical-style utility plus because the new type has no metadata. After a discriminating RED, narrowly authorize `src/engine/attack-icons.js`, new-type-only metadata in `src/engine/abilityMeta.js` if needed, and `tools/attack-icons.test.mjs`. The shield must read as defense/segmented shield and the source cannon may use a distinct forearm/charged-barrel silhouette. Preserve old symbol maps, type families, aiming rules and source identity; a metadata entry must not silently enroll the shield into an inappropriate generic rehearsal.

**Native fixture correction:** The incoming source must be a genuine hostile Fighter with scripted intent and finite authored HP. `Game.isFoe` explicitly rejects `a.isDummy`; an incoming `spawnDummy` can produce apparently aimed shots that never damage anyone. Keep the outgoing autohealed measurement target separate and explicitly labeled. Parent gameplay capture uses a staged hostile Fighter and precision projectile launch fixtures, not fabricated source-weapon or AI firing evidence.

**Interfaces:** Consumes the same native state/slots/contact routes. The stage gains one `nanite` contact-test pattern and read-only telemetry `{slot,phase,intactCells,totalCells,absorbed,bodyDamage,muzzleError,liveFragments}`; runtime state and preview input paths are not saved into character packages.

- [ ] Write seek/pause tests before stage changes: exact state at t=0, assembly end, first impact, broken cell, reform end and post-repair shot must match forward playback. Pose-settling frames must leave assembly at zero. Repeated `step(0)`, camera changes and pause advance no state and trigger no audio or attack edges. Save/Undo/Reset/export/import must rebuild the same capability and enforce source identity.
- [ ] Run `node --test tools/nanite-studio.test.mjs` for RED. Implement visible Formation controls from the shared field metadata, clear origin labels and explicit structural denial reasons. Add a “Nanite assembly / impact / reform” scripted pattern, enabled only for genuine module sources.
- [ ] Use an eight-second native sequence: assemble from t=0; unguarded cannon charge at 0.8 s and release at 1.5 s; Guard only from 2.0–3.9 s around an incoming real projectile at 2.4 s; target a cannon cell in a separate labeled sample at 2.4 s; show local breakaway/quiet/reform; lower Guard before the fresh post-repair charge at 4.2 s and release at 5.0 s; toggle shield deployment while unguarded at 6.0/6.3 s. For this pattern, apply Game's busy expression to mask `pressed`/`held` while forwarding `released`; do not use raw guarded `runSlot` calls to manufacture co-fire. Aim fixture projectiles at current cell transforms each emission, never call `damageNanite` to fake browser impacts. Expose actual arrival times and HP/integrity measurements, not nominal projectile damage. Use the existing shooter/target motion paths and repeat the sequence with a native guard/melee fixture for incoming punches.

```js
// Required stage clock invariant after seek's pose-settling phase:
preview.seek(0);
const module = preview.fighter._nanites.modules.get('lmb');
assert.equal(module.assemblyT, 0);
const before = JSON.stringify([...preview.fighter._nanites.modules.values()]);
preview.step(0, false, false);
assert.equal(JSON.stringify([...preview.fighter._nanites.modules.values()]), before);
```

- [ ] Run `node --test tools/nanite-studio.test.mjs tools/studio-profile.test.mjs tools/character-package.test.mjs tools/studio-inspection.test.mjs` and `npm run build`. Read the browser/game-playtest skill before browser execution. Run the new browser harness against the existing Vite page; do not start another server blindly or buy/install an external service.
- [ ] Capture **actual animation sequences**, not just beauty stills: assembly and break/reform at start/25/50/75/end, front/both profiles/rear and ordinary gameplay camera. Test idle, walk/run, lateral strafe with fixed aim, jump ascent/apex/descent/landing, hover, forward flight, flight ascent/descent and interrupted transitions. At least one sequence must combine locomotion, a moving target, paid firing and an incoming hit. Do not claim the scripted Studio path proves player movement; additionally use real native movement/aim/guard/attack input in gameplay.
- [ ] Fit acceptance covers procedural/male/female bodies, min/max frame scale/bulk, both attachments, the smallest/largest accepted templates, open/closed hands and native weapons. Probe actual source-skinned vertices/plate or barrel faces/OBBs, not pivot distance alone. Require zero through-torso/head/wall muzzle releases; declare the 0.03-scale bevel contact tolerance and report actual maximum fit/aim error rather than inventing a passed threshold.
- [ ] Run simultaneous two-Fighter opposite-arm modules and an eight-Fighter stress sample (up to 16 modules / 1,280 allocated fragment instances for the default cannon+shield pair per Fighter). Record hardware/browser, draw calls, actual CPU/frame timing, active matrices/particles and resource counts. Pause and 0.25× slow motion must be coherent. Repeat KO in assembly/charge/broken/reform, form change, swap, rematch and disposal; counts return to baseline and another Fighter's modules remain intact. No new sounds are required, but existing charge loops must stop on interruption and Studio scrub must remain silent.
- [ ] Report test commands/results, native controls used, source clip/body identifiers, frame sequences, measured contacts/HP/integrity, exact remaining failures and excluded lanes. Parent reviews the visual/feel evidence before updating ledger status. Do not claim all attachment origins, unusual attack types, arbitrary custom meshes or future nanite capabilities are complete.

## Skill application and planning self-review

`warworld-animation-authoring` and its acceptance matrix require moving source/target evidence, real rendered-volume clearance, interruption/transition coverage and simulation/presentation separation. Its named TypeScript-era files (`tests/rig.test.ts`, `tools/pose-ingest.ts`, `src/client/animation.ts`, `src/client/models/weapons.ts`) do not exist in this checkout; the native seams and Node/browser gates above are the explicit adaptation. No new imported animation is promised: the forearm adjustment is labeled a bounded procedural production adapter over the existing motion sources.

`three-webgl-game` and its architecture reference inform the scene/state split, bounded standard-material pools and imperative Three.js integration. Their general stack preferences do not authorize replacing this project's JS, procedural bodies or collision engine. `writing-plans` supplies the exact interfaces and test-first review checkpoints; its normal execution/commit suggestions are overridden by this planning-only assignment.

Planning coverage: Task 1 covers private source fixtures, fitted solid assembly and portable configuration; Task 2 covers real cannon emission/charge and shield eligibility, then publishes the working cannon; Task 3 covers actual local damage/protection/reform, then publishes the working shield; Task 4 covers the public pair's moving authoring/save/export and native gameplay/lifecycle/performance evidence. Parent-accepted passive-repair, absorption and new-source balance/control defaults remain explicitly unbalanced initial settings, not inferred user rulings. Global guard input policy is preserved, including the native transition-release consequence. No runtime tests or browser evidence were produced while writing this brief.
