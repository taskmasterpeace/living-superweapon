Local combat checkpoint: diagnosed late-retreat misses as duplicate walking friction applied after the committed approach controller set velocity. At 15/20/24Hz the same approach failed in both facing directions; 30/60/120Hz passed. Physics now skips that second drag only while a non-launched committed approach owns startup/active motion. Swept collision, body braking, gravity, interruptions and dodge directions remain active.

123 approach/flight/contracts checks, 6 slow-frame dodge checks and 39 depth/phase/contact checks passed; build passed. Native Threat Room T/V test: target speed zero during startup, then retreat, one physical hit from 50u, zero console errors. Evidence and silent clip: artifacts/marketing/jelani-entry-2026-09-13-late/ in the combat-release-review worktree. Full source notes: docs/reports/TRAINING_FACILITY_CHECKPOINT.md.

Keep this issue open for remaining combat scope and broader acceptance. This checkpoint is local, not a pushed release.
