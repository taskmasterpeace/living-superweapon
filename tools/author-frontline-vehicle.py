"""Original armored scout. Run with Blender 4.5 --background --python this-file.
Authoring coordinates are X right, Y forward, Z up; pt() maps forward to Blender -Y.
All detail is authored here, never constructed by the game runtime.
"""
import bpy, bmesh, math, json, os
import numpy as np
from mathutils import Vector
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'assets-src/frontline-vehicles'; SRC.mkdir(parents=True,exist_ok=True)
OUT=ROOT/'public/models/frontline'; OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def pt(p): return (p[0],-p[1],p[2])
groups={k:[] for k in ['hull','wheels_FL','wheels_FR','wheels_RL','wheels_RR','turret','barrel']}
current='hull'

# A small original tiling paint image gives subtle tonal weathering under dynamic light.
n=512; yy,xx=np.mgrid[0:n,0:n]/n
rng=np.random.default_rng(419)
grain=rng.normal(0,.005,(n,n))
field=.016*np.sin(xx*math.tau*7+np.cos(yy*math.tau*3))+.011*np.sin(yy*math.tau*19+xx*math.tau*4)+grain
# Fine rubbed paint and small chips. Deterministic source image, no external photography.
for _ in range(900):
 sx,sy=rng.integers(0,n,2);length=int(rng.integers(1,9))
 field[sy,min(sx,n-1):min(sx+length,n)] += rng.choice([-.075,-.045,.035])
pix=np.ones((n,n,4),dtype=np.float32)
for i,c in enumerate([.48,.365,.225]): pix[:,:,i]=np.clip(c+field,0,1)
paint=bpy.data.images.new('Original desert paint microvariation',width=n,height=n)
paint.pixels.foreach_set(pix.ravel()); paint.filepath_raw=str(SRC/'desert-paint.png'); paint.file_format='PNG';paint.save();paint.pack()
def mat(name,c,rough=.7,metal=0,tex=False):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
 if tex:
  t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=paint;m.node_tree.links.new(t.outputs['Color'],bs.inputs['Base Color'])
 return m
tan=mat('Desert CARC paint',(.48,.365,.225),.78,.05,True)
edge=mat('Dusty edge armor',(.40,.30,.185),.82,.06)
rubber=mat('Tire and gasket rubber',(.023,.026,.024),.89)
steel=mat('Gunmetal and undercarriage',(.065,.075,.071),.54,.68)
glass=mat('Recessed armored glass',(.035,.083,.098),.18,.45)
lamp=mat('Headlamp ceramic reflector',(.68,.72,.66),.24,.5)
red=mat('Rear marker red',(.28,.028,.016),.28,.18)

def finish(o,name,material,bevel=0):
 o.name=name;o.data.materials.append(material);groups[current].append(o)
 if bevel:
  mod=o.modifiers.new('Manufactured edge radii','BEVEL');mod.width=bevel;mod.segments=2
  mod.affect='EDGES';mod.profile=.5
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def mesh(name,vs,fs,material=tan,bevel=0):
 me=bpy.data.meshes.new(name);me.from_pydata([pt(p) for p in vs],[],fs);me.update()
 o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o)
 # Authoring conversion reverses winding: recalculate consistently.
 bpy.context.view_layer.objects.active=o;o.select_set(True)
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False)
 return finish(o,name,material,bevel)
def box(name,p,size,material=tan,bevel=.015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pt(p));o=bpy.context.object;o.dimensions=(size[0],size[1],size[2]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 return finish(o,name,material,bevel)
def cyl(name,a,b,r,material=steel,vertices=16):
 a,b=Vector(pt(a)),Vector(pt(b));v=b-a
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=v.length,location=(a+b)/2)
 o=bpy.context.object;o.rotation_euler=v.to_track_quat('Z','Y').to_euler();bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
 return finish(o,name,material)
def loft(name,rings,material=tan,bevel=.025):
 # rings: forward, half-width bottom, lower height, half-width top, upper height
 vs=[]
 for y,wb,zb,wt,zt in rings:vs += [(-wb,y,zb),(wb,y,zb),(wt,y,zt),(-wt,y,zt)]
 fs=[(3,2,1,0)]
 for k in range(len(rings)-1):
  for i in range(4):a=k*4+i;b=k*4+(i+1)%4;fs.append((a,b,b+4,a+4))
 fs.append(tuple(range(len(vs)-4,len(vs))))
 return mesh(name,vs,fs,material,bevel)
