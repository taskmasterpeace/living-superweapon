# LOST AND FOUND — everything Robert asked for in the last 72 hours that has no home

*Written 2026-07-27 after: "I said a lot and I feel you only skimmed over it. look thru all convo in
last 72 hours and side convos I said so much bro."*

**Sources swept:** all four `D--lsw` transcripts (07-24 19:39 → 07-27 14:00), both `D--lsw` worktree
transcripts, the `D--git-ShootEM` transcript (54 MB), plus `D--git-carworld`, `D--git-housesmith` and
`D--git-aiobr` (checked and clean — zero LSW/War World content in any of them).
**388 user messages extracted, 328 inside the 72-hour window.**

**The honest headline first:** most of what he said *did* land. `MULTIVERSE.md` (40 numbered rulings),
`RULINGS_0727.md`, `THE_THREE_GRIDS.md`, `THE_BRIEFING.md`, `DECISIONS_REMAINING.md`, `THE_AGENDA.md`
and `BACKLOG.md` between them capture the 07-26/07-27 material very thoroughly — including several
things I expected to find missing (the camera-rises-with-the-unit zoom, the melee camera, the status
badges, the pedestrian rulings, the Querent→designation correction, the fear-siphon loop). **The
losses are concentrated on 07-24 and 07-25**, in the marathon `/goal` sessions where each new goal
arrived before the previous one was written down.

**What is genuinely lost: 15 items.** One of them is large.

---

# §1 — NEVER CAPTURED

*No doc, no code, no backlog entry. Ranked by how much building it would change the game.*

---

### 1. THE INFLUENCE FIELDS — a living city instead of a generated one
**2026-07-26 16:35 · "I really want you to obsesses over improving what we have."**
He sent six city-simulation repos (micropolis, citybound, OpenCity, isocity, TileCityBuilder,
GitHubCity) plus a voxel question, and asked to be obsessed over. The measured answer came back:
`world.js` has **no `update(dt)`** — the city is inert; `crime`/`safety` is **one number per city**
read in seven places and never varying *within* it; **zero per-cell simulated fields**. The
recommendation was ranked **#1 payoff-per-hour in the whole project**: land value, pollution,
congestion and service coverage as diffused grids over the cell lattice we already have.

He replied **"ok where are we with this. audit and report back and let me know if ready to
/wwa-ship-mechanic"** — then the thread collapsed into a gate argument (*"see i cant understand all
this i want it automated"* → *"i dont understand anything you just said stop talking weired"*) and it
was never written down or started.

**Grep across the entire repo: `micropolis` 0 · `influence field` 0 · `land value` 0 · `pollution` 0
· `congestion` 0.**

**What building it means:** police response varies by *district* instead of by city · a block you
flattened is visibly poorer next time · pedestrian density and vigilantism read the local number ·
the news desk can name the worst-hit block · the base site survey stops asking "which city" and
starts asking "where in it". It is the single biggest un-started idea in the 72 hours.

---

### 2. THE TOURNAMENT MODE HE ASKED FOR TWICE
**2026-07-25 02:47 `/goal` · restated 04:02 —** *"make the tournament mode better...make sure we have
brackets, with stats... and smash brothers like maps (keep our controls). make the map interacive
someone and destvicive."*

The `/goal` was acknowledged, recon started, then superseded by the next goal. **The 07-25 session's
own context summary literally says "Still unbuilt."** It never reached a doc.

Brackets exist. **Stats on the bracket, and Smash-style interactive/destructive stages, do not.**
Grep: `interactive map` 0 · `destructive map` 0 · `stage hazard` 0.

**What building it means:** the tournament stops being the same city with a bracket screen in front
of it and becomes a set of authored arenas that fight back — which is what makes a fighting game's
stage list matter.

---

### 3. THE MODES FROM THE 60-IDEA BOARD — PUBG, SECRET WARS, KAIJU, 2v2
**2026-07-25 04:02 `/coach-ideas` —** *"i thought of a pubg like mode. think secret wars......I thought
of team battles. image a 2 on 2. I thought of Kiju battles."*

A 60-idea ranked board was delivered **in chat only**. Grep: `PUBG` 0 · `Secret Wars` 0 · `kaiju`
appears **once**, in `THE_MERGE.md`, and only as a scope-risk warning about the HQ document. 2v2
exists as tournament *duos* (an AI partner), which is not what he described.

**What building it means:** four named modes with no design owner. At minimum they should be written
down before the board is unrecoverable.

---

