# THE SYSTEM MAP — what exists, what you call, and what constrains it

**Why this file exists.** Robert, 2026-07-26: *"I would like to have been able to just say what I
wanted and it automatically know — OK, well that ties this in with this system and this system and
maybe even a little bit of this system."*

That is a routing problem, and routing needs a map. Without one, "which systems does this touch?" is
answered from whatever the assistant happens to remember, which is exactly how a feature gets built
beside an existing system instead of through it. This is the map. `wwa-feature` reads it.

**Three columns, and the third is the important one.** Anyone can find the file. What costs a day is
not knowing the *law* that constrains it — the choke point you must route through, the thing you must
never do twice, the honesty rule you must not break.

⚠ **Keep this current when a pillar moves.** A stale map routes confidently to the wrong place, which
is worse than no map. If you add a system, add a row.

---

## COMBAT

| System | File | The hook you call | The law |
|---|---|---|---|
| Damage | `engine/entity.js` | `f.takeDamage(amt, opts)` | **THE choke point.** Never subtract `hp` anywhere else. `opts.hitstop ?? 0.04`, never `\|\|`. Every hit has a `dtype`. |
| Hit feedback | `engine/game.js` | `game.onHit(target, amt, opts, blocked)` | Every hit routes here → numbers, combo, sparks. Sustained sources throttle their own tell. |
| Blocked strike | `engine/game.js` | `game.onBlockedStrike(a, b)` | Fired from the guard branch of `takeDamage` — ONE choke point, so it covers every present and future melee source. Never re-implement punishment per ability. |
| Melee trifecta | `engine/melee.js` | `melee.strike/guard/grab`, `melee.update(f, dt)` | Strike beats Grab beats Guard beats Strike. Reach comes from `data/martial.js`, never hard-coded. |
| Abilities | `engine/abilities.js` | `runSlot(f, key, inp, game)` | Fighter FIRST, game LAST. A new *kind* of power = one `TYPES` entry. |
| Ability registry | `engine/abilityMeta.js` | `TYPE_META[type]` | One registration point per type. 44 declared, 26 carried. |
| KO | `engine/game.js` | `game.handleKO(f, killer)` | Books Elo, XP, streaks, ragdoll, news highlight, trauma. `_controlled` fighters never book. |
| Status effects | `engine/entity.js` | `addDot · addFrost · addBleed · addSleep · addWound · applyStun · clearDot · clotBleed` | DoT ticks route through `takeDamage`. Never tick `hp` directly. |
| Damage types | `engine/entity.js` | `resistOf(def, sheet)` | **Two arguments, both matter.** A resistance must cut both ways. |
| Projectiles / beams | `engine/projectiles.js` | `spawnBeamFor`, `new Projectile(...)` | A beam is a STREAM of packets, never a cylinder. Blocking per segment, range as arc length. |
| Slam / throw | `engine/entity.js`, `engine/melee.js` | `game.onSlam`, `updateThrownBodies` | Gated on `launchT` — dashing into a wall yourself never hurts. |

## THE FIGHTER'S MIND

