# Turn-to-fire startup — September 8

Status: retained bounded repair, not full animation, clipping or AAA acceptance. The original objective remains active in [the acceptance ledger](INDEPENDENT_COMBAT_ACCEPTANCE.md).

## Defect and implementation

The preceding cofire pass fixed sustained aiming but still emitted the first rearward chest shot before its torso could turn. The rejected `artifacts/axial-cofire/launch-open-final/` recording measured 81.29 degrees of chest/beam divergence. Expanding the upper-body twist was explicitly rejected.

Actual rigged eye/chest hoses now have a short turn-to-fire preparation when their final animated source cannot face the captured shot. The existing pose system supplies the turn; there is no new source animation clip. Preparation carries no path nodes, visible beam, light output, sustained voice, sustain charge, damage, clash or interception. Entry energy remains spent. The original world target/direction survives later cursor input.

Readiness can be sampled before contacts/transfers, but emission commits only in that beam's normal payment turn. A newer attack can spend the shared pool first; the preparing shot then drains/cancels without creating a packet or voice. The first emitted packet uses the final source and captured target. Already-fired packets remain traveling energy, not redirected hitscan rays.

Release, guard, lost focus, freeze, stun, stagger and KO cancel an unfired preparation. Unfired remote powers cannot detonate; focus cancellation preserves remote shots only after they have actually launched. The gameplay HUD and Studio distinguish `ALIGNING` from `FIRING`. A disposed preparation cannot keep advertising alignment while frozen controls defer slot cleanup.

No movement/camera/map changes, saved-power rewrites, new assets, copied reference code or blanket anatomy-limit expansion are part of this pass. Hand hoses retain their existing launch path.

## Verification

- `npm run test:axial-cofire`: **176/176**. This includes **30** sharp startup cases at 30/60/120 Hz, in strafe/hover/flight/ascent/descent, with chest joining established eyes or both starting together. These inspect actual emitted rays, acquisition within .3 seconds, unchanged simulation position/velocity, the existing neck limit and rendered forearm/fist vertices against the live torso triangles.
- `tools/beam-startup.test.mjs`: **15/15** actual lifecycle/Studio checks, included above. They cover entry/sustain billing, no unfired presentation, captured first packets, remote eligibility, interruptions, shared-budget update ordering and truthful editor phase.
- `tools/beam-startup-browser.mjs`: real HUD reports `ALIGNING` with zero packets, `FIRING` on the first paid emission at frame 5 in its rear-turn fixture, and no active-shot label after freeze cancellation. No page errors.
- Broad Node run: **1,115 tests, 1,111 pass, 4 fail**, no skips. It includes all `tools/*.test.mjs` except the two archived cloth-prototype files and the separately browser-backed `flight-presentation.test.mjs`. The failures remain stock31 platform60 frame127/face144/torso; tall wall120 frame95/face0/cover; short99 platform120 frame84/face80/torso; and virtual-sample corner overconstraint. This is not an all-green suite.
- Actual F/D/mouse flight inputs at 30/60/120 Hz still travel about109.4 units, retain pelvis/travel alignment above .98 and eye/ray alignment above .99999, then release and brake to zero.
- Actual dual-wheel browser checks pass: attack selection without character switching, secondary selection without accidental activation, clean pause/release, compact HUD fit and saved Studio correspondent setting. The existing16.6-second Studio cofire rehearsal still launches and recovers its second power.
- Build passes (258 modules); the existing oversized-chunk warning remains. This JS repository has no TypeScript/Vitest/lint gates; Node tests and the actual Vite build are the applicable tools, not invented substitutes for absent commands.

The independent read-only reviewer found no Critical/Important issue in the bounded lifecycle repair and identified the stale canceled-shot status. That issue was reproduced in Node and the actual HUD, corrected, and reverified. This is not an approval of the entire character anatomy or game.

## Captured and inspected evidence

`npm run inspect:axial-cofire` records three300-frame sequences using actual rig articulation and traveling beams:

| Directory under `artifacts/axial-cofire/` | Max emitted-eye error | Max emitted-chest error | Chest preparation |
|---|---:|---:|---:|
| `turn-to-fire-final/` | 3.457° | 4.149° | 4 frames during the rearward launch |
| `turn-to-fire-sustain/` | .929° | .006° | Already emitting |
| `turn-to-fire-descent/` | .931° | .010° | Already emitting |

Pending directions are plans, not emitted energy; the capture now records pending state and packet count separately. It also asserts no unfired presentation and a timely real launch, so not firing indefinitely cannot improve its error scores.

Each directory has seven phase screenshots, `results.json` and `axial-cofire.webm`. Startup, reversal and release images were directly inspected, along with a sampled full-recording overview in `turn-to-fire-final/motion-overview.png`. These are fixed-velocity Studio articulation inspections, not integrated physics, gameplay-camera or FPS certification. The recordings include editor setup and screenshot-capture transitions. `artifacts/beam-startup/results.json` contains the separate actual HUD result.

## Still visibly and technically open

The new startup is not perfectly coaxial on every transition frame; the measured maximum is about4.15 degrees under the current acceptance tolerance. The cape still reads stiff in these flying poses, the procedural shoulders/body need further art direction, and the broad beam sheath can dominate the silhouette. Do not call these captures beautiful or10/10 because their alignment checks pass.

Full torso/pelvis anatomical limits, custom proportions/equipment, jumping/landing transitions, remaining cloth contacts, competing same-arm powers, other preparation origins, live dense-combat GPU/CPU budgets, complete correspondent quality and creator feel acceptance remain required. Existing foot-slide and movement-state coverage is not a complete cross-product proof. The source/footage/license distinctions in earlier reference reports remain unchanged; this pass did not import or newly inspect external source assets.
