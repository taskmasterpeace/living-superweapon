# Optional external task: one reusable building pilot
Priority: after the 19:00 combat slice, or independently without touching its runtime.

## Copy/paste task
Work from PowerWorld integration commit db5b9c945cffc4acfa6d9fa2f32a62662ecae033 in a separate git worktree/branch codex/building-pilot.
You own ONLY assets-src/building-delivery/, public/building-delivery/, docs/building-delivery/.
You are not alone: do not edit runtime, terrain, camera, collisions, AI, Studio, deployment, existing authoring/ or public/authored-assets/. Do not revert others' changes.
Read src/engine/citytiles.js bungalow generation, src/engine/camera-ground.js and src/engine/world.js interior collision/cutaway consumption as reference only.
Produce one original, reusable single-storey military checkpoint building with actual enterable door, windows, one interior room and separate removable roof, matching the desert-forward-base direction. This is an asset pilot, not a new level or full interior system.
Supply source file, optimized GLB, a manifest documenting exported units/axes and measured dimensions, door/window openings, floor heights, separate collision proxy nodes, roof node, material/triangle/draw-call/texture totals, spawn points and provenance/licenses.
Use current native Sarge scale as the measured fitting reference; do not guess meter conversion. Demonstrate doorway/ceiling clearance with reference silhouette and front/top/inside views. No closed collision box across the door.
Deliver wall/floor/roof as independently identifiable nodes so main integration can register actual collisions and roof visibility. Do not assume a node named collider automatically has physics.
Use repeatable export commands, local source acquisition instructions and stable asset IDs. No paid asset purchases/generation without explicit budget.
Return branch/commit, screenshots, GLB/source/manifest, validation output and limitations. Do not claim AI navigation, camera behavior, projectile blocking or gameplay acceptance from asset screenshots.
Main task tests entry/exit, doorway shots, wall collisions and camera clearance after integration. Existing bungalow implementation remains available as fallback.

