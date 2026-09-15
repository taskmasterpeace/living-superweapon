Current modular Vega → Rage rear neck hold misses the requested hand target by0.0523035 world units at phase0; the regression limit is0.05. Other Merc/Vegas pairs passed in this run. Do not stretch bones or loosen the threshold to hide the failure.

Reproduce from codex/playable-integration:

```powershell
node --import ./tools/helpers/css-test-hook.mjs --test tools/modular-held-pose.test.mjs
```

Inspect heldPairDistance, receiver height difference, shoulder reach and neck surface anchor across phase0/.25/.5/.75/1 and front/back/friendly holds. Acceptance: fixed bone lengths, unchanged collision roots, no core intersection, and hand gap below0.05 for all three pairs. This is a current observed failure, not a claim that the newest paid clips caused it; this regression runs without attaching the paid bank.
