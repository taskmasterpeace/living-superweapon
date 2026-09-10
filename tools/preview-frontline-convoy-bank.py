"""Only source native bed differs. Actual static vehicles retain native transforms."""
import bpy,numpy as np,os,json,hashlib,sys
from mathutils import Matrix
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));SOURCE=os.path.join(ROOT,'assets-src/frontline-convoy-bank-study');OUT=os.path.join(ROOT,'artifacts/frontline-convoy-bank-study');os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'assets-src/frontline-background-study/background-projection-study.blend'))
scene=bpy.context.scene;scene.cycles.device='CPU';scene.render.threads_mode='FIXED';scene.render.threads=8;scene.cycles.samples=20
clay=bpy.data.materials.get('neutral-sandstone-clay')
with open(os.path.join(SOURCE,'convoy-parking-witnesses.json')) as f:parking=json.load(f)
before=set(scene.objects);bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'public/models/frontline/armored-scout.glb'));loaded=[o for o in scene.objects if o not in before]
root=bpy.data.objects.new('vehicle-source-root',None);bpy.context.collection.objects.link(root)
for o in loaded:
 if o.parent not in loaded:o.parent=root
 if o.type=='MESH':o.data.materials.clear();o.data.materials.append(clay)
# The imported GLB has already been converted to Blender's Z-up axes. Convert
# each actual Three world transform into that same coordinate basis.
C=np.array([[1,0,0,0],[0,0,-1,0],[0,1,0,0],[0,0,0,1]],dtype=float)
for i,p in enumerate(parking['parks']):
 instance=bpy.data.objects.new(f'parked-scout-{i}',None);bpy.context.collection.objects.link(instance)
 mapping={}
 for original in [root]+loaded:
  clone=original.copy();bpy.context.collection.objects.link(clone);mapping[original]=clone
 for original,clone in mapping.items():clone.parent=mapping.get(original.parent,instance)
 native=np.array(p['matrix']).reshape(4,4).T;instance.matrix_world=Matrix((C@native@np.linalg.inv(C)).tolist())
for o in [root]+loaded:bpy.data.objects.remove(o,do_unlink=True)
floor=scene.objects.get('candidate-native-bed');assert floor is not None
base=np.array([tuple(v.co) for v in floor.data.vertices],dtype=np.float32);camera=[list(row) for row in scene.camera.matrix_world]
fixed={o.name:hashlib.sha256(np.array([tuple(v.co) for v in o.data.vertices],dtype=np.float32).tobytes()).hexdigest() for o in scene.objects if o.type=='MESH' and o!=floor}
if '--candidate-only' not in sys.argv:
 scene.render.filepath=os.path.join(OUT,'bank-baseline.png');bpy.ops.render.render(write_still=True)
height=np.fromfile(os.path.join(SOURCE,'native-bed.f32'),dtype='<f4');assert len(height)==len(floor.data.vertices)
for i,v in enumerate(floor.data.vertices):v.co.z=float(height[i])
floor.data.update();scene.render.filepath=os.path.join(OUT,'bank-candidate-final.png' if '--candidate-only' in sys.argv else 'bank-candidate.png');bpy.ops.render.render(write_still=True)
after={o.name:hashlib.sha256(np.array([tuple(v.co) for v in o.data.vertices],dtype=np.float32).tobytes()).hexdigest() for o in scene.objects if o.type=='MESH' and o!=floor};assert fixed==after;assert camera==[list(row) for row in scene.camera.matrix_world]
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SOURCE,'convoy-bank-projection-study.blend'))
with open(os.path.join(SOURCE,'preview-invariants.json'),'w') as f:json.dump({'sameCamera':True,'sameOtherMeshes':fixed==after,'fixedMeshes':fixed,'cameraMatrix':camera,'resolution':[scene.render.resolution_x,scene.render.resolution_y]},f,indent=2)
