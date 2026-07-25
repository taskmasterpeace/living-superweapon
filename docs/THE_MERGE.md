# THE MERGE — SuperHero Tactics + WAR WORLD: ASCENDANTS

*Written 2026-07-25. A proposal, not a decision. Nothing in here is built.*

---

## 1. The discovery

SHT's design document describes a game where you *"recruit Living Super Weapons (LSWs)"* across
*"~168 countries and ~1,050 cities."*

WAR WORLD runs on 168 countries and 1,050 cities, baked from the Country Master Sheet, and calls
its fighters Living Super Weapons.

**They are the same world.** Not similar worlds — the same sheet, the same term, the same nations
with the same integrity and law-enforcement and vigilantism columns. Two halves of one game, built
in two repos, by the same person, eighteen months apart.

Now look at where each one is finished:

| | SHT | WAR WORLD |
|---|---|---|
| World map, sectors, travel | **built** | atlas tool only |
| Time engine, day/night, scheduling | **built** | day cycle only |
| News browser reacting to events | **built** | broadcast layer (different job) |
| Investigations | **built** | — |
| Hospital / recovery | **built** | injury ledger only |
| Email / briefings | built (mobile-only UI) | — |
| Factions, politics, reputation | **built** | country sheet drives police only |
| Org / base layer | designed | — |
| **Tactical combat** | **mock screen** | **finished, deep, verified** |
| The city you fight in | grid | **1,050 real cities, 1:1 scale, destructible** |
| Roster | data | **52 heroes + a character creator** |

SHT's own GDD says the signature combat hook is *"the least complete part of the game."* That is
precisely the part WAR WORLD finished. The gaps are complementary almost perfectly.

---

## 2. The one decision that blocks everything else

**SHT is designed as turn-based tactical grid combat. WAR WORLD is real-time action.**

These are not two flavours of the same thing. They are different games with different audiences,
different pacing, and different reasons to exist. A merge has to pick one. Everything else in this
document is downstream of that choice, so it has to be made first and made consciously.

### The honest case for real-time (WAR WORLD's combat)

- It **exists**. It is built, tuned, and verified: 52 heroes, 364 ability slots, a damage-type
  system, an injury system, a six-rung police ladder, momentum melee, flight decks, a news crew
  that films it. SHT's tactical layer is a mock screen that routes to nothing.
- It is **differentiated**. "XCOM with superheroes" has been made. "Bid For Power × Soldat at 1:1
  scale in 1,050 real cities, with a strategic layer" has not.
- The strategic layer does not care. A mission descriptor going in and a result coming out works
  identically whether the fight took four minutes of turns or forty seconds of action.

### The honest case for turn-based (SHT's design)

- It suits **squad** play. Real-time action with six heroes at once is a much harder design and
  control problem than one hero.
- It suits **instant resolution**. SHT's own doc wants an instant/auto-resolve mode for trivial
  fights, which is natural for turn-based and awkward for action.
- It is kinder to **injury and permadeath stakes** — you can see a bad trade coming.

### Recommendation

**Take real-time.** Build the strategy layer around one hero deployed at a time, with the rest of
the roster on missions you resolve off-screen (WAR WORLD already simulates off-screen matches by
Elo for its tournament and career modes — that machinery exists and is honest).

Squads become a later feature, not a founding constraint. "Deploy one, sim the rest" is a real
design, not a compromise: it is how the career mode already works.

**If you disagree with this, stop reading here** — the rest of the plan assumes it, and the right
move would be a different document.

---

## 3. What each side keeps, and what it gives up

### SHT keeps (it becomes the shell)

The world map. The time engine. Investigations. The news browser. Email/briefings. The hospital.
Factions and reputation. Character management. Everything between missions.

**SHT gives up:** its Phaser tactical combat scene and the mock combat screen. That is the cost,
and it is a real one — there is work in there. But it is work on the half that is furthest from
done, competing against a half that is finished.

### WAR WORLD keeps (it becomes the engine)

The entire match: cities, heroes, powers, damage, police, destruction, the news crew, the ORIGIN
creator, the atlas.

**WAR WORLD gives up:** THE CIRCUIT. Its standalone career loop — week counter, bank, renown,
offers, ledger — is a small strategy layer, and the merge replaces it with a bigger one. The
*booking* machinery (`game.onMatchEnd`, Elo, the medical ledger) survives and becomes the result
channel. The desk UI retires.

This is worth stating plainly because it is the second real cost: a working feature gets deleted
because something better is taking its job.

---

## 4. The plan, in stages that each stand alone

Every stage below is independently useful. If you stop after any one of them, you have not wasted
the work. That is the main design goal of the sequencing.

### Stage 0 — One sheet, one truth *(small, do this regardless)*

Right now both repos contain their own copy of the country and city data. Two copies of a sheet is
a guarantee of drift, and this project has already been burned by a surface that quietly disagreed
with its engine.

