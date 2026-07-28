# POWERWORLD

**A third-person, BFP-style action game for the Steam Deck** — flight that commits like *Bid for Power*, ground combat framed like *Jedi Knight*, on a full data-driven power system with 53 fighters.

> This repository is a **fork of [WAR WORLD: ASCENDANTS](https://github.com/taskmasterpeace/living-superweapon)**. PowerWorld is not a separate module — it is the *same engine* seen through a chase camera plus a stage. Forking carries the whole engine along (52 heroes, the ability/damage/psyche/audio systems, the whole thing); that is the point. See **"Divergence"** below.

## The front door

`/` **is PowerWorld** in this repo — the chase-camera game (`powerworld.html` / `src/pw-main.js`, its own title screen in `engine/pwTitle.js`). The isometric ASCENDANTS city game is preserved and one click away at `/citygame.html`; both run on the one shared engine. (In the ASCENDANTS repo the roles are reversed.)

## Run it

```bash
npm install
npm run dev
```

Then open **http://localhost:5180** — you land in PowerWorld. The city game is at `/citygame.html`, the map tool at `/atlas.html`.

## What PowerWorld is

- **Air = BFP.** Flight *commits*: real momentum, a wide turn radius, forward-is-where-you-look, a swoop/pass loop, teleport-intercept on a launched foe.
- **Ground = Jedi Knight.** A jump, crouch, a crouch-at-speed roll, Q3 two-regime friction, a three-phase melee (startup → active → recover), and the gun kit (**MERC**, the gun-combat character) to test it with. Shift+N deploys a firing range.
- **The camera, the reticle, the impact frame** are the third-person layer — the chase camera collision, a convergent crosshair, an angular shake ring-down, all gated on `camMode === 'chase'` so the city game is untouched.
- **The Codex, the roster, the whole ASCENDANTS system** come with the engine. The pause menu's **📁 Case File** opens the full dossier for the hero you are piloting.

Design lives in `docs/powerworld/` (the AAA plan) and `docs/POWERWORLD.md`.

## Divergence (read this)

This is a **hard fork**, chosen deliberately (2026-07-28) so PowerWorld can move fast on its own. **The two engines drift apart from here** — a fix, a hero, or a damage type added in ASCENDANTS does **not** flow into this repo automatically, and vice versa. Port by hand, or cherry-pick, when you want a change in both. If keeping them in lockstep ever matters more than speed, the shared-engine-as-submodule path is the alternative.

## Verify

The headless gauges still work here (`window.LSW` in the console):

```js
await LSW.groundSuite()   // the ground grammar — jump / friction / crouch / three-phase melee
await LSW.pwSuite()       // the PowerWorld + city regression (42 checks)
await LSW.impactSuite()   // the impact frame (needs a FOREGROUNDED tab — measures pixels)
await LSW.audioSuite()    // the attack + item/gadget sound gauge (foregrounded tab)
```

Read **`CLAUDE.md`** and **`HANDOFF.md`** before working in the engine — they are the map.
