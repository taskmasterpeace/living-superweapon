
## Two-thumb movement and combat — 2026-09-13

Run `node tools/playtest/run.mjs --scenario moving-strike --scheme touch`. The same moving-strike scenario now supports controller or landscape touch. Touch setup taps native menus. One browser finger drags the left movement zone; another holds Punch. The adapter retains separate touch IDs so releasing Punch preserves the movement finger until it is explicitly released. No game input state is assigned directly.

Evidence: artifacts/playtest/2026-09-13T05-42-09.664Z-moving-strike. Passed: 7.2666 units of actual displacement during simultaneous stick/charge observations, charge 0.64528 at release, neutral inputs afterward, no browser errors. Silent clip and screenshot saved; landscape screenshot inspected. Fifteen scoped tests passed, including separate-finger release and invalid-axis rejection.

This adds reusable two-thumb input for local AI testing; physical iPhone validation, camera/aim gestures, target-contact tests while moving, checkpoint/reset matrices and operation migration remain. Earlier controller-only movement documentation is superseded by this additional touch support.
