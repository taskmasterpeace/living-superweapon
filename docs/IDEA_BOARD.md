# THE IDEA BOARD — five boards recovered from chat, 2026-07-27

*Recovered because `docs/LOST_AND_FOUND.md` §4.7 said two idea boards existed **in chat only** and
should be rescued "before the temp directory is cleaned". Five were found, not two.*

**Where these came from.** All five were rendered as assistant messages and never written to a file.
They were extracted from the raw session transcripts at
`C:\Users\taskm\.claude\projects\D--lsw\*.jsonl` — the recovered subagent outputs in
`docs/_recovered/` did **not** contain them (every board was generated inline, without a fan-out, on
a context budget; each board says so in its own preamble).

| § | Board | Issued | Ideas | Was it acted on? |
|---|---|---|---|---|
| §1 | **60 ways to make this a bigger game** — tournament · PUBG · Secret Wars · Kaiju · 2v2 | 2026-07-25 04:02 | 60 | **NO.** Twelve minutes later he said "push everything to main". Never mentioned again. |
| §2 | **Invincible-fan fit** | 2026-07-24 22:40 | 9 | **YES** — he picked #1 and #5 by number; became `SPEC_COMBAT_STATES.md`; four items shipped. |
| §3 | **An injury system with WWA depth** | 2026-07-24 22:58 | 5 | **YES** — shipped as the injury system, `COMBAT_MANUAL.md` §18. |
| §4 | **Wildlife from the city/country sheets** | 2026-07-25 15:13 | 60 | **PARTLY** — the wildlife layer shipped 07-25 and the calendar landed 07-26; the board's own top items did not. |
| §5 | **What to build next** | 2026-07-26 06:51 | 12 | **PARTLY** — several landed (the armory screen, the comic layer); most did not. |

## How to read this

- **The blockquote at the head of each board is Robert's, verbatim, typos included.** It is the only
  part of any board he wrote. The boards themselves were generated in response.
- **The tables are reproduced exactly as delivered.** Nothing is reworded, merged, dropped or
  "improved". Scoring legends differ per board because each board set its own.
- **`STATUS TODAY` blocks are mine, added 2026-07-27 during recovery**, and are kept *outside* the
  original tables so they cannot be mistaken for the board. Every claim in them was checked against
  the live source today; the grep is quoted where it matters. Only rows whose state is anything
  other than "unbuilt" are listed — silence means nothing exists.
- ⚠ **A board is not a plan and not a ruling.** These are options that were generated, scored, and
  in three of five cases never answered. Nothing here has been agreed.

---

# §1 · THE 60 — tournament, PUBG, Secret Wars, Kaiju, 2v2

**2026-07-25 04:02 · `/coach-ideas`.** This is the board `LOST_AND_FOUND.md` ranked as the most
important thing to recover. It is complete.

> we ned to make the tournament mode better...make sure we have brac. think kets,  with stats... and
> smash brothers like maps (keep our controls). make the map interacive...i thought of a pubg like
> mode.  think secret wars......I thought of team battles. image a 2 on 2. I thought of Kiju battles,
> i  want you to think creatively and come of with 20 ideas low code, 20 that would require new
> fearures or or other thing. think ourside of the box and 20 things that reqquire MAJOR changes

He had issued the same brief as a `/goal` twice already — **2026-07-25 00:29** and again **02:47**:

> make the tournament mode better...make sure we have brackets,  with stats... and smash brothers
> like maps (keep our controls). make the map interacive someone and destvicive.

---

## coach-ideas · 60 ways to make this a bigger game
**Target:** tournament depth · Smash-style interactive/destructive stages (our controls) · PUBG/Secret Wars · 2v2 · Kaiju
**Grounding:** scored against *this* codebase — every row names the system it rides on. `Imp` 1–5 · `Eff` h/d/w · `Risk` L/M/H · `Fit` 1–5 (no-purple, engine-is-the-product, data-driven).

### TIER 1 — LOW CODE (hours; existing systems, data + UI only)

| # | Idea | Imp | Eff | Risk | Fit | Rides on / catch |
|---|---|---|---|---|---|---|
| 1 | **RING-OUT KOs** as a mode rule | 5 | h | L | 5 | `ARENA` bounds + slam physics already exist · − needs a fair "off-stage" tell |
| 2 | **Bracket stat cells** (dmg dealt/taken, KOs, best hit, city damage) | 5 | h | L | 5 | per-fighter `stats` + `cityStats` already collected |
| 3 | **Stage select + strike/veto** each round | 5 | h–d | L | 5 | Atlas preview canvas + `generatePlan` seeds |
| 4 | **Pre-fight tale of the tape** per round | 4 | h | L | 5 | `tapeRows` + codex + `recOf().hist` head-to-head |
| 5 | **KAIJU flag** — `frameOf` scale override, giant vs 3 | 5 | h | M | 4 | `applyFrame` scales meshes not the group · − balance |
| 6 | **2v2 team stocks + team HUD** | 4 | h | L | 5 | formats 2v2 exist; `noRespawn` is the stock primitive |
| 7 | **Unstable-cover flag** → stages break fast | 4 | h | L | 5 | `damageBlock`/`shatterBlock` hp is per-cover data |
| 8 | **Per-match replays** kept on the bracket cell | 4 | h–d | L | 5 | news clips already recorded per match |
| 9 | Between-round **stats leaderboard** tab | 3 | h | L | 5 | same data as #2 |
| 10 | **Seeding reveal ceremony** | 3 | h | L | 5 | reuse opening director's `ladder`/`casefile` |
| 11 | **Announcer barks** (FINAL ROUND / RING OUT) | 3 | h | L | 4 | formant voice synth in soundscape |
| 12 | **Champion's belt** mesh on the reigning champ | 3 | h | L | 5 | `BUILDS` flag + `championId()` |
| 13 | **Rules presets** (casual/competitive toggles) | 3 | h | L | 5 | mode `o.*` flags |
| 14 | **Sudden death** on timeout (1 HP + closing ring) | 3 | h | L | 4 | rumble timer + a plan ring |
| 15 | **Stadium spotlight rig** for tournament theaters | 3 | h | L | 5 | stadium tile has floodlights |
| 16 | **Crowd hype meter** paying Elo/renown for flash | 3 | d | M | 4 | `peds.cheer` + parry/momentum events |
| 17 | Per-round **news kickers + rivalry callouts** | 3 | h | L | 5 | `writeBroadcast` kicker slot |
| 18 | **Walkout entrances** (name card + music) | 3 | d | L | 5 | opening director variants |
| 19 | **Team-up proximity buff** in 2v2 | 2 | h | M | 4 | `powerBuff` · − can snowball |
| 20 | **Stage of the day** (date-seeded plan) | 2 | h | L | 4 | deterministic city seeds |

