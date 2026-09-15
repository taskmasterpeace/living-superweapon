# Character pipeline reset — September 13, 2026

## Decision

The character-foundation proof is visually rejected. Passing browser checks did not establish good anatomy, grips or combat motion. Do not extend that procedural sword demonstration or rebuild the roster around it.

Recommend Blender authoring, a standard fingered deform skeleton, recorded combat clips retargeted and baked offline, and skinned GLB playback in Three.js. Preserve the existing flight behavior and poses through a tested adapter. Wait for the user's prototype before committing to a replacement appearance.

## Why the current demonstration is weak

The proof uses a sampled Punch_Cross clip, but the sword demonstration uses a procedural weapon swing. The inspected UAL/UAL2 pose banks contain locomotion, punches, falls and other actions; they do not provide a sword source clip. The referenced original source files are absent from this worktree. This does not establish that the user's entire source library lacks sword animation.

Our authored-pose bridge reduces source animation to direction/rotation data that drives the native figure. Visible imported skin follows those drivers, while finger closure is reconstructed separately. This can discard source hand detail; it is a suspected fidelity problem, not a newly proven explanation for every bad wrist. A recorded animation cannot fix an incorrect bind pose or bad weights by itself.

## Research findings

| Project | What it actually offers | Use here |
|---|---|---|
| [Astra Blender Characters](https://github.com/icesixgod/awesome-astra-blender-characters) | Reference-driven Blender workflow guidance, face/hair repair and multi-view checks; not a supplied production character rig | Adopt reference and review discipline. It does not solve our hands automatically. |
| [Blender Rigify](https://docs.blender.org/manual/en/latest/addons/rigging/rigify/basics.html) and [Expy Kit](https://github.com/pKrime/Expy-Kit) | Rig generation, skeleton conversion and retargeting helpers | Best first path: retain editable authoring rigs, export a consistent deform skeleton. Verify compatibility with installed Blender before choosing an add-on version. |
| [SkinTokens C++](https://github.com/localai-org/skin-tokens.cpp) | CPU/Vulkan skinning; accepts a supplied skeleton. Unconstrained skeleton generation is experimental | Optional bounded weight-generation experiment using OUR skeleton. Inspect shoulders, thumbs and gripping fingers afterward. |
| [UniRig](https://github.com/VAST-AI-Research/UniRig) | Research system for automatic skeleton and skin-weight generation | Alternative experiment if conventional binding is too costly. No guarantee of our required skeleton or accurate hand deformation. |
| [MotionBricks C++](https://github.com/localai-org/motion-bricks.cpp) | Native neural animation inference using CPU/Vulkan, with keyframe controls | Defer. A Three.js demonstration does not establish a lightweight browser/mobile inference pipeline or accurate sword contacts. |
| [Kimodo C++](https://github.com/localai-org/kimodo.cpp) | Text-to-motion; current native path supports a 30-joint SOMA skeleton and skeleton-only animated GLB | Optional offline motion source later. Current native limitations include no 77-joint expansion or skinned-mesh GLB export; not our detailed finger-grip solution. |
| [Ready Player Me animation library](https://github.com/readyplayerme/animation-library) | 200+ mocap animations; documented for RPM avatars, with locomotion/expression/idle/dance categories | Do not assume this is a compatible sword-combat pack for our own characters. Review asset terms and actual clip contents before adopting. |

Repository code, model weights and animation assets can have different terms. Keep provenance with every imported asset. No tool or weights were installed for this research.

## Smallest useful proof

1. Archive current characters and retain existing gameplay definitions, scales and flight reference clips.
2. Obtain an actual punch and sword animation source from the user's library or an identified suitable asset source. Inspect each on its original skeleton first. No procedural replacement if a requested source clip is missing.
3. Build one neutral stylized character with a consistent bind pose, fingers, shoulder/elbow/wrist axes and weapon sockets. Retarget both clips to it in Blender.
4. Export and play those baked clips with a skinned mesh in Three.js. Compare source, Blender result and game result from the same angles.
5. Review closed-fist anatomy, thumb placement, weapon staying in the palm, shoulder deformation, full swing silhouette and foot contact. Then prove that existing hover/cruise/dive poses retain their look.
6. Stop for visual review. Expand only after this proof is accepted.

No roster migration, neural runtime, new creator UI or Sandra work is part of this research checkpoint.

## Reusable creator contract

- One versioned deform skeleton and bind pose; body proportions within declared supported ranges.
- Shared body-region slots, compatibility rules and color channels. Preserve character heights and gameplay identity.
- Clothing skinned to the same skeleton; conceal covered body regions to prevent clipping.
- Emblems use declared placements/material channels. Hair and accessories use named sockets.
- Animation entries record source, skeleton version, loop/root-motion policy, grip pose, weapon socket, contact/recovery markers and preview evidence.
- The animation controls presentation; gameplay retains authoritative movement and hit timing. Explicitly reconcile clip root motion with melee approach so movement is not applied twice.
- AI authoring instructions must validate that contract and produce preview evidence before registration.

Text-to-hero can eventually fill a validated character recipe from available parts. An attractive generated image is a reference, not evidence of correct topology, weights, fingers or an exportable skeleton.

## Next options

1. **Recommended: conventional Blender + recorded clips.** Most direct route to known motion quality and reusable characters. Requires one careful rig/retarget setup.
2. **Assisted skinning experiment.** Try SkinTokens supplied-skeleton mode on the same single character. Could reduce weighting labor; adds setup and uncertain deformation quality.
3. **Pause character work and do Sandra's ring.** Delivers independent gameplay value while the user prepares the visual prototype and animation sources; leaves current melee presentation unresolved.

Flight's existing procedural behavior is intentionally retained. The requested axial flight roll remains a separate future addition.
