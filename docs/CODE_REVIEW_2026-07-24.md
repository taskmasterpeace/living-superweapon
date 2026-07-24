# CODE REVIEW — 2026-07-24 · five independent judges

Commissioned by Robert: "look at 100% of the code, determine five categories, grade with
separate agents to keep it fair, rate the effort to resolve, and do the low-effort stuff now."
Five fresh-context agents each read the tree independently, one category each. ~21,000 lines
across 48 files at review time.

## THE SCORECARD

| Category | Grade | One-line verdict |
|---|---|---|
| Architecture & module boundaries | **B+** | Acyclic core←data←engine DAG, real choke points; runtime hub-and-spoke around `game` is the debt |
| File size & organization | **B+** | ~15 subsystems cleanly extracted; hud.js was the one true kitchen sink |
| Consistency & conventions | **B+** | TYPES registry + hitstop law held rigorously; drift is duplicated constants and naming forks |
| Robustness & resource discipline | **B−** | Light-count law + audio NaN law genuinely held; the fighter figure GPU leak was the headline |
| Content-growth readiness | **B−** | Adding hero #53 is genuinely one data entry; adding a power TYPE or a tile fans out over 6–8 silent registries |

**Overall: B / B+.** The load-bearing disciplines this codebase brags about in its docs are
real — the judges checked them adversarially and they held. The debt is concentrated in
(a) resource teardown that was missing exactly where objects churn most, and (b) string-keyed
parallel registries that fail silently as content grows.

## FIXED IMMEDIATELY (this commit + 3071d1f)

- **Fighter figure GPU leak** — `dispose()` now traverses the body and frees every per-fighter
  geometry/material. Verified: 20 hero swaps → scene-children delta **0** (was: dozens of
  orphaned GPU objects per swap/respawn, unbounded).
- **Match-clear orphans** (3071d1f, found mid-review by a posed screenshot full of ghost
  drones) — all three clear paths dispose minions and in-flight projectiles/beams, returning
  their pooled lights.
- **BUILDS duplicate keys** — `jawah`/`moses` were defined twice; the repeats silently dropped
  their hood/horns. Deduped, keeping the richer entries.
- **`describeAbility` drift** — the `grapple` type printed its raw id on character sheets.
- **hud.js stylesheet extracted** to `hud.styles.js` (72KB pure string, 25% of the file;
  hud.js 2717 → 2036 lines).
- **`scaleBoxUV` deduped** — one exported function; world.js imports it (the two copies were
  documented as "must be edited in lockstep").
- **`mulberry` moved to core/util.js** — the city planner no longer imports its PRNG from the
  news desk (dependency inversion); news re-exports for compatibility.
- **BAND_DEFAULTS hoisted** — the band-threshold literal existed verbatim twice in util.js.
- **Physics finite guard** — one NaN in `pos` used to poison the object matrix silently;
  `_physics` now clamps, matching the audio path's `fin()` discipline.
- **Unguarded `this.hud` reads** in announceKill guarded (headless/teardown crash seam).
- **`lsw_news_llm` → `threshold_news_llm`** (legacy key still read) — one namespace.
- **`_vv` → `_v`** in melee.js (the lone temp-vector naming outlier).
- **Stale headers** — characters.js no longer claims "10 characters"; CODEX.md's TYPES count
  corrected to 26. creatorUI's construct-once listener documented as such.

## THE ROADMAP (medium/high effort, prioritized)

1. **[MED] `validateRoster()` at dev boot** — the growth judge's top item: no schema check
   exists for hand-authored defs; a typo'd ability type is a silent dead slot forever. Assert
   every `ability.type ∈ TYPES`, per-type required numeric fields finite, before more heroes land.
2. **[MED] `TYPE_META` unification** — adding a power type currently touches ~6 sites
   (TYPES fn, describeAbility, creator powerNumbers, AI HOLD set, ult logic, creator catalog),
   several failing silently. Hang describe/hold/ult metadata ON the TYPES entry so one
   registration covers all consumers. Do this BEFORE the next batch of powers.
3. **[MED] `TILES` registry collapse** — a tile is a builder + 7 parallel string-keyed tables
   (PLACEMENT, TILE_INFO, VARIANTS, TILE_MAX_H, TILE_SIZES, NO_ROTATE, TILE_FOOT), each
   silently defaulting when missed. One registry object, derived lookups.
4. **[MED] hud.js screen splits** — codex.js / broadcast.js / title.js / kit.js along the
   seams the file-size judge mapped (shared kit helpers extracted first).
5. **[MED] entity figure extract** — buildWeapon/BUILDS/frameOf/applyFrame/figure (~290 lines
   of pure mesh construction) → `engine/figure.js`; Fighter keeps combat/physics.
6. **[MED] Sim→UI event routing** — Fighter calls `_game.hud.feed`/`damageNumber` directly at
   17 sites; route through the existing onHit/onKO-style callbacks so the sim stops knowing
   the HUD's method surface.
7. **[MED] `ARENA` single-source** — kill the frozen module const / live instance duality
   (a bare import silently clamps big cities to 240).
8. **[MED] world.js extracts** — roads.js (~245 lines), fog.js (~110), textures.js when it
   next grows; game.js: vision/props/portals/items into System classes per the established
   Police/Peds pattern.
9. **[MED] ALT_BANDS derive from BANDS** — the entity copy's `.max/.name` fields are dead and
   disagree with per-city bands; derive, don't duplicate.
10. **[LOW-MED] product-name normalization** — 11 file headers say "Living Superweapon",
   9 say "THRESHOLD", the game says WAR WORLD: ASCENDANTS. Pick the banner, keep diegetic
   THRESHOLD branding in-world only.
11. **[LOW] summons damage contract** — Minion.takeDamage ignores `opts` (dtype/resists) while
   being hit polymorphically; honor at least dtype or rename so the divergence is explicit.
12. **[LOW] frameOf explicit archetype tag** — prefer `def.frame`/tag over prose sniffing as
   the roster scales (the "imp in simpler" incident is memorialized in a comment).
13. **[LOW] digit-swap paging** — number keys reach 10 of 52 heroes; page with a modifier or
   bind to favourites.

## What the judges verified is GENUINELY strong (keep it that way)

- The engine contains essentially **zero hardcoded hero ids** — the 53rd character touches no
  engine file, the AI auto-pilots any kit from its types, and every optional layer (identity,
  silhouette, talents) degrades gracefully. This is the rarest scalability win in the review.
- The choke points are real: all HP mutation inside `takeDamage`, one `validatePlan`, one
  `onRebuilt`, the hitstop `?? 0` law unbroken at every sustained source.
- The light-count law and the audio NaN law held under adversarial grep.
- localStorage failure handling is uniformly defensive; `_sus` reaps orphaned audio.
- characters.js at 909 lines is a big file that is exactly RIGHT to be big (pure data).
