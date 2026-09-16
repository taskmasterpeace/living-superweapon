# Technique mining: AvatarCastingAbilitiesThreeJS → the beam/projectile makeover

Source: https://github.com/achrefelouafi/AvatarCastingAbilitiesThreeJS ("Bending Sandbox"),
supplied by Robert 2026-09-16 as reference for the makeover (Refs #42). Shallow-cloned and read
in full; this file is the distilled, checked-against-our-code port map.

## License

Code is **MIT** (standard text, © 2026 mohamedachrefelouafi). Two bundled ASSETS are **not** —
the HDR probe and the Mixamo FBX ("retain their original licences" per its README). We need
neither. **Every ported GLSL chunk carries the MIT notice + repo URL in a header comment**;
their noise lib is Ashima/Gustavson simplex (MIT) and the blackbody fit is Tanner Helland's
published approximation — keep those credit lines too. The entire VFX layer has **zero
textures** — all procedural GLSL — which matches our offline law exactly.

## What it is (inventory, one line each)

- `shaders/lib/noise.glsl.js` — hash11/21/31/13, 3D simplex `snoise`, `fbm3/4`, **`ridged`**
  (filaments/cracks), **`curlNoise`**, **`voronoi2`** (distance + cell id), `rot2`.
- `shaders/lib/common.glsl.js` — `fresnelTerm`, **`dissolveMask`** (burn-edge dissolve),
  **`gradient4`** (4-stop ramp), `aastep`; `softFade` needs a depth prepass (skip).
- `VolumetricFireMaterial` — raymarched blackbody fire (take its FIELD lessons, not the march).
- `WindMaterial` — the **comb** (fragment-space hairline lanes on one ribbon) + vertex-shader
  tornado funnel with nested parallax shells.
- `TrailMaterial` — additive energy ribbon: fbm flow, ridged filaments, core+halo falloff,
  **traveling Gaussian pulse**, procedural sparks, dissolve.
- `ParticleSystem` — GPU instanced-quad particles: analytic motion in the vertex shader
  (`pos = start + vel·(1−e^{−k·age})/k + ½g·age²`), 6 procedural silhouettes
  (SOFT/SMOKE/STREAK/LEAF/CHIP/RING), ring-buffer recycling, partial uploads. ONE draw call.
- `BurstSphere` — pooled impact shells: vertex fbm+ridged boil, 4 modes (fire/water/air/earth).
- `GroundDecals` — one shader, 6 modes incl. **CRACK** (ridged radial fractures w/ decaying
  glow — a ready lightning/ice-fracture stamp) and SCORCH (fbm burn + ember twinkle).
- `LightPool` — 6 fixed PointLights never added/removed: **our light-count law independently
  derived.** Confidence signal, nothing to port.

## Where it lands in OUR code

- `src/engine/projectiles.js` BeamHose already writes `beamArc` (≡ their `aDist`) and
  `beamTangent` on the core tube; `RADIAL = 8` — **the tube is already an octagon**.
- `src/engine/beam-surface.js` already patches MeshBasicMaterial via `onBeforeCompile` +
  `customProgramCacheKey` with a shared time uniform — the exact injection point for all of this.
- Cones are ~4 CPU particles/frame — the GPU ParticleSystem is the structural replacement.
- Composer: half-res UnrealBloom strength 0.66 / threshold 0.8 — anything pushed over ~0.8
  luminance blooms; `toneMapped:false` + additive is the ki look.

## Four laws from their comments (each cost them iterations)

1. **Anisotropy or porridge.** Sample tube noise as
   `vec3(cos(ang), sin(ang), arc/stretch)·freq` — angle on a full circle (seamless), arc
   stretched 3–6× so features draw out along travel; scroll = `arc − time·flow`. Never sample
   world position on a moving beam (pattern swims through the beam instead of riding it).
2. **The bright driver must be blunter than the density** — feed emission exponents from
   geometry (radial falloff) nudged by only the 2 coarsest octaves, or you render contour lines.
3. **Ridge is subtracted, never added** — `field − ridged·fringe` shreds edges into strands;
   added, it draws bright iso-contour loops.
4. **Flicker is one value per frame for the whole effect**, two rates summed,
   `clamp(1 + f·0.6·(n·2−1), 0.4, 1.7)` — per-fragment flicker is noise; unclamped is guttering.

## Recipe cards (per element family)

### FIRE — Robert's lava-tube spec (flat-shaded octagon, black/orange lava under fire)
- Octagon facets: quantize the circumferential coord — `facetId = floor(ang01·8.)`, per-facet
  brightness step `0.85 + 0.15·hash11(facetId)`. No geometry change (RADIAL is already 8).
- LAVA (core tube, NormalBlending, `toneMapped:false`): crust
  `n = vnoise(tc·1.4)·0.6 + vnoise(ROT·tc·3.1)·0.4`; cracks
  `smoothstep(0.55, 0.85, 1−|n·2−1|)`; color
  `mix(vec3(0.02), blackbody(mix(1100., 3300., crack)), crack)` — port their 12-line
  `blackbody(kelvin)` and black→red→orange→white falls out of physics; only cracks cross the
  bloom threshold, crust stays matte. Heat ×`pow(K/3300., 2.4)` for range. Scroll via
  `arc − time·flow` only. **Blackbody is constitutionally incapable of purple.**
- FIRE (sheath, additive): upgrade `shadeFireSurface`'s sine-hash tongues to 2–3 octaves vnoise
  + one progressive domain warp + buoyant shear (`p.y −= lick·q²`) so blobs become upward
  tongues; shred edges with subtracted ridge; whole-beam flicker per law 4.
- Impact: BurstSphere FIRE mode (vertex boil + gradient4 + dissolveMask burn-away, outQuint).
- Particles: embers SOFT additive g +1.4 · sparks STREAK g −9.5 · smoke SMOKE curl, endSize
  3.4; smoke's first ramp stop = edge-color·0.14 (lit by the fire) — pure soot is invisible.

### ICE / COLD
- Plates: `voronoi2` in tube coords — flat color per cell id, **bright frost seams**
  `smoothstep(0.09, 0., F1)` in pale cyan over the bloom threshold. Slow/zero scroll (ice is
  rigid — motion reads as a glass conveyor); pulse the seams instead.
- Glass body: fresnel rim + fake Beer-Lambert — `mix(paleCyan, deepBlue, pow(1−facing, 0.7))`.
- Sparkle: `pow(max(0., snoise(vec3(arc·60., seed, time·6.))), 6.)`.
- Impact: BurstSphere WATER recipe re-tinted (voronoi plates + rime) + CHIP-shape shards with
  velocity stretch. Freeze decal = their CRACK mode in a cold palette.

### LIGHTNING / SHOCK
- Filaments are `ridged`, 2 octaves. Bolt lanes = the comb on the tube (fragment-only, zero
  extra draws): `cell = ang01·n + off(arc, t)`, strand
  `pow(1 − smoothstep(0., w, |fract(cell)−.5|·2.), 2.)`, `w = max(0.08, fwidth(cell)·2.)`
  (the AA floor is mandatory). Electric jitter = **time-quantized hash** displacement
  (`floor(time·24.)` steps read as arcing; smooth drift reads as hair). Per-lane life gate via
  fbm so bolts appear/die.
- Ground contact: CRACK decal verbatim = electric scorch-web. Sparks: STREAK particles with
  velocity-aligned stretch.

### SONIC
- The AIR burst mode IS the grammar: fresnel-only shells (`alpha = (1−age)·fres·0.85`) —
  pressure visible only at its silhouette, no glow (honors our transparent-sonic law) + RING
  particles for ground shock rings.
- Cone body: the comb, 12–22 filaments; displacement fields vary ALONG the cone and barely
  across it, or filaments mush. Tornado (weather): vertex-shader funnel + 2–3 nested parallax
  shells, spin 4× faster at the neck.

### ENERGY / KI
- TrailMaterial ≈ the beam sheath verbatim (`along → beamArc/arcLen`): fbm flow over
  core+halo falloff, ridged filaments at 0.35 in the outer color.
- **Traveling pulses — the single cheapest "stream not laser" upgrade**:
  `pulse = exp(−pow((along − fract(time·0.35))·6., 2.))` brightening toward `color2` —
  energy packets visibly racing muzzle→tip down the already-bending polyline. Two offset
  pulses for torrents.
- Release: `dissolveMask` on the retreating end — the beam BURNS away instead of truncating.
- Helix/sinuous tempers without instances: AirScooter streamline phase
  (`ang01·bands + twist·arc/stretch + time·spin`) combed + per-lane life gate — can replace
  orb instances at weak tiers (`n:0`) or underlay them.
- Charge orbs: BurstSphere vertex boil growing with charge; birth/fade uniforms.
- **Cones structurally**: port ParticleSystem as a per-element emitter (one
  InstancedBufferGeometry each = one draw call; spawn-slot writes only; analytic drag; no
  textures; omit softFade). A fire cone = one 2000-cap SOFT + one 800-cap STREAK system.

## NOT worth porting

1. Depth prepass + soft particles (second scene traversal; we have no spare depth product).
2. The distortion buffer + warp pass (extra composite stage; if heat shimmer is ever wanted,
   fold 2–3 analytic capsule uniforms into the print pass instead).
3. The raymarched fire/water volumes as wholes (26–44 field taps/pixel, need the prepass to
   clip, and the wrong aesthetic — Robert specified flat-shaded stylized fire).
4. HDR env-probe reflections (asset separately licensed; take only the 3-line `skyFloor()`).
5. FBX/HDR assets, lil-gui editor, animation layer, CatmullRom path (we have our own).
6. BurstSphere's per-instance material cloning — pool 2–3 per mode; mode count = program
   count (compile-time defines), keep it fixed (light-count-law instincts).
7. EarthAbility's rock choreography (out of beam scope).

## Port order (loops, each with a gate)

1. Noise + common GLSL chunk → `src/engine/vfx-noise.glsl.js` w/ MIT header
   (gate: injected into `shadeFireSurface`, byte-identical output when unused).
2. Fire lava+tongues on the existing core/sheath patches + blackbody
   (gate: screenshot — black crust, orange cracks, scrolling, octagonal facets).
3. Trail pulses + sparks + dissolve on the energy sheath
   (gate: a pulse visibly travels a bent beam).
4. GPU ParticleSystem port; convert one cone
   (gate: one draw call, 60fps with 4 simultaneous cones).
5. Comb lanes for lightning/sonic tempers; BurstSphere impacts; CRACK decal
   (gate: profileSuite distinctness numbers move).
