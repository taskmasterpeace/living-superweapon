## Current handoff and remaining acceptance — September 13

The local runner now exposes 16 registered scenarios through `--list`, canonical control/action discovery through `--controls`, and saved-run indexing through `--report`. Guard variants support KBM/emulated pad/browser touch; simultaneous movement + charge supports pad/touch. KBM aerial approach, aerial guard, aerial grab → terrain throw, and native health/energy/prop resets have recorded acceptance evidence. The guide is `docs/gameplay/AI_PLAYTEST_RUNNER.md` on local branch `codex/playable-integration`; these local changes are not a release/push claim.

Remaining work, in execution order:
- [ ] Migrate one operation checkpoint to the common runner. Stage only before acceptance, use real interactions, assert sample/resource/upgrade outcomes; reserve the full route for relevant integrated changes.
- [ ] Add low-energy, interrupted-action and thin-wall cases using existing actions/fixtures. Report input rejection, observation timeout and actual gameplay failure distinctly.
- [ ] Extend bounded observations with mission state, seats, stable authored collider/anchor IDs and real interaction rejection reasons. Current collider snapshot indices are not stable IDs.
- [ ] Check reset conservation of projectiles, colliders, audio loops and listeners. Existing actor/resource/prop checks do not prove all cleanup.
- [ ] Include menu/lock/aim input in shared history and finish contextual discovery. Keep physical iPhone/controller acceptance separate from emulated adapters.
- [ ] Add versioned capability declarations and only the checkpoint/seed/timeout options needed by scenarios; current CLI does not support those proposed flags or auto-start the server.
- [ ] Strengthen loaded-content provenance beyond checkout/tracked-diff identity; verify production exclusion for any future bridge.

A new AI should run `node tools/playtest/run.mjs --controls`, then `--list`, choose ONE relevant scenario, inspect its result/actions/clip, and use `--report` to locate prior failures before retrying. Do not repeat the whole transport route to investigate a short defect.

Refreshed historical index: 41 runs, 27 evidence warnings. These warnings include older incomplete/mismatched evidence; they are not 27 new gameplay failures. Runner/report checks: 5 passed. Issue remains open until the remaining acceptance is proved.
