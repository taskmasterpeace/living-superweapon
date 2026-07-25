# THE WILDLIFE BRIEF — 20 buildable ideas

*Written 2026-07-25. Each entry is a scene first, then the spec. Nothing here is built except the
base layer it all sits on (`src/engine/wildlife.js`: 64 instanced birds + 40 litter pieces,
0.047ms/frame, scattering on `game.noise`).*

**LOE** — S: under a day · M: 2–4 days · L: a week or more
**Impact** — 1–5, how much it changes *playing*, not how much it changes *looking*

---

## 0. THE CALENDAR — the prerequisite

**Not an idea. A missing organ.** `world.dayT` is a four-minute day cycle. `career.week` counts
matches. Neither maps to a month, so `climate.t[12]` (real monthly temperatures for all 1,050
cities) and `climate.snowMonths[]` are **read by nothing.** They are as dead as `cloning` was.

Map the week to a month. `climate.t[12]` is built from a **signed latitude**, so southern-
hemisphere cities come out correct for free — January in Buenos Aires is already summer in the
data. Non-career matches take a month from the theater seed.

- **Reads** `career.week`, `climate.t[12]`, `climate.snowMonths`
- **Touches** `src/data/career.js`, a new `monthOf()` helper
- **LOE** S · **Impact** 5 (unblocks ~8 entries below and two whole authored columns)
- **Risk** the non-career month is an arbitrary choice you have to live with

---

# TIER ONE — the intel layer

*One commit. These three share a single state read, add no geometry, and together turn the birds
from decoration into a two-way information system. This is the highest-value day on the board.*

## 1. Birds rat you out

**The moment.** You land on a rooftop to line up a shot and pigeons burst off the ledge. Across
the street an officer was facing your way. He doesn't see *you* — but he turns toward the roof and
starts walking.

Right now the flush only helps the player. This makes it cut both ways, and it has real
counterplay: stay off roofs, move slower, or spook a flock somewhere else on purpose.

- **Reads** `wildlife.bst[]` FLEE transitions, `game.canSee`, `ai.remember(x,z,y,'noise',jitter)`
- **Touches** `wildlife.js` (emit a flush event), `ai.js` (consume it)
- **LOE** S · **Impact** 5
- **⚠ The risk that matters.** The bot must be *able to see* those birds. A bot that "hears" a
  flush through a building is a new wallhack, and undoing the last one took days. Gate on
  `canSee` and the vision cone, and file the lead as `noise` rank — fuzzy, not exact.

## 2. The empty roof

**The moment.** Every roof in the district has birds on it. One doesn't. Someone is up there.

- **Reads** `world.cover[].top`, `wildlife.bst[] === PERCH`, `wildlife.roofs[]`
- **Touches** `wildlife.js`, optionally `hud.js` (radar dots, same pattern as the `_lastKnown` "?")
- **LOE** S · **Impact** 4
- **⚠** Only works if roosts are dense and stable enough to have a noticeable gap. Needs the perch
  count tuned up per district, or the signal is noise.

## 3. The hawk that lies to you

**The moment.** Pigeons scatter over the bank. You spin, guard up. It was a hawk. Nothing is there.

This is the one that makes the other two *skills*. A tell with a 100% hit rate is a HUD element
wearing a costume. Give it an honest false-positive rate and the player has to read it.

- **Reads** `plan.landmarks[]` (tower/cathedral/monument) or the tallest `cover.top`;
  `city.popType` ≥ City — no pigeons, no hawk, which is also the biologically correct gate
- **Touches** `wildlife.js` only (one extra instance, reuses `scare()`)
- **LOE** S · **Impact** 4
- **⚠** Tune the rate. Too many false alarms and players stop reading the signal entirely.

---

# TIER TWO — consequence

*One commit. All three reuse the existing bird pool and data the engine already tracks.*

## 4. Scavengers arrive after

