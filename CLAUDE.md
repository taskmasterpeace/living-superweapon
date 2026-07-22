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
- `data/characters.js` — the **14** heroes as **pure data**. Add a hero = add data here. Trait fields:
  `thorns` (hurt grabbers), `phase` (can go intangible), `grabHeal` (lifesteal throws), `teleEscape`
  (auto-derived from any teleport slot).
- `engine/abilities.js` — `TYPES` registry (15 power types incl. `phase`). New *kind* of power = one entry.
- `engine/melee.js` — `MeleeSystem`: Strike/Guard/Grab trifecta. Called from `controlPlayer`/`controlBot`
  (keys V/G/C) and per-frame via `melee.update(f,dt)` inside `Fighter.update`.
- `engine/game.js` — orchestrator + combat helpers + **`onHit(target,amount,opts,blocked)`** (every hit
  routes through here → damage numbers, combo, sparks) + soft lock-on (`pickTarget`, `updateReticle`).
- Player and AI both emit an **intent** `{move, aimDir, slots:{key:{pressed,held,released}}, fly}`
  routed through the same `runSlot`. Keep that symmetry.
- Controls: WASD move · mouse aim (**hover a character to target it**, else nearest-to-cursor) · LMB/RMB/Q/E/F/R
  powers · **V strike · G grab · C guard** · SHIFT dash · **SPACE fly** (hold = rise, release = **hover/levitate**,
  land by descending) · **CTRL descend** · ESC pause · 1–0 swap · TAB roster · B rival.
- **Flight / levitation** (`entity._physics`): `flyHeld` rising-edge takes off into `this.flying` (gravity suspended).
  While flying: hold `flyHeld` → rise (`FLY_RISE`), `descendHeld` → sink (`FLY_SINK`), neither → **hover** at altitude
  with a gentle bob. Releasing rise clamps the upward coast so you settle where you let go. Descending onto the ground
  (or a block top, if `descendHeld`) exits flight = lands. `grounded` = `!flying`. Player descend = Ctrl/Z, pad L3.
  AI descends by setting `descendHeld = flying && !it.fly`. Knockback still arcs under gravity (flight is opt-in only).
- **Gamepad** (`core/gamepad.js`, `game.pad`): standard/PS2 mapping — sticks move/aim, R2/L2 powers, □○ melee,
  L1 guard, ✕ fly, △ ult, dpad Q/E/F + swap, Start/Select pause/roster. Polled at top of `game.update`;
  `controlPlayer` ORs pad + keyboard/mouse; Start/Select/swap handled in `main.js padSystem()`.
- **Physics**: AABB (Box3) collision vs cover in `entity._physics` — walls push out (least-penetration axis) and you
  **stand on block tops** (`onBlock` → `grounded`); `game.resolveBodies()` separates overlapping fighters.
  Cover carries `{x,z,hx,hz,top}` (construct walls fall back to `r`/`h`).

## Hard rules (do not break)
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
- Guarding slows you and doubles as a ki-charge stance. `guardMeter` breaks → 0.7s stagger.
- Variants live on the def: `thorns`, `phase`, `grabHeal`, `teleEscape`. Keep the escape a FRONT-grab only.

## Presentation
- **Roster screen** (`hud.buildTitle` + exported `heroStats(def)` + `describeAbility`): per-hero stat bars
  (Power/Range/Mobility/Defense/Health/Energy, derived 0–10), trait tags, full ability list with generated
  descriptions; roster cards show HP·PWR·SPD. Same screen serves title + in-match TAB.
- **Violent hits**: `vfx.impact(pos,dir,{color,power})` = comic impact-star (`impactStar`, canvas sprite) + spray +
  ring + shake. Strikes/heavy-melee/throws freeze BOTH fighters (`hitstop`), `game.slowmo(dur,mul)` on finishers,
  `hud.flashScreen(color,dur)` white pop, `audio.impact(power)` thud+crack. Blocked hits get a small blue star only.

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
- **Bot vision** (`ai.js`): `seeNear/seeRange/seeCos` cone off `bot.aim` + `game.canSee`; 4s memory (`_mem`,`_ls`).
  Sees → attack; blind → **hunt toward last-seen (juke window) or the foe's area**, never attack. Keeps bots lethal but
  juke-able. ⚠️ needed `damp` imported in game.js.

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
Reference shots: `lsw-title.jpeg`, `lsw-kano2.jpeg`, `lsw-bigbang2.jpeg`, `lsw-visuals-arena4.jpeg` (Goal 8 look),
`lsw-models.jpeg` (upgraded heroes), `lsw-ui2.jpeg` (combat HUD + KO banner), `lsw-ragdoll-final.jpeg` (settled ragdoll).

## Next / open
- Models are now upgraded procedural figures with per-hero flourishes (`figure()`/`BUILDS`) + ragdoll; GLTF still an
  option later but the offline procedural path is the product default. Versus mode. Ring-out KOs. Netcode (LAN-ready).
- Number keys only reach heroes 1–10; TORCH/APEX/SPECTER/VANGUARD are TAB-only for now.
- Ragdoll tuning knobs live in `ragdoll.js` (masses in `REST`, brace stiffness in `BONES`, `GROUND_R`, sleep threshold).
