# Power World animation review repair — 14 September 2026

Workspace: `D:/lsw/.worktrees/combat-release-review`  
Branch: `codex/playable-integration`  
Viewer: http://127.0.0.1:5185/animation-library.html

## Delivered in this pass

| Feedback | Change | Acceptance boundary |
| --- | --- | --- |
| Backward, crossing fall arms | Corrected local shoulder direction, bounded shoulder arcs and elbow flexion on the production modular rig | Revised candidates; inspected fall quarter phases in the browser |
| Stiff grappling deploy/hang | Added windup, deployment, overhead catch, pull and asymmetric free-limb movement | No rope/anchor contact or traversal claim |
| Narrow flying pickup | Open approach followed by separated forward capture hands | No payload or held-person contact proof |
| Ground pickup too shallow | Deeper supported crouch followed by an overhead lift | Issue #21 visual rejection retained; not approved for gameplay |
| Poison/gas and burn/acid hands | Hand-to-mouth cough and front chest pat; scoped bind-reference correction avoids compounding idle arm rotations | Sampled production-rig checks and browser review; candidates |
| Weak infected sprint | Asymmetric periodic flailing arm tracks over the existing source run | Source legs/root retained; original zombie idle, walk and scratch untouched |
| Kicks, knees, throws and slow grab entries | Revised candidate joint arcs; grabs reach contact at 0.16s, total entry/release study 0.85s | Contact and artistic acceptance still pending |
| Melee hook appears to teleport | One-shots stop at the end instead of automatically wrapping to frame zero | Separate Melee_Hook_Rec exists; attack-to-recovery gameplay transition not changed |
| Jagged jog/sprint/takeoff | Current-model preview uses full source tracks when available instead of the reduced native adapter; imported full Jog_Fwd_Loop, Jump_Start and Jump_Land | Gameplay locomotion/controller unaffected; inspect source movement before tuning further |
| Air studies shown on the floor | Airborne framing and illustrative descending/hover offsets in the viewer | These are explicitly preview-only; not a physics or get-up demonstration |
| Hard to review | Repeat control, 0/25/50/75/100% seek buttons, selected clip in URL, retained user notes in UI/catalog export | Valid data, visual acceptance and playable integration remain distinct |

Reference-body studies use the current modular GLB with Vegas reference appearance. These are not the old character models, but they do not use every personalized roster outfit. The viewer states that limitation.

## Existing source animation versus authored studies

The full source library is **Quaternius Universal Animation Library**, stored under `assets-src/modular-character/source/`. Sword combos, shields, slides, zombie walk/idle/scratch and other source takes come from that library. The editable falls, grabs, pickups, kicks, throws and status reactions are **Power World authored joint-key studies**, not downloaded motion capture. Infected sprint is a Power World derivative of a source run.

Official sources reviewed:
- [Quaternius Universal Animation Library 2](https://quaternius.com/packs/universalanimationlibrary2.html): FBX/GLB/Blend source formats, combos and recovery takes, CC0 listing.
- [Quaternius animation viewer](https://quaternius.com/animviewer.html): browse source motions before selecting clips.
- [Adobe Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html): another source for humanoid clips and auto-rigging; royalty-free game use under its terms. Its humanoid limitation means it is not a universal animal/alien solution. No new Mixamo clip was downloaded or approved in this pass.

## Repeatable production workflow

1. Select a source move visually before importing; retain author, license, source file/hash and exact take name. Keep the source unchanged.
2. Import full skeletal tracks using `tools/build-modular-motion-bank.mjs`, including root and fingers. Do not replace a full source animation with the 45-value native pose reduction merely to preview it.
3. Prove the source-to-modular bone mapping. Check both the bind pose and the actual Idle_Loop baseline before using additive rotations. This pass found that adding bind-authored arm offsets directly onto posed idle arms can cross the wrists.
4. Create derivatives as named candidates. Preserve unaffected tracks. Test joint lengths, elbow direction, hand/body clearance, root policy and loop seams on the actual production GLB.
5. Inspect front/side/back at quarter phases and normal speed. Mount a matching prop/partner and check contact before approval. A numerical anatomy check cannot certify attractive motion.
6. Set anticipation, contact, release and control-return markers. A combo needs separate hit windows; importing a multi-hit sword clip does not automatically create those hits.
7. Approve visually, assign deliberately, then test the actual controller sequence in the Threat Room. Simulation owns movement/collision; preview offsets must never be copied into actor physics.
8. Record a ready-to-act scenario only after the full gameplay sequence works; retain the character, clip, scenario and timing settings with evidence.

Existing authoring guidance: `.agents/skills/power-world-character-authoring/SKILL.md` and `C:/Users/taskm/.codex/skills/warworld-animation-authoring/SKILL.md`.

## Still unfinished — next work

1. Rear hostile neck contact, friendly underarm carry and receiver animation. Existing [issue #19](https://github.com/taskmasterpeace/living-superweapon/issues/19) tracks directional-grab partner reactions. Fix these together on two current modular bodies and check size differences.
2. Actual aerial capture → hold while moving → aimed throw → collision damage → airborne reaction → landing/get-up. This pass does **not** verify that complete gameplay sequence.
3. Air-stun full-body limp motion, disoriented stumbling and flight interruption. The air-stun candidate remains limited; showing descent in the viewer is not completion.
4. Forward versus vertical landing choices, ground impact slide and recovery transitions. Keep travel simulation-owned.
5. Sword/shield/axe/boomerang props in the viewer, explicit combo hit windows and projectile-release contact. Source shield and sword clips exist; equipment contact is not proven.
6. Further visual polish of rejected kick/knee/throw/grab candidates after review. Do not bulk-label them approved.

The slide, ninja landing, lay-to-idle, sword, roll, kneeling and zombie source clips the user liked are retained. No new worlds, vehicles or large wrestling library were added.

## Verification

Targeted tests cover actual GLB bind/idle anatomy, pickup separation and overhead lift, contact-marker metadata, full-track mapping, source preservation, exact infected-loop seams, grounded support, visible-model integration and one-shot/air-preview timing. Browser inspection covered revised fall quarter phases, coughing, flying pickup approach/capture, grappling hang, overhead pickup and infected sprint. No new gameplay proof video was recorded in this pass.

Final result: **38 tests passed; production build passed** (existing large-chunk warning remains). Final test/build results are recorded in `artifacts/animation-review-final-tests.txt` and `artifacts/animation-review-final-build.txt`. These are local execution logs, not visual approval.
