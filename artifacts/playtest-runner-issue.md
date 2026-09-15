Local checkpoint: shared scenario entry point is now implemented in tools/playtest/run.mjs (--list / --scenario). Three existing native KBM scripts are registered: melee instructions, JELANI retreat, WEBLINE chain. Each run writes unique evidence plus explicit result/status metadata; no automatic retries. docs/gameplay/AI_PLAYTEST_RUNNER.md documents usage and scenario contracts.

Two registry/result tests passed. One staged native JELANI retreat run through the command passed with 24.1905664 actual contact damage, no browser errors and a silent clip. Server revision is explicitly unverified, rather than implied from runner HEAD.

Keep this issue OPEN: runtime fingerprint/schema/controls bridge, bounded event/collider failure bundles, fixture enforcement, operation migration and controller/touch adapters remain. This is the migration entry point, not full #41 acceptance.