| System | File | The hook you call | The law |
|---|---|---|---|
| AI intent | `engine/ai.js` | `ai.intent(game, self)` → `{move, aimDir, slots, fly, target}` | Player and AI emit the SAME intent shape. Keep the symmetry. |
| **AI knowledge** | `engine/ai.js` | `ai.belief {x,z,y,src}`, `ai.remember(...)`, `ai._mem` | **THE HONESTY LAW.** Never read a foe's position outside the `sees` branch. `src` is `sight\|radio\|noise`. |
| Hearing | `engine/game.js` | `game.noise(pos, loud, src)` | The one broadcast. Explosions, hits ≥10, KOs, gunshots. Wildlife and the ambience director listen to it too. |
| Squad radio | `engine/ai.js` | `ai._callOut(game, real)` | Earned by one pair of eyes, pushed to allies within 160u. `_jammedT` suppresses it. |
| Search | `engine/ai.js` | `ai._searchGoal(game, dt)` | walk the lead → COLD → sweep 55u for ~9s → patrol. Eyes sweep while searching. |
| Fairness | `engine/ai.js` | `_turnToward`, `_wander`, `reflex`, `_acq` | Difficulty buys judgment, never physics. Aim at what it BELIEVES (`it.aimAt`), never `target.pos`. |
| Psyche | `engine/psyche.js`, `data/psyche.js` | `psyche.feel(f, event)`, `f.psyche.main` | Mood is a MULTIPLIER LAYER through existing choke points. Never a second combat system. |
| Drives | `data/psyche.js` | `DRIVE_WEIGHTS`, appraisal | An event is measured against what the person WANTS. Same punch → different emotion per personality. |
| Personality | `data/psyche.js` | 20 types → 5 targeting rules | Only ever chooses among foes it can actually SEE. Honesty outranks personality. |

## VOICE, SOUND, PRESENTATION

| System | File | The hook you call | The law |
|---|---|---|---|
| **Civilian / cop speech** | `core/soundscape.js` | `soundscape.say(pos, emotion, opts)` | Real formant synthesis, 10 emotional shapes, rate-limited ~130ms. `{radio:true}` routes through `audio.radioChain()`. **No fighter calls this yet.** |
| Comic balloons | `engine/comic.js` | `comic.say(fighter, text, {tone})` | 9 tones. The balloon is an SVG path built around the MEASURED text. Ticked from the HUD frame, never the sim. Cleared by `clearTransients`. |
| Ambience director | `core/soundscape.js` | `soundscape._direct(dt, game)` | 5 states QUIET→HUNTED. Escalate instantly, de-escalate on proof. |
| Sound effects | `core/audio.js` | `audio.sample(name, opts)` · `audio.sustain(kind, pos)` | Every attack is a RECORDING. Sustained sources loop and fade; discrete ones don't. **Audio must never throw into the game loop.** |
| Hero voice | `core/audio.js` | `audio.yell/grunt/cry` | Gated on `SETTINGS.heroVoice`, default OFF by ruling. Civilians keep their voices; the weapons don't. |
| VFX | `engine/vfx.js` | `vfx.impact/explode/shockwave`, `borrowLight/returnLight` | **Never change the visible light count at runtime.** Pooled lights are always visible; borrow only drives intensity. |
| Visual language | `data/visual.js` | `visOf(ability)` → 7 traits | No two powers may match on more than three of the seven. Check with `scripts/visual-collisions.mjs`. |
| HUD | `engine/hud.js` | `hud.feed/announce/damageNumber` | Dirty-checked widgets. Never `innerHTML` in the frame path. |
| News | `engine/newscrew.js`, `data/news.js` | `news.highlight(kind, pos)`, `buildReport` | Never a sync encode in the frame path. `revokeFrames` frees the URL **and** nulls the slot. |

## THE WORLD

| System | File | The hook you call | The law |
|---|---|---|---|
| City plan | `data/cityplan.js` | `generatePlan(city, seed, opts)` | Engine-agnostic, zero Three.js. Named RNG streams; per-cell rolls are position-seeded so an edit is LOCAL. |
| City build | `engine/world.js` | `world.rebuildCity(plan)` | `_teardownCity` must dispose per-city materials and PRESERVE the shared caches. |
| Roads | `data/cityplan.js` | `roadAt(...)`, `junctionAt(...)` | Roads are DATA, not a texture. **Nothing drives on them yet** — any traffic/approach code must query, never re-derive. |
| Terrain | `engine/world.js` | `world.heightAt(x,z)`, `crater`, `trench` | Physics reads `groundY`. A heightfield cannot fold over itself — no tunnels, no roofs. |
| Surfaces | `core/util.js` | `GROUND_LAYER`, `DECAL_LIFT`, `sinkSurface()` | Never invent your own small number. Audit with `world.auditSurfaces()`. |
| Pedestrians | `engine/pedestrians.js` | `peds.scare/blast/cheer`, `peds._sees` | One InstancedMesh. Witness triggers do real LOS. |
| Police | `engine/police.js` | `police.heatOf(f)`, `onCopDown/onCopHurt` | The villain is whoever hurts humans. The ladder tops out where the STATE runs dry. |
| Wildlife | `engine/wildlife.js` | `wildlife.scare(x,z,r)` | Ticked from `world.render()`, not `game.update` — the atlas tool has no Game. |
| Reset | `engine/game.js` | `game.clearTransients()` | **The ONE place that empties the board.** A new transient system goes here, not in a reset path. |
| Deferred work | `engine/game.js` | `game.later(fn, ms)` | Never a bare `setTimeout` for anything touching the fight. |
| Errors | `engine/game.js` | `game.reportError(err, where)` | Never `console.error` — a frame error recurs at 60Hz. |

