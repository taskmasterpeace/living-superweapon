# Close-combat view and foreground cutaway

The current measured heavy contact hides 41–59% of the opponent behind the
player and pitches a same-height close lock roughly 56 degrees downward.
Fixed-view probes show that flattening pitch alone cannot reveal the opponent.

Preserve the creator's centered BFP rear boom, original vertical field, free
mouse direction, physics translation and explicit lock ownership. Never restore
the rejected automatic shoulder orbit, distance zoom or global dive flattening.
Keep full authored view-up lift at close lock range. Bound the close parallax
correction with a virtual focus distance, leaving distant/vertical targets alone.
The projected target reticle remains the actual aim point; it need not be at
the exact screen center when two bodies are almost touching.

Add a localized, dithered foreground cutaway in the existing character material
pipeline. Only fragments of the viewed fighter in front of the locked target's
projected head-to-pelvis corridor may be cut. The remainder of the fighter stays
opaque. Do not draw the target through walls, change another fighter, change
shadows, or add another scene pass. Reuse existing material hooks and keep the
shader variant stable through repeated contacts. Data uniforms change per view;
no per-frame material clones or recompiles. Source-backed bodies, capes and
held weapons share the same ownership. No simulated pose/hitbox changes.

Studio Camera gains one bounded **Opponent visibility cutaway** control, zero
for off. The setting is portable and preserves old version-one profile imports.
The game camera and Studio use one implementation; inspection cameras clear it.
It disables on target loss/death/hiding, view-owner change and non-chase views.
This is an original readability enhancement, not claimed original BFP behavior.

Acceptance uses actual before/after rendered target contribution relative to
the same camera/pose with the player hidden. A ray-only metric cannot verify a
shader cutaway. Record geometric obstruction separately from rendered visibility.
Test heavy, light and guard on ground/air, procedural and source bodies, plus
far/free views, acquisition/release, form replacement, walls, 30/60/120 Hz and
editor save/undo/reload/package paths. Review actual motion and pictures. Preserve
the independent BFP hair/boot landmarks and existing full camera regression.

No map design, extra bot strength, new damage, imported-clip changes, account
operations or git integration. This implements the ongoing autonomous request;
it does not redefine or complete the full game objective.
