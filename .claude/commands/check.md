---
description: Run the committed verification harnesses and report honestly
---
Use the `wwa-verify` skill. Run every committed harness for the area I have been touching
($ARGUMENTS if given, otherwise infer from `git status` and `git diff`), plus:

- `npm run build`
- `node scripts/visual-collisions.mjs --budget 3` if any ability data changed
- `world.auditSurfaces()` if any decal, tile or interior geometry changed

Report the real numbers. If a test passes for the wrong reason, say so. If something is flaky, run
it three times and tell me — a flaky suite is worse than no suite.