### 4. THE WEAPON DESIGNER
**2026-07-25 19:16 —** *"I want you to actually be able to design a weapon — if you design a weapon
it's like choices that you really get to like that actually have impact and weight right, like the
damage and all that stuff."*

The **ARMORY** (07-26) lets him *select* from 35 authored rows and compare them. It does not let him
*make* one. Grep: `weapon designer` 0 · `design a weapon` 0 · `weapon creator` 0 · `craft a weapon` 0.

**What building it means:** ORIGIN for weapons — the same point-buy shape, over `ab` blocks
(damage/pellets/interval/spread/speed/life) the engine already fires with, so every dial has a
measurable consequence. The armory's derived-DPS comparison table is already the readout it needs.

---

### 5. SCREENSHOT EVERY POWER AND GADGET — THREE EACH — HE PICKS
**2026-07-25 19:16 —** *"show the effects of 100% of the powers and gadgets/items..take screenshots 3
each and let me pick ones i like then lets use them for something else next...maybe in our
enclypoedia or whatever dont cur corners."*

Never started, never logged, never refused. 168 reference images sit in the repo root and **not one
of them is a power-effect contact sheet**. Grep: `3 each` 0 · `enclyp` 0.

**What building it means:** 364 ability slots × 3 frames is a freeze-frame harness run — the machinery
exists (`game.update = () => game.world.render()`, the posing recipe in `CLAUDE.md`). The output is
both an art-direction pass *he asked to drive himself* and the asset set for the codex/encyclopedia.

---

### 6. IMAGES FOR THE ACTUAL POWERS
**2026-07-27 10:56 —** *"We're gonna add images for the actual powers."*

Grep: `power icon` 0 · `ability icon` 0 · `power art` 0. The slot chips carry a geometric glyph
(`═ ◆ ✕ »`) and a range word — deliberately, because emoji render badly on Windows — but there is no
per-ability image anywhere, and no pipeline for one. Directly downstream of item 5.

---

### 7. CRITICAL HITS
**2026-07-26 01:36 —** *"this is another injury thing......thinking of having a cirivcitcal hits or
manages."*

Said inside a message about speech bubbles, so it read as an aside and was dropped. Grep across all
docs and source: `critical hit` 0 · `crit chance` 0 · `headshot` 0 · `weak point` 0.

**What building it means:** the injury system already derives a wound *kind* and a *zone* at the
`takeDamage` choke point. A crit is the same machinery with a roll and a louder tell — but it is a
combat mechanic and must go through `wwa-ship-mechanic` (two carriers, a counter, a readable tell).

---

### 8. SUBMERSION LEVELS
**2026-07-24 14:59 —** *"We got altitude levels and then we got the we're gonna have these submersion
levels as well."*

`BANDS` carries `shallows: -8` and `depths: -22` and the bathymetry digs a real bed — but there is **no
submersion ladder, no underwater movement model, no depth readout, and nothing a player does down
there.** Grep: `submersion` **0 across the entire repo.** `waterAt` is still a drag multiplier plus a
splash.

**What building it means:** the altitude ladder mirrored downward. The four-deck servo, the band ring
and the altimeter are the exact shape it needs, and the deep water already exists to put it in.

---

### 9. STAMINA — a direct question, never answered
**2026-07-24 14:59 —** *"What is the relationship between stamina and energy? Do any characters have
both?"*

Grep for `stamina` in the roster/engine: **only dogs have it** (`data/companions.js`, one of seven
breed aptitudes). Fighters have ki and nothing else. The question was never answered in any doc and
the design implication — that he may want a second pool — was never surfaced back to him.

---

### 10. "WHY ARE WE STILL AT 52 HEROES?"
**2026-07-25 16:56, verbatim opener of the message.**

Answered conversationally at the time and never turned into anything. Still 52 today.
`BACKLOG.md` carries the *opposite* note from an earlier session — *"we might have too many fighters.
Needs a differentiation pass, not a cull."* Nothing anywhere records that he wants the roster to
**grow**, or by how much, or with whom.

---

### 11. iPHONE 9:16 **AND** 16:9
**2026-07-24 21:24 —** *"that was 16:9 tho. iphone is 9:16 i thought."*
**2026-07-24 22:35 —** *"make sure we have iphone 16:9 and 9:16 supppert."*

Grep: `9:16` **0 across all docs.** What shipped is `PHONE_CSS` plus an in-match **rotate gate** —
which forces landscape, i.e. supports 16:9 and explicitly *refuses* 9:16. That may be the right call,
but it is the opposite of what he asked for twice and he was never told.

---

### 12. BRIGHTER, MORE DISTINCT CHARACTER COLOURS
**2026-07-24 16:56 —** *"also the characters need a liitle more brighter colors and distinct looks."*

