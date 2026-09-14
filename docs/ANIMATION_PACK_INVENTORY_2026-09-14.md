# Downloaded animation pack inventory — 14 September 2026

Audited local ZIP GLB JSON chunks directly, without overwriting existing source assets. Full non-RM sources and exact README/license were subsequently staged in a separate versioned directory. Counts describe named takes, not approved gameplay actions. No animations were assigned, rendered or recorded in this audit.

| Download in C:/Users/taskm/Downloads | Non-root-motion GLB | Named takes | RM companion |
|---|---|---:|---:|
| Universal Animation Library[Source].zip | Unreal-Godot/UAL1.glb | 120 | 120 |
| Universal Animation Library[Standard].zip | Unreal-Godot/UAL1_Standard.glb | 43 | 43 |
| Universal Animation Library 2[Source].zip | Unreal-Godot/UAL2.glb | 134 | 134 |
| Universal Animation Library 2[Standard].zip | Unreal-Godot/UAL2_Standard.glb | 43 | 43 |

Both SOURCE archives also include Blender authoring files, Unity FBX and RM FBX, export settings, README/license and root_motion_toggle.py. UAL2 includes a separate female mannequin with zero animation takes. RM companions are variants, not additional unique moves. The two complete non-RM source files contain **253 unique names**, with A_TPose their only shared name. Standard is a limited subset; do not describe its 43 takes as the complete pack.

## What is already local/integrated

- assets-src/modular-character/source/UAL2_Standard.glb exactly matches the downloaded UAL2 Standard GLB, SHA256 `8cee20ab1bc55130092447e810e26df22dd2803eccc54f52137a7d54d7ab88a8`.
- Existing AnimationLibrary_Godot_Standard.gltf contains 46 takes. Compared with the new UAL1 Standard's 43 names, it additionally has Punch_Enter, Roll_RM and Sword_Attack_RM. Preserve this existing source; the new download is not a drop-in identical replacement.
- Current public/models/modular-hero/motion-bank.json contains 34 entries, including the authored Infected_Sprint_Loop derivative. This is an allowlisted bank, not the full source inventory. The main modular GLB also carries embedded base clips; bank count alone does not measure all available runtime clips.
- Existing LayToIdle extraction retains full track/finger mapping and source provenance through tools/build-impact-getup.mjs. Source availability does not imply per-character compatibility or visual acceptance.

## Confirmed named moves relevant to priorities

| Need | Exact named source takes | Interpretation / gap |
|---|---|---|
| Unarmed kick and stance entry | UAL1: Kick, PunchKick_Enter, PunchKick_Exit, Punch_Cross, Punch_Jab | Kick and stance transitions were absent from new Standard subset; review complete source first. No dedicated named boxing guard idle. |
| Knees, uppercut and combinations | UAL2: Melee_Knee, Melee_Knee_Rec, Melee_Uppercut, Melee_Combo, Melee_Hook, Melee_Hook_Rec | Knee/uppercut/combination extend Standard. Need contact windows and recovery timing review. |
| Pickup and pushing | UAL1: PickUp_Kneeling, PickUp_Table, Push_Enter, Push_Loop, Push_Exit; UAL2: Walk_Carry_Loop | Kneeling pickup is new versus Standard; not proof of heavy two-handed hoist or person capture. |
| Throw | UAL2: OverhandThrow | Present in Standard already. No named paired wrestling throw, spin-sling or underhand throw confirmed. |
| Air hit and fall | UAL2: LiftAir, LiftAir_Idle_Loop, LiftAir_Hit_L, LiftAir_Hit_R, LiftAir_Fall, LiftAir_Fall_Air_Loop, LiftAir_Fall_Impact, Hit_Knockback | Review as source replacements for limited authored air reactions. Names do not prove rescue/carry. |
| Recovery and acrobatics | UAL1: BackFlip, Roll; UAL2: KipUp, IdleToLay, LayToIdle, JogToFlip, DoubleJump | Keep existing accepted recovery; review new variants separately. |
| Victim grab/choke/wrestling | No explicitly named grab, choke, clinch or wrestling take in either full non-RM inventory | Do not invent coverage. Existing Power World paired controls and procedural victim reactions remain separate work. |
| Pistol | UAL1: Pistol_Aim_Down, Pistol_Aim_Neutral, Pistol_Aim_Up, Pistol_Idle_Loop, Pistol_Reload, Pistol_Shoot | Present in Standard. No explicitly named rifle, shotgun, sniper, dual-pistol or launcher family. |
| Bow | UAL2: Bow_Aim_Down, Bow_Aim_Neutral, Bow_Aim_Up, Bow_Notch, Bow_RapidShoot_Loop, Bow_Shoot | Complete Source adds these; Standard lacks them. |
| Sword / shield | UAL2: Sword_Light_*, Sword_Heavy_*, Sword_Regular_*, Sword_Aerial_*, Sword_UpperCut, Sword_GroundPound, Sword_Block, Sword_Dash; shield idle/break/dash/oneshot | Exact complete names in inventory JSON. Extensive family, but no explicitly named dual-sword, spear or nunchucks family. |
| Other equipment | Fish_Cast/Fish_Reel family, Mining_Loop, TreeChopping_Loop, Spell_Double_* and Spell_Simple_* | Possible starting points only; equipment grip/contact must be inspected. |
| Infected | UAL2: Zombie_Bite, Zombie_Spawn, eight directional runs, eight directional walks, Zombie_Idle_Loop, Zombie_Scratch | Full source expands the three Standard zombie clips. No humanoid-to-quadruped compatibility inferred. |

## Efficient next import plan

1. Preserve archives and current sources. Full sources are staged at assets-src/modular-character/source/full-library-2026-09-14/ual1/UAL1.glb and assets-src/modular-character/source/full-library-2026-09-14/ual2/UAL2.glb, each alongside its archive-exact License.txt and README.txt. GLB hashes match the inventory; existing sources remain unchanged. Choose non-RM as default because game simulation owns movement.
2. Build metadata-only searchable inventory first; the accompanying JSON already includes each GLB hash, exact take name, duration and channel count. Do not mount both giant banks into every gameplay character.
3. Review a small first batch: PickUp_Kneeling, Kick, PunchKick_Enter/Exit, Melee_Knee/Rec, Melee_Uppercut and LiftAir_Fall/Impact. Use the existing full-track retarget pipeline, actual modular rig and baseline checks.
4. Review Bow_Notch/Shoot and one new sword variant with matching equipment. Assign release/hit/contact markers independently of clip duration.
5. Keep per-clip status source-available → mapped candidate → visually accepted → gameplay-proven. Export only accepted needed clips into runtime bundles, retain others in the library for explicit review.
6. Keep missing paired grab/choke moves visible as missing source coverage. Test them with actual two-body contact rather than treating OverhandThrow as a victim animation.

Machine-readable inventory: artifacts/animation-pack-audit-20260914/inventory.json. It records all ten GLB entries (including zero-take mannequins and RM variants); only the two non-RM source GLBs and their exact README/license files were staged; no geometry or runtime assignments were changed.
