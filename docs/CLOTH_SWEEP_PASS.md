# Cloth sweep history — retained narrow repair

September 8. The full superhero-combat goal remains active. This pass fixes a
specific source of cape/wall clipping; it does not certify finished cloth,
character art, BFP feel, gameplay performance or the complete editor.

## Retained runtime change

`src/engine/ragdoll-cape.js` captures each point's real position before every
physics substep. Static-cover collision sweeps from that position, not Verlet
`prev`: positional stabilization deliberately moves `prev` to preserve velocity,
so it can lie on the opposite side of a wall without the cloth ever going there.
An embedded endpoint now also respects the entry face instead of being ejected
through whichever wall face happens to be nearest.

The first revision used the previous displayed frame. That changed the tall
platform/30 Hz trajectory enough to introduce a torso penetration, so it was
replaced by a true substep snapshot. The final version passes that fixture.
Moving-body contact still uses its existing velocity history and projection.
Independent review compared 300 randomized rotated/scaled moving-body contacts
against the frozen baseline with exact position/velocity-history parity.

The authoritative ragdoll skeleton, gameplay movement/camera, beam travel,
combat balance, map layout and saved Studio profiles are unchanged. Both game
and Studio use the repaired shared ragdoll cloth implementation.

## Verification

- Native point contact: **10/10 pass**. Fictitious opposite-side history and
  wrong-side embedded exits were observed red before their repair, in both
  directions. Further cases protect full wall crossing and the preference for
  current-substep history over an older displayed frame.
- Named cloth suite: **61 tests, 58 pass, 3 fail**, exit 1. See
  `artifacts/cloth-local/substep-final-tests.log`.
- Broad root suite: **1,644 tests, 1,641 pass, 3 fail**, exit 1, 84.50 seconds.
  This glob also includes isolated prototype tests; do not describe all of it as
  production runtime coverage. See `artifacts/cloth-local/root-final.log`.
- Build: **passes**, 11.66 seconds. Existing large-bundle warning remains.
- Independent final contact/wake review: **14/14 pass**, no new Critical or
  Important finding for this narrow repair.

Two formerly failing combined fall fixtures now pass: stock seed31/platform at
60 Hz, and tall fixed-launch/thin-wall at 120 Hz. No existing gate or tolerance
was removed or weakened. The remaining three failures are:

1. Short/broad seed99/platform at 120 Hz: face80 enters the torso at frame84.
2. A weighted surface sample is still represented by overly restrictive corner
   planes; neighboring clearance is not fully usable.
3. A newly added real-contact test shows balanced corner velocities being
   flattened even when the weighted sample itself is stationary. This is newly
   exposed coverage, not a regression introduced by the sweep repair.

## Visual evidence

`tools/cloth-wall-browser.mjs` creates the same native procedural SOL flight and
fixed-launch ragdoll as the tall/thin-wall fixture. It uses the production Studio
renderer and an explicit test collider, without editing maps or stored profiles.
`--before` substitutes only the freshly frozen cloth module in the browser;
the rest of the current game is identical. Both runs take 720 native 120 Hz
physics steps and record 181 display states over six simulated seconds.

- `artifacts/cloth-wall/substep-before/`: **184 overlapping physics steps**;
  first overlap is tick96 (the test's zero-based frame95).
- `artifacts/cloth-wall/substep-final/`: **zero overlapping physics steps**.
- Both browser runs report **zero page errors**.
- The chest trajectory matches exactly across all181 display states.
- `artifacts/cloth-wall/comparison.mp4` is the matched before-left/after-right
  recording:181 frames,6.03 seconds, silent H.264. The individual final recording
  is `artifacts/cloth-wall/substep-final/cloth-wall.mp4` (930×714).

At 0.80 seconds, the before image contains a giant stretched cape triangle;
the matching final image no longer does. Later inspected final frames still
show sharp folds, self-overlap and a propped-looking landing. These are not
accepted as finished cloth or AAA animation. The camera is a scripted inspection
camera, the recording is silent, and its frame rate is not gameplay FPS evidence.

## Rejected weighted-contact experiment

Before isolating the sweep bug, a larger candidate retained barycentric sample
constraints and projected local velocity rays. Its focused cases passed, but
full falls regressed: first **35/52**, then **42/54** after repairing two real
transaction errors. It was completely withdrawn from production.

The rejected source is `tools/prototypes/ragdoll-cape-weighted.mjs`; its isolated
11-test harness is `tools/cloth-weighted-prototype.test.mjs` (passes). The
diagnostic `tools/cloth-transaction-probe.mjs` deliberately runs that archived
candidate, not the current runtime. It reproduces a frame56 wall crossing from
x42.824 to x45.188 despite the last displayed x43.434 remaining on the near side.
The frozen original runtime is `artifacts/cloth-local/runtime-before.txt`.

The earlier candidate also failed 120 Hz settling, and its cloth-only CPU probe
reached 62.46 ms for one update. Its math, performance and green isolated tests
are not production acceptance. Neither weighted prototype is imported by the
game or Studio. Further work must preserve joint contact transactions, actual
sample velocity and finite-cover clearance together without restoring expensive
general-purpose per-face iterative optimization.
