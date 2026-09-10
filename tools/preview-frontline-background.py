"""Unchanged native projection and accepted foreground; background-only clay A/B."""
import bpy,numpy as np,os,json,math,hashlib,sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));SOURCE=os.path.join(ROOT,'assets-src/frontline-background-study');OUT=os.path.join(ROOT,'artifacts/frontline-background-study');os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'assets-src/frontline-escarpment-study/native-projection-study.blend'))
scene=bpy.context.scene;scene.cycles.device='CPU';scene.render.threads_mode='FIXED';scene.render.threads=8;scene.cycles.samples=20
clay=bpy.data.materials.get('neutral-sandstone-clay')
# Bring the exterior into exact agreement with current source geometry, identically
# for both views. Neither base nor any near formation changes between frames.
old=bpy.data.objects.get('existing-far-floor');bpy.data.objects.remove(old,do_unlink=True)
with open(os.path.join(SOURCE,'current-far-floor.json')) as f:floor=json.load(f)
mesh=bpy.data.meshes.new('current-native-far-floor');mesh.from_pydata(np.array(floor['position']).reshape(-1,3).tolist(),[],np.array(floor['index']).reshape(-1,3).tolist());mesh.update();mesh.materials.append(clay)
for p in mesh.polygons:p.use_smooth=True
obj=bpy.data.objects.new('current-native-far-floor',mesh);bpy.context.collection.objects.link(obj)
def witnesses():
 result={}
 for o in scene.objects:
  if o.type=='MESH' and not o.name.startswith('distant-'):
   coords=np.array([tuple(v.co) for v in o.data.vertices],dtype=np.float32);result[o.name]=hashlib.sha256(coords.tobytes()+np.array(o.matrix_world,dtype=np.float32).tobytes()).hexdigest()
 return result
before=witnesses();camera_before=[list(row) for row in scene.camera.matrix_world]
if '--candidate-only' not in sys.argv:
 scene.render.filepath=os.path.join(OUT,'background-baseline.png');bpy.ops.render.render(write_still=True)
for o in list(scene.objects):
 if o.name.startswith('distant-'):bpy.data.objects.remove(o,do_unlink=True)
with open(os.path.join(SOURCE,'layout.json')) as f:layout=json.load(f)
with bpy.data.libraries.load(os.path.join(SOURCE,'background-ridge-kit.blend'),link=False) as (a,b):b.objects=[f'background-ridge-{i}' for i in range(3)]
sources={o.name:o for o in b.objects}
for i,f in enumerate(layout['far']):
 original=sources[f'background-ridge-{f["profile"]}'];o=original.copy();o.data=original.data.copy();o.name=f'distant-background-{i}';bpy.context.collection.objects.link(o)
 o.data.materials.clear();o.data.materials.append(clay);coords=np.array([tuple(v.co) for v in o.data.vertices]);lo=coords.min(0);hi=coords.max(0);span=hi-lo
 coords[:,:2]-=(lo[:2]+hi[:2])*.5;coords[:,2]-=lo[2];coords*=np.array([f['width']/span[0],f['depth']/span[1],f['height']/span[2]])
 for v,co in zip(o.data.vertices,coords):v.co=co
 o.rotation_euler.z=f['yaw'];o.location=(f['x'],-f['z'],0)
after=witnesses();assert before==after,'Background study changed accepted foreground';assert camera_before==[list(row) for row in scene.camera.matrix_world]
scene.render.filepath=os.path.join(OUT,'background-candidate-final.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SOURCE,'background-projection-study.blend'))
with open(os.path.join(SOURCE,'preview-invariants.json'),'w') as f:json.dump({'foregroundBefore':before,'foregroundAfter':after,'cameraMatrix':camera_before,'resolution':[scene.render.resolution_x,scene.render.resolution_y],'sameCamera':True,'sameForeground':True},f,indent=2)
