# LOOPING — the system for running unattended

*2026-07-27, second pass. The first version documented the METHOD and the HAZARDS and was correct.
It was not a system: it had no stop, no ownership, no way to tell a loop what it may not touch, and
its critic was asked politely to see rather than made unable to be blind.*

**What this is for:** Robert launches loops before work, comes back hours later, and reads one file
to find out whether real work happened. Two repos — `D:\lsw` (ASCENSION) and `D:\git\ShootEM`
(WAR WORLD) — plus Codex working alongside without the two agents fighting over the same file.

**⚠ THE UNIT IS A LOOP, NEVER A CALENDAR.** `CLAUDE.md:2932`. Nothing in this document estimates in
weeks, days or hours. Size work by *how many loops and what each loop's finish line is*. A loop has a
finish line; a clock does not.

---

## ⚠ THE NUMBERS THAT SET THIS DESIGN — measured today, not remembered

Every rule below exists because of one of these. They were measured on 2026-07-27 with the commands
shown, because the previous version of this file carried a number nobody had re-measured.

| measured | number | what it forces |
|---|---|---|
| War World test suite | **275 files · 2,349 cases** | a real suite exists — the gate is meaningful |
| of those, tests that screenshot or drive real input | **ZERO** (`rg "from 'playwright'\|chromium" tests/` → 0 hits) | **the entire suite is blind by construction.** §2 |
| `src/sim/` ban on `Math.random` | **2 code comments, 0 lint rules, 1 test scoped to arcade cabinets** | a forbidden list nobody checks is a comment. §5 |
| `performance.now` already inside `src/sim/` | **2 real hits** — `src/sim/theaters.ts:47,49` | the ban is already violated and nothing noticed |
| `AscendantId` | **40 members · 67 occurrences · 19 files** | ⚠ this file previously said *"688 references / 84 files"*. Wrong symbol. §5 |
| the `lsw` system | **1,146 occurrences · 108 files** (`rg -o "lsw" src tests`) | *that* is the 688-shaped thing. Still not a loop. |
| CI in War World | **none** — `.github` does not exist | every gate is a local command an agent could skip. §8 |
| gates in Ascension | **none** — `package.json` has `dev · start · build · preview · desktop*`. No test, no lint, no typecheck, no playwright, no `tests/` | ⚠ a loop in this repo has almost nothing to fail against. §1 |
| War World debug handles | **20 named** across 26 root HTML pages (`__ww`, `__lab`, `__range`, `__pose`, `__forge`, `__dojo`, `__beams`, …) | point a critic at the surface it is judging. §2 |
| Ascension debug handles | **1** — `window.LSW`, 20+ keys, `src/main.js:518` | one god-object; War World's convention is better |
| working tree, War World, mid-session | **13 dirty entries; `package.json` changed under a reading agent at 14:04:55** | ⚠ that *is* the parallel-stream hazard, live. §6 |

⚠ **The 688 is the lesson, not a footnote.** A number written into a doc, carried forward through two
rewrites, cited as the reason not to parallelise a subsystem — and it was attached to the wrong
symbol. It was never load-bearing enough for anyone to check and exactly load-bearing enough to make
a decision. **Every number in a loop's output carries the command that produced it, or it is a
rumour.**

---

## §1 — THE LOOP CONTRACT

**A loop declares itself before it runs.** Six fields. It writes them as the first entry in the
ledger, and every one of the six is checkable afterwards by someone who was not there.

```
LOOP CONTRACT
  ID        <repo>/<short-name>            e.g. warworld/arsenal
  SCOPE     the globs it may edit           e.g. src/sim/arsenal.ts src/client/models/weapons.ts tests/arsenal*.test.ts
  GATE      the exact command string        (see the table below — copy it verbatim)
  SEEING    A | B | C  + the artifact path   (§2 — one of the three, named, with a file it leaves on disk)
  NUMBER    the one continuous measure       (§4 — a count, a millisecond, a pixel delta. NEVER pass/fail)
  STOP      budget N · no-progress N · decision-exit ON
  FORBIDDEN the §5 list, plus anything another stream owns
```

### THE GATE IS NOT THE SAME COMMAND IN BOTH REPOS

⚠ This asymmetry is real, it is large, and pretending it away is how a loop in Ascension ships
garbage that a loop in War World could not.

| | WAR WORLD `D:\git\ShootEM` | ASCENSION `D:\lsw` |
|---|---|---|
| gate | `npx tsc --noEmit && npx vitest run && npm run lint && npm run build` | ⚠ **there isn't one.** `npm run build` is `vite build` and does not typecheck (JS, not TS) |
| substitute gate | — | `npm run build` **+** the named bench suite (`node src/bench/<name>.mjs`) **+** a screenshot through `window.LSW` |
| suite | 275 files / 2,349 cases, vitest, node env | 4 files in `src/bench/`, run by hand |
| ⚠ blind spot | `eslint src tests` — **`tools/` is excluded** (`eslint.config.js:18`), so the harness itself is unlinted | everything |