def plate(name,corners,thickness=.025,material=tan,bevel=.01):
 # Four-corner panel, offset along its normal for real thickness.
 v=[Vector(x) for x in corners];normal=(v[1]-v[0]).cross(v[2]-v[0]).normalized()*thickness
 vs=[tuple(x) for x in v]+[tuple(x+normal) for x in v]
 return mesh(name,vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],material,bevel)

# V-shaped armored underbody, angular engine hood, distinct cab shell.
loft('Monocoque lower V hull',[(-2.48,.70,.70,1.0,1.27),(-1.80,.83,.51,1.035,1.42),(1.05,.83,.51,1.035,1.42),(2.38,.70,.74,.94,1.36)])
loft('Sloped engine cover',[(.70,1.00,1.25,.86,1.65),(2.18,.97,1.17,.83,1.48),(2.43,.87,1.09,.76,1.31)],tan,.025)
loft('Faceted armored cabin',[(-2.22,1.01,1.25,.85,2.03),(-1.91,1.02,1.25,.87,2.19),(.37,1.02,1.25,.88,2.19),(1.03,1.01,1.25,.91,1.51)],tan,.018)
box('Chassis right rail',(.66,-.1,.58),(.15,4.45,.18),steel)
box('Chassis left rail',(-.66,-.1,.58),(.15,4.45,.18),steel)
for y in [-1.7,1.58]:
 cyl('Live axle',(-1.11,y,.65),(1.11,y,.65),.09)
 cyl('Differential housing',(-.18,y,.65),(.18,y,.65),.19,steel,20)
 for s in [-1,1]:
  cyl('Damper',(.77*s,y-.18,.64),(.72*s,y+.10,1.11),.045,steel)
  for z in [0,.035,.07]:box('Leaf spring',(.65*s,y,.53+z),(.11,1.10-z*3,.022),steel,.006)
cyl('Drive shaft',(0,-1.7,.65),(0,1.58,.65),.055)

# Real framed, recessed windshield on the sloping cab plane.
for s in [-1,1]:
 x0,x1=sorted([s*.065,s*.80])
 corners=[(x0,.896,1.67),(x1,.896,1.67),(x1,.44,2.105),(x0,.44,2.105)]
 plate('Windshield rubber seal',corners,.024,rubber,.012)
 corners=[(x0+.035,.89,1.70),(x1-.035,.89,1.70),(x1-.035,.475,2.07),(x0+.035,.475,2.07)]
 plate('Ballistic windshield',corners,.027,glass,.007)
 cyl('Windshield wiper',(s*.18,.922,1.70),(s*.59,.665,1.945),.011,steel,8)

# Four side doors on tapered cabin sides; dark seams and beveled overlay plates.
for s in [-1,1]:
 def sx(z):return s*(1.02-(z-1.25)*.149)
 for lo,hi in [(-1.89,-.84),(-.79,.29)]:
  plate('Door perimeter seal',[(sx(1.17),lo,1.17),(sx(1.17),hi,1.17),(sx(2.12),hi,2.12),(sx(2.12),lo,2.12)],.022,rubber,.012)
  plate('Door armor',[(sx(1.20)+s*.023,lo+.03,1.20),(sx(1.20)+s*.023,hi-.03,1.20),(sx(2.08)+s*.023,hi-.03,2.08),(sx(2.08)+s*.023,lo+.03,2.08)],.02,tan,.012)
  plate('Side glazing frame',[(sx(1.69)+s*.047,lo+.10,1.69),(sx(1.69)+s*.047,hi-.10,1.69),(sx(2.015)+s*.047,hi-.12,2.015),(sx(2.015)+s*.047,lo+.12,2.015)],.020,rubber,.008)
  plate('Side ballistic glazing',[(sx(1.73)+s*.052,lo+.14,1.73),(sx(1.73)+s*.052,hi-.14,1.73),(sx(1.975)+s*.052,hi-.15,1.975),(sx(1.975)+s*.052,lo+.15,1.975)],.02,glass,.008)
  box('Door handle recess',(s*1.042,lo+.24,1.56),(.035,.21,.09),rubber,.016)
  cyl('Pull handle',(s*1.08,lo+.17,1.565),(s*1.08,lo+.30,1.565),.017,steel,8)
  for z in [1.38,1.61]:box('Heavy door hinge',(s*1.055,hi-.10,z),(.05,.11,.055),edge,.008)
  for y in [lo+.09,hi-.09]:
   for z in [1.28,1.63]:cyl('Armor fastener',(sx(z)+s*.05,y,z),(sx(z)+s*.063,y,z),.018,steel,6)
 box('Running step',(s*1.15,-.70,.90),(.27,1.68,.075),steel,.018)
 for y in [-1.40,-.90,-.40,0]:box('Step traction slot',(s*1.17,y,.945),(.19,.035,.007),rubber,.002)
 # wing mirrors, stalks and armored shell
 cyl('Mirror lower arm',(s*.99,.65,1.68),(s*1.29,.58,1.84),.022)
 box('Mirror housing',(s*1.31,.57,1.92),(.11,.20,.28),edge,.023)
 box('Mirror face',(s*1.315,.461,1.92),(.08,.008,.23),glass,.008)

