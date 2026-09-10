# Directional afterburner wake

September 6, 2026. Bounded open-sky flight presentation pass. No map,
camera, flight-physics, energy-budget, ignition or roster-data changes.

## Defect and implementation

The previous real-input flight reel showed a chain of large white beads behind
SOL. Afterburner emitted size 3–5 round point sprites with an 85% chance each
frame. Its `spawn` color received a palette array, although that API expects one
color. Production fixtures measured 5, 11 and 24 large sprites at 30/60/120 Hz.

Open-sky afterburner now uses `FlightWake`: one dynamic mesh containing two thin,
tapered ribbons. Twenty-four spatial samples retain the traveled world-space
path; old energy cannot pivot around with the fighter. Each ribbon uses one
authored wake color. History expires after 0.24 seconds, and throttle cut no
longer adds another oversized round burst. City-mode effects are unchanged.

The shared VFX lifecycle disposes geometry/material on expiry. Fighter disposal
releases the wake immediately. Teleports break history, hidden owners suppress
the mesh, and a render-time visibility check covers vision updates occurring
after the VFX tick. Invalid owner motion cannot allocate or poison a buffer.
Adjacent billboard widths preserve their sign through curved near-axis travel.

Impeccable's polish guidance informed the narrower visual role: directional
speed feedback that leaves the character readable, not another bright body shell.

## Verification

- Baseline production check failed at all three frame rates. New production
  checks pass with one mesh, 276 indices and zero large afterburner sprites.
- Five Node regressions pass: non-finite live motion, invalid factory inputs,
  disposal, late visibility and curved near-axial ribbon continuity. The curved
  fixture failed at sample 3 before width-sign correction.
- `npm run test:flight` passes, including ten cape tests, movement/presentation
  checks, real input, 53 roster rigs through flight/KO/recovery, and `test:wake`.
- Browser wake checks render the production pipeline and report no page or
  console errors. `npm run build` passes (204 modules).
- Independent scoped review found no remaining actionable defects after the
  finite and width-continuity corrections.

`tools/flight-reel.mjs` records real inputs with the production chase camera.
The final capture is `artifacts/flight-review/wake/final/`; the encoded review
clip is `artifacts/flight-review/wake/flight-motion.mp4` (8s, 1280×720, 24fps).
This scripted takeoff/boost/bank/brake sequence is not a full combat playtest.

## Still open

This is not a BFP-equivalence or AAA-quality sign-off. The distant enemy remains
small, the HUD occupies substantial space, and high-speed combat camera and
target readability still need further work. Print treatment can make these thin
ribbons appear rail-like; broader effect/material art direction remains open.

Studio's stationary pose stage does not integrate traveled positions, so it does
not preview a world-history wake. No fake stationary trail or second effect
implementation was added. A moving-flight editor fixture is still needed for
authoring this effect. Existing beam encounter previews remain unchanged.
