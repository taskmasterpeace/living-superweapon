# Combat visibility correction — 2026-09-05

Scope: the rejected PowerWorld combat view, not map design. Previous flight/still-frame checks did
not establish that a player could see an opponent while firing.

Follow-up: `VERTICAL_COMBAT_CAMERA_PASS.md` covers the later steep-lock, moving-pair, release and
beam-contact corrections. The original checks below did not cover those failures.

## Reproduced failures

- Centered free camera placed SOL's head at 48% of screen height, across the reticle. A ray from
  camera to the opponent hit the player's opaque body first.
- Locked long-range framing backed away to fit empty space; a 110-unit opponent was only about
  28 pixels head-to-foot at 720p. Vertical compression put a foe below the player at 71% screen height.
- Releasing a lock changed the view by roughly 11 degrees in the moving-target reproduction.
- The actual firing recording revealed an additional failure: double-sided additive beam tubes
  and white detail spheres washed out an otherwise correctly framed target.

## Changes

Free camera: raised view-up offset 10.5, range 34, vertical FOV 58.72. Mouse owns rotation; only the
follow anchor is sprung. Saved custom values remain authoritative. Studio has an explicit,
undoable camera-only preset to adopt the new defaults without erasing other edits.

PowerWorld lock-on: uses the same authored range/FOV and full 3D target direction. Minimum view-up
clearance 14, with lateral separation increasing smoothly at close range. Camera collision still
traces from the validated player anchor. The actual target center is the look point. On release,
free aim inherits the visible heading and position eases to the free boom instead of snapping.
T now always releases an active lock, even with several opponents in view; camera-driven re-sorting
could previously keep cycling targets forever. Shooting never acquires a lock under an open sky.
At directly vertical targets the fighter may sit above the opponent; the stable world horizon and
visible target take priority over forcing an identical composition at every angle.

September 6 safe-area follow-up: the original 28-unit boom left the boots at the bottom HUD.
Lowering the camera hid the same-height opponent behind the player's head, so the lift stays
10.5 and the boom increases to 34. Automatic close-range shoulder separation scales by
`(range + gap) / (28 + gap)` to preserve the original player-plane clearance, including large
forearm shields. Authored shoulder offsets remain additive; saved camera profiles are not overwritten.

Contact-scale follow-up: the automatic sideways opening now orbits at constant horizontal
boom length instead of adding distance. In the 6-unit level-target fixture the player's
head-to-foot screen height increases from ~16.6% to ~20.5%, while the target stays visible.
Free/far framing is unchanged. See `MELEE_CONTACT_PASS.md` for evidence and remaining gaps.

Desktop PowerWorld powers, charge and carried-weapon readouts now flow in a lower-right dock,
leaving the player's bottom-center silhouette clear. Expanded controls help shrinks and scrolls
above the readouts. F1 explicitly reveals and focuses the reference even when onboarding is
disabled, and releases pointer capture for scrolling without changing the saved hints preference.
City/touch selectors retain their previous positioning. The charge fill now
has an actual rendered height. This is not a full HUD redesign.

PowerWorld beams: colored, single-sided alpha layers replace the overlapping additive white stack;
small-beam details scale with beam radius. Streaming packets, travel speed, bend/steer, damage radius,
energy costs and clash simulation are unchanged. This is not a hitscan conversion.

## Repeatable evidence

Run with Vite at port 5180:

```sh
npm run test:camera
npm run test:flight
npm run test:studio
npm run test:combat
npm run build
node tools/combat-camera-live.mjs --reel
```

`test:camera` checks 11 rendered compositions, self-occlusion across all 53 shipped rigs at four
locked distances, real pointer-lock input, free-aim beam damage without auto-lock, 720 moving-target
steps, and lock release. It also checks body/HUD separation, power-label bounds and charge fill
for three heroes at five desktop sizes, plus expanded help with scavenged-weapon readouts.
Tests measure framing/geometry and input contracts, not subjective fun.

Evidence is under `artifacts/flight-review/combat-camera/`: before/after stills, JSON measurements,
firing frames and a 24fps deterministic simulation recording. It is a scripted sparring partner
driven through production movement/attacks, not evidence of real-time foreground performance or AI quality.

Reference comparison: [BFP sources and supplied footage stills](reference/BFP_CAMERA_AND_POSE_SOURCES.md).
The online code is a community reconstruction, not recovered original BFP source. This correction
uses its raised rear-view relationship, not raw Quake-unit constants or a claim of exact replication.

Follow-up: [rendered combat-effects readability](BEAM_READABILITY_PASS.md) addresses the beam
and continuous hit glare that geometric framing tests did not catch.
