"""Read author CC0 blends without executing embedded scripts; source-only inventory."""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets-src/frontline-service-rifle'
reports=[]
for path in sorted((OUT/'original').glob('*.blend')):
 bpy.ops.wm.open_mainfile(filepath=str(path),use_scripts=False)
 bpy.context.view_layer.update()
 objects=[]
 for obj in bpy.context.scene.objects:
  if obj.type!='MESH':continue
  points=[obj.matrix_world@v.co for v in obj.data.vertices]
  obj.data.calc_loop_triangles()
  if path.stem=='AssaultRifle2_1':
   xmax=max(v.x for v in points);tip=[v for v in points if abs(v.x-xmax)<.0001]
   print('MUZZLE_RING',[(round(v.x,6),round(v.y,6),round(v.z,6))for v in tip])
   edges={i:set()for i in range(len(points))}
   for e in obj.data.edges:
    a,b=e.vertices;edges[a].add(b);edges[b].add(a)
   unseen=set(edges);components=[]
   while unseen:
    todo=[unseen.pop()];ids=[]
    while todo:
     i=todo.pop();ids.append(i)
     for j in edges[i]&unseen:unseen.remove(j);todo.append(j)
    ps=[points[i]for i in ids];components.append({'verts':len(ps),'min':[round(min(v[i]for v in ps),5)for i in range(3)],'max':[round(max(v[i]for v in ps),5)for i in range(3)]})
   print('COMPONENTS',json.dumps(components))
  objects.append({'name':obj.name,'vertices':len(points),'triangles':len(obj.data.loop_triangles),'min':[min(v[i] for v in points)for i in range(3)],'max':[max(v[i] for v in points)for i in range(3)],'materials':[m.name if m else None for m in obj.data.materials],'modifiers':[m.type for m in obj.modifiers]})
 reports.append({'file':path.name,'objects':objects,'materials':[{'name':m.name,'color':list(m.diffuse_color),'nodes':m.use_nodes}for m in bpy.data.materials]})
(OUT/'original-inventory.json').write_text(json.dumps(reports,indent=2))
print(json.dumps(reports,indent=2))
