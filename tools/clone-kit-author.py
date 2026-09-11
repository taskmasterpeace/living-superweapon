"""Original source-only infantry kit, fitted to actual native clone geometry.
No runtime asset replacement. Coordinates authored in Three X/Y(up)/Z(front).
Blender Cycles CPU only, at most four threads. No external game assets.
"""
import bpy,bmesh,json,math,sys
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'assets-src/frontline-clone-kit';V3='--v3'in sys.argv;OUT=BASE/'v3'if V3 else BASE;OUT.mkdir(parents=True,exist_ok=True)
reference=json.loads((BASE/'native-reference.json').read_text())
if V3:
 extra=json.loads((BASE/'integration-review/snapshots.json').read_text());reference['poses'] += [p for p in extra if not p['name'].startswith('ragdoll')]
source=json.loads((ROOT/'src/data/hero-body-bank.json').read_text())['bodies']['superhero-male']
body=next(m for m in source['meshes'] if m['material']=='body')
points={j['name']:Vector((j['matrix'][12],j['matrix'][13],j['matrix'][14]))for j in source['joints']}
crown=max(body['position'][1::3]);headCenter=Vector((0,crown-.12,points['Head'].z));centerY=points['pelvis'].y+(points['upperarm_r'].y-points['pelvis'].y)*.6125;scaleY=3.02/(points['upperarm_r'].y-points['pelvis'].y)
raw=[Vector(body['position'][i:i+3])for i in range(0,len(body['position']),3)];faces=[body['index'][i:i+3]for i in range(0,len(body['index']),3)]
headVs=[(v-headCenter)*6.2 for v in raw];headFs=[f for f in faces if min(headVs[i].y for i in f)>-1.42];headTree=BVHTree.FromPolygons(headVs,headFs,all_triangles=True)
torsoVs=[Vector((v.x*6,(v.y-centerY)*scaleY,(v.z-points['pelvis'].z)*5.6))for v in raw];torsoTree=BVHTree.FromPolygons(torsoVs,faces,all_triangles=True)
torsoTrees=[];bodyTrees=[];shoulderTrees=[]
for pose in reference['poses']:
 m=next(m for m in pose['meshes']if m['name']=='hero-skin-body');inverse=Matrix([pose['torso'][i::4]for i in range(4)]).inverted()
 vs=[inverse@Vector(m['position'][i:i+3])for i in range(0,len(m['position']),3)];fs=[m['index'][i:i+3]for i in range(0,len(m['index']),3)];bodyTrees.append(BVHTree.FromPolygons(vs,fs,all_triangles=True));shoulderTrees.append(BVHTree.FromPolygons(vs,[f for f in fs if max(m['trunk'][i]for i in f)>.02],all_triangles=True));fs=[f for f in fs if min(m['trunk'][i]for i in f)>.65]
 torsoTrees.append(BVHTree.FromPolygons(vs,fs,all_triangles=True))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def pt(v):return(v[0],-v[2],v[1])
def unpt(v):return(v[0],v[2],-v[1])
def mat(name,color,rough,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1);p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;return m
shellMat=mat('kit-shell-olive',(.145,.165,.105),.79,.04);clothMat=mat('kit-webbing-khaki',(.255,.224,.147),.93);darkMat=mat('kit-rubber-hardware',(.027,.032,.024),.72,.12)
materials=[shellMat,clothMat,darkMat];groups={'clone_helmet_head':[],'clone_vest_torso':[]};current='clone_helmet_head';parts=[]
def mesh(name,vs,fs,material,smooth=False):
 me=bpy.data.meshes.new(name);me.from_pydata([pt(v)for v in vs],[],fs);me.update();ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);me.materials.append(material)
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
 for p in me.polygons:p.use_smooth=smooth
 groups[current].append(ob);parts.append(ob);return ob
def solid(name,vs,fs,material,thickness=.02,smooth=False):
 ob=mesh(name,vs,fs,material,smooth);mod=ob.modifiers.new('Actual shell thickness','SOLIDIFY');mod.thickness=thickness;mod.offset=1;bpy.context.view_layer.objects.active=ob;bpy.ops.object.modifier_apply(modifier=mod.name);return ob
def ribbon(name,path,width,material,normal=(0,0,1)):
 vs=[];n=Vector(normal)
 for i,p in enumerate(path):
  tangent=Vector(path[min(i+1,len(path)-1)])-Vector(path[max(0,i-1)]);side=tangent.cross(n).normalized()*width/2;vs.extend([Vector(p)-side,Vector(p)+side])
 return solid(name,vs,[(i*2,i*2+1,i*2+3,i*2+2)for i in range(len(path)-1)],material,.012)
def scalp(theta,a,lift=.1):
 ray=Vector((math.sin(theta)*math.sin(a),math.cos(theta),math.sin(theta)*math.cos(a))).normalized();hit,n,_,_=headTree.ray_cast(Vector((0,0,0)),ray,3)
 if hit is None:raise ValueError('No scalp '+str((theta,a)))
 return hit+n*lift
