# Design Decisions — creator rulings (2026-07-22 interview)

The canonical answers. Anything here overrides defaults. Source: creator voice-dump answering
`DESIGN_INTERVIEW.md` + the ideas session. New rulings get appended with dates.

## Identity
- **What it is:** a comic-book arena fighter **with missions eventually** — but **ENGINE FIRST**. The
  engine must be able to host zombies, grenades, boxing, everything except vehicles.
- **Names:** the game is **THRESHOLD**; the universe is **Consequences of Failure** (repo: `D:\git\COF`).
- **Fantasy:** starts with the **canon Living Superweapons**; original created characters later (the
  character-creation system is a first-class goal — "the new D&D mixed with Scribblenauts").
- **Now-scope:** arena fighter + PvP skirmish on destructible terrain; concept layer first.

## Combat rulings
- **TTK:** depends on the matchup — two martial artists is a long fight, beamer-vs-gunman is not.
  **Lopsided is honest. No scaling. Hardcore.** The announcer calls out mismatches.
- **Guard-crush knockback scales with the ATTACKER** (Hulk ≠ Bruce Lee — Strength already drives this).
- **Beams eat bullets:** only the most powerful beams, and it depends on energy put in →
  needs the damage taxonomy (piercing vs force beams confirmed as the two beam classes; heat is elemental on top).
- **Parry:** not understood / not wanted yet — park it.
- **Energy economy:** untested by creator; the **Danger Room** (live DPS meters — SHIPPED) is the test bench.
- **Intelligence as a stat:** open design challenge ("you can't have a smart character in Street Fighter —
  prove me wrong"). Current thinking: INT lives on ABILITIES as AI-hints + synergy tags (gun+fly = strafe-chase;
  gun+levitate = high-ground anchor; teleport-beacon = bait-and-swap).

## The LeFevre scale
- **Gameplay teeth, absolutely.** Tournament roster points; the numbers must let us DEFINITIVELY rate any
  character — gear-only, drone controller, self-multiplier, whatever.
- Mixed matches stay lopsided. Skill can steal rounds, not rewrite physics.

## Movement rulings
- **F toggles flight** (mode on/off, not hold) — SHIPPED. SPACE still rises, release hovers, CTRL descends.
  The 4th power slot moved **F → H** — SHIPPED.
- **Flight expertise tiers** — SHIPPED: 0 grounded (SARGE, GALE) · 1 clumsy Greatest-American-Hero
  (VOLT, HIVE, KRAKEN — sags, drifts, no hover) · 2 levitator (repositions, no cruise: RIME, WARDEN,
  PYRE, RIFT, TITAN, KIVULI) · 3 full flight (SOL, KANO, VEGA, AURUM, NOVA, TORCH, APEX, SPECTER, VANGUARD).
- **Ride/trail styles** — SHIPPED: RIME **rides a frozen board** (Iceman), TORCH/PYRE leave a **fire wake**
  (the flame flyer), TITAN thruster exhaust. More styles welcome per character.
- **Altitude bands: FOUR, hard rule** — Ground (character height + jump) · Building (2-story buildings you
  can enter, 3 stories standing on top; flying here bumps buildings) · Sky (above buildings) · **Clouds**
  (very high; ground fire at cloud targets is heavily penalized). NOT yet implemented — next map milestone.

## Energy archetypes
- **Androids (infinite energy)** — SHIPPED on TITAN: ki never drains (`∞ CORE` on the HUD), never fizzles,
  never Overdrives — but **tier-capped at II**: ascended heroes out-scale them. The DBZ android story in one flag.

## World rulings (next map: build to these)
- **First map: city district near water.** Shallow water slows; deep water swims (evaluate three.js water).
- **Full flatten possible but energy-expensive**; be efficient about building meshes.
- **Day/night cycle:** a 2-minute match ≈ 12 in-game hours; sunrise/sunset visible; day/night advantages.
- **Pedestrians:** they REACT — hold up phones (camera flashes) or call police → police response →
  military escalation by district. Star/infamy score. Baby-with-mother = maximum-fragility collateral class.
  Villain play flips the game state (later).
- **The Witness Layer:** war-correspondent reporter NPC orbits fights; every hit already flows through one
  pipeline → log it as an event stream → post-match news story with real screenshots; radio recap at home.
  Sky-replacement footage for news broadcasts.
- **Props:** cars and light poles are pickup-throwables gated by Strength; deflectable? — projectiles yes,
  thrown cars no (too heavy to deflect, blockable only).
- **Sound is information:** gunshots ping the radar unless silenced (SMGs get silencer variants); this is
  what makes a future sound-absorption character (COF's **Jawah Matu**) instantly valuable.

## Characters
- **KIVULI purple override — RULED.** The one sanctioned purple in the project. SHIPPED (true-purple palette).
- **Naming:** real COF names where canon exists; placeholders marked like the COF golden rule (`[PROPOSED]`).
- **Voices:** new pipeline (not Ad Lab). Write bark MOMENTS per character; they must also talk to EACH OTHER
  (short generic exchange lines, no specific relationships yet).
- **Creator system:** build it; do NOT call it "Foundry" — name TBD. Must show live damage numbers while
  picking powers and auto-compute the LeFevre rating. — **SHIPPED as ORIGIN (2026-07-22)**: point-buy
  budgets (STREET→COSMIC+UNBOUND), live numbers on every power pick, auto-LeFevre from points spent,
  SAVE & TEST into the Danger Room. "ORIGIN" is a placeholder name per this ruling — one string to rename.
- Next canon imports queued in `NEXT_CHARACTERS.md` (Stefanos, Sandra, Clown-Sheriff, Jawah, the bodyguards).

## Deployment & tooling
- **Deploy: tonight.** Static vite build → public URL. Benchmark stays accessible (`?bench` + `LSW.runBenchmark`).
- Tournaments are the forcing function for balance numbers.

## The ideas board (from the /coach-ideas session — folded in, ranked)
1. **The Codex** as the engine's spine (see `CODEX.md` — schema shipped, auto-gen next)
2. **Danger Room** live numbers — SHIPPED (training-mode DPS meters)
3. **Flight tiers + riders/trails** — SHIPPED
4. **Infinite-energy archetype** — SHIPPED (TITAN)
5. **The Witness Layer** (pedestrians film → news recap) — biggest build, biggest differentiator
6. **4-band altitude rule** — next map milestone
7. **Character creator** (D&D × Scribblenauts) — SHIPPED as ORIGIN (point-buy + live numbers + auto-threat)
8. **Per-ability AI + synergy tags** — schema fields reserved in CODEX.md
9. **Tournaments with LeFevre roster points**
10. **Sound as information** → then the sound-absorber (Jawah)
11. **White City aesthetic** — bone-white district so powers/threat colors pop (creator liked; try on the city map)