**So the first Ascension loop should be the one that creates `npm run verify`**, and until it exists
an Ascension loop's SEEING field must be **A (screenshot)** — the pixels are the only thing standing
between that repo and confident garbage.

⚠ **`npm run build` in War World already runs `tsc --noEmit` first.** Running the typechecker twice
is fine and the four-command form is what `AGENTS.md` states; do not "optimise" it down, because the
first three commands are the ones whose individual failure you want named in the ledger.

### THE SCOPE CHECK IS THE LAST STEP OF EVERY LOOP, NOT A PROMISE

```bash
git diff --name-only HEAD | grep -vE '<the SCOPE globs>' && echo "SCOPE BREACH — STOP" && exit 1
```

A loop that edited outside its scope has, by definition, stepped into another stream's files or into
the forbidden list. It stops there. It does not "just fix" the extra file.

---

## §2 — THE CRITIC CONTRACT — seeing made structural

**The problem, stated exactly.** Two failures in this project, both mine:

- **The boxing stage.** A 9-mode sweep ran clean while the ring was *four times too big* — 128u
  against a real 20-foot ring, which at 1u ≈ 0.19m is 32u. Two 9.6u fighters at opposite corners were
  specks with a car's length of empty canvas between them. Six green assertions. **The screenshot
  found it in one look.** `CLAUDE.md`: *"Tests can prove a rule fires; only the picture shows scale."*
- **`auditSurfaces` inverted.** It reported **24 problems on a mountain build and 36 on hills** while
  the real count went the other way — the terrain is ONE mesh whose bounding box spans y −13 → +122.65,
  so `box.max.y` is the highest peak, every decal sits far below it, and the sorted loop broke before
  testing anything against the ground. **The gauge got quieter as the fault got worse.**

A critic told to "be harsh" catches neither. Politeness is not the failure mode; **blindness is**, and
you cannot fix blindness with adjectives.

### THE THREE SEEING MODES — a critic declares exactly one, and names the artifact

| | mode | what it does | leaves on disk |
|---|---|---|---|
| **A** | **SCREENSHOT** | renders the thing and looks at the pixels | a `.png`/`.jpg` at a named path |
| **B** | **DRIVE** | pushes the real input through the real gate and reads what the engine computed | the transcript, with the input events listed |
| **C** | **INVARIANT** | asserts a *relationship* that must hold however the values move | the sampled pairs, not just the verdict |

**A critic may not use a fourth thing.** Specifically, none of these count as seeing:

- reading a boolean, a flag, a status field, or `errors.length === 0`
- counting console errors — ⚠ *"0 errors is not correct"*: the 9-mode sweep ran boxing clean while
  the stage was visibly broken, because nothing it asserted could see a sloped floor
- reading the source of the thing it is judging and concluding the code looks right
- asking the implementer whether it works

### ⚠ THE CALIBRATION FRAME — the rule that makes blindness structurally impossible

**Before a critic may pass anything, it must be handed a version it should fail, and fail it.**

This is the whole structural move and it is the answer to `auditSurfaces`. That tool would have been
caught the first minute it ran: feed a gauge a *worse* case and the number must get *worse*. It did
not, and it survived for days because nobody ever asked it to fail.

```
CALIBRATION — run FIRST, every loop, before any verdict is issued.
  1. Produce a deliberately wrong version of the thing under test.
     · SCREENSHOT critic  → scale it 4×, or move it 40u, or turn a light off
     · DRIVE critic       → break the gate on purpose (skip the input, stub the handler)
     · INVARIANT critic   → feed it the case that is KNOWN worse
  2. Run the critic against it.
  3. It must report FAIL, and the NUMBER must move in the correct direction.
  4. If it passes the broken version, or the number moves the wrong way, or does not move:
     THE CRITIC IS BLIND. STOP THE LOOP. Do not issue any verdict, including a negative one.
  5. Restore. Only now may it judge the real thing.
```

⚠ **A critic that has never failed has proven nothing about the thing it just passed.** It has proven
something about itself, and the answer is unknown.

⚠ **And the calibration must move a CONTINUOUS number, not flip a boolean.** Grounded: the comic
print pass's impact frame is a one-frame uniform, and ticking it before the render cleared it before
the frame it belonged to was ever drawn. A flag said "working" the whole time. Mean screen brightness
read **93.6 → 93.6 → 93.6**. After the fix: **94.3 → 160 → 94.3**, exactly one frame. Only the
continuous number could tell those two apart.

### WHAT THE CRITIC IS ALLOWED TO ARGUE ABOUT

⚠ **Our unfair advantage is that the reference is DECODED, not remembered.** `docs/infantry/` is
5,243 lines from Infantry Online's own files (`weapons.md` 1,616 · `combat.md` 1,360 · `systems.md`
1,178 · `maps.md` 1,089); `docs/powerworld/` is ~11,700 more on Bid For Power and ESF;
`docs/reference/openjk.md` is 119KB of Jedi Academy's source behaviour.

So the critic is **factual, not aesthetic**:

> *"Infantry's heavy weapons could not fire while moving — a binary gate, and there is no
> move-accuracy field anywhere in its schema (`docs/infantry/weapons.md`). Ours applies a spread
> penalty. Which of these creates a decision?"*

