# Head, neck and ragdoll core — scoped repair

The original independent-superhero-combat objective remains active. This pass repairs two visible procedural-rig defects. It does not certify complete model clearance, full-body ragdoll quality, BFP parity or AAA feel.

## Observed defects and cause

Matched TITAN flight/handoff captures showed the torso dropping away from the head before physics advanced. The physics `chest` point already represented the torso mesh center, but the renderer placed the torso halfway between `chest` and `pelvis`. Eight production-rig cases measured an immediate 0.837–0.976-unit torso displacement. The old single-axis orientation also discarded captured core facing and roll.

Separately, the neck was a static torso child even though the head is an independent aim driver. Mild static head-turn fixtures were already connected; the actual ragdoll sequence exposed the missing connection. Fixing the torso anchor alone did not make that sequence pass.

## Implementation

- `ragdoll-core-pose.js` keeps torso, pelvis and head at their actual physics-center anchors. Shoulder/hip spans provide orientation frames, with each mesh's captured orientation retained as an offset. Degenerate spans retain or transport the last valid orientation. No forces, constraints, KO rules or simulation timing changed.
- `hero-neck-surface.js` deforms the existing neck geometry between embedded chest/head anchors after the final pose. Both rim disks are fitted inside the actual owning mesh triangles. It adds no draw call and does not move the head, chest, root, eye sockets or firing direction.
- `hero-limb-surface.js` invokes the neck adapter through the existing final-surface update path, including ragdoll application/restoration and rebuilt forms. Mutable-geometry ownership remains compatible with decoys and disposal.
- Cached triangle planes and barycentric data replaced the initial expensive per-update ray scan. The local changing-pose microbenchmark decreased from about 0.893 to 0.062 ms per fighter. This is not target-hardware or full-scene performance certification.

The surface adapter targets the current procedural head/chest topology; imported skinned bodies retain their existing skin/bone path. It is not a general-purpose arbitrary-mesh neck retargeter.

## Verification

New production-rig tests: **23 passing**.

- Nine core tests: SOL/TITAN/KANO/SARGE on ground and in flight preserve core centers/orientations at handoff; an additional coherent rotation/translation case preserves the captured core pose. All nine failed before the fix.
- Fourteen neck tests: static independent head rotation; 240-frame ragdoll connection; actual rim containment on normal and custom proportions; exact restoration; and real optic firing during strafe/hover/flight at 30/60/120 Hz. The static cases were existing-behavior safeguards, not evidence of a previously failing static pose.
- Live gameplay input: SOL eye beams and SARGE gunfire while moving sideways, followed by release and movement recovery. Minimum sampled emission alignment was 0.999995 and 0.999999 respectively; both recovered; no browser errors. This check dispatches real input but steps simulation with rendering disabled, so it is not a real-time performance test.
- Broad regression: **682/682** tests across 61 files, followed by **18/18** browser-backed Studio profile tests in a separate GPU lane: **700 passing total**.
- Independent read-only review sampled a further 14,220 ragdoll frames across the 55-character roster and custom frame extremes. No inward neck triangles, sampled rim escapes, non-finite vertices or bounds escapes were reported. This is additional review evidence, not part of the 700-test count.
- `npm run build` passed: Vite 5.4.21, 252 modules. The existing large-chunk warning remains (shared Studio profile chunk approximately 4.91 MB minified / 1.75 MB gzip).
- Syntax checks passed for the two new adapters and `ragdoll.js`. This JS project does not contain the animation skill's named TypeScript/Vitest gates; no claim is made that those gates ran.

Repeat the focused production tests, inspection capture and real input check with `npm run test:head-neck` while the local Vite server is running on port 5180. The browser tools use a fresh `127.0.0.1` context, without altering the user's `localhost` saved profiles.

## Inspected visual evidence

- Before: `artifacts/ragdoll-core/before/core-motion.webm` and `results.json` — 602 sampled states, no browser errors.
- Final: `artifacts/ragdoll-core/final/core-motion.webm` and `results.json` — 602 sampled states, no browser errors.
- Each recording covers actual TITAN and SOL production flight poses, no-step handoff, fall/contact and terminal hold. Each case also has flight, handoff, quarter, mid, three-quarter and terminal PNGs.
- These are silent, stepped inspection recordings with explicitly labeled inspection cameras, not the gameplay/BFP camera or real-time FPS evidence. The final recording is 56.16 seconds including capture/UI time.

Direct comparison confirms that the core no longer drops at handoff and the head remains connected during the inspected fall. It also exposes unresolved quality problems; the final footage is not presented as a polished full-body animation reel.

## Still unacceptable / next work

1. **Ragdoll cape:** SOL's cape retains its last flight shape and sticks up during the fall/terminal pose. Live cape airflow is not updated in the ragdoll branch. It needs a dead-body cloth/gravity treatment with pinned attachment, collision and restoration tests—not simply hiding the cape.
2. **Limb and equipment handoff:** this pass preserves the core, not every wrist, boot or weapon's captured world orientation. The existing limb swing and grip placement need a separate pose-continuity audit.
3. **Full-body landing contact:** point collision radii do not prove thick/custom body meshes stay above the ground. Actual mesh contact and settling remain to be measured.
4. **Other visible issues:** conspicuous shoulder caps, front-view charge occlusion, custom gear clearance and broad anatomical limits remain open in the main acceptance ledger.

Game Studio and animation-authoring guidance shaped the production-rig tests, matched visual inspection and explicit separation between simulation correctness and animation/feel acceptance. A passing representative suite is not full-goal completion.
