import json,sys
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
r=json.loads((Path(__file__).resolve().parents[1]/'assets-src/frontline-clone-kit/native-reference.json').read_text());trees=[]
if '--v3'in sys.argv:r['poses']+=json.loads((Path(__file__).resolve().parents[1]/'assets-src/frontline-clone-kit/integration-review/snapshots.json').read_text())[:9]
if '--settled'in sys.argv:r['poses']=json.loads((Path(__file__).resolve().parents[1]/'assets-src/frontline-clone-kit/v3/integration-review/snapshots.json').read_text())[-3:]
for pose in r['poses']:
 m=next(m for m in pose['meshes']if m['name']=='hero-skin-body');inv=Matrix([pose['torso'][i::4]for i in range(4)]).inverted();vs=[inv@Vector(m['position'][i:i+3])for i in range(0,len(m['position']),3)];fs=[m['index'][i:i+3]for i in range(0,len(m['index']),3)];trees.append(BVHTree.FromPolygons(vs,fs,all_triangles=True))
for x in [-1.25,-1.1,-1.02,-.95,-.84,.84,.95,1.1,1.25]:
 row=[]
 for z in [-.7,-.5,-.3,-.1,.1,.3,.5,.7]:
  hits=[t.ray_cast(Vector((x,5,z)),Vector((0,-1,0)),10)[0]for t in trees];row.append(round(max(v.y for v in hits if v is not None),3)if any(v is not None for v in hits)else None)
 print(x,row)
