# BEAM / POWER-VFX INTEGRATION HANDOFF

**For the AI (or human) bringing this branch into the main line.** Written 2026-09-16, at iter 53.

## THE BRANCH

- **Branch:** `codex/beam-projectile-makeover` · **repo:** `taskmasterpeace/living-superweapon`
- **Base:** `955421b` (the `integration` line — Robert's live build). Every commit since base is this
  one arc: ~60 commits, `beam-vfx` iters 1–53, plus `48c5f3e` (hero default body → Quaternius
  superhero-male). The fleet/mothership work visible in `git log` sits BELOW the base — it belongs
  to integration, not to this branch.
- **Worktree:** `D:\lsw\.worktrees\beam-projectile-makeover` (⚠ the desktop app's own dev server runs
  MAIN `D:\lsw` — to see this branch, run the worktree's own vite: `node node_modules/vite/bin/vite.js
  --port 5191 --strictPort` → `powerworld.html`).
- **Tracking:** issue **#42** — the running checklist lives in its pinned comment. Related: #43 (sky
  layer), #44 (stats/progression), #45 (PW weapons range). `docs/beam-makeover/VFX_GOAL_BOARD.md` is
  the per-iteration log.

## WHAT THIS BRANCH IS (three layers, built in order)

1. **THE ELEMENT LANGUAGE** (iters 1–21): `data/powerfx.js` — 12 power families × 3 intensity levels
   across four phases (charge / launch / flight / impact), one recipe resolver (`fxOf`) every
   renderer reads. Element core shaders in `engine/beam-surface.js` (lava, ice, shock, ki, sigil,
   ray, fluid, alien, void), element-true impact/launch/smoke/aftermath in `engine/vfx.js`,
   element-true sound routing (`data/sfx.js`, `audio.cast`).
2. **THE BEAM ANATOMY** (iters 40–48): the tube itself became data — **BUILD × TEMPER × MODE ×
   FAMILY × EDGE** (`data/visual.js`: `MODE_LOOK` 12 behavior modes, `FAMILY_EDGE` jagged-flicker
   silhouettes; consumed in `BeamHose._sweep`). Blue-flame **cool ramp** derived from the authored
   colour's hue. Fire has a solid body (sheath .8 + per-row `density`).
3. **THE STAND + THE LIBRARY** (iters 42–53): `engine/beam-gallery.js` — the proving stand Robert
   grades in (three wheels: 29 beams / 117 shots incl. armory / 36 sprays), per-wheel dials, LVL
   I/II/III, AURA, 🔥 ignite, ⧉ ROW export; `data/beams.js` — **character-unassociated** library
   rows; `beam-chart.html` — the language chart, derived through the engine's own chain.

## INTEGRATION MAP — systems by file

| File | What this branch did there |
|---|---|
| `src/data/powerfx.js` | THE FOUNDATION: family recipes, `FX_LEVELS` (I/II/III), `fxOf`/`fxLevelOf` (+ authored `a.fxLevel` override) |
| `src/data/visual.js` | `BEAM_MODES`/`MODE_LOOK` (12 modes), `beamModeOf`, `FAMILY_EDGE` (fire teeth) |
| `src/data/beams.js` | **NEW** — `LIBRARY_BEAMS` (5) + `LIBRARY_SHOTS` (3): beams/shots that belong to nobody |
| `src/data/characters.js` | kit authoring: `mode:` on ~10 beams, `material:'shadow'` (RIFT void), MERC AP Sidearm (`pierce`), IRONCLAD Micro-Missiles (`missile`) |
| `src/data/hero-models.js` | default hero body → `superhero-male` (48c5f3e; soldiers/zombies pin faceted-v1) |
| `src/engine/projectiles.js` | BeamHose: MODE geometry in `_sweep`, EDGE teeth, `animSpeed`, `density`, **resolveLaunch restores the body on BOTH paths**; Projectile: `missile` (spiral smoke), AP materials, `explosionStyle` |
| `src/engine/beam-surface.js` | all element core shaders; fire **cool ramp** (blue-hue flips both fire shaders); fire sheath opacity .8 |
| `src/engine/vfx.js` | explode reads the fx recipe + **detonation styles** (`concussion` / `emp`) |
| `src/engine/entity.js` | burn = flame shapes + **FIRE TWO DEGREES** (`_burnHeat`/`_charT`: lava crust that outlives the fire) |
| `src/engine/abilities.js` | cone **`vArc`** (vertical aperture: hit gate + spray vy), mapper forwards (`explosion`), fire-cone visual cadence |
| `src/engine/game.js` | `spawnBeamFor` mapper (build/temper/mode/sfx/fxFam/`edge`/`density`), `ignite()` catch-fire front door, `cameraDrive` yields to the gallery |
| `src/engine/beam-gallery.js` | **NEW** — the stand (see layer 3) |
| `beam-chart.html` + `src/beam-chart.js` | **NEW** — the chart page (hub tile + CHART chip button) |
| `index.html`, `src/pw-main.js` | hub tiles (Beam Gallery, Beam chart) + `?destination=gallery` deep link |

## THE LOAD-BEARING LAWS (break these and it regresses)

- **RESOLUTION RESTORES THE BODY.** A pose-gated beam is BUILT invisible (ctor: pn 0, grp hidden);
  `resolveLaunch` un-hides in the common tail, BOTH branches. The gate arms on `caster.parts.rig`
  (async load) — this is the "beam vanishes when you come back" fix. Never move the restore back
  into only the pendingLaunch branch.
- **Beams are hoses, never hitscan** (base-game hard rule, intact). The Rail Slug is a 1400 u/s slug
  with an honest not-hitscan label; a true instant-line delivery is an undecided mechanic (#42/22).
- **EDGE teeth only ever cut INWARD** — the visual envelope stays inside the hit radius.
- **The cool ramp is DERIVED from the authored colour's hue** (.5–.72 = blue flame). No flag.
- **`fxLevel` is the level field** — design of record (Robert, 2026-09-16): levels are authored ON
  the ability; WHICH level fires is selected by the character's state (tier/charge/gates, see #44).
- **NO PURPLE** outside `magicViolet` (validated in powerfx). **Light-count law** untouched: nothing
  here adds/toggles scene lights.
- **A stand target must be a REAL fighter** (1e9 hp, invuln 0, not a dummy): `addDot` exempts
  dummies and dot ticks sit behind `invuln <= 0` — a dummy can never burn/bleed/freeze.
- **The five-lane stand driver** (TYPES bodies with synthetic input): seed `st.cd = 0`, decrement it
  yourself, stamp `st.def`, and compute press/release edges as boundary CROSSINGS (prevPh wrap) —
  `ph < 1/60` fails by floating-point luck.

## BEHAVIOR DELTAS vs base (sanity-check these after merge)

1. **Hero default body is the Quaternius superhero-male** (48c5f3e) — GLOBAL visual change; soldiers,
   zombies and the practice bag explicitly pin `faceted-v1`.
2. Fire beams: smooth sine lobes → triangle-teeth flicker; sheath opacity .42 → .8 (+ per-row density).
3. Burning fighters: after ~1.1s alight, lava-crust motes form and PERSIST ~6s after the fire dies.
4. `resolveLaunch` behavior is identical for all normal paths (the restore moved three lines later
   into the shared tail); only gated-then-ungated beams (the gallery) changed — from broken to working.
5. `vArc` and `explosion` are **opt-in fields** — absent, every cone and blast renders as before.
6. Roster kit authoring (modes, MERC pierce, IRONCLAD missile) — data-only, visible in play.

## VERIFY AFTER MERGE (10 minutes, in the real page)

1. `powerworld.html?destination=gallery` → chip shows **1/29**; `,` `.` cycles; shaft visible on
   every beam **including after cycling away and back** (the iter-46 regression).
2. `⇄` to SHOTS → Micro-Missiles fly and impact; ARMORY rows fire (shotguns, M107 with reload pauses).
3. `⇄` to SPRAYS → flamethrower follows REACH/WIDTH sliders.
4. 🔥 → flames → crust → fire dies, **crust stays** (~6s).
5. `beam-chart.html` → row count matches the beam wheel; Heat Ray reads family **ray** (the chart runs
   the two-step chain `fxOf → beamVisualFamily`; one-step is the drift this page exists to kill).
6. Console: 0 errors; `renderer.compile(scene,camera)` clean (GLSL gate).
7. City game unaffected: iso duel plays normally (all stand code is gallery-scoped; engine deltas are
   the six listed above).
- ⚠ Known pre-existing on this base (NOT this branch): the pwSuite/groundSuite headless-harness
  cluster fails (melee self-proof + thrown-prop stub — documented in CLAUDE.md §50 note).

## STILL OPEN (the queue, on #42's pinned comment)

Instant-at-the-spot delivery + reverse flow (26) · cloud-drop telegraph (27) · boomerang ×3 + free
recall (28, **parked**: animations first) · AURA v2 skin/lava-being (29b) · nova wheel + the
"I'm the explosive" camera decision (30) · explosion ladder to the nuke (18) · thrust looks (8) ·
LAB save-in-place (12; ⧉ ROW is its seed) · core+sheath+aura non-additive shaft rebuild (the bright-
desert washout — the oldest open weakness).