**The moment.** You flatten a block and fly off. Ninety seconds later you pass back over it and
it's covered in crows.

Destruction currently just sits there, inert. This makes the wreckage a place where things live.
It also means you can look across a map and tell where people died.

- **Reads** `game.matchLog` KO entries (clock + position), `world._gh` crater map,
  `cover[].destroyed`, `city.biome`, `climate.t[month]` (flies need warmth), `country.healthcare`
- **Touches** `wildlife.js`, reads `game.js` state
- **LOE** S · **Impact** 5
- **⚠** Bodies despawn on respawn in most modes — anchor the effect to the `matchLog` entry, not
  to the corpse.

## 5. Crows remember where you fought

**The moment.** You blow a car and move on. Crows circle back and settle on the roof overlooking
the wreck. Two minutes later another fighter flies in, sees a black cluster on exactly one
building, and knows something happened there.

Every other animal in the layer flees. Crows are the species that gets *bolder* around violence.

- **Reads** `game.noise` broadcast, `cover[].top` within ~60u of the event, `city.biome !== 'desert'`
- **Touches** `wildlife.js`
- **LOE** S · **Impact** 4
- **⚠ Honesty-safe by construction** — it reports the *past*, never a live position. Keep it that
  way; a crow cluster that tracks a moving player is a wallhack.

## 6. Dead birds mark the gas

**The moment.** KIVULI's cloud disperses and the pretty particles stop. The dead birds stay on the
ground, and the square is still obviously poisoned.

- **Reads** `game._smoke` zones, `DTYPES`/`DTYPE_INFO`, `resistOf`
- **Touches** `wildlife.js`, small hook in the DoT/zone path
- **LOE** S · **Impact** 4
- **⚠** Litter instances are a fixed pool of 40 — dead birds have to *borrow* from it and be
  reclaimed, or a long match runs out of litter.

## 7. Birds circle dropped weapons

**The moment.** You KO someone and they drop a carbine. At true city scale that is a two-pixel
speck you will never find. Birds circling over it make it findable — and your opponent sees the
same circle, so nobody is cheated.

- **Reads** `game._drops` (20s despawn, ≤10 live), `handleKO`, `country.healthcare` (how long the
  column holds)
- **Touches** `wildlife.js`
- **LOE** S · **Impact** 4
- **⚠** The gear system already despawns drops at 20s; the birds must not outlive the drop or
  they advertise nothing.

---

# TIER THREE — the country, made visible

*These need one new instanced ground mesh, reskinned by numbers. That single mesh delivers four
entries, which is why they are grouped.*

## 8. Dogs show you the country's wealth

**The moment.** Same dog model. In a rich, healthy country it wears a collar and walks beside a
pedestrian. In a poor one it is ribby, alone, asleep in the warm middle of the road in threes, and
it owns the night. You know what kind of country you are standing in before you read the name.

- **Reads** `country.gdpPerCapita` (range 20–90), `country.healthcare`, `city.crime`, `world.dayT`
- **Touches** new `wildlife` ground pool, `pedestrians.js` for the on-a-lead pairing
- **LOE** M · **Impact** 4 · **⚑ makes `gdpPerCapita` and `healthcare` live for the first time**

## 9. Rats show whether anyone is maintaining it

**The moment.** A functioning city: none. A high-crime, low-healthcare city: rats streaming along
the gutters at night — and in *daylight* if it has really gone.

- **Reads** `gdpPerCapita`, `healthcare`, `city.crime`, market/industrial/seaport cells, `dayT`
- **Touches** the same ground pool
- **LOE** M · **Impact** 4 · **⚑**
- **⚠ Tone.** This will make poor countries read as dirty. That is the honest reading of the
  sheet, but it is a deliberate call, not an accident — make it on purpose or not at all.

## 10. Guard dogs bark, and the cops come

**The moment.** You are sneaking toward an objective in a high-crime, badly-policed city. Private
security fills the gap the state left: chained dogs behind razor wire on every company perimeter.
One barks. It broadcasts into the same noise system the police hear.

