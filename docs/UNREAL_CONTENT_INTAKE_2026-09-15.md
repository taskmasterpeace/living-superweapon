# Unreal content intake — 2026-09-15

Existing local assets cover the next punch, paired throw, recovery, creature and environment investigations. No additional purchase is needed for these investigations. This is a filesystem/source-parser audit, not motion approval. No Unreal editor/commandlet was launched, no full content export occurred, and no runtime or shared animation banks were changed.

## Scope and exact inventory

Source: `C:/Users/taskm/OneDrive/Documents/Unreal Projects/MyProject/Content`.

4,805 files, 4,090,843,680 bytes: **4,770 `.uasset`, 21 `.umap`, 10 `.fbx`, 2 `.png`, 1 `.rar`, 1 `.zip`**. Full relative paths and sizes are in `tools/unreal-intake-2026-09-15/inventory.json`. Counts below are files, not inferred animation classes; demos, textures, rigs and materials are included.

| Folder | Files | Relevant evidence |
|---|---:|---|
| CloseCombatAnimSet | 121 | 92 animation-directory assets: 46 InPlace + 46 RootMotion; source archive has 46 FBX |
| SuplexAnimations | 187 | 12 AnimSequence assets: five p00/p01 pairs and two getups; six example montages |
| JKMotion_Knockdown | 181 | 52 Animation assets: 26 UE4M + 26 UE5M; directional knockdowns |
| Animations_Creature | 79 | 61 animation-directory assets, mannequin skeleton |
| Kickboxing_animation_v2 | 41 | 22 animation-directory assets; kicks, elbows, movement, SPINNING_BACK_FIST |
| FlipsAndTricks | 58 | Separate project SourceFiles archive contains 40 FBX |
| motion_capture_deaths | 313 | 292 animation-directory assets; ZIP with two all-takes FBX |
| DualSwordKit | 82 | Existing armed motion source investigation |
| EvilMagician | 31 | Existing magic motion source investigation |
| InteractionPack | 884 | 404 AnimInteraction files + 480 SFXInteraction files; item/consumable interaction assets, not demonstrated fighter lifting |
| PolygonTown | 921 | Building/prop assets, e.g. Meshes/Buildings/SM_Bld_Church_01.uasset |
| PolygonPrototype | 1,041 | Prototype environment assets and bundled mannequin content |
| LevelPrototyping | 36 | All ten loose FBX are static prototype meshes, not animation clips |
| AllExplosions | 174 | Niagara assets, e.g. Niagara/Big/NS_Explosion_Big_1.uasset |
| CharacterBodyFX | 178 | Body effects and skeletal props |
| Character_Appearance_Dissolve | 197 | Dissolve assets |
| Characters | 128 | Shared character dependencies |
| __ExternalActors__ / __ExternalObjects__ | 130 / 4 | World partition content |
| Input / Splash / ThirdPerson | 9 / 4 / 5 | Supporting project content |
| LSWs.umap at Content root | 1 | Map |

Empty folders do not appear in the file inventory. Unreal packages are **not browser-ready**. Niagara graphs and Unreal materials need a deliberate equivalent implementation or baked output; exporting geometry does not reproduce those systems. No environment/effect appearance was visually reviewed.

## Source archive recovery completed

Listed archives with Windows `tar -tf`, then extracted only CloseCombat into a new private folder with an existence guard; original archive preserved:

`C:/Users/taskm/Documents/PowerWorldAssets/animations/2026-09-15-closecombat-intake`

Archive: `Content/CloseCombatAnimSet/Source Files.rar`; SHA-256 `edccd9d6d2d2eded41a724b642a09d02bc0dcc0b9cb77f0e7752c9b4afdddc4f`.

All **46 FBX parsed to 46 clips**, with positive durations and valid finite tracks. All have 69 bones, including `driver_root`, `root`, `pelvis`, `spine_01..03`, `upperarm_l/r`, `hand_l/r`, leg chains and IK bones. This directly demonstrates the source hierarchy; the corresponding NinjaLeftJab Unreal package references `CloseCombatAnimSet/Mannequin/Character/Mesh/UE4_Mannequin_Skeleton`.

**38 parsed without warnings; eight need source-layer review.** Three.js warns that it ignores additional animation layers for NinjaBlockLoop, NinjaBackEvade, NinjaFrontEvade, NinjaHeadHit_01, NinjaJumpFalling, NinjaJumpLand, NinjaJumpUp and NinjaRun. Finite tracks alone must not pass those clips as complete source motion. Flatten/bake layers with a tool that supports them, or compare a bounded Unreal FBX export before use.