> **STATUS TODAY (2026-07-27, added during recovery)**
> - **#1 RING-OUT — BUILT IN THE ENGINE, AND UNREACHABLE.** `game.checkRingOut` exists
>   (`game.js:659`, ticked at `:3568`) and `entity.js:1476` documents the border opening under
>   `game.ms.ringOut`. ⚠ **`ms.ringOut` is read at two sites and written at zero** — no mode, no
>   option and no card ever sets it. This is a finished, documented, tested feature with no switch.
>   Making #1 real is one flag write, not a feature.
> - **#2 BRACKET STATS — UNBUILT, and this was his explicit ask, twice.** `hud.showBracket`
>   (`hud.js:400`) renders seed · name · YOU chip · Elo · best-of-3 score. No damage, no KOs, no best
>   hit, no city damage. The data is already collected per match (`stats`, `cityStats`).
> - **#6 2v2 — PARTIAL.** `Tournament` supports `'2v2'` duos and `'1v2'` underdog, and `noRespawn` is
>   set on the player and their ally during a tournament round (`game.js:1961`, `:1966`). There is no
>   team HUD and no stock count.
> - **#12 CHAMPION'S BELT — the button says it, the mesh doesn't exist.** `showBracket` already ends
>   with `🏆 TAKE THE BELT`; there is no `BUILDS` flag for one.
> - **#16 CROWD HYPE — the donor exists.** `peds.cheer` is wired into `handleKO` for a clean KO. No meter.
> - **#4 / #17 — the donors exist.** The news desk writes a tale of the tape and a kicker per match
>   already; neither is per-round on the bracket.
> - Everything else in Tier 1: **UNBUILT.**

### TIER 2 — NEW FEATURES (days; new system on proven machinery)

| # | Idea | Imp | Eff | Risk | Fit | Rides on / catch |
|---|---|---|---|---|---|---|
| 21 | **FLOATING STAGE type** + one-way soft platforms + void KO | 5 | d–w | M | 5 | needs a platform branch in `_physics` (pass-up, land-on) |
| 22 | **SECRET WARS** — shrinking Beyonder zone BR in a real city | 5 | w | M | 5 | crater/trench can *delete* terrain; AI needs zone fear |
| 23 | **Destructible + REGENERATING platforms** | 5 | d | M | 5 | `shatterBlock` already hides-not-disposes → rebuild timer |
| 24 | **KAIJU MODE** proper (stomp, breath, city as the ring) | 5 | w | M | 5 | weight ladder + police/military tiers already scale |
| 25 | **Hazards as data** (lava, rails, crushers, wind, current) | 4 | d | M | 5 | `waterAt` drag is the force-field precedent |
| 26 | **Kinematic platforms** that carry fighters | 4 | d | M | 5 | `world._spinners` generalizes |
| 27 | **Arena authoring in ATLAS** (an `arena` plan type) | 4 | w | M | 5 | editor + layouts + JSON already ship |
| 28 | **Team AI doctrine** (focus fire, cover, saves) | 4 | d | M | 5 | `ai.radio` squad comms exist |
| 29 | **16-side bracket, groups + double elim** | 4 | d | L | 5 | `Tournament` class is 8-seed single elim |
| 30 | **Spectator mode** for sim matches (news camera) | 4 | d | L | 5 | crew POV renders already |
| 31 | **Interactive props** (cannons, ziplines, glass floors) | 4 | d | M | 5 | carry/throw + cover registry |
| 32 | **Kaiju as a career CITY EVENT** | 4 | d | M | 5 | THE CIRCUIT offer kinds are a table |
| 33 | **Stock + percent-knockback ruleset** toggle | 4 | d–w | M | 4 | − a second damage model to balance |
| 34 | **Secret Wars loot crates** | 3 | d | L | 5 | gear drops/pickups/proficiency shipped |
| 35 | **Season structure** + playoffs + champion wall | 3 | d | L | 5 | book already has `season` |
| 36 | **Gauntlet** — endless bracket vs escalating seeds | 3 | d | L | 5 | sim + Elo |
| 37 | **Draft / pick-ban** for 2v2 | 3 | d | L | 4 | registry cards |
| 38 | **Environmental supers** (ride the crane, wrecking ball) | 3 | d | M | 5 | prop weight system |
| 39 | **Arena ambience + chants** | 3 | d | L | 5 | soundscape layers |
| 40 | **Handicap / mirror / hazards-off** options | 2 | h–d | L | 4 | mode flags |

> **STATUS TODAY**
> - **#30 SPECTATOR — the function exists, nothing calls it.** `game.spectate()` and
>   `cycleSpectate()` live at `game.js:678–689` (they even write a feed line) and have **zero call
>   sites** — no key, no menu, no mode. Same shape of gap as #1.
> - **#26 KINEMATIC PLATFORMS — the donor is real.** `world._spinners` is ticked in `render()` and
>   already turns the funfair wheel. Nothing rides anything.
> - **#28 TEAM AI — the donor is real.** `ai.radio` / `_callOut` push a believed position to allies
>   within 160u. There is no focus-fire or save doctrine.
> - **#34 LOOT CRATES — the whole gear economy shipped** (drops, pickup priority, `weaponProficiency`,
>   disarm-by-grab, `COMBAT_MANUAL.md` §16). A crate is a spawn table on top of a finished system.
> - **#31 INTERACTIVE PROPS — the weight ladder shipped** (`PROP_WEIGHT`, `liftCapacity`, planes and
>   loose rocks as liftables, §21). Cannons and ziplines do not exist.
> - **#21 / #23 — UNBUILT and this is the Smash ask.** No `oneWay`/`softPlatform` branch exists in
>   `_physics`. ⚠ `shatterBlock` does hide-not-dispose exactly as the board claims, so the
>   regenerating half is genuinely a timer over shipped machinery.
> - **#22 SECRET WARS · #24 KAIJU MODE — UNBUILT.** Repo-wide today: `PUBG` 0 hits, `Secret Wars`
>   0 hits, `kaiju` 1 hit (`THE_MERGE.md:214`, and only as a scope-risk warning).
> - Everything else in Tier 2: **UNBUILT.**

### TIER 3 — MAJOR (weeks; architectural)

