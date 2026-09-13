# Local AI playtesting — current runner

Run from the integration worktree with its game already served at http://127.0.0.1:5184:

```sh
node tools/playtest/run.mjs --list
node tools/playtest/run.mjs --scenario melee-retreat
node tools/playtest/run.mjs --scenario melee-instructions
node tools/playtest/run.mjs --scenario webline-chain
```

Choose one relevant scenario. Do not run every scenario after an unrelated edit. The runner does not automatically retry. Preserve a live process handle and wait for its terminal result before starting another run. If an equivalent failure recurs, diagnose existing evidence instead of repeating the route.

Each invocation creates a unique `artifacts/playtest/<timestamp>-<scenario>/` folder. `run.json` contains status, runner checkout/revision, tracked changes, scenario, input scheme and error details. `result.json` comes from the scenario and must explicitly pass without browser errors. Screenshots and silent clips stay beside these files. A missing result is a failure; old runs cannot supply a stale pass. Inspect the clip before claiming visual quality. A running manifest alone is not evidence of a live process.

These three scenarios reuse existing native keyboard/mouse browser scripts. Initial character/target placement is staged and disclosed. They do not replace combat damage with a simulated success. Their normal direct script commands still work; the runner redirects output using PW_PLAYTEST_OUT. Output folders are independent, but do not run simultaneous GPU-heavy captures when measuring performance.

## Adding a scenario

Register a fixed script filename, description and capture type in `tools/playtest/scenarios.mjs`. The script must honor PW_PLAYTEST_OUT, close its browser in finally, bound its waits, write result.json only after explicit assertions, and disclose every fixture intervention. Keep native actions separate from setup. Throw on failure. Include state/contact screenshots or a short clip and bounded diagnostics appropriate to the failure. Never accept an arbitrary script path from CLI input.

## Remaining #41 work

This is a migration entry point, not the completed runtime bridge. The runner's git revision is NOT proof of which revision the server serves (`serverRevisionVerified:false`). Runtime fingerprint handshake, schema-driven live controls, bounded observation/event/collider bundles, enforcement of fixture/acceptance separation, shared checkpoint resets, operation migration, controller and touch adapters remain open. Current registry supports keyboard/mouse only. Do not claim iPhone, controller, balanced operation or full roster acceptance from these scenarios. No production game code or cloud CI is added by this runner.

## Server identity and control discovery update

`node tools/playtest/run.mjs --controls` prints the actual shared POWERWORLD_CONTROLS registry, rather than a copied bindings table. This is canonical combat mapping, not exhaustive live context/device discovery (seat roles, UI focus and controller/touch adapters still need that work).

The runner now requires the loopback-only Vite `/__pw_playtest_identity` endpoint before running a scenario. It verifies real worktree path, HEAD and tracked working-diff hash, then checks again after the scenario. Missing/mismatched identity fails the run. The endpoint is dev-server-only, uncached and rejects non-GET/non-loopback requests. Restart an older dev server if the endpoint is missing; do not bypass the check.

This supersedes the earlier `serverRevisionVerified:false` limitation for new successful runs. The handshake verifies checkout and tracked edits, not the browser's entire loaded module graph or untracked asset contents. Untracked files and mid-run hot reload still need stronger content provenance before full #41 completion.

## Bounded diagnostic snapshots

All three registered scripts now use tools/playtest/diagnostics.mjs. Successful runs write observed-state.json; caught failures attempt failure.json and failure.png before closing the browser. The bundle retains the original error, last 40 captured console/page errors, player/target resources and motion, up to 24 nearby actors, up to 32 nearby cover colliders, current interaction focus and last 20 drill records. Numeric values are explicit world units. It does not invoke interaction callbacks, alter actors or step the simulation.

Collider snapshotIndex refers to the current cover list only; it is not a stable authored ID. Missing optional class/id fields remain null instead of inferred values. Missing renderer/runtime is reported explicitly. Existing scenario videos and custom diagnostics remain. This is not yet a timeline of input actions, a full collider debugger, aircraft-seat observation or a live control/action bridge; those are still #41 work.

## Named native actions

Scenario authors can import `performAction(page, 'strike', {holdMs:80})` from tools/playtest/actions.mjs. --controls lists the supported named actions. Keyboard bindings come from the game's shared registry; primary/secondary use actual mouse buttons. Input is rejected when gameplay is paused, an overlay is open, or no player is alive. Hold lengths are bounded; keys/buttons release before observing simulation advancement, including failure cleanup. No direct damage, velocity or cooldown mutation occurs. Up to 64 action records join success/failure snapshots with requested duration, simulation timestamps and release status.

