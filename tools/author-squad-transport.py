"""Reproducible transport blockout. Blender 4.5 --background --python this-file.
Source: X right, Y forward, Z up. GLB converts to Y-up. Dimensions in game units.
"""
import bpy, bmesh, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'assets-src/squad-transport'; OUT=ROOT/'public/models/squad-transport'
SRC.mkdir(parents=True,exist_ok=True); OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def mat(n,c):
 m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*c,1);m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.65;return m
ivory=mat('shared_ivory',(.68,.65,.55)); dark=mat('shared_charcoal',(.055,.067,.071)); red=mat('shared_red',(.42,.035,.025)); gold=mat('shared_amber',(.95,.48,.035)); glass=mat('cockpit_glass',(.07,.16,.19))
def box(n,p,d,m=ivory):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=n;o.dimensions=d;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 mod=o.modifiers.new('shared_edge_chamfer','BEVEL');mod.width=min(.4,min(d)*.12);mod.segments=1;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def mesh(n,vs,faces,m):
 me=bpy.data.meshes.new(n);me.from_pydata(vs,[],faces);me.update();bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free();o=bpy.data.objects.new(n,me);bpy.context.collection.objects.link(o);o.data.materials.append(m);return o
def wedge(n,x0,x1,y0,y1,z0,z1,m):
 return mesh(n,[(x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0),(x0,y0,z1),(x1,y0,z1)],[(0,3,2,1),(0,1,5,4),(1,2,5),(2,3,4,5),(3,0,4)],m)
root=bpy.data.objects.new('transport_root',None);bpy.context.collection.objects.link(root)
box('cabin_floor',(0,0,5),(22,40,1.4),dark)
box('cabin_roof',(0,0,22),(22,40,1.2))
for side in [-1,1]:
 box('side_shell_'+str(side),(side*10.5,0,13.5),(1,40,16))
 box('side_red_band_'+str(side),(side*12.45,0,17),(.12,34,2.5),red)
 wedge('swept_wing_'+str(side),min(side*11,side*30),max(side*11,side*30),-11,9,10,12,ivory)
 box('nacelle_'+str(side),(side*27,-3,11),(8,24,8),dark)
 box('nacelle_armor_'+str(side),(side*27,-3,15.5),(8.4,21,1),ivory)
 box('intake_'+str(side),(side*27,9.1,11),(6,.3,5),glass)
 box('marker_'+str(side),(side*27,9.4,14),(4,.2,.5),gold)
 for y in [-13,12]:
  box('gear_strut',(side*8,y,3),(1.4,1.4,5),dark)
  bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=2.3,depth=1.6,location=(side*8,y,2.3),rotation=(0,math.pi/2,0));bpy.context.object.name='wheel';bpy.context.object.data.materials.append(dark)
# Faceted nose ahead of cabin; cockpit windows deliberately broad.
wedge('nose',-11,11,20,35,5,19,ivory)
box('cockpit_canopy',(0,22,19),(17,5,3),glass)
box('nose_red',(0,28,13),(5,3,2),red)
wedge('tail_fin',-.6,.6,-19,-10,22,33,red)
# Rear aperture: 14 wide x 16 high. No back-wall mesh blocks the opening.
for side in [-1,1]:box('rear_jamb_'+str(side),(side*9,-20,13.5),(4,1.2,16))
box('rear_header',(0,-20,22),(22,1.2,1.2))
ramp=mesh('rear_ramp',[(-7,-20,5.7),(7,-20,5.7),(7,-38,.5),(-7,-38,.5),(-7,-20,5),(7,-20,5),(7,-38,0),(-7,-38,0)],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],dark)
for y in range(-36,-20,3):box('ramp_tread',(0,y,.5+(y+38)*5.2/18),(13,.35,.15),ivory)
# Hinge owns the ramp and treads. Source coordinates convert to [0,5.7,20].
hinge=bpy.data.objects.new('rear_ramp_hinge',None);bpy.context.collection.objects.link(hinge);hinge.location=(0,-20,5.7);hinge.parent=root
bpy.context.view_layer.update()
for o in list(bpy.context.scene.objects):
 if o.name=='rear_ramp' or o.name.startswith('ramp_tread'):
  world_matrix=o.matrix_world.copy();o.parent=hinge;o.matrix_world=world_matrix
