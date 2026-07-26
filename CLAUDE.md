# LIVING SUPERWEAPON — project notes for Claude

Isometric top-down superhero action game (Three.js). Inspiration: **Bid For Power × Soldat**.
The **engine is the product** — a data-driven power system. Demo-first, offline, no build gymnastics.

## Run / verify
- `npm run dev` → http://localhost:5180 (vite, port pinned in `.claude/launch.json`).
- Headless smoke test (no display needed): load the page, then in the console/Playwright:
  `window.LSW` exposes `{ game, hud, ROSTER }`. `game.startMatch(id)`, `game.spawnRival(id)`,
  step with `game.update(dt)`. To pose a still frame, override `game.update = () => game.world.render()`
  (freezes decay), set the camera manually, then screenshot. Give a bot `new AI(player)` +
  `game.controlPlayer = dt => game.controlBot(game.player, dt)` to watch AI-vs-AI live.
- ⚠️ Vite may do a one-time full reload when it optimizes deps (three postprocessing / dynamic imports).
  If a posed screenshot shows the title screen again, the page reloaded — just recompose and re-shoot.

## Architecture (see README for the full map)
- **Sound design** (`core/audio.js`): combat SFX take an optional world `pos` — gain falls off with
  distance to `audio.listen(x,z)` (set to the player each frame); booms carry ~240u, cracks ~110u,
  screams ~190u. **DBZ voice synths**: `yell(pitch,dur,intensity,pos)` (detuned saws + vibrato + breath),
  `grunt` (pain bark on slams), `cry` (KO wail — fires for every death in `handleKO`). `game.heroYell(f,i)`
  gates on `def.yells` + `f._yellCd`; fires on charge start, long-charge (>1.15s), transforms/buffs,
  tier-ups (`_yellCd` reset for the ascension scream), haymakers. `def.voicePitch` 0.55 (RAGE) – 1.3 (DECIBEL).
- **The tabletop layer** (`data/ranks.js`, baked per-fighter as `f.sheet` in the ctor): seven attributes
  (Fighting/Agility/Might/Vigor/Intellect/Awareness/Resolve) on a named 10-rank ladder (Civilian→Cosmic),
  DERIVED from hero data with `def.attrs` overrides; talents (1–3 per hero, `HERO_TALENTS` + kit-derived
  fallback) bake to flat multipliers: `cdMult` (pay() + items), `jabMult` (melee.js), `spreadMult`
  (rifle/volley), `blastMult` (Projectile ctor + mines), `evadeCdMult`, `ccRecover` (stagger/frozen
  decrement), `healMult`, `odWindow` (Overdrive threshold), `sumDurMult`, `chargeRate`, `predator`,
  `kiRegenMult`, `visMult` (fog range). Character select renders the full sheet (ranks/talents/gear).
