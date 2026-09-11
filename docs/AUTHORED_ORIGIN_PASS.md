# Authored beam / charged-shot origins — September 8, 2026

Bounded implementation of the active custom-character objective, not a full-game
or animation-quality approval. No map, combat balance, mouse-wheel mapping, lock-on
acquisition or existing kit default was changed.

## What changed

- Studio's existing attack inspector offers **Attack origin** for beam and charge:
  Kit default, Left palm, Right palm, Combined palms, Chest and Eyes.
- The profile stores the choice as a sparse identity-checked override, compiled
  into ordinary ability fields. Imported snapshots never become executable kit
  sources. Save/reload, Undo/Redo, package export/import and source reset use the
  existing pipeline.
- The selected palm owns its pose, open-hand shape, gathering field, traveling
  beam muzzle and released charged projectile. Rig replacement resolves current
  anatomy rather than retaining a retired hand reference.
- Disjoint beams retain independent steering and release. A charged off-hand
  waits for its own preparation-to-brace history, not the other stream's readiness.
- Explicit native `castHand` also overrides the implicit charged-martial fallback;
  unmodified KANO remains a combined-palms caster.

## Two review discoveries that changed the implementation

1. The original new tests used legacy `armL`/`armR` names as anatomical truth.
   Front/rear screenshots contradicted that assumption. The face looks +Z;
   `armR` is +X/anatomical left, also confirmed by Quaternius `hand_l` mapping.
   New `palmCastSide` metadata is anatomical; existing rig, gun, volley and
   absent-field behavior is unchanged. Nine geometric/source-bone cases cover
   procedural, male and female bodies with absent/left/right metadata.
2. The initial gameplay harness manually changed fighters without replacing the
   previous fighter's HUD and missed caught engine errors. The screenshot showed
   ENGINE FAULT. The test now selects the imported character through the actual
   title screen, clicks Enter, and asserts both console errors and the engine's
   `_errSeen` ledger. Earlier `review` gameplay output is **not clean evidence**.

The early `review` and `retained` capture directories also predate the anatomical
label correction. Only the **`anatomical`** capture is authoritative for left/right.

## Verification routes

Final retained results (all processes completed):

- `npm run test:authored-origins`: **216/216**, exit 0.
- Full root: **1,608 tests; 1,604 pass, the same four cloth failures**, exit 1,
  139.77 s. Log: `artifacts/authored-origins/anatomical-root.log`.
- Vite build: **passes**, 9.54 s, existing large-chunk warning. Log:
  `artifacts/authored-origins/final-build.log`.
- Corrected Studio: five UI-origin cases pass; 720 motion states, 233 emitting
  ground-beam states and 72 charging air states; real contact in both chapters;
  zero page/console errors. Ground source takes are `Jog_Fwd_Loop` and `Walk_Loop`.
- Native gameplay: **210 states, 113 emitting states, one real charge release**;
  measured launch-source gap 0; console and `_errSeen` both empty.
- Final source-side review accepts the bounded repair: absent fields preserve
  all 50 shipped beam/charge defaults, anatomical hand metadata matches source
  bones, and explicit paired style keeps priority. It is not an art verdict.

[Corrected 12-second motion clip](../artifacts/authored-origins/anatomical/authored-origins.mp4)
is H.264, 1280×800, 240 rendered frames at 20 fps. The direct rendering capture
does not include the DOM labels; first six seconds are the grounded beam,
last six seconds the airborne charge. Both chapters include preparation/contact
and recovery; inspection-angle cuts do not change the simulated sequence.
Supplementary four-angle stills and machine-readable evidence are in the same folder.

```powershell
npm run test:authored-origins
npm run inspect:authored-origins
node --test --test-concurrency=4 tools/*.test.mjs
npm run build
```

The browser route uses isolated Playwright storage, imports an ordinary custom
character, changes controls through the Studio UI, checks all five origins,
Undo/Redo, local Save/reload, UI export and narrow layout. It records two continuous
six-second Studio chapters (ground beam; airborne charge), each stepped at 60 Hz
and captured at 20 fps, plus front/both profiles/rear anatomical stills. This is
silent scripted travel with native pose/attack/contact, **not gameplay FPS proof**.

The separate gameplay route imports that exported package through Studio, enters
the custom fighter through the native PowerWorld title, then uses real D/LMB and
A/Q edges with native controller/physics/pose/emission. Lane positions are set up
and bots disabled; this is not takeoff, balance or AI acceptance.

Motion is the retained source locomotion plus procedural casting overlays. No new
imported casting clip was added. Game Studio requires screenshot checks; the
animation-authoring skill required source identity, final anatomy and whole
sequences rather than a still-only approval. Its TypeScript/Vitest/lint commands
refer to a different repository layout; this plain-JS repo uses Node tests and
Vite build and has no corresponding lint/TypeScript scripts.

## Still open

- The entire original objective remains active. This is not BFP-identical or 10/10.
- Four existing cloth regressions remain; no cloth source was changed here.
- Earlier takeoff self-obstruction and steep cape-dominated camera close-ups remain.
- Legacy volley/editor hand labels still follow their existing named-lane contract;
  this pass intentionally does not migrate those saved profiles or weapons.
- The procedural body's floating-looking belt, simple face and weak material
  definition are still visible. The ordinary closed off-hand has a rough silhouette.
- The charge impact's large opaque flash and the full character/aim/obstacle matrix
  need further visual work. A source-skin side test is not complete skin-animation
  acceptance. Imported casting assets, target-hardware performance and Robert's
  subjective feel gate are not cleared by these results.
