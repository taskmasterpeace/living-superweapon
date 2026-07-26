# POWERWORLD — the spine (frame · inventory · decisions · laws)

## 1. What this is

**POWERWORLD is a dimension you reach through a door, and it is a second game wearing the same
engine.** In WAR WORLD you are a Living Super Weapon in a real city at 1:1 scale, with police,
witnesses, a news desk and a career. You research your way to Dimensional Physics, you build the
Gate, you step through — and the camera drops behind your shoulder, the horizon opens, there is
nobody to protect, and the fight becomes Bid For Power.

The strategic point, in one sentence: **the fighters, the powers, the damage model, the ki economy,
the flight tiers, the beams, the ragdolls and the audio are all already built and all come with
you.** PowerWorld is a camera, a control scheme, a world shape and four small mechanics. That is why
a project this size is reachable — not because the ambition is small.

And the product point: `docs/DESKTOP_AND_STEAM_DECK.md` already ships a working Steam Deck path
(packaged build, controller layout, no keyboard needed to quit). **The distribution story for a
Steam Deck arena fighter is already solved.** PowerWorld does not need a new pipeline; it needs a
camera.

## 2. The correction that changes the estimate

Robert asked whether beam struggle already exists. **It does, and it is complete.** Verified in
source, not recalled:

- `projectiles.js:1017` — *"DBZ-style beam struggle: opposing beams meet; the struggle point moves
  toward the weaker"*
- `projectiles.js:681` — `clashPower() = might × powerBuff × (0.35 + 0.65 × ki/maxKi)`
- `projectiles.js:1033` — `_clashT` slides by the power differential each frame
- `projectiles.js:1036` — `clashLen` pins each beam's tip to the struggle point
- `projectiles.js:1060` — the loser is `end()`ed; `_overpower` detonates on them
- `projectiles.js:696` — the beam VOICE strains upward as it loses, *"so you can hear which way a
  beam struggle is going without looking"*

So the missing list is **four items, not five**, and the one that was medium-cost is already done.

| # | Item | Cost | Note |
|---|---|---|---|
| 1 | Teleport-intercept | **small** | the kill test. Buildable in the CURRENT camera |
| 2 | Lock-on chase camera | **large** | everything else depends on it |
| 3 | Limb segmentation | medium | only matters once the camera is close |
| 4 | Impact-indicator discipline | small | design work, little code |
| ~~5~~ | ~~Beam struggle~~ | — | **already shipped** |

⚠ The open question on beam struggle is not whether it exists but whether it holds up **airborne and
at speed** — it was tuned for grounded isometric fights. That is tuning, not building.

## 3. The laws PowerWorld may not break

These are load-bearing in this repo and a new dimension is exactly where they get broken by
accident. Every one has been paid for once already.

1. **THE LIGHT-COUNT LAW** — a fixed pool of 14 PointLights, always in the scene, always visible.
   `borrowLight`/`returnLight` drive intensity only. Changing the visible light count rebakes every
   material (measured 400ms freeze). A new dimension full of energy effects is the highest-risk place
   in the project for this.
2. **THE RESET LAW** — `game.clearTransients()` is the ONE place that empties the board. A new
   transient system goes there, not into a reset path.
3. **THE DEFERRED-CALLBACK LAW** — `game.later()`, never a bare `setTimeout`, for anything touching
   the fight.
4. **THE AI HONESTY LAW** — a bot may act only on what it earned by sight, radio or noise. A lock-on
   camera must not become a lock-on wallhack, and PowerWorld's open sightlines make vision *easier*,
   which is fine — but the gate stays.
5. **THE FAIRNESS LAW** — difficulty buys judgment, never reflexes, aim or knowledge.
6. **THE FLICKER LAW / `GROUND_LAYER`** — never invent your own small offset. A perspective camera
   at close range makes z-fighting far more visible than the iso camera did.
7. **THE MECHANIC PROTOCOL (§5)** — a data-driven type not an `id ===` check; one choke point; two
   carriers via two delivery systems; a counter; readable; in the manual in the same commit;
   verified headlessly with real assertions.
8. **NO PURPLE.** KIVULI is the sole exception. A DBZ-styled dimension is where violet auras will
   try to sneak in.
9. **The manual is the contract** — combat changes update `docs/COMBAT_MANUAL.md` in the same commit.

## 4. Decisions that need Robert, before anything is built

| # | Decision | Why it blocks |
|---|---|---|
| A | **Is PowerWorld a MODE, a THEATER, or a PLANET?** All three doors exist. A mode card is cheapest; a theater rides `hud.theater` and the travel cinematic; a planet gets `worldEnv` for free. | decides the door, the save shape, and whether the career can book fights there |
| B | **Does the camera replace the iso camera in PowerWorld only, or become a global option?** | a global option is a much bigger test surface; PowerWorld-only keeps the city game frozen and safe |
| C | **Is our TIER ladder the transformation ladder, or is a pressable ascend/descend a new system?** BFP presses Z/./X; our tiers are earned by XP. | decides whether "transformation" is a control group at all |
| D | **One fighter or a roster in PowerWorld?** THE_MERGE.md already recommends one hero deployed at a time. | decides whether lock-on needs target cycling on day one |
| E | **Does PowerWorld book Elo / injuries / the career?** | a dimension that does not touch the book is a sandbox; one that does is a career venue |

## 5. The build order, and the one test that decides everything

1. **TELEPORT-INTERCEPT, in the current isometric camera.** A day. It turns momentum melee into the
   chase loop: knock them away, blink to them, continue. **If it is not fun in isometric, the camera
   will not fix it** — and that is the cheapest possible way to find out.
2. **The chase camera, in one flat empty arena.** No content, no stage art, no modes. Prove framing,
   full-sphere handling, and that the fog/occlusion/aim systems survive.
3. **Impact-indicator discipline** — do this *with* step 2, because the camera is what exposes the
   problem.
4. **Limb segmentation** — once you are close enough to see the knee.
5. **Stages and the door.**

⚠ Step 2 is the expensive one and should not start until step 1 has convinced us.
