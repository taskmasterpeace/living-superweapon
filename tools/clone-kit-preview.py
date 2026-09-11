"""CPU Blender source presentation. Explicitly staged; never a gameplay image."""
import bpy,json,math,sys,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'assets-src/frontline-clone-kit';OUT=BASE/'v3'if '--v3'in sys.argv else BASE
ref=json.loads((BASE/'native-reference.json').read_text());kit=json.loads((OUT/'clone-kit-meshes.json').read_text())
assetHash=hashlib.sha256((OUT/'clone-kit.glb').read_bytes()).hexdigest();meshHash=hashlib.sha256((OUT/'clone-kit-meshes.json').read_bytes()).hexdigest();rendered=[]
def pt(v):return(v[0],-v[2],v[1])
def matrix(a):return Matrix([a[i::4]for i in range(4)])
def mat(name,color,rough=.8,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1);p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;return m
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
shell=mat('Original olive shell',(.145,.165,.105));cloth=mat('Original khaki webbing',(.255,.224,.147),.93);hardware=mat('Dark rubber and hardware',(.027,.032,.024),.72,.12);skin=mat('Source skin reference',(.43,.26,.15));suit=mat('Current source green field cloth',(.105,.15,.067),.93);eye=mat('Source eye reference',(.70,.66,.52),.38);brow=mat('Source eyebrow reference',(.018,.024,.016));boot=mat('Existing original boot/guard',(.11,.13,.075),.65,.08);gun=mat('Existing rifle',(.045,.056,.034),.58,.14)
materials=[shell,cloth,hardware]
pose=next(p for p in ref['poses']if p['mode']=='fire'and p['phase']==.5)
objects=[]
def mesh(name,vs,fs,mats,regions=None,smooth=False):
 me=bpy.data.meshes.new(name);me.from_pydata([pt(v)for v in vs],[],fs);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o)
 for m in mats:me.materials.append(m)
 for p in me.polygons:
  p.use_smooth=smooth
  if regions is not None:p.material_index=1 if sum(regions[i]for i in p.vertices)>=2 else 0
 objects.append(o);return o
def vs(m):return [Vector(m['position'][i:i+3])for i in range(0,len(m['position']),3)]
def fs(m):return [m['index'][i:i+3]for i in range(0,len(m['index']),3)]
for m in pose['meshes']:
 material=gun if m['group']=='rifle'else boot if m['group']in['forearm','boot']else eye if m['name']=='hero-skin-eyes'else brow if m['name']=='hero-skin-eyebrows'else suit
 mesh(m['name']or'existing rifle',vs(m),fs(m),[material,skin],m['regions']if m['name']=='hero-skin-body'else None,m['group']=='source-body')
for attachment,pieces in kit.items():
 transform=matrix(pose['head'if attachment.endswith('head')else'torso'])
 for m in pieces:mesh(m['name'],[transform@v for v in vs(m)],fs(m),[materials[m['material']]],smooth=attachment.endswith('head'))
floorMat=mat('Neutral inspection floor',(.12,.135,.12),.95)
bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.data.materials.append(floorMat);floor.location.z=-.01
world=bpy.context.scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.43,.48,.53,1);world.node_tree.nodes['Background'].inputs[1].default_value=.42
for loc,power,size in [((5,-8,14),2100,8),((-7,-2,10),1400,7),((2,8,12),2400,7)]:
 bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector((0,0,5))-l.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=10.8
scene=bpy.context.scene;scene.camera=camera;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=4;scene.render.resolution_x=800;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
textMat=mat('Label',(1,.92,.72));label=None
views={'front':((2.5,-20,8),(0,0,4.4),10.8),'right':((20,-1,8),(0,0,4.4),10.8),'rear':((-2.5,20,8),(0,0,4.4),10.8),'left':((-20,-1,8),(0,0,4.4),10.8),'helmet':((3,-9,10.2),(0,0,7.6),3.7)}
chosen=sys.argv[sys.argv.index('--views')+1].split(',')if'--views'in sys.argv else list(views)
for view in chosen:
 loc,target,scale=views[view];camera.location=loc;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=scale
 if label:bpy.data.objects.remove(label,do_unlink=True)
 curve=bpy.data.curves.new('Source label','FONT');curve.body='SOURCE-ONLY CLONE KIT\n'+view.upper()+' / STAGED RIFLE POSE';curve.size=.11*scale/3.7;curve.align_x='CENTER';curve.materials.append(textMat);label=bpy.data.objects.new('NOT GAMEPLAY',curve);bpy.context.collection.objects.link(label);label.rotation_euler=camera.rotation_euler
 label.location=Vector(target)+camera.rotation_euler.to_quaternion()@Vector((0,scale*.465,5))
 filename=('source-v3-'+assetHash[:8]+'-'if '--v3'in sys.argv else'source-')+view+'.png';scene.render.filepath=str(OUT/filename);bpy.ops.render.render(write_still=True);rendered.append({'file':filename,'sha256':hashlib.sha256((OUT/filename).read_bytes()).hexdigest()})
if '--v3'in sys.argv:(OUT/'source-preview-validation.json').write_text(json.dumps({'kind':'CPU source render, staged native rifle pose, not gameplay','assetSha256':assetHash,'meshSha256':meshHash,'images':rendered},indent=2))
print('SOURCE_PREVIEWS',chosen)