# Wheel arch surfaces follow tire curvature, avoiding boxy fenders.
for s in [-1,1]:
 for cy in [-1.70,1.58]:
  vs=[];steps=14
  for i in range(steps+1):
   a=math.radians(-3+186*i/steps);y=cy+math.cos(a)*.77;z=.66+math.sin(a)*.77
   vs += [(s*.91,y,z),(s*1.32,y,z),(s*1.32,y,z-.085),(s*.91,y,z-.085)]
  fs=[]
  for i in range(steps):
   for j in range(4):a=i*4+j;b=i*4+(j+1)%4;fs.append((a,b,b+4,a+4))
  fs += [(0,1,2,3),(steps*4+3,steps*4+2,steps*4+1,steps*4)]
  mesh('Flared wheel arch',vs,fs,tan,.014)
  box('Flexible mud flap',(s*1.14,cy-.76,.63),(.39,.045,.44),rubber,.01)

# Front grille, bumper, tow eyes, headlights and hood hardware.
box('Grille recess',(0,2.397,1.105),(1.38,.04,.35),rubber,.035)
for x in np.linspace(-.57,.57,10):box('Grille vertical vent',(float(x),2.428,1.105),(.050,.045,.285),steel,.009)
loft('Front impact bumper',[(2.44,1.12,.67,1.12,.89),(2.68,.96,.69,.96,.87)],edge,.025)
box('Rear impact bumper',(0,-2.52,.80),(2.13,.21,.20),edge,.025)
for s in [-1,1]:
 box('Headlight recess',(s*.87,2.31,1.28),(.30,.13,.21),rubber,.025)
 cyl('Headlamp',(s*.87,2.37,1.28),(s*.87,2.405,1.28),.079,lamp,20)
 for z in [1.235,1.325]:cyl('Headlight guard',(s*.99,2.43,z),(s*.75,2.43,z),.012,steel,8)
 box('Hood latch',(s*.83,1.23,1.53),(.05,.10,.09),steel,.008)
 box('Hood hinge',(s*.53,.85,1.665),(.22,.06,.025),steel,.006)
 for y in [2.64,-2.63]:
  # squared U-shaped shackle three solid bars around an open eye
  cyl('Tow hook side',(s*.73,y,.70),(s*.73,y,.61),.028,steel,10)
  cyl('Tow hook side',(s*.85,y,.70),(s*.85,y,.61),.028,steel,10)
  cyl('Tow hook bottom',(s*.73,y,.61),(s*.85,y,.61),.028,steel,10)
 box('Rear marker',(s*.83,-2.335,1.16),(.18,.045,.09),red,.01)

# Recessed intake louvers on the hood and narrow roof drainage seams.
for s in [-1,1]:
 for y in np.linspace(1.10,1.72,8):
  z=1.65-(float(y)-.70)*(.17/1.48)+.008
  box('Hood intake louver',(s*.46,float(y),z),(.30,.032,.016),steel,.006)
for y in [-1.76,-.96]:box('Roof panel drainage seam',(0,y,2.205),(1.57,.008,.007),edge,.001)

# Roof seams, hatch, rails, rear stowage and exhaust.
box('Roof hatch gasket',(0,-.65,2.205),(.84,.92,.027),rubber,.06)
box('Roof access hatch',(0,-.65,2.231),(.78,.86,.038),edge,.055)
for s in [-1,1]:
 cyl('Roof grab rail',(s*.73,-1.65,2.25),(s*.73,-.85,2.25),.022)
 for y in [-1.65,-.85]:cyl('Rail standoff',(s*.73,y,2.17),(s*.73,y,2.25),.020)
 box('Rear stowage pannier',(s*.60,-2.30,1.62),(.48,.27,.47),edge,.04)
 for z in [1.48,1.74]:box('Pannier retention strap',(s*.60,-2.447,z),(.49,.02,.032),steel,.004)
