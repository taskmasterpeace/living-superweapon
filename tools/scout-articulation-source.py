"""Source-only articulation inspection; original geometry is never regenerated.
Blender --background --threads 4 --python this-file [-- --render]
The byte-preserving GLB is made by scout-articulation-build.mjs; this saves the
matching editable Blender hierarchy and CPU pose witnesses from original source.
"""
import bpy,json,math,sys
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
from mathutils.geometry import intersect_ray_tri
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets-src/frontline-scout-articulation';OUT.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets-src/frontline-vehicles/armored-scout.blend'))

def wrap(obj,name):
 world=obj.matrix_world.copy();empty=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(empty);empty.parent=obj.parent;empty.matrix_world=world
 bpy.context.view_layer.update();obj.parent=empty;obj.matrix_parent_inverse=Matrix.Identity(4);obj.matrix_world=world;return empty

yaw=wrap(bpy.data.objects['turret'],'turret_yaw');pitch=wrap(bpy.data.objects['barrel'],'gun_pitch')
muzzle=bpy.data.objects.new('muzzle',None);bpy.context.collection.objects.link(muzzle);muzzle.parent=pitch;muzzle.location=(0,-1.34,.01);muzzle.empty_display_type='ARROWS';muzzle.empty_display_size=.12
yaw['native_axis']='+Y';pitch['native_axis']='-X for positive elevation';muzzle['native_forward']='+Z; Blender -Y';muzzle['purpose']='Physical muzzle brake endpoint, not a flash mesh'
scene=bpy.context.scene;scene.render.threads_mode='FIXED';scene.render.threads=4;scene.cycles.device='CPU';scene.cycles.samples=24
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'armored-scout-articulated.blend'))

def triangles(obj):
 points=[obj.matrix_world@v.co for v in obj.data.vertices];faces=[tuple(p.vertices)for p in obj.data.polygons];assert all(len(f)==3 for f in faces)
 return points,faces,BVHTree.FromPolygons(points,faces,all_triangles=True)

def crossing_pairs(a,b):
 pa,fa,ba=a;pb,fb,bb=b;crossings=[]
 for i,j in ba.overlap(bb):
  ta=[pa[v]for v in fa[i]];tb=[pb[v]for v in fb[j]];cross=False
  for moving,target in [(ta,tb),(tb,ta)]:
   for start,end in zip(moving,moving[1:]+moving[:1]):
    delta=end-start;length=delta.length
    if length<1e-8:continue
    direction=delta/length;hit=intersect_ray_tri(*target,direction,start,True)
    if hit is not None:
     distance=(hit-start).dot(direction)
     if 1e-6<distance<length-1e-6:cross=True;break
   if cross:break
  if cross:crossings.append([i,j])
 return crossings

hull=bpy.data.objects['hull'];gun=bpy.data.objects['barrel'];station=bpy.data.objects['turret'];records=[]
for azimuth in [0,45,90,135,180,225,270,315]:
 for elevation in [-30,-20,-10,-5,0,5,10,15,20,25,30,45,60]:
  yaw.rotation_euler.z=math.radians(azimuth);pitch.rotation_euler.x=-math.radians(elevation);bpy.context.view_layer.update()
  g=triangles(gun);stationPairs=crossing_pairs(g,triangles(station));hullPairs=crossing_pairs(g,triangles(hull));p=muzzle.matrix_world.translation
  records.append({'yawDegrees':azimuth,'elevationDegrees':elevation,'gunStationCrossingPairs':len(stationPairs),'gunHullCrossingPairs':len(hullPairs),'muzzleNative':[p.x,p.z,-p.y]})
yaw.rotation_euler.z=0;pitch.rotation_euler.x=0;bpy.context.view_layer.update()
(OUT/'clearance-report.json').write_text(json.dumps({'method':'Actual authored mesh triangle surface crossings after BVH broadphase. Coplanar/touching edges and entirely contained volumes are not certified. Receiver/cradle baseline overlap reported, not silently removed. Finite angular sweep; not continuous collision proof.','cases':records},indent=2))
print('SCOUT_CLEARANCE',json.dumps([r for r in records if r['yawDegrees']==0]),flush=True)

if '--render' in sys.argv:
 # Keep original authored studio and materials; only the articulation changes.
 scene.render.resolution_x=1000;scene.render.resolution_y=708;scene.render.resolution_percentage=100
 for label,azimuth,elevation in [('neutral',0,0),('yaw45-elevation20',45,20),('yaw90-elevation45',90,45)]:
  yaw.rotation_euler.z=math.radians(azimuth);pitch.rotation_euler.x=-math.radians(elevation);bpy.context.view_layer.update();scene.render.filepath=str(OUT/f'scout-{label}.png');bpy.ops.render.render(write_still=True)
 yaw.rotation_euler.z=0;pitch.rotation_euler.x=0;bpy.context.view_layer.update()
if '--orthos' in sys.argv:
 scene.render.resolution_x=1000;scene.render.resolution_y=708;scene.render.resolution_percentage=100
 for label,location,target,scale,elevation in [
  ('neutral-front',(0,-10,3.1),(0,0,1.6),6.9,0),
  ('neutral-profile',(10,0,3.1),(0,0,1.6),6.9,0),
  ('neutral-rear',(0,10,3.1),(0,0,1.6),6.9,0),
  ('receiver-profile-neutral',(4,.20,3.15),(0,-.25,2.66),1.75,0),
  ('receiver-profile-elevation30',(4,.20,3.15),(0,-.25,2.66),1.75,30)]:
  yaw.rotation_euler.z=0;pitch.rotation_euler.x=-math.radians(elevation);camera=scene.camera;camera.location=location;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=scale;bpy.context.view_layer.update();scene.render.filepath=str(OUT/f'scout-{label}.png');bpy.ops.render.render(write_still=True)
 yaw.rotation_euler.z=0;pitch.rotation_euler.x=0;bpy.context.view_layer.update()
print('SOURCE_ONLY_COMPLETE',flush=True)
