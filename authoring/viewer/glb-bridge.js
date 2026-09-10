// Props and creatures: the package GLB itself on the stage. Creature clips play through a
// three.js AnimationMixer on the package's own skeleton (never the humanoid rig); sockets and
// declared hit zones are drawn from the manifest. Bounds are measured from the loaded scene.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

async function loadGlb(url){return new Promise((res,rej)=>new GLTFLoader().load(url,g=>res(g),undefined,rej));}
export async function loadGlbPreview(pkg,stage){
 const m=pkg.manifest;
 const gltf=await loadGlb(pkg.base+'model.glb');
 const root=gltf.scene;root.name='package:'+m.id;
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 stage.content.add(root);
 const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 stage.controls.target.copy(center);
 const d=Math.max(size.x,size.y,size.z)*2.2+4;stage.camera.position.set(center.x+d*.7,center.y+d*.55,center.z+d*.8);
 const helpers=new THREE.Group();stage.helpers.add(helpers);
 const skeleton=new THREE.Group();helpers.add(skeleton);
 let skel=null;root.traverse(o=>{if(o.isSkinnedMesh&&!skel)skel=new THREE.SkeletonHelper(o.skeleton.bones[0]);});
 if(skel){skel.material.depthTest=false;skel.material.color=new THREE.Color('#f5b21a');skeleton.add(skel);}
 const sockets=new THREE.Group();helpers.add(sockets);
 for(const s of m.sockets||[]){const node=root.getObjectByName('socket-'+s.name);if(!node)continue;const mk=new THREE.Mesh(new THREE.OctahedronGeometry(Math.max(.12,size.length()*.02)),new THREE.MeshBasicMaterial({color:'#5fb7e0',depthTest:false}));mk.renderOrder=12;mk.userData.node=node;sockets.add(mk);}
 const zones=new THREE.Group();helpers.add(zones);
 for(const z of m.hitZones||[]){const host=root.getObjectByName(z.attach);if(!host)continue;const mesh=z.shape==='box'?new THREE.Mesh(new THREE.BoxGeometry(...z.halfExtents.map(h=>h*2)),new THREE.MeshBasicMaterial({color:'#ff5a4d',wireframe:true,depthTest:false})):new THREE.Mesh(new THREE.SphereGeometry(z.radius,12,10),new THREE.MeshBasicMaterial({color:'#ff5a4d',wireframe:true,depthTest:false}));mesh.userData.zone=z;mesh.userData.host=host;mesh.renderOrder=13;zones.add(mesh);}
 const mixer=gltf.animations.length?new THREE.AnimationMixer(root):null;
 const actions=new Map();for(const clip of gltf.animations)actions.set(clip.name,mixer.clipAction(clip));
 const clips=(m.clips||[]).map(c=>({id:c.id,take:c.take,duration:c.duration,loop:c.loop,events:c.events||[]}));
 const refresh=()=>{
  root.updateMatrixWorld(true);
  for(const mk of sockets.children)mk.userData.node.getWorldPosition(mk.position);
  for(const z of zones.children){z.userData.host.getWorldPosition(z.position);z.userData.host.getWorldQuaternion(z.quaternion);z.position.add(new THREE.Vector3().fromArray(z.userData.zone.center).applyQuaternion(z.quaternion));}
  skeleton.visible=!!stage.overlays.skeleton;sockets.visible=!!stage.overlays.sockets;zones.visible=!!stage.overlays.zones;
 };
 refresh();
 const playback={
  clips,bodies:[],
  apply(clip,time){
   if(mixer){const action=actions.get(clip.take)||actions.get(clip.id);if(action){mixer.stopAllAction();action.reset().setLoop(clip.loop?THREE.LoopRepeat:THREE.LoopOnce,Infinity).play();mixer.setTime(time);}}
   refresh();
  },
  refreshOverlays:refresh,
  measure(){
   const b=new THREE.Box3().setFromObject(root);let tris=0,skinned=0;root.traverse(o=>{if(o.isMesh){const g=o.geometry;tris+=Math.floor((g.index?g.index.count:g.getAttribute('position').count)/3);if(o.isSkinnedMesh)skinned++;}});
   return {id:m.id,kind:m.kind,triangles:tris,skinnedMeshes:skinned,animations:gltf.animations.map(a=>a.name),bounds:{min:b.min.toArray(),max:b.max.toArray()},sockets:sockets.children.length,zones:zones.children.length};
  },
 };
 stage.dispose=()=>{stage.content.remove(root);stage.helpers.remove(helpers);root.traverse(o=>{o.geometry?.dispose?.();});};
 return playback;
}