A blind side-by-side against a 1999 game nobody can screenshot would be worthless. A blind
side-by-side against **its documented numbers** is decisive, and a model cannot flatter its way past
a schema field that does not exist.

⚠ **Blind pairwise beats scoring** and this part is genuinely just true: *"which of these two is
better"* is a question a model answers honestly; *"rate this 1–10"* is a question it flatters. Do not
let a critic emit a score.

---

## §3 — THE DRIVE-THE-GATE LAW

**Four separate times in this project a test passed while the feature was broken, because the test
WROTE a value instead of DRIVING the input.** This is the single highest-yield rule in the document
and it is stated as a procedure, not a principle.

### THE PROCEDURE — a subagent can follow this literally

```
1. WRITE THE CHAIN, left to right, before writing any test code:
     input → [links] → GATE → value you want to assert

2. Your test may touch ONLY the leftmost link — the thing a player touches.
   Every write to an intermediate link is a bug IN THE TEST.

3. Name the GATE explicitly. If you cannot name it, you do not understand the
   feature well enough to test it. Stop and read the code.

4. Ask of every link: IS THIS REWRITTEN EVERY FRAME?
   Damped values, aims, derived caches and per-frame servos will silently
   overwrite anything you write, AFTER you write it and BEFORE the gate reads it.
   You cannot write past them. You must drive them.

5. If the value is legitimately transient, do not assert the VALUE.
   Assert the INVARIANT — the relationship that must hold however it moves —
   sampled over a live run.

6. PROVE THE HARNESS FIRST. The suite's first assertion must be one that fails
   if the harness is wrong. A point-blank jab must land before any reach test
   means anything.
```

### THE FOUR TIMES IT BIT, WITH THE ACTUAL LINK THAT ATE THE WRITE

| feature | what the test wrote | the link that ate it | what driving revealed |
|---|---|---|---|
| **LOW ORBIT departure** | `pos.y` directly | — (it never went through the gate at all) | ⚠ the doc said *"SOL through at 373"*. Flying the real controls, SOL held SPACE + SHIFT with the burner lit for fifteen seconds and **never moved off 301** — the deck servo pins a tier-3 flier at `sky + (ceiling − sky)·0.55`. **The feature and its test shipped the same day and contradicted each other.** |
| **THE CLINCH** | `facing`, then `aim`, then a stubbed `controlPlayer` | `facing` is a **damped yaw**; `coneFoe` reads `caster.aim` and `controlPlayer` rewrites aim from the mouse **every frame**, after the test wrote it and before the hit test read it | four failed attempts. Also: `entities[1]` is the **KMK 9 camera operator**, not the opponent — pick by TEAM. |
| **THE DIRECTION TRIANGLE** | `facing`, `aim`, an override | same damped chain | **four wrong test versions before the feature was ever wrong.** Each printed the same value four times and read exactly like a broken triangle. Fixed by asserting the INVARIANT — *wherever the player faces, the triangle points there* — sampled over a live fight. Worst error 0.00° over 24 samples. |
| **THE MELEE FEEL A/B** | stubbed `controlPlayer` | stubbing it kills the HELD input, so `meleeCharge` never accumulates and every "haymaker" landed at charge 0 | three runs produced **no punch at all** before I saw it. ⚠ And wrapping a spy around an already-wrapped function made the second call increment both counters — **an A/B harness installs its probes once.** |

### THE TWO ADJACENT TRAPS THAT LOOK LIKE THIS AND ARE NOT

- ⚠ **THE VACUOUS PASS.** The slot-facts suite asserted `chips.every(...)` on a list that was
  **empty** — and `[].every()` is `true`, so two assertions went green while nothing rendered. **Prove
  the population before asserting anything about it** (`chips.length > 0` first). It caught itself in
  the act, which is the only reason it is written down.
- ⚠ **THE PHANTOM MODULE.** Vite version-stamps modules, so a console `import('/src/data/rankings.js')`
  can be a **SECOND instance** — you write into a book the game never reads. Verify module state
  through the page's own graph (`ATLAS.BANDS`, `window.LSW.x`), never a fresh dynamic import.

---

## §4 — STOP CONDITIONS

**The bar stays unreachable. The BUDGET does not.** Those are two different mechanisms and conflating
them is why "Robert is the brake" was previously the only answer — and Robert is at work.

- The **quality bar** is deliberately unmeetable. That is what keeps a loop moving and it stays.
- The **stops** are budget, no-progress, decision and breach. They are mechanical and they fire
  whether or not the bar was met.

### THE FOUR STOPS

**1. BUDGET — N loops, declared before starting.**
Not tokens (the agent cannot see them reliably), not time (banned). A count. When N is spent, the
loop stops at the last gate-green commit and writes `BUDGET SPENT` to the ledger.

**2. NO-PROGRESS — the gate state has not changed for N loops.**

```
STATE = ( gate result per command , critic verdict word , THE NUMBER )
```

