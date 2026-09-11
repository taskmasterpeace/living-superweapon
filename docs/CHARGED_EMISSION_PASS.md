# Charged emission and movement — 2026-09-07

This is a bounded improvement, not completion of the active BFP/superhero-combat goal. No map design changed.

## What changed

- Charging a projectile no longer multiplies horizontal velocity by `.85` every input frame. `castMoveScale` is an explicit, non-stacking wish-speed modifier for charged projectiles as well as beams. Studio exposes it as **Movement while casting**, validates 0–1, and preserves it through profile/package data.
- A semantic source sampler uses the final right palm, combined palms, chest or eye aperture. It reacquires the current rig after form changes; it does not retain retired meshes.
- A spherical field's rear boundary meets the emitter; its center moves out as radius grows. The lit, ability-colored inner core and edge-weighted outer shell replace the flat white disc. Concentrated beam gathering keeps its existing small field and material.
- Gathering follows the final hit-reaction carrier, body separation and portal transfer. Gather particles/rings/lightning consume one pending event, so extra positional synchronization does not duplicate emission.
- Release resolves once after animation and before portal/projectile processing. Position, target snapshot and release flash agree. A command inside the radius cannot make the sphere reverse toward the caster.
- Preparation compresses near cover or ground without reducing stored charge, paid energy, damage or the released attack's radius. Charged projectiles enter swept contact, including their vertical radius at low cover. The launch offset cannot relocate energy through a wall.

## Evidence

`npm run test:charged-emission` runs the focused charge/energy/position/emitter tests and browser recording. `tools/charged-emission.test.mjs` has 29 tests covering actual Fighter/runSlot/Studio/projectile behavior.

Observed failures before correction:

- A velocity of 14 fell to 0.10683, 0.0008152 and 0.0000000475 after one second of charge input at 30/60/120 Hz respectively. This isolates the ability's unwanted damping; it is not a measurement of live controlled travel speed.
- Gathering used preceding anatomy; the eye-origin case was more than 5u from the requested source.
- Review reproduced a 99.05u held-field error after a portal and 1.67u after body separation.
- A radius-6 sphere targeting about 1u beyond the palm launched backward (direction dot −1).
- Release contact was lost above a low wall because launch and normal collision disagreed about vertical radius.

The final serial regression command ran the 46 suites from `FIREARM_EMISSION_PASS.md`, plus `charged-emission`, `charge-energy`, `charge-position`, `energy-burst-material`, `studio-profile`, `remote-tuning`, and `head-cover`: **590 tests passed, no failures/skips/cancellations**. Run Node with `--test-concurrency=1` when including browser-backed suites. An earlier concurrent run failed the all-roster profile browser check; an isolated 18-test run and the full serial run passed. Cross-browser contention is not established as its root cause.

Vite production build passed: 248 modules, 6.08s. The existing large-chunk warning remains (shared Studio/profile chunk about 4.90MB minified / 1.74MB gzip). Scoped whitespace and new-file syntax checks passed; Git emitted line-ending notices. No target-hardware performance claim.

`node tools/charged-movement-live.mjs` also ran real keyboard input through `Game.update` in PowerWorld: VEGA traveled 45.82554u without charging and 45.82535u while holding Q for 1.5s (ratio **0.9999959**), retained the source gait, actually gathered a charge and recovered after release. No page errors. This deterministic simulation check disables rendering; it is not FPS or camera/visual evidence. Its raw report is `artifacts/charged-emission/live-movement.json`.

## Inspected recording

`artifacts/charged-emission/verified/charge-motion.webm` and `results.json` contain four 260-frame sequences (1,040 frames total): VEGA palm moving right/return, VEGA combined hands moving left/return, TITAN chest hover, VEGA combined hands hovering at a thin wall. Each sequence has 108 real held-charge frames, release and pose recovery. Front, both side views and rear were inspected. These are **Studio inspection cameras, not gameplay-framing certification**.

- Each unobstructed sequence launched one correctly charged sphere.
- The wall sequence dealt **0** damage to the protected dummy. Its field envelope remained on the near side of the wall; the closest recorded clearance was approximately 0.0000028u.
- Browser errors: **0**.
- The first recording's cover fixture placed the wall below the airborne caster; that fixture failed and was corrected to use the caster's actual altitude before the accepted capture.

The real Studio step drives the recording, but inspection helper captions do not synchronize every ordinary Studio HUD label. The old READY label visible in captures is not evidence of a live sequence-label test. No screenshots or footage are claimed to be imported BFP animation.

## Limits and remaining criticism

- The revised core is less obstructive, but still has a simple polished-sphere appearance. It needs a stronger energy-surface treatment and target-readability review from the game camera before a premium presentation claim.
- Cover fitting uses existing conservative cylinders/expanded boxes, not exact convex mesh collision. Crowded/narrow/custom geometry, deformed terrain, already-embedded emitters and all body proportions are not certified.
- Concurrent powers that compete for the same hands, and independently steering chest/hand channels, remain open. This pass does not add a left-hand charged-projectile authoring mode.
- Generic source-gait/charge overlays remain; these are not bespoke character animations. Body seams, equipment silhouette and some shoulder/neck contacts need more work.
- Dense projectile/contact and repeated charge-fit performance have not been budgeted on target hardware. The broader content-loading warning remains.
- Face-bomb, cone and other non-`charge` preparation state machines were not rewritten. Their movement/source behavior requires separate review.

Game Studio required rendered inspection; the animation-authoring skill required through-time emitter, transition, interruption and alternate-view checks. Its TypeScript-specific rig tools are absent here; the existing JavaScript/Node/Vite equivalents were used. No claim of full skill acceptance or a 10/10 game.
