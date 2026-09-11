# Resource constructs — Task 4 implementation report

2026-09-08. Task 4 only: source-bound wall/tank authoring and a truthful native Studio resource encounter. Shared dirty checkout preserved; no commits, staging, worktrees or subagents. Tasks 1–3, animation, audio and unrelated gameplay were not rewritten.

## Status

Implementation, the full focused automated gate, parent browser/image checks and independent final review pass. This closes the wall/tank resource-authoring slice, not the wider military/nanite construct brief.

## Changes

- `src/data/attack-tuning.js`: source wall/tank-only lifetime/rate controls; tank-only bounded motion/cannon fields; inactive values remain visible and saved. Entry cost, cooldown, form and emission origin are not construct overrides. Sparse source reconciliation remains authoritative. The merged raw source and patch are also checked with native `resolveConstructPolicy` / `tankSettings`; normalized defaults are discarded, not saved.
- `src/data/creator.js`: one genuine `willtank` command pick, 28 ORIGIN points, 24 entry ki, cooldown 8s, timed duration 12s. Existing source records are unchanged by this task.
- `src/engine/entity.js`: the approved narrow `Fighter.regenerateKi(dt, anyCharge)` extraction contains exactly the former ordinary ki regeneration pair. Native update calls it at the same location with the existing charge predicate. Guard/safe-charge additions, yells, timers, hitstop, physics and wound/mood arithmetic stay in their original native order.
- `src/tool/studio-combat.js`: valid resource definition selected in either slot enables native ordinary regen once after both inputs, then shared upkeep → projectiles → constructs. Target regeneration is not added. KO/frozen owners skip regen; hitstop does not. Timed-only previews retain no regen and their construct-before-projectile order. The missing native `damageBlock` route joins the already-native `areaDamage`; the empty stage still has no city mutation.
- `src/tool/studio-preview.js`: resource inspection is exactly eight seconds, including mixed timed/resource selections; it never changes native indefinite lifetime. Real seek still runs its ninety positive-dt presentation samples, but passes simulation dt zero during those samples. Starting ki is validated encounter state, not profile data. Infinite owners start at their native maximum. At the resource endpoint, `StudioCombat.clearTransientEffects` removes encounter ordnance/cover/presentation while retaining measured statistics; timed-only endpoints do not take this branch.
- Studio inputs: .6s native summon; 1s tank lateral ground designation; 2.5s native ballistic shot toward each live proxy's actual current bounds; 3s hold at the actual tank position; 6s native second-press dismissal; transport reset by 8s. No hand-aimed old opposing-shot script is duplicated in this resource encounter. Normal timed scripts are preserved.
- `src/tool/studio-main.js`, `src/engine/creatorUI.js`, `src/engine/hudUtil.js`, `src/engine/hud.js`: existing metadata inspector and combat controls now distinguish source-owned fields, inactive rates, finite starting ki / infinite core, owner ki, accepted construct hits/damage/ki spent, and outgoing humanoid HP contacts. The interface states that eight seconds is inspection, not lifespan, and explains the fixed barrel's close-target limitation. Target distance 60u is suggested for clear cannon inspection, not enforced as a physics bypass.
- No production changes to `studio-profile.js` or `character-package.js` were necessary: genuine ORIGIN reconstruction already preserves compatible sparse tuning and drops forged/stale source identities.

## Public inspection seams

`StudioCombat.startingKi`: `null` means full default; finite values are bounded by the owner's maximum through `StudioPreview.setCombat` and clamped on reset. Infinite cores explicitly start at maximum.

`StudioCombat.resourceEncounter`: selected primary **or** selected secondary is a valid resource wall/tank in Attack mode; does not depend on a live object.

`StudioCombat.resourceStats()` returns `{ki, maxKi, infinite, constructs:[{slot, kind, mode, rate, live, state, hits, damage, kiSpent}]}`. Last controlled object references preserve diagnostics after native dismissal/depletion until reset. Construct statistics never increment the measurement target's `contacts` or `damage`.

