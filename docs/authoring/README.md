# PowerWorld authoring pipeline

Recipes in, validated versioned asset packages out. Rebuilding a committed recipe never calls an
AI, never needs a paid service and never depends on an edit nobody wrote down.

Branch: `codex/authoring-pipeline`, worktree `D:/powerworld-authoring`, base
`bcf63279cdf8c99cbdbc5ad66ee142645de93639`. This branch owns `authoring/`,
`public/authored-assets/` and `docs/authoring/` only. It edits no engine, tool, data, root package,
Vite or deployment file. Integration seams it needs are recorded in [INTEGRATION.md](INTEGRATION.md).

## Clean checkout

```bash
git clone <repo> powerworld && cd powerworld && git checkout codex/authoring-pipeline
npm ci                                  # the game's own dependencies (three, vite, playwright)
cd authoring && npm ci && cd ..         # the authoring package's pinned dependencies
node authoring/bin/authoring.js baseline   # measure production assets → budget limits
node authoring/bin/authoring.js build      # every recipe under authoring/recipes
node authoring/bin/authoring.js validate   # every package under public/authored-assets
cd authoring && npm test                   # validator, package I/O, adapters, events
```

Licensed source motion and bodies are not committed (the repository already keeps them under
`assets-src/` untracked, pinned by SHA-256). See [SOURCES.md](SOURCES.md) for the fetch steps; a
build whose source is missing fails with the file name and that document's path.

## Look at it

```bash
npm run dev -- --host 127.0.0.1 --port 5181 --strictPort
# open http://127.0.0.1:5181/authoring/viewer/index.html
```

The viewer lists every package, filters by id/kind/tag, shows source and build versions, budgets
against limits, sockets, clip events and the raw manifest, and (from M2) plays clips on the
production rig with skeleton/socket/hit-zone overlays. It is branch-owned; the proposed Studio
entry point is in INTEGRATION.md.

## Documents

- [MANIFEST.md](MANIFEST.md) — the package contract and its validation codes.
- [WORKFLOW.md](WORKFLOW.md) — how an author goes from an approved reference to an approved package.
- [SOURCES.md](SOURCES.md) — pinned external sources, hashes and terms.
- [COMPATIBILITY.md](COMPATIBILITY.md) — how packages relate to the engine's pose bridge, rig sockets and `lsw-character`.
- [PERFORMANCE.md](PERFORMANCE.md) — the measured baseline and the derived budgets.
- [INTEGRATION.md](INTEGRATION.md) — exact seams the main task would own, with evidence.
- [LIMITATIONS.md](LIMITATIONS.md) — what is not done and why.