The `frameOf` silhouette work predates this (07-23) and is about *shape*, not colour. The only thing
that ever touched it is `docs/powerworld/pw-visual.md §1.5`, which **measured** the clustering — gold
`#ffd557` ×9, `#ffb649` ×5, `#ffe270` ×4, i.e. **18 of 52 heroes are some shade of gold** — and then
argued explicitly *against* changing any accent value. His complaint was analysed and effectively
declined, in a PowerWorld research file, without him being told.

---

### 13. THE HEIGHT RULING
**2026-07-25 22:40 —** *"the hights are not right yet...give me something to measure hight of each
pashe...building hight should only be as high as standing/levetaging on top of our tallest building..
you can stand on, we need to establish that i think first righ not stuff seems to high... right now
is too to high."*

He asked for two things: a **measuring tool for each altitude phase**, and a **rule** tying the
BUILDING band to the tallest standable roof. Neither is written down. See §3 for why this matters —
what shipped goes the other way.

---

### 14. REPURPOSE THE `impeccable` SKILL FOR THE GAME
**2026-07-24 16:56 —** *"install the impeccable style."*
**2026-07-26 16:11 —** *"there is a skill called impecable, lets get it and repurpose it for building
our game."*

It is installed at `.agents/skills/impeccable/` — **unmodified since 2026-07-24 12:58**. It is the
stock frontend-design skill: it knows nothing about no-purple, the token ramp, the document+broadcast
identity, `overlays.css`, or the isometric camera. Asked for twice, installed once, repurposed never.

---

### 15. A BETTER WAY FOR HIM TO TALK TO US
**2026-07-27 17:29 —** *"what if we created a different way to communicate — right now all I'm doing
is typing in prompts. If we can invent some [mode] that allows us to develop… if you want to write it
up in a way where I can just have it read it back to me that would be dope."*

**Half honoured:** `THE_BRIEFING.md`, `SPEC_COMBAT_STATES.md`, `POWERS_BRIEF.md` and
`THE_FIELD_MANUAL.md` are all written to be read aloud, which is the *output* half. The *input* half —
inventing a channel better than dictating into a prompt box — was never designed or recorded. This is
a process request and it is the one that compounds: every item in this document exists because
speech-to-text at 3,000 characters outruns the note-taking.

---

### Standing instruction, never recorded as one
**2026-07-25 23:03 —** *"give me many things i didnt ask for but id totally love."*
Honoured in spirit repeatedly; written down nowhere, so it dies with each context wipe.

---

# §2 — CAPTURED BUT NOT BUILT

*In a doc. No code. This list is long and that is fine — it is a queue, not a failure.*

## Ruled 07-27, all unbuilt
| item | where | note |
|---|---|---|
| Pedestrians get real stats + real logic (fight them, panic, melee, draw, call police) | `MULTIVERSE.md` 29 | the biggest one here |
| Pedestrians get emotions; robots don't; aliens optional | `MULTIVERSE.md` 30-31 | |
| Mind control must show a visual response on the body | `MULTIVERSE.md` 32 | ⚠ see §3.5 |
| The fear-siphon / emotion→power loop | `THE_THREE_GRIDS.md` | "three wires, not a system" |
| Cars: a *chance* to explode on heavy damage, not always, not never | `MULTIVERSE.md` 33 | |
| Camera rises with the selected unit (Ascendants isometric only) | `MULTIVERSE.md` 28 | |
| A melee camera — push in when melee starts | `MULTIVERSE.md` 27 | |
| Status badges ACTIVE·INACTIVE·RETIRED·DEAD·MISSING | `MULTIVERSE.md` 26 | MISSING is the multiverse hook |
| "Elo"→POWER RANKINGS, college-football feel, emblems and logos | `MULTIVERSE.md` 25 | |
| THE CHOIR (ex-Querent) as a rare roll at character creation | `THE_THREE_GRIDS.md` · `THE_BRIEFING.md` | now cheap: a field, a roll, three DRIVES rows |
| Drugs — the lane behind the rank-19 soldier ceiling | `RULINGS_0727.md` · `DECISIONS_REMAINING.md` | |
| Directional damage | `RULINGS_0727.md` | named as a gap |
| Crouch gives cover AND ducks a round already in flight | `RULINGS_0727.md` | reactive, not postural |
| Prone (keep crouch, add prone) | `THE_STANCE_LADDER.md` | |
| Elevators · everything two floors · the garage vehicle lift · mountains above the building ceiling | `RULINGS_0727.md` | War World |
| Submissions + THE HOSTAGE RULE (front hurts the hostage, behind hurts the grappler) | `DECISIONS_REMAINING.md` | called the best idea in that doc |
| PowerWorld: destructible props to pick up and throw | `RULINGS_0727.md` | every piece exists in Ascension |
| PowerWorld: people don't fly far enough | `RULINGS_0727.md` | a feel number, not arithmetic |

