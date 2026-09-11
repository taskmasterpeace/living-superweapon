# Nanite Task 4 — independent review

Date: 2026-09-09. Scope: Task 4 of `docs/superpowers/plans/2026-09-08-nanite-forearms-brief.md`, the complete final `docs/reports/2026-09-08-nanite-forearms-report.md`, and the seven source/test snapshots in `artifacts/nanite-task4-review.patch`. The patch is a review package of current files as additions, **not an exact Task-4-only diff or a clean commit baseline**. A read-only comparison found all seven snapshots identical to their current files at inspection time. Scope within those files follows the final report; earlier changes and the parent's audio-direction dialog work are not independently re-reviewed here.

Only this report is written. No source/test edits, full-suite rerun, build, installs, commits or subagents. `PRODUCT.md` and applicable root AGENTS instructions govern the review. Line numbers below describe the reviewed snapshot and may move during fixes.

## Verdicts

- **Specification: changes requested.** The intended authoring, source-validation, native-clock and measured-contact architecture is present. Two reproduced lifecycle defects prevent unconditional Task 4 acceptance: zero-time KO pose corruption, and a newly emitted precision shot from an already-dead incoming actor.
- **Quality: changes requested, bounded to the rehearsal.** No broad Studio migration or native damage/aim rewrite is justified. Preserve the existing source-bound schema, real contact routes and ordinary projectile lifetime rules. Parent moving visual/audio approval remains open; this review does not convert tests or stills into perceptual acceptance.

## Findings

### P2 — Zero-time inspection overwrites a native KO ragdoll pose

**Location:** `src/tool/studio-combat.js:244` (`stepNanite` non-positive/ended presentation branch). Callers include the final zero-time sample in `src/tool/studio-preview.js:198` and camera changes at `:219`; repeated endpoint presentation also enters this branch.

The branch unconditionally calls `actor._animate(poseDt)` for all three actors. Ordinary animation is not the native KO presentation path. `Fighter.update` deliberately calls `ragdoll.step`, `ragdoll.apply` and `_sync`, then returns without `_animate` (`src/engine/entity.js:1497–1500`). `_animate` restores animation layers and writes torso/head/pivot positions (`:2248–2274`), replacing transforms that the ragdoll owns.

**Independent reproduction:** use the real public shield source on a fresh ORIGIN-built Fighter, a native `StudioCombat` nanite pattern, ground-left motion, and the existing Preview-prototype/no-WebGL fixture shape from `tools/nanite-studio.test.mjs:19–36`. For the discriminating KO fixture set the test def's HP to 1 before construction, then call `seek(0)` and advance frames 1–180 through `Preview.step(1/60)`. The real incoming projectile produces KO; no direct damage reducer is invoked. At 3s capture world centers of the torso, head and the first three driven meshes of each arm. Call `Preview.step(0)` and capture again.

- Native state remains `hp=0`, `koT=0.55`, timeline `3`, `ki=106`, ragdoll present.
- In the repeated probe, actual rendered arm-mesh centers moved by up to **7.461487761u** solely because of the zero-time call; torso/head moved **0.639025191u / 0.761147167u**. Ragdoll initialization varies, so exact distances are evidence from that run, not fixed thresholds.
- A living control with the same source/motion/3s time moved **0u** for all eight sampled rendered centers.
- Applying the already-existing `ragdoll.apply(fighter)` followed by `_sync()` at zero elapsed time restored all sampled centers to the original native pose (maximum residual **7.2e-15u**) without changing time, HP, ki or `koT`.

**Required bounded correction:** make the nanite zero-time presentation branch respect native ragdoll ownership; do not tick ragdoll physics or full Fighter clocks to repair a pose-only operation. Keep ordinary living pose settling intact. Add a RED comparing final rendered mesh/world matrices before and after zero step, final seek sampling, view changes and the exact endpoint with a KO owner. Include a living control and an incoming-actor KO case. Existing semantic seek assertions (`tools/nanite-studio.test.mjs:76–80`) and KO checks (`:81–85`) do not inspect this state, which explains why they pass.

