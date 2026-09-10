"""Original modular frontline outpost. Blender 4.5, no third-party art.
X right, Blender -Y front, Z up. Exported glTF is Y-up; 5 units = 1 metre.
"""
import bpy, math, json, hashlib
import numpy as np
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'assets-src/frontline-outpost';SRC.mkdir(parents=True,exist_ok=True)
OUT=ROOT/'public/models/frontline';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
rng=np.random.default_rng(8731)
groups={k:[]for k in ['hangar','command','watchtower','barricade']};current='hangar'

def texture(name,base,kind):
 n=512;yy,xx=np.mgrid[0:n,0:n]/n
 field=.018*np.sin(xx*math.tau*11+np.sin(yy*math.tau*7))+.012*np.cos(yy*math.tau*27)+rng.normal(0,.014,(n,n))
 if kind=='concrete':
  field+=.035*np.sin(xx*math.tau*2)*np.cos(yy*math.tau*3)
  for _ in range(650):
   x,y=rng.integers(0,n,2);field[y:y+2,x:x+2]-=.075
 elif kind=='paint':
  for _ in range(800):
   x,y=rng.integers(0,n,2);field[y:y+1,x:min(n,x+int(rng.integers(2,9)))]+=.10
 else:field+=.018*((np.arange(n)[None,:]%3==0)|(np.arange(n)[:,None]%3==0))
 pix=np.ones((n,n,4),dtype=np.float32)
 for i,c in enumerate(base):pix[:,:,i]=np.clip(c+field,.01,.95)
 im=bpy.data.images.new(name,width=n,height=n);im.pixels.foreach_set(pix.ravel());im.filepath_raw=str(SRC/(name+'.png'));im.file_format='PNG';im.save();im.pack();return im
conTex=texture('original-concrete',(0.49,.46,.39),'concrete')
paintTex=texture('original-olive-paint',(.29,.31,.25),'paint')
sandTex=texture('original-sandbag-weave',(.54,.46,.32),'fabric')
def mat(name,c,rough=.8,metal=0,image=None):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
 if image:
  tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;tex.extension='REPEAT';m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
 return m
concrete=mat('Weathered warm concrete',(.49,.46,.39),.93,image=conTex)
paint=mat('Scuffed olive painted steel',(.29,.31,.25),.72,.25,paintTex)
metal=mat('Dark gunmetal fittings',(.09,.11,.10),.53,.65)
glass=mat('Dusty smoked glass',(.055,.095,.105),.22,.38)
sand=mat('Woven sandbag fabric',(.54,.46,.32),.98,image=sandTex)
yellow=mat('Faded safety ochre',(.72,.49,.16),.78)

def finish(o,name,material,bevel=0,smooth=False):
 o.name=name;o.data.materials.append(material)
 if bevel:
  mod=o.modifiers.new('Manufactured edge radii','BEVEL');mod.width=bevel;mod.segments=1
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 if smooth:
  for p in o.data.polygons:p.use_smooth=True
 # World-size UVs retain concrete pores instead of stretching one image per wall.
 if not o.data.uv_layers:o.data.uv_layers.new(name='Surface metres')
 o.data.uv_layers.active.name='Surface metres'
 uv=o.data.uv_layers.active.data
 for p in o.data.polygons:
  normal=p.normal;axis=max(range(3),key=lambda i:abs(normal[i]));axes=[i for i in range(3)if i!=axis]
  for li in p.loop_indices:
   v=o.data.vertices[o.data.loops[li].vertex_index].co;uv[li].uv=(v[axes[0]]/8,v[axes[1]]/8)
 groups[current].append(o);return o
def mesh(name,vs,faces,material,bevel=0,smooth=False):
 data=bpy.data.meshes.new(name);data.from_pydata(vs,[],faces);data.update();o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);return finish(o,name,material,bevel,smooth)
def box(name,dim,loc,material=concrete,bevel=.12):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=dim;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,material,bevel)
def beam(name,a,b,r=.2,material=metal,vertices=8):
 a,b=Vector(a),Vector(b);delta=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=delta.length,location=(a+b)*.5);o=bpy.context.object;o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();return finish(o,name,material,.025,True)
def panel(name,vs,material):return mesh(name,vs,[tuple(range(len(vs)))],material)

