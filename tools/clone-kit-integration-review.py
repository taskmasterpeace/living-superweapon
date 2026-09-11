"""Actual rendered triangle overlap audit of shipped kit, no rendering/runtime edits."""
import json,sys
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
BASE=Path(__file__).resolve().parents[1]/'assets-src/frontline-clone-kit';OUT=BASE/'integration-review';V3='--v3'in sys.argv
if '--native-v3'in sys.argv:OUT=BASE/'v3/integration-review'
for arg in sys.argv:
 if arg.startswith('--output='):OUT=Path(arg[9:])
snapshots=json.loads((OUT/'snapshots.json').read_text());rows=[]
if V3:
 kit=json.loads((BASE/'v3/clone-kit-meshes.json').read_text())
 for snap in snapshots:
  snap['meshes']=[m for m in snap['meshes']if not m['group'].startswith('clone_')]
  for name,pieces in kit.items():
   transform=Matrix([snap['head'if name.endswith('head')else'torso'][i::4]for i in range(4)])
   for m in pieces:
    position=[c for i in range(0,len(m['position']),3)for c in transform@Vector(m['position'][i:i+3])];snap['meshes'].append({**m,'position':position,'group':name})
def tree(m):return BVHTree.FromPolygons([Vector(m['position'][i:i+3])for i in range(0,len(m['position']),3)],[m['index'][i:i+3]for i in range(0,len(m['index']),3)],all_triangles=True)
for snap in snapshots:
 row={'name':snap['name'],'body':0,'forearm':0,'rifle':0,'floor':{},'details':[]}
 body=next(m for m in snap['meshes']if m['name']=='hero-skin-body')
 if 'arm'in body:
  trunkIndex=[i for n in range(0,len(body['index']),3)if min(body['trunk'][j]for j in body['index'][n:n+3])>.65 for i in body['index'][n:n+3]]
  armIndex=[i for n in range(0,len(body['index']),3)if min(body['arm'][j]for j in body['index'][n:n+3])>.65 for i in body['index'][n:n+3]]
  row['baselineArmTrunk']=len(tree({**body,'index':trunkIndex}).overlap(tree({**body,'index':armIndex})))
 for m in snap['meshes']:
  if not m['group'].startswith('clone_'):continue
  t=tree(m);row['floor'][m['name']]=min(m['position'][1::3])
  for other in snap['meshes']:
   if other['group']not in ['body','forearm','rifle']:continue
   overlap=t.overlap(tree(other));count=len(overlap)
   if count:
    inverse=Matrix([snap['head'if m['group'].endswith('head')else'torso'][i::4]for i in range(4)]).inverted();centers=[]
    for i in sorted(set(i for i,j in overlap)):
     face=m['index'][i*3:i*3+3];centers.append(inverse@(sum((Vector(m['position'][j*3:j*3+3])for j in face),Vector())/3))
    row['details'].append({'kit':m['name'],'other':other['name'],'group':other['group'],'intersections':count,'centersLocal':[list(v)for v in centers[::max(1,len(centers)//6)]]});row[other['group']]+=count
 rows.append(row)
((BASE/'v3/extended-triangle-audit.json')if V3 else(OUT/'triangle-audit.json')).write_text(json.dumps(rows,indent=2));print(json.dumps(rows,indent=2))
