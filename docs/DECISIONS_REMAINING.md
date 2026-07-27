# WHAT ROBERT STILL HAS TO DECIDE

*2026-07-27. Everything already ruled is in `docs/MULTIVERSE.md` (40 rulings). This file is only what
is still OPEN, ordered by what blocks the most.*

**Focus is now WAR WORLD.** Ascension is set aside. These are grouped by whether they block that.

---

## A. ANSWERED 2026-07-27 (was blocking) — now build notes

| was | ruled |
|---|---|
| How do rooms connect? | **A SHORT CORRIDOR** between rooms. May vary with architecture later; short is the first-person default. |
| 12 or 18 squares? | **Cannot be decided on paper — he has to SEE it.** *"I gotta see it in game, and that's why I think we're ultimately gonna need a map maker."* ⚠ Ascension already HAS one (ATLAS, `/atlas.html`, standalone, with a live 3-D preview and a validator). Adopt it rather than build a second. |
| Do science missions gate the LSWs? | **YES.** The science layer must exist before an LSW can appear. |
| Soldier ceiling on 0–100? | **19 IS RIGHT AND TRAINED OPERATORS DO NOT GO HIGHER.** ⚠ *"You need drugs, or a medical procedure, to go higher"* — and drugs are not in the game yet. That is a whole content lane sitting behind one number, and it is the cleanest possible reason for a soldier to ever exceed a human ceiling. |

### ⚠ WAR WORLD'S MELEE IS NOT ASCENSION'S MELEE
Ruling 13 said Ascension's melee goes across the board. Refined 2026-07-27: **the SUBSTRATE crosses,
the moveset does not.** War World keeps its shift-sprint-forward (*"I like that"*), and needs:
- **SUBMISSIONS** — a hold that drains life slowly rather than a burst of damage
- **THE HOSTAGE RULE** — while A is grappling B: **shots from the FRONT hurt the hostage, shots from
  the BEHIND hurt the grappler.** ⚠ This is the best idea in this document. It turns every grapple
  into a positioning problem for everyone else in the room, and it is exactly the kind of mechanic
  that only works in a game about fireteams.

### DECIMALS ON THE 0–100 SCALE? — recommendation: **no on the sheet, yes in the maths**
Store an **integer 0–100** in the Passport; compute in floats internally. Two vocabularies give
roughly five perceivable bands, so a decimal on the sheet is precision no player can feel and one more
thing to keep consistent across three games. The engine can already interpolate — `data/scale.js`
does geometric interpolation *inside* a band precisely so nine rungs mean something.

---

## A2. STILL BLOCKS THE BIG WAR WORLD PUSH

Only two things left here, and neither is a design question:

### A1. Build the map maker / interior editor FIRST
Robert cannot answer "12 or 18 squares" — or any other size question — until he can walk around one.
⚠ **Ascension's ATLAS already is this tool**: standalone at `/atlas.html`, one module with two mounts,
live 3-D preview, drag-orbit camera, a validator, undo 50 deep, named layouts and JSON import/export.
**Adopt it before writing a second one.**

### A2. Write the Infantry Online inspiration folder
See section E. The base builder is about to be designed and its reference is undocumented.

---

## B. BLOCKS THE CROSSOVER — decide before the Passport is written

### B1. What actually accumulates across both games?
Money does not cross (ruled). Items cherry-pick (ruled). Injuries cross (ruled). **So what is the
progression?** Reputation? Contracts completed? Dimensions unlocked? ⚠ Answer this in FICTION first —
it is not a code question.

### B2. Does an Ascendant's power tune DOWN in War World?
Ruled: a soldier stays a soldier in Ascension, kit intact. The reverse is unstated. Does a
70-band Ascendant hit a soldier for the same numbers they hit another Ascendant for?

### B3. Authentication — build or buy?
Ruled: server-authoritative ledger with accounts. **Recommendation: BUY** (Clerk / Auth0 / Supabase).
Days versus weeks plus a permanent security liability.

### B4. Two-player local first, or straight to networked?
Ascension already supports two humans on one machine. Cheapest possible multiplayer proof — no server,
no auth, no hosting.

---

## C. NAMING AND CANON — you have this written elsewhere; it needs pulling

→ ShootEm #146 and #147.

- **Ghost's real name** (you dislike the generic codenames)
- **Your brother's character** — name, role, and a voice sample
- **The Officer** — full voice, full biography, no name
- **14 more unnamed characters**
- **The K9 breed** — design says Malinois, the model is a German Shepherd
- **The power-ranking band names** — the two vocabularies (human words / threat words) need their
  actual words
- **Krystal Bell's callsign** — "Kite" may or may not survive the rename

---

## D. DECIDED, BUT NOT YET DONE — no decision needed, just work

- Drop `Baptiste`; the Infiltrator is **Odessa "Miss Dee" Broussard** (51 lines of audio say so).
  Keep Tremé and the church organ from the rejected version. Drop *"nobody suspects grandma."*
- **Skin tone per persona** — currently one hard-coded constant for every soldier (#145)
- **Delete the 40 native LSWs**, replace via Passport (#148) — ⚠ *after* the Passport is proven
- **VEGA's `#602af0`** breaks the no-purple law — parked at your instruction
- **`frameOf` word-boundary bug** — OLYMPUS is written as thirteen and built as a heavyweight adult

---

## E. INSPIRATION FOLDERS

### POWER WORLD ← Bid For Power / ESF — **ALREADY EXISTS**
`docs/powerworld/` — 11 research files, ~8,100 lines, written 2026-07-26:

| file | what |
|---|---|
| `pw-esf-research.md` | **1,468 lines** — the deepest one. ESF/BFP mechanics, the melee system, powerstruggle, teleport-intercept, nine named combos |
| `pw-combat.md` | the four-deck servo vs free flight, momentum melee, knockback |
| `pw-camera.md` · `pw-controls.md` | third-person camera and the control scheme, mapped against BFP's own bindings |
| `pw-bfp-map.md` | BFP's actual key map, compared to ours line by line |
| `pw-visual.md` · `pw-impact.md` · `pw-limbs.md` | how it should LOOK |
| `pw-world.md` · `pw-spine.md` · `pw-platform.md` | the stage, the architecture, Steam Deck limits |

**Nothing to do here. It is done and it is good.**

### WAR WORLD ← Infantry Online — **DOES NOT EXIST**
War World's own root commit calls it *"a modern Three.js reimagining of Infantry Online"*, and you
have said *"this is like Infantry on steroids"* and *"I've got architecture in my head because I
played Infantry so much."* **None of that is written down.**

⚠ **This is the gap, and it matters more than the BFP one did** — because the base builder (#149) is
about to be designed and Infantry Online is the reference for what a base and a front should feel
like. Recommend a `docs/infantry/` folder covering: the class system, base/facility building, the
front line and territory, vehicles, the economy, and what made its combat read at that camera.

### The other genres — **NOT STARTED, AND NOT NEEDED YET**
Diablo-like, RTS, first person. Your own ranking put first person top (1.5). Nothing to write until
one is chosen.