cyl('Exhaust',(1.035,-1.9,1.27),(1.035,-1.9,1.98),.038,steel,12)
cyl('Antenna spring',(-.73,-1.52,2.23),(-.73,-1.52,2.36),.034,steel,12)
cyl('Flexible antenna',(-.73,-1.52,2.36),(-.78,-1.62,3.21),.009,steel,8)

# Tires use a revolved shoulder/sidewall profile plus individual chevron tread pads.
wheelpivots={}
for s,side in [(-1,'L'),(1,'R')]:
 for cy,ax in [(1.58,'F'),(-1.70,'R')]:
  current=f'wheels_{ax}{side}';cx=s*1.11;cz=.65;wheelpivots[current]=(cx,cy,cz)
  profile=[(-.22,.37),(-.22,.47),(-.19,.57),(-.13,.625),(.13,.625),(.19,.57),(.22,.47),(.22,.37)]
  vs=[];N=56
  for i in range(N):
   a=math.tau*i/N
   for x,r in profile:vs.append((cx+x,cy+math.cos(a)*r,cz+math.sin(a)*r))
  fs=[]
  for i in range(N):
   for j in range(len(profile)):
    fs.append((i*8+j,((i+1)%N)*8+j,((i+1)%N)*8+(j+1)%8,i*8+(j+1)%8))
  o=mesh('Radial all terrain tire',vs,fs,rubber)
  for p in o.data.polygons:p.use_smooth=True
  for i in range(40):
   for lane in [-1,0,1]:
    a=math.tau*(i+(0.32 if lane==0 else 0))/40
    # Each trapezoidal tread follows circumference; sharp top shoulders remain legible.
    v=[]
    for rr in [.615,.65]:
     for dx,da in [(-.065,-.045),(.065,-.026),(.065,.045),(-.065,.026)]:
      v.append((cx+lane*.132+dx,cy+math.cos(a+da)*rr,cz+math.sin(a+da)*rr))
    mesh('Chevron tread',v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],rubber)
  cyl('Bead rim',(cx+s*.195,cy,cz),(cx+s*.232,cy,cz),.378,tan,40)
  cyl('Inset rim shadow',(cx+s*.236,cy,cz),(cx+s*.24,cy,cz),.311,steel,32)
  cyl('Pressed steel wheel',(cx+s*.243,cy,cz),(cx+s*.26,cy,cz),.274,tan,32)
  cyl('Hub',(cx+s*.26,cy,cz),(cx+s*.33,cy,cz),.121,steel,20)
  for i in range(8):
   a=math.tau*i/8
   y,z=cy+math.cos(a)*.19,cz+math.sin(a)*.19
   cyl('Wheel lug nut',(cx+s*.261,y,z),(cx+s*.287,y,z),.024,steel,6)
   y,z=cy+math.cos(a)*.333,cz+math.sin(a)*.333
   cyl('Beadlock bolt',(cx+s*.236,y,z),(cx+s*.249,y,z),.013,steel,6)

# Compact remote weapon station, azimuth and elevation pivots exported separately.
current='turret';turretpivot=(0,.02,2.24)
cyl('Azimuth base',(0,.02,2.20),(0,.02,2.34),.37,steel,32)
cyl('Turret bearing',(0,.02,2.34),(0,.02,2.40),.31,edge,32)
loft('Remote weapon angular housing',[(-.29,.27,2.40,.22,2.77),(.34,.27,2.40,.18,2.69)],edge,.02)
for s in [-1,1]:
 plate('Gun cradle cheek',[(s*.20,-.04,2.59),(s*.20,.46,2.59),(s*.20,.34,2.89),(s*.20,.03,2.90)],.035,tan,.012)
 cyl('Elevation trunnion',(s*.21,.15,2.79),(s*.265,.15,2.79),.079,steel,16)
