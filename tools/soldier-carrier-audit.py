"""Triangle overlap of actual production carrier samples; no runtime edits."""
import json,sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
out=Path('artifacts/soldier-carrier-fit'+('-baseline'if '--baseline'in sys.argv else''))
rows=[]
def tree(m):
 return BVHTree.FromPolygons([Vector(m['position'][i:i+3])for i in range(0,len(m['position']),3)],[m['index'][i:i+3]for i in range(0,len(m['index']),3)],all_triangles=True)
for snap in json.loads((out/'snapshots.json').read_text()):
 row={'name':snap['name'],'body':0,'rifle':0,'details':[]}
 trees=[(m,tree(m))for m in snap['meshes']]
 for m,t in trees:
  if m['group']!='kit':continue
  for other,ot in trees:
   if other['group']not in ['body','rifle']:continue
   count=len(t.overlap(ot));row[other['group']]+=count
   if count:row['details'].append({'kit':m['name'],'other':other['name'],'triangles':count})
 rows.append(row)
(out/'triangle-audit.json').write_text(json.dumps(rows,indent=2))
print(json.dumps(rows))
