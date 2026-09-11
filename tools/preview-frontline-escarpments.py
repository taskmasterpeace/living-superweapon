"""CPU clay proof of source geometry at the native camera, NOT game evidence."""
import bpy,numpy as np,os,json,math,sys
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));SOURCE=os.path.join(ROOT,'assets-src/frontline-escarpment-study');OUT=os.path.join(ROOT,'artifacts/frontline-escarpment-study');os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
with open(os.path.join(SOURCE,'layout.json')) as f:candidate=json.load(f)
with open(os.path.join(SOURCE,'baseline-layout.json')) as f:baseline=json.load(f)
with bpy.data.libraries.load(os.path.join(ROOT,'assets-src/frontline-mesas/eroded-mesa-kit.blend'),link=False) as (a,b):b.objects=[f'mesa-{i}-lod{j}' for i in range(4) for j in range(2)]
old={o.name:o for o in b.objects}
with bpy.data.libraries.load(os.path.join(SOURCE,'tiered-escarpment-kit.blend'),link=False) as (a,b):b.objects=[f'escarpment-{i}-lod{j}' for i in range(4) for j in range(2)]
new={o.name:o for o in b.objects}
clay=bpy.data.materials.new('neutral-sandstone-clay');clay.use_nodes=True
shader=clay.node_tree.nodes.get('Principled BSDF');shader.inputs['Base Color'].default_value=(.40,.31,.23,1);shader.inputs['Roughness'].default_value=.96
def mesh_object(name,vertices,faces):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update();mesh.materials.append(clay)
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
 for p in mesh.polygons:p.use_smooth=True
 return obj
def placed(f,sources,label,near=True):
 key=('escarpment' if sources is new else 'mesa')+f'-{f["profile"]}-lod{0 if near else 1}'
 obj=sources[key].copy();obj.data=sources[key].data.copy();bpy.context.collection.objects.link(obj);obj.name=label
 obj.data.materials.clear();obj.data.materials.append(clay)
 coords=np.array([tuple(v.co) for v in obj.data.vertices]);lo=coords.min(0);hi=coords.max(0);span=hi-lo
 coords[:,:2]-=(lo[:2]+hi[:2])*.5;coords[:,2]-=lo[2];coords*=np.array([f['width']/span[0],f['depth']/span[1],f['height']/span[2]])
 if near:
  # Native cylinder eight-sided base produces the authoritative rotated AABB.
  a=np.arange(8)*math.tau/8;corners=np.column_stack((np.sin(a)*f['width']*.5,np.cos(a)*f['depth']*.5));c=math.cos(f['yaw']);s=math.sin(f['yaw'])
  transform=np.array([[c,s],[-s,c]]);rotated=coords[:,:2]@transform;cover=corners@transform
  half=np.max(np.abs(cover),axis=0);maximum=np.max(np.abs(rotated),axis=0);coords[:,:2]*=min(1,*list(half/maximum))
 for v,co in zip(obj.data.vertices,coords):v.co=co
 obj.rotation_euler.z=f['yaw'];obj.location=(f['x'],-f['z'],f.get('base',0));return obj

def native_floor(field,name):
 axis=np.linspace(-1028,1028,257);vertices=[(float(x),float(-z),float(field[r,c])) for r,z in enumerate(axis) for c,x in enumerate(axis)];faces=[]
 for r in range(256):
  for c in range(256):a=r*257+c;faces.extend([(a,a+257,a+1),(a+1,a+257,a+258)])
 return mesh_object(name,vertices,faces)

with open(os.path.join(SOURCE,'baseline-far-floor.json')) as f:farfloor=json.load(f)
def scene_case(candidate_on):
 objects=[];layout=candidate if candidate_on else baseline;sources=new if candidate_on else old
 field=np.fromfile(os.path.join(SOURCE,'native-bed.f32') if candidate_on else os.path.join(ROOT,'assets-src/frontline-heightfield-candidate/native-after.f32'),dtype='<f4').reshape(257,257)
 objects.append(native_floor(field,'candidate-native-bed' if candidate_on else 'baseline-native-bed'))
 # Identical existing exterior floor in both views. New far geometry alone must
 # prove improved layering; no invented elevation or fog makes it look better.
 fp=np.array(farfloor['position']).reshape(-1,3);idx=np.array(farfloor['index']).reshape(-1,3)
 objects.append(mesh_object('existing-far-floor',fp.tolist(),idx.tolist()))
 for i,f in enumerate(layout['formations']):objects.append(placed(f,sources,f'formation-{i}'))
 for i,f in enumerate(layout['far']):objects.append(placed(f,sources,f'distant-{i}',False))
 return objects

bpy.ops.object.light_add(type='SUN',location=(-300,600,900));sun=bpy.context.object;sun.data.energy=3;sun.rotation_euler=(.35,-.60,-.50);sun.data.angle=.075
bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.clip_end=18000
camera.location=(-83.2903,20.99856,159.1279);direction=Vector((0,-math.cos(-.156),math.sin(-.156)));camera.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
camera.data.type='PERSP';camera.data.sensor_fit='VERTICAL';camera.data.sensor_height=24;camera.data.lens=24/(2*math.tan(math.radians(68)*.5))
scene=bpy.context.scene;scene.camera=camera;scene.world.color=(.17,.20,.24);scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=20;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=8
scene.render.resolution_x=1671;scene.render.resolution_y=941;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
if '--kit-only' not in sys.argv:
 for is_new in [False,True]:
  if '--candidate-only' in sys.argv and not is_new:continue
  objects=scene_case(is_new);scene.render.filepath=os.path.join(OUT,'native-projection-'+('candidate-final' if is_new else 'baseline')+'.png');bpy.ops.render.render(write_still=True)
  if is_new:bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SOURCE,'native-projection-study.blend'))
  for obj in objects:bpy.data.objects.remove(obj,do_unlink=True)

if '--candidate-only' in sys.argv:sys.exit(0)

# Four-profile comparison under a raking key, displayed at their intended aspect.
for i,(w,d,h) in enumerate([(240,200,145),(240,180,150),(170,180,235),(220,190,250)]):
 for row,sources in enumerate([old,new]):
  placed({'x':(i-1.5)*320,'z':row*470,'width':w,'depth':d,'height':h,'yaw':-.2,'profile':i},sources,f'kit-{row}-{i}')
bpy.ops.mesh.primitive_plane_add(size=2800,location=(0,-235,-3));bpy.context.object.data.materials.append(clay)
camera.location=(-900,1300,1050);camera.rotation_euler=(Vector((0,-220,70))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=1780
scene.render.resolution_x=1600;scene.render.resolution_y=1050;scene.render.filepath=os.path.join(OUT,'kit-baseline-front-candidate-final-back.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SOURCE,'clay-study.blend'))