⚠ **THE NUMBER MUST BE CONTINUOUS OR THIS DETECTOR IS USELESS.** If the loop's measure is pass/fail
the state is one bit, and three greens in a row is indistinguishable from three loops of nothing. A
count, a millisecond, a pixel delta, a percentage — something that can move by a little. This is the
impact-frame lesson again: **93.6 → 93.6 → 93.6** is what a stuck loop looks like, and a boolean
could never have shown it.

Default `N = 3`. Identical STATE three loops running → `NO PROGRESS` → stop.

**3. DECISION EXIT — the loop hit a question only Robert can answer. It STOPS. It does not guess.**

This is the one that prevents confident garbage, and the trigger list is concrete:

- the question is in `docs/DECISIONS_REMAINING.md` and still open
- the answer would set a number nobody has ruled (12 or 18 squares — ⚠ *ruled unanswerable on paper*:
  *"I gotta see it in game"*)
- the answer would name something (Ghost's real name is **still open**)
- two existing rules in the repo genuinely contradict and neither is marked as winning
- the change would weaken a law in `CLAUDE.md`'s **Hard rules** section

The loop writes the question to the ledger in the form *"To continue I need to know X. Option A does
this, option B does this, here is what each costs."* — then stops. **A stopped loop with a good
question is worth more than a finished loop that guessed**, because the guess will be found three
loops later by a critic that has been calibrated against it.

**4. CONTRACT BREACH — immediate, and it reverts.**

- the diff touched a file outside SCOPE
- the diff touched a §5 forbidden file
- the critic failed its calibration frame (§2)
- `git status` at loop start showed files dirty outside SCOPE — ⚠ **another stream is in here**

Breach means: `git stash` or hard-revert to the last gate-green commit, write `BREACH: <which>` to
the ledger, stop. It does not mean "fix it and carry on".

### HOW A LOOP STOPS — three properties, all required

- **LOUD** — the last line of the ledger names the stop and the reason. No silent exhaustion.
- **SAFE** — the tree is left at a gate-green commit. Never mid-edit, never with a broken gate.
- **RESUMABLE** — the ledger says which loop number, which contract, and what the next step was.

---

## §5 — WHAT A LOOP MAY NOT TOUCH

⚠ **A forbidden list nobody checks is a comment, and this project has already proved comments do not
stop anything.** `src/sim/`'s ban on `Math.random` exists as two source comments
(`src/sim/director.ts:11`, `src/sim/world.ts:486`), zero lint rules, and one test scoped to arcade
cabinet runtimes. There are already **two real `performance.now` calls inside `src/sim/`**
(`theaters.ts:47,49`) and nothing noticed. So the list ships **with its enforcement**.

### THE LIST

| # | forbidden | why | enforcement |
|---|---|---|---|
| **W1** | `Math.random` · `Date.now` · `performance.now` · `new Date` anywhere in `D:\git\ShootEM\src\sim\**` | the server is authoritative. A client and a server that disagree about whether you hit is **not a bug you can debug** — it is a desync, it reproduces once, and it looks like lag. Use `world.rng` (`src/sim/rng.ts`, mulberry32, seeded from `WorldOptions.seed`) | ⚠ **build it in the first loop** — see below |
| **W2** | `AscendantId`, `src/sim/types.ts:86` | a closed union of **40 members across 19 files**. Two agents each adding a member both produce a valid union and the merge silently keeps one. Nothing fails. | **SEQUENTIAL ONLY.** One stream, typechecker-driven. Never fanned out. |
| **W3** | the LSW system — `lsw` at **1,146 occurrences / 108 files** | this is the actually-large thing the old "688" number was gesturing at | **not a loop.** Sequential, typechecker-driven, one agent. |
| **W4** | any open question in `docs/DECISIONS_REMAINING.md` | §4 stop 3 | decision exit |
| **W5** | anything another stream declared in its SCOPE | §6 | the scope check |
| **A1** | `D:\lsw\CLAUDE.md` and `D:\git\ShootEM\AGENTS.md` | ⚠ **these are the rules every other loop loads.** A loop that edits them rewrites the constraints on every parallel agent, retroactively and invisibly | a loop may **append** to the ledger; a human commits changes to the rules |
| **A2** | the **Hard rules** section of `CLAUDE.md` and the laws it names | each has a body count. `opts.hitstop ?? 0.04` **never `\|\|`** (a falsy 0 re-armed every frame = permanent stunlock under any beam). The **light-count law** — three.js bakes the visible light count into every material's program cache key, so a pool that toggled `.visible` recompiled the whole city at 60Hz: **+152 programs in 4s, 410ms freezes**. `GROUND_LAYER`/`DECAL_LIFT` — a system that invents its own small number IS the failure mode | a loop that "tidies" one of these is a breach |

### THE ENFORCEMENT, AND IT IS SMALL

War World already has the pattern — five tests read source files with `readFileSync` and assert on
their contents (`tests/board.test.ts`, `pose-ingest.test.ts`, `rig.test.ts`, `science-presets.test.ts`,
`streetvo.test.ts`). So W1 is one more of those:

```ts
// tests/sim-determinism.test.ts — the ban, made mechanical
// ⚠ Comments do not stop anything. Two comments and zero rules let performance.now
//    into src/sim/theaters.ts:47 and nobody noticed.
const BANNED = [/\bMath\.random\b/, /\bDate\.now\b/, /\bperformance\.now\b/, /\bnew Date\b/];
for (const f of walk('src/sim')) {
  const src = stripComments(readFileSync(f, 'utf8'));       // ⚠ strip, or the two honest
  for (const re of BANNED)                                   //   comments fail their own test
    expect(re.test(src), `${f} — the sim must be replayable; use world.rng`).toBe(false);
}
```

Plus `no-restricted-syntax` / `no-restricted-globals` in `eslint.config.js` scoped to `src/sim/**`
(the file is 20 lines and has no restriction rules of any kind today).

⚠ **`theaters.ts:47,49` must be resolved as part of that loop, not grandfathered.** Either it is off
the tick path and moves out of `src/sim/`, or the test needs a named exception with a reason — and a
named exception with a reason is fine. A silent one is how the next four arrive.

---

## §6 — THREE PARALLEL STREAMS

Robert has Codex. The instinct and mine agree, and the reason is worth stating precisely: **the split
is not by file size, it is by which FAILURE MODE the work produces.**

- **BREADTH work** = many instances of one pattern, each independently verifiable. Failure = one bad
  instance. Cheap to find, cheap to revert. **This is Codex's lane.**
- **DEPTH work** = one consistent mental model held across files. Failure = a *subtly inconsistent
  model*, and everything compiles. Expensive to find because nothing is red. **This is Claude's lane.**

Grounded, both directions: the beam-anatomy pass put **25 beams into one form** and needed one mental
model to split them into build × temper (depth). The `lotFor` fix corrected **29.5% of every cover box
in the game standing in a road across 19 tile types** by changing *one number in one helper* — because
it was one missing fact, not nineteen bad builders (also depth, and a warning that a "breadth" job can
turn out to be depth wearing a costume). Whereas re-baking 168 country rows, or tagging 60 research
rows, or converting 254 `.ogg` to `.mp3` — those are breadth, and fanning them out is free.

### THE SPLIT

| stream | lane | good work | never |
|---|---|---|---|
| **1 — CODEX · breadth** | many small independent files; one pattern repeated | data-table bakes · per-row tagging · adding armory/catalog rows · test backfill · asset conversion · doc extraction | a type union · a registry/manifest · a ranked ladder · a god-object |
| **2 — CLAUDE · depth** | one system, one model, several files that must agree | a new mechanic through its choke point · a critic loop · the map-maker/interior editor · the harness itself | anything stream 1 has open |
| **3 — SEQUENTIAL · typechecker-driven** | closed unions and wide renames | `AscendantId` · the LSW replacement · the Passport type | ever running in parallel with itself |

### THE FOUR THINGS TWO STREAMS MAY NEVER SHARE

1. **A type union.** Both edits are valid; the merge keeps one; nothing fails. (`AscendantId`.)
2. **A ranked table.** ⚠ **The ladder-from-the-distribution law** — this has now bitten **five times**
   (site survey, university standing, the rank ladder's top end, the beam buckets, the aptitude
   ladder). Rungs are derived from the distribution, so **adding a row re-ranks every other row**.
   Two agents adding rows produce two different ladders from the same table.
3. **A registry or manifest.** One list, one owner.
4. **A single-file god object.** `window.LSW` (`src/main.js:518`) is one line with 20+ keys — two
   agents both append and the merge is a conflict at best.

### THE MECHANISM — worktrees, and a `git status` gate

Both repos already use them (`D:\git\ShootEM\.worktrees\country-relations\`, `D:\lsw\.claude\worktrees\`).

- **Each stream works in its own worktree.** `main` is a merge point, not a workspace.
- **Merge one stream at a time, at a gate-green commit.**
- ⚠ **First act of every loop: `git status`. Dirty outside your SCOPE = another stream is in here =
  BREACH, stop.** This is not hypothetical: while an agent was reading `D:\git\ShootEM` today,
  `package.json` changed underneath it at 14:04:55 — a `playwright` install from outside that session.
  The read was half-stale for four minutes and only a mid-read `stat` caught it.

### ⚠ TWO THINGS THE STREAMS MUST SHARE, EXPORTED NOT REIMPLEMENTED

Grounded: `NO_RESCUE` drifted between the generator and the validator, and the map tool reported **32
"landlocked" cells that were open country behaving exactly as designed.** The rule is now exported
from `cityplan.js` and imported by the validator.

- **the gate command** — one string, in the contract, identical for every stream in that repo
- **the forbidden list** — §5, one copy, referenced by path, never pasted into a prompt as prose

---

## §7 — THE PROMPTS

Copy-paste. Fill the `<>` fields. Every one of them ends with a scope check and a ledger line.

### 7A — THE CODE LOOP *(War World, the arsenal — the one that is ready today)*

```
Work in D:\git\ShootEM, in a worktree, on branch loop/arsenal.

LOOP CONTRACT — write this as ledger line 0 before doing anything.
  ID        warworld/arsenal
  SCOPE     src/sim/arsenal.ts  src/client/models/weapons.ts  tests/arsenal*.test.ts  docs/infantry/weapons.md(read-only)
  GATE      npx tsc --noEmit && npx vitest run && npm run lint && npm run build
  SEEING    A — screenshot. Artifact: docs/screenshots/arsenal-loop-<N>.jpg
  NUMBER    count of weapons whose measured DPS/rate/spread differ from
            docs/infantry/weapons.md by more than 15%.  (continuous — this is
            what the no-progress detector reads. NEVER report pass/fail here.)
  STOP      budget 12 loops · no-progress 3 · decision-exit ON
  FORBIDDEN docs/LOOPING.md §5. In particular: nothing in src/sim/ may use
            Math.random, Date.now, performance.now or new Date — use world.rng
            (src/sim/rng.ts). Do not touch AscendantId (src/sim/types.ts:86).

THE JOB
Bring the arsenal to the level of Infantry Online. The reference is DECODED, not
remembered: docs/infantry/weapons.md is 1,616 lines from the game's own files.
Cite it by line. Do not argue from memory of the game.

EACH LOOP
  1. git status. Dirty outside SCOPE → STOP, write BREACH to the ledger.
  2. Pick the single largest gap against docs/infantry/weapons.md. One gap.
  3. Implement it. Add the assertions with it, in the same commit.
  4. Run the GATE. All four. Paste each command's result into the ledger.
  5. Run the CRITIC (§7C) as a SEPARATE subagent. It must calibrate first.
  6. git diff --name-only HEAD | grep -vE '<SCOPE>' → any output is a BREACH.
  7. Commit. House style: dense prose, leads with what was LEARNED, ⚠ marks traps.
     Never git add -A — name every file. No Co-Authored-By.
  8. Append one ledger line: loop N · gate · critic verdict + artifact · NUMBER · sha.

DRIVE THE GATE (docs/LOOPING.md §3). Before writing any test, write the chain
input → links → GATE → value. Touch only the leftmost link. If a link is
rewritten every frame, you cannot write past it — drive it. Prove the harness
first: an assertion that fails if the harness is wrong, before any that passes.

STOP AND ASK, do not guess, if the next step needs a ruling nobody has made.
Write the question as "To continue I need X — option A costs this, option B costs
this" and stop.
```

### 7B — THE RESEARCH LOOP *(produces a document, so its gate is falsifiability)*

⚠ **A research loop has no compiler, so the standard pattern gives it no gate at all and it produces
fluent, confident, unfalsifiable prose.** That is exactly how *"688 references across 84 files"* got
into this file and stayed. The gate is: **every claim carries the command or the file:line that
produced it, and a separate agent re-runs a random sample.**

```
Work in <repo>. Produce/extend <docs/PATH.md>.

LOOP CONTRACT
  ID        <repo>/research-<topic>
  SCOPE     docs/<PATH>.md only. This loop writes NO code.
  GATE      THE CITATION GATE, below.
  SEEING    C — invariant. Artifact: the re-measured sample table.
  NUMBER    count of claims in the document with NO command and NO file:line.
            Target 0. (continuous.)
  STOP      budget 8 loops · no-progress 3 · decision-exit ON

THE CITATION GATE — this replaces tsc/vitest and it is not softer.
  Every factual claim carries ONE of:
    · the exact command that produced it, pasted, e.g. `rg -c "X" src | wc -l` → 67
    · a file:line
    · a quote from a named source document
  A claim with none of those is DELETED, not softened. "Roughly", "many",
  "hundreds of" are all deletions.

  Then: a SEPARATE subagent picks 5 claims at random, re-runs the command or
  opens the file:line, and reports agreement. Any disagreement fails the loop.

⚠ THE 688. This file previously said AscendantId had "688 references across 84
files". Measured: 40 members, 67 occurrences, 19 files. The 688-shaped thing is
the `lsw` system — 1,146 occurrences across 108 files. The number was attached to
the wrong symbol, was carried through two rewrites, and was used to decide not to
parallelise a subsystem. It was never load-bearing enough to check and exactly
load-bearing enough to make a decision.

Write in the house style: lead with what was LEARNED, ⚠ marks traps, name the
thing that was wrong before you name the fix. Never estimate in weeks — the unit
of work is A LOOP.
```

### 7C — THE CRITIC LOOP *(a separate agent, always; run it as its own subagent)*

```
You are the CRITIC for <what>. You did not write it. You are not here to be
encouraging and you are not here to be rude — you are here to SEE.

STEP 1 — CALIBRATE. Do this before you look at the real thing. You may not
issue any verdict, positive or negative, until you have passed it.
  a) Make a version that is deliberately WRONG in the way that matters:
       screenshot critic → scale it 4x, or shift it 40u, or kill a light
       drive critic      → break the gate (skip the input / stub the handler)
       invariant critic  → feed it the case that is KNOWN worse
  b) Run yourself against it.
  c) You must report FAIL, and your NUMBER must move in the WRONG direction
     by a visible margin.
  d) If the broken version passes, or the number does not move, or it moves the
     wrong way: YOU ARE BLIND. Write "CRITIC BLIND — <what you tried>" and STOP
     the loop. Do not judge the real thing.
  e) Restore.

