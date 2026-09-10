# Integration handoff for the main task

Branch `codex/authoring-pipeline` (worktree `D:/powerworld-authoring`), base
`bcf63279cdf8c99cbdbc5ad66ee142645de93639`. Every commit touches only `authoring/`,
`public/authored-assets/` and `docs/authoring/`. No file under `src/`, `tools/`, root package or
lock files, Vite or deployment configuration is modified; existing engine modules are imported
read-only by the authoring package and the viewer.

Ownership check for the merge:

```bash
git diff --name-only bcf63279cdf8c99cbdbc5ad66ee142645de93639..codex/authoring-pipeline | grep -vE '^(authoring/|public/authored-assets/|docs/authoring/)'
# expected: no output
```

## Integration blockers (declared on the packages, `acceptance.blockers`)

These are reasons integration must **not** proceed as if the package were finished. They are not
passed fits and are not hidden in a limitations list.

| blocker | packages | owner | what the numbers say |
| --- | --- | --- | --- |
| `full-extension-support-hand` | `equipment.carbine`, `equipment.sidearm` | main-task | In the full-extension pistol aim takes (`aim-neutral`, `pistol-idle`) the production rig cannot close the support hand on the weapon: measured gap 0.50–0.88u (carbine) and 0.37–0.65u (sidearm) across four proportions, because the arms reach 3.58u on a 3.92u shoulder span at frame scale 1.12 and a converging two-hand grip is geometrically out of reach with the trigger arm straight. Only the drawn-in reload pose closes within 0.35u (0.02–0.25u). `authoring/artifacts/m3-equipment-results.json` records every such row as `supportFit: "blocked"`. The engine's armed carrier (`rifleContact`, `weapon-support-grip`) must pull the trigger hand back before an aim-pose fit can be claimed. |
| `no-creature-runtime` | `creature.field-hound` | main-task | No creature actor or loader exists in the engine; the package validates and plays in the viewer only. |

Weapons, the crate and the hound carry `acceptance.visual: "unapproved-placeholder"`: they are
procedural placeholders in the engine's silhouette language, not art. Every other package is
`unapproved` (structurally valid, not signed off by a person). No package is `approved`.

## What is ready for integration (this branch's side)

- Eleven validated packages under `public/authored-assets/` with `catalog.json`: three motion
  sets (Quaternius UAL, UAL2, CMU), four bodies, two weapons, one prop, one creature.
- Catalog metadata distinguishes ground postures per clip, measured from the retargeted anatomy
  (`clips[].posture.{start,end}`, `clips[].category`; catalog `postures` per motion package):
  **supine** — `fall-supine` (Death01 ends on the back), `hit-knockback` (ends on the back),
  `supine-rise` (LayToIdle, starts on the back); **get-up** — `supine-rise` only, from supine;
  **prone** — none. Neither free Quaternius tier contains a face-down hold, crawl or prone get-up,
  and nothing is labelled prone.
- `node authoring/bin/authoring.js reproduce` rebuilds all packages from committed recipes and the
  pinned sources into a scratch root and matches every package hash.
- Node suites (`cd authoring && npm test`, 35 tests), four browser checks with stills
  (`viewer`, `motion`, `equipment`, `creature`) and a recording script producing 14 continuous
  webm recordings under `authoring/artifacts/motion/` (`index.json` lists each).

## Seams the main task would own (proposals, with evidence; nothing applied)

### 1. Load a motion package instead of a bundled bank

Today: `src/engine/ground-motion.js`, `strike-motion.js`, `jump-motion.js` import
`../data/*-bank.json` with `with {type:'json'}`. A package's `pose-bank.json` has the identical
shape, and `authoring/test/retarget.test.mjs` proves the UAL package reproduces those banks frame
for frame. Proposed seam: a `MotionBanks` provider that resolves clip ids to a bank, defaulting to
the bundled JSON and optionally overridden by a package id from the profile (`model.assets.motion`).
Risk: none to the current banks; the override path is new code.

