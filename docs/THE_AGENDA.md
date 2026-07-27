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

### WHERE THE CONVERSATION IS, AND WHERE THE TOOL GOES *(asked 2026-07-27)*

⚠ **THE DECISIONS AND THE WORK ARE IN DIFFERENT REPOS, AND THAT IS A HAZARD WORTH NAMING.**

| what | where |
|---|---|
| **the rulings** | `docs/DECISIONS_REMAINING.md:14-15` — *short corridor* · *12-or-18 cannot be decided on paper* |
| **his own uncertainty, verbatim, unresolved** | `docs/MULTIVERSE.md:790` |
| **the Ascension-side interiors that already work** | `docs/THE_MAP_MAKER.md` · `docs/ATLAS_FORMAT.md` · `docs/BACKLOG.md` |
| **the actual work item** | **ShootEm #149, OPEN** — *"THE BASE BUILDER + interior combat — the critical path before the big push"* |

So while the focus is War World, the ruling that governs it lives in the *other* repo's docs folder.
Copy the two decisions into #149 before the next push, or they will be re-litigated by someone who
never saw them.

**WHERE TO BUILD IT: a new War World LAB PAGE.** War World ships 26 of them and has **no**
base/interior/room page — `animroom` and `warroom` are the nearest and neither is it. ⚠ **Do not port
ATLAS** — different engine, different plan format, and a port drags Ascension's city model into a game
that does not want it. **Copy its SHAPE**, which is proven: standalone page · live 3-D behind the panel
· a validator that shares one rule with the generator · undo · named layouts · JSON in and out.

⚠ **And this is the item that most needs the unified harness**, which is why 0 and 2 are really one
move: *"12 or 18 squares"* is a **look-at-it** question, so the critic must be able to screenshot,
so `playwright` must be installed. Without item 0 this loop cannot answer the only question it exists
to answer.

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

**The LSW replacement.** ⚠ **Re-measured 2026-07-27** — this line used to say *"688 references across
84 files"* and that number was attached to the wrong symbol. `AscendantId` (`src/sim/types.ts:86`) is
a closed union of **40 members · 67 occurrences · 19 files**; the actually-large thing is the `lsw`
system at **1,146 occurrences · 108 files** (`rg -o "lsw" src tests`). Both conclusions survive the
correction and the reason is stronger, not weaker: parallel agents that cannot see each other will
both add a valid union member and the merge will silently keep one. **Sequential,
typechecker-driven** — which is its own kind of loop, and a better one for this job.
See `docs/LOOPING.md` §5 W2/W3 and §7B on why an uncited number is a rumour.

---

## ⚠ FILES OR GITHUB ISSUES? — files, with two narrow exceptions

*Asked 2026-07-27. The two repos already disagree: Ascension runs entirely on `docs/` + commit
messages, War World has issues (#145-#149). Recommendation: keep both, but on a rule.*

**FILES ARE THE DEFAULT, and the reason is not taste — it is that we work through agents.**

- **An agent reads files for free; an issue costs a `gh` call, a network round trip and auth.** Every
  loop, every subagent, every fresh session opens `CLAUDE.md` and `docs/`. A ruling in a doc is in the
  context window before anyone asks. A ruling in an issue is only found by someone who already
  suspected it existed.
- **A file versions with the code.** The decision sits in the commit that implemented it. An issue is
  a second timeline, and second timelines drift.
- **The commit messages here already ARE the engineering log** — reasoning, measurements, traps. That
  is strictly better than an issue thread, because it cannot detach from the diff it describes.

**USE AN ISSUE ONLY WHEN:**
1. **Another person has to see or act on it.** Issues are for humans who are not in the conversation.
2. **The work is in a repo you are not currently in.** ⚠ This is the real one, and it just bit us:
   the interior ruling is at `docs/DECISIONS_REMAINING.md:14-15` in *this* repo while the work is
   **ShootEm #149**. A file in D:\lsw cannot nag you about D:\git\ShootEM.
3. **The work is cross-repo** — the Passport belongs to neither docs folder.

⚠ **AND THE FIX FOR CASE 2 IS NOT "MOVE IT TO AN ISSUE."** It is: **the ruling lives in the file, and
the issue carries a pointer to it.** One line in #149 naming the file and line numbers. Duplicating a
decision into two places is how the two copies start disagreeing — the same law as one rule exported
and imported rather than reimplemented.

---

## ▶ THE NEXT TWO SESSIONS — paste these

*Written 2026-07-27 to survive a context wipe. Two sessions, because the first is small and unblocks
the second. **Do not skip session A** — the map maker exists to answer a look-at-it question, and
without eyes it cannot answer it.*

### SESSION A — THE HARNESS *(an hour, maybe two)*

```
Read D:\lsw\docs\THE_AGENDA.md item 0, then work in D:\git\ShootEM.

Install and PIN playwright (npm i -D playwright && npx playwright install
chromium). Prove tools/capture-screenshots.mjs runs end to end against
npm run dev on :3400 and leaves a real frame on disk.

Then make `npm run verify` mean the same thing in D:\git\ShootEM and D:\lsw:
drive real input, assert an invariant, capture a frame. A shared CONTRACT,
not shared code — the engines have nothing in common.

Gates: npx tsc --noEmit && npx vitest run && npm run lint && npm run build
Never git add -A. Name every file. Nothing in src/sim/ may use Math.random
or the wall clock.

Done when one command in either repo fails on a WRONG result, not just an
absent one.
```

### SESSION B — THE MAP MAKER *(the big one)*

```
Read D:\lsw\docs\THE_AGENDA.md item 2 and ShootEm issue #149. Work in
D:\git\ShootEM.

Build the base-builder / interior editor as a NEW WAR WORLD LAB PAGE. War
World ships 26 of them and has none for this.

⚠ DO NOT PORT ATLAS from D:\lsw. Different engine, different plan format.
COPY ITS SHAPE, which is proven: standalone page · live 3-D behind the
panel · a validator that shares ONE rule with the generator (exported and
imported, never reimplemented) · undo · named layouts · JSON in and out.

The two rulings already made, at D:\lsw\docs\DECISIONS_REMAINING.md:14-15 —
rooms connect by a SHORT CORRIDOR, and 12-vs-18 squares is deliberately
UNDECIDED because Robert has to walk around one to answer it. The tool
exists to let him answer it. Do not pick for him; make both easy to try.

Gates as session A. Finish by screenshotting a built base through the
harness from session A.
```

⚠ **First act of session B: copy those two rulings into #149 as a pointer** (file + line numbers,
not a duplicate). They govern War World and they live in the other repo.

### STILL OWED, NOT BLOCKING

**The QUERENT choices.** `docs/QUERENT.md` is written and the engineering is settled — an order is a
**drive**, not an emotion, four of seven are already in `psyche.js:174`, three are new rows. What is
*not* done is the set of decisions Robert asked for: is Querent a dimension you travel to · do you
join an order or hunt it · does an order replace a kit or overlay it · which order ships first. Ask
for it when the map maker is moving.

---

## THE STANDING ORDER

0 and 1 are prerequisites and are small — call it a day of work between them. 2 is a decision Robert
makes by looking. 3 is where the first real loop runs, and it is ready today except for the critic's
eyes, which is item 0.

⚠ **The bar in these prompts is deliberately unreachable. Robert is the brake, not the model.**
Decide the stop before starting.
