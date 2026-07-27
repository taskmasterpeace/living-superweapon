# LOOPING — the prompt pattern, and how it has to change for War World

*2026-07-27. The Brief + Orchestrator + Quality Control template, adapted to a codebase that already
exists and already ships.*

---

## THE TEMPLATE, AND WHY IT WORKS

Three paragraphs, spoken plainly:

1. **BRIEF** — anchor to a *real named reference*, demand "utterly perfect", give two example areas,
   then say "anything you could think of" so the model expands scope intelligently instead of you
   listing everything.
2. **ORCHESTRATOR** — a staffing plan. Sub-agents per subsystem, plus **a separate harsh critic**.
3. **QUALITY CONTROL** — **blind side-by-side** against the reference, loop until it wins.

The three load-bearing ideas, in order of how much they matter:

- ⚠ **THE CRITIC MUST BE A SEPARATE AGENT.** Self-critique is too lenient. This is the whole trick.
- ⚠ **BLIND SIDE-BY-SIDE BEATS SCORING.** "Which of these two is better" is a question a model answers
  honestly. "Rate this 1-10" is a question it flatters.
- ⚠ **AN UNREACHABLE BAR KEEPS IT MOVING.** You are the brake, not the model.

---

## ⚠ WHERE IT BREAKS ON WAR WORLD — read this before running one

The template's own advice includes: *"No extra rules, CLAUDE.md scaffolding, or verification steps —
Opus 5 handles that itself and overdoes it if prompted."*

**That is correct for a greenfield one-shot and dangerous here.** It is tuned for *build a new thing
from nothing*. War World is *improve an existing thing without breaking it* — 968 commits, TypeScript,
four CI gates, and **an authoritative multiplayer server**. Those are different jobs and they need
different loops.

Four concrete hazards, every one of them learned by being bitten today:

| hazard | why the plain template walks into it |
|---|---|
| **`Math.random` in `sim/`** | A sub-agent "improving feel" adds one and the client and server disagree about whether you hit. Not a bug — a desync. The template has no reason to know this. |
| **688 references across 84 files** | "Fan out sub-agents on each subsystem" assumes subsystems are separable. `AscendantId` is a closed union threaded through the whole game. |
| **"0 errors" is not "correct"** | My own 9-mode sweep passed the boxing stage clean **while it was visibly broken**, because nothing it asserted could see a sloped floor. A critic that only reads the console will approve broken work. |
| **A green test can lie** | Four separate times today a test passed while the feature was broken — because it wrote a value instead of driving the input. **Drive the gate.** |

**So: keep the template's shape, add exactly two things — the gates, and a critic that can SEE.**

---

## THE ADAPTED PATTERN

### 1. THE REFERENCE — and our unfair advantage

The template says anchor to a real named game. For War World that is **Infantry Online**.

⚠ **And we now have something almost nobody running these loops has: the reference in NUMBERS.**
`docs/infantry/` is 5,243 lines decoded from the game's own files, and `docs/powerworld/` is ~8,700
more for Bid For Power and OpenJK. So the critic does not have to argue about vibes:

> *"Infantry's heavy weapons could not fire while moving — a binary gate, and there is no
> move-accuracy field anywhere in its schema (`docs/infantry/weapons.md`). Ours applies a spread
> penalty instead. Which of these creates a decision?"*

**That is a factual critic, not an aesthetic one, and it is far harder to fool.** A blind side-by-side
against a 1999 game nobody can screenshot would be worthless; a blind side-by-side against its
documented behaviour is decisive.

### 2. THE ORCHESTRATOR — staff it by SUBSYSTEM, not by file

Good fan-outs for War World, each genuinely separable:
`interiors & the base builder` · `weapons and the arsenal` · `vehicles` · `UI at Deck resolution` ·
`audio` · `AI and fireteams`

⚠ **Do NOT fan out on the LSW replacement.** 688 references, a closed type union, and a Passport that
does not exist yet. That one is sequential and typechecker-driven, and parallel agents will fight.

### 3. THE CRITIC — two of them, and they check different things