⚠ WHY: auditSurfaces reported 24 problems on a mountain build and 36 on hills
while the real count went the other way — the terrain is ONE mesh spanning
y -13 to +122.65, so the sorted loop broke and it never tested the ground at all.
The gauge got QUIETER as the fault got WORSE, and it survived because nobody ever
asked it to fail.

STEP 2 — SEE. Declare which mode and name the artifact you leave on disk:
  A SCREENSHOT — the pixels.       B DRIVE — real input through the real gate.
  C INVARIANT — the relationship, sampled over a live run.
You may NOT: read a flag, count console errors, read the source of the thing you
are judging, or ask the implementer. "0 errors" is not "correct" — a 9-mode sweep
in this project passed a boxing stage that was FOUR TIMES too big.

STEP 3 — JUDGE, BLIND AND PAIRWISE. Never emit a score out of ten.
  Ask: "which of these two is better, and why" — ours vs <docs/infantry/X.md's
  documented behaviour>. Cite the reference by line. If ours does not win, say so
  in one sentence and name the ONE change that would flip it.

STEP 4 — REPORT, in this shape and nothing longer:
  CALIBRATION  passed — <what you broke, which number moved, from → to>
  SEEING       <mode> — <artifact path>
  VERDICT      OURS WINS | REFERENCE WINS
  NUMBER       <the continuous measure>
  THE ONE FIX  <one sentence>
