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
