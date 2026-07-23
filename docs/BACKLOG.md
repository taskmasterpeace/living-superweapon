# THRESHOLD — BACKLOG (captured 2026-07-23)

Everything Robert called out in one pass, so nothing gets lost between goals. Not a plan —
a ledger. Items move OUT of here into a goal when they get built.

## THE CITY GENERATOR (top priority — "probably the greatest thing we've put together")
- It must carry the CITY TYPES properly. There is a missing tile ("I don't even know what to
  call it") — see the interview.
- Show the city name bottom-LEFT (currently a centred nameplate at the bottom).
- Take the procedural generation to the next level generally. Open design interview.

## POLICE — a real escalation ladder
Today: heat ≥35 → WANTED ★☆☆–★★★, cruisers → officers → SWAT at ★★★.
Wanted:
- **Beat cops first.** Two on foot, not a tactical response.
- **Attacking the police escalates HARD** — hurting a badge should jump the ladder, not tick it.
- Ladder runs BEAT COP → PATROL → TACTICAL → NATIONAL GUARD → MILITARY.
- The player probably won't fight cops unprompted; the ladder is for when they do.

## WEAPONS — real firearms, not one "pistol" class
- REVOLVER (slow, heavy, six)
- GLOCK (standard semi-auto)
- "Pistol with a switch" (full-auto machine pistol — high ROF, wild)
- RIFLE
- SNIPER RIFLE (accurate, long range, real reach)
Existing classes: shotgun · pistol · rifle (`def.weapon` on a `rifle` ability).

## THE NEWS LAYER — lean into it
- **NEWS HELICOPTER** in addition to the ground crew. (Is the crew system expensive? See notes.)
- **The news crew is KILLABLE** — hurting or killing a reporter/operator is A BIG DEAL
  (heat, headline, story change).
- **A news STATION** — a persistent channel: keep some clips, replay them, standings, a
  background broadcast. We already record real footage and keep the stats.

## PRESENTATION / UX
- **Title screen is overwhelming.** Mode select, the character card, and everything else are
  all on one surface. Split it into steps.
- **The registry still doesn't read as a CIA case file.** Needs CATEGORIES — "PWR-IDX 11" is
  cool but uncategorised.
- **Onboarding must explain EVERY aspect** — including what the ground marker under the feet
  actually shows (facing wedge / state ring / altitude band).
- **Character highlight ring** — a highlight around the selected/targeted character.

## ROSTER
- Characters still feel same-y. Needs real differentiation, not more of the same knobs.

## MODES
- **Spectate** — no way to WATCH a fight yet. Should be able to sit out a tournament match
  and watch it (AI vs AI), and to enter a tournament without playing every match.
- **Rule sets** — ring-out / "knock them off the stage" DBZ rules, plus other win conditions.

## INDOORS
- Interiors are ONE FLOOR.
- Flying indoors is the open question — remove the roof? Clamp flight? Both?
- Eventually trees/greenery indoors too.
- A military aspect is wanted; there's a sibling project with guns to learn from.

---

## ADDED 2026-07-23 (session 2)

### THE FOUR-LEVEL LADDER — ruled, designed, not built
Four discrete decks; you can only be BETWEEN levels while travelling. Ground is the exception
(free levitation). Needs a ceiling, and a character in the clouds must stay visible and aimable
from the street. Full design: `docs/PLAN_ALTITUDE_AND_INTERACTION.md`.

### INTERACTION + REAL GRABBING — designed, not built
No interact system exists at all. No dialogue/choice surface. Carrying is currently levitation —
the prop floats ~5u above the head with no arm pose. Design + code plan in the same doc.

### MAP GENERATOR — remaining structural work (ordered)
1. ~~Edge sockets~~ **DONE**
2. **Road graph** — roads are a ground texture; no T-junctions, no dirt roads, no connection
3. **Multi-cell footprints** — anchor + `ref` cells; airports, rail yards, real stadiums
4. **Placement as a data table** — `{when, min, max, weight, score, footprint}`; rarity + landmarks
5. **The editor** — paint + LOCK authored cells + undo + plan JSON in/out + live 3D preview
6. Connect cities by road into a continent framework; airports at multiple sizes

### UNUSED DATA ALREADY PAID FOR
`cultureCode` (14 architectural regions), `sector` (527 rows), `hvt` — parsed, read by nothing.

### PARKED BY RULING
**Interiors / procedural rooms.** Research flagged them lowest-value for this game (at 1:1 scale
most interiors would never be entered). Robert: "we're not there yet, we just talking about the
map maker." Revisit after the map generator work above.

### OPEN QUESTIONS
- What is `Sector`? 223 codes like `LJ5`, half the rows blank. If it's a world-grid reference it
  could drive neighbouring-city consistency; if it's scaffolding, ignore the column.
- Roster size — "we might have too many fighters." Needs a differentiation pass, not a cull.
