"""Uniform endpoint-fit probe, NOT an accepted/runtime replacement."""
import bpy,json,math,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets-src/frontline-service-rifle'
path=OUT/'original/AssaultRifle2_1.blend'
bpy.ops.wm.open_mainfile(filepath=str(path),use_scripts=False)
obj=next(o for o in bpy.context.scene.objects if o.type=='MESH')
for other in list(bpy.context.scene.objects):
 if other!=obj:bpy.data.objects.remove(other,do_unlink=True)
points=[obj.matrix_world@v.co for v in obj.data.vertices]
minimum=min(v.x for v in points);maximum=max(v.x for v in points);tip=[v for v in points if abs(v.x-maximum)<.0001];bore=sum(tip,Vector())/len(tip)
scale=3.32/(maximum-minimum)
def native(v):return Vector(((v.y-bore.y)*scale,1.17-(v.x-minimum)*scale,.16+(v.z-bore.z)*scale))
fitted=[native(v)for v in points]
edges={i:set()for i in range(len(points))}
for e in obj.data.edges:
 a,b=e.vertices;edges[a].add(b);edges[b].add(a)
unseen=set(edges);components=[]
while unseen:
 todo=[unseen.pop()];ids=[]
 while todo:
  i=todo.pop();ids.append(i)
  for j in edges[i]&unseen:unseen.remove(j);todo.append(j)
 components.append(ids)
obj.data.calc_loop_triangles();triangles=[list(t.vertices)for t in obj.data.loop_triangles]
def nearest(ids,target):
 ids=set(ids);faces=[t for t in triangles if all(i in ids for i in t)];tree=BVHTree.FromPolygons(fitted,faces,all_triangles=True);co,normal,index,distance=tree.find_nearest(Vector(target));return {'distance':distance,'closestNative':list(co)}
sockets={'weapon-primary-grip':[0,0,0],'weapon-support-grip':[0,-.68,-.15],'weapon-stock-contact':[0,1.17,.16],'weapon-muzzle':[0,-2.15,.16]}
contacts={name:nearest(range(len(points)),target)for name,target in sockets.items()}
contacts['primaryToPistolGripOnly']=nearest(components[0],sockets['weapon-primary-grip'])
contacts['supportToForeEndBarrelOnly']=nearest(components[-1],sockets['weapon-support-grip'])
proposed={}
for label,component,query,old in [('primary',components[0],[0,.20,-.23],'weapon-primary-grip'),('support',components[-1],[0,-.95,-.15],'weapon-support-grip')]:
 hit=nearest(component,query);position=hit['closestNative'];proposed[label]={'position':position,'deltaFromCurrent':[position[i]-sockets[old][i]for i in range(3)],'construction':'Nearest actual triangle surface restricted to pistol-grip component' if label=='primary' else 'Nearest actual triangle surface restricted to fore-end/barrel component, below rear-middle ribbed fore-end','selectionQuery':query,'distanceFromSelectionQuery':hit['distance'],'nativeClearanceValidated':False}
# Native (X,Y,Z) becomes Blender (X,-Z,Y), so glTF export recovers the exact native coordinates.
for vertex,p in zip(obj.data.vertices,fitted):vertex.co=(p.x,-p.z,p.y)
obj.matrix_world=Matrix.Identity(4);obj.name='ServiceRifleContractProbe'
for mat in obj.data.materials:
 color=tuple(mat.diffuse_color);mat.use_nodes=True;node=mat.node_tree.nodes.get('Principled BSDF');node.inputs['Base Color'].default_value=color;node.inputs['Metallic'].default_value=.55 if 'Metal'in mat.name else .08;node.inputs['Roughness'].default_value=.5 if 'Metal'in mat.name else .68
for name,p in sockets.items():
 empty=bpy.data.objects.new(name,None);bpy.context.scene.collection.objects.link(empty);empty.location=(p[0],-p[2],p[1]);empty.empty_display_type='PLAIN_AXES';empty.empty_display_size=.15
report={'status':'Uniform endpoint-fit probe; physical grip contact gate not accepted','sourceSHA256':hashlib.sha256(path.read_bytes()).hexdigest(),'uniformScale':scale,'sourceBoreCenter':list(bore),'sourceStockPlaneX':minimum,'nativeForward':[0,-1,0],'nativeUp':[0,0,1],'sockets':sockets,'bounds':{'min':[min(v[i]for v in fitted)for i in range(3)],'max':[max(v[i]for v in fitted)for i in range(3)]},'contacts':contacts,'triangles':len(triangles),'materials':len(obj.data.materials),'degenerateTriangles':sum((fitted[t[1]]-fitted[t[0]]).cross(fitted[t[2]]-fitted[t[0]]).length<1e-10 for t in triangles),'scope':'Unaltered proportions/topology under uniform rigid coordinate conversion. Nearest-surface distances are not hand-wrap or posed body clearance proof. Muzzle is center of open bore, so its nearest surface is naturally nonzero.'}
report['proposedPhysicalContacts']=proposed
(OUT/'fit-report.json').write_text(json.dumps(report,indent=2))
bpy.context.scene.render.threads_mode='FIXED';bpy.context.scene.render.threads=4
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'service-rifle-contract-probe.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'service-rifle-contract-probe.glb'),export_format='GLB',export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
print(json.dumps(report,indent=2))
