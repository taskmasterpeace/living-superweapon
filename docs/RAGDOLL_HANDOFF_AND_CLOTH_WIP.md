# Ragdoll handoff, core contact and cloth — WORK IN PROGRESS

**Historical pass report:** the current [neck/cover follow-up](RAGDOLL_NECK_COVER_PASS.md)
supersedes the four-failure snapshot below: 715 broad tests, 714 passing, cloth
settling still failing. Read that report for the latest code, review and evidence.

The full superhero-combat objective remains active. The referenced brief was reread before this pass. The previous turn made verified progress on core/neck continuity; this pass extends the real pose handoff and exposes deeper contact failures. **Cloth is not accepted. The latest broad regression is red.**

## Verified improvements

### Limb and equipment continuity

The old ragdoll renderer reconstructed each limb using only its bone direction and left hands/boots with their old local rotation under zeroed parents. This discarded roll, wrist/weapon orientation and mesh-center offsets without any physics step.

`ragdoll-limb-pose.js` captures the displayed pose relative to each physical segment. It transports the captured frame with the core, swings onto the current bone direction, and preserves the wrist/boot offsets and carried gear. It does not change the physical skeleton or combat input. The old path remains for a missing rig. Pivot scales are restored with the existing transform snapshots.

- Ten new production-rig tests failed before the adapter and pass afterward: four armed/unarmed characters on ground/in flight, coherent skeleton rotation, and a changing forearm carrying its wrist.
- Independent read-only review sampled 8,520 frames across the 55-character roster and frame corners; no non-finite transforms were reported. Handoff and repeated-apply matrix errors were below 1e-14 in that sweep.
- Existing full limb-surface, imported-body, neck and aim-related tests are included in the broad regression.

### Actual core support on flat terrain

Cloth review found the tall/wide corpse's sewn cape seam more than a unit below the floor. Fixed `GROUND_R` values did not represent a scaled, rotating core. This cannot be repaired solely by moving free cloth vertices.

`ragdoll-core-contact.js` captures rigid chest, pelvis and head support points, plus the sewn cape seam, and evaluates downward support using the current physics orientation. `ragdoll.js` uses this radius for core ground contact. It preserves existing launch, impact attribution and strength behavior. Flexible waist vertices are excluded from the rigid chest support; their endpoints remain separately driven.

Two tests failed against the previous fixed-radius implementation and pass now: normal and tall/broad SOL core surfaces and cape attachment during an actual fall. This is **flat-terrain core support**, not proof of complete body/gear clearance, natural final support ownership, cover contact, slopes, craters or imported-body fit. Cover still uses the existing collision radii.

Independent review then passed 21 focused core/limb tests and sampled a further 15,120 seeded flat-ground fall frames across the 55-character roster and eight size combinations. Lowest measured rigid-core/seam clearance was 0.028 units. That supplemental sweep disabled only the known-WIP cloth update to isolate support; physics and core/limb pose application stayed real. It is not cloth approval.

## Cloth implementation and why it is still rejected

`ragdoll-cape.js` advances the existing garment grid with inertia, gravity, fixed shoulder attachment, structural/shear/bend constraints and body/cover contact. It adds no mesh or draw call. It continues after the body sleeps, stops uploading once displayed cloth motion settles, and wakes on attachment motion. Restoration returns the exact captured geometry.

The mutable geometry marker is now set in `bindHeroRig`, before any KO. A real pre-KO hologram test reproduced the clone borrowing the live cape buffer; it now retains its own static snapshot and disposes only that copy.

Initial footage improved the frozen-flight flag but revealed body penetration. Tests were expanded beyond vertices to actual triangle-centroid and edge-midpoint containment. Shared body/cover envelopes and surface corrections improved contact but **do not yet resolve every shared-vertex constraint consistently**. Later triangle corrections can undo earlier clearance. Increasing contact-only iteration count did not reliably fix it and regressed settling; that attempted extra loop was removed.

