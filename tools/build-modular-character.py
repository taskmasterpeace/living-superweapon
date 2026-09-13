"""Rebuildable faceted character, authored on the original UAL deform skeleton.
Run Blender --background --python tools/build-modular-character.py -- SOURCE OUTPUT.
No procedural combat animation: retained actions are imported source clips.
"""
import bpy, math, sys, os, json, hashlib
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]; source,out=args
os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=source)
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
keep={'A_TPose','Idle_Loop','Punch_Enter','Punch_Jab','Punch_Cross','Sword_Idle','Sword_Attack','Walk_Loop','Sprint_Loop','Jump_Loop','Hit_Chest','Death01'}
for action in list(bpy.data.actions):
 if action.name not in keep:bpy.data.actions.remove(action)
if rig.animation_data:
 rig.animation_data.action=None
 for track in list(rig.animation_data.nla_tracks):rig.animation_data.nla_tracks.remove(track)
rig.data.pose_position='REST'
for o in list(bpy.data.objects):
 if o.type=='MESH':bpy.data.objects.remove(o,do_unlink=True)
def material(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*color,1);m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.78;return m
mats={k:material(k,v) for k,v in {'suit':(.72,.76,.73),'accent':(.52,.035,.018),'dark':(.025,.033,.034),'skin':(.55,.34,.19),'metal':(.5,.42,.22),'eye':(.012,.012,.009),'face':(1,1,1)}.items()}
parts=[]
def bind(obj,bone,mat,slot):
 obj.data.materials.append(mats[mat]);obj['slot']=slot;obj['skeletonVersion']='ual-deform-v1';vg=obj.vertex_groups.new(name=bone);vg.add(list(range(len(obj.data.vertices))),1,'REPLACE');mod=obj.modifiers.new('Canonical skeleton','ARMATURE');mod.object=rig;obj.parent=rig;parts.append(obj);return obj
def box(name,center,size,bone,mat,slot,bevel=.015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=center);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Faceted edges','BEVEL');mod.width=bevel;mod.segments=1;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return bind(o,bone,mat,slot)
def mesh(name,verts,faces,bone,mat,slot):
 d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.update();o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);return bind(o,bone,mat,slot)
def rings(name,rings,bone,mat,slot):
 # Chamfered rectangular section: eight vertices, broad planar faces.
 verts=[]
 for z,w,d in rings:
  for x,y in [(-w*.7,-d),(w*.7,-d),(w,-d*.7),(w,d*.7),(w*.7,d),(-w*.7,d),(-w,d*.7),(-w,-d*.7)]:verts.append((x,y,z))
 faces=[tuple(reversed(range(8)))];n=len(rings)
 for r in range(n-1):
  for i in range(8):a=r*8+i;b=r*8+(i+1)%8;faces.append((a,b,b+8,a+8))
 faces.append(tuple(range((n-1)*8,n*8)));return mesh(name,verts,faces,bone,mat,slot)
def segment(name,bone,width,depth,mat,slot,portion=(0,1)):
 b=rig.data.bones[bone];a=b.head_local.lerp(b.tail_local,portion[0]);c=b.head_local.lerp(b.tail_local,portion[1]);v=c-a
 o=box(name,(a+c)*.5,(width,depth,v.length+.012),bone,mat,slot,min(.012,width*.15));o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(v.normalized());return o
def shaped_segment(name,bone,profile,mat,slot):
 b=rig.data.bones[bone];direction=b.tail_local-b.head_local
 o=rings(name,[(t*direction.length,w,d) for t,w,d in profile],bone,mat,slot)
 o.location=b.head_local;o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(direction.normalized());return o
rings('Torso.chest',[(1.16,.145,.092),(1.34,.215,.107),(1.44,.215,.099),(1.49,.115,.082)],'DEF-spine.003','suit','torso')
rings('Torso.waist',[(1.00,.135,.085),(1.17,.15,.096)],'DEF-spine.001','dark','torso')
box('Abdominal.panel',(0,-.092,1.125),(.16,.008,.16),'DEF-spine.001','suit','torso',.003)
rings('Pelvis',[(.85,.12,.09),(.98,.155,.105),(1.04,.14,.092)],'DEF-hips','dark','waist')
box('Belt',(0,-.008,1.025),(.31,.21,.055),'DEF-hips','dark','belt')
box('Buckle',(0,-.12,1.025),(.065,.025,.045),'DEF-hips','accent','belt',.005)
box('Neck',(0,0,1.53),(.10,.10,.11),'DEF-neck','dark','head')
box('Head',(0,-.008,1.67),(.215,.18,.25),'DEF-head','skin','head',.021)
mesh('Hair.swept',[(-.12,-.109,1.752),(.12,-.109,1.773),(.118,.10,1.765),(-.118,.10,1.765),(-.125,-.128,1.808),(.13,-.132,1.8325),(.108,.095,1.802),(-.108,.095,1.794)],[(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7),(3,2,1,0)],'DEF-head','dark','hair')
box('Hair.back',(0,.075,1.70),(.22,.048,.18),'DEF-head','dark','hair',.008)
for o in parts:
 if o.get('slot')=='hair':o['variant']='swept'
