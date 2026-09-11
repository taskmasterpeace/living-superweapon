# Beam and hand cover contact — bounded correction pass

This is progress toward the active independent-combat goal, not a claim of universal clipping clearance or AAA acceptance. Game Studio's production Three.js/playtest path and the animation-authoring acceptance checks kept the evidence on actual FK meshes, travelling streams and real Fighter damage.

## Reproduced defects and implemented corrections

- A radius-0.05, speed-2000 beam crossed a thin wall on frame one at 30/60/120 Hz (tips at 66.667 / 33.333 / 16.667 instead of the near contact surface at 3.04). Stream segments now use analytic earliest contact across cover and interiors.
- Cover list order could select the wrong obstacle; interior walls could fail to protect destructible cover behind them. The shared sweep returns contact kind/identity, and only the first contacted destructible cover receives carving damage.
- Packet motion, including newborn packets and released tails, is swept as well. This prevents a whole detached segment jumping across thin geometry between frames. Spatial rechecking has a Float32-sized tolerance; temporal motion retains the exact radius.
- SOL's simulation body remained outside a wall beginning at z=2.38, but the extended palm was at z=3.493 and emitted from the far side. New `arm-cover.js` retracts the actual unarmed arm after easing and before final wrist aim. The beam still samples the actual palm or combined-hand midpoint.
- A hand-center-only height check was insufficient over low cover. Limb queries explicitly expand obstacle tops by the hand bounds; default projectile/beam height rules remain unchanged.
- Neutral forearms could enter the breathing ribcage on recovery, reproduced without any wall or casting. A 0.06-radian outward rest roll clears that existing seam.
- Forgiving beam/body contact padding could damage a real fighter protected by a thin wall (10 HP in 0.5 seconds in the regression). Each accepted contact candidate now checks obstacle visibility. Independently exposed segments of a wrapped hose can still make contact.

No physics-root repositioning, hidden replacement muzzle, new dependency, map redesign, camera change, or destructive Git operation was used.

## Verification

- **352 tests passed** across the broad input, reporter, combat, emission, collision, Studio and motion regression run.
- **91 additional tests passed** for blocking, melee depth, moving melee, heavy strikes, hero skins and capes.
- The new focused files contain **8 beam-cover tests** and **20 hand/body-cover tests**. They include 30/60/120 Hz approach/sustain/release, actual hand/forearm vertex tests against wall and torso, palm/midpoint alignment, low-cover volume and a real protected Fighter.
- Production build passed: Vite 5.4.21, 245 modules. The existing oversized shared chunk warning remains (~4.892 MB minified / 1.742 MB gzip); this is not a warning-free build or a target-hardware performance certification.
- Eight changed JavaScript/test files passed syntax checks; scoped tracked diff whitespace checks passed.
- Fresh live keyboard/mouse movement-and-aim checks passed: SOL travelled 50.913 units (minimum optic alignment 0.999995), SARGE 49.395 units (minimum weapon alignment 0.999967); both recovered after release, zero browser errors.
- Independent read-only review reproduced two edge cases during development, both added as RED→GREEN tests (exposed wrapped segment and low-cover hand volume). The final focused reviewer run passed 30 tests, with the narrower grazing limitation below explicitly retained.

Broad regression command:

```powershell
node --test tools/dual-trigger.test.mjs tools/combat-selection.test.mjs tools/focus-release.test.mjs tools/dual-trigger-network.test.mjs tools/attack-icons.test.mjs tools/broadcast-profile.test.mjs tools/broadcast-frames.test.mjs tools/newscrew.test.mjs tools/news-arena-report.test.mjs tools/broadcast-report.test.mjs tools/directional-transition.test.mjs tools/directional-arm-transition.test.mjs tools/directional-pose.test.mjs tools/attack-emitter-pose.test.mjs tools/beam-contact-feedback.test.mjs tools/attack-pose-authoring.test.mjs tools/ground-motion.test.mjs tools/locomotion-source.test.mjs tools/armed-weapon-fit.test.mjs tools/volley-hands.test.mjs tools/volley-replay.test.mjs tools/attack-tuning.test.mjs tools/hero-hover.test.mjs tools/flight-language.test.mjs tools/flight-wake.test.mjs tools/projectile-contact.test.mjs tools/attack-interception.test.mjs tools/beam-interception.test.mjs tools/concurrent-emitter.test.mjs tools/beam-clash-contact.test.mjs tools/remote-detonation.test.mjs tools/beam-cover-contact.test.mjs tools/hand-cover.test.mjs tools/split-projectile.test.mjs
```

Repeat the focused Node + browser pass with `npm run test:cover-contact` while the dev server is running on 127.0.0.1:5180.

## Visual evidence

Before: `artifacts/beam-cover/near-origin-open-defect.png` shows the forearm through the wall and a beam firing from its far side.

After: `artifacts/beam-cover/verified/near-wall-hold.png` and `thin-wall-contact.webm` show real arm retraction, continuous wall contact and recovery. The fresh browser result records:

- 155 moving dual-eye/palm stream samples, including 90 sustained dual-beam frames; zero target damage beyond the wall.
- 200 near-wall approach/hold/release/retreat samples; minimum tested hand/forearm mesh clearance **0.456 units**.
- Settled palm and beam source both at z≈**1.273**, on the near side; maximum hand/forearm z≈1.754 against wall z=2.38.
- Zero page/console errors.

These are fixed-step inspection recordings in a fresh browser context, not a real-time GPU benchmark, a replacement gameplay camera, or proof of every animation state. Before/after screenshots were inspected directly. Existing default outfit seams/silhouette quality visible in these shots are not hidden or claimed solved.

## Editor and remaining acceptance

The correction is in the shared runtime used by both the game and Studio. This pass adds a repeatable scripted cover rehearsal, **not yet a user-visible Studio cover-preset selector**. No saved character data is migrated.

Still open:

1. Occupied guns, bows, shields and custom equipment need weapon-volume-aware retraction/low-ready poses. This new solver deliberately leaves occupied grips unchanged.
2. Already-protruding shoulders, heads or chest emitters (especially prone flight), arbitrary custom skins/scales, corners, roofs, jumps and hard landings need further motion-state coverage.
3. Beam grazing can be conservative **within one segment**: if its nearest point is occluded while another point is exposed, the exposed part can be missed. Confirmed fixture: radius-1 hose at y=10 from (0,-1.02) to (2.2,-1.02) in XZ, wall x[-0.5,0.5]/z[-0.01,0.01]/top30, target center (0,10,3)/radius2.2. Adding a collinear midpoint x=1.1 can change zero damage to 0.02 HP at dt=0.001. This does not reopen the demonstrated through-wall leak; exact visibility intervals remain to implement.
4. Bloom/light/impact-envelope occlusion, broader live-control acceptance and target-hardware performance remain separate gates.
5. The wider goal also retains competing same-arm/chest channels, charged projectile/cone origins, source-body polish and creator feel acceptance.

Do not mark the overall goal complete from this pass.
