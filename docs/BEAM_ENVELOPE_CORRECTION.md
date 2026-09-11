# Beam envelope correction — September 6, 2026

The opponent-aware Studio sequence exposed a defect not caught by the earlier geometry gates:
the charged sheath looked like torn triangular sheets from the rear camera. This pass changes
shared PowerWorld/Studio beam presentation, not maps, hero kits or gameplay collision.

## Evidence and cause

Layer-isolated renders in `artifacts/flight-review/beam-geometry/` identify the outer sheath.
The live path is nearly straight, ring radii/normals are finite and consistent, and every ring
is safely beyond the camera near plane. It is not a corrupt vertex or near-plane explosion.
The camera sees through an open tube mouth; front-face-only rendering culls the far interior,
leaving disconnected-looking portions of the outer surface. A diagnostic double-sided render
fills the missing region, but its uniform alpha makes a broad flat panel instead.

The visual emission ring was also 84.4% of the downstream body's radius: KANO's charged sheath
started with a 5.84-unit radius at the hands. That is a collar around the character, not energy
emerging from a hand-sized source.

## Correction

- Combat tubes gather into a narrow nozzle using distance along the actual path, then reach
  their existing charge-scaled width downstream. The KANO fixture's root becomes 0.70 units;
  its downstream 6.92-unit radius is unchanged. City presentation keeps its existing shape.
- The outer sheath renders both sides in one pass, with normal/view-based radial alpha
  falloff and a short fade-in at the emitter. No new geometry, textures, particles or lights.
- Softer transparency initially reduced side-on contrast against the bright sky. Globally
  doubling core heat restored that view but failed rear-view contrast during a pulse, so
  that candidate was rejected. The retained change concentrates extra radiance in the
  narrow center highlight; the rear-facing bands retain their previous heat level.
- Traveling packets, their historical directions, charge/damage/range/ki/clash values and
  hit volumes are unchanged. A visual nozzle is not a smaller collision volume.

## Gates

`beam-emitter-check.mjs`: four real charged-ability elevation fixtures; the collar regression
failed in all eight mesh samples before correction and passes after it. Measured contact is
407.0733 in each fixture before and after. These are deterministic anchored fixtures, not DPS.

`beam-sheath-check.mjs`: actual GPU render of the production sheath. Initially center and rim
had identical RGB sums (48/48). Corrected center/rim are 40/7.33. A separate inside-shell view
detects missing back faces; `--front-only` deliberately restores the culling bug and fails.
The normal test also requires one draw call and no shader errors.

The existing rear/side contrast gate passes with minimum readable patch fractions 1/1 over
four pulse phases. These are localized pixel heuristics, not visual-quality scores. Full-contact
checks at close vertical/level angles and charged midrange preserve target contribution ratios
0.849–0.967 across the verification runs, with no stacked body flashes and at most 0.021
near-white pixel fraction.

Both new tests are included in `npm run test:effects`. BFP-quality feel, final character art
and multi-attacker effects readability are not established by this pass.

Independent read-only review found no Critical/Important defect in this scoped correction.
It noted that the emitter test records damage rather than asserting it; real contact assertions
also run in the Studio combat suite and gameplay beam regressions. Final Studio combat checks
passed nine elevation/seek fixtures plus all 25 beam slots, with no page errors; build passed.
The final complete `npm run test:effects` also exited 0: charge gathering, sustained feedback,
30/60/120/240Hz traveling stream and wall contact, outward surfaces, new emitter/sheath gates,
rear/side contrast, target visibility at 25/50/90u and close vertical contact all passed.

Motion evidence: `artifacts/flight-review/beam-emitter/beam-envelope.mp4`, 1440×960, 20fps,
161 frames, 8.05 seconds, silent. Entry/25%/50%/75%/end frames were inspected. It is the same
anchored KANO sequence used before the correction, with actual damage/energy/beam timing
unchanged. The character art, faceted core/tip and simplified contact effects remain visible
limitations; this is not a live multiplayer performance demonstration.