### P2 — An incoming actor killed before its cue still creates a new damaging shot

**Location:** `src/tool/studio-combat.js:231` (`stepNanite` emission gate) and `:189–200` (`emitNaniteIncoming`).

The incoming actor is genuinely finite-HP and can be hit by the owner's first cannon shot/splash. However, the scheduled ballistic emission checks only the equipped owner's `f.alive`. `emitNaniteIncoming` neither rejects a dead incoming caster nor reports that the fixture is unavailable; it moves the actor and creates new ordnance anyway. This is distinct from preserving a projectile which was legitimately committed before its caster died.

**Independent reproduction using accepted authoring values, not a fabricated source:**

1. Build a fresh public cannon + shield ORIGIN pair (`lmb` cannon, `q` shield), flight tier 3.
2. Create the ordinary profile, then use real `setAttackOverride` and `applyProfile` for the cannon values `{dmgMin:500, dmgMax:600, maxBlast:100}`. All three values pass source-bound validation; no runtime/source definition is edited. Set the nanite rehearsal to hover, stationary target, distance 12, shield ballistic sample.
3. Advance the actual stage at 60Hz. The first native cannon blast kills the incoming Kano; at 2.0s its HP is 0, `alive=false`, `koT=0.4666667`, and no incoming shot has been emitted.
4. At 2.4s `testEmitted` becomes 1 and the new live shot's `caster.alive` is false. By 2.5s it produces an actual owner contact: owner HP **106 → 98.44** while the incoming actor remains KO. This follows native contact/damage, not an injected `takeDamage`/`damageNanite` call.

**Required bounded correction:** the stage must not newly emit from an unavailable/dead incoming actor. Preserve its real KO and the genuine owner's authored blast; do not autoheal, replace, revive or make the incoming actor invulnerable to guarantee a sample. Report the absent emission/arrival truthfully, with a clear fixture-unavailable reason if useful. Add this source-tuned RED and a surviving-source control. Do **not** change global projectile post-caster-death behavior, remove already-committed shots, or modify native balance. The native punch path already reaches native melee action legality; any attempt counter should likewise distinguish an attempted schedule from a real emitted strike.

## Contracts reviewed without an additional defect found

- **Native positive-step ownership:** `stepNanite` applies Guard before the same busy-mask shape, forwards releases, supplies movement intent rather than analytic root replacement, and calls each Fighter once inside native begin/end contact boundaries (`studio-combat.js:202–243`). It then calls Projectiles once and presents resulting cell changes without a second reducer tick. Installed nanites advance once in generic/non-combat positive-time paths (`:433`, `studio-preview.js:308`), while native jump/melee retain their full-update paths. No copied regeneration/guard/hitstop formula was added.
- **Timing and sound:** transient validated rates 1/.25 are applied before the fixed 60Hz accumulator (`studio-preview.js:83–91`); seek settling receives simulation dt 0 (`:194`, `:256`); explicit endpoint cleanup clears stage ordnance/slot effects without declaring a native 8s lifetime (`studio-combat.js:245`, `:465–472`). Seek uses the existing scrubbing facade in a `finally` block (`studio-preview.js:153–156`). The KO presentation finding does not mean HP, repair, audio or input edges advance at zero dt; its demonstrated failure is final pose ownership.
- **Atomic effective-source validation:** `setProfile` calls `applyProfile` before live assignment/disposal (`studio-preview.js:93–104`); atomic pair swap builds and validates both sparse entries together (`:106–116`). Studio preflights source-aware values before draft edits, save/export and import continuation (`studio-main.js:90`, `:196`, `:253–254`, `:158`, `:386`, `:394–402`). The package branch rebuilds the recipe from local catalog sources before preflight. The underlying package importer still constructs a new ID and performs its effective apply before its single storage write (`character-package.js:50–57`). Import snapshots are not executable/catalog authority: actual application restores genuine source data and applies compatible sparse values (`attack-tuning.js:437–453`). No new profile format or saved transport state was introduced.
- **Public source/UI identity:** Formation uses shared field metadata, distinguishes gameplay integrity/repair from appearance, preserves anatomical labels, and provides one validated swap transaction. Public shield metadata is defense/non-held and its distinct icon is source-qualified. Ordinary attack symbol maps and malformed-source fallback remain intact.
- **Measurement separation:** received owner HP/contact totals, native cell absorption, per-winning-module body damage and outgoing autohealed-dummy results remain separate (`studio-combat.js:165–187`, `studio-main.js:66–71`). The launch observer does not repeatedly count committed projectiles: native commitment clears `_powerOrigin` (`projectiles.js:398`), removing them from its next pending observation. Muzzle error uses the physical sphere center versus aperture plus full radius, not a forced socket coincidence.

