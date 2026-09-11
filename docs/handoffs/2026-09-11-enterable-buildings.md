# Task for the independent building AI

Build a reusable enterable-building package for PowerWorld. Begin from the main integration branch's latest committed revision, using a SEPARATE git worktree and branch named codex/enterable-building-pilot. Do not change or switch D:/lsw/.worktrees/sarge-authoring-integration. Inspect existing worktrees before creating one; never overwrite a pre-existing directory. Use your own development port (5183 if free), browser tab and artifact directory. Do not deploy.

You own NEW files only in authoring/buildings/, public/building-delivery/, docs/building-delivery/ and tools/building-delivery/. You are not alone in the repository. Preserve others' edits. Do not edit src/, Studio, camera, combat, weather, audio, root dependencies or deployment. Main task owns runtime integration. If a capability needs runtime changes, document the exact integration seam and deliver a standalone validation fixture instead.

Read root DESIGN.md and docs/superpowers/specs/2026-09-11-powerworld-v1-playable-loop.md. Match existing comic/tactical art; generated reference images are not gameplay evidence.

Deliver ONE small research lab that can also become a city building: front entrance, flank breach panel, case room, stairs and accessible roof. Breakable doors/walls/selected floor pieces, not simulated total structural collapse. Existing runtime whole-building AABBs cannot represent interiors: supply separate stable-ID wall/floor/opening collider data, intact/breached states and bounded debris definitions. Include material/health suggestions, bounds, explicit source units and game conversion. No invisible solid box filling the rooms.

Reproducible package: source recipe, pinned tools/provenance/license, build/validate commands, manifest/output hashes, low-cost render meshes, collider modules, room/opening graph, roof/shelter volumes and reset instructions. Pascal wall/opening schemas are an optional reference; verify interchange before depending on it. Its headless export_glb is currently not implemented. Do not bring its whole editor/render stack into the game.

Provide a short walkthrough recording and annotated views of soldier-scale door clearance, stairs, roof edge, breach opening and large-hero clearance. Report geometry/material/draw-call budgets and known gaps. Main task will verify native camera, projectile collision, rain occlusion, AI paths and destruction against your package.

Done: another person reproduces the package from a clean checkout using documented source acquisition; no hidden manual edits, external credentials or paid generation required to rebuild. Return your commit IDs and a concise integration handoff. Do not merge yourself.
