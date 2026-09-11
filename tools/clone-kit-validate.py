"""Numerical actual-triangle gates for the source-only clone kit (Blender CPU)."""
import bpy,bmesh,json,math,hashlib,sys
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'assets-src/frontline-clone-kit';V3='--v3'in sys.argv;OUT=BASE/'v3'if V3 else BASE
kit=json.loads((OUT/'clone-kit-meshes.json').read_text());ref=json.loads((BASE/'native-reference.json').read_text())
def matrix(a):return Matrix([a[i::4]for i in range(4)])
def vertices(m):return [Vector(m['position'][i:i+3])for i in range(0,len(m['position']),3)]
def faces(m):return [m['index'][i:i+3]for i in range(0,len(m['index']),3)]
def tree(vs,fs):return BVHTree.FromPolygons(vs,fs,all_triangles=True,epsilon=0)
report={'runtimeAdopted':False,'attachments':list(kit),'materials':3,'triangles':0,'draws':sum(len(v)for v in kit.values()),'closedPieces':True,'nonFinite':0,'degenerate':0,'poses':[]}
report['meshSha256']=hashlib.sha256((OUT/'clone-kit-meshes.json').read_bytes()).hexdigest()
report['rawGlbSha256']=hashlib.sha256((OUT/'clone-kit.raw.glb').read_bytes()).hexdigest()
report['vestMaxY']=max(v.y for m in kit['clone_vest_torso']for v in vertices(m))
for pieces in kit.values():
 for m in pieces:
  vs,fs=vertices(m),faces(m);report['triangles']+=len(fs);report['nonFinite']+=sum(not math.isfinite(c)for v in vs for c in v)
  edges={}
  for f in fs:
   if (vs[f[1]]-vs[f[0]]).cross(vs[f[2]]-vs[f[0]]).length<1e-10:report['degenerate']+=1
   for a,b in zip(f,f[1:]+f[:1]):key=tuple(sorted((a,b)));edges[key]=edges.get(key,0)+1
  if any(n!=2 for n in edges.values()):report['closedPieces']=False
for pose in ref['poses']:
 vs=[];fs=[]
 for attachment,pieces in kit.items():
  transform=matrix(pose['head' if attachment.endswith('head')else'torso'])
  for m in pieces:
   start=len(vs);vs.extend(transform@v for v in vertices(m));fs.extend(tuple(i+start for i in f)for f in faces(m))
 kt=tree(vs,fs);row={'mode':pose['mode'],'phase':pose['phase'],'supportGap':pose['supportGap'],'rifleIntersections':0,'forearmIntersections':0,'bodyIntersections':0,'details':[]}
 for m in pose['meshes']:
  if m['group'] not in ['rifle','forearm','source-body']:continue
  count=len(kt.overlap(tree(vertices(m),faces(m))))
  if count:row['details'].append({'mesh':m['name'],'group':m['group'],'intersections':count})
  key={'rifle':'rifleIntersections','forearm':'forearmIntersections','source-body':'bodyIntersections'}[m['group']];row[key]+=count
 report['poses'].append(row)
 if pose==ref['poses'][0]:
  diagnostics=[];body=next(m for m in pose['meshes']if m['name']=='hero-skin-body');bt=tree(vertices(body),faces(body))
  for attachment,pieces in kit.items():
   transform=matrix(pose['head'if attachment.endswith('head')else'torso'])
   for m in pieces:
    local=vertices(m);fs=faces(m);overlap=tree([transform@v for v in local],fs).overlap(bt);centers=[sum((local[j]for j in fs[i]),Vector())/3 for i,_ in overlap]
    diagnostics.append({'name':m['name'],'intersections':len(overlap),'sampleCenters':[list(v)for v in centers[::max(1,len(centers)//10)]]})
  report['diagnostics']=diagnostics
# Explicit reference regions in the actual head driver coordinate system.
pose=ref['poses'][0];inverse=matrix(pose['head']).inverted();body=next(m for m in pose['meshes']if m['name']=='hero-skin-body');vs=[inverse@v for v in vertices(body)]
hv=[];hf=[]
for m in kit['clone_helmet_head']:
 start=len(hv);hv.extend(vertices(m));hf.extend(tuple(i+start for i in f)for f in faces(m))
helmet=tree(hv,hf)
ears=[v for v in vs if abs(v.x)>.48 and -.20<v.y<.20 and -.17<v.z<.05]
neck=[v for v in vs if abs(v.x)<.45 and -1.25<v.y<-.78 and abs(v.z)<.5]
report['helmetEarSamples']=len(ears);report['helmetNeckSamples']=len(neck)
report['helmetEarClearance']=min(helmet.find_nearest(v)[3]for v in ears)
report['helmetNeckClearance']=min(helmet.find_nearest(v)[3]for v in neck)
(OUT/'validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