## Precision-fixture truth and visual evidence

The staged ballistic contact is an accepted **inspection fixture**, not an ordinary weapon encounter. The UI already says “precision” and describes the tiny projectile/current-cell test (`studio-main.js:334`), and the final report explicitly denies source-weapon/AI firing proof. That distinction is material and should remain visible in any reel/caption, especially if the lower controls are cropped. Do not expand this fix into a new weapon/AI showcase.

Independent native geometry measurement confirms the distinction: in the public shield ground-left sample, the incoming actor moves from `[12,0,4]` to approximately `[-46.2362,2.47394,0.237454]` at the 2.4s emission—**58.41007053u of fixture placement**, not native locomotion. Its current aim is not the fixture's launch direction (dot product approximately **0.87724**). `emitNaniteIncoming` launches relative to the current cell, not the actor's weapon muzzle. These are declared fixture limitations, not evidence that actual player aiming or vehicle-style movement is broken.

I inspected the existing worker `artifacts/nanite-studio/contact.png`: the received-HP, intact-cell, absorption and precise-fixture labels are present, but the ordinary-looking incoming Fighter can still be misread when only the viewport is shown. Verdict on material truth: **honest with its current explanatory context; insufficient by itself as native weapon/AI or motion-quality evidence**. A compact “staged contact fixture” cue/caption is a reasonable non-blocking clarification; no restyle is necessary. The worker's native punch result is correctly reported as a guarded **body** contact, not a panel soak.

No fresh browser screenshot was obtained in this review: the required browser runtime connected but returned “No browser is available”; its documented discovery check returned an empty list. I did not substitute another browser mechanism. Therefore the KO pose finding has independently reproduced rendered-transform evidence and a native restoring control, but still needs the implementer's focused visible before/after gate. Existing worker screenshots were inspected, not regenerated or represented as my own capture.

The worker's reported **785 passing tests**, build and UI/browser run remain attributed to that report; this review did not rerun them. Parent reel attempts with two console-404 captures and one fresh-process target crash are **not** a demonstrated renderer cause, successful reliability test, or completed motion/audio acceptance. Keep those observations and final moving/feel approval open until actual evidence resolves them.

## Handoff

Fix the two lifecycle cases test-first in the authorized Studio boundary, retain ordinary native projectile commitment/lifetime rules, and rerun the focused nanite Studio regressions plus a short real KO-view/seek sequence. The high-blast killed-source fixture must produce no newly scheduled incoming projectile, while normal surviving sources still produce genuine local contact. Final parent motion/audio acceptance is a separate gate, not a reason to widen these two fixes.

Skill application: `warworld-animation-authoring` and its acceptance matrix directed review toward final rendered geometry and moving evidence; `game-studio:game-playtest` kept fixture claims and actual UI evidence distinct; `superpowers:systematic-debugging` required the independent native reproductions, living control and zero-time restoring control before proposing corrections.