Evidence in `tools/intake-20260915/`: `source-manifest.json` (each private path, size, SHA-256), `fbx-audit-with-warnings.json` (bones, clips, durations, track counts and warnings), `audit-closecombat.mjs` (adapted existing offline FBX audit, warning-aware). The private directory also holds these source/audit outputs. Texture loads are deliberately skipped; this validates motion data only.

### First candidates for source/target review

Paths below are relative to the private extraction folder.

| File | Clip | Duration | Tracks | SHA-256 |
|---|---|---:|---:|---|
| Animations/Attacks_Blocks/NinjaLeftJab.fbx | Take 001 | 1.166667 s | 203 | cf1e9308156a34856e19ef447b58ce146213156d986e85cd13fdf082cdd5353d |
| Animations/Attacks_Blocks/NinjaRightCross.fbx | Take 001 | 1.833333 s | 204 | d8b2c5b6d3dc91e9105e8b0bdf3f33e5d03c4921a1a74aad42e460cd126dfe93 |

Both have valid finite tracks and zero captured loader warnings. Review jab/cross first, then NinjaLeftHook and NinjaRightUppercut. Neither clip has been retargeted or visually accepted by this intake.

Other verified archive listings, not extracted: `Content/motion_capture_deaths/Source_files/death_ALL_takes.zip` contains `deaths_ALL_takes_no_rootmotion.fbx` and `deaths_ALL_takes_rootmotion.fbx`; project `SourceFiles/Flips_FBX.zip` contains 20 `InPlace/IP_*.fbx` and 20 `RootMotion/RM_*.fbx`. File counts do not establish all-take clip counts until parsing. The CloseCombat archive uses NinjaRun/NinjaWalk names, whereas some Unreal variants use NinjaRunForward/NinjaWalkForward: do not match variants by basename alone.

## Bounded Unreal export feasibility and priority

Installed executable verified: `D:/Program Files/Epic Games/UE_5.6/Engine/Binaries/Win64/UnrealEditor-Cmd.exe`. Project log identifies **UE 5.6.1-44394996** and records mounting PythonScriptPlugin. Installed engine source includes `Plugins/Experimental/PythonScriptPlugin/Source/PythonScriptPlugin/Private/PythonScriptCommandlet.cpp` (supports `-Script`) and `Source/Editor/UnrealEd/Classes/Exporters/AnimSequenceExporterFBX.h`.

The `.uproject` EngineAssociation is a GUID; its plugin list does not explicitly enable Python, and the engine plugin descriptor defaults to disabled. Therefore the existing editor log proves Python was mounted in that session, but a fresh commandlet invocation still needs a bounded availability check. No successful commandlet/export is claimed here.

1. **Punches:** already extracted; next action is source/target review of the two files above through existing authoring seams. Keep `driver_root`/root motion separate from simulated fighter travel. Do not ingest all 46 into shared banks.
2. **Paired grab/hoist/slam pilot:** export exactly `/Game/SuplexAnimations/AnimSequence/a_suplex_single_p00` and `a_suplex_single_p01` plus their source skeleton/preview mesh and timing metadata. Serialized path references point to `/Game/SuplexAnimations/Demo/External/Characters/Mannequins/Meshes/SK_Mannequin`; load in Unreal to confirm resolved skeleton, frame count/rate, root transforms, and participant role. p00/p01 names indicate a pair, not proof of which is attacker. Review together against one floor with preserved relative placement.
3. **Getups:** export `a_liedown_getup_prone` and `a_LiedownGetup_Supine` from the same AnimSequence folder. Review prone/supine support and exit at all phases. JKMotion offers `UE4M_Knockdown_Back_01..10`, `Front_01..08`, `Left_01..04`, `Right_01..04` and corresponding UE5M variants; names demonstrate knockdowns, not recovery coverage.
4. **Sustained lifting:** after the single pair passes, export paired `a_suplex_chain_start`, `a_suplex_chain_loop`, `a_suplex_chain_end` and `a_suplex_chain_initfromfront`, each `_p00` + `_p01`. The loop is a candidate for paired continuity; no arbitrary overhead carry/lift is demonstrated. Inspect synchronization metadata and example montages rather than inventing offsets or loop boundaries.
5. **Creature pilot:** `Anim_Creature_Sit_Idle_1`, `Anim_Creature_Sit_Run`, `Anim_Creature_Sit_Run_Root`, `Anim_Creature_Sit_Attack_1`, `Anim_Creature_Sit_Get_Hit_1`, `Anim_Creature_Sit_Down_On_Ground___Up` in `/Game/Animations_Creature/Animations`. Attack_1 serialized references point to `/Game/Animations_Creature/Mesh/SK_Mannequin_Skeleton`; this is mannequin-based creature motion evidence, not proof of a nonhumanoid creature rig. Review body support and locomotion before adapting proportions.
6. **Environment/effects:** select one PolygonTown building and one AllExplosions effect for dependency/cost assessment after combat pilots. Export mesh/textures for the building into a private staging area, convert/optimize to GLB, and inspect materials. Assess a Niagara bake separately. Avoid a multi-gigabyte blanket export (AllExplosions alone is 2,129,467,120 bytes).