DOM: existing `data-attack-key` fields (including `constructLifetime`, `constructKiPerSec`, `constructKiPerDamage`); `#construct-start-ki`; `#construct-budget`; existing `#attack-sequence-note`. Authoring remains in the same inspector/save/export/import path.

## Red/green evidence

- Initial construct tuning tests failed because constructs were unsupported and the genuine tank catalog pick was absent. Round-trip fixture was corrected to supply the existing required LMB and RMB picks.
- Initial resource Studio tests failed for starting ki, absent regen/upkeep/contact, missing diagnostics, missing tank holding designation, unbounded resource transport and seek-zero energy. The ready-tank case was strengthened to exercise actual native stationary firing; the old ordering produced one forbidden same-frame ghost shell before the incoming hit retired the tank.
- Independent data review found that an invalid raw source rate/mode or tank setting could pass an unrelated sparse patch. Six new RED cases reproduced it; native merged validation now rejects all six without saving defaults.
- 34 construct tuning tests cover source identity, sparse/reset behavior, immutable source fields, rejected raw/merged values, genuine package save/export/import/reload and accurate descriptions.
- 24 resource Studio tests cover native real wall/tank contacts, shared exhaustion, charging primary/secondary and release tick, cap/sheet/mood/wound/infinite arithmetic, KO/frozen/hitstop gates, exact seek-zero, backward seek/playback parity, silent reconstruction/live drain audio, new-shell ordering, cleanup/source replacement and the eight-second transport endpoint.
- Final reviewer endpoint finding reproduced using **accepted** controls: `setCombat({distance:60,motion:'orbit-left',targetSpeed:70,startingKi:100})`, native tank speed 20, range 160, interval 1.2. A real missed shell remains at 7.9s and formerly at `seek(8)`. Resource-only endpoint cleanup now removes it without damage/detonation or statistic loss; a timed-only 60s wall remains live at `seek(8)`. Native six-second dismissal and already-fired ordnance before the transport boundary are unchanged.
- Native damage wall fixture: starting 100 ki, entry 10, incoming ballistic damage 10 at conversion 2 → 70 ki, one accepted contact, 10 damage received, 20 construct ki spent; no humanoid HP event. Regen is explicitly zero in this equality fixture.
- Native upkeep fixture: 5 ki/s from the .6s spawning tick; physical incoming contact is accepted without a second per-hit debit. Both modes outlive source duration 1s and dismiss through the actual 6s press.
- A same-owner final .2 ki upkeep tick shared between 10/s and 30/s constructs spends .05 and .15 respectively regardless of reversed array order, then removes both cover records.
- The real `StudioPreview.seek(0)` preserves configured 40 ki after all ninety pose-settle samples. Playback and seek to the same 3s sample match exact diagnostic snapshots; historical native drain sounds remain silent.

## Verification commands

```powershell
node --test tools/construct-tuning.test.mjs tools/attack-tuning.test.mjs tools/resource-construct-studio.test.mjs
```

69/69 passed after the independent merged-source validation correction.

```powershell
node --test tools/construct-policy.test.mjs tools/construct-tank.test.mjs tools/construct-hit.test.mjs tools/construct-tuning.test.mjs tools/resource-construct-studio.test.mjs tools/construct-studio.test.mjs tools/construct-surface.test.mjs tools/attack-tuning.test.mjs tools/studio-profile.test.mjs tools/character-package.test.mjs tools/projectile-contact.test.mjs tools/beam-cover-contact.test.mjs tools/moving-melee.test.mjs tools/studio-audio.test.mjs
```

Final full gate after endpoint cleanup: **310/310 passed**, zero failures, 62.610s. This includes the two endpoint cases and the existing all-shipped-profile native flight-joint regression rather than excluding its longer runtime. The earlier pre-endpoint run was 308/308 in 62.893s.

