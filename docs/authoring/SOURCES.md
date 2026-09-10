# Pinned sources

Every external input is named here with its terms, its pinned revision and the SHA-256 the
build verifies before use. None of these files is committed; the repository convention
(already used by `tools/lib/quaternius-source.mjs` and `tools/lib/hero-body-source.mjs`) keeps
licensed binaries under the untracked `assets-src/` tree. A build whose source is absent fails
naming the file. On another machine, copy the files from `D:/lsw/assets-src/` or fetch them
from the pinned mirrors below.

## Quaternius Universal Animation Library — Standard (CC0-1.0)

Creator page: https://quaternius.com/packs/universalanimationlibrary.html
Retrieved from the community glTF mirror, commit `e24c23cf2a1323488a3faa226ea7ea21f644b73e`:
https://github.com/J-Ponzo/gltf-universal-animation-library

| file | sha256 |
| --- | --- |
| `assets-src/quaternius/AnimationLibrary_Godot_Standard.gltf` | `0ff075c7ad6855c5c2c37a171592ee8f0d6ab2f58259e2be77a9b63dd8027765` |
| `assets-src/quaternius/AnimationLibrary_Godot_Standard.bin` | `6e65377d81558333c4093dbb144a48fd19019343d82b1a3a7992a98ec0e0543c` |

46 takes; the ones this pipeline uses are named in each recipe. Redistribution: `free`.

## Quaternius Universal Animation Library 2 — Standard (CC0-1.0)

Creator page: https://quaternius.itch.io/universal-animation-library-2

| file | sha256 |
| --- | --- |
| `assets-src/quaternius/library-2/UAL2_Standard.glb` | `8cee20ab1bc55130092447e810e26df22dd2803eccc54f52137a7d54d7ab88a8` |

43 takes on a 65-bone UE-style skeleton. Redistribution: `free`.

## Quaternius Universal Base Characters (CC0-1.0)

See `assets-src/quaternius/base-characters/PROVENANCE.md` (committed). The bodies are already
baked into `src/data/hero-body-bank.json`; humanoid-body packages reference the catalog id, they
do not re-ship the mesh.

## CMU Graphics Lab Motion Capture Database

Site: https://mocap.cs.cmu.edu/ — reachable on 2026-09-10 (HTTP 200). Terms as shown on the site
front page that day: *"This data is free for use in research projects. You may include this data
in commercially-sold products, but you may not resell this data directly, even in converted form.
If you publish results obtained using this data, we would appreciate it if you would send the
citation to your published paper to jkh+mocap@cs.cmu.edu, and also would add this text to your
acknowledgments section."* The database was created with funding from NSF EIA-0196217.

Consequence for this pipeline: CMU-derived pose banks may be embedded in the shipped game but
must not be published as a standalone motion pack. Packages built from CMU carry
`redistribution: runtime-embed-only`, and the viewer shows it.

One clip is used as the adapter proof, subject 02 trial 01 (walk):

| file | url | sha256 |
| --- | --- | --- |
| `assets-src/cmu/02.asf` | http://mocap.cs.cmu.edu/subjects/02/02.asf | `c9f5ff45b4437b279f58b95dacf017afd3135373096274df69436a9354d796cf` |
| `assets-src/cmu/02_01.amc` | http://mocap.cs.cmu.edu/subjects/02/02_01.amc | `1503c481f4726e640c77888f0c841dd3be0694684bcd32296cf53685c6fc1492` |

Fetch:

```bash
mkdir -p assets-src/cmu
curl -L -o assets-src/cmu/02.asf    http://mocap.cs.cmu.edu/subjects/02/02.asf
curl -L -o assets-src/cmu/02_01.amc http://mocap.cs.cmu.edu/subjects/02/02_01.amc
sha256sum assets-src/cmu/02.asf assets-src/cmu/02_01.amc
```

The whole database is not a dependency and must not be vendored.

## anyCreature (MIT) — vendored

https://github.com/Ariescar/anyCreature at commit `44e1abc2c7fe083f19f989c8437c44a141adc7f3`
(VERSION 1.3.1). The repository has no `package.json`, so npm cannot pin it; the `engine/`
directory, LICENSE, VERSION and `docs/OUTPUT_CONTRACT.md` are vendored under
`authoring/vendor/anycreature/` with per-file hashes in `VENDOR.json`. Its output contract
(skinned geometry, semantic names, metres, +Y up, +Z forward, embedded recipe, idle/move/attack)
is verified on the written bytes by our adapter, not trusted from its README.

## img2threejs (Apache-2.0) — method, not dependency

https://github.com/img2threejs/img2threejs at commit `6e60b5e22419464b4853e01ddb6c0e6f6659a733`.
It reconstructs a reference as procedural Three.js code produced by an agent. This pipeline
does not run img2threejs at build time: the accepted procedural factory is committed under
`authoring/recipes/**/model.js` as reviewed source and the `procedural-prop` adapter bakes it to
GLB. The revision is recorded on packages authored that way as `provenance.revision` so the
method is traceable.