For the first Unreal pilot, prepare an allowlisted Python script outside runtime assets: load only the two suplex assets, record resolved asset class/skeleton, duration and rate, then export using `unreal.AssetExportTask` with `unreal.AnimSequenceExporterFBX`/`unreal.FbxExportOption` to a new private folder. Fail on missing skeleton or asset; never resave source packages. Invoke the verified executable with the explicit `.uproject`, `-run=pythonscript -script=<pilot.py> -unattended -nop4 -nosplash -nullrhi`; plugin availability must be checked before export. This command template is a next step, not an executed export recipe.

## Acceptance boundary

Read repo AGENTS and the animation-authoring skill. That skill's War World `tests/rig.test.ts`, `tools/pose-ingest.ts`, `src/client/animation.ts`, and `src/client/models/weapons.ts` paths do not exist in this LSW checkout. Existing LSW seams include `tools/ingest-strikes.mjs`, `tools/lib/quaternius-source.mjs`, `tools/build-paid-motion-bank.mjs`, and `tools/audit-purchased-fbx.mjs`; this audit reused the latter's parser strategy without editing shared code.

Before gameplay wiring: compare source and target at start/25/50/75/end, inspect loop wraps/one-shot exit, measure root ownership and support contacts, and review paired characters together. Keep procedural fallback. No parser success, filename, skeleton reference or single still grants motion approval.

## Follow-up: actual Unreal export and class audit, 2026-09-15 06:34 UTC

The initial section above is historical: **Unreal has now been launched successfully for a bounded export**. No source package save operation was called. The commandlet may update derived-data caches and logs. No paid FBX was copied into browser runtime.

The live Content folder now contains **4,862 files**, up from 4,805 during the previous snapshot; Kung Fu V2 is among the new content. Unreal AssetRegistry reports **948 AnimSequence assets** across the project. That is NOT 948 unique combat moves: root-motion/in-place alternatives, UE4/UE5 variants, demo locomotion and corrective bone animations are included. The table below separates those where verified by names.

