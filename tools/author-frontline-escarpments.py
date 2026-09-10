"""Source-only four-role escarpment study. Never writes public/ or src/.

Explicit irregular bedding contours replace extrusion-like tall curtains.
Existing closed scanned talus supplies the collapsed blocks; measured Rock Face
displacement supplies secondary fracture relief. Output is an original GLB kit.
"""
import bpy,bmesh,numpy as np,math,os,json
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'assets-src','frontline-escarpment-study');os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
image=bpy.data.images.load(os.path.join(ROOT,'assets-src/polyhaven/rock_face/rock_face_disp_2k.jpg'))
image.colorspace_settings.name='Non-Color';photo=np.array(image.pixels[:],dtype=np.float32).reshape(image.size[1],image.size[0],4)[:,:,0]
with bpy.data.libraries.load(os.path.join(ROOT,'assets-src/frontline-talus/fractured-talus-kit.blend'),link=False) as (source,loaded):loaded.objects=[f'talus-{i}' for i in range(4)]
scans=loaded.objects

# These are composed low benches / split shoulders / broad buttes / asymmetric
# escarpments. Each level is (height, X span, Y span, center X, center Y).
# Unequal retreats make horizontal ledges large enough to survive native scale.
PROFILES=[
 [(0,1,.83,0,0),(.10,.95,.80,0,0),(.13,.80,.67,-.07,.01),(.38,.78,.66,-.07,.01),(.42,.53,.49,.06,-.02),(.63,.51,.48,.06,-.02),(1,.48,.45,.03,-.02)],
 [(0,1,.78,0,0),(.17,.94,.74,0,0),(.20,.73,.60,-.12,-.01),(.55,.70,.58,-.12,-.01),(.60,.44,.40,.03,-.01),(1,.42,.39,.02,-.01)],
 [(0,.94,.94,0,0),(.10,.90,.90,0,0),(.13,.73,.72,-.04,.03),(.29,.71,.70,-.04,.03),(.34,.52,.51,.01,.01),(.70,.50,.49,.01,.01),(1,.48,.48,.01,.01)],
 [(0,1,.74,0,0),(.11,.95,.70,0,0),(.14,.77,.63,-.10,.01),(.36,.74,.61,-.10,.01),(.42,.51,.43,.07,.02),(.72,.49,.42,.07,.02),(1,.46,.41,.04,.02)]
]
OUTLINES=[
 [(-.98,-.30),(-.74,-.78),(-.30,-.82),(.06,-.66),(.56,-.84),(.95,-.39),(.89,.02),(.62,.46),(.24,.84),(-.23,.75),(-.57,.47),(-.92,.15)],
 [(-1,-.20),(-.70,-.69),(-.15,-.84),(.22,-.57),(.74,-.67),(.96,-.16),(.78,.21),(.43,.73),(.03,.66),(-.33,.81),(-.67,.38),(-.90,.22)],
 [(-.93,-.42),(-.57,-.79),(-.19,-.73),(.12,-.89),(.65,-.61),(.91,-.22),(.74,.28),(.49,.73),(.13,.87),(-.25,.63),(-.78,.65),(-.98,.17)],
 [(-1,-.25),(-.63,-.71),(-.27,-.53),(.11,-.84),(.58,-.75),(.94,-.26),(.79,.21),(.65,.63),(.15,.86),(-.22,.66),(-.63,.59),(-.92,.12)]
]
def smooth(a,b,v):
 t=np.clip((v-a)/(b-a),0,1);return t*t*(3-2*t)
