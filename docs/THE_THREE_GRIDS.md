# THE THREE GRIDS — and why "12 or 18" was one question about three things

*2026-07-27. Robert, thinking out loud: "what if they were seamless… what if we section off into cells
and one cell's gotta be the entire base, like 12 cells, nine cells that we talked about."*

**He self-corrected to the right answer mid-sentence.** Cells *and* seamless is not a contradiction —
they are different levels, and **all three already exist in this codebase.**

---

## ⚠ CELLS VS SEAMLESS IS THE WRONG AXIS. THE AXIS IS SCALE.

A **city** grid has streets because a city genuinely *is* blocks and streets — the grid is the subject
matter. `ATLAS` is right to be cell-based.

A **battlefield** is not. A front line does not run along a street grid, and Infantry's maps were
seamless terrain with facilities placed on it.

So the battlefield's cells are **plots, not blocks** — a placement lattice with **continuous terrain
running through it**, no street between neighbours, and **one cell big enough to hold an entire base**.
That is his own sentence and it is the correct design.

## THE THREE LEVELS, AND WE HAVE ALL OF THEM

| level | what it is | what exists **today** | dialable? |
|---|---|---|---|
| **1 · THE MAP** | where bases sit on terrain | `CELL = 96`, `CELL_RANGE [32, 240]` in `cityplan.js:20` — **the size dial is already built** | ✅ 32–240 |
| **2 · THE BASE** | rooms inside one facility | `data/base.js` — **a 9×9 site on two floors**, slot = `floor*81 + r*9 + c`, 57 facilities, reachability walked orthogonally + vertically through a stairwell | ✅ derived from the world |
| **3 · THE ROOM** | where the walls go | `floorplan(w, d, roomScale, seed, doorW)` at `cityplan.js:1044` — **pure BSP, one doorway per cut, so every room is reachable BY CONSTRUCTION** | ✅ `roomScale` |

⚠ **"12 or 18 squares" was one question asked about three different levels at once.** That is why it
could not be answered on paper — it does not have one answer. It has three, and they are independent:

- **level 1** — how many plots across a battlefield? *(a map-size question)*
- **level 2** — 9×9 is already ruled and shipped. *(this is the one `data/base.js` answers)*
- **level 3** — how wide is a corridor? *(this is the one he actually still cannot answer without
  walking one, and it is a **metres** question, not a cells question)*

⚠ **AND THE CORRIDOR IS ALREADY PARAMETERISED**: `doorW = 5.6` in `floorplan()`. At 1u ≈ 0.19m that is
**1.06m** — a real domestic doorway. A corridor two people can fight in is roughly 2× that. The dial
exists; nobody has ever looked through it.

## WHAT THIS MEANS FOR THE MAP MAKER SESSION

The tool is **not** three tools. It is **one editor with a zoom level**, which is exactly what ATLAS
already is (it paints cells, and it has a live 3-D preview behind the panel).

⚠ **Still do not port ATLAS** — different engine, different plan format. **Copy its shape.** But the
data model to copy is now known and it is three nested grids, not one.

---

# THE FLOOR-PLAN REFERENCES ARE NOT IN THE REPO

Checked: `docs/reference/` contains **only** `openjk.md`. The floor-plan generators Robert sent are
**not here** — they were lost to a context wipe or sent in a side chat that never reached disk.

**Re-send them and they get a `docs/reference/floorplans.md` like OpenJK got.** ⚠ But do not block on
it: `floorplan()` already generates guaranteed-reachable rooms, and the standing instruction is *follow
War World's own conventions* — a reference is for stealing ideas, not for deciding architecture.

---

# QUERENT, CORRECTED — and the correction makes it ten times cheaper

*"No this is like a designation we gonna give characters — they unknowingly born, when you create a
character there's a very small chance that they get it. We already have stats, I wanna put a little
layer in it. Cosmic, not interdimensional."*

⚠ **This is a much better design than the one in `docs/QUERENT.md`, and it deletes the expensive part.**

| was | now |
|---|---|
| a dimension you travel to | **a DESIGNATION you are born with** |
| a place to build (stage, door, inhabitants) | **a layer on the sheet — no place at all** |
| interdimensional | **COSMIC** — it can simply live in PowerWorld's universe, which is already cosmic |
| content you visit | **a rare roll at character creation** |

**What it costs now:** a field on the def, a roll in ORIGIN, three rows in `DRIVES`. **No dimension.**

And two of his other threads land on it without being forced:
- **"maybe that could be the thing across universe"** → the Passport. A designation is one integer and
  a name; it is the cheapest possible thing to carry between two games.
- **"dimensional guardians that punish you when you go through"** → the orders as the *gate*, not the
  destination. Keep this as an option; it needs no new place either.

---

# ⚠ THE EMOTION→POWER LOOP — the best idea in the message, and it is ~80% BUILT

*"Imagine the character could be more powerful if he was feared — he starts attacking people, it
causes fear because he's powerful and he's killing people. But it'd be a different emotion if he was
just powerful and displaying his power. Our systems should be able to talk to each other like that."*

**They already do most of this.** Measured, not assumed:

```
crowd flees  →  psyche.js:190  x.flee → f._moodFleeT  →  mood  →  damage × speed × cooldowns × ki
```

That chain is live. Terrorising a street **already** changes your combat numbers.

**What is missing is exactly one idea:** the crowd's state should feed a **DRIVE**, not just a mood —
and `DRIVES.dominance` is *already* defined as **"to be the strongest thing in the room."**

So the loop he describes is **three wires, not a system**:

1. crowd fear rises → **serves `dominance`** → the drive gives `happy` → mood multiplies power
2. crowd *awe* without casualties → serves a **different** drive → a **different** multiplier
3. and the difference between those two is **exactly what a QUERENT order is**

⚠ **THAT is the connection he is reaching for, and it is the whole reason this is worth doing:** an
order is a drive, a crowd feeds drives, therefore **two differently-designated characters get stronger
from two different crowds.** A Vigil is fed by a street that is *waiting for something*. An Appetite is
fed by a street that has *just seen something it cannot explain*. Same city, same fight, different
fuel.

Nothing else in the project makes the pedestrian layer *matter to combat*. This does, and it costs
three rows and three wires.

---

## PRIORITY, IN HIS OWN WORDS

*"We need to be doing this map stuff and trying to get War World up as soon as possible and playable
on my Steam Deck — that's what I think priority one should be."*

**Agreed, and nothing above changes it.** QUERENT is now cheap enough to be a one-session side quest
whenever he wants it, precisely *because* it stopped being a place.
