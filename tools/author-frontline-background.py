"""Three source-only long escarpments, not resized near gameplay pillars."""
import bpy,bmesh,numpy as np,os,math,json
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));OUT=os.path.join(ROOT,'assets-src/frontline-background-study');os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
photo=bpy.data.images.load(os.path.join(ROOT,'assets-src/polyhaven/rock_face/rock_face_disp_2k.jpg'));photo.colorspace_settings.name='Non-Color'
field=np.array(photo.pixels[:]).reshape(photo.size[1],photo.size[0],4)[:,:,0]
# Traced unequal surviving roof blocks; long saddle interruptions stay shallow
# so each volume reads as one escarpment, not a string of independent columns.
CRESTS=[
 [(-1,.04),(-.87,.13),(-.76,.39),(-.64,.76),(-.50,.82),(-.36,.76),(-.21,.79),(-.08,.60),(.07,.58),(.21,.63),(.36,.72),(.48,.66),(.61,.68),(.76,.37),(.90,.17),(1,.03)],
 [(-1,.03),(-.90,.20),(-.73,.31),(-.61,.49),(-.43,.52),(-.31,.45),(-.18,.61),(-.02,.70),(.13,.68),(.24,.85),(.41,.80),(.55,.74),(.72,.41),(.87,.29),(1,.04)],
 [(-1,.02),(-.84,.20),(-.68,.46),(-.49,.50),(-.31,.46),(-.17,.71),(-.04,.76),(.13,.70),(.29,.74),(.42,.59),(.57,.64),(.74,.36),(.88,.12),(1,.02)]
]
FRONTS=[[-.62,-.83,-.75,-.98,-.80,-.72,-.90,-.68,-.73],[-.74,-.60,-.80,-.88,-.67,-.84,-.79,-.62,-.70],[-.67,-.82,-.65,-.71,-.94,-.79,-.83,-.61,-.68]]
# Cross sections contain three broad, interrupted benches and short rock cuts.
# Their unequal setbacks vary along the traced front, instead of concentric rings.
ROWS=[(0,.018),(.16,.09),(.27,.16),(.30,.34),(.46,.36),(.49,.69),(.63,.70),(.66,.96),(.78,1),(.80,.72),(.89,.34),(1,.015)]
mat=bpy.data.materials.new('source-clay');mat.diffuse_color=(.4,.31,.23,1)
report=[]
for variant in range(3):
 crest=np.array(CRESTS[variant]);n=161;xs=np.linspace(-1,1,n);vertices=[];faces=[]
 for j,(t,level) in enumerate(ROWS):
  for i,x in enumerate(xs):
   h=np.interp(x,crest[:,0],crest[:,1]);front=np.interp(x,np.linspace(-1,1,9),FRONTS[variant]);back=.64+np.interp(x,np.linspace(-1,1,5),[.04,-.08,.10,-.05,.02])
   measured=field[int((j*.137+variant*.23)%1*(field.shape[0]-1)),int((x*.77+variant*.19)%1*(field.shape[1]-1))]-.5
   # Coarse source joints affect the face itself, not a runtime noise shader.
   y=front+(back-front)*t+measured*.025*(1-abs(x));z=.008+h*level+measured*.024*h
   vertices.append((x,y,z))
 for j in range(len(ROWS)-1):
  for i in range(n-1):a=j*n+i;faces.extend([(a,a+1,a+n),(a+1,a+n+1,a+n)])
 edge=list(range(n))+[j*n+n-1 for j in range(1,len(ROWS))]+list(range((len(ROWS)-1)*n+n-2,(len(ROWS)-1)*n-1,-1))+[j*n for j in range(len(ROWS)-2,0,-1)]
 bottom=len(vertices);vertices.extend([(vertices[i][0],vertices[i][1],0) for i in edge]);center=len(vertices);vertices.append((0,0,0))
 for k,a in enumerate(edge):b=edge[(k+1)%len(edge)];c=bottom+k;d=bottom+(k+1)%len(edge);faces.extend([(a,c,b),(b,c,d),(center,d,c)])
 mesh=bpy.data.meshes.new(f'background-ridge-{variant}');mesh.from_pydata(vertices,[],faces);mesh.update()
 obj=bpy.data.objects.new(f'background-ridge-{variant}',mesh);bpy.context.collection.objects.link(obj);bpy.context.view_layer.objects.active=obj;obj.select_set(True)
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
 dec=obj.modifiers.new('Silhouette budget','DECIMATE');mesh.calc_loop_triangles();dec.ratio=2200/len(mesh.loop_triangles);bpy.ops.object.modifier_apply(modifier=dec.name)
 top=max(v.co.z for v in mesh.vertices)
 for v in mesh.vertices:v.co.z/=top
 uv=mesh.uv_layers.new(name='UVMap')
 for p in mesh.polygons:
  p.use_smooth=True
  for k in p.loop_indices:co=mesh.vertices[mesh.loops[k].vertex_index].co;uv.data[k].uv=((co.x+1)*.5,(co.y+1)*.5)
 mesh.set_sharp_from_angle(angle=.65);mesh.materials.append(mat);mesh.calc_loop_triangles();bm=bmesh.new();bm.from_mesh(mesh)
 report.append({'name':obj.name,'triangles':len(mesh.loop_triangles),'nonManifoldEdges':sum(not e.is_manifold for e in bm.edges),'volume':bm.calc_volume(signed=True)});bm.free();obj.select_set(False)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'background-ridge-kit.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'background-ridge-kit.glb'),export_format='GLB',export_yup=True,export_apply=True)
with open(os.path.join(OUT,'mesh-validation.json'),'w') as f:json.dump({'sourceOnly':True,'meshes':report},f,indent=2)
print(json.dumps(report))
