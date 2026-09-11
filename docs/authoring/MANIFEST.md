# The asset package manifest — `pw-asset-package` v1

This is the proposed versioned manifest the brief asked to see before implementation. It was
written first and the validator (`authoring/lib/validate.js`) was built to it; the JSON Schema
in `authoring/schema/asset-package.schema.json` mirrors it for reviewers. The executable
validator is the authority — if the two disagree, the validator wins and the schema is a bug.

Not reviewed by a human before implementation: this branch ran unattended. The design is
argued below so it can be rejected on paper without reading code.

## One package, five kinds

A package is one directory, `public/authored-assets/<id>/v<version>/`, holding `manifest.json`
and its flat outputs. Nothing in a package references a file outside that directory except
provenance (which names source paths under `assets-src/` or `authoring/` with hashes, never
absolute paths or URLs to fetch).

| kind | what it ships | what the runtime would consume |
| --- | --- | --- |
| `humanoid-motion` | `pose-bank.json` in the engine's existing 45-float pose-bridge frame layout | `samplePoseFrame` / `applyAuthoredPose` (read-only, already in `src/engine/authored-pose.js`) |
| `humanoid-body` | proportion + socket metadata over a known catalog body id | the existing hero-body catalog; no new mesh path |
| `equipment` | `model.glb` with named sockets (grip, support, muzzle, magazine, holster) | mounts on the production hand socket (`arm.children[2]`) |
| `creature` | skinned `model.glb` with its own skeleton and idle/move/attack | a creature loader that does not exist yet (see INTEGRATION.md) |
| `prop` | static `model.glb`, optional sockets | a prop loader; the frontline kit loader is the nearest existing path |

A visual asset package is **not** an `lsw-character` kit package. The `compatibility.lswCharacter`
block can only say how a kit *could* reference a package by id; it never changes that schema.

## Fields

```
format            "pw-asset-package"
formatVersion     1
id                ^[a-z0-9][a-z0-9._-]{0,79}$   stable across versions
version           integer >= 1                   bumped only when content hash changes
kind              one of the five kinds
displayName, tags

provenance        author · license (SPDX or Proprietary-Internal) · redistribution
                  (free | runtime-embed-only | internal) · url · retrievedFrom · revision · terms
source            adapter "name@N" · files [{path, sha256}] · recipe {path, sha256}
tool              name · version · three · adapterVersion
build             options · cacheKey · contentHash · profile
units             lengthUnit game-unit · metersPerUnit 0.19 · up +Y · forward +Z · handedness right
                  sourceConversion {scale, yawDegrees, mirrorX, sourceUp, sourceForward}
outputs           [{path (flat), role, sha256, bytes}]
bounds            {min, max}                                  optional
lods              [{level, output, triangles}]                optional
materials         [{name, slot}]                              optional
rig               skeleton · mapping (17 humanoid slots → source joints) · bones · catalogBody
sockets           [{name, parent, position, rotation(quat)}]
equipment         {class firearm|blade|thrown, twoHanded, hand}          equipment only
clips             [{id, take, duration, loop, sampleRate, frames, mirror, handedness, events,
                    posture {start, end, measured}, category}]     posture and category are MEASURED
hitZones          [{zone, shape, attach, center, radius|end|halfExtents}]  optional metadata
budgets           profile · measured {triangles, drawCalls, materials, bones, textures, bytes} · limits
acceptance        visual (approved | unapproved | unapproved-placeholder) · approvedBy + approvedOn
                  when approved · blockers [{id, owner, summary}] · note
compatibility     poseBridge {frameLength 45, layout, engineModule}
packageHash       sha256 of the canonical JSON of every other field
```

## Why these choices

- **Posture is measured, never named.** Each clip records the start and end posture of its
  retargeted anatomy — `standing`, `crouch`, `prone` (chest to the ground, hips on it), `supine`
  (chest to the sky, hips on the ground), `airborne`, `transition` — from the torso up vector, the
  chest normal against +Y and hip height over the bind pose, plus a derived category (`get-up`,
  `fall`, `knockdown`, cycles, actions). A recipe may state `expectPosture`; the build fails when
  the take disagrees. That is how `LayToIdle` became `supine-rise` rather than a "prone rise".
- **Structural pass and visual acceptance are two different facts.** `acceptance.visual` is
  required on every package; `approved` needs a name and a date; `blockers` name reasons
  integration must not proceed, each with an owner. Placeholder art says so on the package.

- **Explicit units and axis conversion.** Every adapter must state how it turned the source's
  axes and scale into game units (1u = 0.19m, +Y up, +Z forward). A missing conversion is a
  validation failure, not a default.
- **Sockets are transforms on a named parent**, not baked into geometry, so the same weapon can
  be fitted to two proportions by re-solving the support hand at load time.
- **Clips carry normalized events** (`footstep`, `contact`, `recovery`, `mag-out`, `mag-in`,
  `bolt`, `grenade-release`, `loop`) in clip seconds. The event tracker in
  `authoring/lib/clip-events.js` proves they fire once at 30/60/120 Hz, across interruption,
  replay and form replacement. Markers describe timing only; damage stays in the game.
- **Budgets are measured, limits are derived** from the production baseline
  (`authoring/baseline/production-baseline.json`). Desktop limit = 1.25× the largest shipped
  asset of that class; mobile = 0.6×. Exceeding a limit fails the build.
- **`packageHash` and `contentHash`** let two clean builds be compared byte-for-byte.
  `contentHash` excludes the version number so a rebuild with identical content keeps its version.
  `packageHash` excludes `build.cacheKey`: the cache key fingerprints the tool's own source files
  (so the cache invalidates itself on any tool edit), but a package's identity is its content.
  `node authoring/bin/authoring.js reproduce` rebuilds every recipe into a scratch root and
  requires identical package and output hashes against `public/authored-assets`.

## Validation codes

Every failure carries one of: `shape`, `unsafe-key`, `finite`, `incompatible-version`, `id`,
`kind`, `license`, `source`, `unsafe-path`, `units`, `outputs`, `hash`, `rig-mapping`,
`missing-socket`, `clips`, `duplicate-id`, `budget`, `nan-frame`, `root-motion`, `pose-bank`,
`acceptance`.
`authoring/fixtures/invalid/*` holds one deliberately broken package per rule the brief named
(rig mapping, missing muzzle, NaN frame, absent license, unsafe external path, exceeded budget)
plus duplicate ids, an incompatible version, a missing acceptance record and an invalid posture. Each fails for exactly that one code — the test
asserts the code set equals the expected set, so a fixture that failed for two reasons would
be caught.

## What the manifest deliberately does not carry

- No executable code, no `eval`, no plugin hooks. A prop "recipe" that is procedural Three.js is
  committed, reviewed source under `authoring/recipes/` and is imported by the build, never
  loaded from a package or an upload.
- No root motion. `validatePoseBank` refuses a `rootMotion` key outright.
- No damage numbers, resource costs or ability authority.