# High-cut ear scallops are part of a continuous double-surface helmet shell.
# The brow stays above the eyes; the back descends to protect the occipital skull.
N=40;R=7
def edge(a):return 1.29+(.38 if V3 else .59)*max(0,-math.cos(a))**2-.26*math.sin(a)**6
vs=[Vector((0,.86,0))]
for j in range(1,R+1):
 for i in range(N):a=math.tau*i/N;vs.append(scalp(edge(a)*j/R,a,.115))
fs=[(0,1+i,1+(i+1)%N)for i in range(N)]
for j in range(R-1):
 for i in range(N):a=1+j*N+i;b=1+j*N+(i+1)%N;fs.append((a,b,b+N,a+N))
solid('Contoured ballistic helmet shell',vs,fs,shellMat,.048,True)
rim=[scalp(edge(math.tau*i/N),math.tau*i/N,.123)for i in range(N)]
# A swept closed rectangular rim instead of an intersecting torus primitive.
rimVs=[]
for i,p in enumerate(rim):
 d=Vector((p.x,0,p.z)).normalized();rimVs.extend([p-d*.014+Vector((0,.017,0)),p+d*.032+Vector((0,.017,0)),p+d*.032-Vector((0,.034,0)),p-d*.014-Vector((0,.034,0))])
rimFs=[]
for i in range(N):
 for j in range(4):a=i*4+j;b=i*4+(j+1)%4;rimFs.append((a,b,((i+1)%N)*4+(j+1)%4,((i+1)%N)*4+j))
mesh('Rolled rim binding',rimVs,rimFs,darkMat,True)
# Crown textile grip strips follow the fitted shell, not floating boxes.
for a in [-.48,.48,math.pi-.48,math.pi+.48]:
 path=[scalp(.24+i*.085,a,.171)for i in range(10)];ribbon('Helmet crown grip strip',path,.068,clothMat,normal=(math.sin(a),.15,math.cos(a)))
# Small shell rail patches above the ear cutouts, with exposed recessed slots.
for side in [-1,1]:
 a=side*math.pi/2;path=[scalp(.81+i*.04,a-.20,.17)for i in range(6)];ribbon('High ear rail mount',path,.10,darkMat,normal=(side,0,0))
 for aoff in [-.28,.28]:
  center=scalp(.9,a+aoff,.169);ribbon('Rail fixing',[(center.x,center.y-.027,center.z),(center.x,center.y+.027,center.z)],.034,clothMat,normal=(side,0,0))

current='clone_vest_torso'
def surface(x,y,side,lift=.04,trees=None):
 hits=[t.ray_cast(Vector((x,y,side*5)),Vector((0,0,-side)),10)[0]for t in (trees or torsoTrees)];hits=[v.z for v in hits if v is not None]
 if not hits:raise ValueError('No torso '+str((x,y,side)))
 z=max(hits)if side>0 else min(hits)
 return Vector((x,y,z+side*(lift+.035)))
def fitted(name,outline,side,material,lift=.055,thickness=.025):
 original=outline;outline=[tuple(Vector(a).lerp(Vector(b),j/3))for a,b in zip(original,original[1:]+original[:1])for j in range(3)]
 center=Vector((sum(p[0]for p in outline)/len(outline),sum(p[1]for p in outline)/len(outline)));vs=[surface(center.x,center.y,side,lift)];n=len(outline);rings=3
 for j in range(1,rings+1):
  for p in outline:q=center.lerp(Vector(p),j/rings);vs.append(surface(q.x,q.y,side,lift))
 fs=[(0,i+1,(i+1)%n+1)for i in range(n)]
 for j in range(rings-1):
  for i in range(n):a=1+j*n+i;b=1+j*n+(i+1)%n;fs.append((a,b,b+n,a+n))
 ob=solid(name,vs,fs,material,thickness,False);return ob
front=[(-.47,1.00),(.47,1.00),(.70,.48),(.59,-.77),(.52,-1.10),(-.52,-1.10),(-.59,-.77),(-.70,.48)]
back=[(-.60,1.12),(.60,1.12),(.72,.70),(.59,-.80),(.52,-1.12),(-.52,-1.12),(-.59,-.80),(-.72,.70)]
if V3:
 front=[(x,max(-.67,y))for x,y in front];back=[(x,max(-.67,y))for x,y in back]
for side,outline in [(1,front),(-1,back)]:
 fitted('Contoured fabric carrier',outline,side,clothMat,.036,.025)
 # Shallow plate outline preserves the stock pocket and avoids shoulder bulk.
 fitted('Inset plate protection',[(x*.9,y*.92)for x,y in outline],side,shellMat,.075,.034)
 for row in [-.62,-.38,-.14]:
  for col in [-.45,0,.45]:
   path=[surface(col-.16+i*.04,row,side,.126)for i in range(9)];ribbon('Woven attachment webbing',path,.064,clothMat,normal=(0,0,side))
 # Restrained pull tab at the top; no insignia or borrowed faction mark.
 path=[surface(x,.80,side,.129)for x in [-.14,-.07,0,.07,.14]];ribbon('Carrier release tab',path,.058,darkMat,normal=(0,0,side))
