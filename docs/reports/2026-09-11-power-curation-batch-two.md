# Power curation: second batch — 2026-09-11

Implemented in the integration worktree; not deployed.

| Character | Retained default | Unequipped default, preserved in Studio | Reason |
| --- | --- | --- | --- |
| DECIBEL | Siren Scream | THE CANARY CRY | Both sustained sonic cones with push/lift; longer range and higher numbers do not justify another default slot. |
| TALON | Flying Grayson | Finale Routine | Both targeted rush sequences; extra hits/range do not create another tactical choice. |
| MOSES APIO | Regenerative Bond | FULL BOND | Both timed damage multipliers plus instant healing. Keep one recovery action. |

No replacement power was invented to fill the empty R slots. Their exact authored definitions remain selectable through the existing Studio kit-alternative catalog. Profile save/load, undo and existing custom attack snapshots remain supported. No character was removed.

## Verification

- Extended regression tests failed before implementation: redundant live slots still existed, and the three named alternatives could not be selected.
- After implementation: 24/24 focused alternative/evidence/damage-type/audit tests pass.
- Live-browser HUD transition regression passes across full kits and all six shortened kits.
- Fresh full-roster accelerated activation sweep: 55 characters, 379/379 checks pass, zero page errors and runtime faults. Deliberately inert handler fails with no evidence, as required.
- Static audit: 22 exact-definition groups, 24 same-kit overlap candidates, zero validation problems. Originally 30 overlap candidates; first batch reduced that to 27.
- Production build passes; existing mixed GLTF import and large-chunk warnings remain.

Commands:

```powershell
node --no-experimental-webstorage --test tools/pilot-kit-alternatives.test.mjs tools/power-roster-audit.test.mjs tools/power-damage-type.test.mjs tools/ability-evidence.test.mjs
node tools/hud-roster-transition-browser.mjs
node tools/power-audit-browser.mjs --all
npm run build
```

Activation is not a verdict on animation, target response, balance or fun. This batch does not claim new gameplay captures or acceptance of all retained powers. Remaining overlap candidates need individual decisions: different weapon roles, elemental effects and control versus damage can legitimately share a handler. Cross-character identical groups are not automatically mistakes. Do not change numbers just to suppress audit counts.

Next: examine remaining melee/rush overlaps and prove retained choices against guarding, resistant and obstructed targets. Keep SOL/VEGA identity powers intact unless evidence supports a specific repair. DECIBEL's proposed ground-directed propulsion is still a separate unimplemented mechanic.