| Pack | Confirmed content | What it can supply | Current integration stage |
|---|---|---|---|
| CloseCombat | 99 AnimSequence: 92 action/locomotion variants + 7 demo clips | Jab, cross, hook, uppercut, kicks, blocks, directional body reactions | 46 source FBXs extracted previously; no newly approved gameplay assignment |
| Suplex | 40 AnimSequence: 12 intended actions + 28 mannequin corrective clips | Five paired sequence stages and two getups | **Four actual FBXs exported and parsed this pass** |
| JKMotion Knockdown | 80 AnimSequence: 52 directional UE4/UE5 knockdowns + 28 corrective clips | Front/back/side falls | Unreal-only, not newly wired |
| Creature | 61 AnimSequence | Creature locomotion, attack and reaction source; mannequin skeleton | Unreal-only; quadruped compatibility unproved |
| Kickboxing V2 / Kung Fu V2 | 22 / 39 AnimSequence | Fighter styles, kicks, elbows and stances | Unreal-only; not newly wired |
| Dual Sword | 38 AnimSequence + 10 montages | Six attacks, defenses, equip, movement, evades | Unreal-only; names verified, target contacts unreviewed |
| Evil Magician | 9 AnimSequence | Three attacks, ranged cast, special, movement, death | Unreal-only; candidate for readable beam/casting poses |
| Flips and Tricks | 40 AnimSequence; 40 archived FBX alternatives | Acrobatics, 20 IP/RM pairs in archive | Archive known; not newly wired |
| Motion Capture Deaths | 292 AnimSequence | Broad death reactions, variants | Unreal-only plus known all-takes source archive |
| Interaction Pack | **110 AnimSequence + 269 SoundWave + 269 SoundCue** | Prop interactions and associated audio | Registry confirmed; sounds/animations not exported or wired here |
| Polygon Town | **779 StaticMesh**, 27 SkeletalMesh, 7 demo AnimSequence | Reusable streets/buildings/props | Unreal-only; mesh counts do not prove building interiors or game collision |
| Polygon Prototype | **475 StaticMesh**, 15 SkeletalMesh, 7 demo AnimSequence | Proving-ground construction kit | Unreal-only; not imported into current proving ground |
| All Explosions | **33 NiagaraSystem**, 9 StaticMesh | Reference for differentiated effects | Unreal graphs; not directly playable in Three.js |
| Character Body FX | **16 NiagaraSystem**, 19 NiagaraEmitter, 7 AnimSequence | Body effects and supporting motion | Unreal-only; requires deliberate browser equivalent |
| Appearance / Dissolve | 48 materials, 52 instances, 23 meshes | Spawn/disappear/transformation presentation | Unreal-only; materials do not transfer as functioning browser effects |

Registry enumeration is stronger than counting files, but does not visually approve all assets. Full class totals and animation names are recorded in `tools/unreal-intake-2026-09-15/export-pilot/registry-audit.json`.

### The four successful exports

| Exact source clip | Unreal duration | Unreal frame count | Export result |
|---|---:|---:|---|
| a_suplex_single_p00 | 3.9000 s | 117 | 1,927,984 bytes; parsed |
| a_suplex_single_p01 | 3.3667 s | 101 | 1,750,000 bytes; parsed |
| a_liedown_getup_prone | 2.4667 s | 74 | 1,449,648 bytes; parsed |
| a_LiedownGetup_Supine | 2.4333 s | 73 | 1,438,528 bytes; parsed |

All four resolved to **AnimSequence**, with skeleton `/Game/SuplexAnimations/Demo/External/Characters/Mannequins/Meshes/SK_Mannequin.SK_Mannequin`. FBX parser found **89 bones**, one positive-duration finite clip per file, and no loader warnings. `AnimationLibrary.get_num_frames` supplied the frame counts; frame-count/duration implies approximately 30 frames/second. Initial direct frame-rate property probes were unavailable in this engine Python API; those errors are retained in the report rather than hidden.

**Critical sync finding:** p00 and p01 do not have equal durations (117 versus 101 frames). Do not normalize both to the same progress and assume correct contact. Next work must inspect montage timing, paired roots, contact, release and recovery together. Participant roles have not yet been visually established. These four are export/parse successes, **not newly applied or visually approved gameplay animations**.

Private files: `C:/Users/taskm/Documents/PowerWorldAssets/animations/2026-09-15-suplex-pilot`. Reproducible allowlisted Python scripts, SHA-256 manifest, metadata and parser report are copied into the repository's `tools/unreal-intake-2026-09-15/export-pilot/`; FBX payloads stay private. Command used installed UE 5.6.1, `-run=pythonscript -unattended -nop4 -nosplash -nullrhi -EnablePlugins=PythonScriptPlugin`. Four export tasks returned true without export errors. No bulk animation export ran.

### What the earlier animation effort actually produced

The browser bank `public/models/modular-hero/paid-motion-bank.json` still contains **22 retargeted entries**, all explicitly `retargeted-unreviewed`: 6 aerial interaction participant clips, 8 pickup/carry/lift clips, 2 back-throw participant clips, 2 getups, and 4 boxer clips. That work produced converted motion data and preview candidates. It did not mean all the newly supplied Unreal packs had been exported or applied. This pass adds four usable FBX sources and an engine-class audit; it does not increase that 22-entry runtime bank. Gameplay activation and visual contact acceptance must be reported separately by the controller/motion integration work.

Immediate recommendation: review the exported getups and paired timing, then replace one full gameplay sequence at a time. CloseCombat jab/cross are already extracted, so they need no Unreal wait. Keep broad effects/environment extraction behind the flight/grab/control fixes; the purchases already cover substantial near-term work.
