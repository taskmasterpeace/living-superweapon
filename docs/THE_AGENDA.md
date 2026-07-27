# THE AGENDA — the loops, in order, with what each one produces

*2026-07-27. `docs/LOOPING.md` is the METHOD. This is the LIST. Robert, correctly: "you haven't
really told me anything."*

Focus is **WAR WORLD**. Ascension is set aside except where it lends a tool.

---

## ⚠ THE THING THAT REORDERS EVERYTHING: THE HARNESS IS THE PASSPORT'S PROOF

Robert's two asks in one sentence — *"unify the harness for everything… and have some for the
Passport"* — are the same ask, and that is not obvious until you try to write the test.

**You cannot verify a contract between two games from inside either one of them.** A Passport that
Ascension exports and War World imports has no home: an Ascension test can only prove it *wrote*
something, a War World test can only prove it *read* something, and the interesting failure — the two
disagreeing about what a 70-band Ascendant is — lives in the gap between them where neither harness
can see.

So the unified harness is not tidiness. **It is the only place a cross-game contract can ever be
checked**, and it is the same idea as the Passport itself one level up: *one contract, many engines.*

That is why items 0 and 1 are what they are, and why everything else waits.

---

## 0. THE UNIFIED HARNESS — *nothing else starts until this does*

**Why first:** every loop below ends with a critic, and a critic that cannot see approves broken work.
Proven twice today — the 9-mode sweep passed a visibly broken boxing stage, and `auditSurfaces`
reported *fewer* problems as the fault got worse.

**What exists already, and it is most of the way there:**

| | Ascension | War World |
|---|---|---|
| drive seam | `window.LSW` = `{game, hud, ROSTER}` | `__ww` · `__lab` · `__range` · `__pose` · `__bodylab` · `__wwInstruments` — one per surface |
| headless sim | freeze-frame + step `game.update(dt)` | `tools/combat-bench.ts` — **pure node**, `new World()` + `w.step(1/60, cmds)` |
| screenshot | Playwright, proven, recipes in `docs/` | `tools/capture-screenshots.mjs` — ⚠ **playwright not installed** |

**The work, smallest first:**

1. `npm i -D playwright && npx playwright install chromium` in War World. **Pin it** — leaning on a
   global means it works here and silently does not on a clone.
2. **`npm run verify` means the same thing in both repos.** One entry point, three jobs: *drive real
   input* · *assert an invariant* · *capture a frame*. Not a shared library — a shared **contract**,
   because the engines have nothing in common and forcing shared code is how this dies.
3. **Adopt War World's convention, not Ascension's.** Six named handles beat one god-object: a critic
   gets pointed at the surface it is criticising. Ascension grows `__atlas`, `__ring`, `__pw`.

**Done when:** one command in either repo drives the real thing, fails on a wrong result rather than
an absent one, and leaves a frame on disk.

⚠ **Do not build a third harness for PowerWorld.** It is a mode inside Ascension; it gets `__pw`.

---

## 1. THE PASSPORT STUB — *ten lines each side, before any feature is looped*

**Why second:** every feature built after this is built *against* the contract instead of around it.
Retrofitting a shared format into two mature games is what kills multiverse projects.

- The stub is a **type and a round-trip**, not a system. Integer 0–100 (ruled), no decimals on the
  sheet.
- **Its test is the first thing the unified harness earns us**: export from Ascension → import to War
  World → assert the same person came out. That test lives in neither repo comfortably, which is the
  point of item 0.
- ⚠ **Blocked on one open ruling** — B2 in `DECISIONS_REMAINING.md`: *does a 70-band Ascendant tune
  down in War World?* The stub can ship without the answer; the **import side cannot**.

---

## 2. THE MAP MAKER / INTERIORS — *the one Robert cannot answer on paper*

*"I gotta see it in game, and that's why I think we're ultimately gonna need a map maker."*

12 or 18 squares, and how nine rooms connect, are not loop questions — they are **look-at-it**
questions. ⚠ **ATLAS already is this tool** (`/atlas.html`, standalone, live 3-D, validator, undo 50
deep, JSON in/out). Adopt it before writing a second one.

**Not a loop yet.** It is an adoption, then Robert walks around one, *then* it becomes a loop.

---

## 3–6. THE CONTENT LOOPS — *these are the ones that actually run the pattern*

All four have their reference already written: `docs/infantry/` (5,243 lines from the game's own
files), `docs/powerworld/` (~8,100), `docs/reference/openjk.md` (2,319).

| # | loop | reference in hand | why it is ready |
|---|---|---|---|
| **3** | **weapons & the arsenal** | `docs/infantry/weapons.md` | the richest decoded reference we have — real numbers, not memory. Start here. |
| **4** | **AI & fireteams** | `docs/infantry/combat.md` | separable, and the hostage rule needs somewhere to live |
| **5** | **UI at Deck resolution** | — | the harness screenshots it directly; a critic with eyes is *most* useful here |
| **6** | **audio** | `docs/infantry/systems.md` | already has its own harness (`sound-editor.html`, `sound-review.html`) |

**Every one ends with the same two critics** (LOOPING.md §3): the harsh critic asking *"blind: ours,
or Infantry's documented behaviour?"*, and the gate —
`npx tsc --noEmit && npx vitest run && npm run lint && npm run build`.

---

## NOT A LOOP, AND DO NOT MAKE IT ONE

**The LSW replacement.** 688 references across 84 files, `AscendantId` is a closed union, and the
Passport is not proven. Parallel agents that cannot see each other will fight over a type union.
**Sequential, typechecker-driven** — which is its own kind of loop, and a better one for this job.

---

## THE STANDING ORDER

0 and 1 are prerequisites and are small — call it a day of work between them. 2 is a decision Robert
makes by looking. 3 is where the first real loop runs, and it is ready today except for the critic's
eyes, which is item 0.

⚠ **The bar in these prompts is deliberately unreachable. Robert is the brake, not the model.**
Decide the stop before starting.
