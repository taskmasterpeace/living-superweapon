# Modular character and interaction authoring delivery

User scope, September 14 2026. Continue until these are implemented and verified; do not replace this scope with a smaller prototype.

1. Shared appearance corrections: neck skin/suit choice, Pharoh claws clear of fingers, rear-folding resting wings, Nightfall ninja mask, named hairstyles, human complexion presets, full suit/shirt/pants/footwear coloring and pattern coverage including waist/knees, hollow-eye infection plus earlier sick stage, supplied Vegas emblem.
2. Persistent character recipes: save per roster identity, reload in creator, render saved recipes in selection and gameplay; replace old default presentation with modular rig without changing physics/powers. Export/import for portable persistence and offline team handoff.
3. Asset workshop usable without an AI: head/garment attachment authoring with named bone/socket, geometric pieces, transform editing, save/import/export, front/rear/side/top views, action preview. Validated schema and documented examples/CLI for another AI or Blender author. No paid API required for local geometry authoring.
4. Animation workshop: source clip inventory and candidate status, timeline/scrub/rate, named bone keyframes, editable startup/contact/release/recovery/control-return events, export/import and repeatable playback. Distinct boomerang vs dart examples. Reuse actual skeleton/clips. Root motion is visual only; simulation owns motion/hits.
5. Interaction rehearsal: flying/ground pickups with actual prop and contact attachment, two-person grab/carry/throw previews across small/large scales; keep victim root/attachment consistent, no double authoritative motion. Ground/air transition and cancel/reset.
6. Live state presentation: flight-first stun/stagger/shock/freeze/sleep/blind/burn-acid/poison-gas/bleed with clear distinctions and recovery, native state drives effects. Human/robot idle variants. Explain actual personality system and human/robot classification separately.
7. Character families: recover Dec-52 robot/rat/hound/cloud from fleet as separate rig families rather than forcing every body onto humanoid bones; alien model and modular contract compatible with intended silhouette. Review in creator.
8. Reuse Martial Arts World animation-factory/source-vault where valid. Transfer adapter/tools/candidates and license/source metadata; rejected/unapproved clips stay candidates. Document speed/contact constraints and human vs superhero traversal.
9. Zombie horde playable rehearsal with current infection owner; blood/head assets and state presentation demonstrate existing gameplay events without adding a second damage owner.
10. Verification and handoff: full animation phase checks, shared material/recipe regression, playable selection/appearance persistence, browser views and motion evidence, build and scoped commits. Update skills and paths.

Worktree: D:/lsw/.worktrees/combat-release-review, branch codex/playable-integration. Fleet remains D:/lsw, distinct committed catalog. Do not overwrite other tasks or merge unrelated changes.

## Implementation checkpoint

Delivered: shared appearance fixes, validated manual parts/keyframe editor, 13 exportable blocking studies, small/large paired contact rehearsal, per-roster persistence, modular game/selection presentation, native status-pose precedence, Dec-52 family import/viewer, humanoid alien base, modular outbreak bodies, contract/CLI/skill and handoff.

Production-content work remains distinguishable from the delivered tools: approving complete cinematic paired throws and status falls; a dedicated digitigrade alien rig; full multi-joint garment authoring; validated Martial Arts World take retargeting; new blood/head content. The exported studies are candidates and must not be counted as approved moves. See CHARACTER_AUTHORING_HANDOFF.md for exact boundaries and reuse paths.

Validation at checkpoint: 37 passing character/attachment/encounter tests, production build passing, manual editor and live selection/game launch checked. No claim of every animation being visually approved or an entire outbreak being manually completed.
