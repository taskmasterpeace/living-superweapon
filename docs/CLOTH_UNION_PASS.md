# Cloth body-union experiment — rejected and withdrawn

September 8, 2026. **No production change from this attempt is retained.**
The complete superhero-combat goal remains active; this is not cloth, art,
BFP-feel, performance or editor acceptance.

## Current runtime

`src/engine/ragdoll-cape.js` was restored byte-for-byte to this pass's starting
snapshot, `artifacts/cloth-union/runtime-before.txt`:

`109bcbaf3eea04483e5d7f3101fb5ed10199030e905ffe96f6bf67376d226735`.

The previous real-substep static-cover sweep repair remains intact. No camera,
beam travel, damage, character profile, map or authoritative body change remains
from this attempt. The native cloth test command is restored to its earlier
scope. The five new candidate tests are explicitly isolated prototype coverage,
not imported game/Studio behavior.

Fresh verification AFTER restoration:

- Native cloth: **61 tests, 58 pass, 3 fail**, exit 1, 43.22 seconds.
  `artifacts/cloth-local/union-restored-tests.log`.
- Broad root: **1,649 tests, 1,646 pass, 3 fail**, exit 1, 76.68 seconds.
  `artifacts/cloth-local/union-restored-root.log`. This includes isolated
  prototype tests; it is not entirely production-runtime coverage.
- Build: **passes**, 7.07 seconds; existing large-chunk warning remains.
- Archived union prototype: **5/5 tests pass**. These do not constitute acceptance.

The three native failures remain visible: short/broad seed99 at platform120
enters the torso at frame84/face80; virtual samples retain fictitious per-corner
walls; balancing corner velocities can be erased at a stationary weighted sample.

This JavaScript repository lacks the animation skill's named TypeScript rig
files and TS/Vitest/lint gates. Native Node checks and the real Vite build were
used; the absent gates are not claimed as passing.

## What the attempt established

The short-character failure is a contact cycle. A cape triangle midpoint is
pushed out of the torso into the pelvis, then back into the torso. Increasing
iterations repeats that cycle.

A candidate extended escape rays through the connected body-volume union,
validated the actual weighted endpoint after corner constraints redirected it,
and included directional terrain support before corner allocation. Investigation
also reproduced and corrected a nominal-vs-actual endpoint error, a false
horizontal-floor wall, and a wrong-side heightfield-ridge tangent. A conditional
floor fallback had separately regressed two platform falls and120Hz settling.

The optimized candidate passed all18 combined body/cover falls and reduced the
named suite to two existing failures (**64/66**). Its broad suite was
**1,647/1,649**. Independent review found exact ray parity over10,000
rotated/scaled/sheared unions, and passed20 mirrored/near-seam terrain cases plus
cache/state checks. Those are mathematical/contact checks—not bounded fabric
deformation or visual approval.

## Why it was rejected

The unobstructed side-view sequence revealed a much larger outward cape stretch,
despite a lower count of body penetrations. At0.73s the rejected cape reaches
outside the frame; it is not acceptable to trade clipping for extreme stretching.

The additional native Node shape diagnostic supplies counter-evidence independent
of the renderer. `tools/cloth-union-shape-check.mjs` runs the real seeded fall;
`--candidate` substitutes only the archived cloth module before construction,
using a read-only process loader. Authoritative chest trajectories match exactly.

- Restored baseline's worst link/rest ratio is already **144.5×** at tick101.
- Rejected candidate reaches **78,736.4×** at tick49, with a14191u X span.
- Reports: `artifacts/cloth-union/baseline-shape.json` and
  `artifacts/cloth-union/candidate-shape.json`.

These Node numbers are not frame-for-frame browser geometry claims. They are a
separate native execution showing that surface-clearance tests can pass without
controlling cloth strain. Both versions need better deformation limits.

A later attempt enabled union correction only for stalled contacts, first
globally and then per face. Both left the original frame84 penetration intact;
neither is retained. No collision tolerance or existing test was weakened.

## Rejected motion evidence

`artifacts/cloth-union/rejected-comparison.mp4` is the six-second silent,
before-left/rejected-right comparison: H.264,1860×714,181 frames at30fps.
The folders `verified-before` and `verified-after` refer to verified capture
provenance, **not** an accepted candidate.

Both recordings use native SOL procedural flight for90 frames at60Hz, then
seed99 ragdoll physics on the short/broad custom frame. Each records720 physics
steps at120Hz and181 display states. Chest/head/pelvis trajectories and inspection
camera matrices match exactly across the pair. The baseline has one overlapping
physics step (tick85); the rejected candidate has zero. Both report zero browser
page errors. A paused Studio's duplicate RAF was stopped so the capture alone
owns its scripted camera and stepping.

Start,25%,50%,75%,end and the0.73s defect were directly inspected. Early camera
angles hid the landing behind the test platform and were not accepted. The final
clear view also exposes sharp folds/self-overlap and an unconvincing propped-looking
landing. This is not human-input footage or gameplay-FPS proof.

Game Studio playtest and animation-authoring checks required the full native
sequence and caused the candidate to be withdrawn despite green contact gates.

## Archives and remaining work

- `tools/prototypes/ragdoll-cape-union.mjs`: exact rejected optimized source,
  SHA256 `67e039b42a1771c6fa485873ec48e734221613f17e5ccf6c2b469b4497d0cf60`.
- `tools/cloth-union-prototype.test.mjs`: five isolated math/contact regressions.
- `tools/prototypes/ragdoll-cape-union-stalled.mjs`: rejected late-fallback attempt.
- `tools/cloth-short-contact-probe.mjs`: nonmutating native contact-cycle trace.
- Neither prototype is imported by the game or Studio.

Rejected-candidate CPU work is recorded in `artifacts/cloth-landing/union-verified-cpu.json`.
Its60Hz cloth-only p95 was4.06–4.56ms, but several rates regressed against baseline
and its worst update was27.26ms. Those costs are also withdrawn from production.

Next work must preserve collision clearance, material strain, velocity and finite
cover together. Contact-count improvement alone is insufficient. The full goal,
including powerful receiving reactions, readable beams, natural movement,
deliberate gameplay targeting and scalable custom-character authoring, stays active.
