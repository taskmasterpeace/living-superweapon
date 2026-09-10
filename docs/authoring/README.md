# PowerWorld authoring pipeline

Recipes in, validated versioned asset packages out. Rebuilding a committed recipe never calls an
AI, never needs a paid service and never depends on an edit nobody wrote down.

Branch `codex/authoring-pipeline`, worktree `D:/powerworld-authoring`, base
`bcf63279cdf8c99cbdbc5ad66ee142645de93639`. This branch owns `authoring/`,
`public/authored-assets/` and `docs/authoring/` only. It edits no engine, tool, data, root package,
Vite or deployment file. Integration seams it needs are recorded in [INTEGRATION.md](INTEGRATION.md).

## Clean checkout

```bash
git clone <repo> powerworld && cd powerworld && git checkout codex/authoring-pipeline
npm ci                                       # the game's own dependencies (three, vite, playwright)
cd authoring && npm ci && cd ..              # the authoring package's pinned dependencies
npx playwright install chromium              # once, for the browser checks
# licensed sources: the five-file checklist in SOURCES.md (sha256sum -c block included)
node authoring/bin/authoring.js validate     # every committed package under public/authored-assets
node authoring/bin/authoring.js reproduce    # clean rebuild of every recipe must match the committed hashes
cd authoring && npm test && cd ..            # 35 tests: validator, fixtures, adapters, events, determinism
node authoring/bin/authoring.js build        # rebuilds only what a recipe change makes different
```

`authoring/baseline/production-baseline.json` is committed; `node authoring/bin/authoring.js baseline`
re-derives it from the shipped assets and is only needed when the game's own assets change.
Line endings: `authoring/` and `public/authored-assets/` carry `.gitattributes` with `* -text`, so
Git never rewrites the bytes the manifests hash, whatever `core.autocrlf` says. A clean clone on
Windows with the default `autocrlf=true` was verified end to end; the report is
`authoring/artifacts/clean-checkout-report.md`.

Licensed source motion and bodies are not committed (the repository already keeps them under
`assets-src/` untracked, pinned by SHA-256). A build whose source is missing fails naming the
file and pointing at [SOURCES.md](SOURCES.md).

## Look at it

```bash
npm run dev -- --host 127.0.0.1 --port 5181 --strictPort
# open http://127.0.0.1:5181/authoring/viewer/index.html
node authoring/test/browser/viewer.check.mjs      # catalog + fixture board, screenshot
node authoring/test/browser/motion.check.mjs      # clips on the production rig, 5 bodies, stills
node authoring/test/browser/equipment.check.mjs   # 2 weapons × 4 proportions × 7 poses, stills
node authoring/test/browser/creature.check.mjs    # hound idle/move/attack, CMU walk, hit zones
node authoring/test/browser/record.mjs            # 14 continuous webm recordings → authoring/artifacts/motion/
```

The viewer lists every package, filters by id/kind/tag, shows source and build versions, budgets
against measured limits, acceptance status and blockers, sockets, clip postures and events and the
raw manifest; plays clips on the production rig through `applyAuthoredPose`; mounts equipment by
its primary grip on the hand socket and previews support-hand reach with `reachArm` (full-extension
aim rows are recorded as blocked, not fitted); shows creatures and props with their own skeletons,
sockets and hit zones; exports the package report. It is branch-owned and served by the dev server; the proposed Studio entry point
is in INTEGRATION.md.

## What is in the catalog

| id | kind | adapter | source |
| --- | --- | --- | --- |
| motion.hero-ual | humanoid-motion (20 clips: idle/walk/jog/sprint, crouch, pistol aim/idle/shoot/reload, roll, jump, hit, jab, cross, `fall-supine`) | quaternius-ual | UAL Standard, CC0 |
| motion.hero-ual2 | humanoid-motion (grenade throw, `supine-rise` get-up from supine, `hit-knockback` ending supine, carry walk, heavy hook) | quaternius-ual | UAL2 Standard, CC0 |
| motion.cmu-walk-02 | humanoid-motion (one walk trial) | cmu-asfamc | CMU mocap, embed-only |
| body.hero-standard / -standard-female / -heavy / -lean | humanoid-body (measured rig, sockets, hit zones) | humanoid-body | catalog bodies, CC0 |
| equipment.carbine / equipment.sidearm | equipment (grip/support/muzzle/magazine/holster) — **unapproved placeholder art**; integration blocker `full-extension-support-hand` | procedural-prop | committed factories |
| prop.ammo-crate | prop — **unapproved placeholder art** | procedural-prop | committed factory |
| creature.field-hound | creature (own 27-bone skeleton, idle/move/attack) — **unapproved placeholder art**; blocker `no-creature-runtime` | anycreature | committed spec, vendored MIT compiler |

Ground postures are measured per clip and recorded in every motion manifest (`posture.start/end`,
`category`) and summarised in `catalog.json` (`postures`): supine and get-up clips exist; **no
package contains a prone animation**. No package is visually approved.

## Documents

- [MANIFEST.md](MANIFEST.md) — the package contract and its validation codes.
- [WORKFLOW.md](WORKFLOW.md) — how an author goes from an approved reference to an approved package.
- [SOURCES.md](SOURCES.md) — pinned external sources, hashes and terms.
- [COMPATIBILITY.md](COMPATIBILITY.md) — how packages relate to the engine's pose bridge, rig sockets and `lsw-character`.
- [PERFORMANCE.md](PERFORMANCE.md) — the measured baseline and the derived budgets.
- [INTEGRATION.md](INTEGRATION.md) — exact seams the main task would own, with evidence, and the integration gate.
- [LIMITATIONS.md](LIMITATIONS.md) — what is not done and why.

Evidence lives in `authoring/artifacts/`: stills, continuous recordings (`motion/*.webm` with
`motion/index.json`), per-pose measurements (the equipment results mark full-extension support
rows `blocked`), the fixture board, and the clean-checkout verification report.
