"""Import original animal animations, preserve editable source and export GLB.
Blender --background --python tools/build-quadruped-library.py -- WORKTREE
"""
import bpy,sys,os,json,hashlib,base64,struct
root=sys.argv[sys.argv.index('--')+1]
out=os.path.join(root,'public/models/quadrupeds');os.makedirs(out,exist_ok=True)
records=[]
for name in ['Wolf','Husky']:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for a in list(bpy.data.actions):bpy.data.actions.remove(a)
 source=os.path.join(root,'assets-src/modular-character/animals',name+'.gltf')
 bpy.ops.import_scene.gltf(filepath=source)
 rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
 rig.animation_data.action=None
 if rig.animation_data:
  for t in list(rig.animation_data.nla_tracks):rig.animation_data.nla_tracks.remove(t)
 rig.data.pose_position='REST';bpy.context.view_layer.update()
 meshes=[o for o in bpy.data.objects if o.type=='MESH']
 from mathutils import Vector
 points=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
 bounds={'min':[min(p[i] for p in points) for i in range(3)],'max':[max(p[i] for p in points) for i in range(3)]}
 rig.data.pose_position='POSE';bpy.context.scene.render.fps=24
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(root,'assets-src/modular-character/animals',name+'.blend'))
 # Preserve source track times/values byte-for-byte. Baking through Blender
 # quantizes non-integer action end frames and changes the original duration.
 data=json.load(open(source));assert len(data['buffers'])==1
 binary=base64.b64decode(data['buffers'][0].pop('uri').split(',',1)[1])
 payload=json.dumps(data,separators=(',',':')).encode('utf8');payload+=b' '*((-len(payload))%4);binary+=b'\0'*((-len(binary))%4)
 with open(os.path.join(out,name.lower()+'.glb'),'wb') as f:
  f.write(struct.pack('<III',0x46546c67,2,12+8+len(payload)+8+len(binary)))
  f.write(struct.pack('<II',len(payload),0x4e4f534a));f.write(payload)
  f.write(struct.pack('<II',len(binary),0x004e4942));f.write(binary)
 records.append({'id':name.lower(),'file':name.lower()+'.glb','family':'quadruped','skeleton':'quaternius-animal-v1','author':'Quaternius','license':'CC0-1.0','source':'https://quaternius.com/packs/ultimateanimatedanimals.html','sourceSha256':hashlib.sha256(open(source,'rb').read()).hexdigest(),'clips':sorted(a.name for a in bpy.data.actions),'sourceBoundsZUp':bounds,'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes),'gaps':['paired pounce victim','knockdown recovery','dedicated trot/run clip']})
with open(os.path.join(out,'manifest.json'),'w') as f:json.dump({'schema':1,'animals':records},f,indent=2)
