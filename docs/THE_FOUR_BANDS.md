# THE FOUR BANDS — written out plainly, because the question deserved it

*Robert, 2026-07-27: "i need this writen out to understand i dont get this — there is 4 regions but
resting spots for flying... ground level, building level and sky level and clouds level.
**no buildings into sky.**"*

---

## ⚠ HE ASKED A DIFFERENT QUESTION THAN THE ONE I PUT TO HIM, AND HIS IS THE BETTER ONE

I offered a choice about the **flight ceiling**. He answered about **building height**. Those are two
different rules and I had them tangled:

- **THE CEILING** is how high a person can fly before they stop going up.
- **HIS RULE** is about how tall a BUILDING may be. *"No buildings into sky."*

**His rule is cleaner, and it is checkable.** A ceiling is a judgement call; "does any building poke
into the sky band" is a measurement.

## THE LADDER, IN PLAIN TERMS

Four rungs. A flying fighter rests on one of them — release the ascend key and a servo eases you onto
the deck of whichever band you are in, so you never hover at a random height.

| band | what it means |
|---|---|
| **GROUND** | walking height, and low hovering |
| **BUILDING** | rooftop height — you are level with the city |
| **SKY** | above every roof, nothing around you |
| **CLOUDS** | the lid |

**So the bands describe the CITY, and that is exactly why his rule matters.** "Building level" only
means anything if that is genuinely where the buildings stop.

## ⚠ THE VIOLATION — one tile type, measured today

`TILE_MAX_H` in `cityplan.js`, tallest first:

```
tower 294  |  company 152  |  commercial 142  |  cathedral 96  |  hospital 88
```

Ordinary buildings top out around **150** and sit inside the BUILDING band correctly. But the
**LANDMARK TOWER reaches 294**, and the sky band begins around **260**.

**So exactly one thing in the game breaks his rule, and it breaks it by roughly 34 units.** It was
deliberate — `CLAUDE.md` says the tower is *"210–250u, deliberately far above the 150u tower ceiling;
a landmark you can't see from across the map isn't one."* Good instinct, wrong lever: it bought
visibility by climbing into a band that is supposed to be empty.

## THE RULING

**NO BUILDING MAY ENTER THE SKY BAND.** Cap `tower` at the top of the BUILDING band for that city.

⚠ **And keep what the tower was reaching for** — a landmark must still read from across the map. The
honest fixes are WIDTH, silhouette, colour and a light, none of which cost a band. A cathedral is
unmistakable at 96 units.

⚠ **THE FLIGHT CEILING IS A SEPARATE QUESTION AND IS NOT CHANGED BY THIS.** The floor of 260 exists
because a Moon village with three buildings once produced a **42-unit ceiling** — you could not get
above a map that had nothing tall on it. That floor stays. What changes is only that buildings stop
where the building band stops.

⚠ **MOUNTAINS ARE NOT BUILDINGS.** His own idea from earlier today — *"mountains can go higher than
buildings, to the top of the sky, and force planes to fly to the clouds"* — is untouched by this rule
and is the reason the rule is good. **If nothing built ever enters the sky, then a mountain that does
is genuinely exceptional**, and flying over one means something.

---

# THE OTHER THREE ANSWERS, 2026-07-27

- **FIRST LOOP: THE HARNESS, BOTH REPOS.** Not negotiable, and he named the reason himself — the
  districts agent could not screenshot, so it verified by checking layout instead of by looking.
  ⚠ **An agent that cannot look has verified nothing.** Install and pin Playwright in War World, fix
  whatever broke Ascension's capture, make `npm run verify` mean the same thing in both.
- **RING-OUT KOs: LEAVE OFF FOR NOW.** Built, switchable in one word, deliberately not switched.
  Decide after playing.
- **⚠ HERO COLOURS: YES — HE STILL WANTS THEM DISTINCT.** This is the item that was measured and then
  **declined without telling him**. It is back on. Ascension is where it matters (fighters fill the
  frame); War World soldiers are ~30px and stay in military palettes.
