# Asset-backed superhero bodies

## Scope

Optional, licensed skinned superhero anatomy must run in the production Fighter,
Studio, and exported custom-character recipes. This is a first vertical slice of
the requested game-ready asset pipeline, not arbitrary GLB/FBX upload support.
Existing procedural bodies and saved profiles remain unchanged by default.

## Architecture

Use Quaternius Universal Base Characters (CC0), retrieved from the community
mirror at revision `0cc5dc351f4fffbe13a25381e73cb0a1aea67f47`. Retain source files
and hashes. An offline Node ingest emits geometry, skin weights, bind joints,
and provenance as bundled pure data; runtime does not fetch third-party URLs.

The engine's existing flat procedural rig remains authoritative for motion,
collision, final hand/weapon contact and ragdolls. An optional SkinnedMesh layer
maps source bind-space anatomy onto those final driven surfaces. Skin animation
must run after combat/contact and in the ragdoll update path. Original mesh
drivers stay present; their body surfaces are hidden independently of weapons,
cape, status effects and ground markers. Disabling the asset restores them.

Two explicit model choices, superhero-male and superhero-female, are available
alongside procedural. Costume palettes are local presentation, not balance.
Imported anatomy uses the current frame and form. Asset selection persists in
validated profiles and small v1 character packages as a known catalog ID, never
as executable data or a binary blob. Unknown IDs are rejected.

Implementation refinement from integration review: source bones inherit natively
below their authoritative driven meshes. Root/ancestor changes after animation
(body separation, portals, portraits and travel) therefore propagate without a
second cached-world-space skin update. Procedural garment shells are explicitly
out of this catalog slice; the source surface is a fitted suit while signature
headgear, weapons, boots, cape and insignia retain their existing ownership.

## Acceptance

- Geometry and skinning are from the actual named source; provenance and local
  source availability are testable. No source animation claim for procedural poses.
- Root YXZ/unscaled contract and gameplay outcomes unchanged by body choice.
- Rest, moving, hovering, guard, light strike, heavy strike and ragdoll show no
  detached limbs or one-frame bind reset. Hands and weapons use the final pose.
- Review front, both profiles and rear, five phases plus wrap, and full sequences.
- Both body choices work after Studio undo, save/reload, form changes, package
  export/import and Play Test. Invalid values fail without damaging saves.
- Dispose resources when actors/forms are replaced. Browser console stays clean.
- No map or camera recalibration, external publishing, account changes, new
  dependencies, paid assets or silent migration of saved custom poses.

## Alternatives considered

Directly playing imported clips as a second controller would fight current
attack contact and physics. A detached asset viewer would not improve gameplay.
The chosen final-pose skin adapter preserves one animation authority while
providing continuous source-authored anatomy. Arbitrary skeleton import needs
separate mapping/validation UX after this tested catalog adapter.

## Execution authority

The user's standing autonomous continuation request authorizes this local game
and editor work. Preserve the existing dirty D:/lsw checkout; no commits, branch
changes or worktree moves as a side effect of this slice.