box('Optics housing',(-.34,.34,2.78),(.23,.24,.22),steel,.025)
for x,z,r in [(-.38,2.82,.036),(-.30,2.76,.024)]:cyl('Optic lens',(x,.46,z),(x,.478,z),r,glass,16)
box('Ammunition box',(.36,-.10,2.58),(.28,.48,.31),tan,.025)
for y in [-.27,.07]:box('Ammo box strap',(.36,y,2.746),(.29,.035,.017),steel,.004)
current='barrel';barrelpivot=(0,.15,2.79)
box('Machine gun receiver',(0,.22,2.80),(.16,.53,.14),steel,.012)
cyl('Barrel cooling jacket',(0,.45,2.80),(0,.94,2.80),.045,steel,16)
cyl('Heavy gun barrel',(0,.94,2.80),(0,1.39,2.80),.025,steel,12)
cyl('Muzzle brake',(0,1.39,2.80),(0,1.49,2.80),.037,steel,12)
for y in [.52,.63,.74,.85]:cyl('Cooling jacket ring',(0,y,2.80),(0,y+.018,2.80),.05,edge,12)
box('Weapon top rail',(0,.22,2.887),(.085,.40,.025),steel,.003)

# Consolidate static detail by articulated group. UV maps, transforms and authored pivots.
roots={};bpy.ops.object.select_all(action='DESELECT')
for name,objs in groups.items():
 for o in objs:o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();o=bpy.context.object;o.name=name
 bm=bmesh.new();bm.from_mesh(o.data)
 bmesh.ops.dissolve_degenerate(bm,dist=0.000001,edges=list(bm.edges))
 bmesh.ops.triangulate(bm,faces=list(bm.faces))
 bad=[f for f in bm.faces if f.calc_area()<0.000000001]
 if bad:bmesh.ops.delete(bm,geom=bad,context='FACES_ONLY')
 bm.to_mesh(o.data);bm.free();o.data.update()
 bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
 pivot=wheelpivots.get(name,turretpivot if name=='turret' else barrelpivot if name=='barrel' else (0,0,0))
 bpy.context.scene.cursor.location=pt(pivot);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.15192,island_margin=.015);bpy.ops.object.mode_set(mode='OBJECT')
 roots[name]=o;o.select_set(False)
root=bpy.data.objects.new('ArmoredScout',None);bpy.context.collection.objects.link(root)
for name,o in roots.items():
 parent=roots['turret'] if name=='barrel' else root
 mw=o.matrix_world.copy();o.parent=parent;o.matrix_world=mw
root['provenance']='Original Blender-authored generic armored scout; no external meshes or textures.'
root['forward']='+Z after glTF export';root['units']='metres'
root['collision']='Use convex hull or box around hull; wheels are visual articulated nodes.'
# Normalize width to a compact road vehicle while retaining circular tire profiles.
# X is the axle direction, so this adjusts tread width without squashing wheel diameter.
root.scale.x=.89
bpy.ops.object.select_all(action='DESELECT');root.select_set(True);bpy.context.view_layer.objects.active=root
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
# Parent scaling is applied to children explicitly so exported nodes have unit scale.
for o in roots.values():
 o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.select_set(False)
root.select_set(False)
bpy.context.view_layer.update()
report={'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in roots.values()),'materials':len(bpy.data.materials),'nodes':{k: {'vertices':len(o.data.vertices),'triangles':sum(len(p.vertices)-2 for p in o.data.polygons),'pivotBlender':list(o.location)} for k,o in roots.items()}}
(SRC/'authoring-report.json').write_text(json.dumps(report,indent=2))
bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
for o in roots.values():o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(SRC/'armored-scout.raw.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_extras=True,export_materials='EXPORT',export_animations=False)

# CPU-only studio render for asset review; the exported GLB excludes this setup.
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.012));floor=bpy.context.object;floor.name='Preview ground';floor.data.materials.append(mat('Preview ground',(.19,.155,.109),.92))
world=bpy.context.scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.40,.47,.56,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
def light(name,loc,energy,size,color):
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=energy;o.data.shape='DISK';o.data.size=size;o.data.color=color;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
light('Large warm key',(4,-5,9),1700,6,(1,.87,.68));light('Cool fill',(-5,-1,5),1000,5,(.65,.78,1));light('Rear rim',(0,5,7),1700,5,(1,.85,.64))
bpy.ops.object.camera_add(location=(7.2,-8.7,5.5));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,1.38))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=7.65
scene=bpy.context.scene;scene.camera=camera;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=40;scene.cycles.use_denoising=True
scene.render.resolution_x=1200;scene.render.resolution_y=850;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.filepath=str(SRC/'armored-scout-preview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'armored-scout.blend'))
bpy.ops.render.render(write_still=True)
print('SCOUT_REPORT',json.dumps(report))