def contour(index,height):
 levels=np.array(PROFILES[index])
 points=np.array(OUTLINES[index]);result=[]
 for j in range(len(points)):
  a=points[j];b=points[(j+1)%len(points)]
  for k in range(12):
   t=k/12;p=a*(1-t)+b*t;result.append(p)
 xy=np.array(result);n=len(xy);angles=np.arctan2(xy[:,1],xy[:,0])
 # Bed throws differ across large fault blocks. Shelf corners terminate at
 # faults rather than retreating as a complete concentric perimeter at once.
 throws=np.interp(np.arange(n)/12,np.arange(13),[.02,.02,-.07,-.07,.09,.09,.03,-.09,-.09,.10,.10,.02,.02])
 local=np.clip(height+throws*smooth(.01,.10,height)*(1-smooth(.70,1,height)),0,1)
 sx,sy,ox,oy=[np.interp(local,levels[:,0],levels[:,j]) for j in range(1,5)]
 # Measured seam offsets vary between beds. No new analytic noise octave.
 u=((np.arange(n)/n*3.1+index*.173)%1*(photo.shape[1]-1)).astype(int)
 v=int((height*4.7+index*.223)%1*(photo.shape[0]-1))
 grain=(photo[v,u]-.5)*.055*smooth(0,.025,height)
 xy[:,0]=xy[:,0]*sx+ox+grain*np.cos(angles)
 xy[:,1]=xy[:,1]*sy+oy+grain*np.sin(angles)
 # Surviving vertical joint recesses are confined to the upper hard rock; the
 # broad lower shoulders do not inherit a full-height fluted perimeter.
 for joint,wide,depth in [(-1.88,.075,.065),(-.78,.11,.075),(2.05,.085,.06)]:
  angle=np.arctan2(np.sin(angles-joint-index*.17),np.cos(angles-joint-index*.17))
  cut=np.exp(-(angle/wide)**4)*depth*smooth(.35,.47,height)
  xy[:,0]-=cut*np.cos(angles);xy[:,1]-=cut*np.sin(angles)
 # Two offset fault planes shear individual beds and terminate at shoulders.
 bed=int(np.searchsorted(levels[:,0],height))
 cuts=((xy[:,0]+xy[:,1]*.43>.17)&(xy[:,1]<-.12)).astype(float)
 zz=np.full(n,height)-cuts*(.015+.011*(bed%3))*smooth(.03,.12,height)*(1-smooth(.85,1,height))
 # Broken upper skyline drops below the only planar central landing surface.
 if height>.84:
  drop=np.interp(np.arange(n)/12,np.arange(13),[.11,.07,.04,.10,.14,.08,.055,.12,.06,.03,.09,.13,.11])
  zz-=drop*smooth(.84,1,height)
 return np.column_stack((xy,zz))

def volume(index):
 levels=[p[0] for p in PROFILES[index]]
 heights=sorted(set(levels+np.linspace(0,1,101).tolist()))
 rings=[contour(index,h) for h in heights];edge=rings[-1];n=len(edge)
 for t in [.92,.8,.66,.5,.34,.18]:
  xy=edge[:,:2]*t;z=1-(1-edge[:,2])*smooth(.5,1,t)
  rings.append(np.column_stack((xy,z)))
 vertices=np.concatenate(rings).tolist();faces=[]
 for k in range(len(rings)-1):
  for j in range(n):
   a=k*n+j;b=k*n+(j+1)%n;faces.extend([(a,b,b+n),(a,b+n,a+n)])
 bottom=len(vertices);vertices.append((0,0,0));top=len(vertices);vertices.append((0,0,1))
 for j in range(n):faces.extend([(bottom,(j+1)%n,j),(top,(len(rings)-1)*n+j,(len(rings)-1)*n+(j+1)%n)])
 return vertices,faces

