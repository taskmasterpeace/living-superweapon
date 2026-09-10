# Fighter body contact implementation plan

> Execute inline using executing-plans, systematic debugging and test-driven-development. User approved implementation in the attached full plan. Preserve this live dirty checkout; do not stage or commit.

**Goal:** Stop ordinary airborne fighters passing through bodies, including between simulation frames, without turning a teleport into a collision trail.

**Architecture:** Snapshot physical core bounds after controls and rush constraints, before synchronous fighter updates. Resolve relative swept core bounds before melee's contact frame finishes. Native root positions remain authoritative; rendered torso/head/pelvis provide collision dimensions, not hands, weapons or cape. Keep existing non-PowerWorld ground separation and intentional phase/grab/vehicle exemptions.

**Tech stack:** Existing JavaScript/Three.js physics, node:test and Playwright; no physics-engine migration in this repair.

**Spec:** .dream-loop/approved-infantry-air-scope.md, phase 1 moving contacts. This plan closes only the fighter-pair part, not fast terrain collision or the full goal.

## Tasks

- [ ] Add tools/fighter-body-contact.test.mjs using real Fighter objects and Game.resolveBodies. Reproduce fast head-on crossing and exact-overlap failures before production edits. Test parallel near misses, different altitude, moving targets, phase, grabs, vehicles, and frame-local teleport reset.
- [ ] Add src/engine/fighter-body-contact.js with beginBodyContactFrame(entities) returning frame-local root/bounds snapshots and resolveBodyContacts(entities, frame) applying solid-core sweep and overlap response. Bound work by actor pairs, not distance-based microsteps. Preserve tangential travel and do not invent damage from ordinary contact.
- [ ] Integrate snapshot after melee.beginContactFrame and response in Game.resolveBodies. Consume/clear the frame on resolution. Correct obsolete pass-through commentary.
- [ ] Run node --test tools/fighter-body-contact.test.mjs tools/moving-melee.test.mjs tools/rush-safety.test.mjs tools/ability-fist-contact.test.mjs tools/vehicle-body-impact.test.mjs. Then npm run build.
- [ ] Inspect native PowerWorld motion and contact sequence; retain staged diagnostics as staged. Record limitations, evidence and next full-scope action in .dream-loop. No game-complete claim from these tests.
