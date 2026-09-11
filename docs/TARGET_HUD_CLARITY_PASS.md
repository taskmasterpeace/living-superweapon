# Target and HUD clarity

September 6, 2026. A presentation correction, not a declaration of BFP-quality gameplay.

## Changes

- PowerWorld uses one aim marker. The redundant world-space crosshair above the foe is
  suppressed; the existing DOM aim point becomes compact corner brackets when locked.
  Free aim retains its ticks. Lock is distinguishable by shape, not only color, and the
  center remains open. The original city marker remains available in city mode.
- Crosshair, foe health and off-screen bearing share the same visibility gate. A zero
  `_vis` is hidden rather than falling back to one. Losing sight hides target chrome;
  reacquisition restores it without changing the combat lock or aim calculation.
- Desktop PowerWorld player meters and kit chips participate in one flow layout.
  Extra chips, long names and wound rows no longer rely on a guessed panel height.
  Tier growth remains 44px per tier where space permits; narrow screens cap the width
  to leave room for the fighter. City and phone/tablet keep their incumbent positioning.

## Evidence

`tools/hud-clarity-check.mjs` is included in `npm run test:camera`.
The original nine cases failed on competing aim cues, missing shape distinction,
hidden-target UI and overlapping panels. The expanded test covers 18 combinations:
SOL/Stefanos/Sandra, tier I/MAX, 800x600/1280x720/1920x1080, real runtime status chips.
It checks the actual DOM and projected head/torso/fist/boot bounds, not only CSS rules.
Off-screen visibility and return to city ownership are also checked.

Visual review caught an initial narrow-screen failure that panel-to-panel tests missed:
the status panel obscured the player. A new rendered-body assertion failed all six
800px cases, and passed after reserving a larger central corridor. Final 18 cases pass
with one aim cue, no tested body/panel overlap and no target UI at zero visibility.

Final verification: `npm run test:camera`, `npm run test:combat` and `npm run build`
all exited successfully. Combat checked 371 ability slots across 53 heroes and a
30-second eight-fighter soak (451 hits, five KOs), with no invalid states or runtime errors.

Read-only review confirmed visibility loss/reacquisition and mode ownership. Minor
remaining issue: tier widening changes immediately in the new dock; the old min-width
transition does not animate the parent's width. This is not claimed fixed.

The Impeccable refinement skill guided consolidation instead of removing kit information.
Its mechanical detector reported eight pre-existing stylesheet warnings/advisories
(bounce easing, width/height transitions and a decorative grid); none is introduced by
these new dock/bracket rules. No claim of a clean whole-stylesheet audit is made.

Motion evidence: `artifacts/flight-review/vertical-combat/vertical-combat-clear-hud.mp4`
is an eight-second silent recording of actual game input, beam damage and camera with
a scripted opponent. The three stages deal 129, 131.5 and 128 damage. Earlier videos
remain intact. Map design, character data and movement tuning were not changed here.

Still outstanding: overall model/art quality, broader animation polish, and opponent-
aware combat authoring in Studio. These changes do not establish a 10/10 game.