`dispatched` means native input was sent and simulation advanced, not that the attack hit or gameplay admitted it. Scenario outcome assertions remain mandatory. Initial menus/target lock/wheel selection in migrated scripts still use explicit native browser actions and are not yet all included in the named-action history. KBM only; concurrent named actions currently reject rather than inventing combined gestures.

## Guard outcome scenario

`node tools/playtest/run.mjs --scenario melee-guard` stages the existing defend drill, faces the trainer and uses the named native guard action. It requires an actual incoming record with blocked=true, healthLost=0 and guardEnergySpent>0. A miss or spawn invulnerability cannot satisfy it. Setup does not inject damage, energy, immunity or outcomes. It captures a silent clip, a post-contact still and a shared state/action bundle. This covers one funded frontal light strike only; rear hits, energy depletion, grab bypass and heavy crush need their own scenarios.

## Parameterized counterplay

`--scenario melee-guard-rear` uses the same guard script with registry-owned `{facing:'rear'}` configuration. Both variants record bounded pre-contact guard observations. Rear mode requires guard active immediately before actual contact, health damage and no energy absorption; front mode requires zero health loss and positive guard-energy spending. Configuration is included in run.json; no arbitrary CLI script paths are accepted. This pattern permits explicit scenario variants without duplicating the test controller.

## Native charge and guard crush

`--scenario melee-guard-crush` uses the existing guard script against a blocking trainer. It requires actual GUARD BROKEN contact, positive guard-energy spending and no health leak through funded guard. `performAction(page,'strike',{until:'melee-charged'})` holds native V until the real meleeCharge reaches 0.6, observes only, then releases; the wait is capped at 10 seconds and failures still release input. The action log records chargeAtRelease. Fixed real-time holds remain available for taps. This avoids treating browser startup stalls as sufficient in-game charge. It does not set charge or call the attack handler directly.

## Grab bypass and intentional release

`--scenario melee-grab-guard` uses the same guard scenario script. It waits for the trainer's real guard and natural spawn-immunity expiration, sends E, checks reciprocal holder/victim references, captures the hold, then taps E to release. The release check requires more than one simulation second left on the grab before input and release within 0.75 seconds, so automatic expiry cannot substitute for the interaction. Shared snapshots now include grabbing/grabbedBy IDs and grabState. Front-grab escape, interrupting a grab startup, aerial carry/catch and throws remain separate gates.

## Shared melee setup and acceptance phase

`stageMelee(page,{trial:'guard',distance:8,facing:'front'})` in tools/playtest/fixtures.mjs is the shared registered melee setup. It validates allowed drills, bounded distance and facing, requires the preparing Threat Room, creates the native drill and positions the player/camera once. It logs the requested setup and actual actor IDs. The explicit clearTargetInvulnerability option exists for the pre-existing retreat fixture; its use is recorded, never silently applied to all drills.

The first named action locks the session into acceptance. Further stageMelee calls reject before evaluating browser code; a failed setup blocks named actions. Shared snapshots contain phase and fixture history. Guard variants and JELANI initial setup use this owner. This is a tooling contract, not a sandbox around arbitrary page.evaluate: legacy late-retreat behavior injection remains a separately disclosed direct-script probe, not a registered clean acceptance scenario. Console, WEBLINE and operation fixture migration remain open.

## Browser-emulated controller adapter

`--scenario gamepad-guard` uses an emulated standard browser gamepad for combat through the real Gamepad.update polling/edge path. Keyboard still handles startup menus; this is not full controller-only onboarding or physical-device acceptance. `installEmulatedGamepad(page)` runs before navigation in an isolated test page. `performAction(...,{scheme:'pad'})` toggles only raw virtual button states; it does not call combat handlers or modify the game's parsed pad state. The adapter reuses exported POWERWORLD_MAP; --controls lists mapped test actions for both schemes. Shared snapshot session metadata identifies emulation.

Only the guard scenario has current native browser evidence under this adapter. Press/hold/release mapping for guard/strike/grab has focused polling tests. More controller scenarios, stick aim/movement, menu navigation, disconnect cleanup and real hardware remain required.

## Landscape browser touch adapter