## Ledgered in BACKLOG, unbuilt
- **The boxing venue's crowd** — 12 rows of empty seats; `_hideWorld` hides the peds rather than
  seating them. Asked for directly on 07-26 19:37 (*"the ring's venue and monitor have pedestrians
  who act real using our mechanics"*). Also: no clinch break, no referee, no corner, no rest round,
  and **pure boxing has no door on the mode card**.
- **Companions** — five breeds as data, zero as entities. Nothing bites, nothing renders, and
  `hud.js` shows only the *player's* mood, so no companion's emotional state can be displayed.
- **City familiarity · personal relationships · investigations** — all three named by him on 07-26
  18:08, all three still absent.
- **The 47 untagged research rows** — prose descriptions with no `fx` verb.
- **Base raids** — `base.js` sells the armoury as *"worth raiding — which is what makes defence
  matter"* and `baseroom.js:13` says a raid *"is a designed event"*. There is no raid.
- **Weather**: the vertical column, the tornado, hail, the taxonomy tagging pass.
- **Presentation**: title screen split into steps · registry categories · onboarding that explains the
  ground marker · a character highlight ring · news helicopter · killable news crew · a news station.
- **Interiors are one floor.** Bots still don't navigate doorways.
- **The hands**: no pad D-pad binding; the wheel is unbound because `THE_HANDS.md` contradicts itself
  about CLASSIC.

## The agenda's own items 0–2, unstarted
The unified harness · the Passport stub · the War World map-maker/interior-editor lab page.
`THE_AGENDA.md` is explicit that nothing else should start until 0 does.

---

# §3 — CONTRADICTIONS

*He said two different things on two different days. Not resolving these — flagging them.*

### 3.1 Whose melee crosses over
> **07-27 ~09:31** — *"I think war worlds may is needs to be thrown out because ascendance mail is
> better. It has to move forward."* → shipped as `MULTIVERSE.md` rulings **13** and **15**:
> *"ASCENDANTS' MELEE GOES ACROSS THE BOARD."*

> **07-27 17:55** — *"Or, world, world, melee is not ascensions, melee… it looks like we're gonna have
> to use, um, world worlds, mainly."* → `DECISIONS_REMAINING.md` re-reads this as *the substrate
> crosses, the moveset does not.*

Both readings are currently written as rulings, in two files, and they disagree about what "across
the board" meant.

### 3.2 Whose models survive
> **07-27 09:03** — *"i hate the war world lsws we can dump them."* → `MULTIVERSE.md` 3: **DELETE**.
> **07-27 01:57 prompt** — *"Keep War World's existing MODELS if they can be re-skinned."*

> **07-27 17:55** — *"I even think we might even, to be honest with you, [be] replacing the models in
> Ascension with the models in the world world."*

Delete War World's LSWs, keep War World's models, and possibly replace Ascension's models *with* War
World's — three positions, one week, unreconciled. `RULINGS_0727.md` flags this as *"flagged, not yet
decided."*

### 3.3 The building ceiling
> **07-25 22:40** — *"building hight should only be as high as standing/levetaging on top of our
> tallest building… right now is too to high."*

> **Shipped 07-26** (`CLAUDE.md`, PowerWorld pass) — *"`MIN_CEIL 260` / `MIN_SKY 150` floor it. A
> superhero must get above the map whether or not the map has skyscrapers."*

The shipped fix deliberately **decouples** the ceiling from building height, which is the exact
opposite of the rule he asked to establish. The fix has a good reason (a Moon village had a 42u
ceiling). He was never told it overrode him.

### 3.4 Flat or not flat
> **07-27 09:31** — *"there's a lot of flickering and tearing… I'm thinking about just making both
> worlds completely flat for right now."*

> **Answered by measurement, commit 07-27 05:44** — *"do not flatten the world — the instrument was
> lying."* A flat rebuild measured **21 too-close decal pairs against the mountain build's 5**.

Correct call, and he never confirmed it. And **07-27 10:36 he said the flicker is still there**:
*"also stilll gett flicker at intersections especially when the camera moves."* The intersection
fan-subdivision commit (07-27 06:38) landed *before* that message.

### 3.5 Mind control and pedestrians
> **Engine law, `CLAUDE.md`** — mind control affects *"minds only — never humans, never `def.police`,
> never dummies."*

> **07-27 11:13** — *"make sure we have powers that can use them [pedestrians] for example, mind
> control, be sure to give them a visual responses."* → `MULTIVERSE.md` 32.

The new ruling requires exactly what the existing guard forbids. That guard is load-bearing (Elo
booking, tournament round counting, `releaseMind`) — this needs a deliberate rewrite, not a flag flip.

### 3.6 Purple
> **`CLAUDE.md`** — *"KIVULI ONLY (creator override 2026-07-22). No other purple anywhere, ever."*
> **07-27, `RULINGS_0727.md`** — *"VEGA's purple: 'That don't matter, I'm not worried about that.'
> Stays."*

There are two canon exceptions now, and one of them is recorded as an absolute.

### 3.7 The camera the hands were designed for
> **`THE_HANDS.md`** argues hands-over-stance *because* "on a fixed isometric camera you cannot see
> which mode you're in," and the HUD row exists because a rifle is a few pixels at that camera.

> **07-26 21:32 onward** — PowerWorld ships a third-person chase camera, and the 07-27 01:57 prompt
> asks to extract camera+controls into a **swappable shell**.

He flagged this himself in that prompt (*"⚠ This invalidates shipped design reasoning… tell me which
decisions change BEFORE writing code"*). It has not been answered.

### 3.8 Roster size
> **`BACKLOG.md`** — *"Roster size — 'we might have too many fighters.' Needs a differentiation pass,
> not a cull."*
> **07-25 16:56** — *"wait how are we STILL at 52 heroes after we did here???"*

Too many, or not enough. Both are on file.

---

# §4 — THINGS I CANNOT VERIFY

*Suspected side-chat or attachment content that never reached disk.*

1. **THE FLOOR-PLAN GENERATORS.** *"I gave a bunch of floor plan generators and all of that stuff"*
   (07-27 17:05). `THE_THREE_GRIDS.md` already records that `docs/reference/` contains **only**
   `openjk.md` and that these are gone. **Ask him to re-send.**
2. **A READ-ONLY SIDE CHAT EXISTS AND WE ONLY SEE WHAT HE PASTED.** Proven twice: *"I aske danother ai
   this and here is what it said"* (07-26 19:19, the stance-setting answer) and, in his own paste of a
   QUERENT draft, *"I can't write to the repo from this side chat (it's read-only)."* Anything he said
   in that chat and did not paste back is unrecoverable from here.
3. **THE ONENOTE.** *"oh I have a OneNote"* (07-25 19:16), immediately after listing name data, injury
   data, weapon-design data and personality types he says he already owns. Never produced.
4. **`talkshowgo`'s comic-book UI package.** He pointed at `D:\git\talkshowgo` and said *"it's like a
   react package… it looks kind of comic book like, it really fits the aesthetic."* The comic layer
   we built was fonts-and-SVG from scratch. No doc records whether that package was ever opened.
5. **`Country Selection Screen.zip`** (attached 07-26 03:08) — the HQ globe shipped, but nothing
   records what was actually in his old design or which parts were used.
6. **The Shogun voice sample.** Promised 07-27 17:55, *"we can back burn it up, but you can make up
   something for now."* Not delivered.
7. **The two coach-ideas boards** (07-24 22:40 "ideas Invincible fans would fit into"; 07-25 04:02 the
   60-idea tournament board). Rendered in chat only. **They should still be recoverable** from
   `C:\Users\taskm\.claude\projects\D--lsw\*.jsonl` assistant messages — surviving subagent outputs
   also exist under `C:\WINDOWS\TEMP\claude\D--lsw\4d1bbc70-.../tasks/*.output`. Recover before the
   temp directory is cleaned.
8. **Everything before 2026-07-24 14:00.** The 07-24 transcript opens mid-session with a context
   summary referencing a long ATLAS design interview whose original transcript is outside this window.
   Several rulings quoted in `CLAUDE.md` (the humanH metric, the Ferris wheel, "corner warfare with
   guns") come from there and I could not re-read the primary source.

---

## The pattern, stated plainly

Every loss in §1 has the same shape: **a big idea arrived inside a bigger message, or a `/goal` was
superseded by the next `/goal` before it was written down.** Items 1, 2, 3, 4 and 5 are all from
07-25/07-26 marathon sessions where six goals were issued in twenty-five minutes.

The 07-27 material is nearly complete precisely *because* that day was spent writing instead of
building. That is the argument for item 15 — and for the `LOOPING.md` discipline of ending every loop
with a doc in the same commit.
