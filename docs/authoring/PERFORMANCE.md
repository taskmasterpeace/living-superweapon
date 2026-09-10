# Performance: the measured baseline and the derived budgets

Budgets are not borrowed from anyone's marketing page. `node authoring/bin/authoring.js baseline`
reads what the game already ships at the pinned combat baseline and writes
`authoring/baseline/production-baseline.json`; `authoring/lib/budgets.js` derives every limit
from that file. A package whose measured numbers exceed its limit fails to build.

## What was measured (baseline commit `bcf6327`)

| class | samples | max triangles | max draw calls | max materials | max bones | max bytes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| body (hero-body-bank superhero male/female) | 2 | 15,060 | 3 | 3 | 65 | 2,052,305 |
| equipment (frontline field armor/boot/greaves/harness) | 4 | 4,256 | 6 | 3 | 0 | 342,056 |
| prop (frontline kits, vehicles, rocks) | 12 | 54,234 | 25 | 6 | 0 | 2,536,024 |
| motion (bundled pose banks) | 4 | — | — | — | — | 136,024 (max 900.8 bytes per sampled frame) |

Numbers come from `gltf-transform` reading the shipped GLBs and from the bundled JSON banks; the
draw-call count includes instanced re-use of a mesh by several nodes.

## How limits derive

- **desktop** = 1.25 × class maximum; **mobile** = 0.6 × class maximum (rounded up).
- **motion** byte limit is per sampled frame: `maxBytesPerFrame × frames × headroom`, because a
  motion package holds a variable number of clips. A 19-clip set is not "over budget" for being
  complete.
- `creature` is judged against the **body** class (a skinned body is a skinned body). The
  consequence surfaced immediately: the first hound compiled with 8 materials and 8 draw calls and
  was refused (limit 4). It ships with four materials.
- `equipment` and `prop` GLBs are merged to one primitive per material at bake time; the first
  carbine bake had 11 draw calls (one per primitive) and was refused against a limit of 8 derived
  from field gear that draws in 6.

## What this branch measured on its own outputs

| package | kind | triangles | draw calls | materials | bones | bytes |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| motion.hero-ual | humanoid-motion (19 clips, 1,431 frames) | — | — | — | — | 588,648 |
| motion.hero-ual2 | humanoid-motion (6 clips) | — | — | — | — | 171,815 |
| motion.cmu-walk-02 | humanoid-motion (1 clip, 172 frames) | — | — | — | — | see manifest |
| equipment.carbine | equipment | 160 | 3 | 3 | 0 | 13,968 |
| equipment.sidearm | equipment | 116 | 2 | 2 | 0 | 10,068 |
| prop.ammo-crate | prop | 532 | 4 | 4 | 0 | 27,800 |
| creature.field-hound | creature | 2,169 | 4 | 4 | 27 | see manifest |
| body.* (4) | humanoid-body (metadata over the catalog mesh) | 14,318 / 15,060 | 3 | 3 | 65 | catalog bytes |

Every row is read back from the written file by `authoring/lib/measure.js`, never from the recipe.

## What is NOT measured here

- GPU frame cost of these assets inside a live match (load/dispose counts under equip/form/KO,
  a mixed encounter). That is the main-task integration gate (INTEGRATION.md) and needs the game
  running in a foregrounded tab — the repository's own notes explain why a hidden pane cannot
  time a render. This branch does not claim it.
- Texture memory: these outputs carry no textures (vertex colour and flat PBR), so the texture
  budget is trivially met and says nothing about textured assets yet.
