"""Source-review phase renders for the War World animation subset. Imports the FULL
UAL libraries (each ships its own mannequin) and renders five phases of each curated
take from a 3/4 view. This is SOURCE review evidence; runtime-rig playback acceptance
happens in the browser tools. Blender headless (5.2 verified):
  blender --background --factory-startup --python tools/render-animation-phases.py
Outputs artifacts/asset-lab/animation-review/<lib>-<take>-p{0..4}.png"""
import bpy
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/asset-lab/animation-review';OUT.mkdir(parents=True,exist_ok=True)
LIBS={
 'ual1':('assets-src/modular-character/source/full-library-2026-09-14/ual1/UAL1.glb',
  ['Death01','Death02','Hit_Chest','Hit_Shoulder_L','Pistol_Shoot','Pistol_Reload','Crouch_Fwd_Loop','Crawl_Fwd_Loop']),
 'ual2':('assets-src/modular-character/source/full-library-2026-09-14/ual2/UAL2.glb',
  ['Zombie_Walk_Fwd_Loop','Zombie_Run_Fwd_Loop','Zombie_Bite','Zombie_Spawn','Hit_Knockback','LiftAir_Fall_Impact','KipUp','MonsterTransformation']),
}
scene=bpy.context.scene
scene.render.engine='BLENDER_WORKBENCH'
scene.display.shading.light='STUDIO';scene.display.shading.color_type='SINGLE'
scene.display.shading.single_color=(.62,.65,.7)
scene.render.resolution_x=640;scene.render.resolution_y=800
for lib,(path,takes) in LIBS.items():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/path))
    rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
    cam=bpy.data.objects.new('cam',bpy.data.cameras.new('cam'));scene.collection.objects.link(cam)
    scene.camera=cam
    center=Vector((0,0,1.0))
    cam.location=center+Vector((2.6,-2.6,.8))
    cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
    fps=scene.render.fps=24
    for take in takes:
        action=bpy.data.actions.get(take)
        if not action:print('MISSING_TAKE',lib,take);continue
        rig.animation_data_create();rig.animation_data.action=action
        try:rig.animation_data.action_slot=action.slots[0]
        except Exception:pass
        start,end=action.frame_range
        for i in range(5):
            scene.frame_set(int(start+(end-start)*i/4))
            scene.render.filepath=str(OUT/f'{lib}-{take}-p{i}.png')
            bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam,do_unlink=True)
print('ANIMATION_RENDERS_DONE')
