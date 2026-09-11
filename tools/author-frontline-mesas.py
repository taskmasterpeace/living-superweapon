"""Reproducible Blender source authoring: eroded caprock, fracture cuts and talus.

Four complete volumes. A continuous radial surface joins crown, scarp and skirt;
there are no wrapped panels or separate crown objects. Photographed displacement
contributes secondary relief; the large silhouette is authored independently.
Run with the project-local portable Blender, --background --python this_file.
"""
import bpy, bmesh, math, os, sys, runpy, numpy as np
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, 'assets-src', 'frontline-mesas-candidate' if '--candidate' in sys.argv else 'frontline-mesas')
os.makedirs(SOURCE, exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
image = bpy.data.images.load(os.path.join(ROOT,'assets-src/polyhaven/rock_face/rock_face_disp_2k.jpg'))
pixels = np.array(image.pixels[:],dtype=np.float32).reshape(image.size[1],image.size[0],4)[:,:,0]

def smooth(a,b,x):
    t=np.clip((x-a)/(b-a),0,1); return t*t*(3-2*t)

# Deliberately different crown shapes and eroded saddle positions, in meters.
VARIANTS = [
 {'stretch':(1,.88),'phase':.3,'cuts':[(.52,.17,.065),(2.2,-.24,.10)],'spurs':[(.65,.1,.22,.47),(-.55,-.3,.27,.34)]},
 {'stretch':(.82,1),'phase':1.9,'cuts':[(1.3,.02,.075),(2.6,.21,.05)],'spurs':[(-.4,.65,.25,.53),(.54,-.45,.28,.32)]},
 {'stretch':(1,.94),'phase':3.4,'cuts':[(.3,-.22,.05),(1.7,.27,.09)],'spurs':[(.5,.47,.33,.43),(-.6,-.3,.2,.48)]},
 {'stretch':(.93,1),'phase':4.8,'cuts':[(2.2,-.08,.09),(.6,.27,.055)],'spurs':[(-.56,.42,.3,.52),(.6,-.1,.24,.4)]},
]

def sculpt_height_source(v):
    # The sample density is source detail, removed adaptively after sculpting.
    na,nr=256,120
    theta=np.arange(na)*math.tau/na
    rings=np.linspace(1/nr,1,nr)[:,None]
    phase=v['phase']
    boundary=.86+.055*np.sin(theta*3+phase)+.045*np.sin(theta*7-phase*.7)+.018*np.cos(theta*13+phase)
    radius=rings*boundary
    x=radius*np.cos(theta);y=radius*np.sin(theta)
    # Broad caprock, with angular fault-controlled retreats. The former small
    # crown over three large skirts read as a stepped pyramid at distant LOD.
    crown=.60+.055*np.sin(theta*3+phase*.6)+.025*np.sin(theta*9-phase)
    # Scarp retreat creates vertical buttresses; channels widen in softer strata.
    retreat=.022*(np.sin(theta*7+phase)+.55*np.sin(theta*13-phase))
    shoulder=crown+retreat
    # Three offset scarps retreat by different amounts through the sediment.
    # This interrupts long vertical organ-pipe ribs and leaves broad shelves.
    upper=1-smooth(shoulder-.035,shoulder+.037,radius)
    middle=1-smooth(.69+.047*np.sin(theta*5-phase),.77+.028*np.sin(theta*3+phase),radius)
    lower=1-smooth(.78+.023*np.sin(theta*6+phase),.86+.015*np.cos(theta*4),radius)
    skirt=np.maximum(0,1-radius/boundary)**1.25*.20
    crown_height=.53+.019*np.sin(x*8+y*3+phase)+.012*np.sin(y*16-x*7)
    # Crown stays a weathered plateau: the talus mound must not continue through
    # the cap and turn every variant into a pointed mountain.
    h=skirt*(1-upper)+upper*crown_height+middle*.16+lower*.075
    # Authored cross-cut fracture corridors and asymmetric satellite buttresses.
    for angle,offset,width in v['cuts']:
        dist=np.abs(x*math.cos(angle)+y*math.sin(angle)-offset)
        fracture=(1-smooth(width*.35,width,dist))
        h-=fracture*.15*(.3+.7*smooth(.16,.65,radius))
    for cx,cy,size,height in v['spurs']:
        d=np.sqrt(((x-cx)/size)**2+((y-cy)/size)**2)
        crag=(1-smooth(.48,1.15,d))*height
        h=np.maximum(h,crag+skirt*.55)
    # Sediment beds are sculpted geometry, not painted lines: broad horizontal
    # fractured benches separated by narrow scarps. Low-frequency cross-bedding
    # offsets them laterally so shelves do not become identical concentric rings.
    bed_offset=.007*np.sin(x*9-y*4+phase)+.004*np.sin(y*15+x*6)
    beds=(h+bed_offset)/.048
    bed_level=np.floor(beds);bed_part=beds-bed_level
    bed_height=(bed_level+smooth(.30,.72,bed_part))*.048-bed_offset
    h=h*(1-smooth(.025,.10,h))+bed_height*smooth(.025,.10,h)
    # Sample the measured surface relief rather than an uncorrelated noise skin.
    ix=((x*3.4+phase*.31)%1*(pixels.shape[1]-1)).astype(int)
    iy=((y*3.4+phase*.17)%1*(pixels.shape[0]-1)).astype(int)
    relief=(pixels[iy,ix]-.5)*.022
    h+=relief*smooth(.025,.16,h)
    # The scanned cliff relief must also displace sideways, along the face.
    # Height-only relief on a near-vertical scarp produces stretched flutes.
    su=((np.broadcast_to(theta,h.shape)/math.tau*5+phase*.23)%1*(pixels.shape[1]-1)).astype(int)
    sv=((h*4.1+phase*.31)%1*(pixels.shape[0]-1)).astype(int)
    wall=np.clip(np.abs(np.gradient(h,axis=0))*nr-.35,0,1)
    # Differential retreat between hard caprock and softer beds produces real
    # ledge shadow breaks. The measured face relief remains the small scale.
    bed_retreat=(.5+.5*np.sin(h*math.tau/.048+phase*.13))*.015
    face_joint=np.maximum(0,np.sin(theta*19+phase+np.sin(h*8)*.25))**12*.018
    side_relief=((pixels[sv,su]-.5)*.075-bed_retreat-face_joint)*wall
    x+=np.cos(theta)*side_relief;y+=np.sin(theta)*side_relief
    # The continuous feathered base is buried 1.5% below the render envelope.
    h=np.maximum(h,0);h-=smooth(.90,1,rings)*.04
    h[-1,:]=-.04
    x*=v['stretch'][0];y*=v['stretch'][1]
    verts=[(0.,0.,float(h[0].mean()))]+list(zip(x.flatten().tolist(),y.flatten().tolist(),h.flatten().tolist()))
    faces=[]
    for j in range(na):faces.append((0,1+j,1+(j+1)%na))
    for r in range(nr-1):
        for j in range(na):
            a=1+r*na+j;b=1+r*na+(j+1)%na;c=b+na;d=a+na
            faces.extend([(a,c,b),(a,d,c)])
    bottom=len(verts);verts.append((0,0,-.04))
    for j in range(na):faces.append((bottom,1+(nr-1)*na+(j+1)%na,1+(nr-1)*na+j))
    return verts,faces

def sculpt(v):
    """Explicit cliff bedding survives simplification on near-vertical faces.

    The earlier radial height surface undersampled the scarp: steep sections
    could cross an entire sediment bed between two vertices. Here every hard
    bed has its own upper and lower edge, connected into one closed volume.
    """
    na=256;phase=v['phase'];theta=np.arange(na)*math.tau/na
    # Large planar fracture faces, not sinusoidal organ-pipe perimeter fluting.
    sector=(theta+phase*.13+math.pi/6)%(math.tau/6)-math.pi/6
    boundary=(math.cos(math.pi/6)/np.cos(sector))*(1+.05*np.sin(theta*3+phase)+.023*np.sin(theta*7-phase))
    # Unequal hard-bed thicknesses and interrupted ledges avoid manufactured
    # courses. Broad faults remove different crown heights on each variant.
    beds=np.array([.065,.112,.183,.277,.318,.436,.502,.591,.674,.712])
    heights=sorted(set(np.linspace(-.04,.74,54).tolist()+[float(z+d) for z in beds for d in [-.004,0,.008,.013]]))
    heights=[z for z in heights if z<=.74]
    ring_positions=[]
    for z in heights:
        # Continuous wide talus at the foot, narrow benches between caprock
        # faces. Upper scarps are broad enough to read as mesas at distant LOD.
        profile=float(np.interp(z,[-.04,0,.06,.12,.15,.28,.31,.48,.51,.74],[.91,.91,.83,.76,.72,.71,.67,.66,.63,.615]))
        # Hard beds protrude only along surviving sections of the fault plane.
        # Other sectors have eroded away rather than forming a circular cornice.
        lip=np.zeros(na)
        for j,bed in enumerate(beds):
            surviving=.18+.82*smooth(-.35,.55,np.sin(theta*(3+j%3)+phase+j*1.63))
            lip+=math.exp(-((z-bed)/.007)**2)*(.013+.004*math.sin(j*2.7))*surviving
        block_faces=.026*np.sin(theta*4+phase+z*6)+.017*np.sin(theta*9-phase-z*11)
        r=boundary*(profile+lip)+block_faces
        # Tall fracture joints are offset at bed transitions, not full-height
        # grooves of identical width. Sculpt broad missing rock along two faults.
        for angle,offset,width in v['cuts']:
            axis=np.cos(theta-angle)
            joint=np.exp(-((axis-offset)*1.8/(width+.035))**2)
            r-=joint*(.07+.055*float(smooth(.18,.65,z)))
        for cx,cy,size,height in v['spurs']:
            angle=math.atan2(cy,cx)
            angular=np.arctan2(np.sin(theta-angle),np.cos(theta-angle))
            buttress=np.exp(-(angular/(size*.85))**2)*(1-float(smooth(height*.68,height,z)))
            r+=buttress*.12
        su=((theta/math.tau*4.5+phase*.23)%1*(pixels.shape[1]-1)).astype(int)
        sv=int((z*5+phase*.31)%1*(pixels.shape[0]-1))
        r+=(pixels[sv,su]-.5)*.022*float(smooth(.0,.06,z))
        # Short diagonal fractures make broken blocks across a bed, rather than
        # a continuous perfect ledge that circles the entire formation.
        joint=np.maximum(0,np.sin(theta*23+math.floor(z/.126)*1.37+phase))**24
        r-=joint*.014*float(smooth(.03,.10,z))
        cap_fault=.056*np.sin(theta*3+phase)+.023*np.sin(theta*7-phase)
        for angle,offset,width in v['cuts']:
            cap_fault-=np.exp(-((np.cos(theta-angle)-offset)/(width+.06))**2)*.078
        zz=z+.003*np.sin(theta*5+phase)*float(smooth(0,.10,z))+cap_fault*float(smooth(.42,.74,z))
        ring_positions.append(np.column_stack((r*np.cos(theta)*v['stretch'][0],r*np.sin(theta)*v['stretch'][1],zz)))
    # Crown is part of the same mesh, sharing its outer ring. Explicit broad
    # plateau with shallow fractures, no detached lid or open scan backside.
    edge=ring_positions[-1]
    for k in range(1,20):
        t=1-k/20;x=edge[:,0]*t;y=edge[:,1]*t
        h=.74+(edge[:,2]-.74)*t**.8+(.008*np.sin(x*9+y*5+phase)+.006*np.sin(y*14-x*7))*t
        for angle,offset,width in v['cuts']:
            distance=np.abs(x*math.cos(angle)+y*math.sin(angle)-offset)
            h-=(1-smooth(width*.35,width,distance))*.019
        ring_positions.append(np.column_stack((x,y,h)))
    verts=np.concatenate(ring_positions).tolist();nr=len(ring_positions);faces=[]
    # Ring order runs bottom -> top -> inward, with outward winding throughout.
    for r in range(nr-1):
        for j in range(na):
            a=r*na+j;b=r*na+(j+1)%na;c=b+na;d=a+na
            faces.extend([(a,b,c),(a,c,d)])
    bottom=len(verts);verts.append((0,0,-.04))
    top=len(verts);verts.append((0,0,.74))
    for j in range(na):
        faces.append((bottom,(j+1)%na,j))
        faces.append((top,(nr-1)*na+j,(nr-1)*na+(j+1)%na))
    return verts,faces

material=bpy.data.materials.new('frontline-sandstone-world-projection')
material.diffuse_color=(.43,.28,.15,1);material.use_nodes=True
material.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.96
with bpy.data.libraries.load(os.path.join(ROOT,'assets-src','frontline-talus','fractured-talus-kit.blend'),link=False) as (source,target):
    target.objects=[f'talus-{i}' for i in range(4)]
scan_sources=target.objects

def add_scanned_apron(obj,index):
    """Union measured closed fracture blocks into the foot of the mesa.

    Voxel remeshing removes internal/intersecting surfaces: the apron remains
    one contiguous watertight volume rather than a cloud of standing panels.
    """
    verts=[tuple(v.co) for v in obj.data.vertices];polys=[tuple(p.vertices) for p in obj.data.polygons]
    for j in range(22):
        source=scan_sources[(j+index)%4].data
        coords=np.empty(len(source.vertices)*3,dtype=np.float32);source.vertices.foreach_get('co',coords);coords=coords.reshape(-1,3)
        lo=coords.min(axis=0);hi=coords.max(axis=0);coords=(coords-(lo+hi)*.5)/(hi-lo)
        a=j*math.tau/11+index*.47+(j//11)*.29;rotation=a+.27*math.sin(j*2.9)
        sx=.40+.09*(j%3);sy=.36+.08*((j+1)%3);sz=.065+.013*((j*3+index)%4)
        coords*=np.array([sx,sy,sz]);c=math.cos(rotation);s=math.sin(rotation)
        coords[:,:2]=coords[:,:2]@np.array([[c,s],[-s,c]])
        upper=j>=11
        radius=(.63 if upper else .82)+.025*math.sin(j*3.1+index)
        elevation=.20+.055*((j+index)%3) if upper else .030+sz*.20
        coords+=np.array([math.cos(a)*radius,math.sin(a)*radius,elevation])
        offset=len(verts);verts.extend(coords.tolist());polys.extend(tuple(offset+k for k in p.vertices) for p in source.polygons)
    combined=bpy.data.meshes.new(obj.name+'-scan-apron-union');combined.from_pydata(verts,[],polys);combined.update();obj.data=combined
    remesh=obj.modifiers.new('Closed measured rubble apron union','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.010;remesh.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=remesh.name)

def clean_mesh(mesh):
    clean=bmesh.new();clean.from_mesh(mesh)
    bmesh.ops.remove_doubles(clean,verts=list(clean.verts),dist=.00002)
    bmesh.ops.dissolve_degenerate(clean,edges=list(clean.edges),dist=.000002)
    bmesh.ops.dissolve_limit(clean,angle_limit=.001,verts=list(clean.verts),edges=list(clean.edges),use_dissolve_boundaries=True)
    boundary=[e for e in clean.edges if e.is_boundary]
    if boundary:bmesh.ops.holes_fill(clean,edges=boundary,sides=0)
    bmesh.ops.triangulate(clean,faces=list(clean.faces));bmesh.ops.recalc_face_normals(clean,faces=list(clean.faces))
    clean.to_mesh(mesh);clean.free();mesh.validate(verbose=True);mesh.update()

for index,variant in enumerate(VARIANTS):
    vertices,faces=runpy.run_path(os.path.join(ROOT,'tools','frontline-mesa-sculpt.py'))['sculpt'](variant,pixels)
    mesh=bpy.data.meshes.new(f'mesa-{index}-sculpt');mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new(f'mesa-{index}-lod0',mesh);bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    add_scanned_apron(obj,index);mesh=obj.data
    # UV contract for other glTF viewers; native renderer uses measured triplanar
    # texture coordinates so fitting this volume never stretches the photograph.
    uv=mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        poly.use_smooth=True
        for loop in poly.loop_indices:
            co=mesh.vertices[mesh.loops[loop].vertex_index].co;uv.data[loop].uv=((co.x+1)/2,(co.y+1)/2)
    obj.data.materials.append(material)
    mesh.calc_loop_triangles()
    dec=obj.modifiers.new('Adaptive rock silhouette LOD0','DECIMATE');dec.ratio=min(1,11000/len(mesh.loop_triangles))
    bpy.ops.object.modifier_apply(modifier=dec.name)
    # Collapse simplification may pull the shared outer crown rim off its
    # fracture plane; restore that plane before normalizing the envelope.
    for vertex in obj.data.vertices:
        if vertex.co.z>.992:vertex.co.z=1.0
    clean_mesh(obj.data)
    obj.data.update();obj.data.set_sharp_from_angle(angle=.58)
    obj.data.name=obj.name
    # Freeze source-space scale / normalized origin (center of authored volume).
    coords=[v.co for v in obj.data.vertices]
    minimum=Vector(tuple(min(v[i] for v in coords) for i in range(3)))
    maximum=Vector(tuple(max(v[i] for v in coords) for i in range(3)))
    center=(minimum+maximum)*.5
    for vertex in obj.data.vertices:vertex.co-=center
    low=obj.copy();low.data=obj.data.copy();low.name=f'mesa-{index}-lod1';bpy.context.collection.objects.link(low)
    bpy.context.view_layer.objects.active=low
    dec=low.modifiers.new('Distant silhouette LOD1','DECIMATE');dec.ratio=.18
    bpy.ops.object.modifier_apply(modifier=dec.name)
    for vertex in low.data.vertices:
        if vertex.co.z>1.0-center.z-.008:vertex.co.z=1.0-center.z
    clean_mesh(low.data)
    low.data.update();low.data.set_sharp_from_angle(angle=.58)
    low.data.name=low.name
    obj.select_set(False)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SOURCE,'eroded-mesa-kit.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(SOURCE,'eroded-mesa-kit.glb'),export_format='GLB',export_yup=True,export_apply=True,export_extras=True)
print('Authored four continuous mesa volumes and their distant LODs')
