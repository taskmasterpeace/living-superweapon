"""CPU geometry-only before/after of the native bank source data."""
import bpy,numpy as np,os,json
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));SOURCE=os.path.join(ROOT,'assets-src','frontline-heightfield-candidate')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
with open(os.path.join(SOURCE,'source.json')) as f:meta=json.load(f)
n=meta['segments']+1;axis=np.linspace(-meta['halfSpan'],meta['halfSpan'],n)
# Crop one forward shoulder at the real native grid spacing and height ratio.
cols=np.flatnonzero((axis>=90)&(axis<=590));rows=np.flatnonzero((axis>=-210)&(axis<=620))
for column,label in enumerate(['before','after']):
    field=np.fromfile(os.path.join(SOURCE,'native-'+label+'.f32'),dtype='<f4').reshape(n,n)
    vertices=[(axis[c]+column*650,axis[r],float(field[r,c])) for r in rows for c in cols];faces=[];w=len(cols)
    for r in range(len(rows)-1):
        for c in range(w-1):
            a=r*w+c;faces.extend([(a,a+1,a+w),(a+1,a+w+1,a+w)])
    mesh=bpy.data.meshes.new(label);mesh.from_pydata(vertices,[],faces);mesh.update();obj=bpy.data.objects.new(label,mesh);bpy.context.collection.objects.link(obj)
    material=bpy.data.materials.new(label+'-clay');material.use_nodes=True;bsdf=material.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(.43,.31,.20,1);bsdf.inputs['Roughness'].default_value=1;mesh.materials.append(material)
    for p in mesh.polygons:p.use_smooth=True
    if label=='after':
        with bpy.data.libraries.load(os.path.join(SOURCE,'scanned-chip.blend'),link=False) as (available,loaded):loaded.objects=['frontline-closed-scanned-chip']
        chip=loaded.objects[0];chip.data.materials.clear();chip.data.materials.append(material)
        with open(os.path.join(SOURCE,'chip-placements.json')) as f:places=json.load(f)
        step=axis[1]-axis[0]
        for px,pz,size,yaw,stretch in places:
            if not(axis[cols[0]]<px<axis[cols[-1]] and axis[rows[0]]<pz<axis[rows[-1]]):continue
            fx=(px+meta['halfSpan'])/step;fz=(pz+meta['halfSpan'])/step;c=int(fx);r=int(fz);u=fx-c;v=fz-r
            h00=field[r,c];h10=field[r,c+1];h01=field[r+1,c];h11=field[r+1,c+1]
            h=h00+(h10-h00)*u+(h01-h00)*v if u+v<=1 else h11+(h10-h11)*(1-v)+(h01-h11)*(1-u)
            obj=chip.copy();obj.data=chip.data;bpy.context.collection.objects.link(obj);obj.location=(px+column*650,pz,h+size*.10);obj.rotation_euler.z=yaw;obj.scale=(size,size*stretch,size)
bpy.ops.object.light_add(type='SUN',location=(-300,-600,900));sun=bpy.context.object;sun.data.energy=3;sun.rotation_euler=(.35,-.6,-.5);sun.data.angle=.08
bpy.ops.object.camera_add(location=(-600,-1250,1100));camera=bpy.context.object;camera.rotation_euler=(Vector((650,180,35))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=1450;camera.data.clip_end=5000
scene=bpy.context.scene;scene.camera=camera;scene.world.color=(.2,.22,.25);scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1500;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
out=os.path.join(ROOT,'artifacts','frontline-ground-candidate');os.makedirs(out,exist_ok=True);scene.render.filepath=os.path.join(out,'bank-before-left-after-right.png');bpy.ops.render.render(write_still=True)
# A closer source inspection makes the deliberately short scanned chips visible;
# the wide image above is the honest valley-scale composition comparison.
camera.location=(820,-85,152);camera.rotation_euler=(Vector((930,100,63))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=200
scene.render.resolution_x=1200;scene.render.resolution_y=800;scene.render.filepath=os.path.join(out,'bank-chip-detail.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SOURCE,'native-bank-preview.blend'))
