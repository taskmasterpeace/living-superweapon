# Equipped firearm motion and contact — 2026-09-07

This is a bounded part of the active independent-superhero-combat goal, not a whole-game or universal clipping approval. No map design changed. Game Studio's Three.js/playtest workflow and the animation-authoring acceptance checks drove actual equipped-motion captures and production-path tests.

## Fixed and reproduced

- **Rounds and flashes were detached from the gun.** Moving SARGE measured about 1.1 world units from his barrel; MERC's selected left pistol measured about 3.9 units. Registry rifle, pistol, shotgun, SMG and sniper models now have named barrel-end sockets. Gunless rifle-type repulsors still use their hand. Eye/chest powers are not redirected through carried equipment.
- **Final pose matters.** Rifle input records the source identity, target and spread. Launch resolves once after animation, before travel/contact, with one flash per trigger (not per shotgun pellet). Already launched shots and portal transfers are not dragged back to the emitter.
- **The correct hand must aim.** MERC's explicit pistol selects his actual left pistol. The final wrist uses the firing command, while the body/shoulder carrier keeps its easing. A rapid command previously produced a 59-degree barrel/round mismatch.
- **Slow weapons stay ready during a hold.** MERC's pistol previously dropped its cast weight to 0.089 between rounds. Held input now maintains the pose; only actual shots spend energy and produce recoil. Releasing still restores locomotion.
- **Held gear follows the grip.** Chosen/scavenged guns mount on the driven hand, hide replaced native gear and restore it on removal. Native form changes reacquire the new socket. Transferred held guns resolve from the new grip. Actual removal commits pending paid rounds before disposal. Expiry and form-rebuild failures previously displaced a shot by 116 and 110 units respectively.
- **Broad-wall firearm retraction.** Final arm/grip correction accounts for conservative weapon/hand bounds. A rotated torso-relative outward lane prevents folding the retracted arm into the ribs, and persists briefly through intermittent contact. Tests caught and corrected TITAN's forearm/hand/rifle penetrating his actual torso triangles. Recovery remains constrained rather than swinging back through the wall.
- **Bullets cannot skip the tested walls.** Ordinary ballistic rounds now use the existing swept contact manager, not endpoint-only collision. The captured wall-protected dummy previously took 44.8 damage. A second test catches inflated fighter-hit padding that could hit before the wall: 3.2 damage before, zero afterward, with the target still hittable once the wall is removed.
- **Visible Studio rehearsal.** Rifle slots are available in Attack sequence and Co-fire, use production trigger holds and contact, and share the same supported-type predicate with the UI. This does not add rifle-specific numeric tuning fields or a user-visible cover preset selector.

## Verification

- `tools/firearm-emission.test.mjs`: **42 passing tests**. Includes final pose, 30/60/120 Hz, left pistol, gunless repulsor, ground/hover/flight, close/steep/coincident targets, shotgun flash count, portal idempotence, gear removal/form transfer, slow-pistol holds, Studio damage, thin-wall sweeps, hit-padding occlusion, and nine equipped approach/release geometry sequences.
- **520 passing Node regression tests** across 46 files: input/dual-trigger, broadcast, directional and source locomotion, beam/volley contact, melee/guard, military/teleport, forms/skin, packages and Studio inspection. No failed, skipped or cancelled tests in that run.
- Final `npm run build`: Vite **247 modules**, **4.95 seconds**, exit zero. Existing size warning remains: shared `studio-profile` chunk **4,896.69 kB minified / 1,743.09 kB gzip**.
- Scoped whitespace and syntax checks pass. Git reports LF-to-CRLF notices, not whitespace failures.
- Independent read-only review reproduced the expiry, native/held form, rapid-aim, TITAN torso and near-wall padding defects. Regression tests were made to fail before each corresponding correction. Final scoped contact re-review found no blocking defect in that bounded change.
- Final real-input `tools/directional-live-check.mjs`: SOL traveled **50.9125u**, minimum alignment **0.9999953**; SARGE traveled **49.3952u**, minimum alignment **0.9999994**. Both recovered, no browser errors. The held-stance follow-up also passed a separate read-only review and its focused test.

Repro command: `npm run test:firearm-emission` runs the focused firearm/form/interception suite and browser capture. It expects the existing Vite server on `127.0.0.1:5180`.

## Captured evidence

Final artifacts: `artifacts/firearm-emission/verified/`.

- `equipped-motion.webm`: continuous motion with front, right, rear and left inspections and recovery; SARGE carbine, MERC left pistol, TITAN airborne rifle, SARGE close-cover approach/release/retreat.
- `results.json`: **920 frames, 86 emitted rounds, maximum measured barrel/shot gap 0, no browser errors**.
- SARGE close-cover case: **28 rounds, target damage 0**, minimum tested weapon/hand vertex clearance **0.0969 world units** from the wall.
- The visible Studio Motion and attack selectors were exercised before each scripted close-up rehearsal. Tests use a fresh browser context, not the user's saved character profiles.
- Front/side/rear screenshots were directly inspected, including the slow-pistol hold and cover recovery. These are inspection cameras, not a new gameplay-camera framing claim. No target-hardware FPS claim is derived from the headless recording.

The earlier files directly under `artifacts/firearm-emission/` are pre-correction evidence and include the wall-tunneling failure. They are not acceptance captures.

## Explicit remaining limits

1. Eight bounding-corner probes are **not full convex weapon collision**. A narrow post between those rays can be missed. Broad-wall clearance does not close posts, arbitrary corners, every scaled attachment or compound weapons.
2. The tested emitting firearm is constrained. Shields, offhand blades, long melee weapons, custom attachments, already-protruding shoulders/heads, prone flight and every jump/landing transition are not certified.
3. The padded-hit visibility filter uses the nearest body-cylinder surface. Partially exposed grazing contacts can be conservatively rejected; this is not complete visible-surface coverage. Its height sample uses `pos.y..pos.y+10`; the existing generous hit band stays `-4..+14`, and appearance forms do not rescale that collider.
4. Held firing entry can rapidly orient the wrist while the carrier eases. Broader extreme-turn wrist/weapon/face contact needs review across body variants and competing same-arm powers.
5. Numeric firearm tuning, authored support-hand grips for each long gun, a visible cover rehearsal control, and additional independent firearm hand-pattern options remain editor work. A class fallback uses the actually modeled firearm; it does not generate a new shotgun model whenever a kit slot changes class.
6. Visible body seams, military tracer shape/scale and broader character finish remain visual polish work. No new animation/character asset was downloaded in this pass; retained licensed source gait remains in use.
7. All ballistics now take the swept path. A dense-bullet/crowd CPU benchmark and target-hardware render/performance audit remain required; passing representative tests is not scalability certification.

The broad goal stays active. BFP feel, full custom-character coverage and creator acceptance are not established by this representative matrix.