for sign in [-1,1]:
 shoulderX=1.10 if V3 else .95
 straps=[]
 for side in [-1,1]:
  path=[surface(sign*(.52+(shoulderX-.52)*i/10),.79+.04*i,side,.065 if V3 else .045,shoulderTrees if V3 else None)for i in range(11)];straps.append((side,path))
 # No metal pad on the gun stock's upper shoulder contact region.
 a=surface(sign*shoulderX,1.19,1,.065 if V3 else .04,shoulderTrees if V3 else None);b=surface(sign*shoulderX,1.19,-1,.065 if V3 else .04,shoulderTrees if V3 else None)
 path=[]
 for i in range(13):
  z=a.z+(b.z-a.z)*i/12;bridgeX=a.x-(.14*math.sin(math.pi*i/12)if V3 and sign>0 else 0);heights=[]
  for x in [bridgeX-.055,bridgeX,bridgeX+.055]:
   for tree in bodyTrees:
    hit=tree.ray_cast(Vector((x,4,z)),Vector((0,-1,0)),5)[0]
    if hit is not None:heights.append(hit.y+(.14 if V3 and sign>0 else .075))
  path.append(Vector((bridgeX,max([1.19+.16*math.sin(math.pi*i/12)]+heights),z)))
 ribbon('Flexible shoulder bridge',path,.10,clothMat,normal=(0,1,0))
 for side,strap in straps:
  if V3:
   # Join the side strips to the actual bridge height instead of leaving their
   # last segment embedded in the deltoid under raised-aim animation.
   target=path[0 if side==1 else -1];start=strap[6].copy()
   for i in range(7,11):
    q=(i-6)/4;strap[i]=start.lerp(target,q);strap[i].z+=(.24 if side==1 and sign<0 else 0)*math.sin(math.pi*q)
  ribbon('Low profile shoulder strap',strap,.10,clothMat,normal=(0,0,side))
 # Low abdomen pouches keep the raised support forearm corridor empty.
 x=sign*.28;y=-.52 if V3 else -.78;pouchY=.5 if V3 else 1;outline=[(x-.24,y-.22*pouchY),(x+.24,y-.22*pouchY),(x+.24,y+.19*pouchY),(x+.19,y+.24*pouchY),(x-.19,y+.24*pouchY),(x-.24,y+.19*pouchY)]
 fitted('Flat lower utility pouch',outline,1,clothMat,.145,.095)
 fitted('Pouch envelope flap',[(x-.25,y+.02*pouchY),(x+.25,y+.02*pouchY),(x+.23,y+.20*pouchY),(x-.23,y+.20*pouchY)],1,shellMat,.25,.025)
 ribbon('Pouch closure webbing',[surface(x,y+(-.11+i*.04)*pouchY,1,.279)for i in range(7)],.075,darkMat)

# Merge by attachment and material: at most six scalar-material mesh draws.
roots={};pieces=[];source_parts=[{'name':o.name,'attachment':k}for k,objs in groups.items()for o in objs]
for name,objs in groups.items():
 root=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(root);root['attachment']='parts.head' if name.endswith('head')else'parts.torso';root['sourceOnly']=True;roots[name]=root
 batches=[(material,[o for o in objs if o.data.materials[0]==material])for material in materials]
 for material,selected in batches:
  if not selected:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in selected:o.select_set(True)
  bpy.context.view_layer.objects.active=selected[0];bpy.ops.object.join();o=bpy.context.object;o.name=name+'__'+material.name
  bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');o.parent=root
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
  bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.1,island_margin=.015);bpy.ops.object.mode_set(mode='OBJECT');pieces.append(o)
bpy.ops.object.select_all(action='DESELECT')
for o in list(roots.values())+pieces:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'clone-kit.raw.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_extras=True,export_animations=False)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'clone-kit.blend'))
kit={name:[]for name in roots}
for ob in pieces:
 kit[ob.parent.name].append({'name':ob.name,'position':[c for v in ob.data.vertices for c in unpt(v.co)],'index':[i for p in ob.data.polygons for i in p.vertices],'material':materials.index(ob.data.materials[0])})
(OUT/'clone-kit-meshes.json').write_text(json.dumps(kit,separators=(',',':')))
(OUT/'authoring.json').write_text(json.dumps({'original':True,'license':'Original project-authored kit; body reference Quaternius CC0, not part of kit export','parts':source_parts,'triangles':sum(len(o.data.polygons)for o in pieces),'draws':len(pieces)},indent=2))
print('CLONE_KIT',sum(len(o.data.polygons)for o in pieces),'triangles',len(pieces),'draws')
