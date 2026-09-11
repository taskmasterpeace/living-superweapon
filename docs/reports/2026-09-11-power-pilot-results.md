# Power pilot repair and reference review

Scope: approved WEBLINE / APEX / VANGUARD pass, on `codex/sarge-authoring-integration`, served at `http://127.0.0.1:5182/powerworld.html`. No aircraft expansion or production deployment. This is a bounded repair report, not acceptance of the whole roster.

## Implemented

- Removed WEBLINE Maximum Spider, APEX Perfect Wave, and VANGUARD Invincible from default equipped choices. Their exact prior definitions remain selectable authoring alternatives in Studio and survive save/load.
- WEBLINE Web Darts is now a finite traveling, non-homing contact shot: 4 direct damage, a visible non-stacking movement slow, no collateral explosion or grab, shortened control on stronger targets, and finite recovery/immunity. Guard, phase, immunity, cover and source/target cleanup have dedicated tests.
- Consume and Thunderclap no longer apply their effects through a solid LOS blocker. Consume healing follows admitted damage, including guard and resistance.
- Strengthened asymmetric backward-flight leg flexion while preserving the existing upper-body attack and locomotion ownership, authored overrides, and centered chase camera.
- Repaired the ability bench's per-row terrain/scorch isolation and terrain-relative staging. Earlier explosions had contaminated later activation rows. The original five movement checks now pass without changing movement balance or lowering their thresholds; a deliberately inert handler is still rejected.
- Held Consume/Thunderclap now stop damage, healing, shove and their sound owner immediately on stagger, stun, freeze, grab, sleep, downed or KO, through keyboard/mouse, P2 gamepad and bot controllers. Direct held input cannot restart them while incapacitated. Brief hit-stop and living presentation-only form continuity retain their existing contracts; Second Wind recovery input still works.

## Actual gameplay evidence

- `artifacts/power-pilot/web-final/web-gameplay.mp4`: normal WEBLINE practice spawn, public training-range toggle, mouse aim and native Q. The real shot contacts one target, visibly wraps it, deals 4 damage and expires. Close-range contact/readability evidence only.
- `artifacts/power-pilot/flight-final/retreat-and-beam.mp4`: normal APEX practice spawn, native takeoff/forward/retreat/charge/fire/release controls. No actor, camera, pose, energy or simulation overrides. Backward legs stay braced while casting and return to hover. No target hit is shown, so this is not beam-impact acceptance.
- Both are silent browser recordings, trimmed only to remove loading/menu time. Sound lifecycle is tested through the existing harness separately, not demonstrated by these silent clips.

The five activation comparisons under `artifacts/power-pilot/activation/` use native input with staged actors and neutral controls. They are diagnostic evidence and are not labelled normal gameplay.

## Reference findings

The supplied clip shows bent, asymmetric airborne retreat legs and a large charge/release energy envelope extending behind the caster. The first is implemented in this pass. The second is a bounded proposal: compact eye sources, directional single-palm flare, and a wider heavy two-hand intake/release burst that settles before it hides the target. No new Linear shader port is claimed.

See [presentation review](2026-09-11-pilot-presentation-review.md) and [reference usage audit](2026-09-11-reference-usage-audit.md). CMU and anyCreature are real authoring pilots but are not driving the normal roster; img2threejs outputs are method-labelled manual factories, not demonstrated generator output; Linear was inspected in this pass but has no runtime adaptation yet.

## Decisions taken within the approved scope

1. Web control is a short slow, not another grab/stun. If this is the wrong feel, its authored duration/multiplier or payload behavior needs retuning.
2. Duplicate default choices were removed without replacing them with more powers; old choices remain in Studio. If the preferred default differs, that is an equipment/catalog choice rather than lost content.
3. Solid cover blocks Consume and Thunderclap. Future intentional cover-piercing behavior needs an explicit authored rule rather than an accidental bypass.
4. Incapacitation should stop held damage and its sound. A future stun-immune attack would need an explicit exception; none is approved here.
5. Sleep/downed were added after review proved first-tick effects before their stagger proxy. Second Wind is preserved; a future attack-while-downed character needs an explicit exception.

## Remaining acceptance

See the [18-slot acceptance matrix](2026-09-11-pilot-acceptance-matrix.md). Shared-family tests are not equivalent to pilot-specific tuning proof. The new source-envelope VFX, full all-slot behavioral matrix, distant web readability, live-combat interruption capture and all-roster visual approval remain separate open gates. Do not extrapolate these repairs into “all powers complete” or “10/10”.

## Final verification

On `7859a55`, the controller executed:

```text
node --no-experimental-webstorage --test tools/pilot-held-lifecycle.test.mjs tools/pilot-obstruction.test.mjs tools/pilot-web-control.test.mjs tools/pilot-kit-alternatives.test.mjs tools/pilot-retreat.test.mjs tools/web-snare.test.mjs tools/web-zip.test.mjs tools/charge-energy.test.mjs tools/beam-form-continuity.test.mjs tools/remote-input.test.mjs tools/beam-startup.test.mjs tools/focus-release.test.mjs tools/ability-evidence.test.mjs
133 tests; 133 pass; 0 fail; 0 skipped.
```

Also executed in this pass: 52/52 focused flight/air-cast/language tests; native Studio alternative selection/save/reload/default-empty checks on 5182 (zero errors); and normal-input web/flight captures on `060ecac` (zero browser errors and simulation faults). The sleep/downed amendment after those captures is covered by controller tests, not by the videos. Build and final review are recorded below when complete.

Final `npm run build` on `7859a55`: exit 0, 390 modules, 7.17 seconds. Existing GLTFLoader mixed-import and oversized Studio chunk warnings remain. This repository has no unified `npm test`/lint/TypeScript gate for this JavaScript runtime; this report names the executed focused tests instead of claiming a whole-repository suite passed.