Stealth is genuinely harder here, and the reason is a policy failure you can hear.

- **Reads** `city.crime` ÷ `country.lawEnforcement`, `country.lawBudget`, `gdpPerCapita`,
  the `perimeter()` sockets already computed for company/industrial/residential cells
- **Touches** ground pool, `game.noise`, `police.js`
- **LOE** M · **Impact** 4

## 11. The stampede

**The moment.** A village at dusk. Something explodes. Two hundred cattle go through the
crossroads as one mass — and they knock down pedestrians and break a police cordon.

The countryside currently has open sightlines and low cover but no crowd system of its own. This
gives rural fights a control tool the city does not have.

- **Reads** `plan.rural`, `city.biome === 'grass'`, `gdpPerCapita` (livestock vs cars), farmland
  cells, hedgerow sockets as the boundary, `game.noise` as the trigger
- **Touches** ground pool, `pedestrians.js` (`blast`), `police.js`
- **LOE** M · **Impact** 3
- **⚠** Herd-vs-fighter collision is real physics work. Keep them soft cover that knocks down, not
  a solid wall.

---

# TIER FOUR — the specials

## 12. Crows that don't flinch

**The moment.** You bring a building down in the government quarter. Everything in the game
scatters — except one roost, which sits and watches.

Crows gather where death is routine and stop being frightened of it. In the 39 countries where
`capitalPunishment` is Active, the political district carries a permanent habituated roost, thinner
at Rare, gone at Inactive.

- **Reads** `country.capitalPunishment` (Inactive 100 / Rare 29 / Active 39), `govPerception`,
  political tile, `dayT`
- **Touches** `wildlife.js` — an *inversion* of existing flee logic, so it is **less** code than a
  normal bird
- **LOE** S · **Impact** 4 · **⚑ the only good job anyone found for `capitalPunishment`**
- **⚠** 39 countries is narrow reach for high craft. Worth it because it is nearly free.

## 13. The dawn chorus, and its silence

**The moment.** Dawn. Birds singing across the block. They stop. Something entered your street.

You get the same information the AI's honest hearing model already gets, delivered to your ear —
which is exactly what makes it fair rather than a gift.

- **Reads** `world.dayT` pre-dawn window, park/forest/farmland cell counts in earshot,
  `city.biome`, `snowMonths` (no chorus in a snow month), `soundscape._violence`
- **Touches** `core/soundscape.js` — **the ambience director already has a five-state machine and
  a violence decay; this is a new layer on existing machinery, not a new system**
- **LOE** S · **Impact** 4 · **needs #0 for the snow gate**

## 14. Birdstrike

**The moment.** Afterburner lit, full cruise, you clip a flock. Small hit, boost cut, you drop a
deck.

Flying fast currently costs nothing at all.

- **Reads** `def.afterburner`, `entity.flying`, `BANDS`, the **4 flock anchors** (four sphere
  tests per frame, not 64)
- **Touches** `entity.js` physics, `wildlife.js`
- **LOE** S · **Impact** 3
- **⚠** Risks feeling like punishment for using the fun button. Generous cone, loud tell, small
  damage.

## 15. The windsock — make the wind real

**The moment.** You are about to throw a gas canister. You check which way the litter is blowing
first.

`wildlife.wind` already exists as a float that only moves paper. Make it drive `game.addSmoke`
drift, arrow flight and rifle spread crosswind — with the blowing litter as the free, readable
indicator that was already on screen.

- **Reads** `wildlife.wind`, `weather.wind`/`windDir`, `climate.precip`, `plan.relief.amp`
- **Touches** `wildlife.js`, `projectiles.js`, `game.addSmoke`
- **LOE** M · **Impact** 4
- **⚠** Changes ballistics balance. Keep the effect small enough to be tactical, not random.

## 16. The barometer