# Linked meshes: all passenger chairs share geometry/material resources.
templates=[]
for name,p,d,m in [('seat_base',(0,0,2),(4.2,4.6,1),dark),('seat_cushion',(0,0,2.7),(4,4,.5),red),('seat_back',(0,-1.9,5),(4.2,.8,5),dark),('seat_pad',(0,-1.4,5),(3.4,.35,4),red)]:templates.append(box(name,p,d,m))
for side in [-1,1]:
 templates.append(box('seat_armrest',(side*2.1,0,4),(.5,3.5,.55),ivory))
 templates.append(box('seat_harness',(side*.75,-1.15,5),(.24,.12,3.2),dark))
templates.append(box('seat_headrest',(0,-1.9,8),(2.6,.9,1.5),dark))
seats=[]
for idx,(x,y) in enumerate([(x,y) for x in [-6.8,6.8] for y in [-12,0,12]]):
 seats.append({'id':'passenger_'+str(idx),'position':[x,3.9,-y],'role':'passenger','anchor':'seated actor root','yaw':math.pi})
 for t in templates:
  o=bpy.data.objects.new('passenger_%s_%s'%(idx,t.name),t.data);bpy.context.collection.objects.link(o);o.location=t.location+Vector((x,y,5.7))
# Additional reusable armor and cabin details; dimensions preserve the established aisle.
def pod(n,x,y):
 rings=[]
 for z,w,d in [(5,2.6,4),(7,4,6),(19,4,6),(23,2.8,4)]:
  rings.extend([(x-w*.65,y-d,z),(x+w*.65,y-d,z),(x+w,y-d*.65,z),(x+w,y+d*.65,z),(x+w*.65,y+d,z),(x-w*.65,y+d,z),(x-w,y+d*.65,z),(x-w,y-d*.65,z)])
 faces=[tuple(reversed(range(8))),tuple(range(24,32))]
 for row in range(3):
  for k in range(8):faces.append((row*8+k,row*8+(k+1)%8,(row+1)*8+(k+1)%8,(row+1)*8+k))
 return mesh(n,rings,faces,ivory)
for side in [-1,1]:
 for n in ['nacelle_'+str(side),'nacelle_armor_'+str(side),'intake_'+str(side),'marker_'+str(side)]:
  o=bpy.data.objects.get(n)
  if o:bpy.data.objects.remove(o,do_unlink=True)
 pod('armored_lift_pod_'+str(side),side*27,-3)
 box('pod_red_cap',(side*27,-3,23.1),(4.8,6.8,.4),red)
 box('pod_recess',(side*27,-9.05,13),(4.6,.2,8),dark)
 box('pod_beacon',(side*27,-9.2,13),(2,.2,.65),gold)
 for y in [-6,-3,0]:box('pod_top_vent',(side*27,y,23.1),(3.6,.7,.16),dark)
 for y in [-13,0,13]:
  # Broken-up armor panels create recessed joints without noisy texture maps.
  box('side_shell_panel',(side*12.1,y,12.5),(.5,11.8,10.6),ivory)
  box('side_shell_lower_rail',(side*11.5,y,6.8),(.7,11.5,1.8),dark)
  box('side_shell_upper_bevel',(side*10.4,y,21.5),(2,11.8,1.5),ivory).rotation_euler.y=side*.3
 for y in [-14,0,14]:
  box('cabin_roof_rib',(0,y,21),(18,.8,.8),dark)
  box('cabin_roof_light',(0,y,20.5),(3.2,1.2,.16),gold)
  box('side_shell_interior_rib',(side*9.7,y,14),(.6,.8,12),dark)
 for y in [-13,12]:
  box('gear_piston',(side*8,y,3.7),(.6,.6,4.4),ivory)
  bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=1.15,depth=1.72,location=(side*8,y,2.3),rotation=(0,math.pi/2,0));bpy.context.object.name='gear_hub';bpy.context.object.data.materials.append(ivory)
