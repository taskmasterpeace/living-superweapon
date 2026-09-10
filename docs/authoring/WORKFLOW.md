# Author workflow: reference → recipe → package

The pipeline is: approved reference or brief → editable source recipe → pinned local compiler
or importer → normalisation → validation → production-compatible preview → approved package.
Only the first arrow may involve a person or an AI. Everything after the recipe is a file with a
hash, and rebuilding it calls no service.

## 1. Choose the adapter

| you have | adapter | recipe lives at | proof in this branch |
| --- | --- | --- | --- |
| a licensed humanoid glTF/GLB with takes | `quaternius-ual` | `authoring/recipes/motion/<id>/recipe.json` | `motion.hero-ual`, `motion.hero-ual2` |
| a CMU ASF/AMC trial | `cmu-asfamc` | `authoring/recipes/motion/<id>/recipe.json` | `motion.cmu-walk-02` |
| a catalog body you want at a proportion | `humanoid-body` | `authoring/recipes/bodies/<id>/recipe.json` | four bodies, two catalog meshes, three frames |
| a procedural factory (img2threejs method) for a weapon or prop | `procedural-prop` | `authoring/recipes/{equipment,props}/<id>/{recipe.json,model.js}` | carbine, sidearm, ammo crate |
| an anyCreature JSON creature | `anycreature` | `authoring/recipes/creatures/<id>/{recipe.json,creature.json}` | `creature.field-hound` |

Every recipe names its `sources` (paths under `assets-src/` or `authoring/`); the build hashes
them before use and the manifest records the hashes. A factory module or a creature spec must be
listed as a source too, so editing it changes the cache key and the package version.

## 2. Write the recipe

Copy the nearest proven recipe. The fields that matter:

- `id` — stable forever; the version bumps, the id does not.
- `provenance` — author, SPDX license (or `Proprietary-Internal`), `redistribution`
  (`free` / `runtime-embed-only` / `internal`), url, revision, and the terms in one sentence.
  Missing license is a validation failure, not a warning.
- `sourceConversion` (motion) — how the source's axes reach +Y up / +Z forward. The bind
  contract check refuses a source that faces the wrong way rather than silently rotating it.
- `mapping` (motion) — the 17 humanoid slots → source joints. The engine's `L` slot is the
  negative-X limb; map whichever anatomical side lands there.
- `clips` — id, take, loop, handedness, and `events` (authored `t` seconds, or `derive`:
  `foot-contact`, `hand-speed-peak`, `support-hand-leave`, `support-hand-return`).
- `equipment` — `class` (firearm/blade/thrown), `twoHanded`, `hand`. Required sockets follow from
  the class; a firearm without a `muzzle` fails validation.

## 3. Build, read the log, fix, rebuild

```bash
node authoring/bin/authoring.js build authoring/recipes/<path>/recipe.json
```

The log prints what the adapter measured (takes, durations, derived events, triangles, draw calls,
sockets found in the written file, compiler warnings). A refused build names the rule:

- `[budget] drawCalls 8 exceeds the hard desktop limit 4` — the limit derives from what the game
  ships; reduce materials (the hound went from eight materials to four).
- `bind contract: shoulderL must sit on negative X` — the mapping is mirrored.
- `BLOCK: root_containment: chain "head" root ring is 42% outside its host` — anyCreature's own
  gate, with the correction it suggests.
- `package failed validation; previous package untouched` — nothing on disk changed.

A rebuild with identical content keeps its version (`unchanged: ... already holds this content`);
a rebuild with different content writes the next version beside the old one.

## 4. Look at it on the production rig

```bash
npm run dev -- --host 127.0.0.1 --port 5181 --strictPort
# http://127.0.0.1:5181/authoring/viewer/index.html
```

- Motion: pick a body (four proportions, two catalog meshes, procedural), scrub any clip, front/
  side/rear views, skeleton and socket overlays. The pose goes through `applyAuthoredPose`.
- Equipment: the weapon on the hand socket, support hand solved with `reachArm`, muzzle/magazine
  markers, the holstered copy on the body package's socket, judged in rest/aim/reload/walk poses.
- Creature/prop: the GLB itself with its own skeleton, sockets and declared hit zones.
- The Report tab shows budgets against limits, provenance, sources and hashes; Export downloads
  the package report.

Structural pass and visual acceptance are separate. The viewer says so on every package. A
procedural creature that validates is not art-approved; write the approval down in the recipe
(`reference.note`) when a human has judged it.

## 5. Prove it, then commit the package

```bash
cd authoring && npm test && cd ..                # adapters, validator, events, determinism
node authoring/bin/authoring.js validate         # every package under public/authored-assets
node authoring/bin/authoring.js reproduce        # clean rebuild == committed hashes
node authoring/test/browser/motion.check.mjs     # on the rig, with stills
node authoring/test/browser/equipment.check.mjs
node authoring/test/browser/creature.check.mjs
```

Commit the recipe, its sources under `authoring/`, and the built package directory under
`public/authored-assets/<id>/v<version>/`. Never commit `assets-src/` binaries; pin them in
`docs/authoring/SOURCES.md` instead.

## Changing proportions, equipment or a source take

Edit the recipe (or the factory / creature spec), rebuild. The same id gets a new version with a
new content hash, regenerated manifest and regenerated evidence when the checks are rerun. Adding
a third or fourth humanoid was one recipe file each (`body.hero-lean`, `body.hero-standard-female`).