`--scenario touch-guard` runs at 844×390 with hasTouch/isMobile enabled, taps character/squad menus, and presses the actual visible Block control via Chromium Input.dispatchTouchEvent. The shared helper resolves the current button bounds, rejects hidden/disabled controls and sends touchEnd after the hold. It never calls Touch.pressButton or injects parsed touch state. --controls exposes supported touch action IDs; separate fly-toggle is intentionally absent because Rise is the current touch action. Concurrent/multifinger gestures remain unsupported by this initial helper.

Touch combat and native gamepad emulation are separate adapters. Browser touch success does not prove Safari/iPhone hardware behavior, virtual-stick aiming, multitouch, portrait/background recovery or the full operation. More shared scenarios need these adapters.

## Select an input scheme for the same scenario

Use the shared runner from this checkout:

```sh
node tools/playtest/run.mjs --list
node tools/playtest/run.mjs --controls
node tools/playtest/run.mjs --scenario melee-grab-guard --scheme touch
node tools/playtest/run.mjs --scenario melee-guard-crush --scheme pad
```

The registry lists supported schemes per scenario. The four melee guard/counterplay scenarios support kbm, pad and touch; the instruction, retreat and chain scenarios currently support kbm only. Omit --scheme for keyboard/mouse, except the existing gamepad-guard and touch-guard aliases which retain their defaults. Invalid schemes and unsupported combinations fail before opening a browser. Scenario attack/facing settings remain intact when changing inputs.

Verified locally on 2026-09-13: touch grab/release (reciprocal ownership, clean intentional release) and controller charged-heavy guard break. Evidence folders: artifacts/playtest/2026-09-13T05-31-57.737Z-melee-grab-guard and artifacts/playtest/2026-09-13T05-32-31.673Z-melee-guard-crush. Each contains run metadata, results, snapshots, screenshots and a silent clip. Four runner tests passed. These use the actual input adapters with staged training setup; browser-emulated devices are not physical-device acceptance.

Remaining #41 work includes contextual control discovery, movement sticks and multi-touch, operation checkpoint migration, reset/cleanup checks and stronger asset/module identity. No transport route was replayed for this change.

## Evidence correction — input fallback (2026-09-13)

Audit found guard-drill-browser still called performAction without the configured scheme for guard, heavy and grab release. Earlier gamepad-guard/touch-guard runs, 05-32-31 controller heavy and 05-31-57 touch release therefore did NOT prove those actions used their advertised device. The touch grab acquisition did use touch, but release used keyboard. Retain the older artifacts for diagnosis; supersede the input-coverage claims above.

Fixed all combat dispatches to use the configured adapter. Acceptance now requires a nonempty action history where every action uses the requested scheme, succeeds and releases; result.json includes that history.

Replacement native-input evidence (all passed with zero browser errors):
- artifacts/playtest/2026-09-13T05-34-40.555Z-melee-guard-crush: controller strike charged to 0.70012; GUARD BROKEN, 13.1214 guard energy spent, zero health loss.
- artifacts/playtest/2026-09-13T05-35-13.719Z-melee-grab-guard: both grab and release use touch; reciprocal hold and intentional release in 0.2627 simulation seconds.
- artifacts/playtest/2026-09-13T05-35-51.702Z-touch-guard: actual touch Block through contact.
- artifacts/playtest/2026-09-13T05-36-41.503Z-gamepad-guard: actual controller guard through contact.

Each includes a silent clip, screenshots, action log and observed state. This corrects test wiring, not gameplay balance. Physical devices and movement/multitouch remain unverified. Movement adapter expansion was deferred this turn to repair this evidence defect first.

## Controller movement during combat — 2026-09-13

Run `node tools/playtest/run.mjs --scenario moving-strike`. This controller-only scenario stages SOL and a stationary trainer once, then holds a rightward left stick while charging melee through the native controller polling. It records frame-by-frame position, charge and parsed stick/button states. It requires actual movement while charging and neutral inputs afterward; it does not claim target contact.

Shared `performAction` now accepts `{scheme:'pad',move:[x,y]}` alongside an attack. Axes must be finite in [-1,1]. The stick remains held during the action and is reset on completion or failure. --controls advertises this option. No actor position, parsed controller state or combat outcome is written by the adapter.

Evidence: artifacts/playtest/2026-09-13T05-39-12.605Z-moving-strike. Native run passed: 7.1932 units displaced during observed simultaneous movement/charge, charge 0.71656 at release, neutral stick/button afterward, no browser errors. Silent video, screenshot and 111 observation frames saved. Eleven scoped tests passed, including cleanup after a charge timeout and invalid-axis rejection. Physical controllers, right-stick aiming, combined touch gestures and operation checkpoint migration remain open.
