"""Original compact field boot, Blender authoring only; no runtime procedural model.
Authoring axes X lateral, Y forward, Z up; export becomes X lateral/Y up/+Z forward.
"""
import bpy,bmesh,math,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];SRC=ROOT/'assets-src/frontline-hero-armor';SRC.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def pt(v):return(v[0],-v[1],v[2])
def mat(name,c,rough,metal):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*c,1)
 s=m.node_tree.nodes.get('Principled BSDF');s.inputs['Base Color'].default_value=(*c,1);s.inputs['Roughness'].default_value=rough;s.inputs['Metallic'].default_value=metal
 return m
ivory=mat('ceramic',(.67,.61,.48),.54,.12)
rubber=mat('rubber',(.025,.03,.027),.84,.02)
metal=mat('hardware',(.24,.23,.19),.39,.72)
objects=[]
def finish(o,name,m,bevel=0):
 o.name=name;o.data.materials.append(m);objects.append(o)
 if bevel:
  mod=o.modifiers.new('Machined ceramic edge','BEVEL');mod.width=bevel;mod.segments=1
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def mesh(name,vs,fs,m=ivory,bevel=0):
 me=bpy.data.meshes.new(name);me.from_pydata([pt(v) for v in vs],[],fs);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o)
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
 return finish(o,name,m,bevel)
def box(name,p,size,m=ivory,bevel=.004):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pt(p));o=bpy.context.object;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 return finish(o,name,m,bevel)
def cyl(name,a,b,r,m=metal,n=10):
 av,bv=Vector(pt(a)),Vector(pt(b));d=bv-av
 bpy.ops.mesh.primitive_cylinder_add(vertices=n,radius=r,depth=d.length,location=(av+bv)/2);o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
 return finish(o,name,m)
def extrude(name,outline,low,high,m=ivory,bevel=.004):
 vs=[(x,y,z) for z in [low,high] for x,y in outline];n=len(outline)
 fs=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n)for i in range(n)]
 return mesh(name,vs,fs,m,bevel)
def loft(name,rings,m=ivory,bevel=.007):
 # Each cross-section is an octagonal rounded instep, not a stretched block.
 vs=[]
 for y,w,base,top,upper in rings:
  vs += [(-w*.84,y,base), (w*.84,y,base),(w,y,base+.045),(w,y,top-.045),(upper,y,top),(-upper,y,top),(-w,y,top-.045),(-w,y,base+.045)]
 fs=[tuple(reversed(range(8)))]
 for k in range(len(rings)-1):
  for j in range(8):a=k*8+j;b=k*8+(j+1)%8;fs.append((a,b,b+8,a+8))
 fs += [tuple(range(len(vs)-8,len(vs)))];return mesh(name,vs,fs,m,bevel)
def panel(name,corners,m=ivory,thickness=.01,bevel=.004):
 v=[Vector(x) for x in corners];normal=(v[1]-v[0]).cross(v[2]-v[0]).normalized()*thickness
 if abs(normal.x)>max(abs(normal.y),abs(normal.z)) and normal.x*sum(p.x for p in v)<0:normal=-normal
 return mesh(name,[tuple(x)for x in v]+[tuple(x+normal)for x in v],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],m,bevel)

# Toe-biased footprint, narrowed heel, curved lateral shoulders.
foot=[(-.21,-.397),(.21,-.397),(.263,-.33),(.276,-.12),(.307,.34),(.312,.52),(.280,.705),(.18,.815),(-.18,.815),(-.280,.705),(-.312,.52),(-.307,.34),(-.276,-.12),(-.263,-.33)]
extrude('Full contour rubber outsole',foot,-.349,-.269,rubber,.006)
extrude('Ceramic welt rim',[(x*.98,y)for x,y in foot],-.273,-.245,ivory,.004)
# Interior flexible boot body with recessed dark instep and heel flex.
loft('Flexible boot body',[(-.375,.20,-.246,.18,.15),(-.23,.25,-.246,.348,.195),(.035,.253,-.246,.325,.192),(.23,.284,-.246,.085,.23),(.58,.29,-.246,-.045,.25),(.775,.18,-.246,-.125,.14)],rubber,.009)

# Sculpted toe shell, raised only a few mm above flexible upper.
loft('Armored toe cap',[(.22,.284,-.24,.11,.221),(.39,.300,-.244,.046,.25),(.60,.293,-.244,-.016,.249),(.75,.222,-.24,-.081,.174),(.806,.162,-.236,-.130,.115)],ivory,.012)
# Heel counter wraps around heel; ankle upper is tapered toward the leg.
loft('Heel ceramic counter',[(-.388,.205,-.242,.165,.145),(-.320,.258,-.242,.24,.18),(-.19,.258,-.24,.272,.193)],ivory,.012)
for s in [-1,1]:
 # Side ankle plates remain below the existing shin driver.
 panel('Ankle side ceramic',[(s*(.266-.018*z+.10*y),y,z)for y,z in [(-.28,-.20),(.20,-.19),(.04,.31),(-.23,.355)]],ivory,.014,.008)
 panel('Low instep flank',[(s*.279,.18,-.225),(s*.297,.52,-.22),(s*.279,.45,-.015),(s*.261,.19,.065)],ivory,.011,.006)
 # Slender dark relief channels visibly divide ceramic plates.
 panel('Ankle relief channel',[(s*.266,-.19,-.15),(s*.279,.095,-.13),(s*.272,.067,-.098),(s*.258,-.20,-.119)],rubber,.006,.003)
 cyl('Recessed ankle fastener',(s*.25,-.15,.10),(s*.270,-.15,.10),.025,metal,12)
 cyl('Fastener center',(s*.271,-.15,.10),(s*.274,-.15,.10),.008,rubber,8)
 # Lateral pin strip doubles as a small sole attachment detail.
 panel('Welt locking strip',[(s*.305,.25,-.228),(s*.307,.50,-.228),(s*.300,.50,-.200),(s*.296,.25,-.200)],metal,.006,.003)