# Broad angled glazing and frames replace the tiny opaque cockpit block.
o=bpy.data.objects.get('cockpit_canopy');bpy.data.objects.remove(o,do_unlink=True)
for side in [-1,1]:
 x0=.35*side;x1=8.5*side
 mesh('cockpit_windscreen',[(x0,21,21.5),(x1,21,21.5),(x1*.8,30,14.5),(x0,31,14.5)],[(0,1,2,3)],glass)
 mesh('cockpit_side_glass',[(side*8.8,20.5,21),(side*10.8,20.5,16),(side*7.5,30,14),(side*8.5,29,15)],[(0,1,2,3)],glass)
 box('cockpit_frame',(side*8.7,25,18),(.5,11,.5),dark).rotation_euler.x=-.6
box('cockpit_center_frame',(0,26,18),(.6,13,.5),ivory).rotation_euler.x=-.6
box('nose_lower_armor',(0,29,8),(15,8,2.2),dark)
for side in [-1,1]:box('landing_lamp',(side*7,30,10),(2,.5,.7),gold)
# Cabin floor runners, entry lights and ramp borders share the source recipe.
for side in [-1,1]:
 box('floor_runner',(side*3.8,0,5.76),(.3,38,.06),ivory)
 box('entry_light',(side*7.3,-20.7,12),(.35,.25,3),gold)
 for y in [-34,-25]:
  o=box('ramp_edge_light',(side*6.2,y,.5+(y+38)*5.2/18+.15),(.4,1.4,.12),gold)
  world_matrix=o.matrix_world.copy();o.parent=hinge;o.matrix_world=world_matrix
# Faceted armored shell: the inside walking envelope and rear aperture stay unchanged.
for side in [-1,1]:
 old=bpy.data.objects.get('side_shell_'+str(side));bpy.data.objects.remove(old,do_unlink=True)
 profile=[(10.4,5.7),(12,8),(12,18),(9,23),(8.5,22.4),(11,17.7),(11,8.3),(10.1,6.2)]
 vs=[(side*x,y,z) for y in [-20,20] for x,z in profile]
 faces=[tuple(reversed(range(8))),tuple(range(8,16))]+[(k,(k+1)%8,(k+1)%8+8,k+8) for k in range(8)]
 mesh('side_shell_faceted_'+str(side),vs,faces,ivory)
old=bpy.data.objects.get('cabin_roof');bpy.data.objects.remove(old,do_unlink=True)
box('cabin_roof',(0,0,23),(18,40,1.2),ivory)
old=bpy.data.objects.get('nose');bpy.data.objects.remove(old,do_unlink=True)
profiles=[]
for y,w,low,high in [(20,11,5.7,23),(28,8,7,20),(36,4,10,12)]:
 profiles.extend([(-w*.7,y,low),(w*.7,y,low),(w,y,low+2),(w,y,high-2),(w*.7,y,high),(-w*.7,y,high),(-w,y,high-2),(-w,y,low+2)])
faces=[tuple(reversed(range(8))),tuple(range(16,24))]
for row in range(2):
 for k in range(8):faces.append((row*8+k,row*8+(k+1)%8,(row+1)*8+(k+1)%8,(row+1)*8+k))
mesh('nose_faceted',profiles,faces,ivory)
for o in list(bpy.context.scene.objects):
 if o.name.startswith(('cockpit_','nose_lower_armor','nose_red')):bpy.data.objects.remove(o,do_unlink=True)
for side in [-1,1]:
 mesh('cockpit_windscreen',[(side*.35,20.3,23.05),(side*7.5,20.3,23.05),(side*5.6,28.2,20.05),(side*.35,28.2,20.05)],[(0,1,2,3)],glass)
 mesh('cockpit_side_glass',[(side*10.9,20.2,20.8),(side*7.5,20.2,22.9),(side*5.6,28,20),(side*7.9,28,17.9)],[(0,1,2,3)],glass)
 box('cockpit_front_light',(side*4.7,31,12.9),(1.8,.3,.55),gold)