### 2. Equipment from a package on the fist — blocked in aim poses until the carrier is extended

Today: `figure.js → buildWeapon(kind)` builds a procedural mesh under `arm.children[2]` and names
`weapon-primary-grip`, `weapon-support-grip`, `weapon-magazine`, `weapon-charging-handle`,
`weapon-stock-contact`. A package GLB mounted by its `grip` socket lands at the same origin and
exposes `support`, `muzzle`, `magazine`, `holster` sockets. Proposed seam: `equipFrom` (the one
path the hands already use) accepts a package id and loads `model.glb` via `GLTFLoader`, hides the
procedural weapon exactly as the viewer's `equipment-bridge.js` does, and the existing rifle
carrier reads the package's `support` socket where it reads `weapon-support-grip` today.
Evidence: 56 mounts (2 weapons × 4 proportions × 7 poses) in `authoring/artifacts/m3-equipment-results.json` —
grip, muzzle and holster pass on every row; the support hand passes on the 8 reload rows and is
**blocked** on the 16 full-extension aim rows (see the blocker table). The carrier must resolve
the trigger-hand pull-back; the package cannot.

### 3. Body packages as the source of holster/sling sockets and hit zones

Today: no holster exists. Proposed seam: `bindHeroRig` reads `body.json` for the selected
catalog body + frame and creates the four sockets as children of `pelvis`/`torso` with the
package's parent-local transforms (`worldOffset` is recorded for cross-checking). Hit zones are
metadata for the body-part proposal in the brief; the runtime collision design is unchanged.

### 4. Creatures

No creature loader exists in the engine (blocker `no-creature-runtime`). A creature package is a
skinned GLB with its own skeleton and idle/move/attack clips; the viewer plays it with
`AnimationMixer`. Proposed seam: a `CreatureActor` that is NOT a `Fighter` (no humanoid rig, no
pose bridge), owned by the main task when creatures enter gameplay. Physics roots, damage and
abilities stay in the game.

### 5. Studio entry point

Proposed: a **Catalog** tab in `studio.html` that mounts `authoring/viewer/viewer.js`'s rail and
report (the stage already reuses the Studio's own `Fighter`/`applyProfile` path). Until then the
viewer is reachable at `/authoring/viewer/index.html` on the dev server; it is not a Vite build
input. Adding it to the production bundle is one line in `vite.config.js` `rollupOptions.input`
(`authoring: authoring/viewer/index.html`) and is the main task's call.

### 6. `lsw-character` reference (schema untouched)

Proposed field on the Studio profile: `model.assets: {body?, motion?, equipment?}` holding
package ids (`^[a-z0-9][a-z0-9._-]{0,79}@\d+$`). `validateProfile` would validate it as plain
ids; `character-package.js` would carry it through unchanged. Nothing in the strict package
schema changes shape.

### 7. Runtime event tracker

`authoring/lib/clip-events.js` `ClipEventTracker` fires each clip event once at 30/60/120 Hz,
across loop wraps, interruption, replay and form replacement (tests in
`authoring/test/clip-events.test.mjs`). It is a proposal for the runtime's footstep/mag/bolt/
grenade hooks; the branch does not wire it into `entity.js`.

## Integration gate (the main task runs this; the branch cannot)

1. Merge into an integration branch; run the repository's existing gates unchanged.
2. Load `motion.hero-ual` through seam 1 in Studio and gameplay; `npm run test:animations`.
3. Extend the armed carrier for the support hand (blocker `full-extension-support-hand`), then
   equip `equipment.carbine` and `equipment.sidearm` through seam 2 on two proportions; survive
   equip/form/KO/dispose; a mixed encounter; no console errors; no new resource leak.
4. Performance in a foregrounded tab at 4K with the assets loaded — the branch's budgets are
   derived from shipped assets but are not a frame-time claim.
5. Visual acceptance by a person, recorded per package in `acceptance` (`approvedBy`,
   `approvedOn`); placeholder art replaced or explicitly accepted.

The whole pipeline is not shipped until this gate passes.
