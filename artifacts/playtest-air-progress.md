
## Airborne grab and terrain throw — 2026-09-13

`node tools/playtest/run.mjs --scenario air-throw` reuses native takeoff/aim setup. Player and trainer begin grounded 6u apart; each takes off through native controls. Bounded rise/descend pulses align height using observations, T locks, E grabs/carries, mouse aims down, then held E waits for throw arming before release. Acceptance requires separate THROW and TERRAIN IMPACT damage records, continued player flight and cleared holder/victim ownership.

Passed artifacts/playtest/2026-09-13T06-14-11.061Z-air-throw: separation 6.0759u before grab; 10 throw damage followed by 32 terrain-impact damage; victim HP 130 -> 120 -> 88; no remaining grab/carry references and no browser errors. Carry/impact screenshots and silent clip saved. Earlier 06-11-53 and 06-12-53 failures preserved: fixed descent timing did not reliably align heights; the corrected harness observes and adjusts without actor teleportation. Four runner tests passed.

This is one hostile airborne throw sequence. Friendly catch, defensive escapes, varied body weights and repeat/KO cleanup are separate coverage. No gameplay numbers or controls changed.
