# Dual-trigger combat and field-correspondent pass

## Design contract

Extend the existing Three.js engine, BFP rear camera, original characters, Studio and KMK 9 witness layer. Do not redesign maps or replace physics. Existing source-motion and layered aim remain the baseline; identify actual remaining faults rather than adding another animation stack.

The two mouse buttons each own a selected attack. Wheel changes the primary; RMB + wheel changes the secondary. Selection is resolved before simulation and cannot accidentally release a charged attack, remap an already-held trigger, reset cooldowns, or swap heroes. Keyboard and gamepad direct powers remain available. The existing melee tool remains an explicit choice. HUD shows two unmistakable trigger bindings and attack-family silhouettes, with readable names/cooldown/locked states; preserve warm dark/gold visual language.

Extend the real field camera and recorded clips, not a synthetic replay. In-world operator films action, reporter stand-ups and winning fighter. Event-driven crash zooms must settle into readable framing, preserve gameplay camera/input, respect cover and remain bounded in capture cost/memory. Expose portable authoring controls where relevant.

## Work and ownership

1. Root: inspect controls, BFP source/references and current images; implement tested dual-trigger selection and HUD integration. Own core/input.js, core/settings.js, core/combat-selection.js, boot.js, game.js, hud.js and new attack-icon module.
2. Correspondent worker: inspect/extend newscrew.js and pure cinematic/capture helpers, focused tests; request integration seams rather than editing root-owned files. Ensure PowerWorld/Ascendance can receive coverage and post-match footage survives ownership transitions.
3. Motion worker: inspect current directional/ground/combat pose and rendered clearance; research compatible licensed animation assets and primary references, make one evidence-backed bounded correction with tests if warranted. Own motion modules and motion-specific tests/docs; coordinate shared files through root.
4. Root: integrate event hooks/Studio controls as required, run unit and build checks, then one exclusive browser/GPU lane. Pause all writes during captures. Inspect actual moving combat, two-trigger wheel input, cinematic captures, end-screen playback and responsive HUD. Fix observed regressions.
5. Independent review and final verification. Report delivered behavior and concrete remaining limits, not a self-awarded AAA/10/10 grade.

## Acceptance

- Wheel never changes hero, including persisted classic settings.
- Two independent selections survive ordinary firing; RMB-wheel gesture consumes its trigger until released without firing the newly selected attack; cooldown/unlock rules remain authoritative.
- Trigger HUD remains legible with long custom names and at small viewports; icons describe attack mechanics rather than arbitrary identical dots.
- Real crew footage includes action/reporting/crash zooms, replayable after match with valid image resources; camera state and rendering state restored.
- Grounded moving casts keep source gait, head/weapon tracking and trunk clearance; control changes do not break melee/guard/grab or ragdoll recovery.
- Research distinguishes community BFP reconstruction from official source and records animation licenses; no copyrighted comic panels shipped.