# HANGAR — a continuous rolled corrugated shell, not a scaled half-cylinder.
current='hangar';W=65;D=85;H=35;segments=32;rows=110
vs=[]
for j in range(rows+1):
 y=-D/2+D*j/rows;ridge=.23*math.cos(j*math.pi)
 for i in range(segments+1):
  a=math.pi*i/segments;vs.append(((W/2+ridge)*math.cos(a),y,2.5+(H-2.5+ridge)*math.sin(a)))
faces=[]
for j in range(rows):
 for i in range(segments):
  n=j*(segments+1)+i;faces.append((n,n+1,n+segments+2,n+segments+1))
roof=mesh('Continuous corrugated rolled hangar shell',vs,faces,paint,smooth=True)
mod=roof.modifiers.new('Sheet thickness','SOLIDIFY');mod.thickness=.25;bpy.context.view_layer.objects.active=roof;bpy.ops.object.modifier_apply(modifier=mod.name)
for y in [-D/2,D/2]:
 poly=[(-W/2,y,0),(W/2,y,0)]+[(W/2*math.cos(math.pi*i/segments),y,2.5+(H-2.5)*math.sin(math.pi*i/segments))for i in range(segments+1)]
 panel('Arched end-wall sheet',poly,paint)
 # Raised arch rib closes the rolled sheet ends with a structural edge.
 for i in range(segments):
  a=math.pi*i/segments;b=math.pi*(i+1)/segments
  beam('Arch reinforcement',(W/2*math.cos(a),y,2.5+(H-2.5)*math.sin(a)),(W/2*math.cos(b),y,2.5+(H-2.5)*math.sin(b)),.22,metal)
for x in [-31.8,31.8]:box('Concrete stem footing',(1.8,D,2.6),(x,0,1.3),concrete)
box('Hangar floor apron',(65,86,.6),(0,0,.3),concrete,.1)
for i in range(8):
 x=-24.5+i*7
 box('Closed sliding door leaf',(6.8,.55,23),(x,-42.88,11.5),paint,.08)
 for z in [3.5,8,12.5,17,21.5]:box('Door horizontal folded seam',(6.7,.22,.14),(x,-43.22,z),metal,.02)
for x in [-28.4,28.4]:box('Door jamb steel',(1.1,1.1,25),(x,-43,12.5),metal,.1)
box('Sliding door header',(58,1.2,1.2),(0,-43,24.7),metal,.12)
for x in [-25,25]:
 box('Safety corner stripe',(.42,.12,5),(x,-43.65,2.5),yellow,.02)
 box('Exterior lamp hood',(2.1,1.5,.7),(x,-43.7,26),metal,.1)
for y in [-27,0,27]:
 box('Roof extractor curb',(7,7,1.7),(0,y,35),metal,.2)
 box('Roof extractor hood',(8,8,1.0),(0,y,36.25),paint,.22)

# COMMAND — deep recessed glazing, concrete reveals, floor joints and roof plant.
current='command';box('Cast concrete command envelope',(45,40,33),(0,0,16.5),concrete,.35)
for z in [1.2,16.5,32.5]:box('Horizontal concrete floor course',(45.65,40.65,.65),(0,0,z),concrete,.1)
for side in [-1,1]:
 for x in [-17,-8.5,0,8.5,17]:
  for z in [9,25]:
   if side==-1 and x==0 and z==9:continue
   box('Recessed window glass',(5.8,.13,6.4),(x,side*20.18,z),glass,.05)
   for dx in [-3.15,3.15]:box('Deep window concrete reveal',(.6,.9,7.2),(x+dx,side*20.4,z),concrete,.07)
   for dz in [-3.6,3.6]:box('Window lintel and sill',(6.9,1,.55),(x,side*20.48,z+dz),concrete,.08)
   box('Window steel mullion',(.15,.28,6.5),(x,side*20.45,z),metal,.015)
 for y in [-12,0,12]:
  for z in [9,25]:
   box('Side window glass',(.15,6,6.4),(side*22.65,y,z),glass,.03)
   for dy in [-3.35,3.35]:box('Side window reveal',(.9,.6,7.2),(side*22.85,y+dy,z),concrete,.08)
   for dz in [-3.6,3.6]:box('Side window lintel',(1,7.2,.5),(side*22.95,y,z+dz),concrete,.07)