- **ORIGIN — the character creator** (`data/creator.js` rulebook + `engine/creatorUI.js` screen; "FORGE
  NEW" card on the roster; ruled name-TBD, so renaming = one string): D&D point-buy over the ranks.js
  sheet. Budgets STREET 160 → COSMIC 400 (+UNBOUND); escalating `ATTR_COST` on the rank ladder — attrs
  literally derive hp/ki/speed/strength (`derived()`); a ~40-power catalog of ENGINE-PROVEN ability
  configs (costs calibrated by BALANCE.md: martial priced up, charge kits down, gear cheap); traits,
  gifts, talents, gadgets, frames (`def.build` overrides BUILDS), palettes (no purple)/skin/voice.
  LIVE damage numbers per pick (`powerNumbers`) + auto LeFevre threat (`threatOf(points)`) — both
  creator-interview rulings. Persists `{picks,def}` in localStorage `threshold_customs_v1`;
  `installCustoms(ROSTER)` at boot makes customs full citizens (playable, rivals, survival waves, P2)
  with AI doctrine derived from the kit (`deriveAI`). Sheet hooks: `def.talents`/`def.attrs`/`def.build`.
  `validate()` gates saves (budget, LMB+RMB required, ults R-only, quiver-needs-bow). SAVE & TEST drops
  straight into training. `LSW.creator` + `LSW.runSlot` exposed for headless testing.
- **TRUE 1:1 SCALE + POLICE (the villain law)**: the world is now HUMAN-scale against the 9.6u
  (1.8m) heroes — 1u ≈ 0.19m, one building floor = one 17u window row (`scaleBoxUV B=17`), cars
  24u long w/ chest-high roofs, streetlights 32u, trees 14u trunks + 9.5u canopies (you stand
  UNDER them), downtown towers 54–150u (flagship spots + every tile builder rescaled; cover hp
  formula 0.0075/volume; only h≥44 casts shadows). Flight ceiling 320, ALT_BANDS BUILDING→150 /
  SKY→260; entity/ragdoll bounds read `game.world.ARENA` (per-city). **Tower cutaway**
  (`world.updateOcclusion`, called from game.update): buildings h≥44 crossing the camera→player
  segment fade to 0.16 opacity via LAZY material clones (shared district mats stay shared;
  restored + disposed when clear; `_teardownCity` clears `_fades`). **POLICE**
  (`engine/police.js`): THE VILLAIN IS WHOEVER HURTS HUMANS — civilian knockdowns book HEAT on
  the perpetrator (+12/civ, +40/officer KO'd, decay 1.3/s after 6s quiet); heat ≥35 flags the
  villain → WANTED ★☆☆–★★★ (HUD `#plWanted`, foe-bar 🚨 VILLAIN tag, blue radar dots). Response
  ETA comes from the theater's SAFETY INDEX (`26 - safety*0.25`s, clamp 5–24 — the world-sheet
  payoff). Cruisers (shared car geo, black-and-white, blinking red/blue light bar) drive in from
  the nearest dry edge, park (registered as destructible world cars), deploy OFFICERS — real
  Fighters (team 2, `COP_DEF`/`SWAT_DEF` at wanted★★★, `police:true` keeps them OUT of the Elo
  book) with `f.fixation = villain`: **isFoe now enforces fixation both ways** — cops only fight
  the villain, and nobody untainted can even target a badge. Reinforcement waves every 16s up to
  2+2·level units; villain gone → officers stand down and despawn, cruisers stay as street
  furniture. News/feed/announce/matchLog all cover it ("POLICE DISPATCHED — THE SOUTHSIDE",
  city-desk "responding officers injured"). Verified: idle SOL was flagged, hunted, and KO'd
  three times by responding units, then the flag decayed and they went home. Refs:
  `lsw-scale-street.jpeg`, `lsw-occlusion.jpeg` (cutaway), `lsw-police.jpeg`.
  **Polish pass (2026-07-23)**: `audio.siren` two-tone whoops on dispatch/arrival + per-star
  escalation announces ("SPECIAL RESPONSE AUTHORIZED" at ★★★, SWAT highlight for the crew);
  exploded CRUISERS char properly (group-aware `_explodeCar` — lights die too); news van rescaled
  to 1:1 (26u body, real wheels/mast); crack overlays respect the tower cutaway (`userData.baseO`);
  the broadcast gained a NAMED desk anchor (ANCHORS pool → chip labels + credit line), a police-beat
  anchor line citing the theater's actual response seconds, a WANTED ★ row in the tale of the tape,
  a wanted ticker item + time-of-day ticker flavor, a segmented clip PROGRESS STRIP under the TV
  (gold fill, pale for slo-mo clips), and the witness card now appends INSIDE the script flow (no
  collision with the typing sign-off). Atlas city cards show POLICE RESPONSE ~Ns · RAPID/SLOW.
  Ref: `lsw-news-polished.jpeg`.
- **THE WORLD LAYER — procedural cities off the world sheet** (`data/cities.js` 1,050 real cities
  baked from Robert's Country Master Sheet: name/country/pop/popType/cityTypes×4/crime/safety;
  `data/cityplan.js` planner; `engine/citytiles.js` tile library; world.js `rebuildCity(plan)`):
  cities generate on the SAME sectional grid as the flagship (96u `CELL`s + 22u streets — ⚠ streets
  are a real ROAD GRAPH now, see below; the ground texture is only the lot surface).
  `generatePlan(city, seed, opts)` sizes the grid
  by popType (Village/Small Town 3 → Town/Small City 4 → City/Large City 5 → Mega 6 = arena 288),
  places IDENTITY tiles first (seaport/resort hug the east water column, political takes the center,
  military/mining cluster at edges, campus pairs, corporate core), fills with commercial/residential
  + parks. ⚠ Placement is a TABLE now (`PLACEMENT`) and the old 24-cell `STRUCT_CAP` is gone — see
  the road-graph section below.
  **Tiles**: 20 types × 2–3 variants (residential courts/L-blocks/towers-in-park · commercial ·
  corporate HQ+logo/skybridge twins · industrial warehouses/tank-farm/conveyor works · military
  fenced compounds w/ helipads/barracks · CAPITOL dome+colonnade+flags/ministries+obelisk · campus
  quad+bell-tower/library · temple pagoda/gold-dome+minaret/ziggurat · MINING (real pits dug into
  the terrain — `_pendingPits` → `crater()` then frozen as `_ghBase`; resetTerrain restores to BASE
  so pits survive, combat craters clamp relative to base) · seaport container-yard+crane/piers+ship ·
  resort hotel+pool+palms/boardwalk+cabanas · park · plaza). Big structures register as cover
  (destructible, crack overlays, `cover.sort` biggest-first for the 24-box fog budget); flavor props
  are decor. **Teardown/rebuild**: `_teardownCity()` disposes the arena group + `_cityBits` (trees/
  lawns via `_buildGreenery(lawns, spots)`); flagship rebuilds via its untouched bespoke builder
  (`thresholdPlan()`, cells:null). ARENA is now per-instance everywhere (entity/ragdoll bounds read
  `game.world.ARENA`); peds re-grid via `peds.setCity`; the news crew scales its van spawn; fog plane
  is a constant 700u. **CITY ATLAS** (`hud.showAtlas`, title 🗺/theater chip in the term line):
  search/type-filter the 1,050, live 2D plan preview canvas, REROLL seed, SET AS THEATER (persisted
  `threshold_theater_v1`; `main.beginMatch` rebuilds when the theater changed), and the TILE PROVING
  GROUND (`galleryPlan()` — every tile on one map, in training, for perfecting variants). In-match
  **city nameplate** (`#hCity`): "📍 BENGUELA · ANGOLA — CITY · POP 715K · CRIME 75". Districts are
  plan-aware everywhere via `world.districtAt` (news lower-thirds say "THE MINEWORKS"); crime/safety
  ride the plan for future police-response pacing. Refs: `lsw-city-benguela.jpeg`,
  `lsw-city-mazar.jpeg` (night, dome + pits), `lsw-city-gallery.jpeg`, `lsw-atlas.jpeg`.
- **THE SHEET (2026-07-24)**: the codex is a FULL-VIEWPORT FASERIP-style character sheet now —
  `.cfbody` grid: left ATTRIBUTE RAIL (`.atline` rows: the seven attributes as rank NAME +
  colored bar + number off `deriveAttrs`/`rankName`/`rankColor` — our ladder is the FASERIP
  column) + DERIVED (hull/core/might/flight/escape) + DEFENSES (`resistOf` chips: IMMUNE/×mult,
  rounded — the sheet can't drift from the engine) + talents + gear; right: threat/record/
  doctrine + the wide armament/counter/intercept sections. The CREATOR's rank chips fill
  proportionally (gradient meter). **The creator catalog is GENERIC now** ("Energy Beam",
  "Charged Orb", "Attack Drones" — ids unchanged, saved customs safe; hero kits keep their
  flavor names). `vfx.explode` gained a detonation kernel + pressure ring + gravity debris.
  Ref: `lsw-sheet.jpeg`.
- **THE CODEX — the full case file** (`hud.showCodex(def)`, overlay `hCodex`; entries: the gold
  "📁 OPEN FULL CASE FILE" button on the registry preview + any rankings-board row; ‹ › pages the
  roster, ✕/ESC closes): a Planetary-grade dossier where EVERY line derives from live data so it
  can never lie. §01 IDENTIFICATION (legal name/registry, synthetic detection, REDACTED residence
  + next-of-kin bars, FRAME class from strength, voice register from `voicePitch`+`yells`, power
  core incl. ∞-core tier-cap note) · §02 THREAT ASSESSMENT (LeFevre + basis figures, hull/guard,
  flight cert, rank-colored attributes, talents, gear) · §03 SANCTIONED RECORD (Elo/rank/record/KO
  + dated incident history + 🏆 REIGNING CHAMPION) · §04 SURVEILLANCE (AI doctrine style, band,
  aggression/airborne %, escape tech, trait FLAGS) · §05 DOCUMENTED ARMAMENT (table of REAL kit
  numbers per slot: output/ki/cycle/reach + CHARGE-SCALED/HOMING/FREEZE/PAYLOADS notes,
  `cfAbilityRows`) · §06 IF ENCOUNTERED (rule-derived countermeasure brief, `cfCounterNotes` —
  guard-crush lines, back-grab vs teleEscape, barrier-starving, overdrive warnings, style
  doctrine) · §07 FIELD INTERCEPT (seeded witness line via `causeLine`). Stamp, watermark,
  scanlines, mono case-file styling. Ref: `lsw-codex.jpeg`.
- **THRESHOLD REGISTRY + POWER RANKINGS + THE INVITATIONAL** (`data/rankings.js`,
  `engine/tournament.js`, hud registry/atlas/bracket/board): the select screen is a Planetary-style
  intel database — classification bar, terminal query line (live counts + THEATER chip), FILE cards
  (`LSW-###-CC` from flag regional-indicators, ACTIVE/OPERATIONAL status — synthetics detected from
  `person.n`, threat stripe, live `PWR-IDX`), and the dossier: CLASSIFIED stamp, mono identity block,
  deterministic FILE OPENED date, FIELD RECORD (Elo/rank/record/KO from the book) + recent-incident
  lines, scanlines + sweep + watermark. **Rankings** (`threshold_rankings_v1`): per-hero Elo seeded
  from LeFevre threat; EVERY KO between opposing registered weapons books `koElo` (k=10) and decided
  matches book `matchElo` (duel 28 / tournament 40 / sim 6) — AI-vs-AI and piloted alike; friendly-
  fire KOs never book. Sports-desk board (📊, `rankingTable` = the ONLY movement-Δ caller;
  `snapshotTable` is the pure read) shows Δ arrows, records, the champion's 🏆. **Tournament** mode
  (`MODE_IMPL.tournament` + `Tournament` class): 8 sides seeded off the book (1v8/4v5/3v6/2v7),
  formats 1v1 / 2v2 duos (AI partner) / 1v2 underdog; matches are best-of-3 ELIMINATION rounds
  (everyone `noRespawn`, `_tourneyRound` full-respawns per round, lead stats carry across rounds,
  city damage persists); `friendlyFire` ON (splash-only, 50%, feed-shamed, melee/beams stay clean).
  Off-screen matches resolve by Elo-weighted sim (SIM chip); the player's report (`reportPlayerMatch`,
  winner-first scores) advances the bracket and crowns `crownChampion`. Flow: bracket-first
  (`hud.showBracket` — pulsing live cell, struck losers, champion card) → match → news screen
  (kicker "INVITATIONAL · QUARTERFINAL", CONTINUE ▸ BRACKET) → repeat → 🏆. Refs:
  `lsw-registry.jpeg`, `lsw-bracket.jpeg`, `lsw-bracket-champion.jpeg`, `lsw-rankings.jpeg`.
- **KMK 9 ACTION NEWS — the broadcast layer** (`engine/newscrew.js` crew + capture, `data/news.js`
  language desk; Witness Layer act II): a camera operator (navy, red cap, shoulder rig w/ blinking
  tally) + field reporter (crimson blazer, flagged mic) spawn with their curbside van in every
  non-training mode and CHASE the fight — vantage picking (LOS via `game.canSee`, side-on preferred,
  never down the beam axis), auto-zoom FOV from subject spread, handheld sway that worsens running/
  scared, duck on near blasts, knocked FLAT by close ones (camera keeps rolling on the pavement,
  tilted), reporter stand-ups when the fight lulls. **The camera is real**: on highlights
  (`news.highlight` from handleKO / big onHit / shatterBlock / _explodeCar / tier-ups / collateral)
  the operator's POV renders at 320×180 — scissored into the canvas corner BEFORE the composer pass
  (never visible), entities force-shown (no fog for TV), shadow autoUpdate paused — blitted to a 2D
  canvas, stamped with the broadcast package (bug, LIVE, the REAL in-world clock from `world.dayT`,
  district lower-thirds from `districtAt`), stored as JPEG-frame clips w/ a 4-frame rolling pre-roll.
  KO/bighit shoot 20fps and carry `slowFrom/slowTo` — the end-screen TV plays that window at 0.38×
  with a gold SLO-MO tag. The last KO records THROUGH match end into the same array the TV plays.
  HUD shows the live monitor (`#hPip`, the capture canvas itself) while `news.onAir`.
  **The report**: `game` tracks `matchT`, `matchLog` (KOs w/ clock+district+blow kind from combat
  flags: strike/slam/dot/slash→fists/slam/beam/blade), per-fighter `stats` (dmg/taken/big),
  `cityStats` (civs/cars/blocks/craters), `bigHit`; `buildReport` at endMatch → `writeBroadcast`
  (data/news.js) generates the anchor script in REPORTER register — civilians don't know move names
  (kind→witness-speak), epithets from `def.person`/threat ("registered to Samuel Ellison of
  Ellsworth, Kansas"), comeback/shutout detection, damage-$ estimate, district witnesses, ticker.
  `hud._showBroadcast`: TV set replaying the clips (static between, one clip decoded at a time),
  typed script, tale-of-the-tape (DAMAGE TAKEN highlights the LOWER number), city desk, scrolling
  ticker, news sting + staticBurst (audio.js). Optional LAN LLM punch-up (`llmPunchUp` → Mac Mini
  Ollama qwen3.5, 9s abort, localStorage `lsw_news_llm` = config JSON or 'off') — offline-procedural
  is the contract; LLM lines slide in as "DESK UPDATE". No pronouns are ever guessed — aliases/they.
  ⚠ areaDamage now passes `src` (explosions credit the blaster — fixed a kill-attribution gap).
  Refs: `lsw-news-report.jpeg` (the broadcast), `lsw-news-crew.jpeg`, `lsw-news-onair.jpeg` (PiP),
  `lsw-news-frame.jpeg` (raw captured frame).
- **Gadgets** (items on X, `charges` per life, refilled on respawn): beacon · medkit · flashbang
  (staggers + wipes bot memory) · jetcell (temp flightTier 3) · shieldpack (`f._shieldHp` ablative pool
  in takeDamage). Bots use all of them (`controlBot` items block).
- **New powers**: `mine` (plant ≤3 proximity charges — meshes swept in `dispose()`), `lifedrain`
  (held siphon → self-heal), `boomerang` projectile flag (out-clip-return, hits both passes; bounces
  home off walls/ground). Balance: `docs/BALANCE.md` — AI-vs-AI audit method + first-pass rulings
  (martial rushers trimmed, TITAN/VEGA/PYRE buffed; Threat-Low gear humans losing to Very-High is BY RULING).
- **NOVA + MIND CONTROL (2026-07-24 — finished the cut-off 2026-07-23 /goal)**: `nova` = TORCH's R
  SUPERNOVA (hold FEEDS the whole ki tank; omnidirectional areaDamage at any altitude scaling with
  fed ki; caster left bone dry via `onDrained`; <12-ki taps fizzle LOUDLY — energy-clarity law).
  `mindcontrol` = MARSHAL's R Dominion (flips a bot's team for `dur` 6s; minds only — never humans,
  never `def.police`, never dummies). ⚠ The guards are load-bearing: a `_controlled` fighter's KOs
  NEVER book Elo (koElo guard), the tournament round check counts them on `f._oldTeam`, and
  `releaseMind` (abilities.js — also run by `clearSlotFx` when the CONTROLLER dies) is the ONLY
  team-restore path. Victim's stateRing pulses cyan while dominated; belief is wiped on seize AND
  release (honesty law). Both in the ORIGIN catalog as ults (Supernova 28 · Mind Control 30); AI
  uses them via the occasional-ult rule with a no-waste gate (nova wants d≤34 + ≥50% tank,
  mindcontrol wants d≤range). Manual: COMBAT_MANUAL §7.
- `data/characters.js` — the **52** heroes as **pure data**. Add a hero = add data here. Trait fields:
  `thorns` (hurt grabbers), `phase` (intangible), `grabHeal`, `teleEscape` (auto), `metal` (robot),
  `guardStrong` (riot shield), `tentacles` (verlet tentacles), **`strength` 1–10** (melee dmg up,
  knockback/beam-shove down via `kbMul`, faster ice break-outs), **`overdrive`** (comeback: drained/low-ki
  melee hits convert damage→ki in `game.onHit`), **`threat`** (LeFevre scale, shown on select),
  **`guardType`** `'block'|'deflect'|'barrier'`, **`meleeTiers`** 2|3, `frostResist` (fire heroes).
- `engine/abilities.js` — `TYPES` registry (22 power types incl. `tentacle`, `portal`, `rifle`, `bow`,
  `quiver`, `nova`, `mindcontrol`). New *kind* of power = one entry.
- **Charged melee** (`melee.js chargeStart/chargeUpdate/chargeRelease/_heavy`): V tap = jab combo ·
  short hold = straight (meleeTiers 3 only) · ≥0.55s = HAYMAKER (dmg scales with charge × strength).
  **Haymaker vs guard = GUARD CRUSH** (blocker staggers 0.85s, −0.55 meter, wide open); jabs/straights
  blocked = attacker punishable (strikeCd 0.5 + hitstop). AI winds up haymakers via `f._aiCharge`.
- **Guard types**: visible `guardArc` mesh on every figure (flash on block, reddens near break).
  `deflect` (VANGUARD/TITAN): projectiles/arrows bounce back at the shooter (Projectile `_defl`).
  `barrier` (AURUM/RIME): blocks ALL directions, costs 16 ki/s (out-drains regen), breaks at 0 ki.
- **Freeze** (`addFrost/_thaw`): cold cones build `frost` → encased in ice (`frozenT`, shell mesh,
  no actions; control fns gate on `frozenT > 0`). Strength shortens it; `frostResist` halves buildup;
  teleEscape heroes blink out for 20 ki; heavy hits shatter early for 1.3× damage. Immune 2.5s after.
- **DoTs** (`addDot`): poison/burn/gas stacks tick hp with tinted particles + periodic numbers (arrow
  payloads, KIVULI's gas). **Bow/quiver**: draw-scaled arrows (REAL arrow meshes, not orbs) with
  payloads poison/flame/explosive cycled by `quiver` (kit-widget chip shows what's nocked).
- **Grass** (`world._buildGrass`): ONE InstancedMesh, 2400 blades, vertex-shader wind; every crater/
  scorch calls `flattenGrass` (blades in radius go down); `resetTerrain` restores. Keep it one draw call.
- Guard binds: **C / X / Mouse4-5** (kbm) or L1 (pad). Docs: `docs/ROSTER.md` (equivalents + LeFevre
  threat scale), `docs/VOICE_AND_SFX.md`, `docs/ENGINE_ROADMAP.md` (the 20-item plan), `docs/DESIGN_INTERVIEW.md`.
- **Slam damage** (`entity._slam` + `game.onSlam`): being HURLED into cover walls / arena border / the ground
  hurts (≤32, credited to the launcher via `lastHitBy`). Gated on `launchT` (set by takeDamage when kb>30 or
  launch>12) — dashing/flying into walls yourself NEVER hurts. `_slamCd` debounces. Throws + tentacles +
  fist-slams all feed it.
- **Tentacles** (`engine/tentacles.js`): verlet chains (9 segs, tapered spheres) in WORLD space — fighters with
  `def.tentacles` build them lazily and MUST be `dispose()`d (all entity-clear paths call `e.dispose()`).
  Idle = noise sway; `t.target = vec3` = reach. KRAKEN's `tentacle` ability: reach → hold (drag victim in,
  `grabbedBy` stun, teleEscape at midpoint) → hurl at the nearest cover block → slam physics does the crunch.
- **Portals** (`game.placePortal/updatePortals`, type `portal`): press 1 = orange door at aim, press 2 = blue exit;
  fighters + projectiles within 5u hop through (`_portalCd` 0.9s). One pair per owner; cleared on match start.
- **Power tiers** (`entity.tierOf`: lvl 1–3=I, 4–6=II, 7–9=III, 10=MAX): crossing a tier = transformation
  ceremony (shockwave + lightning + pillar + slowmo + "TIER II" announce), aura shifts accent→gold→white-hot
  (`TIER_COLORS`), and the HUD meter panel physically WIDENS (+44px/tier) so a maxed meter LOOKS bigger.
- **Will Fist grab-slam** (`summons.js`): triggering the fist with a foe under it seizes → hoists → pile-drives
  (guaranteed ground slam). Constructs release victims on dispose.
- Arena is **240** (`world.ARENA`, instance-mirrored for the radar) with 20 cover blocks (= fog shader MAX).
- `engine/melee.js` — `MeleeSystem`: Strike/Guard/Grab trifecta. Called from `controlPlayer`/`controlBot`
  (keys V/G/C) and per-frame via `melee.update(f,dt)` inside `Fighter.update`.
- `engine/game.js` — orchestrator + combat helpers + **`onHit(target,amount,opts,blocked)`** (every hit
  routes through here → damage numbers, combo, sparks) + soft lock-on (`pickTarget`, `updateReticle`).
- Player and AI both emit an **intent** `{move, aimDir, slots:{key:{pressed,held,released}}, fly}`
  routed through the same `runSlot`. Keep that symmetry.
- Controls: WASD move · mouse aim (**hover a character to target it**, else nearest-to-cursor) · LMB/RMB/Q/E/**H**/R
  powers (the 4th power slot is `f` in data but bound to **KeyH**) · **F = FLIGHT TOGGLE** (mode on/off;
  SPACE rise, release hover, **Z descend** — Ctrl also works but is NOT advertised: Ctrl+W closes the tab
  online, so input.js preventDefaults the blockable Ctrl combos and all hints say Z) · **V tap jab / hold
  HAYMAKER · G grab · C/Mouse4-5 guard** (X = item) · SHIFT dash · **2×TAP move = EVADE** · ESC pause ·
  **MOUSE WHEEL / 1–0 swap hero** · TAB roster · B rival.
- **Flight tiers** (`def.flightTier`): 0 = grounded (SARGE/GALE — leap only, toggle refuses) · 1 = clumsy
  (VOLT/HIVE/KRAKEN — sags when not rising, sine drift, no hover) · 2 = levitator (0.62× air speed —
  RIME/WARDEN/PYRE/RIFT/TITAN/KIVULI) · 3 = full flight. `flyStyle`: 'fire' = Torch wake (TORCH/PYRE),
  'ice' = RIME rides a frozen board (mesh in `parts.iceBoard`). `energyInfinite` (TITAN): ki pinned at max,
  spendKi always true, HUD shows "∞ CORE", **tier hard-capped at II** in levelUp — the DBZ-android tradeoff.
- **Flight POSE** (`_animate`, figure group order **'YXZ'** — yaw→pitch→roll along the facing axis; do NOT
  revert to default XYZ, it turns the lean into a sideways roll): body aligns with the TRAVEL direction —
  level cruise = prone head-first (~87°), rising = vertical (head points where you're going), pure up/down
  and hover-at-altitude = fully upright, dives = nose-down (capped 1.85 rad), strafes bank (`rollT` from
  lateral velocity). Engagement scales with speed (`k` ramps 6→26 u/s) so drift/hover stays vertical.
  **Superhero limbs**: prone cruise = lead fist punched past the head (armR −2.95) + off arm swept back,
  legs trail only when prone (`fp × prone`); hover = arms flared, legs hanging straight. Combat poses win
  (`combatPose` gate). Archers get a draw pose (`_bowDraw` ← `_bowDrawT` from the bow ability).
- **Weapons registry** (`entity.js buildWeapon`): pistol/shotgun/rifle/sword/knife/spear/axe/bow meshes,
  mounted on fists via BUILDS `weaponL:/weaponR:` (or legacy `gun`) — SARGE sword+rifle+shield, GALE bow+knife.
  All along the arm's −Y axis so poses + ragdoll carry them.
- **ITEMS** (`def.items` on the hero, runtime `f.items`, button **X** — guard is C/Mouse4-5 only now):
  gadgets a character CARRIES, outside the ability slots — no ki, cooldown-only. `game.useItem(f)`
  dispatches by kind. First kind `beacon` (SANDRA): X plants a tripod at her feet, X again — from
  anywhere — teleports her back to it (state ready→deployed→cooldown; mesh disposed via `f.dispose()`;
  AI plants when healthy + bails to it when hurt; radar shows a gold diamond; kit-widget chip shows state).
- **Reveal buff** (`def.reveal` on a buff → `f._revealT`): `_humanSees` returns true while active —
  SANDRA's "The Ring Sees" wallhack (Its Voice reads every camera).
- **THE MARLETTA** (`facebomb` type + Projectile `face/armDelay`): charge grows her (size/damage/blast by
  charge), release → slow homing canvas-face sprite; ANY contact (foe/ground/cover/timeout) → `_arm()`:
  she stops, trembles, blushes toward burning for `armDelay` (0.65s), then detonates with double shockwave
  + lightning + slowmo. Deflect guards can't bounce her. KING STEFANOS (`stefanos`, COF canon) carries her on R.
- **Ragdoll weight** (`ragdoll.js`): `gravMul` from strength (heavies fall harder); first hard core impact
  (chest/pelvis/head, >~30 u/s) fires `game.onRagdollImpact` → strength-scaled crater + dust + shake
  (STR ≥ 7 lands like a meteor). One impact per ragdoll (`_impacted`).
- **PURPLE EXCEPTION**: KIVULI ONLY (creator override 2026-07-22). No other purple anywhere, ever.
- Design docs: `docs/DESIGN_DECISIONS.md` (creator interview rulings — READ before big design calls),
  `docs/CODEX.md` (power schema), `docs/NEXT_CHARACTERS.md` (COF canon import queue: Stefanos/Sandra/…).
- **Evade** (`def.evade = {kind,...}` on each hero, defaults in `abilities.js → EVADE_DEFAULTS`, engine `performEvade`):
  kinds `dash` / `blink` / `sprint` / `slide` (RIME ice-skate, low drag) / `phase` (SPECTER, long i-frames). Double-tap
  detection lives in `controlPlayer` (`TAP_DIRS`, 0.28s window); bots juke incoming projectiles with it in `controlBot`.
  ⚠️ dash/slide impulses need `burstT`/`_slideT` — `Fighter.move()` clamps velocity to walk speed otherwise.
- **Energy clarity** (don't regress): running ki dry mid-ability is NEVER silent. `game.onDrained(f)` (smoke fizzle +
  power-down + `drainedT` → HUD DRAINED tag + red-pulsing ki bar) fires from beams/charges/cones/volleys/phase/spirit-bomb;
  a charge that runs dry **releases at current charge** (never a frozen orb). `game.onNoKi(f,key)` (unaffordable press)
  → `hud.kiDenied` slot shake + ki-bar flash. Ki bar: amber <38%, red pulse <15%.
- **Flight / levitation** (`entity._physics`): `flyHeld` rising-edge takes off into `this.flying` (gravity suspended).
  While flying: hold `flyHeld` → rise (`FLY_RISE`), `descendHeld` → sink (`FLY_SINK`), neither → **hover** at altitude
  with a gentle bob **+ a soft floor** (bias up when y<2.6 so you float, never ankle-skim). Landing exits flight ONLY
  when intentional (`descendHeld`, or tier ≤1 sagging out) — a knockback dipping you to the ground does NOT cancel
  the mode (that read as "flight randomly turns off"; fixed 2026-07-22). Takeoff pop = `FLY_TAKEOFF` 19 (also in
  `toggleFlight`). `grounded` = `!flying`. Player descend = **Z** (Ctrl works, unadvertised — browser shortcuts), pad L3.
  AI descends by setting `descendHeld = flying && !it.fly`. Knockback still arcs under gravity (flight is opt-in only).
- **Gamepad** (`core/gamepad.js`, `game.pad`): standard/PS2 mapping — sticks move/aim, R2/L2 powers, □○ melee,
  L1 guard, ✕ fly, △ ult, dpad Q/E/F + swap, Start/Select pause/roster. Polled at top of `game.update`;
  `controlPlayer` ORs pad + keyboard/mouse; Start/Select/swap handled in `main.js padSystem()`.
- **Physics**: AABB (Box3) collision vs cover in `entity._physics` — walls push out (least-penetration axis) and you
  **stand on block tops** (`onBlock` → `grounded`); `game.resolveBodies()` separates overlapping fighters.
  Cover carries `{x,z,hx,hz,top}` (construct walls fall back to `r`/`h`).

## DAMAGE TYPES + THE MECHANIC PROTOCOL (2026-07-23) — read `docs/COMBAT_MANUAL.md` first
- **The manual is the contract**: `docs/COMBAT_MANUAL.md` documents the real pipeline (the order of
  operations inside `takeDamage`, the ballistic scale, the type table, the vertical model). If you
  change combat, change the manual IN THE SAME COMMIT. It is written to be read by a human.
- **Every hit has a `dtype`** (`DTYPES`/`DTYPE_INFO` in entity.js): physical · ballistic · energy ·
  fire · cold · toxic · acid. Callers that don't declare one get a sane default computed in
  `takeDamage` (`ballistic` → `strike|slam` → else `energy`), so **no damage source is ever
  untyped** and a new ability can't silently skip resistances.
- **Every fighter has `f.resist`** (`resistOf(def)`, baked in the ctor). Derived so no hero has to be
  hand-authored: `metal` → toxic 0 / fire 0.6 / **acid 1.6**; armoured → acid 1.4; bare flesh →
  acid 0.7; `frostResist` → cold 0.45. `def.resist` overrides always win.
  ⚠ **A resistance must cut BOTH ways** — every type something resists must be a type something else
  is WEAK to, or it's just a nerf. Metal shrugs off poison and fire *and corrodes under acid*.
- **⚠ DoT ticks route through `takeDamage`** (fixed 2026-07-23). They used to subtract `hp` directly,
  so every poison/burn/gas stack bypassed armour, toughness, `phase`, the shield pack, guard and all
  resistances — **a poison arrow ticked TITAN exactly as hard as a civilian**. Ticks now accumulate
  and land discretely every 0.5s (readable numbers, no 60Hz hit-flash strobe). Never subtract `hp`
  outside the choke point.
- **ACID is the anti-armour type** — it applies `_corrode`/`_corrodeAmt`, which is subtracted from
  `def.armor` inside the ballistic filter for the duration. Measured: a 9-damage shot did **0** to
  TITAN, then **1.92** once corroded. Victim vents yellow-green smoke while it lasts. Carried by
  **four** characters across four delivery systems — GALE (arrow payload) · KRAKEN (cone) ·
  KNIGHTFALL (mine) · HIVE (projectile).
- **THE PROTOCOL for adding a mechanic** (manual §5, Robert's ruling): it must be a data-driven TYPE
  not an `if (def.id === …)`; route through the choke point; appear on **≥2 characters via ≥2
  delivery systems** unless deliberately rare *and written down*; have a counter; be readable
  (VFX + number + HUD); be in BOTH the manual and the in-game **DAMAGE CODEX**; and be verified
  headlessly with real assertions.
- **The DAMAGE CODEX** (`hud.showDamage()`, overlay `hDamage`, entry from the HOW-TO screen) renders
  every type's immune/resists/weak lists by running `resistOf` over the live ROSTER — the screen
  physically cannot drift from the engine. Ref: `lsw-damage-codex.jpeg`.
  ⚠ **`resistOf(def, sheet)` TAKES TWO ARGUMENTS AND BOTH MATTER** (2026-07-25). MAGIC resistance
  derives from RESOLVE via the sheet; called as `resistOf(def)` it silently falls back to the res-6
  default, so **every hero reports a flat ×1.03**. The Fighter ctor passed the sheet, both codex
  surfaces did not — so the MAGIC row rendered IMMUNE—/RESISTS—/WEAK— and the per-hero chip showed
  the same number 52 times, hiding the whole rule. "Derived from the engine" is only true if you
  call it the way the engine does; a shared default argument is exactly how a can't-drift surface
  drifts. Fixed at both sites; now 5 distinct values (0.82 TITAN → 1.10 the res-5 cast).

## THE GROUND IS REAL — terrain height, the metro, and the countryside (2026-07-23)
- **`world.heightAt(x, z)`** bilinear-samples the terrain heightfield; `entity._physics` caches it as
  `f.groundY` once per frame and uses it as the floor. ⚠ Before this, physics used a hard `y = 0`
  plane and **every crater, quarry and cut was purely cosmetic** — you walked on an invisible flat
  floor over a 5-unit pit. Ground markers (shadow/bandRing/faceWedge/stateRing) and the ragdoll floor
  all offset by `groundY`. Verified: a fighter dropped into a mining pit rests at −5.1 and is
  `grounded`; flat ground still lands at exactly 0.
- **`world.trench(cx, cz, hw, hd, depth, slope, ry)`** — the rectangular counterpart to `crater()`
  (excavator vs bomb). Cuts with `min()` so it carves rather than accumulates. Queued via
  `_pendingCuts` and applied before `_ghBase` freezes, exactly like mining `_pendingPits`.
- **THE METRO** (`metro` tile, 2 variants): a 13u-deep cut-and-cover station — platforms (standable,
  destructible), track bed, a three-car train, pillars, and stair headhouses on the street. The
  planner lays them **in a straight ROW** so consecutive cells join into ONE continuous trench:
  measured **228u** of unbroken cut. This is the linear spine the concentric-square placement never
  had. Towns and up only.
- **THE COUNTRYSIDE** (`farmland`, 3 variants): Villages and Small Towns were being generated as
  miniature cities. `plan.rural` now fills them with fields, barns, silos, orchards and stone walls —
  open sightlines and low cover instead of a downtown with fewer buildings. Farmland is **exempt from
  `STRUCT_CAP`** (2–3 cover pieces, not a block of towers), so rural maps keep all their country.
- **Real tunnels are NOT possible on the current terrain** and must not be faked: a heightfield is a
  single surface and cannot fold over itself, so there is no "ceiling". The metro is an open cut for
  exactly that reason. Tunnels need the roofed-volume system that interiors also need. Water likewise
  has no seabed yet — `waterAt` is a drag multiplier only — which is why submarines have nowhere to
  be. The design for both is in COMBAT_MANUAL §6.

## EDGE SOCKETS — every cell knows its neighbours (2026-07-23)
- **The structural fix.** A tile builder used to receive only `(ctx, cx, cz, variant)` — a
  write-only side-effect keyed on a POINT. It never learned its own `(row, col)`, its neighbours,
  its frontage or its footprint. That one fact is why there were no corner tiles, no multi-cell
  structures, and no cell-to-cell continuity; the metro had to be hacked by making every station
  OVERSHOOT its own cell and hoping the overlap lined up.
- `generatePlan` now stamps every cell with `r`/`c`, `nb` (neighbour TYPE per side) and
  `edge` (the SOCKET per side): `edge` (map boundary) · `water` · `same` (identical district) ·
  `open` (park/plaza) · `street`. Plus `face` (frontage — water beats street beats open, ties break
  toward the centre) and `corner` (two adjacent open sides = where a bodega goes).
  Verified symmetric: 80 adjacencies, 0 mismatches.
- `buildTiles` passes the whole cell as a 5th arg. Builders opt in — this is additive, nothing
  breaks if a builder ignores it.
- **Perimeters stop where the district stops** (`perimeter(cell, run)` helper): two adjacent
  MILITARY cells are now one base, not two fenced boxes with a corridor between them. Same for the
  TEMPLE precinct wall.
- **⚠ The metro cut now extends ONLY toward neighbours that are also metro.** Before this it cut
  `CELL/2 + 12` on BOTH sides unconditionally, so an isolated station trenched into whatever
  district was next door and a shared stretch got excavated twice. Measured: an isolated station
  now runs 46u inside its own 48u half-cell instead of 60u.
- **THE BODEGA** (`bodega()` in citytiles.js) — the first thing in the generator that could not
  exist before sockets: a corner shop with an awning and a lit sign, placed at the junction
  `cell.corner` identifies, facing the streets that are actually there.
- Ruling (2026-07-23): the map maker stays a GAME FEATURE for now and gets extracted later — but
  hold the discipline, no game types leaking into the plan. `cityplan.js` is already engine-agnostic
  (zero Three.js); keep it that way. Interiors are PARKED — see `docs/BACKLOG.md`.
- ⚠ **Canvas 2D cannot read CSS tokens.** `ctx.fillStyle = 'var(--gold)'` is silently ignored and
  keeps the previous colour. Anything painted into a `<canvas>` must use literals.

## THE ROAD GRAPH + FOOTPRINTS + THE DENSITY CAP (2026-07-23) — read `docs/THE_MAP_MAKER.md`
- **ROADS ARE DATA, NOT A TEXTURE** (`ROAD`/`buildRoads`/`roadAt`/`junctionAt` in `cityplan.js`;
  `world._buildRoadNet`). Nodes are the (N+1)² lattice of cell corners; `plan.roads.h[r][c]` joins
  node(r,c)→(r,c+1) and `.v[r][c]` joins (r,c)→(r+1,c); the value is a CLASS and **0 means there is
  no road here** — that is what makes a dead end possible. Classes: `track` 9u dirt · `street` 22u ·
  `arterial` 30u · `highway` 38u, chosen from the traffic WEIGHT of the two districts an edge sits
  between. Geometry: one subdivided ribbon per edge **draped over `heightAt`** (so it dips into the
  metro cut), a junction patch per node, merged into ONE mesh per class. Built AFTER excavation in
  `_buildGenCity` for exactly that reason.
  ⚠ `_gridTexture(streets=false)` for generated cities — the ground is a LOT SURFACE now; only the
  flagship (no road graph) still paints its streets into the texture. Never paint roads twice.
  ⚠ Nothing DRIVES on the graph yet. Traffic/peds/police approach must query `roadAt`, not re-derive.
- **MULTI-CELL FOOTPRINTS** (`TILE_FOOT`): the ANCHOR cell carries `{t,v,fh,fw}`, every covered cell
  carries `{t, ref:[ar,ac]}`. `buildTiles` SKIPS ref cells (building one twice stacks three stadiums
  inside a stadium) and hands the builder `ctx.W`/`ctx.D` = the whole footprint, so a tile sizes
  itself. Shipped: stadium 2×2 · airport 2×3 · railyard 1×3; the planner tries each BOTH ways round.
  ⚠ Two cells of the same owner get `R_NONE` between them — no street runs through an airport.
- **PLACEMENT IS A TABLE** (`PLACEMENT`), not an `if` chain: `{ t, need, minN, chance, foot,
  landmark, rural, score }` where `score` sums named terms (`center rim ring water south cluster
  jitter`). Rows are ATOMIC — a second berth is a second row. Landmarks are never demoted by the
  density budget; `ref` cells never count toward it.
- **THE DENSITY CAP IS GONE.** `STRUCT_CAP = 24` existed only to match `uniform vec2 uBoxC[24]` in
  the fog shader (a GLSL compile-time constant) — the SHADER decided how dense a city could be, so
  a Mega City came out emptier than a small town. Fog occlusion is now an OCCUPANCY GRID
  (`FOG_RES 384` texels over `FOG_EXT 700`, `refreshFogBoxes` rasterises the INTERIOR of each cover
  box) and the shader marches `FOG_STEPS 26` taps through it — O(1) in building count, 0.026ms to
  rebuild. Budget is now `min(64, round(N²·0.82)+4)`: Tokyo 79 cover pieces, an 8×8 override 99.
  ⚠ Rasterise the INTERIOR (ceil/floor), never the bounding texels — growing each box outward put a
  ~2u halo of false occlusion around every wall and blinded a fighter standing flush against one.
  ⚠ Fog SHADING is now approximate (96% agreement with analytic LOS at working range). Gameplay LOS
  (`game.canSee`, AI vision, targeting) is UNCHANGED and still exact. Don't "fix" one with the other.
- **REGION SKINS** (`REGIONS`/`regionOf` + `cultureOf` in cities.js): the 14 architectural regions
  finally drive the build — wall/roof/ground/greenery, applied once per city in `mats(world, region)`
  (cache keyed by region, old set disposed on change) plus a `_winMats` colour multiply. **The
  GROUND carries it** — facades alone were too subtle to read. The sheet's 21 blank rows are filled
  from the modal code of that country's other cities (Hell, Norway → West Europe via Oslo).
  ⚠ Los Angeles is coded 14 (MIDDLE EASTERN) in Robert's source sheet. That is a DATA error, not a
  code one, and is deliberately NOT overridden — fix it in the sheet.
- **THE MAP MAKER IS AN EDITOR NOW** (`hud.showAtlas` + `_mapEdit`/`_mapUndo`/`_showLayouts`):
  paint (incl. water), 🔒 LOCK a generated cell against rerolls, undo 50 deep (Ctrl+Z), resize the
  grid 2×2–9×9, move the coastline 0–3 columns, named layouts + plan JSON in/out
  (`threshold_layouts_v1`). Overrides ride `generatePlan(city, seed, {N, waterCols, landmarks})`.
  ⚠ `applyPlanEdits` lives in `cityplan.js`, not the HUD — after a paint the SOCKETS and the ROAD
  GRAPH must be re-derived (`computeSockets` + `buildRoads`) or the editor is drawing a lie.
  ⚠ Sockets are derived LAST in generatePlan, after the density budget demotes cells — they used to
  run before it, so a plaza'd cell kept the neighbour data of the tower it used to be.
  Refs: `wwa-mapmaker.jpeg`, `wwa-airport.jpeg`, `wwa-region-kabul.jpeg`, `wwa-region-tokyo.jpeg`.

## THE LIVING STREET (2026-07-25) — `engine/wildlife.js`, birds + blown litter
- **TWO instanced draws, allocated ONCE in the World ctor, only ever RE-SEEDED.** 64 birds + 40
  litter pieces on fixed-size typed arrays; `setCity(arena, cover, world)` refills perch points and
  positions without a single allocation, so a city rebuild costs nothing. Measured **0.047ms/tick
  = 0.9% of a frame**; a 45s AI-vs-AI fight ran p50 5.2ms / p99 15.1 / 0 frames over 50ms.
- **⚠ Ticked from `world.render()`, NOT `game.update`** — the ATLAS tool is a World with no Game,
  and the streets should be alive in the tool too. It therefore needs no wiring on either page.
- **They are not decoration.** `game.noise()` (the same broadcast the AI hears) calls
  `wildlife.scare(x,z,r)`, so explosions, heavy hits and KOs break the flock for the sky — a
  measured 85 scare calls and a peak of 38/64 fleeing in one fight. A flock coming off a roof two
  blocks away is a real tell that a fight has started.
- **Perches are REAL rooftops** taken from the city's own cover boxes (`top >= 14`, capped at 240
  points). Coordinates are copied as numbers, so a torn-down city leaves no stale references.
- **They ROOST.** `world.dayT` drives it: measured 55/64 perched at night vs 10/64 by day.
- **Wingbeat is free** — the geometry is two swept triangles and the beat is the instance's Y
  scale, so a wing flap costs nothing beyond the matrix that was already being written.
- `setQuality(tier)` trims the flock FIRST (18 birds / no litter at tier 0) — atmosphere yields
  before anything the player is aiming at. Sized for READABILITY not zoology (a true-scale gull is
  under a metre at 1u≈0.19m and vanishes against a grey city). Ref `wwa-streets-birds.png`.

## THE STREETS (2026-07-25) — "the streets are a mess", fixed (docs/THE_MAP_MAKER.md)
- **⚠ THE LOT IS NOT THE CELL.** Roads are CENTRED on cell boundaries, so a 22u street takes 11u
  out of the cell each side — but `buildTiles` handed builders the WHOLE cell, so a tile that used
  its space put its wall in the carriageway. Measured: **29.5% of every cover box in the game stood
  in a road**, worst 22u, across **19 tile types** (market/park/seaport 100%). One missing number,
  not nineteen bad builders. `lotFor(plan,r,c,fw,fh)` (cityplan) returns the per-side setback;
  buildTiles folds it into `ctx.LI` (uniform inset) + `ctx.LOX/LOZ` (re-centring) at the SAME five
  helpers that apply `ctx.S`, so no builder changed. `ctx.W`/`ctx.D` are the BUILDABLE frontage now.
  → **29.5% → 5.5%** over 60 plans; the rest is linear infra (metro/railyard) that runs its length.
  ⚠ ONE factor for both axes — per-axis squeeze would distort rotated buildings. NEVER height.
  ⚠ `reg()` now takes the footprint from `scale.x` and the height from `scale.y` (the mesh is no
  longer uniformly scaled). Verified 43/45 boxes closer to the visible mesh, 0 worse, 5.92u→1.76u.
- **A street keeps its class down the block.** `classFor` decides each edge independently, so a run
  changed class wherever the neighbouring district's weight changed (9 mid-run changes on one Tokyo
  plan = the brown/grey patchwork). `smoothRoadRuns` de-spikes each lattice line — a span that
  disagrees with BOTH neighbours takes the heavier of the two. A GAP is never smoothed (a dead end
  is real data). → 3.3 per plan.
- **⚠ NO ROAD CROSSES A RAIL CUT.** Adjacent metro cells form ONE continuous trench; a street on the
  shared edge dropped a carriageway into the excavation (59% of metro boxes read as in-road). Two
  stations are one structure, like a footprint. A crossing needs a BRIDGE and there is none.
- **Asphalt reads as asphalt.** The old `#c3bcac` shoulder + `#6e6a61` carriageway × a warm
  `#b9b1a2` material tint came out light tan with almost no separation from the lot. Value is now
  decided in the texture alone (material untinted): carriageway luminance **59** vs lot **200**.
- **Crossings are not confetti.** Striping all four arms of all 74 junctions made **970** white
  quads on one plan. Now needs junction degree ≥3 AND an arterial+ arm — a quiet corner gets clean
  asphalt, which is what makes a striped junction read as important. → 970→222 (82 avg).
- Verified: 60 plans, 0 validator failures, 0 errors, village/gallery/editor-repaint all build,
  flagship untouched (no road graph → inset is a no-op). Refs `wwa-streets-before/after.png`.

## THE MAP MAKER AS A DEV TOOL (2026-07-23) — scale, the countryside, live 3D
- **THE SCALE CONTRACT** (`plan.cell`, default `CELL` 96; `plan.scale = cell/96`; `CELL_RANGE`
  32–240). A tile builder is authored in BASE units and never thinks about scale. `ctx.S` is applied
  at the FIVE helpers every tile goes through (`mesh` · `tower` · `reg` · `disc`/`slab`), by scaling
  the mesh and its OFFSET FROM THE CELL CENTRE (`sx`/`sz` in citytiles.js). Nothing reparents, so
  cover boxes stay in world space and the ragdoll, `resetTerrain`, occlusion and physics are
  untouched. ⚠ `reg()` takes position + extent from the MESH (already scaled) — the x/z args are
  the caller's base-unit intent and are wrong at any scale but 1. ⚠ treeSpots, `_pendingCuts` and
  `_pendingPits` are pushed as raw world coords, so `buildTiles` converts whatever a tile appended
  (snapshot lengths before, transform after). Verified 32u→240u: cover boxes scale linearly
  (25×10×8 → 185×75×60), fighters spawn inside and stand on the ground, 0 errors.
- **THE FOG FITS THE MAP** (`world._fitFog`). The fog plane and `uOccExt` were a fixed 700u, fine
  while the biggest city was 576 across — an 8×8 grid is 768 and a scaled plan can be far bigger,
  so anything past the edge had NO FOG AT ALL. Now `max(700, arena*2 + 140)`, mesh scaled to match.
- **⚠ THE WINDOW-BAY BUG** (`scaleBoxUV(geo,w,h,d,bay)` + `mat.userData.bay`). `B = 17` treated the
  whole facade texture as ONE 17u floor, but every window texture draws a GRID (commercial 4×4,
  residential 3×3, military 2×3) — so every storey in the game was ~0.8m tall and a one-storey
  farmhouse rendered as a four-storey apartment block. Each window material now declares the world
  height of its tile: commercial 68 · residential 51 · military 34 · industrial 30. Both copies of
  `scaleBoxUV` (citytiles + the flagship's local one in `_buildArena`) take it.
  ⚠ Consequence worth knowing: at 1:1 the tallest tower (150u) is now ~9 storeys / 28m. If you want
  real skyscrapers, raise the TOWER HEIGHTS — don't re-break the bay.
- **SCALE READS ACROSS THE POP LADDER.** City and Large City were both 5×5 and Mega City only 6×6,
  so the three tiers holding 96% of the sheet produced nearly identical maps (measured 17.1 / 17.0 /
  20.6 structural cells). `GRID_BY_POP` is now Village 2 · Small Town 3 · Town 4 · Small City 5 ·
  City 5 · Large City 6 · Mega City 8 → measured 1.0 / 2.7 / 14.7 / 18.5 / 17.2 / 21.6 / **47.7**.
- **THE COUNTRYSIDE IS A DIFFERENT FIGHT, not a city with fewer buildings** (`RURAL_POP`,
  `plan.rural`). What was wrong and is fixed: a village had **13 paved streets** (a farmhouse is
  `residential`, weight 2, and anything ≥2 got asphalt — rural now tops out at ONE metalled road,
  everything else is a dirt track) · **apartment towers in a hamlet** (residential variant 2 is
  towers-in-the-park; guarded in BOTH the base fill and `stamp()`) · **fields rendered near-black**
  (they were lit MeshStandard; crops are UNLIT decals now, like the lawns) · **streetlights and
  parked cars standing in ploughed fields** (both follow the ROAD GRAPH now — a lamp needs a
  metalled junction, a car parks on a real edge's kerb) · **no village at all on an even grid**
  (the old "centre cell becomes homes" rule tested `edge === 0`, which no cell satisfies when N is
  even — the village core, church and market are explicit `rural:'only'` PLACEMENT rows now).
  Farmland is strip fields with furrows, HEDGEROWS on the socket-open sides (the country's only
  chest-high cover), barn+silo+tractor+hay, orchard rows with a windpump, dry stone walls.
  ⚠ Farmland variants are a PATCHWORK keyed on position — rolled independently, three of four
  fields in a hamlet came up identical. Ref: `wwa-country.jpeg`.
- **NOTHING IS LANDLOCKED** (`buildRoads` → `plan.rescuedCells`): a structural cell with no road on
  any of its four sides is an unreachable building. Measured on 11 real cities before this; every
  such cell now gets an approach on its busiest side. Dead ends also get a real turning head
  (`junctionAt(...).deg === 1` → circle, not a square stub).
- **LIVE 3D** (`hud._liveOn/_liveOff/_liveRebuild` + `world.orbit` + `game.mapCam`): the map maker
  raises the REAL city behind the panel and hands you drag-orbit / shift-drag-pan / wheel-zoom.
  Every edit rebuilds, debounced ~90ms (a rebuild is 7–10ms). The panel becomes a left rail
  (`#hAtlas.live`), HUD chrome hides, and **quality is pinned to tier 2** — a rebuild is a slow
  frame, so the adaptive tier used to drop the tool to 0.72 pixel ratio the moment you used it.
  ⚠ `game.update`'s `!running` branch honours `mapCam` INSTEAD of `follow()`, or the view snaps back
  to the player every frame. ⚠ `setPointerCapture` throws if the pointer is already gone — always
  try/catch, camera drag must never throw into the frame loop.
- **THE TOOL VALIDATES** (`hud._validatePlan`, shown in the panel): landlocked cells, orphaned
  footprint refs, holes in a footprint, footprints running off the grid, cells with no sockets.
  These are the SAME assertions the headless sweep runs, so the panel and the test cannot disagree.
  Verified 3,150 plans (1,050 cities × 3 seeds): **0 problems**.
- **POP-TYPE OVERRIDE** is the control that makes the countryside reachable at all — the sheet has
  exactly **1 Village and 16 Small Towns out of 1,050**, so rural content was effectively dead.
  `generatePlan(city, seed, {popType})` builds any row of the sheet at any size.
- ⚠ **`galleryPlan` must be a REAL plan.** It handed back bare cells with no sockets and no road
  graph, so socket-aware tiles behaved differently on the bench than in a city — and the first tile
  to read `cell.edge` without a guard threw and took the whole build down. It calls
  `computeSockets` + `buildRoads` now, and builders still guard (`cell && cell.edge && cell.nb`).
  ⚠ It also SIZES ITSELF to the library (`N = ceil(sqrt(types+1))+1`) — it was a fixed 5×5, so the
  moment the library passed 20 tiles the newest ones silently never appeared on the bench.

## JUNCTIONS · LANDMARKS · TERRAIN · THE WILD (2026-07-23)
- **JUNCTIONS HAVE GRAMMAR** (`world._buildJunction`, driven by `junctionAt().deg` + arm classes):
  deg 1 = turning head · deg 2+ = patch + CORNER FILLETS (a quarter disc per corner — the single
  detail that stops a crossing reading as two ribbons overlapping) + CROSSWALKS and a STOP LINE on
  every metalled arm. All road paint merges into ONE unlit mesh (`_roadPaintMat`, `renderOrder 2`).
  ⚠ Crosswalk bars must be WIDE and CLOSE (3.4u bar / 5.6u pitch) — thin bars with big gaps read as
  litter scattered down the road, not as a crossing.
- **ROUNDABOUTS ARE A PLANNER DECISION, not a geometry rule** (`plan.roundabouts`). The first pass
  built one wherever an arterial met anything — on a city with a highway ring that was NINETEEN, and
  the ribbons ran straight through every island. The planner now picks at most 1–2 at the genuinely
  busiest crossings (never within 3 cells of each other), and `_buildRoadNet` TRIMS the feeding
  ribbons back to `roundR(w)`. The island is real cover with a monument on it.
- **DIRT TRACKS MEANDER** (`ribbon()`, class 1 only): the ribbon is bent in its own local X before
  it is rotated into place. Costs nothing, and it is what makes the countryside and the forest stop
  looking like a street grid with the paint scraped off.
- **LANDMARKS — the special-structure system** (`data/landmarks.js`). Stadium/airport/railyard used
  to be fixed PLACEMENT rows, so every big city got one of each in the same spot with no name: that
  is furniture, not a landmark. Now: a **budget** derived from the city's own row (population tier,
  how many specialisations, popRating, hvt → 0 for a hamlet, 4–5 for a mega city); a **weighted
  pool** gated by `needs` (a capital is eligible for a palace, a shrine city for a great religious
  building); and a **name** generated per city. The REGION picks the FORM — one "great religious
  building" slot builds a gothic cathedral in Oslo, a domed mosque in Kabul (`THE KABUL JAMI`), a
  pagoda in Tokyo (`THE TOKYO SHRINE`), a mandir in Mumbai. `cell.lname` rides on the anchor and
  `districtNameAt` resolves `ref` cells through it, so the whole footprint reports ONE place and the
  news desk can say "the fighting has reached THE SPIRE OF TOKYO".
  ⚠ Landmarks are placed BEFORE the PLACEMENT table so they get first pick of the ground.
  Measured over 1,050 cities: 2 landmarks is the mode, monument 63% · tower 41% · stadium 35%.
  New tiles: `monument` (arch/column/obelisk/figure) · `tower` (210–250u — deliberately far above
  the 150u tower ceiling; a landmark you can't see from across the map isn't one) · `cathedral` ·
  `palace` (1×2) · `fortress` (2×2, ramparts you fight on) · `university` (1×2 quad).
- **THE LAND IS NOT A TABLE** (`plan.relief`, `world._buildRelief` + `_padCells`). Value-noise
  relief (`flat·hills·valley·plateau·coastal·mountains`, amp 0–54) is raised BEFORE any tile, then
  every BUILT-UP cell is levelled to its own terrace with a generous apron (`K*0.42` — too tight and
  every block stands on a visible earth plinth). Tiles then sit on what they find via `ctx.gy`.
  ⚠ `co.top` is the ABSOLUTE height physics compares a fighter's world y against, so it must include
  the ground the building stands on. `reg()` reads `mesh.userData.gy` for the same reason.
  ⚠ `_ghBase` must be frozen BEFORE the pending pits/cuts run — `crater()` clamps to ±a few units
  around it, so digging the first mine into a hillside would otherwise clamp the whole hill to ~0.
  ⚠ THE SEA NEEDS A BED: relief ran straight through the water plane, so a coastal city had the sea
  running over a ridge. Everything seaward of the quay is pushed below the waterline with a shore
  apron, and `reliefFor` softens mountains/valley → coastal for ANY city with water (override included).
  ⚠ Anything placed at a hard `y = 0` floats or sinks the moment relief exists — trees, lawn decals,
  streetlights and parked cars all sample `heightAt` now. Verified: 58/58 towers sit at exactly
  their terrace height, worst tree float 0.000u, 0 fighters spawn below ground.
- **THE WILD** (`forest` 3 variants incl. jungle, `mountain` 2): a forest is not a park with more
  trees — a park is open ground you see across, a forest is where SIGHTLINES DIE. Soft cover
  everywhere (trunks), rare hard cover (boulders, fallen giants), undergrowth in jungle, and a
  **meandering PATH** built from a wobbled polyline that trees are excluded from — the only fast
  ground, and it curves so you never see far down it. `mountain` is rock outcrops and scree.
  ⚠ WILD GROUND IS NOT LANDLOCKED: the rescue that guarantees every BUILDING an approach was paving
  a street to every patch of forest and field. `NO_RESCUE` skips water/forest/mountain/farmland/
  park/plaza. An all-woods map now has 0 roads, 0 lamps, 0 parked cars.
  ⚠ A forest FLOOR is leaf litter in shade — tinted too far toward the region's greenery it came out
  as bright meadow with trees standing on it.
- **`data/geography.js` — TERRAIN IS AUTHORED, AND SAYS SO.** The sheet has no terrain column and no
  coordinates (the sector reference is blank on half the rows and encodes a grid square, not a
  landform), so there is nothing to derive it from. Rather than rewrite 1,050 rows Robert didn't
  enter, terrain/biome live in their own file and are JOINED in `cityList()` — same pattern as hero
  identities. Resolution: named city (Denver, Manaus, La Paz…) → country (142 of them) → region
  fallback. Measured spread: relief hills 373 / flat 316 / mountains 171 / plateau 120 / coastal 70;
  biome forest 379 / grass 278 / jungle 185 / desert 182 / mountain 25 / tundra 1.
  Refs: `wwa-terrain.jpeg`, `wwa-forest.jpeg`, `landmarks.jpeg`, `junctions.jpeg`.

## SIZE TIERS (2026-07-24) — the same structure at the right scale
- **`TILE_SIZES`** (cityplan.js): a ladder per type — `{ f:[rows,cols], n:'FISHING WHARF', tier }`,
  smallest first. A port is a wharf in a small town and a container terminal in a mega city: the
  same TYPE at a different SCALE, not two tiles. 14 types, 35 rungs, all verified to build.
  `TILE_FOOT` is now DERIVED from the ladder (the middle rung) so every pre-existing caller and the
  editor's plain paint still work.
- **`sizeFor(t, popTier, rng, N, want)`** takes the biggest rung earned that fits, with a 30% chance
  of dropping one rung (variety). ⚠ LANDMARKS pass `rng = null` to skip that roll — the thing a
  city is KNOWN for is never the small version. If the size won't fit, `place()` steps DOWN the
  ladder rather than dropping the structure: a crowded map gives you a small port, not no port.
- **The builder does the work** — it is handed `ctx.W`/`ctx.D` for the whole footprint and sizes its
  contents. A bigger hospital grows WINGS not height; a bigger company site grows MORE TOWERS; a
  bigger military compound earns a runway and hangars; a port gets a berth+crane per ~78u of
  frontage. ⚠ Only 9 of 28 builders read the footprint — giving a type a ladder means making its
  builder adaptive FIRST, or the big version is just the small one in a bigger empty lot.
- **⚠ `NO_ROTATE`**: some footprints have a meaningful orientation. A port runs ALONG the shore —
  rotated, a 3×1 quay becomes a 1×3 pier sticking three blocks inland.
- **⚠ `rural: 'ok'`** on a PLACEMENT row lets it through the rural gate. A coastal village IS a
  fishing village; without it the gate silently denied it the one thing it is defined by.
- **`cell.sname`** carries the size name and `districtNameAt` cites it, so the news desk says
  THE CONTAINER TERMINAL rather than THE DOCKLANDS. Editor: a SIZE row appears under the palette
  for types that have a ladder, and shows nothing for types that don't (a control that lies is
  worse than no control). Ref: `wwa-portsizes.jpeg`.
- **⚠ THE VALIDATOR AND THE GENERATOR MUST SHARE ONE RULE.** `NO_RESCUE` is exported from cityplan
  and imported by `hud._validatePlan`. When they drifted, the tool reported 32 "landlocked" cells
  that were open country behaving exactly as designed. Export the rule; never reimplement it.

## ATLAS v1 — THE TOOL STANDS ALONE (2026-07-24) — read docs/ATLAS_FORMAT.md
- **`/atlas.html` is the standalone map tool** (second vite input; `base:'./'` untouched). The
  editor lives in `engine/atlasUI.js` — ONE module, two mounts (in-game screen passes `game` +
  hooks; solo page is always-live with file EXPORT/IMPORT). Overlay primitives + atlas CSS moved
  to `src/styles/overlays.css` + `tokens.css`, LINKED by both pages — moved, never copied.
  `validatePlan` moved to cityplan.js (one rule, imported everywhere). `LSW.hud._validatePlan`
  still works (alias). Solo handle: `window.ATLAS = { world, ui, BANDS }`.
- **THE METRIC CONTRACT** (`plan.metric.humanH` 4.8–19.2, default 9.6): `door()` in citytiles
  builds six entrance kinds (swing/double/slide/revolve/roller/turnstile) on every inhabited
  builder's authored front, sized ×M NEVER ×S; window bay, lamps and cars ride M too (lamps/cars
  used to ride S — a 240u-cell city had 80u lamp posts). Registered in `world.doors`.
- **THE LAYER CONTRACT**: `TILE_MAX_H` (cityplan) declares every type's max height; `tower()`
  clamps to `ctx.maxH`; `plan.bands` derives from placed types + relief → GROUND/BUILDING/SKY/
  CEILING (+ shallows/depths). Runtime face in **core/util.js** (`BANDS`/`setBands`/`bandOf` —
  entity re-exports; world can't import entity, entity imports world). Flight lid =
  `BANDS.ceiling` per city. Flagship = 158/268/328. Validator flags undeclared types.
- **THE DEEP**: water cells carry `d` 1 SHALLOWS(−8) · 2 DEEP(−22) · 3 TRENCH(−44, ×scale);
  `_computeWaterGrid` runs FIRST in `_buildGenCity` (quay, surface, bathymetry all read it);
  `_buildBathymetry` digs the bed (flat cities too — the old push lived inside `_buildRelief`
  and skipped them). `waterAt(x,z)` is plan-aware (painted lakes count; flagship keeps legacy);
  `waterDepthAt` is the continuous query. Surface = one merged depth-tinted wave shader
  (`_buildWaterSurface`) — near-black over the trench. `game.splash()` (rings+spray+
  `audio.splash`); ragdolls splash ON SURFACE-CROSSING (a chest RESTS at its own radius —
  a depth test can never fire on the flagship's y=0 bed) then drag underwater.
- **FOREST v2**: trails are the EXCEPTION (jungle cuts one only off a street socket); tree spots
  carry a KIND (1 emergent giant / 2 understory) → real layered canopy, jungle 3.3× woodland
  density. **CANOPY CUTAWAY** in `updateOcclusion`: canopies in the camera→player corridor scale
  away (trunks stay), per-instance lerp, ≤160 matrix writes/frame. Visual only — fog/AI honesty
  untouched. Measured 0.039ms.
- **THE FUNFAIR**: type + ladder (FAIRGROUND 1×1 / AMUSEMENT PARK 2×2), landmark pool entry for
  resort cities (THE {C} WONDER WHEEL). The wheel is in `world._spinners`, ticked in render().
- **CLIMATE** (`data/climate.js`, authored join like geography): Köppen + lat per country
  (all 144) + ~120 city overrides; cosine year model → `climateOf(city)` = zone/label/t[12]/
  snowMonths; `climateLine` on the atlas card. Games render weather; ATLAS only KNOWS.
- **INTERIORS v1**: `floorplan()` (cityplan, pure BSP, one doorway per cut → every room reachable
  by construction). Residential v0 = four ENTERABLE bungalows (`bungalow()` in citytiles): shell
  with a real opening, interior walls, standable roof, M-scaled ceiling. Walls live in
  `world.interiors` (NEVER ordinary cover) and every system consults them SPATIALLY: entity
  physics (door gaps pass, ceiling clamps), `canSee` (⚠ the aabb gate must pass when either
  endpoint is INSIDE — `_segBox` only detects crossings, and both-inside is the corner-warfare
  case), fog raster, `hitInteriorWall` for projectiles, ragdoll drape, and the interior CUTAWAY
  (shell+roof fade when the player is inside; interior walls stay solid). ATLAS ROOMS dial.
  ⚠ Known gaps, deliberate: bots don't navigate doorways (interiors carry `doorways` points for
  that session); beams ignore interior walls.
- ⚠ **Vite HMR version-stamps modules** — a console `import('/src/core/util.js')` can be a
  SECOND phantom instance; verify module state through the page's own graph (ATLAS.BANDS).
- ⚠ **A hidden browser pane renders at 0×0 and skews any measurement that includes render** —
  stub `world.render` for sim-only numbers (2.05ms/frame, 9×9 + 28 interiors + rumble).
- ⚠ Never `git add -A` in this repo — name the files (a stray abilities.js draft got swept into
  a commit and had to be pulled back out).
- **THE BROADCAST ENCODE LAW (2026-07-24, "blocking freezes the game")**: the news crew's
  `_capture` called `canvas.toDataURL('image/jpeg')` SYNCHRONOUSLY per captured frame — a
  main-thread JPEG encode inside the sim frame, at up to 20fps, for as long as highlight()
  kept extending the recorder (a blocked beam kept it hot indefinitely) — and the record clock
  was a `while` that BURST-captured to catch up after any stall, so one spike became a freeze
  train. Fixed in newscrew.js: `_captureFrame` renders the POV into the live PiP canvas then
  hands a POOLED COPY to async `toBlob` (frame slot holds a '#enc…' token until the blob lands,
  written back by token so pre-roll shifts / clip shedding can't mis-file); ONE capture per sim
  frame with a clamped accumulator; `world._ema` guards (skip capture ≥34ms, preroll ≥30ms);
  the news camera's shaders warm ONCE at match start (its POV compiles programs the main camera
  never used). Object URLs are revoked at reset and when clips shed. The TV and cold open skip
  '#'-token frames (drawImage of an incomplete Image is a spec-level no-op). Never put a sync
  encode or an uncapped catch-up loop in the frame path again.

## THE OPENING DIRECTOR (2026-07-24) — ten cinematic cold-opens
- **`engine/opening.js` — `playOpening(game, hud, plan, opts, onDone)`**, wired in `main.beginMatch`
  behind `SETTINGS.opening` (Options → MATCH OPENING: CINEMATIC / QUICK CARD / OFF; training keeps
  the holo card, tutorial/net stay quick). Every real match cold-opens country → city → ONE OF TEN
  variants (`OPENING_NAMES`): casefile (typed registry query + TOP SECRET card) · broadcast (KMK 9
  monitor replaying YOUR previous match's clips — beginMatch hands `news.clips` to
  `game._openingClips` BEFORE startMode wipes them; no footage → SMPTE bars with the violet bar
  swapped to slate) · flyover (skyline descent to spawn, live district readout) · teletype ·
  ladder (the six-rung response ladder with dead rungs struck — reads `ladderGatesFor`, now
  EXPORTED pure from police.js and shared by the dispatcher's `_has*`) · satellite · tape
  (vs-card, falls back to casefile when no rival) · siren (vigilantism stance) · freeze (hero
  shot, frustum eases 46→20) · ledger (Elo book). Everything reads live data (sheets, book,
  LeFevre, climate, clips) so it can never lie.
- **Mechanics**: camera rides `game.mapCam` (the map-tool channel) with `game.running=false`;
  `finish()` restores `wasRunning`, clears mapCam, revokes `_openingClips` blob URLs; ANY
  key/pointer skips (F12 exempt); `audio.keystroke()` ticks under the typers. **The director
  ticks `_animate` (+`_sync`) on living fighters each step** — with the sim held nothing else
  animates, and an un-ticked figure stands in its raw construction pose (Robert saw the crazy
  arm). **Singleton**: a new director retires a live one through `el._finish` (rematch spam,
  tests), and the broadcast TV interval self-clears if its canvas is detached.
- **Testable by construction**: `playOpening(..., { manual: true, variant: i })` never touches
  rAF — step it by hand (`op.step(0.1)` until `op.done`). Verified: all 10 variants manual-clean
  (overlay removed, running/mapCam restored, 0 errors), real-time run clean, skip works.
  `LSW.playOpening` exposed. Ref: `lsw-opening-freeze.jpeg`.

## THE CLINCH (2026-07-26) — martial arts + wrestling, `data/martial.js`, docs/THE_CLINCH.md
- **THE INVERSION IS THE WHOLE GAME**: the jab reaches FURTHEST (11u) and the power punch LEAST
  (7u), cross 9u. It was 13u jab vs a 13.5u haymaker, so stepping in cost nothing and there was no
  spacing decision at all. Measured live: jab connects to 10.5u, power to 6.5u.
- **`data/martial.js` is the table** — reach, frames, step-in, 8 STYLES, 4 clinch POSITIONS + their
  four-option wheels, the struggle window, SUBMISSIONS. melee.js reads it; nothing hard-codes reach.
- **THE STEP-IN COMES OFF THE TABLE**: `step` is a DISTANCE, `STEP_IMPULSE = 8` converts it to the
  physics impulse (calibrated so jab 2.0×8 = the 16 melee.js used to hard-code — feel unchanged).
  Measured travel jab 0.5u · cross 2.46u · power 5.14u → effective threat 11 / 11.5 / 12.1: reach
  inverts, COMMITMENT buys it back.
- ⚠ **THE STRUGGLE CURVE SQUARES THE RANK RATIO** — his spec states two figures a linear ratio
  cannot both satisfy ("~1.4s at even rank" AND "rank-40 clinching rank-79 gets under half a
  second"; linear = 0.71s). Squared gives 1.40s / **0.36s**. Flagged as a reconciliation of his own
  two numbers, not a silent change.
- **THE SPACING RINGS** (Options → Spacing Rings, OFF by default): three ground rings at the three
  reaches + a faint fill inside power reach. Drawn at the reach the ENGINE uses, from the same
  table melee.js reads. Dim on cooldown. Not a wallhack — it shows YOUR reach. New shared decal
  rung `GROUND_LAYER.spacing = 1.15` (never invent your own number — the surface law).
- ⚠ **DRIVE THE GATE, DON'T WRITE PAST IT** (three harness bugs, four failed attempts):
  `entities[1]` is the KMK 9 CAMERA OPERATOR, not the opponent (pick by TEAM) · `facing` is a
  DAMPED yaw so setting it once does nothing · **`coneFoe` reads `caster.aim` and `controlPlayer`
  rewrites aim from the mouse EVERY FRAME**, after the test wrote it and before the hit test read
  it — use `game.controlPlayer`, the documented override. And pin both bodies to ABSOLUTE
  positions: holding the foe at `player.x + gap` lets the step-in smear reach 8u long.
  The suite proves ITSELF first (a point-blank jab must land) — 22 checks, 0 failures.

## A WORLD DECLARES WHETHER IT HAS AIR AND LIFE (2026-07-26) — docs/THE_MAP_MAKER.md
- Robert on TRANQUILITY REACH, a town on the Moon with oaks, lawns, hay bales, birds and blown
  litter: *"this the moon i thought we fixed this permanetly"*. **It had only ever been fixed in the
  SKY** — `sky.airless` tinted the sun and nothing else in the pipeline knew it was in a vacuum. A
  settlement is a city row through the same planner and a city row has always meant Earth; the
  Moon's row even declared `biome: 'tundra'`, an EARTH biome, so the generator grew a forest
  because that is what it was asked for.
- **`worldEnv(id)` (data/planets.js) DERIVES both facts** — no per-planet special case. `air` = the
  atmosphere already in `PLANET_LOOK` · `life` = a native biosphere (Earth alone for now; terraform
  later = one flag). **Mars has air and no life, so Mars gets blown dust and no birds.**
- Rides on the plan (`plan.world/biosphere/atmosphere`, both default TRUE → the 1,050 cities and
  the flagship are untouched). Four consumers: **zoning** (park/forest/farmland struck to plaza
  BEFORE computeSockets, `plan.rural` false) · **`world._buildGreenery`** (⚠ striking the zoning is
  NOT enough — trees are appended by TILE BUILDERS, so an ordinary residential block still plants
  street trees; this is the line that makes it barren) · **wildlife** (birds need life, litter needs
  wind) · **pedestrians** (`_reseed` swaps the palette in place for pressure suits + gold visor —
  same mesh, same count, no branch in the walk cycle).
- ⚠ **`_applyCounts` is the ONE place that decides bird/litter counts** — the quality tier and the
  world both have an opinion, and while `setQuality` owned `nBirds` outright a tier change on the
  Moon silently repopulated the sky.
- Measured: Earth 64 birds/40 litter/greenery · **Moon 0/0/none, 0 green cells** · Mars 0/40.
  Ref `wwa-moon-after.png`. ⚠ Still Earth-flavoured and deliberately left: the ambulance and the
  market stalls — props, not biology, and they want their own pass.

## THE CLIMATE OF THE WORLD (2026-07-26) — `data/relations.js`, docs/THE_CLIMATE.md
- Robert's 168x168 matrix, baked. Three sheets stack now: cities = WHERE a fight happens ·
  countries = WHAT THE STATE IS LIKE · **relations = WHO THAT STATE CAN STAND**.
- **Verified, not assumed**: 0 asymmetric pairs, diagonal blank, all values 1-5, and it joins the
  country sheet **168 of 168** — the only sheet here needing no fallback (`relationOf` still returns
  null for an unknown name). Encoding = one 168-char digit string per country; a lookup is two map
  hits and a charCodeAt. Stored WHOLE despite the symmetry — triangle indexing is a bug farm.
- **THE SPLIT IS DERIVED**: `factionSplit()` counts the rows → **United Front 88 / Collective 80**,
  exactly his numbers, and it can never drift from the matrix it sits beside.
- **Exactly ELEVEN pairs at 5 in the world** (US+Canada/UK/Japan/South Korea/Australia,
  China+Russia/Iran/Pakistan/Brazil, Belarus+Russia, France+Germany). That scarcity is the point.
- ⚠ **THE JOIN GAP IT EXPOSED**, now fixed by `COUNTRY_ALIAS`/`canonCountry` in **countries.js**
  (the base layer — put new aliases THERE, never in a caller): `USA` on 20-odd hero identities ·
  **`DR Congo` on the cities sheet, so KINSHASA (17M people) had NO country row at all** — no police
  competence, no vigilantism law, no integrity, and that one PREDATES this work · `Faroe Islands`.
- ⚠ **The identity field is `co`, not `country`** (`{n, c, co, f}`; `c` is the CITY). Reading
  `person.country` compiles, runs, and gives undefined — every career silently had no homeland and
  received zero government contracts. My test had the same bug, which is why it read as a code fault.
- **THE GOVERNMENT CONTRACT** (career.js `POSTURES`) — the payoff he named. Home = the firm's country
  else the fighter's own. The standing picks the job: 1 DENIABLE OPERATION (purse ×2.15, renown ×0.35,
  `govFlagged` preloads police heat so you START wanted) · 2 INTERDICTION · 3 OBSERVATION ·
  4 JOINT OPERATION · 5 MUTUAL DEFENSE. The pay curve is **V-shaped** on purpose — a state pays most
  to send you where it cannot officially go — so money and safety pull opposite ways.
- ⚠ **ROULETTE, NOT "TAKE THE MOST EXTREME."** Sorting candidates by distance-from-neutral and
  picking the top 3 made **33 of 48** contracts DENIABLE — the rung with the most to say became the
  default, which is how you make it mean nothing. Weighted sampling (`1 + |3-v|`) gives the measured
  spread over 200 career-weeks: deniable 30% · interdiction 29% · observation 21% · defense 14% ·
  joint 7%. Console: `relations` · `relations Uganda` · `relations Israel / Iran`.

## THE SUNDIAL (2026-07-26) — the hanging dial
- His brief: *"a upside down needle that points to sun and moon and Noon/Midnight, and it should
  show the days and time."* An INVERTED dial — the gnomon hangs off the top edge, the hours arc
  below it. Needle = `world.dayT` (the same clock the sky/news bug/peds run on), date = `gameDate()`
  (the calendar the planets orbit on), moon exactly opposite the sun and dimmed when under. Nothing
  keeps its own time, so the dial and the sky cannot disagree. Options → Sundial.
- ⚠ Built ONCE; the frame loop writes three transforms and two opacities, and the text only
  rewrites when the displayed MINUTE turns. Never innerHTML in the frame path.
- ⚠ **An unscoped rule at the top of `PHONE_CSS` hid it on every device** — check what a stylesheet
  block is SCOPED to (`body.phone`), not just which file it is in. Same family as the DECK_CSS bug.
- ⚠ **The font family is `ComicSFX`, not `Bangers`** — comic.css declares faces under ROLE names
  (ComicLetter/ComicSFX/ComicHeavy), so `'Bangers'` fell back to Rajdhani and looked almost right.
- ⚠ The top centre was already the score bar's; the bar yields (`#hud.hassun`). Ref `wwa-sundial.png`.

## THE BEAM ANATOMY + THE VISUAL BUG SWEEP (2026-07-26) — manual §39
- **THE BULLETS NEVER DISAPPEARED**, and it was one line. `Projectile._impact()`'s ballistic branch
  (the one that stops a bullet exploding) was an early `return false`, which skips the
  `_dispose(game)` at the bottom that every other impact path reaches. Spliced out of the update
  list, mesh left in the scene FOREVER, frozen at head height. Measured **177 orphaned slug+tracer
  pairs after 105s of one gunfight**; scene children 262 → 86. ⚠ An early return inside a disposal
  path is a leak waiting to happen — the regression guard asserts nothing leaves the projectile
  list with `dead` still false.
- **THE ROADS**: all four classes draped to the SAME height → coplanar at gap 0 at every junction,
  depth decided by luck. They stay coplanar (a step in the junction would be worse); the tie is
  broken by RULE — `sinkSurface` by class, so the heavier road runs continuously through the
  lighter one. Road meshes are NAMED now (an audit reporting "BufferGeometry vs BufferGeometry" is
  half an audit).
- ⚠ **The scorch decal had two defects in one line**: it invented its own 0.4cm ladder instead of a
  `GROUND_LAYER` rung, and indexed on `scorches.length` — a pool CAPPED at 40, so every scorch past
  the fortieth landed at an identical height and z-fought. A long fight is when you have the most.
- **`auditSurfaces` declares its blind spot** instead of crying wolf: the arena border is 96 verts
  spanning 483×483 and that one bounding box was **95 of 98** reported problems. Untestable meshes
  are counted and named. Real problems on a generated city 103 → 79 (rest = interpenetrating tree
  canopies, the documented second blind spot).
- **THE BEAM ANATOMY — two axes.** His memory was right on both counts: a beam IS an outer sheath
  (`color`) around a bright inner core (`color2`), and VEGA's spiral has always been there. What was
  missing: **25 beams, one form.** SOL's Heat Ray and VANGUARD's Eye Beam were the same beam in two
  colours; six ultimates were all a radius-3.4 white-cored hose.
  **BUILD** (from radius) `ray · hose · torrent` × **TEMPER** (from material) `steady · helix ·
  kink · roil · crystal · sinuous · surge · churn`. 11 combinations in use, largest bucket 6.
  ⚠ Seven hand-picked buckets first put 11 of 25 in one — the ladder-from-the-distribution law
  again (fifth time). Two multiplying axes beat one list of shapes.
  ⚠ **ONE instanced detail layer serves every temper** — generalised from VEGA's hard-coded 26-orb
  helix, so eight behaviours cost one draw call; `n: 0` builds nothing.
  ⚠ `air` had to stop sharing SURGE with `light` — a wave cannon and a photon stream are not doing
  the same thing, and lumping them put 10 of 25 in one bucket. Ref `wwa-beam-language.png`.
- **THE VISUAL LANGUAGE screen** (`hud.showVisual()`, How-to → ◈): leads with THE CATEGORIES, says
  what each is for, then writes all 52 kits (364 abilities) in them. A vocabulary word nothing uses
  renders dashed and dim (3 currently: stone, stun, root). Ref `wwa-visual-language.png`.
- **WHAT NOBODY CARRIES** (he asked directly, and the screen reports it live): **92 of 102** ORIGIN
  catalog powers · **35 of 35** armory weapons and items · **18 ability TYPES the engine fully
  implements that no hero uses** (weather, size, timefield, duplicate, possess, elastic, invisible,
  wallcrawl, telekinesis, reshape, consume, mimic, mount, dome, vision, regen, banish, gravity).
- ⚠ `CodexMixin` in hudCodex.js is an **object literal, not a class** — a new method needs a
  trailing COMMA. Same shape as `roads.js`.
- ⚠ **THE LAST-KNOWN GHOST STACKED.** `_lastKnown` is edge-triggered (seen → unseen), which sounds
  like once — but `see` is recomputed from LOS every frame, so a foe at the edge of a wall or the
  vision cone FLICKERS, and every flicker spawned a whole ghost: a mesh, two materials, and another
  '?' sprite on top of the last one. Measured **40 live ghosts** in one 90s fight once the police
  arrived. Debounced to one per fighter per 1.2s → 2. Edge-triggered is not the same as once.

## HANDOFF
- **`HANDOFF.md` at the repo root** is the orientation document: architecture, the ten rules that
  are load-bearing, what is solid, what is half-built, what to do next, and the headless
  verification recipes. Read it before `CLAUDE.md` if you are new — or if you are me with no memory
  of today. Keep it current when a pillar moves.

## THE COUNTRY SHEET — the state behind the city (2026-07-23)
- `data/countries.js` — **168 nations, 25 fields**, baked from Robert's Country Master Sheet. The
  cities sheet says WHERE a fight happens; this says **what the state is like when it does**.
  Join with `countryOf(city.country)` — ⚠ returns `null` for countries the sheet lacks, so every
  caller MUST fall back.
- Live now: **police response** reads `lawEnforcement` (competence), `lawBudget` (coverage) and
  `integrity` on top of the city's safety index. Measured ETAs — Tokyo **4.0s** · Hell, Norway
  **4.0s** · Mexico City **14.9s** · Mogadishu **15.7s** · Kabul **21.0s**. A low-integrity state
  also just **doesn't answer** some calls (Kabul 25.6%, Tokyo 0%) — rolled ONCE per dispatch so
  it's a quiet minute, not flickering sirens.
- **⚠ `integrity` is HIGH = CLEAN.** The sheet's column is named `GovermentCorruption` but the
  values are an integrity index (Norway 85, Japan 76, Mexico 34, Somalia 20) — i.e. CPI-style.
  I read it backwards first and made Norway the crooked one. The field is renamed in the bake
  specifically so nobody repeats that.
- **THE MILITARY TIER — `milBudget`/`milService` are LIVE now** (2026-07-23). The wanted ladder
  runs ★ beat cops (heat 35) → ★★ patrol backup (90) → ★★★ TACTICAL/SWAT (160) → **★★★★ the
  MILITARY (240)**, and the top rung EXISTS ONLY where the state has an army to send:
  `police._hasMilitary()` = `milBudget >= 52 || milService >= 60` (median milBudget ~41; USA/Japan
  ~85, Somalia 25). A lawless country tops out at SWAT and just keeps sending them — that
  difference is the payoff. `GUARD_DEF` in police.js: 145hp, `armor: 8`, `body: 'metal'`, an
  assault rifle + a rifle-grenade, deployed 4 at a time; the escalation announces
  "THE MILITARY IS DEPLOYING" and the news runs it at priority 3. ⚠ Adding the 4th tier exposed a
  latent `'☆'.repeat(3 - lvl)` in `hud.js` (→ `.repeat(-1)` RangeError every frame at ★★★★) — the
  wanted display now caps at 4 and shows a 🪖 MARTIAL row.
- **ATTACKING THE POLICE ESCALATES HARD** (Robert's ruling): `onCopDown` JUMPS you to at least the
  next star + compounds per badge (`_copsKilled * 18`); `onCopHurt(src, amount)` (hooked in
  `game.onHit` for any hit on a `def.police` target) books `amount * 0.55` heat and pulls
  reinforcements in. Both OVERRIDE a corrupt "unanswered" call — a bought state ignores a civilian
  call but never its own officers being shot. Verified: a cop kill at heat 50 → 118 (past ★).
- **VIGILANTISM is now genuinely tri-modal** (`data/pedestrians.js`, `setVigilantism`): **Legal** —
  a sanctioned Ascendant, NOBODY draws, and a CLEAN rival KO by the human player earns a CROWD
  CHEER (`peds.cheer`, hooked in handleKO when `heatOf(killer) < 8`). **Regulated** — neutral, they
  film, and draw ONLY when the violence is CLOSE (`d2 < 320`, ~18u — personally threatened).
  **Banned** — you're a criminal on sight, they draw from across the street and every phone is
  evidence. **CROWD CONTAGION**: `_embolden` (a drawn weapon rallies the block, ×draw-chance) and
  `_panic` (a fresh corpse — especially an armed one — collapses bravado and scatters them). Both
  decay to calm. Verified: Regulated-far 0 armed, Regulated-close 3, Banned-close 9, Legal 0.
- Still authored and waiting: `mediaFreedom` (what KMK 9 may broadcast), `lswActivity`/`lswRegs`
  (registration status), `terrorism`, `science`, `cloning`, `capitalPunishment`, plus `motto`,
  `demonym`, `leaderTitle` and the named head of state for the news desk and the codex.
- ⚠ **`_teardownCity` used to leak materials.** It disposed geometry only, so every rebuild
  orphaned a ground/wall/water/quay/lamp material plus ONE crack-overlay material per building.
  Rebuilding 7 cities took a soak from 6.4ms to 48.6ms/frame. It now disposes per-city materials
  while explicitly PRESERVING the shared caches (`_tileMats`, `_winMats`, `_lampMat`, `_carPaints`).
  Verified: 10 consecutive rebuilds move geometries 264→273 and textures 25→27.

## THE MOVEMENT KITS (2026-07-24) — grapnel · glider · flash pace
- **`grapple` type** (abilities.js): ray vs cover faces; TOP QUARTER of the face → reel (90u/s,
  `burstT` lifts move()'s clamp — the dash gotcha) and MANTLE the roof; lower → **LEDGE HANG**
  (`f.hanging` = cling point). Hanging: no move/strike/guard/grab; ONLY `oneHand: true` defs fire
  (runSlot gate + feed line); release = jump (pop 30) · descend · kb>14 hit · re-press (all via
  `releaseHang()`, the ONE path). Reel+hang suspend the deck servo like `launchT`. Gold line mesh
  hand→anchor (lazy, disposed with the fighter). ⚠ mantle needs the LINE to reach — tall towers
  are hang-then-refire by design. Carriers: KNIGHTFALL `f` (Grapnel Line, replaced Contingency) +
  ORIGIN gear power `grapnel`. Bots don't fire it yet (player-tech; noted).
- **`def.glider`** (entity gravity branch): falling + ascend held → fall clamps −8, air control
  ×1.4 (move), `_flyPose`/wind-lines engage (cape reads as wings). Folds on landing/descend.
  Carriers: KNIGHTFALL + ORIGIN gift `glider`.
- **`def.meleePace`** (melee.strike): strikeActive + strikeCd ÷ pace; PUNISH FLOORS unscaled
  (blocked speedster = punishable — or pace beats the trifecta). VOLT 1.5 (measured 1.46× jab
  cadence) + ORIGIN gift `quickhands` 1.35. AI-vs-AI: VOLT vs FERAL 0-0/0-2 — feel, not win-rate.
- `oneHand: true` marked on: KNIGHTFALL batarangs + Smoke Vanish + grapnel · COP Service Pistol ·
  FED Sidearm. Manual §8 documents all three (same commit — the manual law).

## THE SIX-RUNG RESPONSE + THE STREET'S VOICE (2026-07-24)
- **THE LADDER RUNS TO SIX** (police.js): ★35 beat cops → ★★90 patrol → ★★★160 SWAT →
  **★★★★240 THE FEDS** (`FED_DEF` — black suits, automatic rifle + sidearm, armor 4, arriving in
  a BLACK SUBURBAN: all-black shared paint `w._fedMat`, taller body scale, low-profile dash
  strobes instead of a roof bar) → **★★★★★340 MILITARY** → **★★★★★★460 A SANCTIONED LSW**.
  Every top rung is GATED by the country sheet and the ladder TOPS OUT where the state runs dry:
  `_hasFeds` (intelBudget ≥45 or lawBudget ≥62) · `_hasMilitary` (unchanged) · `_hasSanctioned`
  (`lswRegs !== 'Banned' && lswActivity ≥ 40` — the lsw fields' payoff). Somalia at heat 999 is
  still ★★★ SWAT forever; NYC runs the whole board. `_country()` caches the row per theater.
- **THE SANCTIONED RESPONDER** (`_deploySanctioned`): one REGISTERED hero from the ROSTER
  (imported from data/characters — no cycle), picked deterministically per city (name-seeded)
  from a threat pool leveled by CITY SAFETY (safe ≥60 → Very High/Extreme/Cosmic · ≥35 →
  High/Very High · else Moderate/High), spawned `police: true` (never books Elo), fixated like
  any badge, ai.level 1.6, one per flag cycle (`_lswSent`, reset on stand-down). Verified: NYC
  at ★★★★★★ deployed AURUM alongside the Guard.
- **onCopDown jump table** extended for the new rungs (…<340→352, <460→472). HUD wanted row:
  ⚡ SANCTIONED ★×6 · 🪖 MARTIAL ★×5 · 🕶 FEDERAL ★×4 (⚠ repeat counts clamped — the old
  `3 - lvl` RangeError is the reason the clamp comments exist).
- **PEDESTRIAN SIGHT IS REAL** (`peds._sees`, Robert: "make sure the pedestrians are able to
  SEE certain things"): the film/draw witness trigger now runs segment-vs-cover + interior-wall
  LOS (same `_segBox` the fog/AI use) — a wall between a witness and the violence means NO
  witness, no filming, no drawing. Event-driven at the trigger moment only (64 peds never pay a
  per-frame bill). Fleeing from CLOSE danger stays un-gated — you can HEAR a superweapon.
- **GTA2 STREET VOICES** (soundscape.say was already the bark engine): the missing lines are
  wired — walk-past civilians mutter/notice you (positional, ~16–40u, only heard when you're
  actually near), vigilantes SHOUT with each shot ('anger'/'challenge') and whimper when their
  nerve breaks ('fear'); flee/film/blast barks were already in. Staged street measured 21 barks
  /12s across five emotions. All positional through `audio._pg` falloff — you only hear the
  people you're around.

## THE FOUR-DECK LADDER + THE POWER CHARGE (2026-07-24)
- **Flight is DECKS, not an axis** (`entity._physics`, plan doc PLAN_ALTITUDE_AND_INTERACTION §1):
  a flying fighter is DOCKED on a deck or IN TRANSIT. Release ascend → the servo eases you onto
  the CURRENT band's deck (never "where your thumb stopped"); holding walks the rungs with a
  click per band. GROUND (< BANDS.ground) stays free levitation with the soft floor. BUILDING's
  deck = the ROOFTOP UNDER YOU (`_roofUnder`: cover + interiors tops) else the skyline default;
  SKY/CLOUDS decks derive from the per-city BANDS. Servo speed caps at FLY_SINK (26) and slam
  needs < −38, so docking can never hurt. `launchT > 0` suspends the servo entirely (knockback
  owns the axis; band = wherever you land). `def.maxBand` ?? (tier ≥3 ? 3 : 1) — the ruled
  levitator nerf, see BALANCE.md. Landing logic unchanged (descend still lands on roofs first).
- **Speed feel pass 2026-07-24**: ground ×1.08 · tier-3 air ×1.2 · levitator 0.62→0.78 ·
  clumsy 0.85→0.95 · FLY_RISE 30→46. FLY_SINK must stay 26 (servo cap).
- **THE POWER CHARGE** (DBZ ruling): guard held with no foe inside 55u for 0.5s →
  `chargingKi` — 40/s regen, heroYell scream, rising sparks, gold pulsing state ring — and
  DEFENSELESS: any hit bypasses the guard branch, lands full, and interrupts with a 0.35s
  stagger. A foe closing inside 55u drops you back to an honest block automatically. The quiet
  in-combat guard-charge (22/s) is unchanged.
- **RECOVERY is a WORD, not a number** (`hud.recoveryTier`, LeFevre pattern): ∞ CORE / SLOW /
  STANDARD / QUICK / RAPID / PRODIGIOUS from the live `bakeSheet().kiRegenMult` — on the select
  kit chips and codex §01. Never print the per-second number on a player surface.
- **Melee vertical gate**: `coneFoe` skips foes with |Δy| > 10 — a jab can no longer connect
  with a foe a whole band overhead (altitude plan F5). Grabs ride the same gate.
- **HARD LOCK is a CROSSHAIR** (`game._buildLockMark`): ring + 4 ticks + centre dot, red.
  The gold reticle stays the soft-aim cursor. Facing-follows-lock law unchanged.
- **Codex on mobile** (≤640px, `CODEX_MOBILE` css in hud): case-file rows stack label-over-value,
  armament table scrolls sideways (`.cfarmwrap`), pager/close grow to thumb size.

## THE PRESSURE LADDER + THE STUN + THE EMPTY ROOM (2026-07-24) — manual §9
- **Beams enforce a strength contest now** (projectiles.js beam tick): `press = min(dps·buff/24,
  1.25)` vs `hold = str/10 (+0.4 guarding, +0.15 metal)` → LAUNCHED (weak, unguarded, after
  0.45s) · PUSHED (a real slide — the shove sets `burstT` to lift move()'s walk-speed clamp,
  which is why beam knockback historically only worked on corpses) · HOLD · WALK-THROUGH
  (str 9–10; press is capped below their hold — eating the dps is the price). The old constant
  per-tick kb is GONE from the beam's takeDamage call.
- **THE STUN** (entity.js): 24% of maxHp inside a rolling 2s window (`_burst`/`_burstT`) →
  `applyStun()`: `stunT = 1.7/ccRecover`, all action gates (melee canAct, abilities ready,
  move) treat it like stagger, guard/charges drop, and a FLYER FALLS. Three gold octahedron
  stars orbit the head (`parts.stars`, lazy, hidden after). 4s `_stunImmune` — no chain-stuns.
  Blocked damage never enters the window (guard is the anti-stun). Dummies exempt.
- **The Danger Room starts EMPTY**: training.setup spawns nothing; **N** orders a Sim
  Construct (main.js, training only), **B** orders a rival; the tutorial `ensureBot`s its own
  targets. Verified ladder (headless, clear lane): GALE open 40u+launch+stun · GALE blocked
  22u no-stun · VEGA 16u · RAGE 2.8u standing · RAGE vs 20dps 0u (19 dmg) · flyer VOLT
  knocked out of the sky. **VEGA's Violet Lance**: radius 2.2→1.45 + `spiral: true` — 26
  instanced orbs wound 3.5 turns down the hose (built/updated/disposed with the beam).
  Ref: `lsw-vega-spiral.jpeg`.

## MOMENTUM MELEE (2026-07-24) — manual §10, spec Part One
- **Contact speed scales the trifecta**: `strike()`/`_heavy()` stamp `f._momSpd` (3D |vel|)
  **BEFORE the lunge impulse** (the lunge would fake momentum otherwise); `momentumMult(f)`
  (exported from melee.js) = `1 + 1.5·k²`, `k=(spd−12)/46` → ×1 standing, ~×1.3 run-up,
  ~×1.8 tier-3 flight, ×2.5 at ~58 u/s full cruise. Damage, kb, impact star, shake and hit
  audio all ride the SAME number. **Blocked hits stay at BASE** — momentum never raises what
  a guard eats, and `onBlockedStrike` bounces exactly as before (the block law is untouched).
  Jab blocked-check is arc-aware now (matches heavy/takeDamage — behind-guard jabs no longer
  self-punish). Kit `melee`-TYPE abilities keep authored numbers.
- **DIVE PUNCH**: flying + descending at swing start = launcher — the hit trades its up-pop
  for `launch: -(34+spd·0.45)` down-force (sized to beat STRENGTH kb-resistance to the −38
  ground gate; metal still plants through it); `takeDamage` arms `launchT` on **|launch|>12**
  (magnitude — no caller ever passed negative) so the ground arrival is a real slam (crater +
  shockwave + damage credited to the puncher). Attacker's hard landing plays the knee-crouch.
- **Bots**: `ai._opener` (set on acquisition, flyTend>0.55 + tier≥2, chance rides ai.level) =
  full-commit cruise approach, dropping onto an overhead arrival; and ANY bot arriving at the
  melee mixup >26 u/s prefers strike over the mixup roll. Turtle branch still wins — nobody
  feeds a raised guard. Difficulty buys judgment, never physics.

## THE AIMED THROW (2026-07-24) — manual §11, spec Part Two
- **The clinch is a STRUGGLE WINDOW now** (`melee.js`): `grabT = clamp(0.85/1.05back +
  (strH−strV)·0.14, 0.45, 1.8)`; victim thrashes laterally (the tell); GRAB again = hurl
  along aim3 on the props' parabola (orange preview in `updateThrowArc`, `_body` branch,
  loft 0.22 — flatter than props); TIMEOUT = `_breakFree` (holder shoved+staggered, victim
  0.4s invuln, NO auto-throw anymore). Escape-tech midpoint check rides `_clinchMax`.
- **Authored throw velocity** — `v.vel` set DIRECTLY (never kb-scaled: the arc must not lie),
  spd `(48|60back) + STR·4.6`, release dmg only 10/16 (strike-flagged → Overdrive/grabHeal,
  hitstop 0). `launchT=1.35` (slam rules) + `_thrownT=1.35` + `_thrownBy` (credit).
- **`game.updateThrownBodies`**: a thrown body >24 u/s passing another fighter (thrower's foe
  side, |Δy|≤9) hits BOTH — struck takes `min(30, 8+spd·0.22)` + launch + own launchT (wall
  chains), body takes 60%, both credited to thrower; raised guard BRACES (no launch);
  `_thrownHit` dedupes. ⚠ thrown bodies use SLIDE-class drag (−1.3 not −6) while `_thrownT`
  rides (entity drag line) — without it a 108 u/s hurl died to 33 in 0.25s and nothing bowled.
- **Bots**: controlBot clinch branch aims at a second foe it `canSee`, hurls after a
  reflex-paced beat, and does nothing else while holding (return). `_clinchAimT` resets off-clinch.

## BLEEDING (2026-07-24) — manual §12, spec Part Three
- **`addBleed(src)`/`clotBleed()`** on Fighter; wound opens at the takeDamage choke point
  AFTER the guard branch (blocked never wounds): slash ≥4 or physical ≥18, stacks cap 3;
  `metal`/energy-body/dummy exempt; `!opts.bleed` guard stops tick re-wounding. Bladed kits'
  trifecta jabs pass `dmgClass:'slash'` via `_swingKind` (claws ARE the fists).
- **Movement tears it** (`update` block): 1.1×stacks×mv hp/s, mv 0 still / 1 walk / 2.1
  sprint (>26 u/s); ticks land every 0.5s through takeDamage (dot+trueDamage, credited to
  the wounder — bleed-out KOs book correctly). **4s continuous stillness = clot** (zero dmg
  while still, suit restored). Tell: downward red drips + suit lerp toward #3a0d0d
  (`_suitHex` restore contract) + ground splat trail. Downward red is bleeding's ALONE.
- Codex: DAMAGE CODEX gained THE WOUND LANGUAGE section. Ref lsw-bleeding.jpeg.

## SECOND WIND (2026-07-24) — manual §13, spec Part Three
- **Humans only, once per match** (`_secondWindUsed`, ctor-init): lethal blow intercepted
  just before `_ko()` → hp pinned 1, `downedT 2.4`, slow-mo, STAY DOWN? announce. Bots/
  dummies/remotes NEVER (isHuman gate). While downed: staggerT pinned each frame (one pin =
  every existing action gate), `_landT` knee, chip/DoTs return 0 EARLY in takeDamage — only
  a strike ≥15 or a slam FINISHES (immediate `_ko`, credited). Window expiry with hp≤1.01 →
  the KO completes. controlPlayer/controlPad downed branch: `secondWindHold(f, holding, dt)`
  — hold ANY attack 1s → `secondWindRise`: 25% hp, **ki=0 + drainedT=5 (Overdrive's moment
  — measured +18.5 ki on the first jab)**, invuln 1.2, gold shockwave + announce.
- ⚠ the slow-mo dilates the window: 2.4s downedT ≈ 3.2 real seconds. Tests must step ~5s.

## SLEEP + BLIND (2026-07-24) — manual §14, the payload lane proven
- **SLEEP**: `addSleep(dur,src)`/`wake()` on Fighter — slow FOLD (`_sleepK`), stagger-pin
  gates, sleeping flier falls, wake on ANY damage. ⚠ **0.15s `_sleepGrace`** — the dart's
  own blast was waking the sleep it delivered same-frame. ccRecover shortens; 3s
  `_sleepImmune`; metal/dummy exempt. Tell: 3 ROUNDED pale-gold dots + slow rings (soft/slow
  where stun is sharp/fast). Carriers: GALE broadhead cycle + SANDRA Tracker Round
  (payload:'sleep') + ORIGIN Tranquilizer Dart. `payload === 'sleep'` handler in
  projectiles.js foe-hit branch.
- **BLIND**: `game.addSmoke(x,z,r,dur)` zones (`_smoke`, ticked in updateSmoke) refresh
  `f.blindT` 0.55s inside; ai.js gates `sees` on blindT (belief does the rest — no new
  code); human: hardLock cleared in controlPlayer, pickTarget magnet gated, `_humanSees`
  vm ×0.28. Tell: slashed-eye sprite (`parts.eyeMark`). Carriers: KNIGHTFALL Smoke Vanish
  (def.blind on teleport — zone at DEPARTURE) + KIVULI Creeping Cloud (def.blind on
  projectile — zone at `_impact`) + ORIGIN Smoke Bomb. `blind: {r,dur}` passes through both
  projectile/volley spawns.

## TIER ONE + AFTERBURNERS (2026-07-24) — manual §15, POWERS_BRIEF Part Three/Six
- **All 20 Tier-1 brief powers live in the ORIGIN catalog** (18 new rows + existing
  twinpistols/drones; every row verified firing). New data-driven flags: `faceOrigin`
  (beam spawns at the FACE — BeamHose stores it, spawnBeamFor passes it), `sonic` (cone →
  transparent pressure rings + dust, no glow), `groundslam` (nova → crater+debris+launch,
  airborne caster driven DOWN, never a glow circle), `chest` (charge orb at chest aperture
  + opening rings), `card`/`disc` projectile meshes (tumbling card, flat-spinning shield —
  _ownMats law respected), `freeze` on areaDamage+mines (→ addFrost ENCASE), `grav`/`card`
  pass through volley, `dmgClass` passes through rush (slash rushes WOUND).
- **7 roster treatments**: SOL+VANGUARD face-origin thin ruby beams · DECIBEL sonic cones ·
  RAGE WORLD BREAKER = groundslam nova (buff→nova ult swap) · FERAL NO CAGES slash rush,
  light finisher · TITAN Reactor Burst chest unibeam (beam-speed orb 110-150) · CHAINFIRE
  already canon #10.
- **AFTERBURNER**: `def.afterburner {mult 2.1, kiPerSec 14, wake:[c1,c2]}` × 6 (sol,
  majesty, torch, nova, apex, olympus). Hold cruise 0.8s → ignition ring → ×2.1 base
  flight (measured 71.8→100.5). 14 ki/s TOTAL (⚠ must exceed the 9/s regen or it's free —
  6/s was free). Dry/closed → wake BURSTS apart, `_burnT` 0. Wake colors are per-hero
  identity; MAJESTY is silver-ice NOT violet (no-purple law beats the brief's wording).
- **gear: true** tags: 24 roster abilities + 13 ORIGIN gear rows (what you HOLD, not ARE).
  TITAN's integrated cannons deliberately untagged. The gear SYSTEM (drops/pickups/
  proficiency/disarm) is the next phase.

## THE GEAR SYSTEM (2026-07-24) — manual §16
- **Drops**: `handleKO` spawns the victim's first gear-tagged ability as a street drop
  (buildWeapon mesh — now EXPORTED from entity.js — 20s despawn, ≤10 live); held pickups
  fall too; police sidearms tagged (5 defs in police.js). `game._drops`/`updateDrops`.
- **Pickup**: G ≤8u (priority clinch>carry>PICKUP>hoist>grab) → `_gearHeld {ab,base,t:12s,
  prof}` + synthetic `f.slots._gear` fired by X through runSlot (kit slots never hidden);
  trigger-time ammo drains only while firing (`drainGear`); dry = tossed, never kit.
- **`weaponProficiency(def)`** (entity.js, exported; gearProf overrides): soldier-word
  archetypes 1.25 / trained 1.05 / base 1.0 / STR≥9 0.7 — damage × prof, spread ÷ prof.
  Measured 75 dmg to flesh vs 0 through TITAN from the same carbine (ballistic gate =
  the Punisher-vs-Hulk law, free).
- **Disarm-by-grab**: clinch connect calls `game.disarm(victim)` — held pickup drops +
  `_disarmT 6` kills gear-tagged KIT slots via a runSlot gate (powers untouched).
- Parked + written: bot scavenging, ped gun pickups (vigilantism laws ready), net item
  ownership.

## THE SYSTEM TIER + THE HELIOPAUSE (2026-07-24) — manual §17 amendment
- **`data/planets.js`**: PLANETS (10 worlds, real AU/km; landable moon/mars/pluto carry
  settlement rows — popType/types/crime/safety/relief/biome), HELIOPAUSE_AU 123,
  TERMINATION_SHOCK_AU 94, SCALE_LADDER (powers of ten), NEAR_STARS (real ly),
  transitSecsFor (log-AU legs). No-surface worlds carry a `reason` — grayed rows say WHY.
- **showDepart zoom stack**: EARTH ↔ THE SYSTEM toggle (`_departView` persists across
  reopen); system rows land via `game.onTravel(row, -1, planetId)` → theater
  `{planet, seed}` → `resolveTheaterPlan` planet branch = `generatePlan(settlementRow,
  seed, {popType, relief, biome})` — Mars IS authored like Miami (ARES LANDING verified
  live, desert/plateau, 12s rumble 2.53ms/f). `_playTransit` gained `opts.secs`.
- **`hud._playHeliopause`**: 3 acts on one canvas — log-orbit run-out · the CHARACTER
  drawn in hero primary + wake crossing the 123 AU wall (Voyager line) · powers-of-ten to
  NEAR_STARS at real ly with a live scale bar. Skip = jump to the final frame (the scale
  IS the point), then finish → reopens the map at the system tier. ⚠ the cinematic clock
  clamps dt at 0.05/frame — headless posing must step ~2× the wall-time frames. Refs
  lsw-system-map / lsw-heliopause-crossing / lsw-heliopause.

## LOW ORBIT TRAVEL (2026-07-24) — manual §17
- **Ceiling opens for a LIT burner only** (entity ceiling clamp branch; hard stop +90);
  climbing past ceiling+44 fires `game.onDepart` once per climb (re-arms below ceiling−40).
- ⚠ **THE DECK SERVO MADE THIS UNREACHABLE, AND THE ORIGINAL TEST DIDN'T CATCH IT** (found
  2026-07-25). The four-deck ladder and LOW ORBIT shipped the SAME DAY and contradicted each
  other: the servo pins a tier-3 flier at `sky + (ceiling − sky)·0.55` — **301** on the flagship —
  while departure needs ceiling+44 = **372**. Flying the real controls, SOL held SPACE+SHIFT with
  the burner lit for fifteen seconds and never moved off 301. The 2026-07-24 line below
  ("SOL through at 373") was measured by setting the altitude, not by flying — which is exactly
  how a feature can be verified green and still be unreachable by a player.
  The servo now yields to `def.afterburner && _burnT > 0.8`, the SAME exception the ceiling clamp
  already makes. Two rules about one fighter have to agree.
  **⚠ If you test a gated route, drive the GATE — anything that writes the gated value directly is
  testing your arithmetic, not the player's path.**
- **`hud.showDepart`** = the world map (1,050 cities, search, climate line, transit time);
  **`hud._playTransit`** = the loading-screen cinematic (starfield + planet limb + typed
  kicker + route arc in the hero's afterburner WAKE colors). ⚠ `.lswovl` defaults
  display:none — inline `display:block` required. ⚠ `cityList()` is a FRESH array per call:
  `indexOf(oldObject)` is always −1; match by name+country (`findIndex`). Theater rides
  `hud.theater.cityId` + seed → main `game.onTravel` re-enters `_lastCfg`; `game._traveling`
  suppresses the full opening so the establishing card IS the arrival beat.
- Pseudo-geography: `_cityLL` hashes country+city (sheet has no coords — HANDOFF). Verified
  end-to-end: VOLT clamped / SOL through at 373; depart offered 1×; map row → transit →
  **Tokyo, Japan live**. Refs lsw-orbit-transit.jpeg / lsw-travel-arrival.jpeg.

## THE LETTER PASS (2026-07-24, second /goal audit) — gaps closed, same day
- **Pumpkin Bomb face** (`pumpkin: true` on canister projectiles): orange gourd body +
  carved-face canvas sprite whose eyes blink WITH the fuse. **Wound KINDS** derived at the
  choke point (fire→BURN, slam/heavy→FRACTURE, slash→LACERATION, cold→FROST-SCAR,
  acid-on-metal→CORROSION) shown in the number + stored `_woundKind`. **Limp run cycle**:
  leg-wounded runners drag a stiff right knee (anchored at the landing-crouch knee line).
  **HUD chip** `#plWounds` ("⚕ ARM II · LEG I", wanted-row pattern, hud.update). **Bots
  guard the wounded arm** (controlBot stray-guard bias at arm≥2). **Tape + news read the
  ledger**: opening tape MEDICAL row via injuryOf; `game._medNews` → `rep.medical`
  (buildReport) → "the medical desk confirms…" anchor line. ⚠ buildReport builds `rep`
  then `return rep;` — a `return {` regex lands in pickCrew (paid for once).

## THE INJURY SYSTEM (2026-07-24) — manual §18
- **Zoned wounds**: single hit ≥16% maxHp at the choke point → `addWound(zone)` (slash→arm,
  slam/cold→leg, else torso; opts.zone overrides). Ladder 1-3 LIGHT/SERIOUS/CRITICAL;
  decay `28s/ccRecover` per rung; respawn clears. Debuffs derived: leg −9%/lvl speed
  (move), arm −8%/lvl jab+heavy (melee.js), torso −7%/lvl ki regen. Tells: dark-red
  octahedron pips pinned per zone (grayscale law) + wound damage-numbers. AI: sees-branch
  only, leg-wounded foe → pref ×0.75 (pressure the limp — honesty preserved).
- **Medical ledger** (rankings.js `bookInjury/injuryOf/healBout`): booked KOs roll 30% →
  ONE injury max (name from `_lastHitKind`), bouts:2, −5% capped. Spawn reads it via a lazy
  first-frame `_medChecked` in game.update (covers all spawn paths); decided duels
  healBout both sides; codex §03 renders § MEDICAL from `injuryOf` — the record is the API
  for the tape/news passes later. ⚠ rankings BOOK memoizes per module instance — tests
  must write through the PAGE's own call path (a phantom dynamic import books into a book
  the game never reads).

## TIER 2 LANES v1 (2026-07-24) — manual §19
- **Frost Nova**: novas pass `{dtype, freeze, dot}` into areaDamage — any nova carries any
  payload from data (36.3 dmg + frozenT 2.04 measured). **Seekers**: `homing` passes
  through volley spawns. **Ricochet**: `bounces: N` on any projectile/rifle — cover hits
  reflect off the radial face, spark, spend a bounce, extend life (straight segments,
  never curves; spawned 3 → kinked → 2 left measured). Catalog rows: frostnova / seekers /
  ricochet. Remaining Part-Four lanes parked in docs/BACKLOG.md with reasons.

## EVERY POWER SPEAKS + THE AMBIENCE DIRECTOR (2026-07-24) — manual §20
- **Loop-law completions**: afterburner burn = `f._burnLoop` sustain('fire') (create at
  ignition, set-by-airspeed while lit, stop on cut/dry/KO) · grapnel creak = `f._grapLoop`
  sustain('bow') (stop in releaseHang — the one path) · portal pairs pulse (two soft
  positional zaps/1.35s while open) · meteors hiss in (thin blast per lance) · sonic cones
  key to 'ice' (air, not element roar). Battery + sweep = 0 orphans.
- **`soundscape._direct(dt, game)`** — the AMBIENCE DIRECTOR: 5-state machine QUIET/
  STALKED/ENGAGED/AFTERMATH/HUNTED; inputs = nearest foe, player-visible foe (_vis — never
  a wallhack), decaying `_violence` fed by `soundscape.heard` hooked in `game.noise`
  (`game.soundscape` wired in main), police heatOf. **Escalate instantly, de-escalate on
  proof** (dwell 0.45s, AFTERMATH 10s, rise ×2.6/fall ×0.5 easing). New layers: 'tension'
  (88Hz sub drone) + 'rotor' (118Hz, 11.5Hz blade LFO, heat-scaled at ≥90); ENGAGED ducks
  crowd 0.3/traffic 0.55; AFTERMATH = `_alarm()` warbles + dogs; HUNTED shortens ambient
  siren gaps. `soundscape.tacticalState` exposed. ⚠ stubbing game.police in tests needs
  update/reset noops — stub ONLY heatOf on the real object.

## ORIGIN HAS A HOMELAND (2026-07-24) — the creator picks country + hometown off the sheets
- **creatorUI identity section**: the two free-text fields became SHEET-DRIVEN pickers —
  country `<select>` (all 168 from countryList(), + UNDISCLOSED) → hometown `<select>`
  (that country's cities from cityList(), pop-sorted, top 40, + "somewhere smaller…" which
  reveals the free-text lane for off-registry towns). Both persist into the same
  `picks.country/picks.city` keys, so saved customs are untouched.
- **THE ORIGIN DOSSIER** (the create-a-hero genre beat — a homeland is a CHARACTER decision
  with stated consequences): a live case-file card reading the REAL country row — flag +
  demonym + motto, VIGILANTISM stance with its street meaning ("BANNED — an unregistered
  hero is a criminal on sight"), LSW LAW (lswRegs + scene activity), THE LAW (enforcement
  grade + flavor), HOMETOWN row (popType · compact POP · CRIME only when rated — many sheet
  rows carry crime 0 = unrated; never print a lying zero).
- **`flagFor(country)`** (identities.js): name→ISO2→regional-indicator emoji, ~150 nations
  + off-world (Mars 🔴, Moon 🌙); `creator.buildDef` person.f rides it, so the registry
  file number, codex §01 and news epithets all get the REAL flag (verified round-trip:
  save → roster → codex shows Kampala · Uganda · 🇺🇬 → delete clean). ⚠ Windows renders
  flag emoji as letter pairs (no color flag font) — correct everywhere else.
- ⚠ `saveCustom(picks, def, roster)` takes three args — the def is built separately by
  `buildDef(picks)`. Ref lsw-origin-homeland.jpeg.

## THE WEIGHT LADDER (2026-07-24) — manual §21, everything throwable, none equally
- **`PROP_WEIGHT` tons (lamp 0.3 · rock 0.5 · tree 1.1 · car 1.9 · plane 24) +
  `liftCapacity(str)`** (entity.js): human linear `0.22·STR` to 5, superhuman
  `1.1·2.05^(STR−5)` past it — STR5 = one tree, STR6 = first car (2.25t), STR10 = the
  only airliner rank (39.8t). **`bodyWeight(def)`** = 0.08 + STR·0.014 + 0.42 metal +
  hp-over-100 (GALE 0.126 · RAGE 0.316 · TITAN 0.678).
- **`propInReach` is capacity-gated** (the `s >= 6` car check is gone) and stashes the
  nearest refusal on `f._tooHeavyProp` so grabProp can feed the two numbers
  ("TOO HEAVY — the car is ~1.9t; you lift ~0.9t"). Carry slowdown
  `1 − 0.45/max(0.9, ratio)` (clamp 0.42–0.93); hurl speed `74 × clamp(0.5 +
  0.16·log2(ratio), 0.5–1.25)` computed ONCE at grab, stored `f._carry.spd`, and
  **updateThrowArc reads the stored number** — the preview can't promise what the arm
  can't deliver. Impact damage rides `0.75 + 0.25·ratio` (cap 1.6).
- **PLANES are props**: `citytiles.plane()` registers meshes in `ctx.planeProps` →
  `buildTiles` returns them → `world.planes` (cleared in `_teardownCity`; flagship
  none). Grab hides the real meshes, carried silhouette rides high (h 17); the throw
  lands as a disaster (blast 22, power 2.4, crater, `world.punch`, slowmo).
- **Person-vs-person battles weight** (melee `_throw` + the clinch arc preview):
  hurl × `clamp(0.75 + 0.15·log2(liftCapacity(holder)/bodyWeight(victim)), 0.45–1.2)`.
  Measured: RAGE→GALE 115 u/s · GALE→RAGE 57 · GALE→TITAN 47 (the plate resists).
- **LOOSE ROCKS** (`world.rocks` via `ctx.rockProps`): mountain scree s>2.3 + 3 forest
  stones per tile register as 0.5t liftables (STR 3+); outcrop boulders STAY cover.
- ⚠ melee.js now imports from entity.js (safe — entity never imports melee).
  ⚠ `runSlot(c, key, inp, g)` — fighter FIRST, game LAST (battery harness order).
  Ref lsw-weight-plane.jpeg.

## THE CIRCUIT (2026-07-24) — the single-player game loop's connective tissue
- **`data/career.js`** (pure logic, localStorage `threshold_career_v1`) + **`engine/careerUI.js`**
  (THE DESK, treaty-office furniture): a persistent career — week counter, bank ($K), renown,
  titles, a 24-line ledger — where EVERY offer derives from live systems: foes from
  `snapshotTable` Elo neighbors, grudges from the hero's OWN book history (`recOf().hist` — the
  first loss on file becomes rematch money), cities off `cityList()` with preference filters
  (headliners want pop≥900K, defense contracts want crime≥55), purses from foe Elo.
  Slates are DETERMINISTIC per (seed, week) via mulberry32 — close and reopen the desk, same offers.
- **The loop**: title banner (`#circuitBar`, reads the save) → THE DESK (slate/medical/ledger)
  → accept sets `hud.theater` + plays the §17 TRANSIT CINEMATIC when the city changes (the
  loading screen IS the travel beat) → `enter(cfg)` with `cfg.career` stamped → fight → the
  news screen's button becomes **CONTINUE ▸ THE CIRCUIT** → back to the desk, week turned.
- **Booking is engine-hooked, not button-hooked**: `game.onMatchEnd` (new neutral hook in
  `endMatch`, fired before the end screen) resolves the offer — purse (25% show money on a
  loss), renown, ledger line, week++, slate cleared — so quitting to the menu can NEVER lose
  a result. `offer._booked` guards the double-fire; `beginMatch` clears `_careerOffer` for
  any non-career cfg.
- **Offer kinds**: duel (headliner/crosstown) · grudge · **defense** (survival with a WAVES
  TARGET — `o.waves` in survival setup; isOver returns "DISTRICT HELD" win when the contracted
  wave count is cleared and the field is empty; no target = endless, unchanged) · rumble ·
  **title** every 4th week (gated on RENOWN ≥ 60 — locked cards say why honestly; win →
  `crownChampion` in the SAME book the cold open + codex read, so the menu reports your reign).
- **The world moves without you**: `simWeek` books 3 Elo-weighted `matchElo(...,'sim')` bouts
  between roster pairs every week turn — the board a career returns to is never the board it left.
- **Money has exactly one honest sink**: PAY THE CLINIC ($80K, `payClinic`) heals the medical
  ledger NOW; REST WEEK heals one bout free but costs the week. Rest is always on the slate.
- **THE FUN PASS (same day)** — texture, momentum, risk, ceremony, all derived:
  · **STREAK HEAT** `heatMult(streak)` = 1+0.08·min(5,W) multiplies duel/grudge/title purses;
  slate header shows "W3 STREAK · PROMOTER HEAT ×1.24"; a loss resets it.
  · **UNDERDOG + SCALED BOT**: fighting UP the board fattens the purse (`underdogMult`, cap
  +60%) AND sharpens the bot — `offer.aiLevel = gapAi(myElo, foeElo)` 0.85–1.75 rides
  `acceptCfg` → duel setup `aiLevel: o.aiLevel || 1.25` (difficulty buys judgment, never physics).
  · **DOUBLE OR NOTHING** (`offer.stake`, desk checkbox, persisted): win = purse ×2 · loss =
  paid NOTHING + renown −4 (renown floors at 0). The one clean risk decision per card.
  · **🩸 RIVALRY**: same foe ≥2× in the last 5 ledger lines → renown ×1.5 + the chip.
  · **INTEL LINES** (`intelFor`): each card surfaces what the sheets already make TRUE in-match
  — vigilantism stance, police ETA off city SAFETY (⚠ pickCity must carry `safety`; it silently
  defaulted every city to ~16s until it did), crime ≥70 armed-street warning.
  · **THE WEEK REPORT** (`career.lastReport`, rendered atop the desk): result, paid, renown,
  **the rank arrow** (#41 ▲ #37 — `rankAtAccept` stamped on the offer at deal time vs
  snapshotTable after), streak, DOUBLE-OR-NOTHING tag, belt line, and the sim headline
  ("Elsewhere: MAJESTY over TORCH") — simWeek returns its first result as the line.
- ⚠ cityList() fresh-array law: offers store `{name, country}`, the accept resolves the index.
  ⚠ Phantom-module law bit AGAIN during verification: a bare `import('/src/data/rankings.js')`
  is a SECOND book when the page graph binds `rankings.js?t=STAMP` — probe
  `performance.getEntriesByType('resource')` / fetch the transformed source for the page's
  real specifier before asserting through a dynamic import.
  Verified end-to-end: banner→desk→accept→transit→Semarang duel vs the offer's foe→win→
  week 2 booked→CONTINUE ▸ THE CIRCUIT→desk; rest; clinic (200→120, cleared); title win
  crowned SOL; sims moved the book; DISTRICT HELD at the contracted wave; reload restores
  WEEK 9 · $120K · 🏆×2. Ref lsw-circuit-desk.jpeg.

## THE SAMPLE BANK (2026-07-24) — real recordings for every discrete SFX
- **`core/samples.js`** (`MANIFEST` + `SampleBank` + `HOT_SET`) + **254 Kenney CC0 oggs in
  `/public/audio`** (~6MB, offline-first; impact/sci-fi/interface/rpg/jingle packs). Every
  discrete audio.js method is SAMPLE-FIRST with the old synth as cold-cache fallback:
  `sample(name, {pos, gain, rate, bus})` returns true when HANDLED (played/muted/out of
  earshot) and false only when no buffer is decoded — the caller then synths (never silent).
  `sampleLoop(name)` returns the sustain contract ({set(I,pos), stop(), last}, registered in
  `_sus` for the watchdog) — the FIRE cone runs a real thrusterFire roar now.
- Wired: punches/hits/landings (body-typed), booms (+sub layer ≥0.85), ki blast/zap/release
  (rate rides the old freq semantics), swings (blade/fist/blunt), gunshot (plate-crack + sub —
  no true gunfire exists in the CC0 set, documented), bow twang, teleport glitch, keystrokes,
  UI clicks (ONE delegated capture listener in hud), book open/flip/close, FOOTSTEPS (planted
  on the run-cycle sine's zero crossings in `_physics`; grass when `plan.rural`), and the
  POLICE ALERT stingers: the wanted ROW transition in hud (one choke point) fires
  `sting.wanted` (rate/gain escalate by star) + screen flash + `.lvlup` scale-pop on rise,
  `sting.clear` + feed line on stand-down; KO involving a human = `sting.ko` (music bus).
- **NO LSW TALKING (Robert's ruling 2026-07-24)**: `audio.heroVoice` gates yell/grunt/cry,
  default OFF (`SETTINGS.heroVoice`, Options → Hero Voices toggle). Civilians keep their
  formant voices — the street still talks; the weapons don't.
- **Still synthesized by design** (no honest sample in the library; each is crafted +
  parameter-driven): the siren two-tone, water splashes, electric arcs, the KMK 9 sting, and
  the sustained KI energy voice (ring-mod/partials/crackle). Swapping those for generic loops
  would be a downgrade — revisit only with better source material.

## THE VOICE OF THE LAW (2026-07-25) — police audio, manual §22
- **The light bar is a LOOP**: `audio.sustain('siren')` (square osc swept ±180Hz by a 1.15Hz
  triangle LFO through a lowpass + a 58Hz engine bed). `police._sirenOn/_sirenOff` are the ONLY
  paths; one loop per VEHICLE, `set(I, pos)` each frame (1.0 rolling in → 0.55 parked). ⚠ Stopped
  in THREE places or it outlives the fight: stand-down, `reset()` (before scene teardown — a loop
  doesn't care its mesh is gone), and `audio.sweep()` as backstop.
- **The radio is a FILTER, not a sample**: `audio.radioChain()` returns the chain INPUT (highpass
  420 · bandpass 1750 Q1.15 · tanh waveshaper · gain → voice bus); `soundscape.say(pos, emo,
  {radio:true})` routes the bark's env into it (`_voiceBark` gained `opts.chain`, defaulting to
  the bus). Cops use the SAME formant engine as civilians — band-limiting + clipping + squelch is
  what makes them police. New BARKS: `radio` (3–5 syl, flat, fast) · `command` (1–2 syl, falling,
  full energy). ⚠ the chain disconnects itself after 3s (a bark is <1.5s) so a siege can't pile up
  filter graphs.
- **`audio.squelch(pos, open)`** = the click+hiss bracket; **`audio.hailer(pos)`** = PA feedback
  chirp 900→2600Hz + 120Hz thump. An UNANSWERED call plays squelch-open then squelch-closed with
  NOTHING between — the silence is the corrupt state ignoring you.
- **Wired beats** (police.js `_say/_dispatch/_order`): dispatch · unanswered · cruiser arrival ·
  units on scene (hailer + shouted order at the villain, then unit traffic) · every wanted rung ·
  shots fired (one call per 2.5s however fast the hits land) · **officer down = TWO registers**
  (urgent radio + a nearby unit's un-radioed panic shout — one line alone reads as a notification) ·
  stand-down. All positional through `_pg`, all rate-limited by the soundscape voice governor.
- ⚠ **`police.active` needs `game.mode`** — `startMatch(id)` does NOT set it, only `startMode`.
  A headless police test built on startMatch silently dispatches nothing.
- Verified: squelch 0.0016 · hailer 0.0049 · siren 0.024 (0.000 after stop) · radio voice 0.0074 ·
  command 0.0124 RMS; live ★★ response = 2 cruisers / 2 live sirens / `_sus` exactly 2 → stand-down
  0 sirens, 0 orphans; officer down jumped heat 123→190.

## SOUND (2026-07-23) — buses, the soundscape, the energy voice
- **THE MIX.** Everything used to connect to one master gain. There is now a bus structure —
  `music · sfx · voice · ambient · ui` → glue compressor → master. Each has a fader in Options
  (`SETTINGS.volMusic` etc.). `audio.setBus(name, v)` and `audio.duck(name, amount, dur)`.
  Static balance lives in `BUS_DEFAULT`; the player's faders multiply it.
- **`core/soundscape.js`** — the city bed + civilian voices, all synthesised.
  · **The bed** follows `world.districtAt` + time of day + altitude: traffic, wind, machine, surf,
    crowd murmur, plus one-shot horns, clank, gulls, birdsong/crickets, dogs, distant sirens.
    Layers EASE (≈1s) so walking a block is a crossfade.
  · **The voices** are real formant synthesis: sawtooth glottal source + vibrato through three
    bandpass formants. A vowel is a formant triple; a word is a sequence with a pitch contour and
    syllable envelope. Speakers differ by pitch AND vocal-tract length. Ten emotional shapes;
    the synth improvises inside each, so no line repeats. Rate-limited (~130ms) or a crowd mushes.
  · **The score** — drone bed + combat heartbeat + opening filter. `music('menu'|'combat'|'victory')`.
- **BODY TYPES.** `f.body` derives from what a character IS (`metal`/`phase`/`tentacles`),
  `def.body` overrides. `audio.land(power, body, pos)` — measured RMS: metal 0.051 (clang + ring),
  flesh 0.037 (thump), energy 0.018 (barely lands).
- **THE ENERGY VOICE.** Ki was one sawtooth through a bandpass — a synth NOTE, not power. Now built
  from three things: **inharmonic partials** (ratios 1 / 2.41 / 3.86 / 5.13, so the ear can't
  resolve a pitch), **ring modulation** (`_ringMod` — a gain node whose gain is driven by an
  oscillator through zero; the biggest single ingredient), and **crackle** (`_crackle` — noise
  through a bandpass chopped by a fast square LFO = arcing). `charge()` ramps all three with fill
  level; `kiRelease(power)`; `beamVoice()` returns a handle whose `set(intensity)` makes a beam
  LOSING a clash audibly strain; `arc()` for tier-ups and lightning.
- **SUSTAINED-ATTACK VOICES — every held attack now loops AND fades** (2026-07-23). `beamVoice()`
  had a sibling built: `audio.sustain(kind, pos)` where kind = `fire` (flamethrower roar, lowpass
  opens with intensity) · `gas` (sinister hiss + tremolo) · `ice` (airy body + frost ticks +
  shimmer) · `acid` (bubbling sizzle) · `drain` (downward ring-mod pull that swells on contact) ·
  `phase` (barely-there detuned hum) · `bow` (tightening creak that rises with draw). **The
  contract matches beamVoice/charge**: created already fading IN (~0.05s, no click), `set(I,pos)`
  every live frame (drives loudness + one timbral param, stamps `last` for the watchdog),
  `stop()` fades OUT (~0.16s, never a hard cut), registered in `_sus` so `audio.sweep()` reaps it
  if a caller forgets (KO mid-cone). Wired into `cone` (element-keyed), `lifedrain`, `phase`, `bow`
  in abilities.js — each stores the handle on `st._loop`, drives it while held, stops on
  release/dry. **This is the loop-vs-one-shot rule made concrete**: sustained sources loop and
  fade; discrete ones don't.
- **MELEE SWINGS are weapon-aware** (`audio.swing(kind, pos)`, one-shots): `fist` (low airy
  whoosh) · `blade` (bright metallic shing + ring — auto-detected from any `dmgClass:'slash'` in
  the kit, cached on `f._swingK`) · `blunt` (heavy displaced-air whump — metal/STR≥9, and every
  haymaker). `bowLoose(draw,pos)` is a real draw-scaled twang + woody thwack, replacing the old
  zap+blast. Measured RMS: blade 0.0059 (brightest) · blunt 0.0024 · fist 0.0017.
- Verified with an analyser tap: all 7 sustain kinds sound, drive with intensity, and fade to
  silence on stop (afterFade 0, `_sus` empties); a 30s six-fighter rumble ran 5.4ms/frame with a
  peak of 6 concurrent sustained voices and 0 console errors.
- ⚠ **Audio must never throw into the game loop.** WebAudio rejects NaN/Infinity on every
  AudioParam with an exception. Every public sound coerces through `fin(v, default)` first.
- ⚠ **Latent NaN found by the new audio path** (`abilities.js` charge release): `st.chargeT` is
  undefined when a release arrives with no charge started, so `undefined / maxCharge` = NaN — and
  `NaN < 0.12` is FALSE, so the fizzle-guard let NaN through into damage, orb scale and audio.
  `c01` is now clamped at source. If you add a charge-style ability, clamp its fraction.

## THE ESTABLISHING SHOT
- `hud.showEstablishing(plan, {sim, country, eta, kicker})`, fired from `main.beginMatch`. Three
  beats: HOLD on the card (name, country, population, districts, crime/safety bars, police ETA,
  vigilantism stance) → LIFT (background fades through) → GONE. The Danger Room gets a different
  card in holo-cyan that BOOTS rather than arrives. Ref: `wwa-establishing.jpeg`.

## CONTROLLER GLYPHS
- `core/glyphs.js` — `glyph(action, pad)` returns △○✕□/L1/R2 for a PlayStation-style pad, A/B/X/Y
  for Xbox (detected from the pad id), keyboard labels otherwise. `buildHintBody` renders pad
  glyphs when `padActive(pad)`, and `main.js` re-renders the panel the moment that changes.
  ⚠ `PAD_ACTION` mirrors `MAP` in `core/gamepad.js` — rebind one, rebind the other.

## THE COLD OPEN — the home page as a news hour (2026-07-23)
- `hud._startColdOpen()` (booted from `showTitle`, killed in `hideTitle` — it is a `setInterval`).
  A KMK 9 monitor with a bug, a blinking LIVE light, the real in-world clock, a lower third and
  scanlines, beside a headline and a stat strip.
- **The monitor plays REAL FOOTAGE** — `game.news.clips`, the frames the field crew actually
  captured in your last match, with analogue snow between clips. With no footage on file it runs a
  broadcast TEST CARD, because a dead monitor on a menu reads as broken rather than as
  "nothing has happened yet".
- **The headlines come off the LIVE BOOK** (`snapshotTable`/`championId`/`recentIncidents`), so the
  menu is reporting on your actual game. With an empty book it says so.
- ⚠ **`#title` had `justify-content:center` with content taller than the viewport.** You cannot
  scroll above a centred flex item, so once the desk was added the headline was simply unreachable
  off the top of the screen. It is now `flex-start` + `overflow-y:auto` with `margin-top:auto` on
  the first child — centred when it fits, scrollable when it doesn't. If you add anything tall to
  the title, that is why.

## THE BODY FRAME — fixing the roster's sameness (2026-07-23)
- **The diagnosis.** Measured, not guessed: the whole 52-fighter roster was ONE procedural body at
  ONE size. Every character's group scale was exactly `1`; only 22 had a BUILDS entry and those are
  small trim (a crest, a pauldron). A Might-10 bruiser, a wiry speedster and a robot rendered at
  identical dimensions. For a roster fighter, that is the weakest possible thing — it's the
  "characters feel the same" note, and it was literally true.
- **`frameOf(def)`** derives PROPORTIONS from what a fighter IS — `strength` is the spine, with
  archetype overlays off role/title/blurb and `def.metal`. Params: `scale` (size) · `bulk` (torso &
  limb thickness) · `broad` (shoulder span) · `stance` (leg span) · `head` (heavies get small heads
  on huge bodies) · `neck`. `def.frame` overrides for a hand-tuned body.
- **`applyFrame(P, F)` reshapes the BODY MESHES ONLY — it deliberately does NOT scale the group.**
  ⚠ The ground markers (ring/wedge/shadow) are children of `g` positioned at un-scaled WORLD
  offsets, and the ragdoll drives body meshes in group-local space assuming `g.scale === 1`.
  Scaling `g` floats the markers off the ground AND misplaces every ragdoll limb. Framing the parts
  leaves both correct and needs zero ragdoll changes.
- **SIGNATURE SILHOUETTE PIECES** (new BUILDS flags, all mounted on DRIVEN meshes so poses and the
  ragdoll carry them): `horns` · `hood` (hides the cowl) · `mane` · `wings` · `tank` (back pack +
  hose) · `coat` (long skirt off the pelvis). Assigned by concept — hoods on KNIGHTFALL/MYSTWARD/
  KAMARIA/SPECTER/JAWAH/KIVULI, mane+horns on FERAL, wings on OLYMPUS/MAJESTY, tanks on HIVE/
  FOUNDRY/CIRCUIT, coats on RAMIRO/MARSHAL/SANDRA/CHAINFIRE.
- ⚠ **WORD BOUNDARIES ARE LOAD-BEARING in `frameOf`.** The first version substring-matched prose:
  `imp` matched **"simpler"** in RAGE's blurb, so the biggest bruiser in the game was built as a
  CHILD (scale 0.84). Every archetype regex now uses ``. Never substring-match flavour text.
- Verified: 52/52 framed · 7 distinct body types · mesh counts now span 45–60 (they were uniform) ·
  measured bounding boxes give a **2.41× width spread and 1.25× height spread** where the roster
  was previously identical (RAGE 12.47×6.16, OLYMPUS 11.75×9.44 on wings, VOLT 10.87×3.91,
  GALE 10.01×5.10). Ragdoll verified at both frame extremes: no NaN, giants settle higher than
  lean fighters (3.84 vs 2.94), and `restore()` puts the framed proportions back exactly.
  364 slots across 52 heroes still fire, 8.4ms/frame, 0 errors.

## THINGS THAT OUTLIVE THEIR MATCH (2026-07-25) — the crash/freeze pass, manual §31
Four laws, three of them the same idea: **a thing must not outlive the match that made it.**
- **THE RESET LAW** — `game.clearTransients()` is the ONE place that empties the board, called
  first by all three reset paths (`startMatch`/`startMode`/`_tourneyRound`). Those three used to
  hand-list what they cleared, so every system added later was silently exempt: ten restarts
  leaked spikes 0→20, decoys/domes/reshaped/timeFields/gravZones/interactables 0→10 each, and
  **cover 17→48** (scene children 49→104, geometries 279→628). Cover drives physics, `canSee`,
  AI vision and the fog raster — that list growing is the shape of a freeze. ⚠ Add a new
  transient system → add it to `clearTransients`, not to a reset path. Verified flat over 12
  restarts (cover 18→18).
- **THE DEFERRED-CALLBACK LAW** — `game.later(fn, ms)`, NEVER a bare `setTimeout`, for anything
  touching the fight. A `setTimeout` fires OUTSIDE the frame loop, so main.js's try/catch cannot
  see it, and it lands in whatever match is running when it fires (chain lightning arcs 0.06s
  apart were damaging fighters from the PREVIOUS match). `later` stamps `game._gen`, refuses to
  run across a reset, and routes its throw to `reportError`; `clearTransients` bumps the
  generation and clears `game._timers`. Converted: chain lightning, tier-up arcs, weather thunder.
  ⚠ The CINEMATIC layer needed its own (`dLater` in opening.js, retired by `finish()`): beats that
  stagger reveals with `setTimeout` kept firing after a SKIP — measured **up to six stray zaps in
  the first three seconds of the live match** off the ladder and satellite cold-opens. Now 0.
  The combat path is swept clean: the only `setTimeout` left in any combat file is the one inside
  `later()` itself.
- **THE REVOKE LAW** (`revokeFrames(frames)`, exported from newscrew.js) — free the object URL
  **AND null the slot**. The cold open and the end-screen TV hold the same clip objects, so a
  revoked URL left in the array is a dangling handle: one stress run logged **68**
  `ERR_FILE_NOT_FOUND`. Shed/reset clips are also marked `_dead`. ⚠ This props up the BROADCAST
  ENCODE LAW — nulling the `'#enc…'` tokens is what makes the async `toBlob` writeback's
  `indexOf` miss after a reset, so the blob is dropped instead of becoming an object URL nobody
  will ever revoke. The two hold each other up; don't weaken either.
- **THE REPEATED-ERROR LAW** — `game.reportError(err, where)`, not `console.error`. A caught
  frame error recurs at 60Hz, and serialising a stack object sixty times a second IS a freeze
  while the player sees nothing. It logs each distinct error ONCE, counts the rest, and at 30
  says on the feed that the frame is failing. Ledger capped at 200 keys (a message carrying a
  varying index is a distinct key — the accounting must not become the leak). `window.error` +
  `unhandledrejection` route through it too. Measured: 500 identical throws → 2 console lines.
- **Health numbers** (3-min AI-vs-AI rumble, real rendering): p50 4.2ms · p95 10.3 · p99 15.0 ·
  **0 frames over 50ms**; heap plateaus 88MB; programs plateau at 50 across six matches (the
  light-count law holding). Beam-on-raised-guard — the original "blocking freezes" report — is
  4.29ms avg, lights pinned 14↔14, 0 frames over 20ms once warm.
  ⚠ Two spikes are REAL and are NOT defects: a match's first frame costs ~47ms (builds 86
  geometries, compiles 4 programs — the establishing card and opening cinematic sit in front of
  exactly that), and one cold-run frame costs ~90ms while allocating NOTHING (no geometry, no
  texture, no program) = a GC pause. Neither recurs once warm. Report them, don't chase them.
  ⚠ `renderer.info.render.calls === 1` in a hidden/backgrounded pane — render early-outs, so
  only SIM timing is meaningful there (same family as the `_ema` reads-98ms artifact).

## FREE ROAM (2026-07-25) — the living city with nothing asked of you
- **`freeroam` replaced the TRAINING card.** Training is the HALL now (blue/white rooms); the
  city sandbox became free roam. ⚠ It is deliberately NOT the `training` id: that id puts the
  world into SIM mode (`world.setSim(id === 'training')`, which FABRICATES a Danger Room instead
  of building the real city) and switches OFF both the police (`police.active`) and the news crew
  (`newscrew.enabled`). Free roam wants all three on — the whole point is that the city behaves.
- Nothing spawns to fight you. **B** orders a rival, **N** a sim construct. Endless (`isOver`
  returns null), no mode bar (`hud.updateModeBar` hides `freeroam` alongside `training`).
- KOs here **do** book Elo — free roam is a real theater, not a fabricated one, which is exactly
  the distinction the existing `modeId !== 'training'` guard already draws.
- `training` survives as an INTERNAL mode with no card: the tutorial (`hud.onTutorial`) and the
  atlas tile proving ground (`hud.onProvingGround`) both still enter it.

## AUDIO: EVERY ATTACK IS A RECORDING (2026-07-26)
- **Robert reversed the "synthesised by design" ruling**: *"100% should be wav/mp3, no coded sound
  effects for any attacks."* That earlier note was my reasoning, not a constraint.
- **THE LIBRARY IS 100% MP3** — 300 files, converted with ffmpeg at 96k mono, and it came out
  **SMALLER than the .ogg it replaced (6MB → 4MB)**. One format everywhere, and it plays in Safari,
  which .ogg does not on older versions. `SampleBank` fetches `.mp3` now.
- **DOWNLOADED, all CC0, all verified before use**: *80 CC0 Creature SFX* (OpenGameArt) for the human
  reactions the library never had — scream, hurt, grunt, cough, breath, roar — and the *RPG Sound
  Pack* (CC0) for real recorded swings, casting and water. ⚠ Kenney's Voiceover Pack and Sci-Fi
  Sounds were fetched and **REJECTED**: the voiceover pack is game-show announcer words and the
  sci-fi pack was already present. Downloading something is not the same as it being useful.
- **SIX ATTACK PATHS WERE STILL CODE-GENERATED** and are now sample-first: the ki charge, the beam
  voice, the electric arc, water splash, power up/down, and the pain grunt / KO cry. The synth
  survives ONLY as the cold-cache fallback — `sample()` returns true when it HANDLED the call.
- **Measured through an analyser on the master bus: all 16 attack sounds play FROM A FILE**, 72/72
  manifest families decode, 0 audio 404s.
- **PEDESTRIANS SCREAM FOR REAL.** The formant synth stays for SPEECH (no sample library improvises
  a sentence, and that engine is why the street talks at all) — but a scream is a sound, not speech.
  `peds.audio` is wired in main.js so the layer plays recordings directly.
- ⚠ **`sampleLoop(name, OPTIONS)` TAKES AN OPTIONS OBJECT.** Passing `null` defeats the `= {}`
  default and the destructure THROWS — breaking the "audio must never throw into the game loop" law
  in the very commit meant to honour it. Both `charge()` and `beamVoice()` had it; caught by the
  analyser test, not by re-reading.
- **Still synthesised, deliberately, and none are attacks**: the two-tone siren, the radio filter
  chain (a FILTER, not a sound), squelch, the PA hailer, the KMK 9 sting, and the formant speech.

## THE DIRECTION TRIANGLE (2026-07-26)
- A small solid triangle on the you-are-here ring (`game._pmTri`), brightening with speed.
  ⚠ Distinct from `faceWedge`, which is a wide arc on the FIGURE's ground rig showing body yaw —
  this is the PLAYER's heading on the mark, readable where a 1.4u arc is a smudge. The mark is in
  WORLD space, so the heading applies directly with no counter-rotation.
- ⚠ **FOUR TEST VERSIONS WERE WRONG BEFORE THE FEATURE EVER WAS.** Writing `facing`, then `aim`,
  then overriding `controlPlayer` were all silently overwritten further down the frame (`facing` is
  a damped yaw chasing the aim; the aim is rewritten from the mouse every frame). Each run printed
  the same value four times and read exactly like a broken triangle. **Assert the INVARIANT** —
  wherever the player faces, the triangle points there — sampled over a live fight: worst error
  0.00° over 24 samples. Same lesson as the orbit ceiling: drive the gate, or assert the
  relationship rather than the value.

## THE UNSEEN THINGS, THE PSYCHOLOGIST, AND THE FIRM (2026-07-26)
- **`data/medical.js` · `data/org.js` · `data/names.js`.** Console: `team` (found / market / week /
  chart / examine / couch).
- **⚠ THE WHOLE DESIGN IS IN THE WORD *UNSEEN*.** A wound you can SEE is a number on a bar and you
  route around it. A condition you cannot see is different in kind: it is already costing you fights
  before you know it exists, and a physician naming it is a REVEAL rather than a menu update. That
  gap is the only place the system can generate a feeling, so three rules protect it:
  1. **A hidden condition still BITES** — measured, internal bleeding + concussion run vigor ×0.64 and
     awareness ×0.80 while the chart shows nothing. If hidden things did nothing until found, the
     diagnosis would be the whole mechanic and "unseen" would be decoration.
  2. **A scan is not a switch** — `examine(quality)` decides what is FOUND, and the highest `find`
     thresholds sit on exactly the conditions with no outward sign (internal bleeding, cardiac
     strain, nerve damage, survivor guilt, dissociation).
  3. **⚠ THE REPORT NEVER SAYS HOW MANY WERE MISSED.** A screen reading "2 missed" defeats the
     mechanic. The roster row says `OFF FORM`; the only honest signal is that the numbers do not add
     up. Untreated things worsen, and an undiagnosed thing is by definition untreated.
- **⚠ THE PSYCHOLOGIST ACTUALLY HELPS** (Robert asked for this specifically). Sessions clear real
  ground and finishing a course REMOVES the condition — a care system where care is futile says
  something bleak nobody asked it to say. Treating one condition leaves the others: grief clears,
  and the survivor guilt booked by the same event is still on the chart.
- **⚠ TRAUMA IS BOOKED FROM WHAT PEOPLE ACTUALLY WITNESSED**, gated on `canSee` — the SAME
  line-of-sight the AI honesty law uses. Verified both ways: six kills in view opened eight charts;
  a witness 900u away got nothing. Second wind books `nearDeath` (+ sometimes hidden cardiac strain);
  a serious VISIBLE wound sometimes leaves an INVISIBLE one under it (`addWound` → `inflict`).
- **⚠ IT REACHES THE FIGHT THROUGH THE PSYCHE**, never a bolted-on debuff. Trauma moves the resting
  temperament and volatility (data/psyche.js), which already feeds mood, which already multiplies
  damage/speed/cooldowns — so a traumatised fighter BEHAVES differently instead of hitting for less.
  Measured: resting temperament → fearful, volatility 1.00 → 1.65.
- **THE FIRM — four kinds of person who are not interchangeable.** Ascendant (fights, wins contracts)
  · operator (fights, cheap) · scientist (never fights; the ONLY reason the research tree exists) ·
  engineer/physician/psychologist. They compete for one payroll, and the ones who cannot fight are
  the ones you are tempted to cut — until the week they matter.
- **Seed capital is DERIVED from where you incorporate**: Zurich $850K, Mogadishu $250K. Ascendant
  pay scales off the RANK ladder — MAJESTY (rank 92) $910K/wk vs an operator's $13K.
- **⚠ NAMES RESPECT THE CULTURE CODE**, which sat on all 1,050 city rows being used for architecture
  and nothing else. Kampala hires Tendai Moyo; Osaka hires Nari Tanaka; Lima hires Julieta Duarte.
  ⚠ Code **0 is unset on 22 rows** — always fall back, never assume a region.
- **⚠ 46 OF 168 STATES NAME THE FIRM FOR YOU**, derived and never a list of country names: a state
  that bans private Ascendant work, or that has no free press, has no private security market for
  you to have a brand in. North Korea issues `DIRECTORATE IX` and says why; Norway lets you choose.

## THE BASE — A 9×9 SITE THE WORLD DECIDES (2026-07-26)
- **`data/base.js`**: 9×9 grid on **two floors** (slot = `floor*81 + r*9 + c`), 57 facilities, six
  containment tiers. **`engine/baseroom.js`** raises it; mode `base` walks it.
- **⚠ THE SITE IS DERIVED, NOT CHOSEN.** `siteSurvey(city, country)` reads **eleven sheet fields** —
  gdpPerCapita, city pop, lswRegs, integrity, science, healthcare, mediaFreedom, lawBudget,
  intelBudget, hvt, crime, safety, terrain, city types — and returns the permitted footprint.
  Kabul and Mogadishu = **1×1 A SINGLE ROOM**; Tokyo/NYC/Stockholm = 9×9.
  ⚠ **INTEGRITY CUTS BACKWARDS** — a clean state enforces its zoning, so a bought one lets you build
  BIGGER. ⚠ **MEDIA FREEDOM IS THE SURVEILLANCE SIGNAL**: without it Pyongyang surveyed as a 9×9
  national-scale site, because North Korea's law/intel BUDGETS are small on the sheet.
- **⚠ FOUR PASSES, ALL THE SAME MISTAKE.** A weighted SUM of eleven 0–1 terms regresses to the mean
  (nothing below 4×4 over 1,050 cities). Multiplying the hard gates fixed the ordering but left a
  hole at 4×4. Min/max normalisation still piled everyone in the middle because the scores are
  CLUSTERED (ceiling 7×7, no 1×1). **The rung is a PERCENTILE against every real city**,
  smoothstepped so extremes stay rare — all nine occupied by construction.
  ⚠ **THIS IS THE THIRD TIME** (university standing, the rank ladder's top end, now the site survey):
  a ladder's rungs must be derived from the DISTRIBUTION, never from hand-picked constants. A rung
  nobody can reach is a rung that does not exist.
- **⚠ CONTAINMENT IS PRICED BY WHAT IT HOLDS**, on the SAME rank ladder the fighters use: drunk tank
  (rank ≤19, $25K) → secure → dampened → containment vault → deep vault → **omega vault (Low
  Cosmic, $4.2M, 34 weeks)**. `jail()` uses the WEAKEST cell that will hold them and refuses with the
  reason ("NOTHING YOU HAVE BUILT IS RATED TO HOLD A LOW COSMIC").
- **TWO FLOORS, JOINED ONLY BY A STAIRWELL.** `reachable()` walks orthogonally on a floor and
  vertically ONLY through a built stairwell at the same (col,row); it cannot be demolished out from
  under the rooms above it.
- ⚠ **THE ARENA HAS TO FIT THE BASE.** A 9×9 spans ±333u but entity physics clamps to `world.ARENA`
  — the player was TELEPORTED 82u on the first frame from the lift into the next room. Fitted on
  entry, restored on close.
- Nothing is destructible (`hp: 1e9`); the city is HIDDEN and its prop ARRAYS stashed; the base is a
  transient closed by `clearTransients`; an indoor room makes its own light.

## THE ARMORY (2026-07-26) — real weapons, real gear, a voice each, manual §38
- **`data/armory.js`**: 13 firearms · 6 blades · 16 gear · 9 loadouts.
  ⚠ **EVERY ROW IS AN EXISTING ENGINE TYPE.** A firearm is a `rifle` ability with a `weapon` class;
  a blade is `melee` with `dmgClass:'slash'`; gas is a `payload`; a sight is an item. Nothing needed
  a new branch in the combat pipeline — that is the test of whether a weapon system is data.
- **Two snipers** (M24 bolt / M107 anti-materiel with `pierce`), **AK and M16 by name**, battle
  rifle, SAW, MP5, suppressed PDW, pump + auto 12ga, 9mm, .44, machine pistol.
- ⚠ **EVERY FIREARM HAS ITS OWN VOICE.** The CC0 library has no true gunfire, so a shared bang
  across twelve weapons would make them indistinct — worse than the synth, because the point of
  carrying twelve is hearing which one is shooting at you. `VOICES` gives each a crack/body/tail/mech
  profile; `audio.gunshot(power, pos, voice)` builds the report; the recorded plate-crack stays as
  the TRANSIENT, pitched by calibre. On a suppressed weapon the ACTION is the loudest layer.
  Measured on the master bus: **13/13 audible, 13/13 distinct signatures**; the two weapons sharing
  the `shotgun12` profile read 985.67 vs 957, which is what proves the harness honest.
  ⚠ **MEASURE WITH rAF, NOT `setTimeout`** — a transient is ~40ms; the throttled harness caught only
  3/13 and gave two same-voice weapons different numbers.
- ⚠ **EVERY SHOT IS HEARD, suppressed ones LESS.** `if (def.quiet) g.noise(...)` was backwards and
  nearly shipped: gunfire did not broadcast at all before (only the HIT did), so gating on `quiet`
  would have made the suppressed PDW the only weapon a bot could hear being fired.
- **NIGHT VISION · MOTION TRACKER · THERMAL** all ride the ONE `_visionMode` system.
  ⚠ The vision params live on the **GAME** (`game.visNear/visRange/visCos`), not the fighter —
  writing them onto `f` compiles, runs, and does nothing.
  ⚠ `setVisionMode` **clears before it sets**: using night vision twice saved the ALREADY-multiplied
  values as the "original" (a permanently widened cone), and switching goggles stranded the save so
  it never came off. The tracker pings only what MOVES — stand still and it never sees you.
- **TWO GASES, TWO WEAPONS.** CS blinds + staggers + barely scratches (police equipment); MUSTARD is
  slow, does not blind, and **corrodes** — the one thing an armoured chassis fears. A cloud keeps
  working via `game.later`, never a bare `setTimeout`.
- **The jammer cuts SQUAD RADIO only.** ⚠ It sets `ai._jammedT` and `_callOut` had to be taught to
  READ it, or the item was a particle effect.
- New `buildWeapon` silhouettes: katana · claws · smg · sniper · baton.
- **Reachable**: `arm` in the dev console (`arm ak`, `arm m107 rmb`, `arm specops`).

## THE RANK LADDER (2026-07-25) — 1-10 became 1-4999, manual §37
- **`data/scale.js` is the one table** — Robert's designation ladder (15 bands, CS shifts, threat
  designations Alpha → OMNIPOTENT) + his weight ladder (rank → lift → comparison) over ONE rank
  axis. ⚠ **They are two tables and do not share band edges** (designation splits the superhuman
  range four ways and lumps 1-9; weight does the opposite) — forcing one row set would silently
  move numbers he wrote down.
- ⚠ **A BAND'S WEIGHT IS THE FIGURE AT ITS TOP RANK.** His finer sheet settles it: rank 19 = 400 lb
  and the band 10-19 says 400; rank 39 = 2,200 lb and 30-39 says "1 ton"; rank 49 = 22,400 and
  40-49 says "10 tons". Anchor at the bottom instead and everyone lifts several times too much.
  Interpolation inside a band is GEOMETRIC — flat means nine rungs mean nothing.
- **`def.strength` 1-10 STAYS** as the authoring shorthand AND as the combat multiplier (melee
  damage, kb resistance, ice break-out — tuned, untouched). What moved to rank is what a fighter
  can **LIFT** and what they are **CALLED**. `rankOf(def)` prefers `def.rank`, else `STR_TO_RANK`.
- ⚠ **THE RESOLUTION IS IN THE ROSTER, NOT THE SCALE.** Ten authored values on a 1000-rung ladder
  = ten occupied points (50-59 and 80-99 came out empty). All 52 heroes carry an explicit
  `def.rank` now, genre-anchored — KNIGHTFALL 29 · KANO 39 · WEBLINE 42 · TRENCH 58 · SOL 66 ·
  TITAN 79 · VANGUARD 95 · RAGE 120. **9/15 bands occupied, 45 distinct ranks**; Cosmic and above
  deliberately empty (headroom is where antagonists and customs live).
- **ONE LADDER, TWO FRONT DOORS**: `liftCapacityOf(def)` is real, `liftCapacity(str)` is the 1-10
  shim; both end in `liftTonsOfRank` so they cannot drift — which is what the old duplicated
  `STRENGTH_LB` array in entity.js did. ⚠ Every carry/throw site passed `def.strength`, so rank
  reached NOTHING until they were rewired (5 in game.js, 1 in melee.js). Measured: 24/52 can lift
  a 1.9t car, 12/52 a 24t airliner; WEBLINE 0.5t → 2.0t.
- **`knockbackOf(rank)`** lives here too — his melee chart uses the SAME band edges, so a second
  table would only drift. Through-the-wall starts at rank 40 (the Low Superhuman line).
- **Surfaces**: codex § DERIVED (STRENGTH RANK · designation · CS, LIFT · comparison, knockback
  spaces) + §02 (DESIGNATION + CONTAINMENT beside LeFevre — capability vs legal posture);
  select-screen chips lead with the band; `deriveAttrs` MIGHT reads the ladder or a `def.rank`
  override would contradict its own sheet. Ref `lsw-rank-codex.jpeg`.
- ⚠ **Import `rankBandOf`, not `bandOf`** — `core/util.js` exports `bandOf` for ALTITUDE bands and
  a file wanting both gets a duplicate-declaration SyntaxError that takes the whole page down.
- ⚠ **A tension in the source, flagged not silently fixed**: his designations run to OMNIPOTENT but
  his weight column stops at 400 tons, so a Sunbreaker lifts ~1.8× an Earthshaker. Past the cosmic
  line, lifting and destructive power are not the same axis. His numbers are used as written.

## DRIVES — what makes a fighter feel anything (2026-07-25)
- **⚠ THE MISSING MIDDLE LAYER.** Until now an event added fixed amounts to fixed emotions
  (`hurtBad → angry 2.0, fearful 1.5`), so a coward and a zealot felt an identical punch
  identically and personality was only a targeting preference. That is a lookup table, not a
  psychology. What sits between an EVENT and a FEELING is an **APPRAISAL**: the event is measured
  against what the person WANTS. A punch is not intrinsically frightening or enraging — it is
  frightening if you want to be SAFE and enraging if you want to be DOMINANT.
  `event → what it does to each DRIVE → the emotions that drive gives when served or thwarted`
- **SEVEN DRIVES**: dominance · safety · duty · glory · vengeance · order · purpose. Each was
  chosen because it produces a DIFFERENT emotion when thwarted — a drive that thwarts to the same
  feeling as another is not a separate drive.
- **A PERSONALITY IS A SET OF DRIVE WEIGHTS** (`DRIVE_WEIGHTS`, one row per type) plus `vol`
  (volatility) and `rest` (resting temperament). That is the whole refinement, and it is measured:
  the same `hurtBad` gives THE ZEALOT **angry 1.09** and THE COWARD **fearful 1.68**; the same
  `allyDown` gives THE GUARDIAN **sad 1.17** while THE AVENGER feels sad AND happy at once, because
  vengeance is suddenly on offer.
- **A FIGHTER OPENS AT THEIR TEMPERAMENT, not at neutral**, and decay drifts back toward it — a
  coward is already wary before anything happens. Measured across 30 heroes: bad 13 · happy 7 ·
  angry 6 · surprised 4.
- **⚠ THE WORLD DRIVES THE WHEEL TOO** (`_ambientPsyche`, appraised once a second per fighter).
  Without it a fighter is emotionally inert until someone hits them, which is the opposite of how
  people work. Wired: outnumbered · alone/idle · low health · wounded · winning/losing (off the
  same stats the report uses) · **hunted** (the police heat ladder) · **crowd cheering or fleeing**
  (the pedestrian layer) · **a rival present** (read from the Elo book's own history).
  Measured with nobody attacking: **outnumbered takes fear 1 → 6.7 in ten seconds**; standing alone
  in an empty street reaches Tired.
  ⚠ Tuning matters here — at `purpose: -1.6` a fighter hit MAXIMUM boredom in 24 seconds, which
  makes every idle character Stressed and the state meaningless.
- Console: `mood` shows the wheel as bars; the readout names what they want.

## THE STRENGTH LADDER, ON ROBERT'S NUMBERS (2026-07-25)
- **⚠ TWO LADDERS HAD TO BE RECONCILED.** The STRENGTH AND WEIGHT sheet is a HUMAN ladder — rank 2
  lifts 50 lb, rank 19 lifts 400 ("the absolute most a 20 year old should be able to do"), rank 49
  reaches 22,400. Our `def.strength` is 1–10 where 6 is already superhuman. Not the same axis, so
  our scale is MAPPED across his: the human end matches his figures exactly
  (STR 5 = 400 lb = his stated human ceiling).
- **⚠ HIS SHEET STOPS BEFORE OUR TOP END.** Ranks 50–80 exist but their values are BLANK. Mapping
  STRENGTH 10 to his last written row (10.2 t) makes the 24-ton airliner unliftable by anyone and
  kills a feature the design explicitly wants. The top continues HIS OWN curve (~×10 per ten ranks)
  into the rows he left empty, so STR 10 = 101.6 t. `STRENGTH_LB` is the single knob.
- **IT IS A REAL REBALANCE, and that is the point.** Old curve: STR 6 lifted 1.1 t and could throw a
  car. On his numbers STR 6 lifts 600 lb and a car needs STR 8.3 — nine heroes, not everyone.
  A streetlight needs STR 6.1, so an ordinary person cannot pick one up.
- **PEOPLE HAVE A STRENGTH EQUIVALENT** — Robert: *"people weight should have str equivalent."*
  `bodyWeight` prices a body in pounds off the same ladder and `bodyLiftStr` inverts it, so
  "you have to be strong enough to grab them" is derived rather than asserted: GALE 163 lb (STR
  2.3) · RAGE 459 lb (STR 5.3) · TITAN 963 lb (STR 6.7).

## THE PSYCHE, LACED IN (2026-07-25) — `engine/psyche.js`, data in `data/psyche.js`
- **Robert's emotion wheel is LIVE**: seven emotions valued 1–10 on every fighter, and his rules
  implemented literally — main = highest · ties break to whichever reached it LAST · the others
  decay toward 1 while the main holds · **an emotion at 10 that gains more subtracts the excess
  from the next-highest**. That overflow rule is the interesting one: feeling one thing strongly
  actively ERODES everything else, which is why a fighter who has been angry a while cannot
  easily become afraid. Measured: angry caps at 10 and knocks sad 6 → 3.6.
- **ONE d100 EACH, AT THE MOMENT OF THE CHANGE** — an INSTANT action applied once, and a MOOD held
  for as long as the emotion lasts. Not per frame, not per hit; the sheet is explicit.
- ⚠ **MOOD IS A MULTIPLIER LAYER, NOT A SECOND COMBAT SYSTEM.** It reaches the fight through the
  choke points that already exist — `takeDamage` for damage, `move()` for speed, `pay()` for
  cooldowns, the ki-regen line — so an emotion can never do something the engine could not already
  do, and nothing else has to know emotions exist. Measured ×4 between a ×2 and a ×0.5 mood.
- ⚠ **INSTANT ACTIONS GO THROUGH THE ENGINE'S OWN VERBS** — ki, `staggerT`, the `_shieldHp` pool,
  `game.disarm` — for the same reason.
- ⚠ **THE TURN-BASED TRANSLATION.** The sheets say "skips next turn", "+20 initiative", "moves to a
  later timeline position in FAST". This game is real time and Robert ruled on it directly, so
  every effect is TRANSLATED with the reading written beside its row: a stagger in seconds, a
  cooldown multiplier, a change in what the AI WANTS. Rows with no honest reading are dropped.
- **THE WHEEL TURNS ON REAL EVENTS ONLY** — hits taken and landed, blocks, KOs, an ally going down,
  low health. No timers and no randomness deciding how anyone feels. DoT is excluded or a beam
  would spin the wheel sixty times a second.
- **PERSONALITY DECIDES WHO A BOT ATTACKS** (the Combat Compendium's 20 types → 5 target rules:
  most health · least health · biggest threat · easiest · random). ⚠ It only ever chooses among
  foes the bot can ACTUALLY SEE — the honesty law outranks the personality, so "goes for the
  weakest" still cannot know who is weakest through a wall. And mood shifts a bot's preferred
  RANGE and AGGRESSION only: never its reflexes, aim or knowledge (the fairness law).
- **YOU CAN SEE IT**: a HUD mood chip (the SHADE as a word off the wheel — MAD, ANXIOUS, PROUD —
  plus what the mood is currently doing to you), the state ring tinted by emotion when nothing
  louder is happening, and **the feeling SPEAKS** — an emotion change puts a line in a comic
  balloon whose tone matches it (anger yells, fear and sadness come out weak, boredom whispers).
  That is what the caption layer was for.
- ⚠ Dummies, sim constructs and the training bag never grow a psyche.
- Console: `mood` (the live wheel as bars) · `mood angry 5` to push one.

## THE COMIC LAYER (2026-07-25) — `styles/comic.css` + `engine/comic.js`
- **THE FONTS WERE CHOSEN BY SPECIMEN, NOT BY NAME.** Eleven candidates rendered inside a real
  balloon, a real caption box and at real SFX size, judged IN CONTEXT:
  · **DIALOGUE -> Comic Neue Bold** — the only one that reads as LETTERING, not a novelty face
  · **CAPTIONS -> Comic Neue Bold ITALIC** — a near-exact match for Robert's reference sheet
  · **SFX -> Bangers**, heavy alt Luckiest Guy — both keep their counters open under a 3px stroke
  where Titan One and Chewy fill in. Four woff2 in `/public/fonts` (79KB).
  ⚠ NEVER a CDN link (offline law). ⚠ `font-display:block` not swap — a balloon in Arial for 200ms
  that then reflows is worse than one that arrives 200ms late.
- **FOUR THINGS A LETTERER DOES that software usually doesn't**, all implemented:
  1. **BALANCED LINES** (`balance()`): every line count tried, scored on raggedness + width +
     height. Greedy wrapping gives a long first line and a stub last one.
  2. **THE TAIL POINTS AT THE MOUTH** — head height, not feet or centre — slides along the balloon
     edge to stay under the speaker and flips above/below when there is no room. Two stacked
     triangles so the outline is one continuous inked line, not a web-app chat bubble.
  3. **EMPHASIS INSIDE THE BALLOON** — `*word*` bolds, `**word**` bolds and reddens.
  4. **NOTHING OVERLAPS** — balloons AND sfx share one occupancy list.
- **TONES**: talk · **shout** (burst clip-path, keeps its tail) · **whisper** (dashed) ·
  **think** (cloud + trailing dots) · **radio** (square, zigzag edge). Captions get a red **drop
  cap** breaking the box's top edge, a **Ben-Day halftone** of two offset dot grids (one alone
  reads as a screen door), and **1.2 degrees of rotation** — at exactly 0 a caption reads as a UI panel.
- ⚠ **THE SAFE AREA.** Balloons under the controls rail are unreadable and no z-index fixes it —
  the HUD is information the player also needs. `_safe()` is the rails the HUD owns; balloons,
  captions and sfx all clamp to it.
- ⚠ **offsetWidth, NOT getBoundingClientRect** for placement. The rect reports the TRANSFORMED box,
  so while the pop animation scales a balloon from 0.6 it measures small — and the clamp meant to
  keep it out of the HUD rail lets an under-measured one straight through.
- ⚠ **A BURST IS A BACKING, NOT A BILLBOARD.** At 190% of a wide word the SFX star was ~2000px and
  swallowed the balloon behind it. Height leads (SFX are short and wide, so one % on both axes
  explodes horizontally); base size 32, because a sound effect must sit BESIDE a balloon.
- **Live triggers**: `onHit` letters a sound effect for hits >= 14 near the player, rate-limited to
  ~1 per 0.42s, never for DoT ticks (a word per beam tick is confetti); `handleKO` gets the panel
  every comic ends on. ⚠ Ticked from the HUD frame, never the sim; cleared by `clearTransients`
  (the reset law); keeps its OWN clock because `hud.update()` takes no dt.
- **⚠ THE BALLOON IS AN SVG PATH GENERATED FROM THE MEASURED TEXT** (`engine/balloon.js`), after
  Robert: *"text shouldn't come out of the bubble, and the bubble has to work dynamically."*
  The first pass drew shapes with `clip-path` and `border-radius`, and **neither can ever work**:
  both CUT the box the text is laid out in, so the words could only be clipped by a spike or spill
  past a curve. No padding fixes it, because the shape does not know how big the text is. Now:
  **measure the words → build a shape around them → centre the text**, which makes it
  mathematically incapable of touching the outline.
- **THE INFLATION IS THE WHOLE JOB** and differs per shape: an ellipse circumscribing a w×h box has
  semi-axes **w/√2** — an oval balloon must be **41% larger than its text**, which is why real
  balloons look so much bigger than the words. A BURST must clear its **inner** radius (spikes are
  extra), a CLOUD's bumps bulge off a core that already clears the text.
- **⚠ NO PANCAKES** (`round()`, MAX_ASPECT 2.15). Two lines give a ~200×40 text box, and the
  identity then yields a 4:1 oval that reads as a bar — and every decoration (spikes, scallops,
  bumps, wobble) is unreadable stretched along one. Grow the SHORT axis; it can never push text out.
- **⚠ POINT COUNT IS A LOOK, NOT A RESOLUTION.** Scaling spike count with the perimeter gave a wide
  balloon fifty tiny teeth = fuzz. A yell has 11 spikes and an announce 16, at any size.
- **NINE TONES**: talk · yell · whisper · think · robot · alien · announce · weak · narrate, plus
  **inverted** as a MODIFIER (black fill, "negative emotions") that composes with every shape.
- **EDGE CASES ARE A SUITE, NOT A HOPE** (9 cases, all passing): every tone · one character ·
  an unbreakable 72-char word · a wall of text · empty/null/no-speaker · twelve at once (capped
  to 4) · the speaker dying mid-balloon · a speaker off screen · markup + `<script>` injection.
  Asserted: text inside the path's own bbox, nothing off screen, no NaN in any path.
  ⚠ **WIDTH, NOT MAX-WIDTH** when capping a long token: the span is absolutely positioned in a
  `.cmb` that has NO WIDTH YET (it is sized after measuring), so `max-width` leaves it to
  shrink-to-fit against a zero-width containing block and `overflow-wrap:anywhere` collapses it to
  ONE LETTER PER LINE — measured 46px wide by 465 tall, off the bottom of the screen.
  ⚠ `buildShape()` guards NaN/zero/huge input at the one place every shape is built: a path of
  "NaN,NaN" renders as nothing and looks exactly like a bug that isn't there.
  ⚠ A tail beyond a sane reach is DROPPED — an untailed balloon reads as off-panel speech (a real
  convention); a hundred-pixel spike across the panel reads as a defect.
- Console: `comic [talk|yell|whisper|think|robot|alien|announce|weak|narrate|cap|sfx|demo] <text>`.
  Refs `wwa-comic.png`, `wwa-bubbles.png`.

## ORIGINS · HOSPITALS · THE PSYCHE (2026-07-25) — from Robert's Combat Compendium + Emotions sheet
- **`data/origins.js`** — the NINE origins and the hospital table, transcribed not reinvented:
  skilled 100%/12h · altered 100%/24h · tech 80%/48h · mutated 80%/48h · spiritual 30%/72h ·
  robotic 20%/72h · symbiotic 50%/48h · **alien CANNOT BE ADMITTED** · unknown reserved.
  ⚠ **ONE SHEET AMBIGUITY LEFT VISIBLE**: the intensity row and the "+4CS/+2CS/+3CS" row don't line
  up against origins 2–4. The chosen reading rides in `HOSPITAL[n].intensityNote` rather than being
  silently picked.
- **CS = a COLUMN SHIFT on the rank ladder we already have** (`data/ranks.js`). One idea, one impl.
- **ALL 52 HEROES CARRY AN EXPLICIT `origin:`.** ⚠ The derivation alone swept **27 of 52** into the
  ALTERED catch-all and put the ARCHER in a powered exoskeleton — a regex over flavour text cannot
  do this job (same lesson as the `frameOf` word-boundary bug). `deriveOrigin` remains as the
  fallback so ORIGIN customs are covered; the roster is data.
- **THE HOSPITAL IS A DECISION, NOT A BUTTON** (`career.admitToHospital`): the flat $80K wipe is
  gone. What medicine can do depends on WHAT YOU ARE — SARGE is whole in 36h, MYSTWARD patches to
  30% over six days, TITAN tops out at 20%, VEGA is turned away at the door. ⚠ **It costs TIME**,
  and time is real now: `advanceDays` moves the same calendar the planets orbit on.
- **`data/psyche.js`** — the emotion wheel (7 primaries, ~40 shades, value 1–10, main emotion, decay,
  overflow) and the 20 personality types with their targeting rules, both from the sheets.
  ⚠ **THE SHEETS ARE TURN-BASED AND THIS GAME IS NOT** — Robert ruled on that directly. Every d100
  effect is TRANSLATED with the reading written beside it ("skips next turn" → a real stagger in
  seconds; "+20 initiative" → a cooldown multiplier), and a band with no honest real-time reading is
  dropped and said so rather than faked.
  ⚠ Personality NUMBERS are the identity (the sheet gives numbers, not names); `name`/`blurb` are
  provisional working labels, one string each to change.
- Console: `origin [hero]` · `origins` (the whole roster by origin).
- **Comic caption fonts are bundled** at `public/fonts/` (bangers · luckiestguy · comicneue-bolditalic,
  61KB total, offline — never a CDN link).

## THE ALMANAC (2026-07-25) — manual §36, `data/orbits.js` + `data/environments.js`
- **A DATE IN, POSITIONS OUT.** Nothing stores where a planet is — it asks. `gameDate()` is the
  in-game calendar (persisted, advanced by the career); `positionAt/separationAU` do the rest.
- **THE SYZYGY IS A CONSEQUENCE, NOT A SPECIAL CASE.** Every mean longitude is 0 at the epoch
  (12 FEB 2026), so they line up once; the periods are mutually irrational so they never all return
  to 0 together. NO CODE ENFORCES IT. Measured: epoch **0.0000°**, ±1 day 2.09°, +1 week 14.5°,
  +1 month 55.4°, +1 year 27.2°; scanning all 146,000 days 1900–2300 the best is that exact date.
- ⚠ **`buildRoute` used `|a.au − b.au|`** — the difference of two orbital RADII, true only when
  both worlds happen to line up. It uses the real chord now: **Earth→Mars swings 0.52 → 2.51 AU
  across one year**, and the transit time moves with it.
- **20 MOONS, real orbital radii.** ⚠ The number that matters is distance in PARENT RADII, because
  a moon drawn "a few planet-widths out" is a diagram: Luna **60.3×**, Iapetus 61.1×, Phobos 2.8×.
  Sizes are compressed like the planets'; DISTANCE never is.
- **THE SKY IS A FACT ABOUT AN ATMOSPHERE** (`world.setSkyWorld`): Mars butterscotch day + BLUE
  sunset (the inverse of Earth, same physics), the Moon black at noon with stars up, Titan an
  orange ceiling, Pluto's sun 0.014° — a STAR with no disc. ⚠ Light drops by INVERSE SQUARE of the
  sun's apparent size (floored 0.34 so it stays playable) — an outer-system noon is genuinely dark,
  not colour-graded. ⚠ `{...this._dnc}` copies COLOR REFERENCES — the backup was the same object and
  Earth→Pluto→Earth came home to Pluto's sky. Clone colours.
- **THE HAZARD MODEL**: a world attacks on CHANNELS (anoxia · vacuum · cold · heat · crush · toxic ·
  radiation · gravity), a fighter answers with what they ARE or WEAR. No `def.id ===` anywhere.
  ⚠ **ANOXIA was missing** in v1 — so the model couldn't say the obvious thing (you suit up on Titan
  because there is nothing to breathe) and every world needed the same heavy suit for the wrong
  reason. ⚠ The pressure suit had cold 2 while every cold world was cold 3, so the lightest rung
  protected nobody: calibrated against reality now — men walked on the Moon in a SOFT suit.
  ⚠ **WHAT YOU THROW IS WHAT YOU SURVIVE** — traits alone said the ICE hero freezes on Titan
  (`frostResist` is a FIRE-hero flag); the kit's damage types are scanned now, so RIME answers cold
  and TORCH answers heat, derived. Venus and Jupiter are LETHAL to everyone (no suit closes crush 3).
- Console: `date` · `almanac` · `moons <planet>` · `survive <world> [hero]`.

## THE SPACE LAYER (2026-07-25) — manual §35, `engine/spaceflight.js` + `data/vessels.js`
- **Renders through the game's OWN composer** — its scene is swapped into the existing RenderPass,
  so the crossing inherits the exact bloom/exposure/ACES the street has. Art-style match is not
  maintained, it is structural. Restored in `finish()` including on a skip.
- **The traveller is a PARTY, never a hero** (`makeParty`): one flyer · six flyers · a flyer and a
  ship · a convoy with escorts · an alien tail. The formation is a FUNCTION of the index
  (solo/vee/echelon/line/escort/swarm, chosen by `formationFor` from what the party IS), so every
  party size is one code path. A flyer's wake comes from its own `def.afterburner` — ORIGIN customs
  arrive wearing their own colours with no wiring.
- **A ship is a PARTS LIST** (`VESSELS`): primitives + a material role + a palette. Adding a craft
  is adding a row — no mesh files, no loader, no second art pipeline. 5 shipped.
- **The ROUTE decides the beats** (`buildRoute` in planets.js): the bodies a crossing actually
  sweeps past, and when. Earth→Pluto gets 6 flybys in order; >30 AU is `deep` and earns the
  heliopause + Oort acts. `{au: N}` with no id is a DEEP target — it gets no atmospheric entry.
- ⚠ **THE PARTY AND THE PLANETS WERE ON TWO DIFFERENT CLOCKS** — bodies placed by route fraction,
  party flying the beat clock, so a "flyby" framed empty space. A flyby is a COINCIDENCE IN TIME;
  `_placeFromBeats` parks each body where the party will be during its own beat.
- ⚠ **EVERY SHOT IS AN OFFSET FROM THE PARTY** + a blend toward what the beat is about. Aiming at
  the BODY put the subject off-camera. ⚠ The DEPARTURE camera must stand off the BOW looking back —
  behind-and-forward put the party behind the lens and Earth outside the cone.
- ⚠ **`_lane` is SMOOTHERSTEP** — slow at both ends. A constant rate left Mars a marble during its
  own atmospheric entry. ⚠ The match HUD hides for the duration, restored EXACTLY as found.
  ⚠ The heliopause shell is 0.04 opacity — a backside sphere you're inside tints every pixel and
  drowns the stars; the BOW SHOCK carries the act.
- ⚠ **SPACE IS NOT BLACK WITH DOTS ON IT** (2026-07-25, "should look more like space"). The first
  field was 2,600 evenly-scattered white specks on #000 and read as a screensaver, because the two
  things that actually say *sky* were both missing: a **GALACTIC PLANE** (a broad, ragged, dusty
  band most stars belong to, with DARK LANES cut through it — dust blocks as much as it glows) and
  **HIERARCHY** (a few dozen genuinely bright stars against thousands too faint to resolve).
  ⚠ Uniform scatter is the one distribution that never occurs in nature. Three layers, one draw
  each: a painted 2048×1024 backdrop sphere · a field CLUSTERED toward the plane with a colour-
  temperature ramp · additive glow sprites for the bright ones (the composer's bloom takes them).
  ⚠ All three ride the camera — a 34,000u lane walks straight out of a 26,000u sphere otherwise.
- ⚠ **THE TERMINATOR IS THE TELL.** Vacuum has no air to bounce light: the unlit side goes nearly
  black and the line is HARD. Ambient at 0.55 filled it in and every planet looked like a lit toy —
  it is 0.30 now with a 4.2 key. ⚠ And WHERE the sun sits decides whether you can see anything:
  outbound you fly away from it, so looking back at the world you left is looking at its NIGHT
  side. The star is swung wide (still behind, far to one side) so every body shows a fat
  three-quarter phase instead of a crescent. Settled worlds get CITY LIGHTS on the dark side.
  A star is a GLARE, not a disc — the sun carries an 8,600u additive corona.
- Console: `space <target|deep> [flyers] [ship]`. Testable via `{manual:true}` (no rAF).
  Refs `wwa-space-depart/flyby/helio/entry.png`.

## THE SURVEY (2026-07-25) — the street sets the level, the lots meet it
- **`surveyCity(plan, sampleH)` in `data/cityplan.js`** (engine-agnostic; `plan.survey` carries
  `node`/`cell`/`onRoad`/grades/cut-fill). ⚠ Levels used to be decided INSIDE the world builder as
  a side effect of stamping a heightfield — nothing could inspect them, the map tool couldn't draw
  them, the validator couldn't check them. Levels are plan data, like roads and sockets.
- **The whole system is ONE constraint**: relax junction levels against a MAX GRADE
  (`track 20% · street 10% · arterial 8% · highway 6%`). That is what makes a street network a
  NETWORK instead of independent ramps, and why a hillside city gets terraces for free.
  ⚠ **ANNEAL the ground pull** — held constant it fights the constraint forever and both settle
  into a compromise (12.8% against a 10% limit = the limit is a lie). Decayed to zero, the survey
  converges to a network genuinely no steeper than it claims.
  ⚠ A junction with NO roads is never surveyed — that's what stops open country being bulldozed.
- **⚠ A LOT IS NOT FLAT.** One height per block can meet the street at the top of the hill or the
  one at the bottom, never both; the difference comes out as a retaining wall at the kerb
  (measured 22u). A lot is a tilted plane pinned to its OWN four surveyed corners, bilinear — every
  frontage meets its street by construction. Mean kerb step 0.04–0.09u.
- **⚠ ORDER IS LOAD-BEARING: survey → cut the lots → grade the corridor.** Grading first doesn't
  hold: `_padCells`' apron reaches K*0.42 (40u), far wider than the corridor, and re-raises the
  carriageway it just cut through. Grade AGAIN after pits/trenches/bathymetry — a mining crater's
  RIM reaching into a street puts ground back through the tarmac. 52u → under 1u.
- **`roadClear(plan,x,z,radius)`** is the question a placer has (`roadAt` only answers for a POINT).
  Trees test the CANOPY radius — the canopy is what blocks a street; lawns shrink to fit their lot.
  Trees in the carriageway: 0. ⚠ The old filter checked only cover boxes and never the road graph.
- **`surveyAt(plan,x,z,grip)`** is the ONE function the heightfield stamp asks — and the one any
  future traffic/navigation code must ask. ⚠ `grip`: heightAt interpolates a ~4u lattice, coarse
  next to a 22u street, so grade one vertex PAST the kerb or a lip survives on the tarmac.
- Checked, not asserted: `validatePlan` flags streets steeper than their class allows; the dev
  console's `survey` command reads the plan's own numbers back. Ref `wwa-streets-graded.png`.

## SURFACES — THE FLICKER LAW (2026-07-25) — read `docs/THE_MAP_MAKER.md` §SURFACES
- **Z-fighting is a SCALE trap, not a maths one.** A depth buffer has finite precision that gets
  coarser with distance; two surfaces closer together than that precision tear. Offsets written
  before the 1:1 rescale (`0.05` / `0.06` / `0.09`) are **1–6 CENTIMETRES** at 1u ≈ 0.19m with the
  camera 200u out. Five systems had each independently picked a "small number" and collided:
  the hall floor + its GridHelper + the contact shadow; the hall's wall coping (top face at
  **exactly** the wall top, 260u long); **every lawn and plaza in the game** hard-coded to `y=0.09`;
  **every rooftop in every city** (`tower()` AND the flagship's own copy, roof plane at `+0.05` =
  9.5mm — and rooftops are ground you fight on); the player mark's invented `0.16`.
  Nobody authored anything unreasonable. The defect was the ABSENCE OF A SHARED LADDER.
- **The rule lives in `core/util.js`**, in order of preference: (1) **don't stack** — paint the
  second surface into the first one's texture (`world._gridTexture`, the hall's calibration grid);
  (2) separate by **`DECAL_LIFT` (0.35u ≈ 6.6cm)** and take a rung from **`GROUND_LAYER`**
  (`shadow 0.05 · stateRing 0.35 · bandRing 0.55 · faceWedge 0.75 · mark 0.95`) — a system that
  invents its own number IS the failure mode; (3) if they must be coplanar, **`sinkSurface(host)`**
  (polygonOffset) so the host loses every tie by rule, or `depthWrite:false` to opt out entirely;
  (4) for many decals of one kind, **ladder at the HELPER** — `citytiles.disc`/`slab` hand each
  decal the next 14mm rung via `decalY()`, reset per city by `resetDecalLadder()`. Forty call sites
  can't each be trusted with a unique number; one helper can.
- ⚠ **INTERIORS ARE FULL OF THIS.** A structure is horizontal surfaces at deliberate heights.
  A floor slab is a surface and so is anything laid on it (rug/hatch/marking/stair nosing).
  A storey's ceiling and the floor above it are **two faces of ONE box with thickness**, never two
  planes at the same height.
- **`world.auditSurfaces()`** walks the LIVE scene and reports any pair overlapping in XZ closer
  than `DECAL_LIFT` in Y. It reads the BUILT scene, so a builder that looks right and computes a
  bad number can't hide. Run after any interior/tile/decal work. Two documented blind spots (it
  OVER-reports, never under): merged/instanced meshes have map-wide AABBs, and interpenetrating
  solids are reported though the depth test resolves them. Measured after this pass: training hall
  **0** (was 15), flagship **3**, generated Tokyo **2** — all blind-spot pairs.

## THE TRAINING HALL — blue room / white room (2026-07-25)
- **Two rooms, one shell** (`engine/whiteroom.js`, mode `lab`, card "THE TRAINING HALL"). Robert's
  ruling: *"don't add any enemies, I can't even train — they just start attacking me and I die
  because I don't have the controls right."* A training space whose first act is to kill you
  teaches nothing.
  · **BLUE ROOM** — the default entry. No AI, no turrets, no drills, no way to lose. The wall board
    stops being a damage table and becomes a **control primer read off the LIVE keymap**
    (`_keys()` → `keymap(SETTINGS.scheme)`, so it can't print a key your scheme doesn't use).
  · **WHITE ROOM** — opt IN via the console: the five drills, the machinery, the sparring partner.
    The drill cycle's last rung **returns to blue** — a safe room you can only reach by restarting
    is not somewhere anyone retreats to.
- ⚠ **RESTORING HEALTH IS NOT IMMORTALITY.** The first version pinned `hp` back to full each frame;
  a single hit bigger than the bar still KO'd, because the kill happens INSIDE `takeDamage` before
  any per-frame repair. It holds `invuln` down instead — the engine's own switch, checked at the
  top of `takeDamage`, the same one respawn and teleport-escape use. Verified: 40 × 500 damage,
  still standing.
- **The dummy looks like a dummy.** A cyan humanoid read as an opponent. Passive = **the BAG**
  (weighted base, sprung post, padded body, banded, wooden arms); sparring = the holo partner. It
  is a SKIN on the same Fighter (`_dummySkin`), so every board number still comes from real combat.
  Hidden by "everything under the figure group except `groundRig` and the rig" — the markers are
  the state display and must survive.
- **The first building in the game with TWO FLOORS.** A mezzanine over the north half only, so the
  fixed isometric camera looks down onto the ground floor through the open south half — the
  "take the roof off" cutaway applied to a storey. It works here and nowhere else yet because a
  ROOM is a box; the terrain heightfield still cannot fold over itself.
  ⚠ **STAIRS, NOT A RAMP**: a rotated slab has no honest AABB collider and registered nothing, so
  it was scenery you fell through. The stand-on-top test only catches within **2.5u**, so a riser
  taller than that is a wall. Ten 2.4u risers → a GROUNDED hero (SARGE, flightTier 0) reaches the
  second floor on foot. Placement is set by two clearances: clear of the west gantry (x −117…−67,
  z ±15 — the first run climbed three steps and stopped dead against it) and the top step must
  OVERLAP the mezzanine's south edge or there is a gap with nothing under it.
- **Nothing spawns a rival into the blue room** — `KeyB` and the `KeyN` sparring toggle both refuse
  and say where to go instead. `clearTransients` already closes the hall (the reset law).

## Hard rules (do not break)
- **`opts.hitstop ?? 0.04`, NEVER `||`** (`entity.takeDamage`). Sustained damage — beams, cones,
  lifedrain, DoT ticks — passes `hitstop: 0` deliberately. With `||`, that falsy zero became 0.04
  and was RE-ARMED every frame, so anything under a beam sat in permanent hitstop: no physics, no
  actions, frozen animation. That was the "shoot the training dummy and it freezes" report
  (2026-07-23) and, worse, made every beam an infinite stunlock on live fighters. Discrete impacts
  (punches, blasts) still hitstop — that's the intended weight. Same care for any future
  hit option where 0 is a meaningful value.
- **Beams are hoses, not lasers** — a traveling tip drags the beam (`projectiles.js → BeamHose`).
  Never make a beam instant/hitscan.
- **Charge = scale** — hold longer ⇒ bigger orb + more damage + wider blast + harder ground
  shockwave & lightning (`abilities.js → charge`, `vfx.js → shockwave/lightning`).
- **NO PURPLE** anywhere (UI, VFX, characters). Warm-neutral dark + gold/amber; per-hero non-purple accents.
- Pooled `PointLight`s come from `vfx.borrowLight()`/`returnLight()` — never `scene.add()` them again
  (double-add duplicates them in the children array).
- Shared temp vectors `_v/_v2` in `projectiles.js` alias — don't hold a reference across a loop that reuses them.

- **THE LIGHT-COUNT LAW (2026-07-24, "blocking a beam completely freezes")**: three.js bakes the
  number of VISIBLE lights into every material's program cache key, so the moment the count of
  visible lights CHANGES, the renderer recompiles EVERY material in the scene at the next render.
  The old `vfx` light pool grew lazily and flipped `.visible` on borrow/return — so a beam held on
  a raised guard spawned a flash+light EVERY frame (onHit fires per blocked tick), the visible
  point-light count oscillated 2↔8, and the city recompiled dozens of times a second (measured
  +152 programs in 4s → a 400ms freeze). This PREDATES the news crew and was a second, independent
  cause of the "blocking freezes" report. The fix (vfx.js): a FIXED pool of 14 PointLights, ALWAYS
  in the scene and ALWAYS visible, created at construction. `borrowLight`/`returnLight` ONLY drive
  intensity (0 = idle); neither ever touches `.visible` or adds/removes a light. On exhaustion
  `borrowLight` STEALS the dimmest — the count never changes, so the recompile can never fire.
  ⚠ Anything that borrows a pooled light must return it with `returnLight` ONLY — NEVER
  `scene.remove(light)` (three projectile dispose sites did both; the remove orphaned a pool light
  permanently and re-broke the invariant). And `onHit` throttles the sustained-block flash/number
  to ~8/s per target (`_blkFxT`) so a held beam is one tell, not a 60/s strobe. Verified: the exact
  repro (beam on guard, 10s) went from +152 programs / 410ms spikes to **+0 programs / 5.1ms avg,
  lights pinned 14↔14**. Never toggle a light's visibility or change the scene light count at
  runtime again.

## Trifecta rules (don't break)
- **Strike beats Grab beats Guard beats Strike.** Guard blocks frontal strikes to ~12% chip (unblockable
  grabs ignore it); getting hit cancels your own grab start-up; back-grabs are unescapable + hit harder.
- **THE BLOCK LAW** (`game.onBlockedStrike`, fired from the guard branch of `entity.takeDamage` for every
  `strike`-flagged blocked hit — ONE choke point, so it covers every present and future melee source):
  a blocked strike REJECTS the attacker — 38u bounce, 0.45s stagger, hitstop, strikeCd 0.55, charge/combo
  window cleared (`_bounceCd` 0.3s stops bounce-locking). **PARRY**: `melee.guard` stamps `_guardUpT` on
  the rising edge; blocking within 0.22s = 54u push, 0.8s stagger, meter refund, gold star + slowmo.
  ⚠ Before 2026-07-23 the punish rules lived ONLY in melee.js, so `melee`-type abilities and `rush` combos
  were FREE against a raised guard — that was the "spam wins, blocking does nothing" bug. Never
  re-implement block punishment per-ability; it belongs at the takeDamage choke point.
  Supporting laws: `abilities.ready()` requires `staggerT <= 0` (staggered fighters cast NOTHING) and all
  `busy` gates include stagger; `rush` hits pass `src`/`strike` (they were anonymous — no kill credit).
  Bots read it too: a foe guarding >0.35s is "turtling" → `controlBot` prefers GRAB or a guard-crushing
  HAYMAKER (reach 13.5u), and `ai.pick` stops feeding rush/melee into a raised guard. See `docs/BALANCE.md`
  Audit 2 for the measured before/after.
- **Hitstop must NEVER drop a held guard** (`melee.guard`): every blocked hit applies hitstop to the
  blocker, so gating guard on `canAct()` made any fast combo strip the block after the first hit
  ("can't hold down block" bug, fixed 2026-07-22). Stagger/grabs/your-own-attacks still drop it.
- Guarding slows you and doubles as a ki-charge stance. `guardMeter` breaks → 0.7s stagger.
- Variants live on the def: `thorns`, `phase`, `grabHeal`, `teleEscape`. Keep the escape a FRONT-grab only.

## Presentation
- **Roster screen** (`hud.buildTitle` + exported `heroStats(def)` + `describeAbility`): per-hero stat bars
  (Power/Range/Mobility/Defense/Health/Energy, derived 0–10), trait tags, full ability list with generated
  descriptions; roster cards show HP·PWR·SPD. Same screen serves title + in-match TAB.
- **Violent hits**: `vfx.impact(pos,dir,{color,power})` = comic impact-star (`impactStar`, canvas sprite) + spray +
  ring + shake. Strikes/heavy-melee/throws freeze BOTH fighters (`hitstop`), `game.slowmo(dur,mul)` on finishers,
  `hud.flashScreen(color,dur)` white pop, `audio.impact(power)` thud+crack. Blocked hits get a small blue star only.

## The living city (map layer 2)
- **Harbor** (`world._buildCity`): east-edge water (`waterAt(x)`: 0 dry · 1 shallow ×0.62 · 2 deep ×0.45,
  applied in `entity.move`; spray in `_physics`; flight exits it; radar shows it). Quay lip at `waterX`.
- **Street props**: `world.cars` (14, shared merged geo, 4 paints) — blast-damaged in `worldImpact`,
  `game._explodeCar` chains fireballs + credits `src`; reset in `resetTerrain`. Streetlights = 2 instanced
  draws, `_lampMat` emissive ramps at night (updateDayNight). 2 billboards (`_billMats`). Roof ACs on the
  6 tallest (children of building meshes — shatter carries them).
- **Pedestrians** (`engine/pedestrians.js`, ONE InstancedMesh): 64 civilians walk the 24u street grid,
  FILM nearby fighters (phone-flash particles — the Witness Layer ruling v1), `scare()` on impacts,
  `blast()` knocks them flat → COLLATERAL feed + human score −40/civ (`worldImpact`). `peds.reset()`
  on match start. Police/escalation = later.
- **Altitude bands** (`ALT_BANDS`/`bandOf` in entity.js): ring under every fighter colored by band —
  GROUND green · BUILDING gold · SKY cyan · CLOUDS white (`parts.bandRing`, ground-pinned like the shadow).
- **Flight speed**: `FLY_SPEEDS` registry (entity.js) or `def.flySpeed` — tier-3 air-speed multiplier.
  **SHIFT held while flying = CRUISE** ×1.5 (2.6 ki/s; `cruiseHeld` set in controlPlayer/controlBot);
  speed-lines spawn past 38 u/s.
- **⚠ SLOW-MOTION LAW**: sim dt clamps at 0.05 (game.update) — below 20fps the game runs slower than
  real time BY DESIGN of the clamp; keep the GPU cheap enough that nobody sits there. The adaptive tiers
  MUST call `composer.setPixelRatio` (EffectComposer caches its construction-time ratio — tiers silently
  did nothing for the scene pass until 2026-07-22). Tier 0 = no bloom pass + no shadow pass + PR 0.72;
  `_pixelCap` bounds total shaded pixels ~2.6MP. Upshift threshold is 17.2ms (13.5 was vsync-unreachable).
  Boot logs the GPU string and warns in-feed on SwiftShader/software WebGL.
- **Targeting law**: hard lock ONLY on a direct click ON a character (`_hoverPick`); the aim magnet
  (`pickTarget` nearD 110) is toggleable via SETTINGS.aimAssist; yaw uses shortest-path damping
  (never revert to naive damp — it pirouettes 355° across the atan2 seam).

## THE VISUAL LANGUAGE (2026-07-23) — read before touching any UI
The tokens live in **`index.html :root`** and every surface draws from them. A system was
started here long ago (`--gold/--blood/--ink/--bone`) and then ignored as each screen got built;
the audit found **83 distinct hex colours across 401 uses, 15 border-radii and 36 font sizes**.
It is now one system: 333 literals migrated to tokens, radii snapped to 4 steps, small type
snapped to a 7-step scale. **Never hard-code a colour, radius, or small font-size again** — if a
value is missing from the scale, add a token rather than a one-off.
- **Surfaces**: `--ink` (ground) · `--surface` (in-world HUD glass) · `--surface-solid` (modals) ·
  `--surface-raised` (cards on modals) · `--surface-hi` (chips) · `--line` / `--line-2` (hairlines) ·
  `--line-gold` (section rules).
- **One accent, a gold ramp**: `--gold-pale · --gold · --gold-deep · --gold-warm · --gold-shadow ·
  --on-gold · --grad-gold`. NO PURPLE anywhere (KIVULI is the sole canon exception).
- **Text is a 6-step ramp**, brightest → faintest: `--text · --text-2 · --text-3 · --text-4 ·
  --text-5 · --text-6`. Labels use `--text-5`, prose `--text-2`, headings `--text`.
- **Status colours each mean ONE thing everywhere**: `--danger` (damage/hostile) ·
  `--danger-2` (soft warning) · `--good` (health/success) · `--info` (ki/energy/data) ·
  `--police` (the law) · `--broadcast` (KMK 9 red, press only) · `--stamp` (classified stamps).
- **Geometry**: radii `--r-1 4 · --r-2 8 · --r-3 12 · --r-4 16 · --r-pill 20`. Nothing between.
- **Type**: `--t-micro 8.5 → --t-lg 15` for UI; display sizes (headlines, KO banner, scores) stay
  expressive and unscaled. Tracking: `--tr-tight` prose → `--tr-wider` for spaced labels.
- **Voice vs data**: `--f-display` (Rajdhani) speaks; `--f-mono` (Cascadia) reports numbers,
  file numbers, timestamps, ratings. Never mix the roles.
- The identity across every screen is **document + broadcast furniture**: hairline borders, dashed
  §section rules, mono micro-labels, classified stamps, one gold accent on warm-neutral dark.

## Ballistics, throwing & the city as ammunition (2026-07-23)
- **Bloom is for KI ONLY.** Bullets are matte brass (`MAT_BULLET`, no emissive) with an alpha
  tracer (never additive). If it isn't energy, it must not glow.
- **Weapon classes** (`def.weapon` on a `rifle` ability): `shotgun` (8 pellets, wide spread, huge
  kick, short `life` so falloff is PHYSICAL) · `pistol` (one accurate heavy shot) · `rifle` (fast,
  tight auto). SARGE carries a Service Carbine + a Breaching Shotgun.
- **THE BALLISTIC SCALE** (`entity.takeDamage`, `opts.ballistic`): lethal to people, an annoyance
  to superweapons. Damage meets ARMOUR first (`def.armor`, or 9 flat for `def.metal` — sparks off
  the plate), then TOUGHNESS (`str >= 6` scales it down; STR 10 takes ~15%). Measured with one
  shotgun blast: 60 unarmoured · 0 through TITAN · 10.8 to RAGE. Energy/fists/slams bypass this.
- Ballistic rounds do NOT explode (no fireball/crater/areaDamage) and they **collide with
  pedestrians** — peds are one instanced mesh, so nothing had ever hit them; one shot downs a
  civilian, books police heat on the shooter.
- **THROWN STEEL + CANISTERS (2026-07-24, the bullet treatment spread)**: projectile flags
  `blade` (matte spinning steel cross — STORMCALL's Hurled Axe, KNIGHTFALL's Batarang Fan via the
  volley pass-through; no halo, no pooled light, whisper trail only — a straight tracer would LIE
  about a boomerang's curved path) and `canister` (drab tumbling shell, payload-coloured blinking
  fuse — SARGE Frag Grenade, KIVULI Gas Canister). Arrows gained a pale speed-scaled air-wake
  (`GEO_TRACER_Y`). ⚠ high metalness with no envmap renders near-BLACK — follow MAT_BULLET's
  recipe (low metal, bright base). ⚠ `Projectile._dispose` now iterates `this._ownMats`
  (declared per mesh branch) — the old `children[1].material.dispose()` index-guess crashed on
  nested groups AND disposed the SHARED tracer material on every bullet impact. ⚠ DRONES pass
  `this.owner` as projectile caster (summons.js) — passing the drone itself made every drone KO
  read "undefined STANDS", book no Elo, and credit no XP/heat. Ref: `lsw-thrown-steel.jpeg`.
- **THROW ARC** (`game.updateThrowArc`): every gravity projectile draws a dotted parabola +
  landing ring using the SAME maths the projectile flies with, so the preview can't lie. Orange
  while carrying a prop.
- **CARRY & THROW** (`grabProp`/`throwProp`/`updateCarry`): **G** hoists a car (STR 6+), street
  tree or lamp; carrying slows you ~28%; **G** again hurls it along the arc. ⚠ The impact check is
  sized to the object (13u wide × 16u tall for a car) — `overlapFoe`'s ±9u vertical window let a
  lobbed car sail over a fighter's head. Props are now cover AND destructible AND a weapon.
- **New tiles**: `stadium` (ring of standable stands + floodlights), `hospital` (rooftop helipad,
  ambulance bay), `market` (dense low stalls). Every generated city gets a hospital; bigger ones
  get a stadium and markets, so two same-type cities stop feeling identical.

## Combat readability (2026-07-23) — what a fighter is doing, at a glance
- **Guns are ballistics, not ki.** `rifle` spawns `bullet: true` projectiles: a brass slug
  (`GEO_BULLET`, built along +Z, quaternion-aligned to travel) with a tracer streak trailing it,
  a grey smoke wisp instead of a plasma tail, and NO pooled light (guns fire a lot). Audio is
  `audio.gunshot()` — noise crack + low thump + room slap; never reuse `zap`/`blast` for firearms.
- **The ground marker is the state display** (`figure()` → `bandRing` + `faceWedge` + `stateRing`,
  driven in `_animate`): ring colour = altitude band · **`faceWedge`** = a bright arc at the FRONT
  showing exactly where they're looking (⚠ it counter-rotates `this.facing - obj.rotation.y`,
  because the group already carries the damped body yaw — without that it lags the real aim) ·
  **`stateRing`** = blue guarding · green grabbing · orange swelling with `meleeCharge` (haymaker
  wind-up — the tell that lets you react) · white on a committed strike · red while staggered.
- **ALT ladder** (`hud.updateAltitude`): four rungs GND/BLD/SKY/CLD, live band lit in the hero's
  accent, altitude in metres (1u ≈ 0.19m), and the panel nudges up/down when you cross a band.
  Band thresholds must stay in sync with `ALT_BANDS`/`bandOf` in entity.js (8 / 150 / 260).

## HUD readability (2026-07-23)
- **The controls wall auto-folds.** `hud.armHintTimer()` (called from `main.beginMatch`) shows the full
  control list for ~18s of a fresh match, then collapses it to a corner chip — **F1** toggles it back and
  pins it (`toggleHint`, `_hintPinned`). It was a permanent 9-line block owning the bottom-right quadrant.
- **"You are here"** (`game._buildPlayerMark` / `updatePlayerMark`): a soft pulsing ring under the human
  player in their hero's accent colour. At 1:1 city scale a 9.6u hero is a speck between 150u towers.
- **Off-screen foe arrow** (`hud.updateFoeArrow`): an edge marker with name + distance pointing at your
  locked/visible target when it leaves frame. ⚠ It shows ONLY foes you can actually see (`_vis > 0.4`) —
  pointing at a fog-hidden enemy would be a wallhack and would undo the AI honesty work.
- KIT chips dock directly above the player panel (were floating detached at `bottom:250px`).

## CONTROL SCHEMES + the organised help panel (2026-07-23)
- **One source of truth: `KEYMAPS` in `core/settings.js`** (NOT hud.js — game.js imports it, and a
  game→hud import is circular). Every binding a scheme owns lives on the map — `up/down/guard/item`
  (key codes) + `upLabel/downLabel/guardLabel/itemLabel/swapLabel` (what the help panel prints) +
  `wheel: 'hero'|'ability'` + `digitsSwap`. Engine and help panel read the SAME object, so the
  hint can never lie about your bindings. `keymap(name)` resolves + tolerates the early `southpaw`
  build (→ HYBRID). Persisted as `SETTINGS.scheme`; picked in Options → CONTROL SCHEME (chips +
  live blurb).
  - **CLASSIC** — what shipped. Wheel (and 1–0) swaps hero · Z descend · C guard · X gadget.
  - **PILOT** — wheel picks the POWER, hero swap moves to `[` `]` · SPACE up / C down · X guard · Z gadget.
  - **HYBRID** — PILOT's wheel + brackets, guard/gadget left on the old C/X muscle memory.
  ⚠ **No two keys in one scheme may collide.** Guard and gadget were BOTH hard-coded to `KeyX`
  before this became data (pressing X in the old "southpaw" both raised guard and threw the beacon).
  That's why `item` is on the map and `controlPlayer` reads `KM.item`, never a literal.
- **WHEEL-SELECT has a trigger.** In an `ability` scheme the wheel sets `p._selSlot`, the HUD chip
  outlines (`hud.selectSlot` → `.slot.sel`), and `controlPlayer` REDIRECTS the LMB intent onto the
  selected slot (LMB is blanked so it can't double-fire). A selection with no trigger is just a
  highlight, not a control. `cycleHero` resets `_selSlot` to `lmb` — a new kit is a new slot list.
- **The help panel is grouped** (`hud.buildHintBody`, rebuilt on every scheme change and from
  `armHintTimer`): MOVE & AIM · MELEE · POWERS · FLIGHT · SYSTEM, each a titled `.hgrp` of
  `<b>key</b><span>what it does</span>` rows built from the active KEYMAP. It was one flat wall.
  Ref: `lsw-help-pilot.jpeg`, `lsw-options-schemes.jpeg`.

- **TABLET MODE (2026-07-24)**: the device ladder is PHONE (coarse+short≤500) · TABLET
  (coarse+short 501-1100, iPad incl. the Mac-masquerading iPadOS via maxTouchPoints — never UA
  sniff) · desktop. body.tablet (TABLET_CSS): radar/kit/feed KEPT but touch-sized, hint+slots
  gone, player panel lifted 190px clear of the stick, touch buttons ×1.18 + inset 24px, menu
  buttons min 42px tall; pixel cap 2.0MP. The in-match rotate gate covers tablets too.
  Ref: lsw-tablet.jpeg.
- **PHONE MODE (2026-07-24)**: body.phone (main.js applyPhoneMode — coarse pointer/touch +
  short edge ≤500px, re-checked on resize; LSW_phone() test hook). The law: the FIGHT and the
  THUMBS own the screen — hint/radar/kit chips/PiP/cityplate/slots row all hidden (PHONE_CSS in
  hud.styles.js), player panel becomes a compact bars-only strip TOP-left (bottom-left is the
  stick), feed capped to two micro lines, announce/alt scaled down. Phones also get a lower
  pixel budget (cap 1.35MP, start tier 1). Refs: lsw-phone-before.jpeg / lsw-phone-after.jpeg.

## Player-facing shell (options · onboarding · roster nav)
- **The cast layer** (`data/identities.js` + `engine/icons.js` + `hud.kitFacts`): every hero has a
  `def.person` — civilian name, home city, country, flag (canon anchors: KIVULI=Kampala,
  STEFANOS=Athens, SANDRA=L.A., the Hand trio, RAMIRO=Juárez; non-humans get designations).
  `applyIdentities(ROSTER)` merges at boot; ORIGIN customs write their own via the creator's
  Civilian Identity fields. **Icons**: one inline-SVG per stat concept (`icon(name)`,
  `ATTR_ICON`, `ICON_MEANING`) used identically on select + sheets + ORIGIN. **`kitFacts(def)`**
  auto-generates the "what am I getting into" chips (doctrine, range, fists, flight, guard type,
  what they carry) FROM the kit data, so it can never lie. Select preview = the character sheet:
  identity header, at-a-glance chips, rank-ladder legend strip, ‹ › flip arrows through the
  filtered list, flags on roster cards.
- **Settings** (`core/settings.js`): `SETTINGS` store persisted at `threshold_settings_v1` — master volume,
  voice (DBZ synth loudness via `audio.voiceMult`), screen shake (`world.shakeMult`), damage numbers
  (`hud.dmgNumbersOff`), controls-hint visibility, render quality (`world.qualityOverride` locks the adaptive
  tier; `'auto'` re-enables). `applySettings(game)` pushes it live — called at boot AND after `audio.init()`
  (master gain exists only post-init).
- **Options + How-to-Play overlays** (`hud._buildOverlays`): live on `<body>` (class `.lswovl`, z62) because
  #hud (z20) stacks UNDER #title (z30). Reachable from the title top bar (⚙/❓) and the PAUSE MENU (ESC now
  opens Resume/Options/How-to-Play/Main-Menu buttons, not just a label). ESC closes an open overlay first
  (main.js routes before the pause toggle). **Onboarding**: how-to auto-opens once for new players
  (localStorage `threshold_howto_seen`).
- **Roster navigation** (`buildTitle`): filter chips (threat tiers · fliers/grounded · CUSTOM), sort
  (name/threat/power/hp/speed), live search, "n / N weapons" count, arrow-key card navigation + Enter to
  start. Stat bars/attr rows/threat badge all carry native `title` tooltips explaining what they do.
- **THE TUTORIAL IS A GTA3-GRADE GUIDED FIRST HOUR (2026-07-24)** (`engine/tutorial.js` rebuilt;
  hud `#hTut` gains `#hTutAct` kicker + `#hTutDist` live metres): FOUR ACTS, every step still
  `check(f, game, S, dt)` against REAL inputs. ACT I WEAPONS CHECK (the 12 control steps) ·
  ACT II THE STREET (objective MARKER — one pulsing gold ring mesh, tutorial-owned, `heightAt`-
  pinned, distance on the banner; reach it, HOIST a car/tree, HURL it, break a structure) ·
  ACT III THE LAW (**`police._forced = true`** lets the response run inside the Danger Room —
  get flagged, survive 12s of responders, then GHOST: heat is CLAMPED to 90 on ghost entry so
  the decay lesson is ~45s however wild the rampage got — the lesson is the loop, not the
  sentence) · ACT IV GRADUATION (spawns SARGE, KO him clean). Acts announce + feed TREATY
  OFFICE lines; steps auto-skip via `enabled(f)`; completion = `sting.victory` +
  `threshold_tutorial_done`. Headless-verified all 20 steps end-to-end (cops genuinely
  dispatched in training, ring visible, decay ran, done-flag set). `runSlot` still stamps
  `f._slotUse[key]` as the universal "slot used" signal.

## Modes, progression & local multiplayer
- **Modes** (`MODE_IMPL` in `game.js`, metadata in `data/modes.js`): duel / survival / rumble / training, each with
  `setup/tick/onKO/isOver/hud`. `game.startMode(id, {p1,p2,twoPlayer})` clears + spawns humans + calls setup. `update`
  runs `mode.tick`, checks `mode.isOver` → `endMatch(result)` → `hud.showEndScreen` (Rematch→re-enter cfg, Menu→title).
  `game._lastCfg` holds the last config for rematch. Survival wave enemies get `noRespawn` (entity `_remove` → spliced).
- **Progression**: fighters have `level/xp/xpNext/levelMult/score/kills/streak/lastHitBy`. `handleKO` (in the KO detection)
  attributes the kill via `lastHitBy` (<4s), scores + streaks, `grantXp`→`levelUp` (levelMult folds into `powerBuff`;
  cap 10). `onHit` grants XP for damage. `announceKill` → First Blood / multi-KO / streak titles via `hud.announce`.
- **Players**: `game.humans = [{fighter, scheme:'kbm'|'pad'}]`; `game.player` = humans[0]. `controlPlayer` (P1 kbm; ignores
  pad when 2 humans via `NULL_PAD`), `controlPad` (P2). `followHumans` fits both (`world.setBaseZoom`). Vision unions humans
  (`_humanSees`, fog shader gained `uP2/uHas2` for a 2nd reveal bubble). **LAN-ready** via this abstraction; netcode = TODO.
- **HUD**: `updateModeBar` (per mode.hud type), `updateKitWidget` (per-hero chips: drones/constructs/phase/buff/beam/…),
  level badge + XP bar, `announce`, `scorePopup`, `showEndScreen`. Title = mode cards + 1P/2P + P1/P2 char select.

## Destructible environment (GeoMod-lite)
- **Ground craters**: ground is a subdivided `PlaneGeometry(_,_,112,112)`; `world.crater(cx,cz,r,depth)` displaces verts
  (local +z → world +y) into a bowl+rim, accumulates into `_gh`, **clamped [-6.5, 1.4]** (the "limit"), then
  `computeVertexNormals`. ⚠️ recompute is the cost — **gated to big hits only** (`worldImpact`: power≥1.25 || radius≥14),
  so per-projectile impacts don't recompute. ~0.39ms/frame with it live.
- **Destructible blocks**: each cover has `hp/maxHp` + a `crack` overlay mesh (`_crackTexture`, opacity = damage).
  `game.damageBlock(c,amt,pos)` → cracks + dust; at 0 → `shatterBlock` (debris chunks tween, dust, scorch, mini-crater,
  block sinks & hides). `world.removeBlockFromCover` splices from `cover` (kept in `coverAll`) + `refreshFogBoxes` so
  collision/LOS/vision/fog all drop it. Sources: `areaDamage`→`worldImpact` (all explosions), knockback-into-wall in
  `entity._physics` (spd>34 cracks it + bounce), sustained beams chip the blocked cover, beam-clash `_overpower`.
- **Reset**: `world.resetTerrain()` (restore all `coverAll`, flatten `_gh`) + `vfx.clearScorches()` in `startMatch`.
  Shattered meshes are hidden, NOT disposed, so reset restores them.

## Field of vision (fog of war)
- **Shader fog** (`world._buildFogOfWar` / `updateFog`): a ground plane whose fragment shader darkens outside a vision
  cone (`uDir`,`uCos`,`uRange`) + near bubble (`uNear`), with **per-fragment wall occlusion** (cover boxes passed as
  `uBoxC/uBoxH` uniforms, 2D segment-AABB `segBox`). Follows `player.aim`. `setFogEnabled` off in menus.
- **Player vision** (`game.updateVision`, params `visNear/visRange/visCos/visReveal`): each enemy's `_vis` lerps to
  visible?1:0 (cone+range+`canSee` LOS, OR near radius, OR `_bright` reveal-on-attack). `obj.visible` cutoff at 0.35.
  Transitions: `_revealFx` ring on appear, `_lastKnown` (fading ghost + red "?" sprite) on disappear.
- **Integration**: `pickTarget` skips foes with `_vis<0.4`; red-triangle hidden when hardLock unseen; HUD foe-bar tracks
  the visible locked/soft target. `canSee(a,b)` = no cover box on the XZ segment (skips blocks both are above).
- **Bot senses — THE HONESTY LAW** (`ai.js`, rebuilt 2026-07-23): a bot may act ONLY on what it has earned.
  ⚠️ The old blind branch fell back to `real.pos` — the target's LIVE position — whenever memory expired, so a
  bot that had never seen you still walked straight at you ("they always know where I am"). Two more leaks went
  with it: `out.fly` read your true altitude while blind, and `controlBot`'s `aim3` fell back to
  `nearestFoe`, tracking a body through walls. **Never read a foe's position outside the `sees` branch.**
  · **BELIEF** (`ai.belief = {x,z,y,src}` + `_mem`) is the only knowledge: `sight` (4s, exact) ·
  `radio` (3s, ±6u) · `noise` (2.2s, fuzz scales with distance). `remember()` refuses to overwrite a better
  source with a worse one.
  · **HEARING** — `game.noise(pos, loud, src)` broadcasts from explosions (`worldImpact`, loud≈0.9+power),
  solid hits (`onHit` ≥10 dmg) and KOs (2.2). Bots hear within `hearRange × loud` and remember a JITTERED
  point — far bangs give a vague bearing. This is how fights find each other now; a loud fighter draws a crowd,
  a quiet one can slip a block over and vanish.
  · **SQUAD RADIO** — `_callOut` (~2 Hz): a bot with eyes on the foe pushes the position to living allies
  within 160u (`ai.radio`). Earned by one pair of eyes; makes 2v2 / police responses act like a unit.
  · **SEARCH** (`_searchGoal`) — walk the lead → on arrival with nothing, the trail goes COLD (`_mem = 0`) →
  sweep near the last lead (55u) for ~9s → then patrol the district. Eyes SWEEP while searching (`_scanA`
  oscillates the aim off the travel path), which is what makes juking and holding still actually work.
  · **AWARENESS pays**: `sheet.visMult` scales `seeNear/seeRange/seeCos/hearRange` — the tabletop attribute
  now buys real perception. Flashbang clears `belief`+`_patrol` (total disorientation).
  Verified: hidden+silent player never found (537u → closest 363u, 0 sightings); explosion heard instantly →
  investigated → sighted; break LOS mid-fight → lost at 2.8s, searched last-known, reacquired at 9.1s;
  duels still engage in 0.5–1.9s and resolve normally.
- **THE FAIRNESS LAW** (`ai.js`, 2026-07-23): honest knowledge wasn't enough — the bots still *felt* like
  cheaters because they had superhuman HANDS. Three fixes, all scaled by `ai.level` so **difficulty buys
  skill, never certainty**:
  · **Finite turn rate** (`_turnToward`, ~2.1–2.9 rad/s from AGILITY + level). Aim used to SNAP 180° in one
    frame, so flanking was impossible and the vision cone was decoration. Now the head is a neck.
  · **Imperfect aim** — a slow random walk (`_wander`, not per-frame noise, which reads as a laser with
    static) plus distance-scaled spread and imperfect target LEADING (`out.aimAt`). ⚠ `controlBot` must aim
    at `it.aimAt` (what the bot BELIEVES), never `target.pos` — aiming at the true body centre is an aimbot.
  · **Reaction time** — `reflex` (0.34/level, min 0.11s) gates BOTH acquisition (`_acq`: eyes-on ≠
    trigger-ready, and it must actually be facing you — `aimed.onTarget`) and defence (`_threatT` in
    `controlBot`: a threat must persist for `reflex` before it may block/juke, so feints and fast openers
    work).
  Measured: circle-strafing at run speed leaves the bot 4.4° behind on average (it tracks you, and still
  killed the orbiting test player), but tight orbits and forced repositioning open 170°+ breakaways —
  flanking is a real tactic. Mirror matches prove the ladder: rookie(0.6) vs elite(1.8) = 0–3, even(1.2) =
  2–2. Duels still first-blood in 2.4–3.3s; rumble 6 KOs/40s.

## AI, targeting & 3D aim
- **AI styles** (`ai.js`, profiles in `characters.js → ai:{style,range,aggro,fly}`): rusher/beamer/artillery/zoner/
  bruiser/trickster/grappler/summoner. `pick()` chooses abilities by style+range; reactive: transform-when-low,
  phase/blink-escape, grapplers grab (via controlBot melee), summoners kite. Bots **fly up** at airborne foes
  (`out.fly` from height delta × `flyTend`). `intent()` returns `{move,aimDir,slots,fly,target}`.
- **3D aim** (`Fighter.aim3`): attacks angle up/down to the target's height. Beams (`BeamHose.dir` 3D, `lerp`-steer,
  3D segment-distance damage), projectiles/volley/charge use `aim3`. Set in `controlPlayer`/`controlBot`.
- **Hard-lock targeting**: click a foe → `game.hardLock` (red-triangle sprite, `_buildLockMark`); **facing follows the
  lock, aim3 follows the mouse** (decoupled). `T` clears. Gold reticle = mouse soft-target (shows where attacks go).
  Reset `hardLock` in `startMatch`.

## Beam battles & ki budget
- **Clash** (`projectiles._beamClash`): opposing sustaining beams that face each other form a struggle point;
  `_clashT` slides toward the weaker (weakness = `beam.clashPower()` = `might × powerBuff × (0.35+0.65·ki/maxKi)`).
  At t≤0.06 / ≥0.94 the loser is **overpowered** (`_overpower`: big explosion + heavy hit). Beams pin their tip at
  the clash via `clashLen`. Both burn extra ki while clashing.
- `beam.might` set in `spawnBeamFor` = `(def.might||dps/50) × charge × caster.def.beamMight`. `beamMight` on
  SOL/KANO/VEGA/NOVA/APEX (shown as "Beam Master" tag). Base ki regen lowered to 9/s so beams are a real budget.
- Beams pass `{src, dot}` so **Guard blocks them** (50%, slow guard-meter drain) and they shove physically.
- AI (`controlBot`): `incomingBeam`/`incomingProjectile` → **guard**, or **counter-beam** (`_forceBeam` holds a beam
  slot → creates a clash). ⚠️ AI reaction fields (`_forceBeamT` etc.) MUST init to 0 in the Fighter ctor — the logic
  compares `<= 0`; undefined breaks it. Arena is now **175** (`world.ARENA`) with extra cover.

## Ragdoll, models & combat UI (Goal 9)
- **Ragdoll** (`engine/ragdoll.js`): on `_ko()` a fighter becomes a **verlet ragdoll** — 15 point-masses at the
  joints (head/chest/pelvis, 2-seg arms, **2-seg legs with a knee**: hip→knee→foot), distance-constraint bones, gravity (`-62`, matches world),
  ground + cover collision, per-joint ground radius (`GROUND_R`), settle-to-**sleep**. Launch impulse = the killing
  blow's `this.vel` + a pop + a somersault spin. **Integration trick (no reparenting):** during ragdoll the arm/leg
  **pivots are zeroed** so their child capsules live in the root group's local space; with `g.rotation=0`, a mesh's
  local transform = world − `g.position`, so every limb is driven in world space directly. `apply()` drives the meshes;
  `restore()` puts the exact snapshotted transforms back on respawn (`_updateKO`). `game.handleKO` adds KO slowmo +
  banner. ⚠️ **rig contract**: arms index `arm.children[0..2]`=upper/fore/fist; **legs expose parts by name on
  `legL/R.userData` = {thigh, knee(group), shin, boot}** (the ragdoll zeros the knee groups too). New model details
  must mount on the DRIVEN meshes (head/torso/arm/thigh/shin), never as extra pivot children.
- **Models** (`figure(def)` in `entity.js`, flourishes in `BUILDS` keyed by id): better anatomy (neck, deltoids,
  jaw, faceted glove-fists, **two-bone legs with a knee** — hip cap + kneecap + boot/toe), a soft **contact-shadow** disc (`parts.shadow`, driven each frame — sinks/
  fades with altitude), and per-hero silhouette flair — **helmet/visor/crest/pauldrons(×1-2)/gauntlets/collar/headband/
  belt** — all mounted on driven meshes so the ragdoll carries them for free. NO PURPLE (accents are each hero's palette).
- **Combat UI** (`hud.js`): **radar/minimap** (`updateRadar`, top-right canvas — arena + cover + gold player marker +
  vision wedge + red foe dots + fog "?" at `_lastKnown`; hidden when `!(g.mode && g.running)`); **hit-direction** red
  edge arcs (`hitDirection(srcPos)`, fired from `game.onHit` when a human is struck); **low-HP danger** pulse (red
  vignette < 28% HP); **KO banner** (`showKO`, big gold "K.O."/"DOWN" + name, from `game.handleKO`). Ability chips keep
  the `.cd` height-fill cooldown overlay.

## Rendering & performance
- **Pipeline** (`world.js`): `EffectComposer` on an **HDR** RT (`HalfFloatType`, MSAA `samples:2`) → `RenderPass` →
  `UnrealBloomPass` → `OutputPass` (ACESFilmic tone-map, `exposure 1.28`). Renderer AA is **off** (`antialias:false`) —
  the composer RT does the MSAA, so canvas AA was pure waste. `stencil:false`. Pixel-ratio capped at `min(dpr, 2)`.
- **Bloom is half-resolution**: `UnrealBloomPass(new Vector2(w*0.5, h*0.5), 0.66, 0.6, 0.8)`; `resize`/`_applyQuality`
  keep it at half the RT size. Bloom is the priciest pass — half-res is ~4× cheaper for a look you can't tell apart.
- **Adaptive quality** (`render()`): frame-time EMA (`_ema`) drives 3 tiers — `_ema>24ms` drops a tier, `<13.5ms` raises.
  Tier sets pixelRatio (t2 = maxPR, t1 = 1.0, t0 = 0.72) **and** bloom strength. So it degrades gracefully on weak GPUs
  and stays crisp on strong ones (RTX 4090 → tier 2, ~2ms/full-render, locked 60). `get fps` for HUD/telemetry.
  ⚠️ In a **headless/backgrounded** tab, RAF throttles to ~10fps → EMA reads ~98ms even though a sync `composer.render()`
  is ~2ms. That is a compositor artifact, NOT the pipeline; measure real perf in a foregrounded tab (in-app pane = 60).
- **Lighting**: hemi (sky `#bcd4ff` / ground `#43352a`) + soft ambient + warm key **sun** + a cool back-**rim** light
  (`#8fb8ff`, so figures separate from the dark floor) + a warm fill kicker. Characters read as lit volumes, not flat.
- **Environment**: gradient **sky dome** (`_buildSky`, BackSide shader, dark zenith → warm horizon glow, `renderOrder -1`);
  richer ground (`_gridTexture`: checker + soft grid lines + tech corner ticks, `anisotropy 8`); a gold **center glow**
  (`_radialTex` additive `CircleGeometry`) grounds the arena; `FogExp2` haze + a CSS **vignette** (`hud.js`) frame it.
  ⚠️ Robert's early feedback was **"too dark"** — the vignette only darkens the corners; keep the action area bright.

## Status
Engine + roster + melee complete & verified: **14 kits** all fire without error; live AI combat, beams,
Nova Burst shockwave+lightning, star spheres, teleport, summons, cursor constructs, flight, **the Strike/
Guard/Grab trifecta (with teleport-escape, energy-phase, thorns, absorb-throws)**, soft lock-on reticle,
floating damage numbers, combo counter, guard meter, pause — all working. Scene brightened; beam blobs tamed.
**Visual overhaul + optimization** (Goal 8): HDR half-float composer, half-res bloom, adaptive resolution, rim
lighting, gradient sky dome, gold center glow, richer ground, vignette, tuned tone-mapping — richer AND faster
(no wasted canvas AA, ~2ms/full-render on a 4090, 60fps).
**Ragdoll + models + combat UI** (Goal 9): verlet ragdoll on KO (tumbles, settles flat & natural, respects fog,
sleeps), upgraded per-hero models (helmets/visors/crests/pauldrons/gauntlets/capes + contact shadows), and a
gamified HUD (radar/minimap, KO banner + slowmo, hit-direction arcs, low-HP danger pulse).
**Knees + flight** (Goal 10): two-bone legs with a real **knee** (bends in the run cycle ~68°, snaps straight on kicks,
crouches on hard landings, and bends in the ragdoll); **fixed flight** into a proper levitation model — hold SPACE to
rise, release to **hover** (gentle bob, no coast), CTRL to descend, clean auto-land; flying pose leans + trails the legs.
Re-verified: all 14 kits fire, all 4 modes run, ragdolls (with knees) fire in live combat, flight rises/hovers/lands,
0 console errors, ~5.4ms/frame.
**Combat identity** (Goal 13): charged melee (jab/straight/HAYMAKER + guard crush + punishable jabs),
Overdrive comeback attribute (drained fists refill ki, HUD "⚡ OVERDRIVE" window), guard TYPES with a
visible guard arc (deflect bounces bullets back — deflector-vs-gunman; barrier blocks 360° on ki),
Strength stat (kb resist / melee scale / ice break-outs), freeze-encase state, DoT stacks, KIVULI
(Ugandan gas controller — crimson-rose per the no-purple rule; hexes flippable) + GALE (archer,
draw-scaled real arrows, poison/flame/explosive quiver), grass (2400 instanced blades that burn away
under craters/scorch and restore on reset), LeFevre threat badges + Strength on select, guard on
C/X/Mouse4-5, 4 design docs. Verified: 20 kits error-free, every mechanic unit-tested, 60s 7-fighter
soak clean, sim 0.64ms.
**Creative expansion** (Goal 12): slam physics (wall/ground/border damage when launched — never self-inflicted),
KRAKEN (verlet tentacle grappler: seize → drag → wall-slam), RIFT (Portal-style orange/blue door pairs that
teleport fighters AND projectiles), TITAN (metal robot: pulse rifle, twin cannon, spark-on-hit, thruster exhaust),
SARGE (human arsenal: auto carbine, hand cannon, plasma blade, riot shield guard, frag grenades, Combat Leap,
Airstrike), VOLT reworked into a true speedster (Mach Sprint ghosts through cover w/ blue lightning wake, 12-hit
flurry), Will Fist grab→hoist→pile-drive, visible power tiers (aura color ladder + widening HUD meters + TIER
announcements), arena 175→240 with far-field cover. Verified: 18 kits error-free, all new mechanics unit-tested
headless, 45s mixed-roster soak clean.
**Evade + energy clarity + perf pass** (Goal 11): per-hero double-tap evade (dash/blink/sprint/slide/phase, data-driven,
bots juke with it too); loud drained/denied energy feedback (see Energy clarity above) — fixed the silent beam-death and
frozen-orb-when-dry bugs; perf issues #1–#3, #5–#10 closed (particle upload range + pool shrink, shared projectile/beam/orb
geometry, camera-following 110-unit shadow frustum, hidden crack overlays, alloc-free control/lightning/screenToGround,
dirty-checked HUD widgets, 25Hz radar, shader prewarm, no getComputedStyle in the loop). Sim CPU −77%, HUD −84%.
Re-verified: 14 kits × all slots error-free, 45s AI-vs-AI soak clean, double-tap works through real key events.
Reference shots: `lsw-title.jpeg`, `lsw-kano2.jpeg`, `lsw-bigbang2.jpeg`, `lsw-visuals-arena4.jpeg` (Goal 8 look),
`lsw-models.jpeg` (upgraded heroes), `lsw-ui2.jpeg` (combat HUD + KO banner), `lsw-ragdoll-final.jpeg` (settled ragdoll).

**ORIGIN character creator** (Goal 14): the D&D-for-superheroes payoff. Point-buy budgets (STREET→COSMIC
+ UNBOUND), attributes on the rank ladder deriving real engine stats, ~40 engine-proven powers with LIVE
damage numbers on every pick, gifts/talents/gadgets/frames/palettes/voice, auto-computed LeFevre threat,
SAVE & TEST straight into training. Customs persist in localStorage and are full roster citizens (playable,
rivals, survival waves, P2) with kit-derived AI doctrine. Verified headless end-to-end: API + real-click UI
drive, every slot fired error-free on a custom kit, save/reload/delete clean, STREET-vs-COSMIC duel stayed
honestly lopsided, production build passes, sim still 0.64ms/frame.

## Next / open
- Models are now upgraded procedural figures with per-hero flourishes (`figure()`/`BUILDS`) + ragdoll; GLTF still an
  option later but the offline procedural path is the product default. Versus mode. Ring-out KOs. Netcode (LAN-ready).
- Number keys only reach heroes 1–10; TORCH/APEX/SPECTER/VANGUARD are TAB-only for now.
- Ragdoll tuning knobs live in `ragdoll.js` (masses in `REST`, brace stiffness in `BONES`, `GROUND_R`, sleep threshold).
