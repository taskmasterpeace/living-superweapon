# Combat-effects readability — 2026-09-05

Follow-up to the rejected combat camera and the charge-sequence pass. Map design is excluded.

## Causes and correction

Geometric camera checks missed effects layered over the opponent. PowerWorld beam tubes,
tip spheres and contact particles could obscure a correctly framed fighter. Contact particles
were emitted every simulation step, and the intended reduced tip opacity was overwritten
later in the same update. Sustained damage also reset the target's full HDR hit flash every step.

- Beam core, sheath, tip and stream details now reduce opacity smoothly when viewed along
  the firing axis. Each draw starts from the simulation's base opacity; repeated renders do
  not accumulate fading. Side-on beams keep their base strength. Core tint is more saturated.
- PowerWorld contact/muzzle/tip particles are smaller, with emissions capped at 24 batches/sec.
  Below 24 updates/sec this deliberately becomes one batch per update, not catch-up bursts.
- The reduced tip opacity is assigned at its final update site.
- PowerWorld continuous damage uses a low contact glow. Discrete impact flashes remain full
  strength, including a discrete hit during a beam. City damage feedback is unchanged.
- Beam charging uses a reusable 20-streak inward field, one draw call with fixed buffers.
  It follows the actual hand-centered orb and existing charge scale. Its owned geometry and
  material are disposed on release, KO and despawn. Other charge ability effects are untouched.

These visual changes do not change damage, hit radii, traveling beam tips, curved hose paths,
energy costs, power scaling or clash strength. The charge field is shared with city beam
charging; the beam transparency, contact-particle and hit-glow changes are PowerWorld-only.

## Gameplay bug exposed by the visibility check

Switching the target from invulnerable to damageable exposed zero damage at 90 units, despite
an authored 150-unit range. The stream inserted a sample every update into a fixed 44-node
buffer. At 30/60/120/240 Hz the same beam reached approximately 148/86/43/21.5 units. High
update rates discarded the oldest energy before it reached the target.

Stream samples now use a time cadence derived from authored range, tip speed and buffer
capacity. Node 0 stays at the hand; older packets keep their birth direction. Within-step
birth positions/directions are interpolated and advanced by age. The initial two-node stub
is seeded at the muzzle instead of reading an uninitialized second node at the world origin.
Release-tail removal uses the same cadence. This shared correction restores authored reach
across update rates; it is not a new damage/range balance value or an instant-ray conversion.

Review then caught collision truncation dropping the contact node. The fixed cadence made
that retreat visible as intermittent wall contact and frame-rate-dependent cover damage.
Cover now retains an endpoint clipped to the expanded collider's entry surface; interior
walls retain their sampled contact endpoint. Revalidation still happens every update, and
packet velocity is retained so the beam resumes after the obstacle is removed.

The actual-game regression now measures ~147.07 units at every tested rate for a 150-unit
beam (range trimming discards the final over-range sample). Two-second cover damage is
287.47/287.47/287.47/286.73 at 30/60/120/240 Hz, within a single damage step, with zero contact
gaps. Interior contact, no damage through either wall, and reach after cover removal pass.
Independent review reproduced the contact correction and checked symmetric clashes at all
four rates: clash balance stayed at .5 with equal energy use. A pre-existing discretization
limit remains: clash trimming retains the first packet beyond the mathematical clash point,
so the visible tip can overshoot it by about one sample (~3.65 units for this beam).

## Surface correction — September 6

The next contrast pass found the tube index winding was reversed: all 656 tested live
triangles faced inward. Double-sided rendering had hidden this. With the single-sided
combat material, the camera saw the far interior rather than the near exterior.
The winding is now outward. A real front-side raycast also verifies the near surface.

Correct geometry alone did not solve contrast. The pale shaft still merged into the sky.
PowerWorld cores now use the existing mesh with an analytic radial-normal gradient:
darker ability-colored edges, a narrow luminous center, and restrained outward-traveling
bands driven by path arc length and simulation time. Fog, depth, clipping, material opacity,
the HDR compositor, and the traveling hose remain intact. No new meshes, lights or particle
clouds were added. The normals/arc attributes are owned and disposed with the beam geometry.
City beams retain their existing materials; the winding correction is shared.

Two stronger-band alternatives were rejected by rendered contrast checks and visual review:
they either blended back into the bright sky or looked like stripes on a plastic pipe.
The retained treatment keeps the brighter center and much subtler rear-facing bands.
This is an incremental surface improvement, not final effects art direction.

