# RULINGS — 2026-07-27, the big answer session

*Everything Robert decided in one pass. Terse on purpose so nothing is lost.*

---

## THE CROSSOVER — the big ones

- **⚠ AN ASCENDANT DOES *NOT* TONE DOWN IN WAR WORLD.** *"No, it does not."* Question B2 is closed. A
  70-band Ascendant hits a soldier exactly as hard as they hit another Ascendant.
- **⚠ AND EVERYTHING IS PERMANENT.**
- **WE CHOOSE WHAT CROSSES** — it is a design dial, not a technical constraint.
- **⚠⚠ THE RISK *IS* THE MECHANIC — the best idea in the session.** *"Imagine the risk if you don't
  know what you're gonna lose from that character if you take them to another game."* From SUPERHERO
  TACTICS: you send someone to the future, **you do not know what comes back.** They return inside
  ~2 weeks of game time and **something is different** — changed, someone with them, something
  missing, or they came back with a story. **Crossing over is a gamble, not a transfer.** That single
  idea makes the Passport a *decision* instead of a save-file feature.
- **DECIMALS: not on the sheet, yes in the maths.** Confirmed. *"I love that."*
- **BAND NAMES: USE BOTH** — human words *and* threat words. Different universes use different ones,
  the Passport carries both, and **it determines how superpowered people are perceived.** In that
  world they are called **ASCENDANTS**.
- **AUTH: Supabase / Auth0 / Google — buy it.** ⚠ **But launch on our own private server first.**
- **NETWORKING: straight to networked.** Two-player local is later, not now. Steam Deck: you log in,
  you download the build.

---

## WAR WORLD

- **⚠ IT IS ALREADY PLAYABLE.** Capture-the-flag works today. **The problem is VISUAL, not mechanical**
  — after a battle the screen is buried in names. Show the **stats, the stars, the war correspondent**.
- **SQUADS ARE INVISIBLE.** You cannot tell who is in your squad. Want: a button for squad info, see
  the **squad leader**, and see **officers when they are inside the base**.
- **⚠ SPAWNING IS WRONG.** Spawning on top of the spawn point *"feels really futuristic."*
  **War World's thing is CLONING** — the spawn should read as being cloned, not teleported.
- **MELEE is War World's own**, not Ascension's. Settled.
- **⚠ MODELS: possibly replace ASCENSION's models with WAR WORLD's.** Flagged, not yet decided.
- **DIRECTIONAL DAMAGE: we don't have it.** Noted as a gap.
- **DRUGS** — the lane behind the soldier ceiling (rank 19). Enhancers that raise different things.

### THE VEHICLE DOOR — decided
**Not openable, no door damage.** You walk up, press a button, you are in. That is the whole feature.

### ⚠ THE VEHICLE LIFT — the best War World idea in the message
A truck drives to the **back of the garage**, a lift takes it to the **second floor**, so a team can
stack vehicles up there. **And then the door the other team has to breach is tougher.** One mechanic
that makes interiors, vehicles, verticality and breaching all argue with each other at once.

### ELEVATORS + TWO FLOORS
*"If everything is two floors we can really do some cool stuff."*

### ⚠ MOUNTAINS ABOVE THE BUILDINGS
Mountains that reach **the top of the sky — higher than any building — forcing planes to climb to the
clouds.** That is terrain as an air-traffic constraint.

### CROUCH — the rule that makes it worth having
**Crouch gives cover AND dodges.** *"If you are standing, one round fires, you duck, it misses."*
⚠ So ducking is **reactive** — a round already in flight can be ducked. That is a real timing skill and
it is what makes crouch keep its place beside prone (see `docs/THE_STANCE_LADDER.md`).

---

## "PLAYABLE ON THE STEAM DECK" — the finish line, in his words

1. **Menus big and navigable** on the Deck
2. **No AI-generated sounds left** (unsure War World ever had any — check)
3. **Controls: point a direction, the character aims there.** Zoom in and out easily.
4. **An actual game loop**
5. **You can go inside buildings**
6. Elevators, two floors, the vehicle lift

---

## INTERIORS — the answer to "editor or map?"

**⚠ THE EDITOR.** Unambiguous. And it must support:

- **different hallway sizes** (the dial, not one number)
- **things placed on walls** — dress it up later
- **⚠ DESTRUCTIBLE WALLS**, like Ascension. Certain wall *types*. *"We already have different types as
  far as I know."*

---

## CAST + FIXES

| item | ruling |
|---|---|
| **Brother's character** | **ED "SHOGUN" DIXON** — S-H-O-G-U-N. A Black man. Smooth. **Says witty stuff.** Voice sample to come; write provisional lines now. |
| **Ghost's real name** | ⚠ **STILL OPEN.** Dislikes generic codenames. *"I thought it was Apple Trader, or…"* — unresolved. |
| **The K9** | **GERMAN SHEPHERD.** *"People know more that."* Overrides the Malinois design note. Use Ascension's. |
| **Miss Dee / personas** | *"Just do whatever you think is best — we just wanna get it consistent."* Skin tone per persona: make the issue. |
| **VEGA's purple** | *"That don't matter, I'm not worried about that."* Stays. |
| **⚠ OLYMPUS `frameOf` bug** | **FIX IT.** He wants a **heavyweight adult**, not a thirteen-year-old. |

---

## ⚠ POWERWORLD IS MISSING THE TWO THINGS THAT MAKE IT BID FOR POWER

Named directly, and both are real gaps:

1. **DESTRUCTIBLE ENVIRONMENT** — destroy something, **pick it up, throw it at them**. And the other
   player can **blast the thing you threw out of the air before it lands.** ⚠ Ascension already has
   every piece of this (`grabProp` / `throwProp` / the weight ladder / projectile collision);
   PowerWorld's stage simply has nothing to pick up.
2. **⚠ PEOPLE DO NOT GO FLYING FAR ENOUGH.** *"You punch them or you blast them and they go flying back
   really far — that's one thing we're missing in PowerWorld."* The `_chaseKb` drag exception exists
   and travels 61u against the city's 16u, **and it is still not far enough.** That is a tuning number
   and it should be tuned by feel, not by arithmetic.

---

## PROCESS

- **CODEX joins the work.** Robert wants it helping.
- **Image pipeline + gameuidatabase: agreed, LATER.** Neither gets War World onto the Deck.
- **⚠ NEVER ESTIMATE IN WEEKS — see `CLAUDE.md`.** The unit is **a loop**.