```

### 7D — THE MIGRATION LOOP *(mechanical breadth — Codex's lane)*

```
Work in <repo>, in a worktree, on branch loop/<name>.

LOOP CONTRACT
  ID        <repo>/migrate-<name>
  SCOPE     <the glob — must be MANY files, each independently verifiable>
  GATE      <the repo's gate string>  PLUS the per-instance assertion below
  SEEING    B — drive. Artifact: the transcript listing the driven inputs.
  NUMBER    instances migrated / total.  (continuous by construction.)
  STOP      budget <N> · no-progress 3 · decision-exit ON
  FORBIDDEN docs/LOOPING.md §5, and:
            ⚠ NO type union · NO registry or manifest · NO ranked/derived table
              · NO single-file god object.
            If the migration turns out to need one of those, it is NOT a breadth
            job — STOP and hand it to the sequential stream.

THE PER-INSTANCE ASSERTION — the thing that makes breadth safe.
Every migrated instance gets its own assertion, and the assertion must fail if
that instance is subtly WRONG, not only if it is absent. Absence is easy; the
boxing stage was present, complete, and four times too big.

⚠ THE LADDER TRAP. If the thing you are migrating is RANKED against its own
population, adding or changing one row re-ranks every other row — this has bitten
five times here. That is not a migration, it is a single-owner table. Stop.