| critic | asks | fails the loop when |
|---|---|---|
| **THE HARSH CRITIC** (the template's) | "Blind: this, or Infantry's documented behaviour?" | it does not win |
| **THE GATE** (ours, non-negotiable) | `npx tsc --noEmit && npx vitest run && npm run lint && npm run build` | any of the four fails |

⚠ **And give the harsh critic EYES.** A critic reading only the console is the boxing-stage failure
again. It must screenshot, or drive the real input path, or assert an invariant — never read a flag
that says things are fine.

### 4. THE BRAKE

You are it. The bar is deliberately unreachable, so the loop runs until you stop it or the budget does.

---

## THE TEMPLATE, FILLED IN FOR WAR WORLD

```
Build out [SUBSYSTEM] in War World (D:\git\ShootEM) at the level of Infantry Online.

We have Infantry decoded in docs/infantry/ — 5,243 lines from the game's own
files, with real numbers. Use it as the reference, not your memory of it.

It should be utterly perfect — from [area 1] to [area 2] to anything you could
think of. Fan out sub-agents per subsystem and /loop on each.

Have a SEPARATE sub-agent be a harsh critic. It compares our behaviour blind
against Infantry's documented behaviour in docs/infantry/ and says which is
better and why. If ours does not win, it keeps going. That critic must SEE the
result — screenshot it or drive the real input path. Reading the console is not
seeing.

Every loop ends with all four gates green:
npx tsc --noEmit && npx vitest run && npm run lint && npm run build

Nothing in src/sim/ may use Math.random or the wall clock — the server is
authoritative and a desync is not a bug you can debug.

Don't stop until the critic is wowed. Fan out sub-agents and ultracode.
```

---

## WHAT WE STILL NEED BEFORE THE FIRST BIG LOOP

Ordered. The first two are what stop a loop producing confident garbage.

1. **CAN AN AGENT SEE WAR WORLD? — CHECKED 2026-07-27. YES, AND IT HAS TWO SEAMS, NOT ONE.**
   This was written as the unknown that blocked everything. It is answered, and War World is in
   *better* shape here than Ascendants — because the two jobs are separated instead of sharing one
   handle.

   | seam | what it is | what it can prove |
   |---|---|---|
   | **THE SIM BENCH** — `tools/combat-bench.ts` | pure node. `new World({seed, mode, matchMinutes})`, then `w.step(1/60, cmds)` + `w.takeEvents()` in a loop. **No browser at all.** Siblings: `zombie-bench`, `demolition-bench`, `bench-track`. | *behaviour* — deterministic, seeded, fast, and it drives the **real authoritative World with real commands**, which is the "drive the gate" law satisfied by construction |
   | **THE SCREENSHOT PATH** — `tools/capture-screenshots.mjs` | Playwright chromium against `npm run dev` on **:3400**, clicking the actual `#mode-select` / `#class-select` cards, then posing via the `window.__ww` debug handle | *appearance* — the thing the boxing stage proved no assertion can see |

   ⚠ **THE DEBUG HANDLE IS A HOUSE CONVENTION, NOT ONE GLOBAL.** Six of them —
   `__ww` (the game) · `__lab` · `__range` · `__pose` · `__bodylab` · `__wwInstruments` — one per lab
   page, each documented in its own file as "the live-verify handle, house convention". Ascendants has
   a single `window.LSW`. This is the better design and the loop should use it: point a critic at the
   handle for the surface it is criticising.
   ⚠ They are assigned via `Object.assign(window, {...})`, so **grepping for `window.X =` finds
   nothing and reads as "no drive seam exists"**. That is exactly the wrong conclusion; I drew it for
   ten minutes.

   ### ⚠ THE ONE THING ACTUALLY BROKEN — and it is 30 seconds
   **`playwright` is imported by the capture script and is NOT installed** — not in `devDependencies`,
   not in `node_modules`. So the *behaviour* seam runs today and the *seeing* seam does not. That is
   precisely the failure this section was written to prevent: a loop where the critic can only read a
   console, which is the boxing-stage failure with more steps.

   ```bash
   npm i -D playwright && npx playwright install chromium
   ```

   Pin it in `devDependencies` rather than leaning on a global, or the harness works on this machine
   and silently does not on a fresh clone — the same class of defect as a test that passes because it
   wrote the value instead of driving the input.
2. **⚠ ASSERTIONS THAT CAN SEE *WRONG*, NOT JUST *BROKEN*.** Today's lesson, twice over: a 9-mode
   sweep passed a visibly broken stage, and an audit tool reported *fewer* problems as the fault got
   worse. Before looping, write the equivalent of the **floor contract** for whatever is being looped
   — one assertion that would fail if the thing were subtly wrong rather than absent.
3. **The base builder's shape** (#149) — a loop cannot decide how nine rooms connect. That is a design
   ruling and it is already made: short corridors. But the *editor* to see it in has to exist first,
   and **ATLAS already is that tool** — adopt it rather than loop a second one into existence.
4. **The Passport stub** (`cof-passport`) — ten lines each side, now, so every looped feature is built
   *against* the contract instead of around it. Retrofitting a shared format into two mature games is
   what kills multiverse projects.
5. **A budget and a brake.** These loops run for hours and burn tokens hard. Decide the stop before
   starting, because the bar is designed never to be met.

⚠ **AND ONE THING NOT TO DO:** do not point this pattern at the LSW replacement yet. The contract is
not proven, the type union is closed, and 688 call sites will be edited by agents that cannot see each
other. That one wants the typechecker driving, sequentially — which is its own kind of loop, and a
better one for the job.
