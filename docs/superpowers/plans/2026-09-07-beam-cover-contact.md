# Beam Cover Contact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Stop live and released beam streams at the first actual obstacle, including thin walls, without making beams instantaneous.

**Architecture:** Reuse the existing analytic obstacle sweep for packet motion and every visible polyline segment. Return obstacle identity from that query so only the first contacted destructible cover receives damage. Keep the simulation's default collision shapes; the reproduced emitter defect extends this plan with final unarmed FK clearance and a neutral-arm rest correction.

**Tech Stack:** Existing JavaScript, Three.js, Vite, Node test runner, Playwright.

**Spec:** `docs/INDEPENDENT_COMBAT_ACCEPTANCE.md`, clipping and correct-origin requirements. This plan closes stream tunnelling, not all nearby-body clipping.

## Global Constraints

- Beams are hoses, not lasers: preserve travelling packets and release tails.
- No map redesign, engine migration, new dependencies or roster expansion.
- Preserve the existing dirty working tree; no destructive Git operations or commits as part of this pass.
- Use real production beam updates and collision geometry; screenshot alignment alone is insufficient.
- The broad combat goal remains active after this bounded pass.

### Task 1: Reproduce and fix beam obstacle contact

**Files:** Create `tools/beam-cover-contact.test.mjs`; modify `src/engine/projectile-contact.js`, `src/engine/projectiles.js`; extend `tools/projectile-contact.test.mjs`.

**Interfaces:** Existing `sweepSplitObstacle(world,a,b,radius,out,ground=true)` retains existing arguments/defaults, gains optional topPadding=0 for limb queries, and adds `out.kind` and `out.target` on a hit. Cover returns its cover object; interior returns its wall; ground has null target. Beam updates reuse scratch vectors/output records without allocating per packet.

- [x] Write production-emission tests at 30/60/120 Hz: radius 0.05, speed 2000, wall at z=3.1 with half-depth 0.01. Assert every post-contact endpoint stays at or before `3.1 - 0.01 - radius`, including release frames.
- [x] Write nearest-contact tests with cover deliberately listed far-to-near and interior before destructible cover. Assert only the nearest cover loses health; the cover behind an interior wall stays intact.
- [x] Run `node --test tools/beam-cover-contact.test.mjs` and record actual behavioral failures before editing runtime.
- [x] Add sweep hit identity while retaining old fields, and use the analytic sweep with `ground=false` for stream segments. Clamp each moving packet to its swept contact so an entire released segment cannot jump through thin cover between frames.
- [x] Run the new test plus `tools/projectile-contact.test.mjs`, `tools/beam-clash-contact.test.mjs`, `tools/beam-interception.test.mjs`, `tools/beam-contact-feedback.test.mjs`, `tools/concurrent-emitter.test.mjs`, `tools/split-projectile.test.mjs`.

### Task 2: Visual verification and nearby-origin reproduction

**Files:** Create `tools/beam-cover-browser.mjs`; generated artifacts under `artifacts/beam-cover`; update acceptance ledger and a scoped pass report.

**Interfaces:** Playwright imports the actual Studio preview, constructs collision walls with matching visible meshes, advances normal poses and production projectiles, and records frames before contact / sustaining / release. Do not change the user's localhost storage.

- [x] Capture a continuous moving eye/hand beam against a visible thin wall in a fresh `127.0.0.1` browser context. Assert stream contact and no page/console errors; inspect the side and close-up screenshots.
- [x] Inspect the actual settled hand relative to a wall outside the fighter's collision radius. If the source is already beyond cover, record it as a separate demonstrated emitter/body-clearance issue; do not silently relocate the source to disguise a protruding hand.
- [x] Run build, related regression suite, syntax checks and scoped whitespace checks.
- [x] Request a read-only independent review under requesting-code-review guidance; address any verified regressions with tests.
- [x] Record exact evidence and remaining gaps in the acceptance ledger. Do not mark the overall goal complete or claim universal clearance.

### Task 3: Retract unarmed firing hands before cover

Browser evidence now reproduces a separate source defect: SOL's body z=0/radius=2.2 clears a wall starting at z=2.38, but the final palm is at z=3.493 and emits on its far side.

**Files:** Create `src/engine/arm-cover.js`, `tools/hand-cover.test.mjs`; modify `src/engine/combat-pose.js` and the near-wall browser scenario.

**Interfaces:** `constrainArmCover(f,arm,side,pole)` runs after arm easing but before the final wrist aim. It consumes the existing world obstacle query and two-bone FK rig, retracts the actual hand with `reachArm`, and never changes fighter position or teleports the emitted source. First bounded acceptance is unarmed palms, two-hand casts and volley hands on grounded/hovering rigs. Equipment and already-protruding shoulders/head need separate acceptance, not an unsupported universal claim.

- [x] Write failing actual-Fighter tests through approach, sustain, release at 30/60/120 Hz. Probe rendered hand/forearm vertices against a wide wall and retain target-ray/muzzle alignment assertions.
- [x] Sweep shoulder to hand using the actual hand's conservative bounds; solve the reachable near-side hand in arm-parent space with an outward elbow pole. Apply collision constraint before final wrist contact so the source and pose agree.
- [x] Run the new tests plus concurrent-emitter, volley-hands, directional-arm-transition and armed-weapon-fit regression tests.
- [x] Capture the same near-wall side view after the change and compare with the saved defect screenshot. Check no arm or palm teleporting, no detached beam, and no damage through the wall.

## Execution notes

- The named narrow pass is implemented and verified; the overall goal remains active.
- Expanded scope followed actual RED reproductions: near-wall palm protrusion, low-cover hand volume, neutral forearm/rib seam and beam hit-padding occlusion.
- Direct captures were side and close-up views, backed by complete tested hand/forearm vertex checks; no claim of an exhaustive camera-angle review.
- Review's remaining same-segment partially exposed grazing case is conservative and recorded with its exact reproduction in `docs/BEAM_COVER_CONTACT_PASS.md`.
- Full evidence and deliberately unclosed equipment/custom-body/editor/feel gates are in that pass report and the active acceptance ledger.