⚠ DO NOT "TIDY" ANYTHING OUTSIDE THE PATTERN. In this codebase the small odd
numbers are usually load-bearing: opts.hitstop ?? 0.04 must never become ||,
the vfx light pool must stay a fixed 14 always-visible lights, ground decals must
take a rung from GROUND_LAYER rather than pick a small number. Each of those was
a real freeze or a real stunlock.

Each loop: git status → migrate a batch → per-instance assertions → GATE →
scope check → commit naming every file → one ledger line.
```

---

## §8 — THE LEDGER — what Robert reads when he gets back

**One file, append-only, one line per loop.** This is the deliverable of an unattended run. If the
ledger is unreadable in two minutes the run failed regardless of what the code does.

```
docs/LOOP-LEDGER.md
```

⚠ **War World has `LOOP-LOG.md` at the root AND `docs/LOOP-LOG.md` — two files, different sizes.**
Two copies of a log is how the two copies start disagreeing, the same failure as a rule reimplemented
instead of imported. Pick one and delete the other in the first loop that touches either.

```
## LOOP 7 · warworld/arsenal · 2026-07-27
GATE     tsc ok · vitest 2349/2349 · lint ok · build ok
CRITIC   calibrated (scaled ring 4x → NUMBER 3→31, failed correctly)
         VERDICT: reference wins · docs/screenshots/arsenal-loop-7.jpg
NUMBER   11 weapons out of tolerance  (was 14)
DID      heavy weapons gated on movement, not spread-penalised
           — docs/infantry/weapons.md:412 has no move-accuracy field at all
