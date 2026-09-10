"""CPU source-art review of original outpost kit, not gameplay evidence."""
import bpy, math
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SRC=ROOT/'assets-src/frontline-outpost'
bpy.ops.wm.open_mainfile(filepath=str(SRC/'outpost-kit.blend'))
for name,xy in {'hangar':(-52,22),'command':(37,25),'watchtower':(62,-38),'barricade':(-4,-38)}.items():bpy.data.objects[name].location=(xy[0],xy[1],0)
bpy.ops.mesh.primitive_plane_add(size=420);floor=bpy.context.object;floor.name='Preview ground only';m=bpy.data.materials.new('Preview sand');m.diffuse_color=(.36,.32,.24,1);floor.data.materials.append(m)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=12;scene.cycles.use_denoising=True
scene.world.color=(.42,.47,.55)
bpy.ops.object.light_add(type='SUN',location=(0,-60,100));sun=bpy.context.object;sun.data.energy=3.2;sun.data.angle=.15;sun.rotation_euler=(math.radians(25),math.radians(-25),math.radians(-32))
bpy.ops.object.light_add(type='AREA',location=(40,-80,85));area=bpy.context.object;area.data.energy=4500;area.data.shape='DISK';area.data.size=100
area.rotation_euler=(Vector((0,0,20))-area.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(165,-210,160));camera=bpy.context.object;camera.rotation_euler=(Vector((0,4,19))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=205;scene.camera=camera
scene.render.resolution_x=1400;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=str(SRC/'source-preview.png');scene.view_settings.view_transform='AgX'
bpy.ops.render.render(write_still=True)