mesh('cockpit_center_frame',[(-.28,20.2,23.2),(.28,20.2,23.2),(.28,28.3,20.2),(-.28,28.3,20.2)],[(0,1,2,3)],dark)
mesh('nose_red_chevron',[(-3,28.4,19.8),(3,28.4,19.8),(2.2,35.9,12.2),(-2.2,35.9,12.2)],[(0,1,2,3)],red)
# Roof fairing and tail root break up the long flat roof silhouette.
wedge('cabin_roof_spine',-3,3,-13,15,23.6,25.3,ivory)
box('tail_root',(0,-14,23.6),(3.8,10,1.3),dark)

# Export reusable seat at origin before removing template objects from transport.
bpy.ops.object.select_all(action='DESELECT')
for t in templates:t.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'seat.v1.glb'),export_format='GLB',use_selection=True)
for t in templates:bpy.data.objects.remove(t,do_unlink=True)
for o in list(bpy.context.scene.objects):
 if o.type=='MESH' and o.parent is None:o.parent=root
# Batch by material, moving owner and cutaway behavior. Keep the ramp hinge separate.
buckets={}
for o in list(bpy.context.scene.objects):
 if o.type!='MESH':continue
 cut=o.name.startswith(('side_shell','cabin_roof','rear_jamb','rear_header')) or o.name=='rear_ramp'
 key=(o.parent.name if o.parent else '',cut,o.data.materials[0].name)
 buckets.setdefault(key,[]).append(o)
for (owner,cut,material),objects in buckets.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 if len(objects)>1:bpy.ops.object.join()
 bpy.context.object.name=('side_shell_batch_' if cut else 'static_batch_')+owner+'_'+material
mesh_objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in mesh_objects)
assert triangles<10000
# Runtime mounts a shared chair and console here; manual flight is a later pass.
seats.append({'id':'pilot','position':[0,3.9,-15],'role':'pilot','anchor':'seated actor root','yaw':math.pi})
manifest={'version':1,'status':'armor and cabin refinement; runtime verification required','metersPerUnit':.1875,'exportAxes':'X right, Y up, -Z forward','rearOpening':{'width':14,'height':16,'floor':5.7},'aisleWidth':9.4,'referenceActorHeight':10,'seats':seats,'triangles':triangles,'meshNodes':len(mesh_objects),'materials':5,'collisionPolicy':'author runtime shell proxies; never use a solid fuselage box','ramp':'rear only; slope 5.2/18','boundsNominal':{'width':62,'length':73,'height':33}}
manifest['ramp']={'node':'rear_ramp_hinge','closedAngle':-1.852,'openAngle':0,'entry':[0,0,40]}
manifest['ramp']['walk']={'width':14,'startZ':38,'endZ':20,'startY':.5,'endY':5.7,'steps':18}
manifest['collisionShell']=[{'center':[-10.5,13.5,0],'half':[.5,8,20]},{'center':[10.5,13.5,0],'half':[.5,8,20]},{'center':[0,23,0],'half':[11,.6,20]},{'center':[0,5,0],'half':[11,.7,20]},{'center':[0,12,-27],'half':[11,7,7]}]
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
bpy.ops.object.select_all(action='DESELECT')
for o in mesh_objects:o.select_set(True)
root.select_set(True)
hinge.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'transport.v1.glb'),export_format='GLB',use_selection=True)
# Non-exported review ground, lighting and camera.
box('review_ground',(0,0,-.7),(160,160,1),mat('review_sand',(.25,.20,.13)))
world=bpy.context.scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.35,.4,.48,1)
bpy.ops.object.light_add(type='AREA',location=(10,-25,65));bpy.context.object.data.energy=65000;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=45
bpy.ops.object.camera_add(location=(78,-95,61));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,12))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=100
scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=1200;scene.render.resolution_y=850;scene.render.resolution_percentage=100
bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'transport.v1.blend'))
scene.render.filepath=str(SRC/'transport-review-v4.png');bpy.ops.render.render(write_still=True)
cam.location=(78,95,45);cam.rotation_euler=(Vector((0,4,13))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(SRC/'transport-front-v4.png');bpy.ops.render.render(write_still=True)
print('TRANSPORT_REPORT',json.dumps(manifest))