SHA      a91c04f
```

and the last line of a run is always one of exactly four:

```
STOP · BUDGET SPENT      12/12 loops · last green sha a91c04f · next: the burst-fire gap
STOP · NO PROGRESS       3 loops, identical STATE · NUMBER stuck at 11 · <what was tried>
STOP · DECISION NEEDED   <the question, with option A / option B and what each costs>
STOP · BREACH            <which: scope | forbidden | critic blind | dirty tree> · reverted to <sha>
```

⚠ **There is no CI in either repo** (`D:\git\ShootEM\.github` does not exist; Ascension has no test
runner at all). Every gate is a local command run by an agent that could, in principle, skip it. The
only real defence is that **the ledger pastes each command's output verbatim** and the next loop
re-runs the same gate — a skipped gate shows up as a green line followed by a red one with no diff
between them.

---

## ⚠ §9 — WHY THIS IS NOT THE STANDARD PATTERN

Robert asked for this section specifically, and it would be worth nothing if it flattered the
framework. So: **most of the shape is ordinary.**

### What is ordinary here — say so plainly

- **Generate → critique → revise is textbook.** It is Reflexion, it is self-refine, it is every
  agent-loop blog post since 2023. There is nothing novel in the loop itself.
- **A separate critic agent is standard practice** and has been for years. The template's own framing
  of it as "the whole trick" oversells it. It is necessary and it is not sufficient — a separate
  critic that cannot see is just a second confident voice.
- **Blind pairwise beating scalar scoring is a known result** in LLM evaluation, not a discovery.
- **Fanning out subagents per subsystem is standard** and is the first thing anyone tries.
- **"Don't stop until it's perfect" is a prompt trick, not an architecture.** It works, it is one
  sentence, and on its own it produces a loop that runs forever generating plausible diffs.

### What is actually different, and why each one exists

1. **The critic must fail a calibration frame before it may pass anything (§2).** This is the real
   departure. Every standard agent-loop writeup assumes the critic works. `auditSurfaces` did not —
   it reported *fewer* problems as the fault got *worse*, for days, because nothing ever asked it to
   fail. Requiring a deliberate-fail before any verdict makes a blind critic structurally impossible
   rather than merely discouraged.
2. **The reference is decoded, not remembered.** 5,243 lines out of Infantry's own files. Almost every
   loop of this kind critiques against the model's *memory* of a reference, which is a vibe, and a
   vibe is exactly what a model is best at flattering. Ours can point at a schema field that does not
   exist.
3. **The forbidden list ships with its enforcement (§5)** — and honestly, today it does not, which is
   why the enforcement is the first item of work rather than an appendix. Two comments and zero rules
   already let two `performance.now` calls into the authoritative sim.
4. **The stop is a first-class artifact (§4).** Standard loops stop on "done" or on a step count. This
   one has a no-progress detector keyed to a *continuous* number and a decision exit that **refuses to
   guess**. Guessing is precisely how an unattended loop generates confident garbage, and the standard
   pattern has no mechanism against it at all.
5. **The unit is a loop, not a time.** Robert's rule, and it is not cosmetic: a week estimate is a
   guess dressed as a plan, and it invites scope-cutting against a clock nobody set.

### What this still does not do — the honest limits

- **The critic is a language model looking at a screenshot.** The calibration frame proves it can see
  *the axis it was calibrated on*. It does not prove it can see anything else. A thing that is broken
  in a way nobody thought to break on purpose still gets through.
- **Blind side-by-side against a game nobody can run is only as good as the decode.** If
  `docs/infantry/weapons.md` is wrong about a field, the loop will confidently converge on the wrong
  behaviour and every gate will be green the whole way.
- **Nothing here produces a design insight.** It produces conformance to a stated bar. The map maker
  exists because *"12 or 18 squares"* cannot be looped at all — Robert has to walk around one. Loops
  are for the work between decisions, never for the decisions.
- **There is no CI**, so every gate depends on an agent choosing to run it. The ledger makes skipping
  visible after the fact; it does not prevent it.
- **The no-progress detector can be gamed by a loop that keeps moving its NUMBER without improving
  anything.** Nothing in this document catches that. A human reading four ledger lines does.

---

## WHAT IS STILL MISSING — in order, and each one is a loop

1. **`npm run verify` in both repos, meaning the same three things: drive real input · assert an
   invariant · leave a frame on disk.** A shared **contract**, never shared code — the engines have
   nothing in common and forcing shared code is how this dies. ⚠ Ascension is the urgent half: it has
   **no typechecker, no test runner and no tests directory**, so a loop there currently has almost
   nothing to fail against.
2. **W1 made mechanical** — `tests/sim-determinism.test.ts` plus `no-restricted-syntax` in
   `eslint.config.js`, and `src/sim/theaters.ts:47,49` resolved rather than grandfathered.
3. **One `LOOP-LEDGER.md` per repo**, and War World's two `LOOP-LOG.md` collapsed to one.
4. **Ascension grows named handles** — `__atlas`, `__ring`, `__pw` — the way War World already has 20.
   One god-object at `src/main.js:518` means a critic cannot be pointed at just the surface it judges.
   ⚠ War World has its own version of this bug: `__sheet` is assigned by **both**
   `src/client/armorysheet.ts:177` and `src/client/propsheet.ts:162`, with different shapes.
5. **`playwright` committed, not just installed.** It appeared in `D:\git\ShootEM\package.json` at
   14:04:55 today and is still uncommitted. Pinned in `devDependencies` or it works on this machine
   and silently does not on a clone — the same class of defect as a test that passes because it wrote
   the value instead of driving the input.