| # | Idea | Imp | Eff | Risk | Fit | Rides on / catch |
|---|---|---|---|---|---|---|
| 41 | **Deterministic sim core** (fixed timestep, seeded RNG) | 5 | w+ | H | 5 | the foundation for 42 + 43 · − touches everything |
| 42 | **Replay system** (input record/playback) | 5 | w | M–H | 5 | needs 41 first |
| 43 | **Netcode** for online brackets | 5 | w+ | H | 5 | `netplay.js` is a transport scaffold only |
| 44 | **Buildings that COLLAPSE** floor-by-floor into debris cover | 5 | w+ | H | 5 | today they hide; − perf + reset story |
| 45 | **Interiors as real fight spaces** (roofed volumes) | 5 | w+ | H | 5 | designed + parked in BACKLOG |
| 46 | **Persistent world war** — factions claim the 1,050 cities | 5 | w+ | M | 5 | career + atlas become a strategy layer |
| 47 | **Character controller rewrite** (CCT, ledges, wall-jump, air dodge) | 5 | w+ | H | 4 | − risks the feel you already like |
| 48 | **Kaiju dual-scale world** (the city at 1/10) | 4 | w+ | H | 4 | − collision/camera abstraction |
| 49 | **Vehicles on the road graph** | 4 | w+ | M | 5 | graph exists, nothing drives |
| 50 | **Co-op kaiju raid** (4 v boss, phases, weak points) | 4 | w+ | M | 5 | needs 24 + netcode |
| 51 | **Smash combat profile** as a full alternative ruleset | 4 | w+ | H | 3 | − two games to balance forever |
| 52 | **32+ fighter BR scale** (LOD, AI budget, spatial hash) | 4 | w+ | H | 4 | − perf ceiling |
| 53 | **Authored 12-stage suite** with unique gimmicks | 4 | w+ | M | 5 | needs a content pipeline, not a generator |
| 54 | **Runtime voronoi fracture** | 4 | w+ | H | 4 | − CPU + art direction |
| 55 | **Community stage browser** + share codes | 3 | w+ | M | 4 | needs a backend |
| 56 | **Split-screen 4-player local** | 3 | w | M | 4 | multi-viewport renderer |
| 57 | **AI narrative director** for tournament pacing | 3 | w | M | 4 | ambience director is the precedent |
| 58 | **Live-service events** (accounts, global brackets) | 3 | w+ | H | 3 | − ops burden |
| 59 | **Meta-progression economy** (unlocks, cosmetics) | 3 | w+ | M | 3 | − can cheapen the sim fiction |
| 60 | **Cross-play mobile ↔ desktop brackets** | 2 | w+ | H | 3 | phone mode ships; − input parity |

> **STATUS TODAY**
> - **#43 NETCODE — further along than the board says.** `src/engine/netplay.js` exists and
>   `hud.renderOnline()` ships a working lobby: callsign, create room, 4-character join code,
>   host/challenger cards, a FIGHT button. What is missing is the deterministic half (#41/#42).
> - **#45 INTERIORS — PARTIAL.** Interiors v1 shipped (`floorplan()` BSP, four enterable bungalows,
>   `world.interiors` consulted by physics / `canSee` / fog / projectiles / ragdoll / cutaway) but is
>   **single-storey by construction**, which is exactly the volume-layer blocker documented in
>   `THE_LIVING_CITY_SIM.md` §4.
> - **#49 VEHICLES — the graph shipped, nothing drives.** `CLAUDE.md` says it outright: *"Nothing
>   DRIVES on the graph yet."*
> - **#56 SPLIT-SCREEN — 2-player local shipped** (`game.humans`, `controlPad`, `followHumans` fits
>   both, the fog shader has a second reveal bubble). Four players and multi-viewport do not exist.
> - **#44 COLLAPSE — the donor is real.** `shatterBlock` hides-not-disposes so reset works; floor-by-
>   floor collapse does not exist.
> - Everything else in Tier 3: **UNBUILT.**

### Start here — the five that make tournament mode feel like a *event* this week
**#1 Ring-out + #21 floating stages + #23 regenerating platforms** is the Smash ask, and it's cheaper than it looks: `_physics` already stands you on cover tops and `shatterBlock` hides rather than disposes, so "platform breaks, then comes back" is a timer on machinery that exists. **#2 bracket stats + #3 stage select** are pure UI over data already collected. Controls stay exactly as they are — this is a *stage* feature, not a movement rewrite (#47 is the one I'd avoid until you've felt #21).

