# Flight and character feel — September 2026

This replaces the earlier mechanics-only assessment. Passing a feature check does not establish
that movement, models or combat feel good. This pass addresses the actual controls and presentation;
it does not claim finished-art quality or Bid for Power parity.

## Reference and scope

Reviewed gameplay samples from [DBZ's Forgotten Fan Classic — Bid for Power](https://www.youtube.com/watch?v=4BAwJyKkrpg)
alongside the repository's BFP / Ultra BFP reference frames. The reference is useful for readable
humanoid proportions, distinct airborne stances, and close third-person framing. Its exact response
constants cannot be inferred reliably from edited footage. New response values here are our tuning,
not purported original BFP values.

No map layout, geometry, cover, terrain, or arena palette was redesigned. PowerWorld's fighter-only
material treatment changed; authored suit colours are no longer washed toward one common bone tint.

## What changed

- Powered movement now has one three-axis velocity response, shared by player and bot intents.
  Acceleration is responsive; releasing input carries briefly and resolves to a stable hover.
  Knockback, throws, dashes and grapples retain velocity ownership.
- Mouse-look is processed before movement/aim. Horizontal look direction is corrected, steep pitch
  is preserved, and strafing no longer rotates a free camera before the first mouse movement.
- Free chase distance is closer. Rotation is direct; only the follow anchor is spring-smoothed.
  Locked framing, camera collision and combat shake remain separate concerns.
- A hip-centred visual body replaces the feet-centred lean. Hover, travel, side-flight, braking and
  combat use distinct poses; elbows bend and carry the hands/weapons with them.
- Reproportioned anatomical torso, longer legs, smaller shoulder armour, shaped heads/hair, rounded
  gloves/boots, costume modules and a deforming cape replace several rigid primitive volumes.
- Ragdolls seed their joints from the current posed/scaled model rather than an upright universal
  rest skeleton. Weapon sockets survive the transition.
- Projectiles and optic beams originate at the actual hands/eyes. Sustained beams steer from those
  origins toward the controller's world-space aim point; the travelling hose is preserved.
- HERO is the clean rendering preset. Existing custom/alternative looks are kept; the old shipped
  BROADCAST default migrates once. F1 still exposes the full controls reference.

## Modular authoring

| File | Owns |
| --- | --- |
| `src/data/hero-models.js` | Costume, hair and flight-style presentation data; `def.model` overrides |
| `src/engine/hero-costume.js` | Fitted, martial, plated and tactical additions on driven meshes |
| `src/engine/hero-rig.js` | Anatomical geometry, named sockets, elbow FK, body pivot and cape deformation |
| `src/engine/flight-pose.js` | Flight/combat pose layering; never collision or velocity |
| `src/engine/flight-motion.js` | Powered velocity response and ownership |

The existing arm child indices and named leg parts remain compatible. Body meshes live under
`parts.body`; ground markers do not. Ragdoll code explicitly zeroes/restores that visual root.

## Verification and review

With Vite running on 5180:

```
node tools/flight-feel-check.mjs --capture
node tools/flight-live-check.mjs
node tools/combat-regression.mjs
node tools/flight-reel.mjs
npm run build
```

Before/after isolated SOL measurements:

| Observation | Before | After |
| --- | --- | --- |
| Speed reached after 400 ms | 54% | 97% |
| Speed 650 ms after release | 15.8 u/s | 1.5 u/s |
| Requested 60° upward view | 21.1° actual | 60° actual |
| Hover elbow articulation | 0° | ~37° |
| Mouse-right turns camera-right | Reversed | Correct |

The live-input test starts on the ground and holds/releases Space, then runs acceleration, boost,
banking and braking through the full update loop. The geometric regression checks all 53 roster
rigs through flight, KO and restoration. Review frames/video live in ignored `artifacts/flight-review/`.
The reel uses deterministic simulation time; it is motion evidence, not a hardware performance benchmark.

Latest checks: 10/10 flight/camera/socket assertions, 2/2 live-input/roster checks (53 rigs),
42/42 PowerWorld regressions, and 34 passing abilities across SOL/KANO/VEGA/TITAN/GALE.
GALE's quiver is reported separately as needs-context, not counted as a pass. The ability harness
was corrected to avoid feeding a neutral release immediately after each held intent. Build passes.

Remaining subjective validation: hands-on KBM play, physical-controller feel, locked close combat,
and each hero's final art identity. The procedural models are a better modular base, not a replacement
for a dedicated final character-art pass. Historical movement suites encode the rejected slow coast
and should not be used as acceptance targets for the new feel.