## THE SHEETS (data joined onto the world)

| System | File | The hook you call | The law |
|---|---|---|---|
| Cities | `data/cities.js` | `cityList()` | **Fresh array per call** — `indexOf(object)` is always −1. Match on name+country. |
| Coordinates | `data/citycoords.js` | `CITY_LATLON[i]` | Index-aligned to `cityList()`. GeoNames CC BY — attribution is a licence condition. |
| Countries | `data/countries.js` | `countryOf(name)`, `canonCountry` | Returns null for unknown — every caller must fall back. `integrity` is HIGH = CLEAN. New aliases go in the base layer. |
| Relations | `data/relations.js` | `relationOf(a, b)`, `factionSplit()` | Symmetric by construction; joins 168/168. |
| Rank ladder | `data/scale.js` | `rankOf(def)`, `liftTonsOfRank` | One ladder, two front doors. A band's weight is the figure at its TOP rank. |
| Attributes | `data/ranks.js` | `deriveAttrs(def)`, `bakeSheet(def)` | `def.attrs` always wins. Age is a column shift applied BEFORE it. |
| Age | `data/age.js` | `ageMods`, `birthdayCrossings`, `riskOver` | Override is `def.age` or `def.born = {y,m,d}` — a STRING silently hashes. `riskOver` has no caller. |
| Medical | `data/medical.js` | `inflict`, `examine`, `chartOf`, `treat` | A hidden condition still BITES. The report never says how many were missed. |
| Career | `data/career.js` | `genSlate`, `resolveOffer`, `turnWeek` | Booking is engine-hooked (`game.onMatchEnd`), never button-hooked. |
| Firm | `data/org.js` | `found`, `seedCapital`, `firmNaming` | 46 states name the firm for you and say why. |
| Base | `data/base.js` | `siteSurvey(city, country)`, `jail` | The site is DERIVED from eleven sheet fields. Integrity cuts backwards. |
| Taxonomy | `data/taxonomy.js` | `coverage(roster, deadTypes)`, `nodeOf` | `e` means "a def could declare this today" and nothing weaker. |
| Armory | `data/armory.js` | `weaponById`, `gearById`, `LOADOUTS` | Every row is an existing engine type. Identity from the armory, numbers from the tuning. |
| Education | `data/education.js` | `applyResearch(f, owned, game)` | Effects are VERBS in a fixed vocabulary, never prose. |

---

## HOW TO USE THIS WHEN ROUTING

1. Find the **nouns** in the request. "Characters speak when they react to the environment" →
   *speech*, *react*, *environment*.
2. Look each noun up. Speech → `soundscape.say` + `comic.say`. React → `ai.js` states + `psyche`.
   Environment → `game.noise`, `world.districtAt`, `police.heatOf`, `peds`.
3. **Say out loud which of them already exist.** Most features here are 70% built already; the work
   is usually the connective tissue, not the system.
4. Read the LAW column before writing anything. Most of the expensive mistakes in this repo were
   routing through the wrong place, not writing the wrong code.
