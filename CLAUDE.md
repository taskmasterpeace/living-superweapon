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
  cities generate on the SAME sectional grid as the flagship (96u `CELL`s + 22u streets — the ground
  texture draws one road ring per cell, `repeat.set(N,N)`). `generatePlan(city, seed)` sizes the grid
  by popType (Village/Small Town 3 → Town/Small City 4 → City/Large City 5 → Mega 6 = arena 288),
  places IDENTITY tiles first (seaport/resort hug the east water column, political takes the center,
  military/mining cluster at edges, campus pairs, corporate core), fills with commercial/residential
  + parks, and caps STRUCTURAL cells at 24 (`STRUCT_CAP`, matches fog MAX; overflow → plaza).
  **Tiles**: 13 types × 2–3 variants (residential courts/L-blocks/towers-in-park · commercial ·
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
- `data/characters.js` — the **52** heroes as **pure data**. Add a hero = add data here. Trait fields:
  `thorns` (hurt grabbers), `phase` (intangible), `grabHeal`, `teleEscape` (auto), `metal` (robot),
  `guardStrong` (riot shield), `tentacles` (verlet tentacles), **`strength` 1–10** (melee dmg up,
  knockback/beam-shove down via `kbMul`, faster ice break-outs), **`overdrive`** (comeback: drained/low-ki
  melee hits convert damage→ki in `game.onHit`), **`threat`** (LeFevre scale, shown on select),
  **`guardType`** `'block'|'deflect'|'barrier'`, **`meleeTiers`** 2|3, `frostResist` (fire heroes).
- `engine/abilities.js` — `TYPES` registry (20 power types incl. `tentacle`, `portal`, `rifle`, `bow`,
  `quiver`). New *kind* of power = one entry.
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
- **Interactive tutorial** (`engine/tutorial.js` + hud `#hTut` banner): LEARN TO PLAY watches REAL
  inputs — 13 steps (move · LMB · RMB · jab · haymaker · guard · grab · evade · fly · land · gadget ·
  ult · KO a bot), each `check(f, game, S, dt)` reads live fighter state; non-applicable steps
  (no flight / no gadget) auto-skip via `enabled(f)`. Runs in a calm Danger Room
  (`training` setup skips the rival when `o.tutorial`). Entry: title 🎓 button, HOW-TO overlay's
  "learn by doing" funnel, `hud.onTutorial`. Held power types (cone/phase/lifedrain) leave no
  cd/sustain trace, so `runSlot` stamps `f._slotUse[key]` on any real press/hold — the tutorial's
  (and future telemetry's) universal "this slot was used" signal. Completion sets
  `threshold_tutorial_done` + announces. Headless-verified all steps end-to-end via `LSW.tutorial`.

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
Big Bang shockwave+lightning, spirit bombs, teleport, summons, cursor constructs, flight, **the Strike/
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
visible guard arc (deflect bounces bullets back — Superman-vs-Punisher; barrier blocks 360° on ki),
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