> **STATUS TODAY — the cheapest three on the whole board, in order**
> 1. **#1 ring-out** — the engine is finished and has no switch. Write `ms.ringOut` from a mode or a
>    rules preset (#13) and it is live.
> 2. **#30 spectator** — same shape. `spectate()`/`cycleSpectate()` are written; bind a key.
> 3. **#2 bracket stats** — the numbers are already collected every match; `showBracket` throws them away.
>
> ⚠ Two of the three "biggest impact this week" items are not features to build. They are **doors to
> open on features that already shipped** — the same failure the `wwa-orphan-audit` skill exists to
> catch, hiding inside an idea board.

---

# §2 · INVINCIBLE-FAN FIT

**2026-07-24 22:40 · `/coach-ideas`.** Named by `LOST_AND_FOUND.md` §4.7 as the other lost board.
**This one was answered** — see the reply after the table.

> *(his prompt, reconstructed from the board's own opening line — he left a fill-in-the-blank:
> "melee needs to be more \_\_\_", asked for ideas Invincible fans would fit into, and excluded space
> because it was already planned. The verbatim prompt line was not separately recoverable; the board's
> restatement of it is quoted below and is the assistant's paraphrase, not his words.)*

Adapting the fan-out inline — I've been inside every system of this engine all session, so I'm generating from the five angles myself and grounding against code I've touched today (context budget doesn't allow a five-agent round-trip this time). The blank you left — "melee needs to be more ___" — the Invincible answer is **more kinetic and more consequential**: their fights are momentum exchanges *through* the city, and the city remembers.

## coach-ideas — Invincible-fan fit (space excluded)

| # | Idea | Impact | Effort | Risk | Brand-fit | Quick win |
|---|---|---|---|---|---|---|
| 1 | Momentum melee — damage/KB scale with closing speed | A | **LOW** | Low | A | ✔ |
| 2 | Grab-and-carry a FIGHTER through buildings | A+ | MED-HIGH | Med | A+ | |
| 3 | Through-building launch chains (pierce, don't stop) | A | MED | Med | A | |
| 4 | Fist-clash (the beam clash, for haymakers) | A- | MED | Low | A | |
| 5 | The "get up" second wind at KO threshold | B+ | LOW-MED | Low | A | ✔ |
| 6 | Damage states: bruising, torn suits, optional blood | B+ | MED | Low | A | |
| 7 | Grudge rivals — the book remembers, the rival returns | B+ | **LOW** | Low | A- | ✔ |
| 8 | Rescue moments — carry civilians out of collapse zones | B | MED-HIGH | Med | A | |
| 9 | Viltrumite-shaped archetype pack (pure roster data) | B | **LOW** | Low | B+ | ✔ |

**1 · Momentum melee** — your blank, filled. Strike damage and knockback multiply with the attacker's velocity at contact: a full-cruise flying punch (SHIFT-cruise is 1.5×, speed-lines already fire past 38u/s) hits like a train; a standing jab stays a jab. `+` One small read of `f.vel` in `melee.strike` — the engine already knows everything it needs; instantly makes flight an offensive weapon, which IS Invincible. `−` Needs a cap so dive-spam doesn't break the trifecta; bots need to learn it or players will feel like the only pilot.

**2 · Carry a fighter through a building** — Omni-Man's signature: seize someone in flight and drag them through three facades. `+` The pieces all exist separately (grab, carry-prop, slam physics, shatterBlock, flight) — this is the crossover move that makes clips people share. `−` The biggest new state machine on the list; camera and escape rules (teleEscape mid-drag?) need real design.

**3 · Through-building launches** — a hard enough launch *pierces* cover: crash through, keep flying, the wall collapses behind you. Today `launchT` stops at the first wall. `+` Slam damage + destruction already exist; this is one pierce branch in `_physics`, and it's the collateral language of the show. `−` Tune or every haymaker demolishes a block (tie pierce to the new stun/pressure numbers).

**4 · Fist-clash** — two committed haymakers meeting = a held clash (the `_beamClash` pattern donated to fists), winner by strength/meter, loser eats the counter. `+` The dramatic beat every superhero brawl has; donor code shipped and proven. `−` Frequency gate needed or it interrupts flow.

**5 · The get-up** — once per match at the KO blow, slow-mo, "STAY DOWN?", and a drained-state second wind (Overdrive is the donor system). Invincible always gets up. `+` Cheap, dramatic, hooks the comeback attribute that already exists. `−` Must never trigger for bots-vs-bots spam — humans only.

**6 · Damage states** — bruise/scorch decals and torn suits at HP thresholds (the material system per-fighter makes swaps trivial), blood particles behind a toggle. `+` Brutality is the brand; also pure readability — you can SEE who's losing. `−` Art-taste risk; keep it grimy, not gory-by-default.

**7 · Grudge rivals** — the Elo book already stores incident history; a rival you've beaten returns with a grudge line on the opening tape ("SECOND MEETING — he remembers the jaw"), a small buff, and news coverage that knows the history. `+` Almost entirely data + existing news/opening plumbing. `−` Writing quality carries it.

**8 · Rescue moments** — collapses trap civilians; carrying one out earns crowd cheers and heat forgiveness (peds, carry, heat all exist). The show's whole moral weight is the cost to bystanders. `−` The biggest design surface here; risks feeling like a chore if forced.

**9 · Archetype pack** — three or four Invincible-shaped originals as pure `characters.js` data: the terrifying father-figure (STR 10, flight 3, momentum kit), the teen still learning (overdrive + get-up synergies), the mentor. `+` Zero engine cost, gives the melee work faces to belong to. `−` Derivative if the identities aren't authored with care.

**The play**: 1 → 5 → 7 → 9 are one afternoon combined and transform melee's feel; 3 then 2 are the escalation path that makes fights *travel through the city*; 4 and 6 are the drama layer. Reply **pursue #N** (or "combine 1+3+5") and I'll take it to a plan.

### His reply, thirteen minutes later — verbatim (2026-07-24 22:53)

> lets make or update a spec document to impliment each of what i ask for #1. into the game..and being
> able to grab someone and throw them into something. we also need stunned...and more.....numner 5,
> yes....BUT I think we need more states, like bleeding too....list this out but ill have it read to
> me oprganize it well

> **STATUS TODAY — this board is the most successful of the five**
> - **#1 momentum melee — BUILT.** `momentumMult()` in `melee.js`, `COMBAT_MANUAL.md` §10, including
>   the dive punch he did not ask for.
> - **#5 the get-up — BUILT.** Second Wind, §13, humans-only exactly as the `−` warned.
> - **"grab someone and throw them into something" — BUILT.** The aimed throw, §11, including the
>   thrown-body-hits-a-third-fighter check.
> - **"we also need stunned" — BUILT.** §9. **"bleeding too" — BUILT.** §12.
> - **#7 grudge rivals — PARTIAL.** THE CIRCUIT has a `grudge` offer kind sourced from the hero's own
>   book history, and a 🩸 RIVALRY chip at ≥2 meetings in 5 ledger lines. The opening tape does not
>   carry a grudge line.
> - **#6 damage states — PARTIAL, by a different route.** No bruise decals or torn suits; what shipped
>   is the injury system's wound pips + the bleeding suit-lerp toward `#3a0d0d`.
> - **#2 carry-a-fighter-through-a-building, #3 through-building launch chains, #4 fist-clash,
>   #8 rescue moments, #9 archetype pack — UNBUILT.** Repo today: `fistClash` 0 · `pierceCover` 0 ·
>   no one-way/pierce branch in `_physics`.
> - ⚠ **#2 and #3 are the two he never answered**, and they are the board's own highest-impact rows
>   (A+ and A). #3 is scored MED and is one branch in `_physics`.

---

# §3 · THE INJURY BOARD

**2026-07-24 22:58 · `/coach-ideas`.** Not named in `LOST_AND_FOUND.md`; found during this recovery.
It shipped, so it is recorded here for provenance rather than rescue.

> how could an injury system work in our game. look at how much depth we have. lets try to keep the
> same depth

Running this board inline again (context is at its floor — no fan-out; grounded in the systems I've shipped into this codebase all session). "Same depth" means the house pattern: **derived not authored, one record that every surface reads, and a tell you can name in grayscale.**

## coach-ideas — an injury system with WWA depth

| # | Idea | Impact | Effort | Risk | Depth-fit |
|---|---|---|---|---|---|
| 1 | Injuries in the BOOK — persistent, reported, healing over matches | A+ | MED | Low | A+ |
| 2 | Derived zoned wounds — the hit's type+kind+zone decides the injury | A | MED | Med | A+ |
| 3 | Injury-aware AI — bots shield the wound they have, hunt the limp they see | A- | **LOW** | Low | A |
| 4 | The wound ladder — LIGHT→SERIOUS→CRITICAL per zone, match-scoped | B+ | LOW-MED | Low | A- |
| 5 | The tells law — limp cycles, arm cradles, a WOUNDS row on the sheet | required | LOW | Low | A |

**1 · Injuries in the book** — the depth crown. The Elo book already stores dated incident history per hero; a KO records *how* it happened (slam/beam/blade — the news desk already classifies this). Add an injury record to the same store: "fractured orbital, heals in 2 sanctioned bouts." Then every honest surface reads it for free — the codex grows a medical section, the opening tape says "returning from a broken jaw," the news desk mentions it, the sheet shows a WOUNDS row, and the fighter carries a small derived debuff until it heals. One record, five surfaces, zero drift — exactly how the rankings and identities already work. `−` Needs a hard cap (one active injury, small debuff) or the ladder snowballs losers.

**2 · Derived zoned wounds** — no hand-authoring, ever. The damage pipeline already knows dtype, kind, and launch state at the choke point: fire → burns, heavy slam → fracture, slash → the bleed you just specced, cold → frost-scar, acid on metal → corrosion. Zone from the hit's geometry (airborne launch = legs on landing, melee = arms/head). Each injury maps through the existing sheet: a fractured arm taxes Fighting-derived output, a leg wound taxes speed — `bakeSheet` multipliers are the delivery, so the sheet *cannot* lie about your condition. `−` The zone inference needs to be honest or it reads random.

**3 · Injury-aware AI** — nearly free depth. Bots already have doctrine knobs and the belief system: a bot with a wounded arm guards more and swaps to its off-slots; a bot that *sees* your limp (vision rules apply — no wallhack) shifts doctrine toward pressure. Difficulty buys judgment, never knowledge. `−` Must ride existing knobs, not new special cases.

**4 · The wound ladder** — match-scoped severity per zone with Vigor/ccRecover shortening recovery, cleared on respawn except what graduates into the book (#1). This is the bridge: in-match wounds are the fiction, the book keeps the scar.

**5 · The tells** — non-negotiable per the five tests: limp in the run cycle, arm cradle in idle, posture drop, the sheet row, one HUD chip. A wound you can't see in grayscale doesn't exist.

**The shape of the whole**: 2 creates wounds honestly → 4 grades them → 1 makes them *matter beyond the match* → 3 makes the world respond → 5 makes it readable. That's the same architecture as heat/police/news — a derived record rippling through every layer that already tells the truth.

> **STATUS TODAY — 5 of 5 BUILT**, `COMBAT_MANUAL.md` §18 + the letter pass. `bookInjury`/`injuryOf`/
> `healBout` in `rankings.js`, derived zones at the `takeDamage` choke point, the AI's leg-wound
> pressure bias inside the sees-branch, the LIGHT/SERIOUS/CRITICAL ladder, the limp cycle, the wound
> pips and the `#plWounds` HUD chip. The one open thread the board raised and the ship did not close:
> the arm cradle in idle.

---

# §4 · THE WILDLIFE 60

**2026-07-25 15:13 · `/coach-ideas`.** Not named in `LOST_AND_FOUND.md`; found during this recovery.
The only board of the five that used a real subagent fan-out ("All four in — 72 raw ideas, deduped
to 60"). **Most of it is still live** — the wildlife layer that shipped 07-25 is `wildlife.js`
(birds + litter), which is the substrate these ideas sit on, not the ideas themselves.

> need 60 ideas for wildlife stuff using city/country stat related stuff

All four in — 72 raw ideas, deduped to 60. And the ecology pass surfaced the keystone finding, which I've verified:

**There is no calendar.** `world.dayT` is a 240-second day cycle; `career.week` exists but maps to nothing. So `climate.t[12]` (monthly temperatures) and `climate.snowMonths[]` — real authored data on all 1,050 cities — are **read by nothing**, exactly like `cloning` and `capitalPunishment`. About a quarter of the good ideas below are blocked on it, which makes it the highest-leverage item on the board rather than an idea in its own right.

## coach-ideas · wildlife from the city/country sheets

**Scoring:** Impact = cities reached × mechanical weight × unused-data unlocked. Effort S/M/L. ⚑ = makes a paid-for but dead column live.

| # | Idea | Reads | Imp | Eff | |
|---|---|---|---|---|---|
| 1 | **The Calendar** — `week`→month; unlocks every seasonal read | `career.week`, `climate.t[12]`, `snowMonths` | 5 | S | ⚑ keystone |
| 2 | **The Flush Reads Both Ways** — birds you scatter rat you out | `ai.remember`, `canSee`, `bst[]` | 5 | S | |
| 3 | **Scavenger Succession** — flies→corvids→dogs on a KO site | `matchLog`, `biome`, `t[month]`, `healthcare` | 5 | S | |
| 4 | **Species Richness** — how many *kinds* = the sheet, on the atlas card | `science`, `integrity`, `healthcare`, cell `t` | 5 | M | ⚑ |
| 5 | **The Commensal Triangle** — gulls/rats/cats from waste + collection | `types`, `gdpPerCapita`, `healthcare`, `crime` | 5 | M | ⚑ |
| 6 | **The Quiet Roof** — an empty roost is earned recon | `cover[].top`, `bst[]===PERCH` | 4 | S | |
| 7 | **The Peregrine** — a flush with an honest false-positive rate | `landmarks`, tallest `cover.top`, `popType` | 4 | S | |
| 8 | **Birdstrike** — flight finally costs something | `afterburner`, `BANDS`, flock anchors | 4 | S | |
| 9 | **The Herd & Stampede** — rural cover that panics | `rural`, `biome`, `gdpPerCapita`, `noise` | 4 | M | |
| 10 | **The Stray Line** — collared+walked vs ribby+roadside | `gdpPerCapita`, `healthcare`, `crime`, `dayT` | 4 | M | ⚑ |
| 11 | **The Flyway** — a migration river; the SKY band's only cover | `lat`, `snowMonths`, `t[12]`, `roads` | 4 | L | needs #1 |
| 12 | **The Month Roster** — which species exist at all, per match | `snowMonths`, `t[month]`, `koppen` | 4 | S | needs #1 |
| 13 | **The Canary** — dead birds keep a gas zone legible after the VFX dies | `_smoke`, `DTYPES`, `resistOf` | 4 | S | |
| 14 | **The Windsock** — make `wildlife.wind` real (drifts gas, bends arrows) | `wind`, `precip`, `relief.amp` | 4 | M | |
| 15 | **The Red List** — killing wildlife books, forever, on the city card | `rankings` book pattern, `career` | 4 | M | |
| 16 | **The K9 Rung** — dogs on the ladder; tracks through fog | `lawBudget`, `intelBudget`, `terrorism` | 4 | M | |
| 17 | **The Guard Dog Economy** — `crime`÷`lawEnforcement`, barks into `noise` | `crime`, `safety`, `lawEnforcement` | 4 | M | |
| 18 | **The Escaped Subject** — biome-wrong animal from a research annex | `science`, `cloning`, `biome` | 4 | M | ⚑ |
| 19 | **The Gallows Roost** — habituated crows that never scatter | `capitalPunishment`, `govPerception` | 4 | S | ⚑ |
| 20 | **The Dawn Chorus & Its Silence** — the cut-out is the tell | `dayT`, cell `t`, `soundscape._violence` | 4 | S | |
| 21 | **Corvids Return** — a black cluster = memory of the last loud thing | `noise`, `cover[].top`, `_drops` | 4 | S | |
| 22 | **The Carrion Marker** — circling birds make gear drops findable | `_drops` (20s, ≤10), `handleKO` | 4 | S | |
| 23 | **The Water Column** — waders/shoals/nothing, by depth tier | `cell.d`, `waterDepthAt`, `koppen` | 3 | M | |
| 24 | **Thermals & the Vulture Ceiling** — soarers burst as you climb | `dayT`, `t[month]`, `relief`, road class | 3 | M | |
| 25 | **Winter Heat Islands** — the flock clusters onto AC units | `snowMonths`, roof AC meshes, `lat` | 3 | S | needs #1 |
| 26 | **The Barometer** — birds fly low *before* a weather ult lands | `weather._target` vs current | 3 | S | |
| 27 | **Sacred Ground** — the crowd turns, independent of police | `cultureCode`, Temple, `vigilantism` | 3 | M | ⚑ |
| 28 | **Fireflies Map the Dark** — negative image of light pollution | lamp distance, `biome`, `precip` | 3 | M | |
| 29 | **The Menagerie Breach** — a zoo tile; break it and they're loose | `TILE_SIZES`, `Educational`/`Resort` | 3 | L | |
| 30 | **The Plaza Tripwire** — open tiles become crossing risk | cell `t`, `roads` | 3 | S | |
| 31 | **The Biome Alarm Chain** — forest relays, desert is silent | `biome`, `rural` | 3 | S | |
| 32 | **Roosts in the Cut** — bats out of the metro trench | `metro`/`mining` cells, `dayT` | 3 | M | |
| 33 | **The Identical Herd** — Legal-cloning states have *identical* cattle | `cloning`, `gdpPerCapita`, farmland | 3 | S | ⚑ |
| 34 | **Structure-Nesters** — a real nest on the named landmark | `landmarks`, `lname`, `regionOf` | 3 | M | |
| 35 | **The Catcher's Van** — stray count decays only where funded | `lawBudget`, `integrity`, `roads` | 3 | M | ⚑ |
| 36 | **The Rat Index** — literal "is this city maintained" gauge | `gdpPerCapita`, `healthcare`, `crime` | 3 | M | ⚑ |
| 37 | **The Summit Sweep** — anti-bird spikes; strays displaced, not helped | `mediaFreedom`, `govPerception` | 3 | M | ⚑ |
| 38 | **The Falconer** — *absence* of birds marks a secured site | `terrorism`, `intelBudget`, airport | 3 | S | ⚑ |
| 39 | **B-Roll Bounty** — a flush cues the news crew early | `news.highlight`, `mediaFreedom` | 3 | M | ⚑ |
| 40 | **The Camera Animal** — a censored state broadcasts pigeons | `mediaFreedom`, `newscrew` | 3 | M | ⚑ |
| 41 | **The Stray (one dog)** — follows you across a career week | `career.week`, ledger, `t[month]` | 3 | M | |
| 42 | **Livestock in the Road** — a KO'd goat is a year's income | `gdpPerCapita`, `rural`, `vigilantism` | 3 | M | ⚑ |
| 43 | **The Working Animal** — donkey carts below a gdp line | `gdpPerCapita`, `lawBudget`, road class | 3 | M | ⚑ |
| 44 | **The Lamp Food Chain** — moths → geckos, only where warm | lamp pos, `t[month]`, `koppen` | 2 | S | |
| 45 | **Warm Asphalt at Dusk** — reptiles on metalled roads only | `roadAt` class, `t[month]`, `biome` | 2 | S | |
| 46 | **The Chum Bag** — gadget that plants a remote tripwire | `useItem`, ORIGIN gear row | 2 | M | |
| 47 | **The Midge Column** — climate-placed spot where hard lock breaks | `koppen` A-zone, water `d`, `dayT` | 2 | M | |
| 48 | **Dawn Lift-Off** — a scheduled window where the flush means nothing | `dayT`, `lat` | 2 | S | needs #1 |
| 49 | **The State Animal** — the regime's self-portrait, free or caged | `govType`, `leaderTitle`, `motto` | 2 | M | ⚑ |
| 50 | **The Crate with Airholes** — smuggling where integrity is low | `integrity`, `crime`, seaport | 2 | M | ⚑ |
| 51 | **Conservation Theatre** — immaculate sign over an empty pen | `mediaFreedom` vs `science`/`gdp` | 2 | M | ⚑ |
| 52 | **The Rookery Collapse** — one landmark worth *not* destroying | `lname`, Temple, `peds._panic` | 2 | M | |
| 53 | **Protected Species** — Norway cites you, Somalia doesn't notice | `integrity`, `gdpPerCapita` | 2 | S | ⚑ |
| 54 | **The Vertical Bestiary** — each flight band gets its own life | `bands`, `cover.top`, `metro` | 2 | L | |
| 55 | **The Murmuration** — fly through it, punch a hole | `biome`, `t[month]`, `dayT`, `bands.sky` | 2 | L | needs #1 |
| 56 | **The Night Bloom** — plankton wake in the shallows | `waterDepthAt`, `koppen`, `dayT` | 2 | M | |
| 57 | **The Swarm** — a locust cloud that blinds | `koppen` BW/BS, farmland, `wind` | 2 | L | |
| 58 | **The Sky Apex** — something hunts fliers at CLOUDS | `biome`, `relief`, `safety` | 2 | L | |
| 59 | **The Ground Apex** — a predator the *police* have to handle | `biome`, `safety`, `popType` | 2 | L | |
| 60 | **The Beaching** — 60t of prop, cover and story on the quay | `PROP_WEIGHT`, `liftCapacity`, seaport | 1 | L | 95 cities |

### The top of the board, with the catch

**#1 The Calendar** — map `career.week` to a month; `climate.t[12]` is built off a *signed* `lat`, so southern-hemisphere cities come out correct for free.
`+` Unlocks ~15 ideas and two entire authored columns for a day's work. `−` Non-career matches need a month from somewhere (`hud.theater.seed`), and that's a arbitrary-feeling choice you'll have to live with.

**#2 The Flush Reads Both Ways** — a flock breaking inside a bot's vision cone pushes a *fuzzy* `noise`-rank lead.
`+` Inverts a tell that currently only benefits the player, costs almost nothing, and has real counterplay (walk, avoid roofs, flush a decoy). `−` **This is the one that can break the honesty law.** It must gate on `canSee` — a bot that "hears" a flush it couldn't observe is a new wallhack, and that took a long time to fix once already.

**#3 Scavenger Succession** — flies → corvids → dogs, on a timetable, at KO sites.
`+` Reuses the crater map, the AFTERMATH soundscape state and the existing pools; makes destruction feel like it happened somewhere things live. `−` Bodies despawn on respawn in most modes, so the later stages need the `matchLog` entry as the anchor, not the corpse.

**#4 Species Richness** — run one function over the plan, print a RICHNESS line on the atlas card.
`+` Exactly the DAMAGE CODEX pattern — the screen can't drift from the engine — and it finally gives `science`/`integrity`/`healthcare` a job. `−` It's a number on a card unless the *sky* visibly changes with it; build the visual first or it's a stat nobody feels.

**#5 The Commensal Triangle** — gulls follow waste, not coastlines.
`+` The non-obvious correct answer (inland industrial cities get gulls) is the kind of detail that reads as authored. `−` Rats-in-daylight is a strong signal that will make poor cities feel *dirty*; that's the honest reading of the sheet, but it's a tone call worth making deliberately.

**#8 Birdstrike** — flight has never had a cost.
`+` Tests 4 flock anchors, not 64 birds; turns the afterburner into a decision. `−` Risks feeling like punishment for using the fun button — needs a generous cone and a clear tell.

**#19 The Gallows Roost** — crows that ignore `game.noise` entirely, thicker the more the state executes.
`+` The single best use of `capitalPunishment` anyone proposed, and it's an *inversion* of existing logic rather than new code. `−` Only 39 countries are Active — high craft, narrow reach.

### Two honest cuts

**`hvt` is dead** — 1 city of 1,050. Ideas #37 and #38 must derive it (capital + political tile + `popRating` + `terrorism`) or they'll silently never fire. That's the same class of bug as the `pickCity` safety default that made every police ETA ~16s.

**`sector` stays unused.** Half the rows are blank, and every animal use for it is an ecological read dressed up as a state read. The generator that had the best claim on it said it was better left alone than faked — I agree.

> **STATUS TODAY**
> - **#1 THE CALENDAR — BUILT, by a different road.** The board called it the keystone on 07-25; it
>   landed on **07-26** inside the AGE pass, not as wildlife work. `career.turnWeek()` calls
>   `advanceDays(7)` against `gameDate()` in `orbits.js`, so a career week now genuinely moves the
>   calendar the planets orbit on. ⚠ **The unlock it was supposed to buy did not happen:**
>   `climate.t[12]` and `climate.snowMonths` still have **zero consumers** repo-wide today. The
>   keystone was laid and nothing was built on it — every "needs #1" row (#11, #12, #25, #48, #55) is
>   now unblocked and untouched.
> - **#2 THE FLUSH READS BOTH WAYS — UNBUILT, and the wiring is one-directional.** `wildlife.js:185`
>   is explicit: *"THE BREAK FOR THE SKY. Hooked to game.noise(), so anything the AI can hear
>   scatters the birds."* Noise → birds exists. Birds → AI does not.
> - **#14 THE WINDSOCK — LARGELY BUILT, elsewhere.** The weather pass (07-26) gave wind a real force
>   vector with a `WIND_DRAG` lookup: measured in a storm, gas 41.5 · arrow 17.4 · bullet 14.1 ·
>   thrown prop 0.83 · ki blast 0.00. That is the board's "drifts gas, bends arrows", delivered.
> - **#26 THE BAROMETER — now cheap.** `Weather` has 13 named states with ramping, so "birds fly low
>   before the ult lands" is a read of the target state against the current one.
> - **#16 THE K9 RUNG / #17 GUARD DOG ECONOMY — the data landed, the entity did not.** `data/companions.js`
>   shipped seven breed aptitudes on 07-26; `BACKLOG.md` records in writing that nothing bites and
>   nothing renders.
> - Everything else on this board: **UNBUILT.**

---

# §5 · WHAT TO BUILD NEXT

**2026-07-26 06:51 · `/coach-ideas`.** Not named in `LOST_AND_FOUND.md`; found during this recovery.
This is the board that became the `wwa-orphan-audit` skill's founding evidence. Reproduced because
several of its measurements are the only record of a number, and because half the board is still open.

> what things hould we work on next

## coach-ideas — what to build next in WAR WORLD: ASCENDANTS
Ranked by impact · 5 angles · grounded against the codebase (line counts, import graphs, and grep counts are measured, not estimated)

**One thing found en route that isn't an idea:** the title screen's SMPTE test card draws `#a020a0` — magenta, hue ~300°, inside the banned range — and it's what every brand-new player sees before they have footage on file. `opening.js` does the same card correctly and swaps the violet bar for slate with a comment explaining why; the title-screen copy was missed.

| # | Idea | Impact | Effort | Risk | ⚡ |
|---|------|--------|--------|------|---|
| 1 | The front door — finished systems with no way in | High | M | Low | |
| 2 | The input buffer — presses are silently deleted | High | S | Low | ⚡ |
| 3 | Moon gravity + the vacuum actually kills you | High | S | Low | ⚡ |
| 4 | `npm run verify` — a committed assertion suite | High | M | Low | |
| 5 | The world remembers — consequence outlives the match | High | L | Med | |
| 6 | The clinch wheel — finish what the spec designed | High | L | Med | |
| 7 | Save the tape — the only shareable artifact | High | S | Low | ⚡ |
| 8 | The marker legend + the first-ninety-seconds coach | Med-High | S | Low | ⚡ |
| 9 | Nemesis — the one who watched the tape | High | XL | High | |
| 10 | The press names you | Med | M | Low | |
| 11 | The lettering pass — the game speaks in balloons | Med | S | Low | ⚡ |
| 12 | Shrink the contract — CLAUDE.md is 44k tokens | Med | M | Low | |

**The measurements it recorded** (quoted from the board, all stated as measured at 2026-07-26):

- **#1** `data/org.js` (the Firm) imported by **devconsole only** · `data/armory.js` — devconsole only ·
  `MODE_IMPL.base` is real at `game.js:124` but `data/modes.js` has **no base card** · `game.ms.ringOut`
  read at two sites and **written at zero** · `game.spectate()`/`cycleSpectate()` **zero call sites** ·
  `data/age.js` (160 lines, complete) **zero importers in the entire repo**.
- **#2** `feedSlot` (`game.js:36`) discards `pressed`/`held` whenever `busy` — and `busy` includes
  `p.guarding`. *"While you hold guard, every power press in the game is thrown away with no
  feedback."* No buffer/coyote/queue anywhere. `abilities.js:1036` only calls `onNoKi` when `cd <= 0`,
  so a slot on cooldown gives zero tell. `released` deliberately passes through unblocked so charge
  releases aren't eaten — the buffer must queue presses without breaking held/release pairing.
- **#3** Every world's real `g` is authored (`environments.js:24`); the fall line is already a product
  with a multiplier slot at `entity.js:1310`. `survivalFor(def, worldId, sheet)` — a complete
  eight-channel hazard model with a calibrated suit ladder — is imported by `devconsole.js` and
  nothing else, *"so standing bare-faced on the Moon currently costs you nothing."*
- **#4** `git log --all --diff-filter=A` across the whole history returns **zero test files ever
  committed** — but **42 of 89 modules (~11,500 lines) import no three.js and run in bare Node
  today**, and **six validators are already written as pure functions** (`validateRoster`,
  `validatePlan`, `validateTiles`, `validateVis`, `creator.validate`, `auditSurfaces`) with no runner.
- **#5** `countries.js` is read-only, `relations.js` (56KB, 168 nations) is read by two files, and
  every match already computes an aftermath nobody reads — `cityStats`, heat, VILLAIN flag,
  `matchLog`. ⚠ *"Bounding the feedback loop is the whole job"* — unbounded drift turns the world
  Banned in ten matches and silently invalidates the police ladder, the site survey and the purse
  curve at once.
- **#6** `POSITIONS`, `WHEEL_MAX`, `clinchWindow` and `SUBMISSIONS` in `data/martial.js` are
  **imported by nobody**. Ground top/bottom implies a prone pose the figure rig and ragdoll don't have.
- **#7** *"The game films your fights with a real in-world camera and then throws every frame away."*
  Grep for `download|toDataURL` across `src` finds only the atlas JSON exporter — **nothing in this
  game produces a file.** Also: `clip.tag` is stored on every clip and read by nothing.
- **#8** The How-to overlay explains **only** the altitude ring — never `faceWedge` (the whole basis
  of flanking) or `stateRing`. *"Three rings render under every fighter and the game never says what
  two of them mean."*
- **#9** `f.fixation` is already built and load-bearing in the police system; `vengeance` is one of
  the seven drives. ⚠ The adaptation must happen strictly **between** matches — *"an adaptive nemesis
  is exactly the feature that tempts you to break the AI honesty law."*
- **#10** `killer._mastery` is logged with the comment *"so the codex can show what you actually fight
  with"* — **nothing reads it.**
- **#11** **Five of the comic layer's nine tones have no gameplay caller at all**, including
  `announce` and `robot`. ~25 `hud.announce()` sites render as plain HUD text; `psyche.js`'s ~40
  hand-written MOOD lines reach only a tiny HUD chip.
- **#12** CLAUDE.md **17,931 bytes (2026-07-22) → 219,494 bytes (2026-07-26) — 12× in four days**,
  2,468 lines, 207 `⚠` lines. `AGENTS.md` is **287 of 298 non-blank lines verbatim identical** — 96%.

**Two more real bugs the sweep turned up:** `witnessBit()` keys on six legacy district names but `rep.district` now returns plan-authored names, so every lookup falls through — *the same food-cart owner is the eyewitness to every fight in all 1,050 cities*. And the opening director picks its variant with bare `Math.random()`, so `broadcast` plays with zero footage and `ledger` plays for a 0–0 fighter.

> **STATUS TODAY**
> - **#11 THE LETTERING PASS — BUILT.** The comic layer shipped the same day (`comic.css`,
>   `comic.js`, `balloon.js`, nine tones, the SVG-path balloon).
> - **#1 THE FRONT DOOR — PARTIAL.** The armory got its screen (`armoryUI.js`, 07-26) and the Firm
>   got the HQ globe (`hqglobe.js`, 07-26). Still open, verified today: **no base card in
>   `data/modes.js`** · **`ms.ringOut` still written at zero sites** · **`spectate()` still has no
>   caller** (it lives at `game.js:678` and even writes a feed line). `data/age.js` now has importers.
> - **#12 SHRINK THE CONTRACT — NOT DONE, and worse.** CLAUDE.md has grown further since.
> - **#2 · #3 · #4 · #5 · #6 · #7 · #8 · #9 · #10 — UNBUILT.**
> - ⚠ The `#a020a0` SMPTE finding and the `witnessBit()` bug are recorded nowhere else that I found.

---

# §6 · WHAT I COULD NOT FIND

Stated plainly, because an invented line here would be worse than a missing one.

1. **The verbatim prompt for the Invincible board (07-24 ~22:40).** The board's own restatement of it
   is quoted in §2 and is clearly marked as the assistant's paraphrase. His *reply* thirteen minutes
   later is verbatim and complete. The original ask survives only as that paraphrase.
2. **Any reply to the 60-idea tournament board (§1).** There is none. The next thing in the transcript
   is *"ok lets push everything to main and /shipping-log process htat"* at 04:14, twelve minutes
   later. `LOST_AND_FOUND.md`'s reading — that the goal was superseded before it was written down —
   is confirmed by the record.
3. **Any reply to the wildlife board (§4) or the what-to-build-next board (§5).** Neither has a
   `pursue #N`.
4. **A sixth board.** I searched every transcript in `C:\Users\taskm\.claude\projects\D--lsw\` for
   rendered `coach-ideas` headings and found exactly these five.
5. **Nothing in `docs/_recovered/`.** All 139 recovered subagent outputs were grepped for `PUBG`,
   `Secret Wars`, `Kaiju`, `influence`, `micropolis`, `land value`, `pollution`, `payoff-per-hour`
   and `coach-ideas`. **Zero hits** other than files belonging to the session that wrote
   `LOST_AND_FOUND.md` itself. Every board was generated inline without subagents, so no subagent
   output of one ever existed.