box('Double steel personnel door',(6.8,.5,10.5),(0,-20.3,5.25),paint,.09)
box('Door central seam',(.16,.13,10),(0,-20.65,5),metal,.01)
for x in [-1,1]:box('Personnel door handle',(.15,.35,1.5),(x,-20.85,5),metal,.035)
box('Entrance rain canopy',(10,5.5,.9),(0,-22,11.6),concrete,.18)
for x in [-4.4,4.4]:beam('Canopy tension strut',(x,-24,11.8),(x,-20,14),.13,metal)
for y in [-19.6,19.6]:box('Roof parapet',(45,1.2,2.5),(0,y,34),concrete,.18)
for x in [-21.9,21.9]:box('Roof parapet',(1.2,38,2.5),(x,0,34),concrete,.18)
for x in [-11,5]:
 box('Roof HVAC unit',(8,9,5),(x,4,35.5),paint,.3)
 for j in range(7):box('HVAC ventilation louvers',(6.8,.28,.24),(x,-.7,33.8+j*.53),metal,.02)
beam('Radio antenna mast',(15,12,33),(15,12,43),.16,metal)
beam('Radio antenna crossbar',(11,12,40),(19,12,40),.10,metal)
box('Wall unit plaque',(8,.16,2),(11,-20.8,16.5),paint,.04)

# WATCHTOWER — solid concrete guard tower, matching native solid-column cover.
current='watchtower'
box('Solid cast concrete guard tower plinth',(17.6,17.6,37.2),(0,0,18.6),concrete,.28)
box('Tower foundation footing',(18.6,18.6,1.1),(0,0,.55),concrete,.16)
for x in [-8.25,8.25]:
 for y in [-8.25,8.25]:box('Reinforced concrete corner pier',(1.2,1.2,36.6),(x,y,18.3),concrete,.1)
for z in [11.8,23.6,35.4]:
 box('Concrete construction lift joint',(17.8,17.8,.17),(0,0,z),metal,.025)
 box('Concrete construction joint sill',(18.05,18.05,.30),(0,0,z+.24),concrete,.07)
box('Closed tower access door',(5.4,.4,10.2),(0,-8.94,5.1),paint,.1)
for x in [-2.95,2.95]:box('Tower door concrete jamb',(.65,.9,10.9),(x,-9.0,5.45),concrete,.08)
box('Tower door concrete lintel',(6.55,1,.65),(0,-9,10.7),concrete,.1)
box('Tower access pull handle',(.16,.34,1.6),(1.7,-9.29,5.1),metal,.03)
box('Tower door kick plate',(5,.14,1.0),(0,-9.2,.7),metal,.025)
box('Tower door weather hood',(7.2,2,.7),(0,-9.2,11.9),concrete,.13)
for z in [17.6,29.4]:
 box('Recessed ventilation opening',(.18,5.6,3.5),(8.91,0,z),metal,.08)
 for i in range(6):box('Angled vent louver',(.35,5.8,.18),(9.07,0,z-1.35+i*.54),paint,.025)
beam('External tower electrical conduit',(-5.3,-8.99,1.1),(-5.3,-8.99,35.8),.11,metal)
for z in [7,17,27]:box('Conduit retaining clamp',(.55,.24,.18),(-5.3,-9,z),metal,.025)
box('Weatherproof electrical cabinet',(2.2,.6,3.2),(-5.3,-9.05,4.2),paint,.12)
box('Observation deck',(18,18,1),(0,0,36.7),paint,.2)
box('Cabin lower armored belt',(16.5,16.5,3),(0,0,38.6),paint,.18)
for side in [-1,1]:
 for a in [-5.4,0,5.4]:
  box('Observation front glazing',(5.0,.16,6.2),(a,side*8.3,43),glass,.015)
  box('Observation side glazing',(.16,5.0,6.2),(side*8.3,a,43),glass,.015)
 for a in [-8.25,-2.7,2.7,8.25]:
  box('Cabin window steel post',(.35,.5,7.2),(a,side*8.3,43),metal,.04)
  box('Cabin window steel post',(.5,.35,7.2),(side*8.3,a,43),metal,.04)
box('Cabin roof sunshade',(19,19,1.1),(0,0,47),paint,.2)
for x in [-7,7]:beam('Tower aerial',(x,5,47),(x,5,52),.11,metal)
for x in [-7.6,7.6]:box('Tower searchlight housing',(2,2,1.5),(x,-8.6,47.6),metal,.15)