Current reproducible failures in `tools/ragdoll-cape.test.mjs`, all retained as failing tests:

| Case | Latest first failure |
|---|---|
| Normal body | Cape triangle 179 crosses the head at frame 114 |
| Tall/broad body | Cape triangle 8 crosses the head at frame 120 |
| Thin wall | Cape triangle 46 enters the wall at frame 72 |
| Raised platform | Cape triangle 57 enters the platform at frame 141 |

Fixtures use actual SOL production flight, fixed random launch seed, 60 Hz ragdoll stepping, real rendered mesh parity for core tests, and explicit wall/platform volume checks. Other passing cloth tests cover entry, gravity at 30/60/120 Hz with a stationary body, free-vertex containment, floor/pin invariants, restoration, sleep/wake and hologram ownership. They do not override these failures.

The latest footage also retains sharp cloth folds and unconvincing full-body landing/contact. Cloth self-collision, custom equipment clearance and a dense-combat performance budget are unproven. Earlier microbenchmarks decreased initial cape cost from roughly 2.35 ms/update to 1.33 ms after broad-phase work, but subsequent contact changes invalidate that as a final performance measurement. No target-hardware certification is claimed.

## Latest verification and artifacts

- Broad Node regression: **706 tests; 702 passed, 4 failed**. Exit code 1. The four failures are the cloth cases above.
- Studio profile lane: 18/18 passed earlier in this pass, before the new core-support change. It is not a fresh post-support guarantee.
- Build passed after core-support integration: Vite 5.4.21, 255 modules. Existing large-chunk warning remains; shared Studio profile bundle is approximately 4.92 MB minified / 1.75 MB gzip.
- Syntax checks passed for all three new modules. The animation skill's named TS/Vitest/lint files/gates are absent in this JS repository; no substitute claim that those gates passed.
- Fresh real gameplay input after core-support changes: SOL moved 50.91 units while eye-beaming and SARGE moved 49.40 while firing; both recovered after release. Minimum sampled source alignment was 0.999995 and 0.999999; no browser errors. The tool steps real input/simulation with rendering disabled, so it does not measure real-time FPS.
- Before: `artifacts/ragdoll-limbs-cape/before/` — 602 states, no browser errors.
- Intermediate recordings in `artifacts/ragdoll-limbs-cape/final/` and `artifacts/ragdoll-limbs-cape-verified/final/` predate the last support changes and **must not be used as current acceptance evidence**.
- Latest: `artifacts/ragdoll-limbs-cape-contact/work-in-progress/core-motion.webm`, `results.json` and twelve phase PNGs — 602 states, no browser errors. The recording explicitly says WORK-IN-PROGRESS. Root inspected the latest SOL mid-fall and terminal views; they are not approved as AAA animation.

Recordings are silent, stepped production-rig inspections with labeled inspection cameras, not gameplay-camera/BFP framing evidence or real-time FPS measurements. No saved character profile, gameplay camera or map was changed for capture.

Run `npm run test:ragdoll-handoff` for the handoff/core/surface checks. Run `npm run test:ragdoll-cloth` for the **currently failing** cloth acceptance suite. Capture current motion with `node tools/ragdoll-core-browser.mjs --out=artifacts/ragdoll-limbs-cape-contact --label=work-in-progress` while Vite is running on port 5180.

## Next work

Resolve shared cloth-surface contact constraints without allowing later projections to invalidate earlier solids, and verify corpse/attachment clearance against cover as well as the ground. Diagnose geometric impossibility (such as an embedded immutable attachment) separately from solver ordering; do not silently move pins, hide the cape, relax tests or claim success from clear vertices alone. Then repeat the full difficult-case matrix, inspect full moving sequences and measure current runtime cost. Full-body contact, shoulder armor, charge occlusion and the original independent-combat acceptance requirements remain open.

Game Studio and animation-authoring guidance caused the multi-phase inspection, actual armed production-rig tests and escalation from point checks to rendered-surface checks. The failed evidence is retained rather than turned into a completion claim.
