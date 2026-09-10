# Limitations and honest gaps

Things this branch does not do, with the reason, so nobody discovers them by surprise.

## Motion

- **No rifle takes exist in the free Quaternius tiers, and the full-extension two-hand grip does
  NOT fit on this rig.** That is declared as the integration blocker `full-extension-support-hand`
  on both weapon packages (INTEGRATION.md) with the measured gaps (0.50–0.88u carbine,
  0.37–0.65u sidearm; arm reach 3.58u on a 3.92u shoulder span at scale 1.12). The support hand
  passes only in the drawn-in reload pose. The aim-pose stills are not fits and the equipment
  check records those rows as `blocked`.
- **There is no prone animation in either free tier.** Postures are measured from the retargeted
  anatomy, not read off take names: `LayToIdle` starts SUPINE (chest up, hips on the ground) and
  ends standing, so it is packaged as `supine-rise` (category `get-up`, from supine); `Death01` is
  `fall-supine` (standing → supine); `Hit_Knockback` is a `knockdown` ending supine. `Roll` passes
  through a face-down tuck for a few frames but never holds it, so it is a crouch→standing action.
  A face-down hold, crawl or prone get-up would need a new source and is not claimed; the catalog
  lists `prone: []` for every motion package.
- **Posture is measured at a clip's first and last frame only.** `postureOf` reads one frame
  (torso up, chest normal, hip height over the bind floor); mid-clip postures are not tracked, so
  the roll's transient face-down tuck is not surfaced as metadata. The rule is deliberately
  conservative: thresholds that fall between bands report `transition` rather than guess.
- **Grenade release** is derived from the peak hand speed of `OverhandThrow`; it is an honest
  read of the take, not an animator's mark.
- **CMU** ships one clip as the adapter proof. The database is not vendored (its terms forbid
  reselling converted data; packages built from it are `runtime-embed-only`).
- **Hover/cruise-plus-attack** comparisons are not produced by this branch's viewer: flight poses
  are procedural inside the engine's frame update, which a pose-only preview does not run. The
  repository's existing Studio and gameplay gates cover them; the integration gate must run them
  with these packages loaded.
- **Footstep derivation** on the CMU walk found two contacts in 2.85s (a slower, longer-stride
  subject than the game's stride); the rule is deterministic but tuned on the Quaternius takes.

## Equipment and bodies

- Body sockets are **derived from the driven rig at rest**; a socket offset is not re-solved per
  pose (a holster on a crouching body stays where the pelvis carries it).
- The holster penetration test samples nine points along the weapon against a torso ellipsoid
  and thigh capsules from the rig's own meshes. It catches a weapon inside the body; it does not
  judge whether the strap looks right.
- The two weapons and the crate are procedural placeholders in the engine's own silhouette
  language, authored without a reference photograph. They demonstrate the adapter and the socket
  contract, not final art.

## Creature

- `creature.field-hound` passes anyCreature's fourteen mechanical checks and our structural
  validation. It has **not** been art-approved against the grounded visual direction, and the
  viewer says so on the package.
- The compiler warns about material lightness order (eye brightest); it is a measure, left as-is.
- Creature hit zones: none declared yet. The adapter validates `attach` names against the GLB's
  nodes, but the public bone naming of anyCreature (`LArm1Sh` convention) was not mapped to zones
  in this pass.

## Pipeline

- Builds run in Node 25 on Windows; other platforms were not exercised. Paths are handled through
  `node:path`, and the reproducibility gate runs on a scratch root.
- `authoring/.cache` is keyed on sources, recipe, tool version, adapter version and a hash of the
  tool's own source files. Editing an adapter invalidates its cache automatically; the cache is
  a convenience only, and `reproduce` never uses it.
- The viewer is served by Vite's dev server from the repository root. It is not a build input;
  the production bundle does not include it (see INTEGRATION.md for the proposed entry point).
- No LOD generation: every package records one LOD (level 0). Simplification would need a
  runtime decoder decision the main task owns.
- No textures are produced or budgeted beyond the count.