**The moment.** The birds drop low and go agitated. Three seconds later the storm ult lands.

The weather system already ramps toward a target over seconds, so the flock can react to the
*intent* before the first raindrop renders.

- **Reads** `game.weather._target.rain`/`.cloud` vs current, `.storm`, `._src`
- **Touches** `wildlife.js`
- **LOE** S · **Impact** 3
- **⚠ Honesty check:** it warns of an *effect*, never a position. That keeps it legal.

## 17. Species richness — the country you can see

**The moment.** You fly out of the industrial district into the park and the sky visibly gains
kinds of bird.

How *many species* a place supports is the most honest possible readout of a country's science,
anti-corruption and healthcare scores — three columns that currently do nothing.

- **Reads** `country.science`, `country.integrity` (**HIGH = clean**), `country.healthcare`,
  `gdpPerCapita`, per-cell tile type, `city.crime`
- **Touches** `wildlife.js` `setCity()` seeding; optionally an atlas card line computed by running
  the same function over the plan — the DAMAGE CODEX pattern, so the card cannot drift
- **LOE** M · **Impact** 5 · **⚑**
- **⚠** Worthless as a number on a card. Build the visible version first or not at all.

## 18. The K9 rung

**The moment.** Wanted level two. A handler and a dog come out of the cruiser. The dog does not
need line of sight to follow you.

- **Reads** `country.lawBudget`, `lawEnforcement`, `intelBudget`, `terrorism`,
  `ladderGatesFor(C)` — the same gate shape `_hasFeds`/`_hasMilitary` already use
- **Touches** `police.js`
- **LOE** M · **Impact** 4
- **⚠** A tracker that ignores fog is powerful. It should be *fast and fragile*, and hurting it
  should escalate like hurting an officer.

## 19. The Red List

**The moment.** The atlas card for a city reads **LAST CONFIRMED SIGHTING — WEEK 14**, with your
registry number under it.

Killing wildlife books permanently, in a ledger beside the Elo book. Species, city, date, killer.
There is a line you can cross and not uncross.

- **Reads** the `rankings.js` book pattern (`bookInjury`/`injuryOf` is the exact template), city
  identity (`name`+`country`), the derived species table, `career`
- **Touches** `data/rankings.js`, atlas card, codex
- **LOE** M · **Impact** 4
- **⚠** Persistent moral consequence needs to be *legible before* you cross it, or it is a gotcha.

## 20. The falconer — absence as the tell

**The moment.** Birds everywhere in this city, except over one compound. That building is
protected, and someone pays for it.

- **Reads** `country.terrorism`, `intelBudget`, `gdpPerCapita`, airport/military footprints
- **Touches** `wildlife.js` perch exclusion (a *subtraction*, so it is cheap)
- **LOE** S · **Impact** 3 · **⚑**
- **⚠ `hvt` is dead** — it is set on exactly 1 of 1,050 cities. Anything keyed on it silently
  never fires. Derive the target instead (political tile + `popRating` + `terrorism`). This is the
  same class of bug as the `pickCity` safety default that made every police ETA ~16 seconds.

---

## Build order

| Commit | Contents | LOE |
|---|---|---|
| 1 | #0 calendar | S |
| 2 | #1, #2, #3 — the intel layer | S |
| 3 | #4, #5, #6, #7 — consequence | S |
| 4 | #8, #9, #10, #11 — one ground mesh, four reads | M |
| 5 | #12, #13, #16, #20 — the cheap specials | S |
| 6 | #14, #15, #17, #18, #19 — the ones that touch balance | M–L |

Commits 1–3 are roughly two days and deliver most of the gameplay value. Everything after that is
optional and can be judged on whether the first three landed.

## Two things not on this list, deliberately

**`sector`** is blank on 523 of 1,050 rows and every animal use for it is an ecological read
pretending to be something else. Better unused than faked.

**`hvt`** is set on one city. Any idea that needs it must derive it instead.