# Compact open-looking collar: ring geometry around dark inset, top at +.38.
vs=[];N=20
for z,rx,ry in [(.322,.22,.204),(.374,.206,.190),(.376,.165,.147),(.325,.170,.153)]:
 for i in range(N):a=math.tau*i/N;vs.append((math.cos(a)*rx,-.087+math.sin(a)*ry,z))
fs=[]
for j in range(4):
 for i in range(N):a=j*N+i;b=j*N+(i+1)%N;c=((j+1)%4)*N+(i+1)%N;d=((j+1)%4)*N+i;fs.append((a,b,c,d))
mesh('Ankle collar rim',vs,fs,ivory,.003)
extrude('Recessed collar opening',[(math.cos(math.tau*i/20)*.169,-.087+math.sin(math.tau*i/20)*.152)for i in range(20)],.312,.320,rubber,0)

# Segmented throat flex ribs follow the incline toward the toe.
for i in range(5):
 y=.075+i*.035;z=.28-i*.042
 panel('Instep flex rib',[(-.147,y,z),(.147,y,z),(.151,y+.016,z-.019),(-.151,y+.016,z-.019)],rubber,.012,.004)
# A narrow ceramic tongue bridges the center of the flex material.
panel('Ankle front tongue',[(-.086,.060,.307),(.086,.060,.307),(.076,.151,.198),(-.076,.151,.198)],ivory,.015,.006)

# Actual underside contact lugs, split down a center channel, with heel/toe steering bars.
# Chamfered perimeter pads create the visible armored-boot tread in flight.
for y,width in [(-.31,.17),(-.17,.195),(-.015,.215),(.145,.233),(.305,.246),(.465,.240),(.62,.20),(.737,.14)]:
 for s in [-1,1]:
  lo,hi=sorted([s*.032,s*width]);outline=[(lo,y-.043),(hi-.012,y-.043),(hi,y-.030),(hi,y+.030),(hi-.012,y+.043),(lo,y+.028)]
  extrude('Traction chevron lug',outline,-.38,-.341,rubber,.004)
for y in [-.25,-.08,.10,.28,.46,.64]:
 extrude('Central tread bridge',[(-.036,y-.029),(.036,y-.029),(.046,y),(.025,y+.029),(-.025,y+.029),(-.046,y)],-.365,-.345,rubber,.002)

# Join three material groups, remove zero-area bevel fragments, apply transforms/UVs.
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name='field_boot'
bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.dissolve_degenerate(bm,dist=1e-6,edges=list(bm.edges));bmesh.ops.triangulate(bm,faces=list(bm.faces))
bad=[f for f in bm.faces if f.calc_area()<1e-10]
if bad:bmesh.ops.delete(bm,geom=bad,context='FACES_ONLY')
bm.to_mesh(o.data);bm.free();o.data.update()
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.01);bpy.ops.object.mode_set(mode='OBJECT')
o['source']='Original project-authored compact ceramic field boot';o['forward']='+Z';o['pivot']='Existing native boot center; ankle local zero'
triangles=len(o.data.polygons)
bpy.ops.export_scene.gltf(filepath=str(SRC/'field-boot.raw.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_extras=True,export_animations=False)
(SRC/'authoring-report.json').write_text(json.dumps({'triangles':triangles,'vertices':len(o.data.vertices)},indent=2))

# Neutral, CPU-only two-view preview; GLB does not include preview objects.
floor=mat('Preview sand',(.135,.12,.095),.92,0)
bpy.ops.mesh.primitive_plane_add(size=100,location=(0,0,-.39));bpy.context.object.data.materials.append(floor)
world=bpy.context.scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.44,.48,.55,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
for loc,power,size in [((3,-4,5),450,4),((-4,-1,3),250,4),((0,4,5),500,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector((0,0,0))-l.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(1.4,-1.75,1.08));cam=bpy.context.object;cam.rotation_euler=(Vector((0,-.18,-.01))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=1.7
scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=40;scene.cycles.use_denoising=True;scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.filepath=str(SRC/'field-boot-preview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'field-boot.blend'));bpy.ops.render.render(write_still=True)
# Underside is essential for the hero's flying pose.
for obj in scene.objects:
 if obj.type=='MESH' and obj!=o:obj.hide_render=True
cam.location=(1.2,-1.35,-1.6);cam.rotation_euler=(Vector((0,-.18,-.05))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(SRC/'field-boot-sole-preview.png');bpy.ops.render.render(write_still=True)
print('BOOT_TRIANGLES',triangles)
