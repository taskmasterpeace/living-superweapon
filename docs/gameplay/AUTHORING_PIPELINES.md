# Authoring pipelines

Use this map to change an asset or presentation while keeping it reproducible and testable. Gameplay decisions belong in the [gameplay contract](../GAMEPLAY.md); current delivery and acceptance belong in the [tracker](TRACKER.md).

Verified September 11, 2026 against `D:/lsw/.worktrees/sarge-authoring-integration`. Run commands from that checkout until reconciliation is complete; afterward use the recovered repository root. Some source assets are local and untracked. Existing pipeline READMEs may name older branches/worktrees; use their file contracts, not their historical checkout instructions.

## Choose the route

| What you are changing | Current route | What it produces |
|---|---|---|
| Rigid weapons and props | Versioned recipe pipeline | GLB + measured manifest + catalog entry |
| Soldier helmet/carrier | Dedicated Blender source + packaging scripts | Fitted rigid head/torso attachments |
| Known humanoid bodies and animation takes | Body/motion recipes; native bank ingesters | Body profiles or sampled pose banks |
| Helicopter | Dedicated original Blender source + bake/validation | GLB with named rotors and animation |
| Desert, outpost and background geology | Dedicated source scripts + runtime terrain data | GLBs, textures, layouts and collision height data |
| Powers, VFX, weather, HUD | Procedural code/data editing | Runtime behavior and presentation; no universal asset package |

## Shared versioned package pipeline

Recipes live in `authoring/recipes/`. The entry point is `authoring/bin/authoring.js`; adapters, budgets and validation are in `authoring/adapters/` and `authoring/lib/`. Output lives under `public/authored-assets/<id>/v<version>/` with `catalog.json` alongside the packages.

Install the locked dependencies if absent:

```powershell
npm ci
npm --prefix authoring ci
```

The CLI supports `build`, `validate`, `catalog`, `report` and `reproduce`. Supply a recipe path for a focused build; bare `build` visits every recipe. `reproduce` builds into scratch storage and compares outputs with recorded package hashes. It needs the original declared sources; normal gameplay uses shipped outputs.

Validation checks identity/version, source and output hashes, bounds, sockets, compatibility, budgets and pose/event contracts. A structural pass does **not** mean visual approval. Keep `acceptance.visual` and blockers honest. Review actual gameplay mounting and movement after inspecting the package viewer.

### Concrete example: Kuchler rifle

Edit `authoring/recipes/equipment/kuchler-rifle/model.js` and its `recipe.json`; retain `provenance.json` and `LICENSE.txt`. This is a fictional War World: Earth rifle, not an AK74.

```powershell
node authoring/bin/authoring.js build authoring/recipes/equipment/kuchler-rifle/recipe.json --force
node authoring/bin/authoring.js validate public/authored-assets/equipment.kuchler-rifle/v2
node --test tools/kuchler-equipment.test.mjs tools/kuchler-runtime.test.mjs tools/desert-unit-equipment.test.mjs
```

`v2` is the current fitted output. A geometry change can produce a new version: use the version printed by the build when validating and selecting it. `--force` also refreshes manifest metadata when geometry bytes are unchanged. Build updates the catalog.

The rifle uses a grip-local **−Y barrel direction**, named physical magazine/charging-handle meshes and grip/support/muzzle/magazine/charging-handle/stock/holster sockets. Runtime mounting is in `src/engine/authored-equipment.js`; production two-hand fit is in `rifle-pose.js`. Select an approved package with an armory row's `equipmentAsset`; do not encode combat damage into the mesh recipe.

The current tests cover repeatable bytes, real GLB mounting, support-hand fit, physical reload, muzzle firing, finite ammunition and stale-load/disposal behavior. The older static equipment-viewer aim path still has a documented support-fit blocker; production carrier checks are separate. Native visual review remains necessary.

## Soldier equipment

`assets-src/frontline-clone-kit/v3/` holds the existing original PowerWorld helmet/carrier source and reports. It is separate from the MIT Earth rifle. The shipping file is `public/models/frontline/clone-kit.glb`.

The current project-local Blender invocation and source packaging are:

```powershell
& ".\assets-src\tooling\blender-4.5.0\blender-4.5.0-windows-x64\blender.exe" --background --threads 4 --python tools/clone-kit-author.py -- --v3
& ".\assets-src\tooling\blender-4.5.0\blender-4.5.0-windows-x64\blender.exe" --background --threads 4 --python tools/clone-kit-validate.py -- --v3
node tools/clone-kit-package.mjs --v3
node --test tools/clone-kit.test.mjs tools/clone-kit-v3.test.mjs tools/clone-equipment.test.mjs
```

These build/package the **source candidate**, not its automatic adoption into `public/`. Inspect the v3 README, measured fit and candidate GLB before an explicit shipping-file update. Packaging invokes glTF Transform 4.5.0 and can require its first download.

Keep `clone_helmet_head` attached to driven `parts.head` and `clone_vest_torso` to driven `parts.torso`. Preserve scalar materials, fitted bounds, ragdoll support and per-fighter disposal. `src/engine/clone-equipment.js` owns attachment; `src/data/desert-unit-presentation.js` selects military presentation. A cosmetic equipment load must never grant flight, refill ammunition or replace player-owned slots.

## Characters and animations

