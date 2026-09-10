# Cloth compatibility — retained repair and rejected experiment

The full superhero-combat objective remains active. This is a bounded cloth
contact pass, **not** completed character art, ragdoll motion, BFP feel, editor
acceptance or a 10/10 rating. Maps, gameplay camera, movement, powers, profiles and
the authoritative ragdoll skeleton were not redesigned in this pass.

## Retained runtime changes

`src/engine/ragdoll-cape.js` now preserves compatible contact planes during each
contact solve, with absolute offsets rather than ratcheting the planes forward.
The offsets reset before structural relaxation advances the cloth. Contact
velocity respects the active plane set, retaining free tangential motion.
Zero-weight/unmoved corners do not acquire fictitious contacts. Embedded contact
and union exits consider feasible alternate directions rather than only the
nearest blocked face.

Virtual surface correction can redistribute movement onto available corners.
Body-correction candidates also check swept vertices and incident triangles
against finite cover. The initial 25 tests—including the previous five failures—
now pass. That result is **not sufficient**: the independent combined matrix and
a new mathematical counterexample expose four remaining failures below.

The runtime exactly matches the reviewed frozen snapshot in
`artifacts/cloth-landing/compatible-baseline-source.txt`, ignoring line endings.
Frozen SHA-256: `9b8ddbdde2e6493bb53e1f0f2b22baddc87be5e655f99e522762dee552673985`.
Restored-file SHA-256: `97463c1aac400ea88ae6eed5e74fd830572d42375ae662fb3e36430d95ae7ef3`.
No whole-worktree reset or unrelated revert was used.

## Four retained failures — not hidden in optional diagnostics

`npm run test:ragdoll-cloth` runs 51 checks: **47 pass, 4 fail**, exit1,21.47s.
The 18 combined fixtures test actual rendered head/torso/pelvis samples and cover
in the same frame, across 30/60/120 Hz, stock/tall/short proportions and seeded
falls. Pinned-incident triangles are included; no tolerance was weakened.

- Stock seed31, platform,60Hz: face144 intersects torso at frame127. Independent
  review measured a substantive .465u depth. The finite-cover guard can reject
  the last available body escape after earlier contacts have trapped the cloth.
- Tall fixed launch, thin wall,120Hz: face0 crosses cover at frame95. The pins
  stay outside; the free corner bridges their seam across the wall. Review found
  .105u penetration. Cover cleanup still bypasses some incident-face safeguards.
- Short/broad seed99, platform,120Hz: face80 intersects torso at frame84. This
  rate-specific failure also existed before the finite-cover guard.
- A weighted surface contact is still represented too strongly by independent
  corner planes. Moving other corners outward ought to create clearance for a
  corner to move back. The runtime currently rejects that legitimate movement.

The two new runtime test files are included in the named cloth command. Existing
contact, wake, adversarial and original tests remain enabled.

Final broad75-file regression: **901 tests,897 pass,4 fail**, exit1,32.79s. These
are exactly the four listed cloth cases. `npm run build` passes with257 modules,
8.26s; the existing large-bundle warning remains (Studio-profile4,946.99kB /
1,758.84kB gzip). Prototype-only checks separately pass15/15 after archival.
Those isolated prototype tests are not counted as runtime regression coverage.

## Correct math did not produce an acceptable integration

A second experiment retained the actual weighted constraint
`normal · sum(weight * corner) >= offset` and solved all nine corner coordinates
together. It also corrected two independently reproduced integration errors:
cover proposals being partially applied after another corner rejected them, and
late vertex collisions restoring inward velocity at a virtual contact.

Those narrow fixes passed 15 isolated checks and independent hand-derived math
review. However, the full integration failed **12/58** checks and was much too
expensive. It was therefore withdrawn from the runtime and preserved only in
`tools/prototypes/`. `npm run test:cloth-prototype` verifies its isolated cases;
it is not a production acceptance command. No game/Studio import references it.
Do not re-enable it merely because its unit tests are green.

The next design must preserve coupled surface constraints and finite-obstacle
topology without repeatedly solving costly, infeasible local contact sets.
Predictive/structural movement, moving attachments, cover cleanup and body
corrections must obey one consistent shared-surface contract. Self-contact and
the visibly collapsed folds remain separate, unresolved presentation problems.

## Actual Studio evidence

Both `artifacts/cloth-landing/compatible-wip/` (retained runtime) and
`artifacts/cloth-landing/coupled-contact-wip/` (rejected experiment) contain 481
states over16 simulated seconds, seven phase screenshots and a recorded WebM.
Errors are empty. The main agent inspected fall, contact and terminal close-ups
for both. This is the actual procedural SOL flight-to-ragdoll path, not a new
imported clip or a beauty pose.

For this one matched trajectory, the retained runtime first sleeps at6.667s
(599 uploads), versus6.967s/617 in the preceding contact pass. The rejected
experiment sleeps at9.433s/765. All use the same final skeleton chest position.
These are single-trajectory measurements, not universal settling claims.

The cape still flips over the head, forms sharp folds, and shows dark self-overlap
on landing. The body remains conspicuously propped/spread in the close-up. Neither
capture is accepted visually. They are silent, stepped inspection-camera clips,
not real-time gameplay FPS, audio/impact quality or BFP-camera evidence.

## CPU gate

Reports: `artifacts/cloth-landing/compatible-contact-cpu.json` and
`artifacts/cloth-landing/coupled-contact-cpu.json`. Node25.8.0, i9-14900KF,
production cloth-update CPU only; excludes renderer/GPU/full skeleton/combat.

| Case | Retained mean / p95 | Rejected mean / p95 |
|---|---|---|
| Fixed launch,30Hz | 3.378 /9.819ms | 13.071 /70.700ms |
| Fixed launch,60Hz | 2.515 /4.716ms | 3.889 /8.053ms |
| Seed31,60Hz | 2.096 /3.380ms | 2.953 /4.782ms |

All six retained seed/rate cases sleep within16s. The rejected fixed120Hz and
seed31/30Hz cases do not. The prototype's worst observed fixed30Hz update was
291.60ms. The retained implementation is cheaper than that prototype, **not**
certified cheap: it costs more than the preceding contact pass in several cases,
and multiple active capes still need a documented full-game budget.

## Research and skill influence

[Position Based Dynamics](https://matthias-research.github.io/pages/publications/posBasedDyn.pdf)
and [NVIDIA's cloth guide](https://nvidiagameworks.github.io/PhysX/3.3/PhysXGuide/Manual/Cloth.html)
informed the distinction between retained contact constraints, weighted virtual
samples, positional correction and velocity response. No external physics source
or new dependency was imported.

Game Studio's motion/phase capture, systematic debugging and the animation skill's
acceptance matrix required both collision evidence and visible motion review.
The performance/verification gate rejected the superficially promising coupled
experiment. The actual runtime remains JavaScript/Vite/Studio; absent TypeScript
and PoseLab paths were not treated as available tooling.