def hairball(name,center,scale,variant,subdiv=1):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv,radius=1,location=center);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);bind(o,'DEF-head','dark','hair');o['variant']=variant
hairball('Afro.volume',(0,.045,1.77),(.17,.13,.155),'afro',2)
for i in range(8):
 a=i*math.pi/4;hairball('Afro.curl'+str(i),(math.cos(a)*.115,.012+math.sin(a)*.105,1.79),(.065,.062,.065),'afro')
for s in [-1,1]:hairball('Afro.side'+str(s),(s*.132,.035,1.695),(.060,.07,.065),'afro')
hairball('Bun.cap',(0,.017,1.78),(.125,.12,.080),'bun',2)
hairball('Bun.top',(0,.025,1.89),(.08,.08,.075),'bun',2)
hairball('Braids.cap',(0,.022,1.785),(.12,.115,.06),'braids',2)
for i in range(7):
 x=(i-3)*.033;o=rings('Braid.'+str(i),[(1.48,.015,.018),(1.65,.019,.02),(1.78,.015,.018)],'DEF-head','dark','hair');o.location=(x,.102+abs(i-3)*.004,0);o['variant']='braids'
box('Visor',(0,-.111,1.702),(.225,.022,.042),'DEF-head','accent','visor',.006)
for s in [-1,1]:box('Visor.temple'+str(s),(s*.112,-.009,1.702),(.018,.20,.033),'DEF-head','accent','visor',.004)
box('Eyepatch',(-.050,-.120,1.704),(.078,.018,.060),'DEF-head','dark','eyepatch',.008)
box('Eyepatch.band',(0,.005,1.724),(.227,.20,.013),'DEF-head','dark','eyepatch',.003)
face=mesh('Face.expression',[(-.092,-.103,1.585),(.092,-.103,1.585),(.092,-.103,1.755),(-.092,-.103,1.755)],[(0,1,2,3)],'DEF-head','face','expression')
uv=face.data.uv_layers.new(name='UVMap')
for i,co in enumerate([(0,0),(1,0),(1,1),(0,1)]):uv.data[i].uv=co
box('Nose',(0,-.115,1.664),(.028,.036,.036),'DEF-head','skin','head',.008)
box('Helmet.shell',(0,.003,1.79),(.26,.23,.14),'DEF-head','dark','helmet',.035)
box('Helmet.brim',(0,-.045,1.74),(.29,.26,.027),'DEF-head','dark','helmet',.008)
box('Field.vest',(0,-.025,1.31),(.38,.25,.28),'DEF-spine.003','dark','vest',.025)
box('Field.pack',(0,.19,1.27),(.27,.16,.30),'DEF-spine.003','dark','backpack',.025)
for s in [-1,1]:
 box('Field.strap'+str(s),(s*.125,-.167,1.34),(.045,.022,.28),'DEF-spine.003','metal','vest',.003)
 for j in range(2):box('Pouch'+str(s)+str(j),(s*(.09+j*.095),-.13,1.006),(.075,.065,.105),'DEF-hips','metal','pouches',.008)