def apron(vertices,faces,index):
 # Source-authored fallen slabs in two irregular front fans, not a repeated ring.
 pieces=[(-.72,-.57,.26,.28,.11,.07),(-.45,-.76,.36,.29,.12,.06),(-.12,-.84,.28,.24,.095,.035),(.25,-.79,.34,.30,.12,.06),(.57,-.56,.34,.28,.15,.07),(.80,-.24,.23,.32,.13,.055),
 (-.73,-.17,.29,.34,.16,.15),(-.55,-.39,.34,.26,.12,.22),(-.24,-.58,.37,.26,.12,.26),(.19,-.50,.34,.25,.14,.30),(.43,-.32,.28,.28,.16,.26),
 (-.68,.31,.31,.34,.12,.10),(-.35,.61,.35,.29,.13,.06),(.12,.62,.29,.28,.12,.06),(.45,.50,.28,.31,.11,.08),(.59,.20,.30,.24,.15,.15),
 (-.37,-.23,.31,.25,.10,.43),(.25,-.21,.28,.26,.12,.44),(-.12,.34,.32,.29,.09,.47)]
 for j,(px,py,sx,sy,sz,pz) in enumerate(pieces):
  source=scans[(j+index)%4].data;coords=np.array([tuple(v.co) for v in source.vertices]);lo=coords.min(0);hi=coords.max(0);coords=(coords-(lo+hi)/2)/(hi-lo)
  coords*=np.array([sx,sy,sz]);angle=[-.27,.39,-.71,.11,.55,-.18][(j+index)%6];c=math.cos(angle);s=math.sin(angle)
  coords[:,:2]=coords[:,:2]@np.array([[c,s],[-s,c]])
  # Bury each broken block into the supporting body. A tangent-only voxel
  # contact can otherwise leave a non-manifold shared edge at the outer foot.
  coords+=np.array([px*.93,py*.93,pz]);offset=len(vertices);vertices.extend(coords.tolist());faces.extend(tuple(offset+k for k in p.vertices) for p in source.polygons)

def clean(mesh):
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
 bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=.000001)
 # Collapse can turn isolated tiny remesh shells into two opposite coincident
 # triangles. They have no volume; keeping one and filling it recreates the fin.
 bm.verts.index_update();seen={}
 for f in bm.faces:seen.setdefault(tuple(sorted(v.index for v in f.verts)),[]).append(f)
 duplicates=[f for group in seen.values() if len(group)>1 for f in group]
 if duplicates:bmesh.ops.delete(bm,geom=duplicates,context='FACES')
 wire=[e for e in bm.edges if not e.link_faces]
 if wire:bmesh.ops.delete(bm,geom=wire,context='EDGES')
 boundary=[e for e in bm.edges if e.is_boundary]
 if boundary:bmesh.ops.holes_fill(bm,edges=boundary,sides=0)
 bmesh.ops.triangulate(bm,faces=list(bm.faces))
 # A degenerate filled n-gon may tessellate into an opposite triangle pair;
 # remove zero-volume fins after tessellation as well, without filling again.
 bm.verts.index_update();seen={}
 for f in bm.faces:seen.setdefault(tuple(sorted(v.index for v in f.verts)),[]).append(f)
 duplicates=[f for group in seen.values() if len(group)>1 for f in group]
 if duplicates:bmesh.ops.delete(bm,geom=duplicates,context='FACES')
 wire=[e for e in bm.edges if not e.link_faces]
 if wire:bmesh.ops.delete(bm,geom=wire,context='EDGES')
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free();mesh.update()

def normalize_vertical(mesh):
 # Decimation can overshoot a base by sub-millimetres. Do not flatten an entire
 # remeshed apron before collapse: that folds thin bottom faces onto each other.
 low=min(v.co.z for v in mesh.vertices)
 for v in mesh.vertices:v.co.z=(v.co.z-low)/(1-low)
 mesh.update()

def native_crown(mesh):
 # Native skin fitting centers the complete apron bounds, not the loft origin.
 # Keep an integral 26u-ish landing patch around that actual fitted center.
 coords=np.array([tuple(v.co) for v in mesh.vertices]);center=(coords.min(0)+coords.max(0))*.5
 for v in mesh.vertices:
  if v.co.z<.80:continue
  radius=math.hypot(v.co.x-center[0],v.co.y-center[1])
  if radius<.22:v.co.z=1-(1-v.co.z)*float(smooth(.14,.22,radius))
 mesh.update()

