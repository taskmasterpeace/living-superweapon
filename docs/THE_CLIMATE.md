# THE CLIMATE OF THE WORLD — the 168×168 relationship matrix

Robert, handing over the sheet: *"this is how EVERY country feels about the other! this is the
climate of our game... determines your govnmt assigned missions."*

`src/data/relations.js` is the bake. Three sheets now stack on one another:

| sheet | what it answers |
|---|---|
| `cities.js` | **where** a fight happens |
| `countries.js` | **what the state is like** when it does |
| `relations.js` | **who that state can stand** |

## The matrix

168 × 168, scale 1–5, and the properties were **verified, not assumed**: 0 asymmetric pairs, every
diagonal cell blank in the source, every value inside 1–5. It joins the country sheet **168 of 168**
— the only sheet in this project that needs no fallback. `relationOf` still returns `null` for a
name it does not carry, because the next sheet will not be so kind.

The scale runs the way you hope. There are exactly **eleven pairs at 5 in the entire world** —
Canada and the United States, China and Russia, France and Germany, Belarus and Russia, China and
Iran, China and Pakistan, Brazil and China, Australia / Japan / South Korea / the UK with the
United States. That scarcity is what makes a treaty worth anything. At the other end: India and
Pakistan, Israel and Iran, the United States and Russia.

**Encoding** is one 168-character string per country, one digit per column, `'0'` on the diagonal.
A lookup is two map hits and a `charCodeAt`. The matrix is symmetric so half of it is redundant and
it is stored whole anyway — triangle-index arithmetic is a bug farm, and this is 28KB of digits.

## The faction split

**United Front 88 · Collective 80** — and the counts are `factionSplit()`, derived from the same
rows the matrix lives in, so the two can never drift apart.

## ⚠ The join gap this exposed

Three names in the project did not spell their country the way the sheet does, and every one of
them was silently returning `null` and taking the caller's fallback:

- **`USA`** on twenty-odd hero identities.
- **`DR Congo`** on the cities sheet — so **Kinshasa, a 17-million-person city, had no country row
  at all**: no police competence, no vigilantism law, no integrity. That one predates this work.
- **`Faroe Islands`**, which is not a sovereign state.

`COUNTRY_ALIAS` + `canonCountry()` now live in `countries.js` (the base layer) and both `countryOf`
and `relationOf` route through them. Put a new alias there, never in a caller.

⚠ And the identity field is **`co`**, not `country` (`{n, c, co, f}` — `c` is the *city*). Reading
`person.country` compiles, runs, and yields `undefined`, which here meant every career silently had
no homeland and never received a single government contract.

## THE GOVERNMENT CONTRACT — what the matrix is for

The state you answer to reads its own file on the country you are being sent to, and that one number
decides what kind of job it is. Home is the firm's country if one has been founded, otherwise the
fighter's own homeland, so it works from week one.

| standing | posture | purse | renown | in the field |
|---|---|---|---|---|
| 1 HOSTILE | **DENIABLE OPERATION** | ×2.15 | ×0.35 | no cover — the law is already looking for you |
| 2 STRAINED | INTERDICTION | ×1.55 | ×0.70 | tolerated, watched, on your own if it turns |
| 3 NEUTRAL | OBSERVATION DUTY | ×0.80 | ×0.90 | nobody here has an opinion about you |
| 4 FRIENDLY | JOINT OPERATION | ×1.00 | ×1.25 | a partner service works alongside you |
| 5 ALLIED | MUTUAL DEFENSE | ×1.15 | ×1.60 | a treaty obligation; every door opens |

The pay curve is deliberately **V-shaped**: a state pays most to send you somewhere it cannot
officially go and least for a favour to a friend, so money and safety pull in opposite directions
and the card is a real decision.

A **deniable operation** is a different fight, not a bigger cheque: `govFlagged` preloads police
heat through the police system's own heat map, so you start the bout already wanted.

⚠ **Roulette, not "take the most extreme."** The first pass sorted candidates by how far from
neutral they were and picked from the top three — which made **33 of 48** contracts deniable
operations. The rung with the most to say became the default, which is the fastest way to make it
mean nothing. Weighted sampling (`1 + |3 − v|`) lets the world's own distribution through:
measured over 200 career-weeks, **deniable 30% · interdiction 29% · observation 21% · defense 14%
· joint 7%** — all five rungs occupied, none dominant.

Console: `relations` (the split) · `relations Uganda` (one state's whole file) ·
`relations Israel / Iran` (a pair).