emblem=mesh('Emblem.patch',[(-.094,-.184,1.265),(.094,-.184,1.265),(.094,-.184,1.44),(-.094,-.184,1.44)],[(0,1,2,3)],'DEF-spine.003','face','emblem')
uv=emblem.data.uv_layers.new(name='UVMap')
for i,co in enumerate([(0,0),(1,0),(1,1),(0,1)]):uv.data[i].uv=co
for side in ['L','R']:
 s=1 if side=='L' else -1
 arm=shaped_segment('UpperArm.'+side,'DEF-upper_arm.'+side,[(0,.073,.075),(.20,.086,.086),(.48,.094,.092),(.70,.080,.078),(1,.059,.062)],'suit','arms')
 # Morph only the middle rings: shoulder and elbow seam vertices never move.
 arm.shape_key_add(name='Basis')
 for name,scale in [('muscleSmall',.76),('muscleLarge',1.30)]:
  key=arm.shape_key_add(name=name)
  for i,v in enumerate(key.data):
   influence=[0,.75,1,.65,0][i//8];v.co.x*=1+(scale-1)*influence;v.co.y*=1+(scale-1)*influence
 shaped_segment('Gauntlet.'+side,'DEF-forearm.'+side,[(0,.09,.092),(.16,.097,.098),(.73,.075,.077),(1,.053,.057)],'accent','gauntlets')
 b=rig.data.bones['DEF-upper_arm.'+side]
 box('Pauldron.'+side,b.head_local+Vector((s*.032,0,.025)),(.19,.20,.16),'DEF-upper_arm.'+side,'accent','shoulders',.035)
 segment('Thigh.'+side,'DEF-thigh.'+side,.165,.18,'suit','legs')
 shaped_segment('Boot.shaft.'+side,'DEF-shin.'+side,[(0,.065,.072),(.60,.059,.063),(1,.052,.060)],'dark','boots')
 knee=rig.data.bones['DEF-shin.'+side].head_local
 box('Knee.'+side,knee+Vector((0,-.075,0)),(.13,.055,.12),'DEF-shin.'+side,'accent','knees',.018)
 foot=rig.data.bones['DEF-foot.'+side].head_local
 mesh('Boot.foot.'+side,[(foot.x+x,y,z) for x,y,z in [(-.055,.073,.022),(.055,.073,.022),(.07,-.175,.022),(-.07,-.175,.022),(-.052,.063,.135),(.052,.063,.135),(.064,-.164,.069),(-.064,-.164,.069)]],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],'DEF-foot.'+side,'dark','boots')
 hand=rig.data.bones['DEF-hand.'+side];mid=hand.head_local+Vector((s*.057,0,0))
 box('Palm.'+side,mid,(.116,.083,.042),'DEF-hand.'+side,'dark','hands',.01)
 for finger in ['f_middle','thumb']:
  for n in range(1,4):
   bone=f'DEF-{finger}.{n:02d}.{side}'
   # One joined four-finger block, plus a separate thumb. No individual digits.
   b=rig.data.bones[bone];a=b.head_local;c=b.tail_local;v=c-a
   o=box('Mitten.'+bone,(a+c)*.5,(.027,.077 if finger!='thumb' else .027,v.length+.012),bone,'dark','hands',0);o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(v.normalized())
 # Palm grip socket is exported as a bone child with a stable transform.
 sock=bpy.data.objects.new('socket.grip.'+side,None);bpy.context.collection.objects.link(sock);sock.parent=rig;sock.parent_type='BONE';sock.parent_bone='DEF-hand.'+side
 sock.matrix_world.translation=mid+Vector((0,0,-.025));sock['slot']='weapon';sock['side']=side
# Cape is a modular mesh rigidly weighted to the chest, not simulated physics.
for o in parts:
 if o.get('slot')=='torso':
  o.shape_key_add(name='Basis');key=o.shape_key_add(name='waistNarrow')
  for v in key.data:
   world=o.matrix_world@v.co
   # The shoulder seam stays broad while the waist tapers inward.
   t=max(0,min(1,(1.35-world.z)/.20));v.co.x*=1-.24*t
verts=[]
for z,w,y in [(1.46,.17,.12),(1.16,.20,.17),(.72,.25,.24),(.31,.28,.29)]:
 for col in [-1,0,1]:verts.append((w*col,y+(.055 if col==0 else 0),z+(.028 if col==0 else 0)))
cape=mesh('Cape',verts,[(r*3+c,r*3+c+1,(r+1)*3+c+1,(r+1)*3+c) for r in range(3) for c in range(2)],'DEF-spine.003','accent','cape')
cape.data.materials[0].use_backface_culling=False
rig.data.pose_position='POSE';bpy.context.scene.render.fps=30
# Actions are exported directly; no direction-vector sampling or wrist reconstruction.
rig.animation_data_create();rig.animation_data.action=next(a for a in bpy.data.actions if a.name=='Idle_Loop')
if hasattr(rig.animation_data,'action_slot'):rig.animation_data.action_slot=rig.animation_data.action.slots[0]
bpy.context.scene.frame_set(0)
blend_dir=os.path.abspath(os.path.join(os.path.dirname(__file__),'../assets-src/modular-character'))
os.makedirs(blend_dir,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(blend_dir,'modular-hero.blend'))
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in parts)
module_names=[o.name for o in parts]
# Preserve editable pieces in .blend, batch matching material/slot for runtime.
groups={}
for o in parts:groups.setdefault((o['slot'],o.data.materials[0].name,o.get('variant','')),[]).append(o)
for (slot,mat,variant),objects in groups.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.object.join();objects[0].name='module.'+slot+'.'+mat+('.'+variant if variant else '')
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'modular-hero.glb'),export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_extras=True,export_skins=True,export_yup=True)
with open(source,'rb') as f:source_hash=hashlib.sha256(f.read()).hexdigest()
with open(os.path.join(out,'manifest.json'),'w') as f:json.dump({'schema':1,'skeleton':'ual-deform-v1','source':'assets-src/modular-character/source/AnimationLibrary_Godot_Standard.gltf','sourceHash':source_hash,'sourceAuthor':'Quaternius','sourceLicense':'CC0-1.0','units':'meters','height':1.8325,'triangles':triangles,'modules':module_names,'runtimeGroups':len(groups),'clips':sorted(keep),'style':'faceted modular; original geometry'},f,indent=2)
print('CHARACTER_BUILT',triangles,'triangles',len(module_names),'editable pieces',len(groups),'runtime groups')
