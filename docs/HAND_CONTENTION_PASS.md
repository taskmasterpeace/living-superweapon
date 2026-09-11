# Hand-contention repair — September 8, 2026

This continues the complete independent-movement/combat goal. It does not close
the character-art, cloth, full anatomical matrix, disjoint-hand articulation or
creator feel gates. Maps, gameplay camera and saved attack definitions are unchanged.

## Reproduced failure

Starting a two-hand beam and a palm beam created two paid native emitters, but
`rangedPoseChannels` gave their shared hands to whichever slot appeared first in
the fighter definition. The earlier two-hand attack could remain in preparation
indefinitely. A held attack could also launch projectiles through an occupied hand.

## Retained behavior

- The first accepted hand attack keeps its required hand(s) during preparation,
  sustain and its existing short release pose. The native `runSlot` gate checks
  the semantic hand claim before payment, cooldown or effects.
- A denied trigger is not queued. Held automatic fire needs a fresh press or
  real release before retrying, including across combat-suppressed input frames.
- HUD and Studio distinguish **HANDS OCCUPIED** from **RELEASE TO RETRY**.
- A combined press/release cannot sneak a new shot through the gate. Its release
  cleanup still runs. Remote control remains ahead of contention: detonating
  already-paid energy does not require free hands.
- Actual emission, not a change in ki/cooldown, stamps projectile/volley/rifle/
  charge pose ownership. Authorable free zero-recovery projectiles now participate.
- Canceling an unlaunched charge clears its stale recent-pose claim. Released
  beam tails no longer own their former hand. Eye/chest origins are independent.

Masks use existing authored anatomy: combined casts/alternating/paired volleys
need both hands; single volleys and equipped firearms use their actual side;
existing single-hand beam/charge/projectile delivery uses the right hand. Nothing
silently swaps weapons, hands or firing style. A free left-hand volley is still
admitted beside a right-palm beam, but its independent pose is **not certified**
by this repair: the older shared hand-presentation channel remains an open gap.

## Verification

- Contention: **22/22 pass**. Initial overlap/payment cases, automatic retry,
  free projectile ownership, combined taps and suppressed-input regressions were
  each observed failing before their respective fixes.
- Contention + focus-release + charge-energy: **36/36 pass** on retained code.
- All-root Node suite: **1,384 tests, 1,380 pass, four fail**;
  `artifacts/hand-contention/retained-root.log`, 155.436 seconds under parallel
  verification load. The four failures are the retained three cloth body/cover
  trajectories and virtual-sample contact overconstraint, not hand contention.
- Build: **260 modules, exit 0, 47.21 seconds**, existing large-chunk warning.
- Real browser mouse input: KANO Wave Cannon denies simultaneous Ki Blast,
  displays occupied hands, then release-to-retry, and accepts a fresh trigger.
  Stock VEGA Studio co-fire also denies its overlapping second hand beam without
  changing saved attack definitions. No page errors in those checks.
- Gameplay lock browser recheck: off-crosshair rejection, centered acquisition,
  explicit release and phase break pass; crosshair stays visible. Studio piercing
  toggle remains native and undoable. This follows the creator's clarification
  that aiming difficulty meant gameplay lock-on, not Studio target tracking.
- Independent review found three additional input/payment problems plus a
  suppressed-input loophole. All are repaired and regression-tested; final review
  permits retaining this repair, not whole-game acceptance.

The repository is JS/Node/Vite; the animation skill's named `src/client` TypeScript
contracts, tsconfig, Vitest and lint setup are absent. Existing production rig and
Node regressions were used; no TypeScript/Vitest/lint pass is claimed.

## Inspection

`npm run inspect:hand-contention` runs real-input HUD checks and actual Studio
controls, then records stock VEGA native beam contact with scripted lateral
Studio travel. This is a procedural flight/combat overlay, not an imported flight
take, live AI match, gameplay-camera recording or performance benchmark. No new
assets were imported.

Final recording: `artifacts/hand-contention/hand-ownership.mp4` — 6 seconds,
1440×1000, 120 encoded frames at 20 fps from 360 native simulation steps at 60 Hz.
Measured target damage is 433.333 hp; the conflicting secondary never emits.
Start, quarter, midpoint, three-quarter and end screenshots were directly
inspected. This is sampled sequence evidence, not a continuous-playback or FPS
certification. HUD and Studio evidence is in `artifacts/hand-contention/browser.json`.

The visual checks still show conspicuous round particles, simple figure surfaces
and a stiff target cape. Those are art/feel limitations, not evidence for a 10/10
claim. The entire original objective remains active.
