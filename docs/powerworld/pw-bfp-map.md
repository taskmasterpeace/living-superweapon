# ULTRA BFP FEATURE SPINE → WHAT WAR WORLD ALREADY HAS

Source: the Ultra Bid For Power complete game guide (Robert's link, fetched 2026-07-26). Every row
on the left is a real feature of the thing we are aiming at, so this is a specification, not a wish
list. The right column is measured against this repo.

| Ultra BFP feature | Ours | Verdict |
|---|---|---|
| **Camera Menu (F1): angle · distance · height · FOV** | nothing — camera is a fixed iso `camDir` on an **OrthographicCamera** | **THE work.** Four dials is a small UI over a camera that does not exist yet |
| **V — first/third person toggle** | ⚠ `V` is our JAB (`KM.strike`) | collision, must rebind |
| Z ascend · `.` powerup · X descend | power TIERS I–III/MAX with transformation ceremonies (`tierOf`, `TIER_COLORS`, shockwave+lightning+pillar+slowmo+announce) — but they are EARNED by XP, not pressed | different system wearing the same coat. Decide: is our tier ladder the transformation ladder, or is a pressable ascend a new thing? |
| `,` fusion (dance minigame / Potara) | nothing | out of scope for v1, and say so |
| Kaioken 1 min, lethal if not deactivated | `buff` abilities with `dur`, `overdrive`, ki drain, `onDrained` | the *shape* exists (a timed self-buff with a cost). A lethal-on-expiry buff is a data row |
| Transformation style: Fast (instant) vs Normal (cinematic) | tier-up ceremony is always the full cinematic | one flag. Cheap, and a real quality-of-life win |
| **Dragon Radar (F7) + 7 collectibles** | `hud.updateRadar` exists (arena, cover, foe dots, fog `?` at `_lastKnown`) | the radar exists; a collectible hunt is a mode, not a system |
| Wishes (+100 HP, unlimited ki, strength, senzu…) | `energyInfinite` (TITAN's ∞ CORE), `powerBuff`, `levelMult`, medkit item | every effect already has an engine verb. A wish is a data row calling one |
| Music Menu (F6) + custom .wav | `music('menu'|'combat'|'victory')` + the bus mixer (music/sfx/voice/ambient/ui) + 300-file MP3 sample bank | a menu over what exists |
| Maps incl. Namek | 1,050 real cities + procedural planner + terrain/relief/biome + planets | we have *more* map than BFP; what we lack is BFP-SHAPED maps (open rock, no city, no peds) |
| Modes: FFA · TDM · LMS · Tourney · CTDB · Oozaru · Survival · Battle Royale | duel · survival · rumble · tournament · boxing · freeroam · lab | FFA=rumble, Tourney=tournament, Survival=survival. Missing: TDM, LMS, CTDB, BR, Oozaru |
| Oozaru (giant player form) | `size` ability type — **implemented in the engine and carried by NOBODY** (orphan audit, class 1) | a dead type that is literally this feature. One data row |
| Senzu Bean pickup | item system with `charges`, `medkit`, ground drops (`_drops`, `spawnGearDrop`, `pickupGear`) | pickup infrastructure is done |
| Big Heads cheat | `frameOf` derives `head` scale per fighter | one multiplier |
| FPS cap + counter, graphics options | adaptive quality tiers 0–2, `_pixelCap`, `get fps`, `hud.toggleTelemetry` (F2) | done, and better (adaptive) |
| Skins (Skin1/2/3 per character) | `def.colors` palettes + `BUILDS` per hero | a skin is a palette row |

## The reading

BFP's feature list is mostly **menus over systems** — a camera menu, a music menu, a transformation
menu, a radar menu. We have the systems and none of the menus. The exception, and it is the whole
project, is that **BFP's camera is a real third-person chase camera and ours is an orthographic
isometric camera.**

Two features on that list are *already implemented and unreachable* in our engine — `size` (Oozaru)
and every wish effect. That is the orphan audit's point restated: this dimension is unusually cheap
because most of it is wiring, not building.

## What BFP has that we should NOT copy

- **Fusion.** A two-player merge with a timing minigame is a whole system and a whole art problem.
  Park it in writing.
- **Licensed everything** — characters, music, the Dragon Balls themselves. PowerWorld uses OUR
  roster and OUR ladder. The 52 fighters and the creator are the differentiator; borrowing the shape
  of BFP's camera and controls is legitimate, borrowing its cast is not.
- **First person.** BFP offers it. On a game whose whole readability model is "you can see both
  bodies", first person fights the lock-on framing. Offer it as a photo mode at most.