```powershell
node --test tools/resource-construct-studio.test.mjs tools/construct-studio.test.mjs tools/studio-audio.test.mjs
```

Final endpoint-focused gate: 39/39 passed, 4.964s (24 resource Studio, 8 legacy construct, 7 audio).

```powershell
node --check src/tool/studio-main.js
npm run build
node .agents/skills/impeccable/scripts/detect.mjs --json src/tool/studio-main.js src/engine/creatorUI.js src/engine/hudUtil.js src/engine/hud.js
```

Syntax passed. Final build after the endpoint correction: 274 modules, 7.65s, existing large-chunk warning. UI detector: one existing `creatorUI.js:88` width-transition warning, outside this change. Scoped `git diff --check` found no whitespace issue (only LF/CRLF notices).

## Review and limits

Plan-execution/TDD guided the tests-first boundaries. The UI skills kept this an extension of the established warm charcoal/gold Operate inspector, using existing responsive controls and separate factual contact readouts; no map, theme or shell redesign. Parent owns independent review and browser proof rather than spawning another worker here.

The tank barrel is fixed at 14.5u; the native close-target check requires turret-pivot-to-target-center distance greater than `14.5 + target radius + 1` (17.7u for a 2.2u target). This is not an editable origin bypass. Obstructed/close shots remain suppressed. The Studio encounter is a scripted native runtime fixture, not proof of free-input movement feel or every collision arrangement. Receiver lanes and their broader limits remain in Tasks 1–3 reports; no new targeting, city/pathfinding/driving, unsupported construct forms, tank recovery from externally inserted geometry, military/nanite variants or extra HP pools are claimed.

Parent browser command/artifacts: `node tools/resource-construct-browser.mjs`, `artifacts/resource-construct-studio/` (parent-owned). Final full run passed against isolated port 5189: actual UI catalog/save/export/import/reload/native-gameplay-definition checks, 390px layout, resource contact/seek/audio/dismissal, the accepted-controls eight-second endpoint and zero app errors. The native boot-added `dtype: 'energy'` is explicitly compared as derived data rather than mistaken for a profile mismatch. At 4.2s the genuine tank had 10 incoming damage / 20 ki billed, and 56.6223 outgoing humanoid HP damage over four events. The final browser's slow-shell case used actual UI distance 60, orbit-left motion, speed 20, range 160 and interval 1.2: one live shell at 7.9s, none at 8s, zero covers, with identical retained construct statistics (one hit / 10 damage / 20 ki spent). Desktop wall/tank/catalog and compact screenshots plus the final empty endpoint were visually inspected.

`node tools/resource-construct-reel.mjs` imports the genuine exported package through the UI and records live native Studio playback plus its actual AudioContext. Through 6.933s simulation it measured 20 incoming ki billed, 85.086 outgoing HP damage across six events, dismissed construct and zero covers/errors. The generated `native-studio-tank.mp4` has verified H264 video / AAC audio (1090×532, 11.917s container); browser pacing means its media duration is not simulation duration or a performance benchmark. Representative travel/holding frames were inspected. This is a scripted authoring encounter, not free-input gameplay or final aesthetic acceptance.

Independent reviewer approved final Task 4. Fresh endpoint recheck: 39 Studio/legacy/audio and six native lifecycle/order tests; accepted controls reproduced the corrected boundary, repeated zero-dt/seek(8) and source replacement remained stable, a timed 60-second wall remained live at seek(8), and native runSlot dismissal preserved an already-fired shell that continued moving at native time 8. Earlier independent source/package/regen checks also passed. The reviewer corrected an initial distance-100 reproduction because Studio rejects distances above 60; the final finding and fix are proven using accepted controls.

Two parent harness assumptions were corrected without production changes: await the lazy ORIGIN dialog before counting its cards, and account explicitly for gameplay's existing derived damage-type stamp. User guide: `docs/RESOURCE_CONSTRUCTS.md`.
