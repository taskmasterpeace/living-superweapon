"""A closed, low-cost chip from the licensed full Boulder04 scan."""
import bpy,bmesh,numpy as np,os,json
from mathutils import Matrix
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));OUT=os.path.join(ROOT,'assets-src','frontline-heightfield-candidate')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'assets-src/polyhaven/namaqualand_boulder_04/namaqualand_boulder_04_1k.gltf'))
obj=next(o for o in bpy.context.scene.objects if o.type=='MESH');obj.data.transform(obj.matrix_world);obj.matrix_world=Matrix.Identity(4)
bpy.context.view_layer.objects.active=obj;obj.select_set(True)
source=bmesh.new();source.from_mesh(obj.data);bmesh.ops.remove_doubles(source,verts=list(source.verts),dist=.00001)
bmesh.ops.holes_fill(source,edges=[e for e in source.edges if e.is_boundary],sides=0)
bmesh.ops.triangulate(source,faces=list(source.faces));bmesh.ops.recalc_face_normals(source,faces=list(source.faces));source.to_mesh(obj.data);source.free()
obj.data.calc_loop_triangles();dec=obj.modifiers.new('Browser surface chip silhouette','DECIMATE');dec.ratio=96/len(obj.data.loop_triangles);bpy.ops.object.modifier_apply(modifier=dec.name)
clean=bmesh.new();clean.from_mesh(obj.data);bmesh.ops.remove_doubles(clean,verts=list(clean.verts),dist=.00001)
# Photogrammetry has a hidden undersurface boundary. Seal it before shipping;
# exposing a chip during crater settling must not reveal a one-sided scan sheet.
bmesh.ops.holes_fill(clean,edges=[e for e in clean.edges if e.is_boundary],sides=0)
bmesh.ops.triangulate(clean,faces=list(clean.faces));bmesh.ops.recalc_face_normals(clean,faces=list(clean.faces));clean.to_mesh(obj.data);clean.free()
coords=np.array([tuple(v.co) for v in obj.data.vertices]);lo=coords.min(axis=0);hi=coords.max(axis=0);coords=(coords-(lo+hi)*.5)/(hi-lo)
coords*=np.array([2,1.7,.32])
for v,p in zip(obj.data.vertices,coords):v.co=p
obj.data.update();obj.data.materials.clear();obj.name='frontline-closed-scanned-chip'
positions=[];normals=[];uv=[]
for v in obj.data.vertices:
    positions.extend([round(v.co.x,6),round(v.co.z,6),round(-v.co.y,6)])
    normals.extend([round(v.normal.x,6),round(v.normal.z,6),round(-v.normal.y,6)])
    uv.extend([round((v.co.x+1)*.5,6),round((v.co.y+1)*.5,6)])
data={'position':positions,'normal':normals,'uv':uv,'index':[int(i) for p in obj.data.polygons for i in p.vertices],
 'source':'Poly Haven CC0 Namaqualand Boulder 04 — Jenelle van Heerden'}
with open(os.path.join(OUT,'scanned-chip.json'),'w') as f:json.dump(data,f,separators=(',',':'))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'scanned-chip.blend'))
print(json.dumps({'vertices':len(positions)//3,'triangles':len(data['index'])//3,'height':.32,'width':2}))