# BARRICADE — cast Jersey profile with irregular fabric-filled flank sacks.
current='barricade';length=12
profile=[(-2.3,0),(2.3,0),(2.3,1.0),(.8,4),(.8,5.8),(-.8,5.8),(-.8,4),(-2.3,1)]
vs=[(x,y,z)for x in [-length/2,length/2]for y,z in profile];n=len(profile)
faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n)for i in range(n)]
mesh('Cast Jersey blast barrier',vs,faces,concrete,.12)
for x in [-4.2,4.2]:
 box('Reflective barrier marker',(1.5,.12,1.0),(x,-.89,4.85),yellow,.015)
 beam('Barrier lift loop',(x,-.25,5.8),(x,.25,6.2),.12,metal)
def sack(name,center,angle,variant):
 vs=[];rings=7;sides=12;L=4.6;R=1.23
 for j in range(rings+1):
  u=j/rings;px=(u-.5)*L;scale=.3+.7*math.sin(math.pi*u)**.36
  for i in range(sides):
   a=math.tau*i/sides;r=R*scale*(1+.035*math.sin(i*2.3+j*1.7+variant));py=math.cos(a)*r;pz=math.sin(a)*r*.52
   vs.append((center[0]+px*math.cos(angle)-py*math.sin(angle),center[1]+px*math.sin(angle)+py*math.cos(angle),center[2]+pz))
 fs=[tuple(reversed(range(sides))),tuple(rings*sides+i for i in range(sides))]
 for j in range(rings):
  for i in range(sides):a=j*sides+i;b=j*sides+(i+1)%sides;fs.append((a,b,b+sides,a+sides))
 mesh(name,vs,fs,sand,smooth=True)
for side in [-1,1]:
 for row in range(4):
  for depth in [-.64,.68]:sack('Stacked filled fabric sandbag',(side*(8.15+.12*(row%2)),depth,.72+row*1.28),.06*math.sin(row+side),row+side)

# Batch by material, apply transforms, center root origins and export one loader-
# compatible GLB. Each major reusable root remains independently addressable.
roots=[];report={};totalTris=0
for name,objects in groups.items():
 root=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(root);roots.append(root)
 materials=list(dict.fromkeys(o.data.materials[0]for o in objects))
 batches=[(material,[o for o in objects if o.data.materials[0]==material])for material in materials]
 for material,batch in batches:
  bpy.ops.object.select_all(action='DESELECT')
  for o in batch:o.select_set(True)
  bpy.context.view_layer.objects.active=batch[0];bpy.ops.object.join();o=bpy.context.object;o.name=name+'__'+material.name.replace(' ','_')
  bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.parent=root
  # Triangulate once offline so reported triangles equal shipping triangles.
  mod=o.modifiers.new('Shipping triangles','TRIANGULATE');bpy.ops.object.modifier_apply(modifier=mod.name)
 verts=[o.matrix_world@v.co for o in root.children for v in o.data.vertices]
 lo=[min(v[i]for v in verts)for i in range(3)];hi=[max(v[i]for v in verts)for i in range(3)]
 tris=sum(len(o.data.polygons)for o in root.children);totalTris+=tris
 # Blender (x,y,z) -> glTF (x,z,-y).
 report[name]={'boundsMin':[lo[0],lo[2],-hi[1]],'boundsMax':[hi[0],hi[2],-lo[1]],'triangles':tris,'draws':len(root.children),'origin':[0,0,0]}
 root['role']=name;root['nonTraversable']=name in ['hangar','command','watchtower'];root['metresPerUnit']=.2
 root['solidTop']={'hangar':35.0,'command':33.0,'watchtower':47.55,'barricade':5.8}[name]
path=SRC/'outpost-kit.raw.glb'
bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_yup=True,export_extras=True,export_materials='EXPORT',export_cameras=False,export_lights=False,export_texcoords=True,export_normals=True)
bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'outpost-kit.blend'))
validation={'asset':'public/models/frontline/outpost-kit.glb','bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'triangles':totalTris,'assets':report,'provenance':'Original authored Python geometry and deterministic generated textures; no third-party assets.'}
(SRC/'bounds.json').write_text(json.dumps(validation,indent=2));print(json.dumps(validation,indent=2))
assert totalTris<60000, 'Triangle budget exceeded'