## Scoped correction re-review — 2026-09-09

**Current verdict: both P2 findings closed. Specification and implementation quality pass for these two corrections.** This supersedes the initial changes-requested verdict for those findings only; the parent still owns overall Task 4 moving/audio, feel and reliability acceptance.

Read the complete worker correction append at `docs/reports/2026-09-08-nanite-forearms-report.md:88`, the actual frozen `StudioCombat` changes, the transient UI label, the added native tests and the KO-only browser evidence. No source/test changes, new browser run, broad test/build rerun or camera review was performed here.

### Original KO pose reproduction and controls

`studio-combat.js:248–254` now selects `ragdoll.apply(actor)` for a native KO ragdoll and then calls `_sync()`. It does not step the ragdoll or Fighter; living actors retain `_animate(poseDt)`. This is the same existing native restoring control which discriminated the original failure.

Independently repeated the original procedural shield/ground-left native incoming-KO probe, measuring full world matrices of torso, head and six driven arm meshes rather than only HP/cell state:

- At 3s, zero-step maximum matrix-element difference **8.8817841970e-16**; subsequent side-view difference **2.4980018054e-16**.
- At the exact 8s endpoint, repeated zero-step matrix difference **0**.
- Final `seek(3)` pose versus `ragdoll.apply` on that same reconstructed actor's existing physical points differed by at most **3.3306690739e-16**. No separate random KO trajectory was used as the oracle.
- HP, ki, `koT`, `animT`, ragdoll current/previous physical points stayed unchanged for all those inspection operations.
- Living-source zero-step and side-view controls remained exactly **0** matrix difference with unchanged clocks.

The added tests cover all three supported body families, driven/pivot/source-bone matrices where present, zero/view/endpoint inspection, the final seek sample, and the incoming actor's KO pose. Their comparisons use native physical state and presentation, not a second restoration implementation.

### Original killed-source reproduction and lifetime control

`studio-combat.js:190–193` now rejects a dead incoming source **before** fixture placement or projectile construction. The native punch schedule also requires a live source (`:220`). The change is at the stage's new-emission boundary, not the native projectile manager.

Independently repeated the source-bound `{dmgMin:500,dmgMax:600,maxBlast:100}` cannon profile at hover/static/distance12. At 2.8s the incoming actor remained KO, `incomingStatus='unavailable-ko'`, emitted **0**, owner contacts **0**, owner HP **106**. A genuine projectile committed by that actor at 1.4s remained alive and present at `[101.4,80,100]`, with **28.6s** remaining life. The unmodified surviving-source control still emitted **1**, produced **1** owner contact and **98.44** owner HP; its earlier committed projectile likewise survived. There is no revived fixture actor or regression to ordinary post-caster-KO ordnance.

`studio-main.js:71` truthfully shows “fixture unavailable: incoming KO” using transient telemetry, without changing source/profile/package data or conflating availability with emitted/arrived counters.

### Evidence attribution and remaining gates

The worker's final correction append reports seven intended REDs followed by **98/98 focused tests**, build280modules/5.61s, and an isolated native KO browser run with `errors:[]`. I read `artifacts/nanite-studio-ko/result.json` and inspected `ko-side.png` and `incoming-ko.png`: the native intermediate knockdown is visible in the first; the unavailable-source/no-emission measurement is present in the second. The full-encounter high-blast image is a telemetry/context capture with distant figures, not new detailed motion/fit proof. The worker explicitly records its initial accessible-name timeout and distinguishes this bounded passing run from the earlier broad gate and reel failures.

Those worker tests/captures are not counted as independently rerun here. My independent evidence is the focused native matrix/lifecycle probes above. No additional defect was found in the bounded corrections. The accepted precision-source staging limitation, earlier unexplained crashes and final parent moving/audio/feel gates remain unchanged; this closure does not approve the concurrent camera work or an ordinary weapon/AI showcase.
