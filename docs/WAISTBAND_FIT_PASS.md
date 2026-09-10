# Fitted waistbands — September 8, 2026

Bounded model-construction correction. The full independent-combat objective remains active.

## Defect and change

The circular belt surrounded an oval pelvis. Actual mesh-distance tests measured
0.447 units of separation on a standard procedural frame and 0.730 on a short,
broad frame. Imported bodies inherited the same rigid ring, despite having a
different surface blended between several bones. KANO also wore an overlapping
box sash and the generic ring.

`hero-waistband.js` now cuts a closed strap from the actual body surface at
construction time. Procedural straps remain on the driven pelvis. The two
bundled source bodies use interpolated source weights and the existing skeleton.
The martial sash replaces the old duplicate box wrap; its hanging end remains.
There is no per-frame fitting solver, new controller, root change, socket change,
map change or new animation asset. The old shared armor emission scalar remains
0.5, now initialized on the material instead of mutated by belt construction.

Spectral snapshots include the new weighted band. A test first exposed the band
continuing to follow the live skeleton after the rest of a decoy froze; that
selector is repaired. Existing form, disposal, invisibility, palette, raw-copy
borrowing and source-rig behavior remains tested.

## Evidence

- Initial actual-surface matrix: 11/12 failures before integration. Standard,
  short/broad and tall/narrow frames across procedural/male/female bodies.
- Fitted integration: 14/15 passed, with the spectral-copy failure above.
- Retained dedicated suite: **15/15**, including ground movement, hover, rising
  and descending cruise, ragdoll/restoration, closed edges and snapshot isolation.
- Adjacent anatomy/skin/forms suite: **86/86**. Independent read-only review also
  checked form changes, palette ownership, final surface distances and resource
  retirement; no Critical or Important defect reproduced.
- Final all-root `node --test --test-concurrency=4 tools/*.test.mjs`:
  **1,623 tests, 1,619 pass, four retained cloth failures**, 137.10 seconds.
  `artifacts/waistband/final-root-tests.log` is authoritative. Those failures are
  stock31/platform60, tall/fixed-wall120, short99/platform120 and virtual-contact
  overconstraint. No assertion was removed or relaxed.
- Final `npm run build`: **passes**, 265 modules, 8.97 seconds; existing large-chunk
  warning. Log: `artifacts/waistband/final-build.log`.
- `tools/hero-skin-browser.mjs`: actual Body source choices, saved-profile reload,
  procedural fallback, custom export/import and native Play Test pass without
  page/console errors. Source skin count intentionally changes from three to four
  because the previously rigid belt now has weights; the test checks the band's
  actual skeleton rather than only changing that count.

## Motion and rendering

`artifacts/waistband/comparison.mp4` is a **24-second silent side-by-side**:
SOL procedural, KANO procedural, SOL source male, SOL source female. Each chapter
uses six seconds of actual Studio locomotion/attack execution with scripted
travel and an orbiting inspection camera. 480 encoded frames at 20 fps; 1,440
native simulation states per version. This is not manual gameplay, AI balance,
imported casting-animation footage or measured game FPS.

The retained locomotion bank identifies `Walk_Loop` (1.3333s, 81 sampled frames)
and `Jog_Fwd_Loop` (0.9167s, 56 sampled frames), from the retained Quaternius
Universal Animation Library data. Casting remains the existing procedural overlay.
No source clip or source-body file was changed or newly licensed in this pass.

Authoritative matched captures are `before-verified/` and `fitted/`, each with
front/quarter/rear/other-quarter/end stills and a complete state log. The first
`before/` capture is **rejected**: applying a temporary form before Studio seek
lost the source body while retaining a misleading label. The corrected recorder
sets the actual profile and asserts body identity after rebuild. The final armor
scalar restoration does not change these unlit-emission SOL/KANO samples; a fresh
editor/native runtime check follows it in `editor/`.

Matched contact totals are unchanged: 176 / 487.025 / 175 / 169 damage. At the
first matched frame, draw calls are unchanged for SOL and both source bodies;
KANO drops 59→58. Procedural belt remains 192 triangles; source bands add 644/700
triangles over the old ring, with no additional draw call or skeleton. This is a
bounded geometry cost report, not target-hardware performance certification.

## Still open

The procedural trunk still looks tapered/assembled in deep leaning poses, source
elbow/cuff silhouettes need refinement, and capes remain coarse with four failing
cloth witnesses. The tight-turn beam in `fitted/1-59.png` also narrows into thin,
ribbon-like sections; the waistband comparison is not acceptance of that beam
shape. That moving-contact silhouette needs a separate geometry investigation.
Exact custom-body/gear coverage, steep camera self-obstruction,
all origin/state transitions and the full original feel/performance gates are not
complete. This repair makes an exposed construction defect better; it does not
establish AAA quality or eliminate all clipping.

Game Studio and animation-authoring instructions required actual moving bodies,
source identification, failed reproductions and visual inspection. The latter's
TypeScript/Vitest paths do not exist here; verification uses this repository's
native Node/Vite pipeline instead. No commit was made.

Reproduce: `node --test tools/waistband-fit.test.mjs`,
`node tools/waistband-browser.mjs <new-label>`,
`node tools/hero-skin-browser.mjs`.
