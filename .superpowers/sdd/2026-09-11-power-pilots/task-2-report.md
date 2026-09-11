# Task 2 report — curated pilot kits and web-control identity

## Result

Task 2 is implemented in the assigned worktree. WEBLINE now carries a finite traveling Web Darts control payload; WEBLINE/APEX/VANGUARD ship with their approved cuts left empty; the exact removed definitions remain deliberate Studio alternatives with profile persistence. The controller amendment is also implemented: VANGUARD Thunderclap and APEX Consume cannot damage, shove, or siphon through cover/interior visibility.

This report does not approve every retained power. It reports only the acceptance exercised below; the broader retained-power gaps recorded in `docs/reports/2026-09-11-pilot-acceptance-matrix.md` remain separate work.

## Red evidence

1. Initial pilot data/behavior test:
   - Command: `node --test tools/pilot-kit-alternatives.test.mjs tools/pilot-web-control.test.mjs`
   - Result: 2 failures. The alternative catalog did not exist, and Web Darts was still an explosive volley.
2. Studio profile contract:
   - Command: `node --test tools/pilot-kit-alternatives.test.mjs`
   - Result before profile integration: 1 pass / 3 failures; selector API, `kit` persistence, and legacy completion were absent.
3. Web-control behavior:
   - Command: `node --test tools/pilot-web-control.test.mjs`
   - Result before engine integration: 3 pass / 7 failures; a traveled hit never created `_webControl`.
4. Real Studio UI:
   - Command: `node tools/pilot-studio-alternatives-browser.mjs`
   - Result before UI integration: Playwright timed out selecting WEBLINE slot R because an empty catalog slot was not exposed.
5. Controller obstruction amendment:
   - Command: `node --test tools/pilot-obstruction.test.mjs`
   - Result: 2 pass / 2 fail. Behind the fixture-verified wall, Thunderclap dealt 1.6 damage and shoved at 46.3793u/s; Consume dealt 2.2 and healed 1.32.
6. Dormant custom-source preservation:
   - Command: `node --localstorage-file=$env:TEMP\lsw-pilot-node-localstorage.json --test tools/pilot-kit-alternatives.test.mjs`
   - Result before selector correction: 6 pass / 1 fail; unequipping Perfect Wave deleted its tuned source snapshot.

## Green verification

- Syntax plus complete focused Node gate:
  - Command: `node --check src/data/pilot-kit-alternatives.js; node --check src/engine/web-control.js; node --check src/engine/abilities.js; node --check src/engine/entity.js; node --check src/engine/projectiles.js; node --check src/tool/studio-profile.js; node --check src/tool/studio-main.js; node --localstorage-file=$env:TEMP\lsw-pilot-node-localstorage.json --test tools/pilot-kit-alternatives.test.mjs tools/pilot-web-control.test.mjs tools/pilot-obstruction.test.mjs tools/web-snare.test.mjs tools/web-zip.test.mjs tools/studio-profile.test.mjs`
  - Result: 67 tests passed, 0 failed. The temporary Node local-storage file was deleted afterward.
- Real Studio browser round trip on runtime 5182:
  - Command: `node tools/pilot-studio-alternatives-browser.mjs`
  - Result: pass; empty defaults, deliberate selection, live Fighter rebuild, save/reload, dormant tuned source restoration, and 0 page errors.
- Existing native WEBLINE browser rehearsals:
  - Command: `node tools/web-snare-browser.mjs && node tools/web-zip-browser.mjs`
  - Result: exit 0; Web Snare traveled/held/released without page errors and Web Zip reached/released its physical wall anchor with `ok:true`.
- Controller-supplied native Web Darts capture:
  - Evidence: `artifacts/power-pilot/web-native/results.json`, `web-contact.png`, and `web-gameplay.mp4`.
  - Result reported by the controller: accepted real Q contact/expiry evidence with clean runtime behavior.
- Production build and whitespace gate:
  - Command: `node tools/pilot-studio-alternatives-browser.mjs && npm run build && git diff --check`
  - Result: exit 0; 390 modules transformed, Studio browser pass, diff check clean. Vite retained its existing GLTF mixed-import and large-chunk warnings.

## Behavioral evidence

- Web Darts is one non-homing `projectile` with direct damage 4, no area damage, base 1.2s control, 0.45 movement multiplier, and 1s post-effect immunity.
- The control payload is ability data (`webControl`) rather than a WEBLINE identity branch. Existing energy volleys remain unchanged.
- Strength and `sheet.ccRecover` shorten duration. Active control neither grabs nor sets stun/freeze and repeated contacts neither stack nor refresh it.
- Frontal guard, phase, status immunity, and solid cover reject control. Cover also leaves target HP unchanged.
- Wrap and shot geometry are finite and disposed. Expiry/cover contact uses web impact feedback without area damage.
- Source stagger/KO/form/disposal before contact latches the control payload off while the committed projectile still travels and deals its direct hit. Source form/disposal and target KO clear active wrapping.
- The obstruction amendment uses the existing `game.canSee` cover/interior truth for actual receiver admission. Open contact remains positive; phase rejects; guard and energy resistance reduce native admitted damage; Consume healing follows only damage actually dealt.
- APEX retains Wave Cannon as its only equipped beam. VANGUARD retains Unbreakable as its only equipped defensive buff, and its signature description now names R Unbreakable.
- Empty R/F defaults are exercised through Fighter construction, native `runSlot`, AI construction, HUD rows, wheel choices, profile validation, and Studio.

## Files owned and changed

- `src/data/characters.js`
- `src/data/pilot-kit-alternatives.js`
- `src/engine/abilities.js`
- `src/engine/entity.js`
- `src/engine/projectiles.js`
- `src/engine/web-control.js`
- `src/tool/studio-main.js`
- `src/tool/studio-profile.js`
- `tools/pilot-kit-alternatives.test.mjs`
- `tools/pilot-obstruction.test.mjs`
- `tools/pilot-studio-alternatives-browser.mjs`
- `tools/pilot-web-control.test.mjs`
- `.superpowers/sdd/2026-09-11-power-pilots/task-2-report.md`

## Scope and concerns

- No flight pose/tuning, charge gathering, beam-source presentation, aircraft, desert art, or non-pilot character definition was changed. No saved custom data was deleted or rewritten.
- Studio keeps its existing library/stage/inspector language. The narrow `Kit source` selector explicitly labels removed definitions as authoring alternatives; it does not fill default gaps or present them as balance recommendations.
- Native Web Darts contact/expiry evidence was captured and accepted by the controller; additional presentation captures remain controller-owned. This task's own browser acceptance covers Studio/runtime behavior and page errors.
- The acceptance matrix still lists broader held-power lifecycle and retained-kit coverage gaps. Per controller direction, those are reported rather than folded into this bounded implementation.
