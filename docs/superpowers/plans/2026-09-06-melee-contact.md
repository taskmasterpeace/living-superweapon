# Directed melee contact implementation plan

> **For agentic workers:** Use superpowers:executing-plans for inline implementation, with independent review before handoff.

**Goal:** Stop aerial punches damaging bodies they visibly miss, while making actual punches read as wind-up, extension and recovery.

**Architecture:** Power World's existing strike phases drive a dedicated rig overlay. Resolve its strikes after the current physics/pose update, using the swept fist against the rendered torso/head volumes. The city cone implementation and grab semantics remain unchanged. No target teleport, elastic limbs or map changes.

**Tech stack:** Existing JavaScript, Three.js, Playwright and Vite. No new dependencies.

**Spec:** PRODUCT.md; docs/HIT_REACTION_PASS.md, especially its aerial-contact defect.

## Global constraints

- No map redesign in this pass.
- Shared player/bot ability execution.
- Passing tests does not establish subjective play quality.
- Preserve existing worktree changes and rig/ragdoll hierarchy.

## Task 1: Real directed strike contact

Files: create `src/engine/melee-pose.js` and `tools/melee-contact-check.mjs`; modify `src/engine/melee.js`, `src/engine/entity.js`, and existing altitude fixture.

Interface: `animateMelee(f)` authors the active arm from the existing `mstate/mT/mId` contract; `MeleeSystem.resolveContact(f)` samples the current fist after posing and calls existing damage resolvers only during an active window. Strike entry records a committed 3D direction; recovery returns to the existing locomotion pose. Hand/weapon children are never reparented or stretched.

- [x] Write real Fighter.update fixtures at 30/60/120 Hz, including a nearby hovering target, an elevated/falling target, and a distant target still within the old cone. On each HP loss measure fist-to-rendered-body distance. Require both real hits and real misses.
- [x] Run `node tools/melee-contact-check.mjs`; confirm failures expose invisible contact, not fixture errors.
- [x] Add the directed pose and post-pose resolution. Keep city damage logic and all damage/block/guard-crush branches; change the Power World candidate/contact source only. Use current rendered body transforms, never stale spawn matrices.
- [x] Re-run the new fixture; exercise jab, cross, power, guard, interrupt and recovery. Adapt altitude test to sample the production pose before resolving contact rather than skipping pose/physics entirely.
- [x] Run `npm run test:impacts`, `npm run test:poses`, `npm run test:flight`, `npm run test:camera`, `npm run test:combat`, and `npm run build`. Inspect a production-motion reel with contact visible and request independent review.
- [x] Document exact evidence and remaining feel gaps. Do not commit unrelated user changes or claim broad readiness.

## Footage-driven camera follow-up

The contact reel exposed an unintended dolly-out: automatic shoulder opening increased the
horizontal viewing distance at clinch range. A new rendered-size assertion failed before
normalizing the rear and automatic side components to the authored horizontal boom length.
The fixed composition passes the size gate and existing level-target roster occlusion tests.
Camera, flight, Studio and build were rerun, and a separate independent review checked the
camera math. Details and pre-existing steep-underfoot limitation: `docs/MELEE_CONTACT_PASS.md`.
