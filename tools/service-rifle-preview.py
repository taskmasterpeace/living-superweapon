"""Four-thread CPU witnesses of author geometry, no runtime writes."""
import bpy,sys,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets-src/frontline-service-rifle'
for path in sorted((OUT/'original').glob('*.blend')):
 if '--front-only'in sys.argv and path.stem!='AssaultRifle2_1':continue
 bpy.ops.wm.open_mainfile(filepath=str(path),use_scripts=False)
 scene=bpy.context.scene
 for obj in list(scene.objects):
  if obj.type!='MESH':bpy.data.objects.remove(obj,do_unlink=True)
 mesh=next(o for o in scene.objects if o.type=='MESH')
 points=[mesh.matrix_world@v.co for v in mesh.data.vertices]
 lo=Vector([min(v[i]for v in points)for i in range(3)]);hi=Vector([max(v[i]for v in points)for i in range(3)]);center=(lo+hi)/2;span=hi.x-lo.x
 for mat in mesh.data.materials:
  color=tuple(mat.diffuse_color);mat.use_nodes=True;bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=color;bsdf.inputs['Metallic'].default_value=.55 if 'Metal'in mat.name else .08;bsdf.inputs['Roughness'].default_value=.5 if 'Metal'in mat.name else .68
 scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.render.threads_mode='FIXED';scene.render.threads=4
 scene.render.resolution_x=1100;scene.render.resolution_y=520;scene.render.resolution_percentage=100
 scene.world=bpy.data.worlds.new('NeutralStudio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.18,.18,.18,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
 scene.view_settings.view_transform='AgX'
 for name,offset,power,size in [('Key',(0,-1.5,1.7),900,1.2),('Rim',(0,1,1),1100,1),('Fill',(-1,-1,.2),400,1)]:
  data=bpy.data.lights.new(name,'AREA');data.energy=power*(span/3)**2;data.shape='DISK';data.size=size*span;obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=center+Vector(offset)*span;obj.rotation_euler=(center-obj.location).to_track_quat('-Z','Y').to_euler()
 data=bpy.data.cameras.new('SourceCamera');camera=bpy.data.objects.new('SourceCamera',data);scene.collection.objects.link(camera);scene.camera=camera;data.type='ORTHO';data.ortho_scale=span*1.15
 views=[('front-oblique',(1.5,-2,.8))] if '--front-only'in sys.argv else [('profile',(0,-2,0)),('rear-oblique',(-1.5,-2,.8)),('front-oblique',(1.5,-2,.8))]
 for label,offset in views:
  camera.location=center+Vector(offset)*span;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/f'{path.stem}-{label}.png');bpy.ops.render.render(write_still=True)
print('SOURCE_PREVIEWS_COMPLETE',flush=True)