The added checks render the production shader, collect Three.js shader console errors,
test finite unit normals/monotonic arc coordinates on straight, vertical and curved paths,
and measure rear/side shaft contrast with the opponent hidden. The target has its own separate
visibility test; its silhouette must not artificially make the shaft-contrast test pass.
The contrast test samples a full pulse cycle and checks that the rendered bands actually move.
These localized pixel heuristics do not replace viewing the full fight.

Final local run: shaft mean RGB differences were 54.78 rear / 86.07 side. At least
100% / 80.6% of the sampled shaft patch stayed above the existing contrast threshold
through the four pulse phases. Target contribution ratios at 25/50/90 units were
.886/.836/.829, with real damage and stable side-on opacity. These are pixel-test
measurements, not visual-quality scores or percentages of the opponent visible.

Fresh verification passed: the full effects suite, charge/release sequence, 11 camera
compositions plus the 53-rig/720-step tracking checks, 371 ability checks, 42 world checks,
a 30-second eight-fighter soak, and the 197-module production build. The final shader was
also captured in the four-second charge reel. One earlier run was interrupted by Vite
hot reload during an edit; the final effects run completed cleanly with source held fixed.

Independent review found no shader/cache/lifetime defect and independently checked axis,
diagonal and curved geometry. It identified missing shader-error and attribute coverage in
the tests; both were added. Different beam palettes share the shader program but retain
independent color/time uniforms. Multi-attacker visual readability is not yet accepted.

## Checks and review

`npm run test:effects` exercises:

- Real ability charging at 30/120 Hz, inward directions, identical absolute-time positions,
  release and KO disposal before fallback cleanup, and harmless repeated cleanup.
- Real damage feedback: HP loss, no sustained hitstop, bounded contact glow, preserved
  discrete hit response and unchanged city response. Observed RED at hitFlash=1, GREEN=.22.
- Real stream reach and damage at 30/60/120/240 Hz, non-instant launch, and a turn that leaves
  the already-emitted far end traveling along its original heading.
- Continuous cover/interior contact, comparable cover damage across rates, no damage to the
  fighter behind either wall, and resumed travel after cover removal.
- Actual HDR-rendered target contribution at 25/50/90 units through a fully charged beam,
  including real sustained damage. Four compositor screenshots isolate the target's pixel
  contribution, with and without the beam tube. Require at least 30 baseline pixels and
  contrast retention >=.3. This is a contrast heuristic, not a literal percent-visible score.
- Side-on opacity and repeated-render stability. The initial side fixture was angled toward
  the middle of the beam, not perpendicular from its muzzle; that fixture was corrected.

Generated evidence: `artifacts/flight-review/beam-visibility/` and
`artifacts/flight-review/charge-sequence/`. The charge reel is a scripted, stationary partner
sequence, not live multiplayer or performance evidence. Its partner's unintegrated knockback
velocity is cleared so the pose does not imply travel that the fixture never simulates.

Independent review of the visual changes found no blocking implementation defect. It caught cleanup assertions
that could mask a release/KO leak by invoking fallback cleanup first; those assertions now
run before fallback cleanup. The reviewer also identified the low-frame-rate emission cap
and the single-beam-family coverage limit, both documented here.

## Not accepted as complete

Passing visibility tests is not BFP-feel acceptance. The rear beam now has a tested contrast
treatment, but its power must read through motion and contact without hiding the
opponent. The pixel checks cover KANO's charged beam, not every color/beam family, clash,
multi-attacker stack or target elevation. The models still have clenched hands and a
procedural silhouette. Broader fight choreography, hit reactions and live tracking need
continued visual review. The September 6 camera/HUD correction gives the free-hover body
bottom roughly 92% of viewport height and docks readouts away from the player; a separate
safe-area regression now catches that previously missed player-presentation defect. Studio now includes
an anchored beam/opponent fixture (see `STUDIO_COMBAT_PREVIEW_PASS.md`), not complete fight simulation.
The subsequent `BEAM_ENVELOPE_CORRECTION.md` addresses the open-shell artifacts that fixture exposed.
No 10/10 or complete-game claim is justified.

The low contact glow is verified for local fighters. Remote-authoritative damage and network
HP snapshots have separate full-flash paths; network feedback remains a known follow-up, not
covered by the local test or silently claimed fixed. No network protocol/authority change
was made in this pass.
