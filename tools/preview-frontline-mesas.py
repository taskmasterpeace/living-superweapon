"""CPU-only clay comparison; never presented as native game evidence."""
import bpy,os,math
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
before='frontline-mesas-pre-fault-block' if os.path.isdir(os.path.join(ROOT,'assets-src','frontline-mesas-pre-fault-block')) else 'frontline-mesas'
for column,folder in enumerate([before,'frontline-mesas-candidate']):
    with bpy.data.libraries.load(os.path.join(ROOT,'assets-src',folder,'eroded-mesa-kit.blend'),link=False) as (source,target):
        target.objects=['mesa-0-lod0','mesa-1-lod0']
    for row,obj in enumerate(target.objects):
        bpy.context.collection.objects.link(obj)
        lo=Vector(tuple(min(v.co[i] for v in obj.data.vertices) for i in range(3)))
        hi=Vector(tuple(max(v.co[i] for v in obj.data.vertices) for i in range(3)))
        span=hi-lo
        obj.scale=(220/span.x,195/span.y,260/span.z)
        obj.location=((column-.5)*310,row*365,-lo.z*obj.scale.z)
        material=bpy.data.materials.new('clay');material.use_nodes=True
        bsdf=material.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(.40,.29,.19,1);bsdf.inputs['Roughness'].default_value=.96
        obj.data.materials.clear();obj.data.materials.append(material)
bpy.ops.mesh.primitive_plane_add(size=2400,location=(0,180,-2))
plane=bpy.context.object;material=bpy.data.materials.new('floor');material.diffuse_color=(.42,.39,.34,1);plane.data.materials.append(material)
bpy.ops.object.light_add(type='SUN',location=(200,-450,900));sun=bpy.context.object;sun.data.energy=3;sun.rotation_euler=(.48,-.60,-.40);sun.data.angle=.08
bpy.ops.object.camera_add(location=(700,-1050,850));camera=bpy.context.object
camera.rotation_euler=(Vector((0,165,95))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=1000
camera.data.clip_end=5000
scene=bpy.context.scene;scene.camera=camera;scene.world.color=(.22,.24,.28)
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1400;scene.render.resolution_y=1050;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
out=os.path.join(ROOT,'artifacts','frontline-mesa-candidate');os.makedirs(out,exist_ok=True)
scene.render.filepath=os.path.join(out,'clay-before-left-candidate-right.png');bpy.ops.render.render(write_still=True)
