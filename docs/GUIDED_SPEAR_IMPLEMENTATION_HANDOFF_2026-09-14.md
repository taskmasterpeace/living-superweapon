# Optional guided spear implementation — 2026-09-14

Implemented in the combat-release-review worktree on codex/playable-integration. This is an optional creator ability, not a change to any canonical roster loadout. Ordinary spear/projectile behavior is unchanged.

## Delivered runtime

`src/engine/guided-spear.js` owns one physical black spear with a crimson angular tip and two swept barbs. Creator's **Crimson Guided Spear** entry uses `guidedSpear`, black `#17191d` and crimson `#bd2337`. It is available to custom fighter slots and the Studio attack rehearsal. The tuning catalog validates damage, speed, return speed, steering, range, windup and recovery.

An accepted press reserves a free hand and pays once. The native procedural overarm pose releases that same mesh through the existing projectile manager's final-pose launch step. Holding guides outbound flight toward live aim at a bounded angular rate and fixed speed; releasing keeps the last heading. The articulated hand aims the physical crimson tip forward before release. No imported spear animation is claimed.

The existing earliest swept ordinary contact query chooses the first admitted body, cover or terrain hit. A hostile body receives one physical piercing hit through `takeDamage`; admitted cover receives one `damageBlock` call through its existing durability/construct receiver; allies, phase and invulnerable bodies are excluded. Guard, shields and nanite contact stay in the shared receiver. The spear embeds and waits for another press, following a victim's local transform without repeated injury. Moving hull embeds follow the cover mesh's local point and rotation; cover without a mesh uses its translated bounds anchor. Range exhaustion or removal of its embed target leaves a stationary recoverable world spear. It neither explodes nor returns automatically.

A subsequent press requests free recall even with no energy remaining. Return does no damage, sweeps against world obstacles, and stops with visible feedback if obstructed. Moving clear and pressing again retries. Hands claimed by active ranged cast channels are unavailable both for throwing and catching. A two-hand cast blocks spear payment; a single-hand cast permits the opposite free hand. A later claim on the reserved hand cancels windup. Busy hands cause a safe nearby wait with feedback; a free hand catches the original mesh. Repeated throws reuse it. Multiple spear slots cannot create multiple owned spears. Input cancellation stops steering and cancels unreleased windup; incapacitation cancels preparation. Death, removal, slot replacement and reset dispose ownership and resources. A held rig replacement rebinds to an available live hand or disposes safely.

## Integration and scope

- `src/engine/abilities.js`: optional type, accepted launch payment, free recall and cancellation/clear hooks.
- `src/engine/entity.js`: narrow pose advance/restore/overlay hooks beside existing throw hooks.
- `src/data/creator.js`, `src/data/attack-tuning.js`: optional catalog entry and validated fields.
- `src/tool/studio-combat.js`: rehearsal admission, actual spear lifecycle phase and nominal impact damage display.
- Core projectile/boomerang implementation and roster definitions were not changed.

The custom spear object uses the current swept tip collision query, not a full rigid shaft collider. A stationary recoverable spear is suspended in place rather than falling under gravity. Return checks terrain/cover; it does not injure or physically push intervening fighters. Held rig replacement is handled, but this pass does not establish arbitrary inventory/equipment replacement interoperability. The throw is procedural rather than imported mocap. These limitations remain visible authoring decisions, not completed advanced weapon physics.

## Verification actually run

`tools/guided-spear.test.mjs` passes **22/22** tests against production Fighter/slot/projectile paths. Cases include one object and payment, bounded aim steering, single-hit embed/follow, energy-free recall/catch/rethrow, obstructed return/retry, busy hand waiting, freeze/zero time, death/slot/reset cleanup, cover contact at 30/60/120 Hz, phase/allies, creator/tuning/rehearsal admission and tip orientation before release, cast-channel hand exclusion and moving/turning hull embeds.

```powershell
node --import ./tools/helpers/character-css-loader.mjs --test tools/guided-spear.test.mjs
```

The combined collision, mass, throw, melee, spear and attack-tuning integration run passes **252/252**, exit 0. Full command is in `SHARED_IMPACT_IMPLEMENTATION_2026-09-14.md`; output is `artifacts/shared-impact-spear-final-tests.txt`.

```powershell
node tools/guided-spear-studio.mjs
```

This rendered Studio fixture passed on the existing server at port 5193 with zero browser errors. It saves an isolated custom fighter in its browser context, selects the ability through Studio UI and seeks production rehearsal states. Each sample seeks to zero, waits for the newly created modular rig to load, then advances the production Studio simulation at 60 Hz to the sample. This ensures the actual release samples the loaded modular socket. `artifacts/guided-spear-studio/results.json` records windup, outbound and embedded. Screenshots `windup.png`, `outbound.png`, `embedded.png` were generated; windup and embedded were visually inspected after the tip-direction fix and modular readiness correction. All three samples assert a live modular character. The initial adapter wrist mismatch was corrected by the parent integration in `syncModularSpearGrip`. The final physical spear grip point `(0,0,-3.2)` matches the mapped visible wrist within 4.97e-16 game units; the fixture asserts a gap below 0.02. Embedded reads 22 actual damage and one hit. This is a rendered authoring witness, not a native combat input playtest of steering/recall/catch. Those lifecycle steps have deterministic runtime tests; interactive gameplay acceptance remains to be witnessed.

`git diff --check` passed. Production build is owned by the parent integration pass. Separate preexisting Studio palette failures are recorded in the shared-impact report and are not counted as passing.
