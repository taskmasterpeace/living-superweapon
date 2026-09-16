"""Render the four mission firearms with their existing GLB socket empties visible,
plus the lab's proposed stock-contact marker. Blender headless (5.2 verified):
  blender --background --factory-startup --python tools/render-weapon-sockets.py
Outputs artifacts/asset-lab/weapons/<id>-{side,quarter}.png. Read-only on packages."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/asset-lab/weapons';OUT.mkdir(parents=True,exist_ok=True)
fps=json.loads((ROOT/'public/models/modular-hero/firearm-presentation-set.json').read_text())
scene=bpy.context.scene
scene.render.engine='BLENDER_WORKBENCH'
scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL'
scene.render.resolution_x=1280;scene.render.resolution_y=800
for w in fps['weapons']:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes,bpy.data.materials,bpy.data.objects):
        for item in list(block):
            if item.users==0:block.remove(item)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/authored-assets'/w['packageDir']/'model.glb'))
    # Empties never appear in final renders; mark each socket with a colored sphere.
    COLORS={'socket-grip-primary':(0,.9,.1,1),'socket-grip-support':(.1,.3,1,1),'socket-muzzle':(1,.85,0,1),'socket-attachment-optic':(.7,.2,.9,1)}
    def sphere(name,loc,color,r=.14):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=r,location=loc)
        m=bpy.context.object;m.name=name
        mat=bpy.data.materials.new(name);mat.diffuse_color=color;m.data.materials.append(mat)
    for o in list(bpy.data.objects):
        if o.name in COLORS:sphere('mark-'+o.name,o.matrix_world.translation,COLORS[o.name])
    sc=w['proposed'].get('stock-contact',{})
    if sc.get('position'):
        x,y,z=sc['position'] # native glTF coords -> Blender: (x,-z,y)
        sphere('PROPOSED-stock-contact',(x,-z,y),(1,.15,.05,1),r=.18)
    lo=Vector(w['bounds']['min']);hi=Vector(w['bounds']['max'])
    center_gltf=(lo+hi)/2;size=max((hi-lo).length,.5)
    center=Vector((center_gltf.x,-center_gltf.z,center_gltf.y))
    cam=bpy.data.objects.new('cam',bpy.data.cameras.new('cam'));scene.collection.objects.link(cam)
    scene.camera=cam
    wid=w['ref'].split('@')[0].replace('prop.reference-weapon-','')
    for label,offset in [('side',Vector((size*1.6,0,0))),('quarter',Vector((size*1.2,-size*1.0,size*.7)))]:
        cam.location=center+offset
        direction=center-cam.location
        cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=str(OUT/f'{wid}-{label}.png')
        bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam,do_unlink=True)
print('WEAPON_RENDERS_DONE')
