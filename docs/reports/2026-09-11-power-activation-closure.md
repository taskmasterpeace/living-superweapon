# Power audit activation closure — 2026-09-11

Scope: current integration working tree at http://127.0.0.1:5182. No aircraft, new powers or balance changes in this pass. Prior uncommitted Second Wind work is separate.

## Findings and repair

The historical five activation failures were already addressed by per-row terrain/scorch isolation and terrain-relative staging in the pilot pass. This pass independently reran the full activation sweep and native input comparisons. No activation thresholds were lowered.

The first fresh sweep passed every power but failed its runtime-error gate: HUD.update read st.def from an absent slot after moving from a full kit to a curated six-slot kit. The displayed slot set still belonged to the previous fighter. A dedicated browser regression reproduced the TypeError. HUD now rebuilds slots when the fighter slot-set identity changes, before reading cooldowns. This also restores missing entries when transitioning back to a full kit.

## Fresh verification

- Full sweep after HUD fix: 55 characters, 382/382 slots pass; exit 0; no page errors or recorded runtime faults. Deliberately unimplemented handler remains rejected with empty evidence.
- Dedicated live HUD regression: SOL -> APEX -> SOL -> VANGUARD -> WEBLINE; shown slot keys match actual slots. Passed after failing with the original TypeError. Rendering disabled for this DOM/state check; not a visual test.
- Focused damage-type/evidence/roster/alternative suites: 24/24 pass.
- Native key/mouse diagnostic: real rAF with staged actors and flat test placement, not ordinary unstaged gameplay. All no-input controls: zero movement, damage and cooldown. No page/runtime errors.

| Historical row | Native result |
|---|---|
| RIME Ice Skate | 7.665u travel; cooldown observed |
| VOLT Blink | 9.964u travel; cooldown observed |
| WARDEN Slide | 7.052u travel; cooldown observed |
| TORCH Jet Dash | 10.639u travel; cooldown observed |
| VOLT Lightning Flurry | Target acquired; 24.48 net HP damage; combo state peak 12; cooldown observed |

Travel numbers reflect these short diagnostic windows, not balance specifications. Lightning Flurry's net energy delta can be zero because recovery/regen occur during observation; damage/target acquisition are its activation evidence. Inspected volt-lmb-bench-native.png shows close target contact, hit feedback and Lightning Flurry selected. This is not approval of distant readability or all animation frames.

## Remaining honest scope

Static counts now: 22 exact mechanical groups and 27 same-kit family candidates. Earlier WEBLINE/APEX/VANGUARD defaults removed three overlapping choices while preserving alternatives. Shared definitions across different heroes are not automatically defects. The remaining kit-by-kit tactical curation and full impact/guard/resistance/interruption acceptance are OPEN. Activation success is not a claim that all powers feel good or have distinct purposes. Original world-benchmark failures are not closed by this sweep.

## Reproduce

```powershell
node tools/hud-roster-transition-browser.mjs
node tools/power-audit-browser.mjs --all
node tools/pilot-activation-diagnostic.mjs --native-only
node --no-experimental-webstorage --test tools/power-damage-type.test.mjs tools/ability-evidence.test.mjs tools/power-roster-audit.test.mjs tools/pilot-kit-alternatives.test.mjs
```

Evidence: artifacts/power-audit/activation-results.json; artifacts/power-pilot/activation/diagnosis-native.json and corresponding PNG/video files. These local generated diagnostics are not production showcase clips.
