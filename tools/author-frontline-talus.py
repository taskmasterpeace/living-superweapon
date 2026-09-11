"""Cut short, closed talus fragments from the licensed Boulder04 scan.

No separate landing lids: the broad crown is a fracture plane through the same
stone volume. Source photographs/relief remain on uncut faces; native runtime
uses the shared world-projected sandstone maps. CPU mesh authoring only.
"""
import bpy, bmesh, math, os, numpy as np
from mathutils import Vector, Matrix

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'assets-src','frontline-talus');os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'assets-src/polyhaven/namaqualand_boulder_04/namaqualand_boulder_04_1k.gltf'))
source=next(o for o in bpy.context.scene.objects if o.type=='MESH')
source.data.transform(source.matrix_world);source.matrix_world=Matrix.Identity(4)
material=bpy.data.materials.new('frontline-talus-sandstone');material.use_nodes=True
material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.43,.28,.15,1)
material.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.96

for i in range(4):
    mesh=source.data.copy();obj=bpy.data.objects.new(f'talus-{i}',mesh);bpy.context.collection.objects.link(obj)
    mesh.transform(Matrix.Rotation([0,.73,1.46,2.51][i],4,'Z')@Matrix.Rotation([-.18,-.06,.06,.11][i],4,'Y'))
    coords=np.empty(len(mesh.vertices)*3,dtype=np.float32);mesh.vertices.foreach_get('co',coords);coords=coords.reshape(-1,3)
    lo=coords.min(axis=0);hi=coords.max(axis=0);center=(lo+hi)*.5;half=(hi-lo)*.5
    coords=(coords-center)/half;mesh.vertices.foreach_set('co',coords.reshape(-1));mesh.update()
    bm=bmesh.new();bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
    top=[.27,.19,.34,.16][i]
    planes=[((0,0,top),(0,0,1)),((0,0,-.71),(0,0,-1)),
            ((.79,0,0),(1,0,.05)),((0,-.77,0),(.05,-1,0))]
    for co,normal in planes:
        cut=bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.000001,
            plane_co=Vector(co),plane_no=Vector(normal),clear_outer=True,clear_inner=False)
        boundary=[e for e in bm.edges if e.is_boundary]
        if boundary:bmesh.ops.holes_fill(bm,edges=boundary,sides=0)
    bmesh.ops.triangulate(bm,faces=list(bm.faces))
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(mesh);bm.free();mesh.update()
    mesh.materials.clear();mesh.materials.append(material)
    for poly in mesh.polygons:poly.use_smooth=True
    bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    dec=obj.modifiers.new('Retain measured scan relief','DECIMATE');dec.ratio=min(1,6000/len(mesh.polygons))
    bpy.ops.object.modifier_apply(modifier=dec.name)
    # Cutting a scan across an existing edge can leave a coincident seam after
    # decimation. Weld and fill only boundary loops, then validate the volume.
    clean=bmesh.new();clean.from_mesh(obj.data)
    bmesh.ops.remove_doubles(clean,verts=list(clean.verts),dist=.00001)
    bmesh.ops.dissolve_degenerate(clean,edges=list(clean.edges),dist=.000001)
    boundary=[e for e in clean.edges if e.is_boundary]
    if boundary:bmesh.ops.holes_fill(clean,edges=boundary,sides=0)
    bmesh.ops.dissolve_limit(clean,angle_limit=.008,verts=list(clean.verts),edges=list(clean.edges),use_dissolve_boundaries=True)
    bmesh.ops.triangulate(clean,faces=list(clean.faces));bmesh.ops.recalc_face_normals(clean,faces=list(clean.faces))
    clean.to_mesh(obj.data);clean.free();obj.data.validate(verbose=True);obj.data.update()
    seal=bmesh.new();seal.from_mesh(obj.data)
    boundary=[e for e in seal.edges if e.is_boundary]
    if boundary:bmesh.ops.holes_fill(seal,edges=boundary,sides=0)
    bmesh.ops.triangulate(seal,faces=list(seal.faces));bmesh.ops.recalc_face_normals(seal,faces=list(seal.faces))
    seal.to_mesh(obj.data);seal.free();obj.data.update()
    for vertex in obj.data.vertices:
        if vertex.co.z>top-.003:vertex.co.z=top
    # Crown stays exactly coplanar through simplification; its vertices are not
    # covered by an offset cap object. Recenter for native envelope fitting.
    coords=[v.co for v in obj.data.vertices]
    lo=Vector(tuple(min(v[k] for v in coords) for k in range(3)))
    hi=Vector(tuple(max(v[k] for v in coords) for k in range(3)))
    center=(lo+hi)*.5
    for vertex in obj.data.vertices:vertex.co-=center
    obj.data.name=obj.name;obj.select_set(False)

bpy.data.objects.remove(source,do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'fractured-talus-kit.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'fractured-talus-kit.glb'),export_format='GLB',export_yup=True,export_apply=True,export_extras=True)
print('Exported four closed scan-derived fracture volumes; no separate landing caps')