**Known bodies:** `authoring/recipes/bodies/` builds profiles over the existing catalog bodies. It does not import an arbitrary new skeleton. `src/data/hero-models.js`, character definitions and Studio profiles select appearance. Creator packages use the validated `lsw-character` format in `src/tool/character-package.js`; they contain recipe/profile data, not executable engine code.

**Motion packages:** `authoring/recipes/motion/` uses the `quaternius-ual` and `cmu-asfamc` adapters. Use the shared build/validate route for one recipe. Native animation sampling uses the `pw-pose-bridge@1` 45-value layout; preserve named slots, loop/contact metadata, posture and timed action events. Runtime package selection is separate from authoring.

**Existing baked banks:** these verified ingesters overwrite their named generated data files:

```powershell
node tools/ingest-hero-bodies.mjs
node tools/ingest-locomotion.mjs
node tools/ingest-strikes.mjs
node --test tools/authored-character.test.mjs tools/motion-banks.test.mjs tools/motion-action-events.test.mjs
```

The body ingester writes `src/data/hero-body-bank.json`; the others write locomotion/strike banks. Source requirements are in [Pinned sources](../authoring/SOURCES.md). Preserve the input hashes and generated-file line-ending rules. A different imported body needs an explicit bone/attachment/ragdoll adapter and native fit checks; that general importer is a future gap.

## Aircraft

The current original helicopter source is `assets-src/frontline-attack-helicopter/author-attack-helicopter.py`, with a Blender source and README beside it. After authoring its raw GLB, `node assets-src/frontline-attack-helicopter/bake-attack-helicopter.mjs` writes the shipping GLB and provenance/validation. Unlike clone-kit packaging, this bake **does update `public/`**.

Preserve `hull`, `main_rotor`, `tail_rotor`, their physical pivots, metre scale, +Y up/+Z nose and `RotorLoop`. The runtime in `src/engine/frontline-aircraft.js` applies the native scale and animation cadence. Its helicopter has separate combat/piloting owners; the patrol jet remains unarmed presentation. Copying an Earth jet mesh would not supply flight, weapons or AI.

```powershell
node --test tools/frontline-aircraft.test.mjs tools/aircraft-combat.test.mjs tools/aircraft-piloting.test.mjs
```

There is no shared aircraft recipe adapter yet. Existing fetch scripts acquire specific licensed source models; they are not a deterministic replacement for a pinned, validated shipping bake.

## Terrain and the approved desert

Keep the accepted desert layout as the baseline. `src/engine/frontline-terrain.js` declares the active visual assets; `frontline-ground.js` joins visible ground with native height/collision data. `frontline-escarpment-data.json`, layouts and authored banks participate in traversal, not just rendering.

Existing source routes include `tools/author-frontline-escarpments.py`, `author-frontline-escarpment-bed.py`, `author-frontline-background.py`, `author-frontline-talus.py` and `build-frontline-outpost.py`. They use Blender and declared local inputs; some produce candidates while the outpost builder also writes shipping assets. Read each script's output paths before running it.

`tools/publish-frontline-escarpment-candidate.mjs` performs an explicit candidate adoption and requires a local Sharp module path argument. `prepare-frontline-background-runtime.mjs` saves source snapshots and prepares runtime files. These are specialized steps, not one portable terrain build command; do not invent missing arguments or publish an unreviewed candidate.

```powershell
node --test tools/frontline-ground.test.mjs tools/frontline-escarpment-runtime.test.mjs tools/frontline-outpost.test.mjs tools/frontline-escarpment-aircraft.test.mjs
```

Check visible ground against walking/flight/carry/projectile collision, outpost access and aircraft clearances. A mesh preview alone cannot certify a traversable arena.

## VFX, weather and UI

These are **procedural code/data routes**, not versioned GLB recipes. Powers start in character data and `src/engine/abilities.js`; effects live in `vfx.js` and their contact owners, including `beam-ground-contact.js`. Weather definitions are in `src/data/weather.js`; ambient/owner layers and physical responses are in the weather modules. Daylight presets are in `src/data/daylight.js`.

HUD work uses `src/engine/hud.js`, `hud.styles.js`, `hud-layout.js` and shared `src/styles/tokens.css`. Keep combat input/state authoritative; a visible meter or effect must report an actual runtime state. Preserve the warm-neutral/gold direction and existing character color rules.

```powershell
node --test tools/beam-ground-contact.test.mjs tools/weather-layer.test.mjs tools/hud-layout.test.mjs
npm run build
```

There is no general VFX graph exporter, weather recipe packager or HUD theme importer. Native input, timed sequences, readability and cleanup need direct testing after code changes; a build pass is not visual acceptance.

## Donor and acceptance rule

Record the exact source path/revision/hash, author, license notice, redistribution terms and any conversion in the recipe or asset provenance. Preserve physical dimensions, axes, named joints/sockets and resource ownership; measure the output instead of assuming two similarly named rigs are compatible. Keep licensed original sources in their declared local locations and avoid copying entire donor repositories or tool installations.

Earth first-party code uses its MIT notice; other sources keep their own terms. Quaternius inputs carry CC0 documentation. CMU-derived motion is marked `runtime-embed-only` in this pipeline and is not a standalone motion-pack release. Existing junctions may already point to the root's source assets; never overwrite them as if they were new copies.

Finish each change with source/build provenance, package or contract tests, native gameplay verification and the exact visual status. Record remaining gaps in the [tracker](TRACKER.md); source presence, deterministic build, structural validation and acceptance in play are distinct milestones.