def validate(obj):
 mesh=obj.data;mesh.calc_loop_triangles();bm=bmesh.new();bm.from_mesh(mesh)
 nonmanifold=sum(not e.is_manifold for e in bm.edges);vol=bm.calc_volume(signed=True);bm.free()
 coords=np.array([tuple(v.co) for v in mesh.vertices]);tree=BVHTree.FromPolygons(coords.tolist(),[tuple(p.vertices) for p in mesh.polygons])
 errors=[];center=(coords.min(0)+coords.max(0))*.5
 for x in [-.055,0,.055]:
  for y in [-.055,0,.055]:
   hit=tree.ray_cast(Vector((center[0]+x,center[1]+y,2)),Vector((0,0,-1)),3)
   if hit[0] is not None:errors.append(abs(hit[0].z-1))
 return {'name':obj.name,'triangles':len(mesh.loop_triangles),'nonManifoldEdges':nonmanifold,'volume':vol,'bounds':[coords.min(0).tolist(),coords.max(0).tolist()],'crownHits':len(errors),'crownMaxError':max(errors) if errors else 999}

material=bpy.data.materials.new('shared-physical-sandstone');material.use_nodes=True
bsdf=material.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(.43,.30,.19,1);bsdf.inputs['Roughness'].default_value=.94
report=[]
for index in range(4):
 vertices,faces=volume(index);apron(vertices,faces,index)
 mesh=bpy.data.meshes.new(f'escarpment-{index}');mesh.from_pydata(vertices,[],faces);mesh.update()
 obj=bpy.data.objects.new(f'escarpment-{index}-lod0',mesh);bpy.context.collection.objects.link(obj);bpy.context.view_layer.objects.active=obj;obj.select_set(True)
 remesh=obj.modifiers.new('Union continuous bedding and scanned apron','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.008;remesh.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=remesh.name)
 native_crown(obj.data)
 for v in obj.data.vertices:
  if v.co.z>.987:v.co.z=1
 obj.data.calc_loop_triangles();dec=obj.modifiers.new('Near geometric budget','DECIMATE');dec.ratio=min(1,11500/len(obj.data.loop_triangles));bpy.ops.object.modifier_apply(modifier=dec.name)
 for v in obj.data.vertices:
  if v.co.z>.987:v.co.z=1
 native_crown(obj.data);clean(obj.data);normalize_vertical(obj.data);obj.data.materials.append(material);obj.data.set_sharp_from_angle(angle=.62)
 uv=obj.data.uv_layers.new(name='UVMap')
 for p in obj.data.polygons:
  p.use_smooth=True
  for i in p.loop_indices:
   co=obj.data.vertices[obj.data.loops[i].vertex_index].co;uv.data[i].uv=((co.x+1)*.5,(co.y+1)*.5)
 report.append(validate(obj));low=obj.copy();low.data=obj.data.copy();low.name=f'escarpment-{index}-lod1';bpy.context.collection.objects.link(low)
 bpy.context.view_layer.objects.active=low;dec=low.modifiers.new('Far geological silhouette','DECIMATE');dec.ratio=.18;bpy.ops.object.modifier_apply(modifier=dec.name)
 for v in low.data.vertices:
  if v.co.z>.98:v.co.z=1
 native_crown(low.data);clean(low.data);normalize_vertical(low.data);low.data.set_sharp_from_angle(angle=.62);report.append(validate(low));obj.select_set(False)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'tiered-escarpment-kit.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'tiered-escarpment-kit.glb'),export_format='GLB',export_yup=True,export_apply=True)
with open(os.path.join(OUT,'mesh-validation.json'),'w') as f:json.dump({'sourceOnly':True,'meshes':report},f,indent=2)
print(json.dumps(report))
