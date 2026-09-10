# Airborne cast force and recovery

## Defect and direction

The production charge/release sequence aimed the hands correctly but left the body in a
nearly fixed stance while the beam sustained. A real-slot regression measured only
0.00004–0.00006 radians of torso change during the hold, with effectively zero knee
motion. This produced a parked figure behind an animated effect.

The shared `combat-pose.js` body channel now reacts to a newly emitted beam with one
release kick and settles into a slower torso/leg brace. Power scales the response within
a bounded range; eye and chest emitters receive less recoil than a hand emission. No
hero-ID branches or new animation assets are needed. This is procedural authoring, not
an imported/recovered Bid For Power clip.

The BFP reference pack supplies composition and airborne-silhouette evidence, not
recovered joint trajectories. The reference rear airborne frame at 2:44 was inspected;
it cannot prove BFP's recoil timing. Timing here is authored for the current production rig.

## Ownership

- Each `BeamHose` owns its emission age; a continuous beam does not repeatedly re-arm it.
- Bounded force aggregation reads every live beam independently of the existing gather/aim
  owner. Ending one beam cannot replay another's onset, and pose interruption cannot pause
  the emission clock. Earlier charging slots do not suppress secondary-beam force.
- The visual body pivots about the existing hip anchor; entity position and velocity are unchanged.
- Body response runs before the final hand/eye emitter solve and attached-gear grip.
- Guard, stagger, stun, freeze and grab keep their existing higher priority.
- Only open-sky presentation gets the new response. No city or map redesign.
- Studio uses the same rig and recreates its state for deterministic seeking.

## Evidence

`tools/cast-bracing-check.mjs` exercises actual slots, Fighter updates, projectiles and
final hand sockets at 30/60/120 Hz. The old code failed release and sustained-motion
assertions at all three rates. The candidate release range is 0.22–0.23 radians; sustained
torso range is about 0.115 radians and knee range about 0.102. Root drift is zero, hip
drift is numerical noise (~3e-14 units), palm alignment exceeds 0.99999, recovery returns
to the original body orientation, and stagger clears attack ownership.

An independent review caught two defects in the first candidate's pose-owned clock:
overlapping slots could replay an old beam's kick, and a blocked pose could delay one.
`tools/cast-overlap-check.mjs` reproduced all four cases (secondary onset under charging
or emitting primary, primary-end switch, early interruption). The per-emission fix passes
all four: secondary onset changes torso pitch by about 0.175 radians, without a false
backward kick on ownership switch or interruption recovery. Review then reported no
remaining scoped findings.

`artifacts/flight-review/cast-bracing/final-profile.mp4` contains four seconds at 30 fps,
1280×720 in side profile: hover, gather, early release, sustain and recovery. The capture uses real
production input/slots with a stationary scripted partner. Supplemental front, rear and
both-profile stills include start, charge, release, hold and exit. Side release/hold and
front/rear/recovery frames were visually inspected, including frames 0/30/60/90/119
and the release peak at 48 in the final profile sequence. The chest kick reads in profile;
hands stay on the emission line and the stance returns to hover.

`artifacts/flight-review/cast-bracing/moving-armed.mp4` exercises the current code with a
rifle attached, real strafe key events, and a scripted passing opponent. The player travels
69.2 units and deals 166.2 damage; 120 frames at 20 fps capture the six-second encounter
without page errors. It is a scripted review encounter, not autonomous AI play.

The animation-authoring workflow influenced this pass by requiring complete transition
and socket evidence rather than accepting a single posed still. Its TypeScript rig,
ingest and client paths do not exist here; this repository uses JavaScript and its npm
regression suites instead. No tsc/Vitest/lint or imported-clip approval is claimed.

## Final verification

- `npm run test:poses` passes: beam elevation/recovery, bracing, overlap, interruption,
  hands, and 27 moving cast-tracking combinations (including attached rifle).
- `npm run test:camera` passes, including 318 free-aim samples and the full comic
  projection/clearance suite (24 static cases, 120 moving frames, both exit rotations).
- `npm run test:flight` passes on final code, including all 53 roster rigs through
  flight/KO/recovery, motion tuning, cape behavior, and wake lifecycle.
- Studio combat passes nine real beam/elevation/seek/recovery cases; Studio encounter
  checks pass four moving paths, deterministic seeking/playback, validation and three layouts.
- `npm run build` passes (204 modules). Scoped diff whitespace check passes.
- Both final captures complete without page errors. Independent scoped code review is clear.

## Quality limit

This corrects one visible rigid-body behavior. It does not establish AAA/BFP-equivalent
combat feel or finished editor tooling. The procedural figure still has conspicuous
segmented anatomy and limited torso deformation; those remain visual gaps. Do not use
green regression checks as a subjective quality score.
