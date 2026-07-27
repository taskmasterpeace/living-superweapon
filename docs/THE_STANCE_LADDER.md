# THE STANCE LADDER — stand · crouch · prone

*Ruling, Robert, 2026-07-27: **"let's keep crouch and add prone, let's do both."** War World.*
*The work item is **ShootEm #149**'s neighbourhood; this file is the ruling it points at.*

---

## ⚠ THE EVIDENCE THAT SETTLES IT IS ALREADY IN THE CODE

`src/sim/map.ts:83-91` — the DUCK LAW, dated 2026-07-24, carries this line:

> *"Was 0.6 (**shin cover**) before crouch became load-bearing."*

**Shin cover existed, and it was abandoned.** Not because it was a bad idea — because with only two
stances **nothing could use it**. A crouched man has a profile top of 1.0 and simply does not fit
under a 0.6 obstacle, so a shin-height pile protected nobody and the number was raised to waist.

**Prone is what gives shin cover a user again.** That is the whole justification, and it means adding
prone does not invent a tier — it *reoccupies one the game already had and lost.*

## ⚠ AND THIS IS WHY YOU MUST NOT REVERT `RUBBLE_H`

The obvious move on reading the above is to put `RUBBLE_H` back to 0.6. **Do not.** Robert ruled on
the twenty-fourth that a breach pile is *waist* cover, and that ruling is correct and load-bearing:
it is what makes ducking behind rubble work at all.

**Prone adds a NEW tier BELOW the existing ones. It does not undo the duck law.**

---

## THE LADDER

| stance | eye line | profile top | footprint | what it clears |
|---|---|---|---|---|
| **STAND** | `1.4` *(exists)* | ~1.8 | normal | nothing — you are the target |
| **CROUCH** | `EYE_CROUCH 0.85` *(exists)* | 1.0 | **normal** | waist cover `RUBBLE_H 1.05` · `COVER_H 1.2` |
| **PRONE** | `EYE_PRONE ~0.35` **(new)** | ~0.4 | ⚠ **LONGER** | **shin cover ~0.6** — the tier nothing could reach |

**Three stances, three eye lines, three cover tiers.** Each rung buys concealment with mobility, and
the existing constants already define two of the three — this is one new eye line and one new
obstacle height, not a new system.

---

## WHAT MAKES PRONE DIFFERENT FROM "CROUCH, BUT MORE"

Three things, and Robert named all three himself:

**1. ⚠ THE FOOTPRINT EXTENDS.** This is his sharpest point and it is the one that makes prone a real
tactical object rather than a smaller crouch. Crouching shrinks your height and keeps your radius;
going prone **trades height for length**. You become long and thin instead of short and wide. That
changes what you fit behind, what fits behind you, and — because the collider is no longer roughly
symmetrical — **which direction you are facing starts to matter to your own hitbox.**

**2. THE ROLL.** Left and right only, and prone-only. It is the smallest precise movement in the game
and nothing else provides it. A prone fighter adjusting by half a body width to clear a firing angle
is doing something no other stance can do.

**3. IT IS A COMMITMENT.** Getting up is slow, and that slowness *is* the balance — it is what stops
prone being a strictly better crouch. Crouch is a flinch you can take and undo in a moment. Prone is a
decision you are stuck with for a beat. ⚠ **If getting up is fast, crouch becomes pointless and we
have wasted a button.**

---

## THE CONTROL — ONE BUTTON, NOT TWO

⚠ The Steam Deck is short of buttons and this must not cost two of them.

**TAP to crouch · HOLD to go prone · TAP again to stand.** One binding, three states, and it is the
convention players already know from every military shooter. The hold threshold wants to be short —
around a fifth of a second — so that going prone feels like a decision and not a delay.

---

## WHAT THIS TOUCHES — read before starting

Adding a stance is cheap; adding a stance *honestly* is not. Every system that asks "how tall is this
person" needs a third answer:

- **line of sight** — three eye lines, and the shin tier only means something if vision uses it
- **cover resolution** — what a given obstacle protects now depends on stance
- **the AI** — ⚠ a bot that cannot go prone will read as stupid the first time one is used against it,
  and a bot that does not understand a *prone enemy* will shoot over them forever
- **the animation** — three poses plus two transitions plus the roll
- **the collider** — the one genuinely fiddly piece, because it changes shape and gains an orientation

**Recommended order:** eye line and cover tier first, because that is the mechanic. Animation second.
AI third, and do not ship prone to bots until they can be shot at while prone.

---

## OPEN, AND DELIBERATELY NOT DECIDED HERE

- **Can you fire while rolling?** My instinct is no — the roll is a repositioning tool, and letting it
  shoot turns it into a dodge.
- **Does prone change accuracy?** Real-world it steadies a rifle enormously. In game that may make it
  the default stance, which would be a mistake. **Recommend: prone gives cover, not accuracy** — you
  go prone to not be seen, not to shoot better.
- **Vehicles.** A prone fighter in a doorway a tank is about to drive through is a moment the game
  should have an answer for, and right now it does not.
