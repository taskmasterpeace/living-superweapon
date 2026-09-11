# Beam radiance and target readability

September 6, 2026. Presentation-only follow-up to the camera lane correction.
No map, roster, beam travel, damage, charge scaling or hit-test changes.

## Defect and correction

The captured combat beam read as a plastic tube: a nearly opaque dark perimeter
surrounded a narrow bright stripe. Removing that perimeter alone made the rear
shaft disappear into the sky. Applying side-view heat to the rear view instead
bleached the opponent on contact. Those candidates were rejected.

The core now has soft cross-section opacity, a broader HDR side-view spine, and
colored axial contrast. Its traveling bands reduce white fill near the firing
axis so they do not periodically vanish against the sky. Cross-section opacity
uses the eye projected into the local ring plane; heat uses the actual viewing
angle. Existing camera-aligned global opacity reduction remains in place.

This remains one core mesh/material. A persistent tangent attribute is allocated
and uploaded only for the core; the outer sheath does not need it. Geometry
normals and tangents remain perpendicular through straight, vertical and curved
paths. A newly reproduced zero-aim startup now selects a fixed render-only +Z
basis rather than collapsing the ring. Physical aim and packet velocity are not
modified by that fallback.

## Evidence and limits

- `beam-radiance-check.mjs`: 32 rendered angle/radial/phase cases. Float render
  targets recover opacity against black and white without clipping HDR values.
  The original material failed the edge-opacity regression; the corrected
  material passes soft-edge, retained-core, HDR-spine and axial-color checks.
- `beam-surface-check.mjs`: tangent/normal checks and zero-aim startup regression.
  The zero-aim case failed before the fallback and passes after it.
- `beam-contrast-check.mjs`: unchanged rear/side gates over a full band cycle.
  Corrected shaft minimum readable fraction is 1.0 for both views; rendered band
  motion remains measurable. These are small shaft-region checks, not a whole
  screen aesthetic score.
- The new radiance regression is part of `npm run test:effects`.

Impeccable's polish guidance informed the optical edge/center separation while
preserving the existing comic rendering style. The global print pass, lighting
and palette were not disabled to improve the comparison.

This does not establish BFP-quality feel or game completion. The procedural
figures, transient close-pass overlap and fast extreme-speed camera rotation
remain visible limitations. Studio moving encounters are controlled inspection
fixtures, not a substitute for live player playtesting.

## Final-source verification

`npm run test:effects` (all 12 checks), `node tools/studio-combat-check.mjs`
(nine hero/elevation cases plus catalogue and editor navigation), `npm run build`
(203 modules) and scoped diff validation passed. The scoped design detector had
no findings. Independent review's zero-axis and redundant-glow-buffer findings
were corrected, with no remaining concrete findings on the bounded change.

Final contact cases retained 89–95% of SOL's measured silhouette contribution at
downward/level/upward aim and 76% for KANO's 2.4× charged beam at 50 units/+15°.
No sustained full-screen flashes were recorded. Separate 25/50/90-unit charged
beam checks retained 79–81%; their side-view opacity did not compound on rerender.

The first parallel verification run encountered a blank WebGL world (including
the no-beam baseline) and a Studio navigation timeout. Unchanged-source isolated
reruns passed, followed by the complete sequential effects suite. The original
failures are not counted as passes; their environmental cause was not established.

`artifacts/flight-review/beam-radiance/beam-radiance.mp4` is a six-second,
1280×720/20fps production-input capture with a scripted left-passing opponent.
It recorded 679.648 damage, identical to the preceding camera-lane capture, and
no page errors. Charge, approach, overlap, side separation, catch-up and recovery
frames were inspected. The brief overlap remains visible and is not concealed.