Extract the sheets into one shared data package that both repos read: countries, cities,
geography, climate. No behaviour changes anywhere. Nothing merges. It is pure insurance, and it is
the precondition for every later stage.

**Do this even if you never merge.**

### Stage 1 — The contract *(the real work, and it is testable in isolation)*

Define two objects. Nothing else changes.

**DEPLOYMENT** — what the strategy layer hands the engine:

- which city (id into the shared sheet)
- which hero, and their current condition (injuries, gear, level)
- who or what they are fighting, and why
- the rules of engagement (lethal? capture? protect the civilians? time limit?)
- the stakes (what a loss actually costs)

**AFTERMATH** — what the engine hands back:

- outcome and how it ended
- damage taken, injuries sustained, in the format the medical ledger already uses
- collateral: civilians hurt, cars destroyed, buildings levelled, craters (WAR WORLD already
  tracks all of this in `cityStats`)
- heat generated and whether you were flagged as the villain
- footage recorded (the news crew already produces real clips)
- who saw you, and what they think they saw

Both sides can be built and tested against a fake counterpart. SHT can deploy to a stub that
returns a plausible aftermath; WAR WORLD can accept a hand-written deployment. **Neither repo has
to move for this stage to be finished and valuable.**

### Stage 2 — The shell

SHT hosts WAR WORLD. React strategy layer, Three.js combat surface, one app.

This direction is not arbitrary. Mounting a Three.js canvas inside a React app is a known, small
job — WAR WORLD is already driven programmatically (`window.LSW`, `game.startMode(id, cfg)`) and
is already designed to be launched into a chosen city with a chosen loadout. Porting SHT's React
UI into vanilla JS would be a rewrite of months of working screens. The cheap direction is the
correct one.

### Stage 3 — The base

The HQ layer lands in the shell, and **the Danger Room is not new work** — it is WAR WORLD's
training mode with a door on it. The player walks out of the base screen and into the engine they
already have.

Scope discipline for the first version, because the HQ document is a five-year game:

- **Six rooms, one floor.** Command, Training, Medical, Armory, Quarters, and **one free slot**.
- **The free slot is the entire design.** You can afford exactly one of: the Danger Room, a hangar
  (reach), or defences. Whichever you take, you can visibly not have the other two.
- **One scripted base attack, early.** You fight in the layout you built. That is the moment the
  grid stops being a menu and becomes a place.

Twelve rooms and adjacency bonuses come later, if the six-room version is fun. If it is not, more
rooms will not save it.

---

## 5. The campaign opening

**You pick a country. You work for nobody.**

This is the strongest version of the opening and it is almost free, because the country sheet
already drives live systems in WAR WORLD today:

- `vigilantism` decides whether an unregistered hero is a criminal on sight. In a **Banned**
  country (80 of 168) civilians film you and some draw on you from across the street. In a
  **Legal** country (11 of 168) nobody films you like a criminal and the crowd cheers a clean win.
- `lswRegs` decides how normal a superweapon is here at all.
- `lawEnforcement`, `lawBudget`, `integrity` decide how fast police arrive and whether they come.
- `intelBudget`, `milBudget`, `lswActivity` decide **how far the escalation ladder goes.** A
  failed state tops out at SWAT forever. A superpower runs all six rungs and ends with a
  state-sanctioned superweapon sent to kill you.

So the country is not a difficulty slider and not a menu of bonuses. **It is the rulebook, the
police force, and the enemy list, all of which are already implemented.**

Starting unemployed matters for the same reason: it makes the first offer of backing a real
decision. Government money in a high-integrity state buys equipment and costs you the right to
choose your missions. Independence in a low-integrity state costs you everything except freedom.
Neither is the good option.

---

## 6. What I would honestly worry about

**The tech merge is not the hard part.** Mounting a canvas is a week. The hard part is that this
turns two projects that each currently *work* into one project that is broken until it is finished.
Stage 0 and Stage 1 are designed specifically so that most of the value lands before that risk.

**The turn-based decision is irreversible in practice.** Once the strategy layer is built around
real-time deployment, going back means rebuilding it. This is the one to sleep on.

**Scope is the actual enemy.** The HQ document describes secret identities, pets, sidekicks,
prisons, kaiju ranges, orbital bases and multiple headquarters. Every one is a good idea. All of
them together is an unfinished base simulator with no game attached. Six rooms and one painful
choice first.

**The countdown.** SHT has a fixed ~2,472-day alien invasion clock. WAR WORLD has no such frame.
That is a big tonal commitment and the merge should decide deliberately whether to keep it — it
shapes every mission's meaning.

---

## 7. If you only do one thing

**Stage 0.** One sheet, both repos, no behaviour change. It costs little, it prevents the exact
class of bug this project has been bitten by before, and it is the only thing here that is correct
regardless of every other decision in this document.
