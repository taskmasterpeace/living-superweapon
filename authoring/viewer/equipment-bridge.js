// Equipment fit on the production rig. The package GLB is mounted on the engine's own hand
// socket by its grip socket; the support hand is solved with the engine's reachArm; the muzzle,
// magazine and holster sockets are read from the package and reported in world space. Poses come
// from a built motion package so a fit is judged moving and aiming, not only at rest.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {reachArm} from '/src/engine/hero-rig.js';
import {samplePoseFrame,applyAuthoredPose} from '/src/engine/authored-pose.js';
import {updateHeroSkin} from '/src/engine/hero-skin.js';
import {animateCape,syncHeadCover} from '/src/engine/hero-rig.js';

const frame=new Float64Array(45),tmp=new THREE.Vector3(),tmp2=new THREE.Vector3(),m4=new THREE.Matrix4(),box=new THREE.Box3(),legBox=new THREE.Box3();
const SOCKET_COLORS={grip:'#f5b21a',support:'#5fc07a',muzzle:'#ff5a4d',magazine:'#5fb7e0',holster:'#e0a15f'};
async function loadGlb(url){return new Promise((res,rej)=>new GLTFLoader().load(url,g=>res(g),undefined,rej));}
const findSocket=(root,name)=>root.getObjectByName('socket-'+name);
export async function loadEquipmentPreview(pkg,stage,api){
 const {makeFighter,BODIES,buildOverlays,measureFighter,snapshotBase,restoreBase}=api;
 const m=pkg.manifest;
 const gltf=await loadGlb(pkg.base+'model.glb');
 const proto=gltf.scene;proto.traverse(o=>{if(o.isMesh){o.castShadow=true;o.material.side=THREE.FrontSide;}});
 // Poses: every built humanoid-motion package in the catalog (clip ids are unique across them).
 const banks=new Map(),motionClips=[];
 for(const e of stage.catalog?.packages.filter(p=>p.kind==='humanoid-motion')||[]){
  const base=`/authored-assets/${e.dir}/`;
  const manifest=await (await fetch(base+'manifest.json')).json(),bank=await (await fetch(base+'pose-bank.json')).json();
  for(const c of manifest.clips){if(banks.has(c.id))continue;banks.set(c.id,bank.clips[c.id]);motionClips.push({id:c.id,take:c.take,duration:c.duration,loop:c.loop,events:c.events||[],from:e.id});}
 }
 // Body sockets (holster/sling) from built body packages, keyed by catalog body + frame scale.
 const bodyPackages=[];
 for(const e of stage.catalog?.packages.filter(p=>p.kind==='humanoid-body')||[]){
  const manifest=await (await fetch(`/authored-assets/${e.dir}/manifest.json`)).json();bodyPackages.push(manifest);
 }
 let f=null,base=null,overlays=null,weapon=null,holstered=null,markers=null,bodyId=BODIES[0].id,hiddenProcedural=[];
 const clips=[{id:'rest',take:'(rig rest)',duration:1,loop:true,events:[]},...motionClips];
 const bodyPackageFor=spec=>bodyPackages.find(b=>b.rig.catalogBody===spec.body&&Math.abs((b.frame?.scale??1)-(spec.frame?.scale??1.12))<1e-6)||null;
 const mount=id=>{
  dispose();
  bodyId=id;const spec=BODIES.find(b=>b.id===id)||BODIES[0];
  f=makeFighter(spec);stage.content.add(f.obj);base=snapshotBase(f);overlays=buildOverlays(stage,f,m);
  stage.controls.target.set(0,f.parts.rig.pivotHeight,0);
  const hand=m.equipment.hand==='left'?f.parts.rig.sockets.leftHand:f.parts.rig.sockets.rightHand;
  // The engine's own procedural weapon on this fist is hidden while the package is fitted;
  // ownership of the hand stays with the fist socket.
  for(const c of hand.children)if(c.userData.weaponKind){c.visible=false;hiddenProcedural.push(c);}
  weapon=proto.clone(true);weapon.name='fitted:'+m.id;
  const grip=findSocket(weapon,'grip');if(!grip)throw new Error('package has no grip socket');
  weapon.updateMatrixWorld(true);m4.copy(grip.matrixWorld).invert();m4.decompose(weapon.position,weapon.quaternion,weapon.scale);
  hand.add(weapon);
  const bodyPkg=bodyPackageFor(spec);
  const holsterSocket=findSocket(weapon,'holster');
  if(holsterSocket){
   holstered=proto.clone(true);holstered.name='holstered:'+m.id;
   holstered.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.55;}});
   const bodySocket=(bodyPkg?.sockets||[]).find(s=>s.name===(m.equipment.twoHanded?'sling.back':'holster.hip'));
   const parent=bodySocket?{pelvis:f.parts.pelvis,chest:f.parts.torso,rightHand:f.parts.rig.sockets.rightHand,leftHand:f.parts.rig.sockets.leftHand}[bodySocket.parent]:null;
   holstered.userData.bodySocket=bodySocket;holstered.userData.parentObj=parent;
   if(parent){
    const anchor=new THREE.Object3D();anchor.name='body-socket:'+bodySocket.name;anchor.position.fromArray(bodySocket.position);anchor.quaternion.fromArray(bodySocket.rotation);parent.add(anchor);
    holstered.userData.anchor=anchor;
    holstered.updateMatrixWorld(true);const hs=findSocket(holstered,'holster');hs.updateMatrixWorld(true);
    m4.copy(hs.matrix).invert();m4.decompose(holstered.position,holstered.quaternion,holstered.scale);
    anchor.add(holstered);
   }
  }
  markers=new THREE.Group();
  for(const s of m.sockets){const mk=new THREE.Mesh(new THREE.OctahedronGeometry(.22),new THREE.MeshBasicMaterial({color:SOCKET_COLORS[s.name]||'#ffffff',depthTest:false}));mk.renderOrder=14;mk.name='marker:'+s.name;mk.userData.socket=findSocket(weapon,s.name);markers.add(mk);}
  stage.helpers.add(markers);
 };
 const dispose=()=>{
  if(!f)return;
  for(const c of hiddenProcedural)c.visible=true;hiddenProcedural=[];
  stage.content.remove(f.obj);overlays?.dispose();if(markers)stage.helpers.remove(markers);f.dispose();f=null;weapon=null;holstered=null;
 };
 const solve=(clip,time)=>{
  restoreBase(f,base);
  if(clip&&clip.id!=='rest'&&banks.has(clip.id)){
   samplePoseFrame(banks.get(clip.id),clip.duration?time/clip.duration:0,frame,clip.loop);
   applyAuthoredPose(f,frame,1,{hips:true});
  }
  syncHeadCover(f.parts);animateCape(f.parts,time,0,null);
  f.obj.updateMatrixWorld(true);
  // Support hand: reach the weapon's support socket with the engine's own two-bone solver.
  // Solved whenever the package declares a support socket: a sidearm's two-hand grip is a fit
  // to check as much as a carbine's handguard hold. Whether it must PASS is per class.
  const support=findSocket(weapon,'support');let supportError=null;
  if(support){
   const armL=m.equipment.hand==='left'?f.parts.armR:f.parts.armL,side=m.equipment.hand==='left'?1:-1;
   support.getWorldPosition(tmp);armL.parent.worldToLocal(tmp2.copy(tmp));
   reachArm(armL,tmp2,side,1);
   f.obj.updateMatrixWorld(true);
   supportError=armL.children[2].getWorldPosition(tmp2).distanceTo(tmp);
  }
  updateHeroSkin(f.parts);
  overlays.refresh();
  for(const mk of markers.children)mk.userData.socket?.getWorldPosition(mk.position);
  return supportError;
 };
 let lastSupport=null;
 const playback={
  clips,bodies:BODIES.map(b=>({id:b.id,label:b.label})),
  get fighter(){return f;},
  apply(clip,time){lastSupport=solve(clip,time);},
  setBody(id){mount(id);if(stage.clip)playback.apply(stage.clip,stage.time);},
  refreshOverlays(){overlays?.refresh();},
  measure(){
   const hand=m.equipment.hand==='left'?f.parts.rig.sockets.leftHand:f.parts.rig.sockets.rightHand;
   const grip=findSocket(weapon,'grip').getWorldPosition(new THREE.Vector3()),muzzle=findSocket(weapon,'muzzle')?.getWorldPosition(new THREE.Vector3());
   const handDown=new THREE.Vector3(0,-1,0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));
   const muzzleDir=muzzle?muzzle.clone().sub(grip).normalize():null;
   let holsterPenetrates=null,holsterWorld=null,holsterDepth=0;
   if(holstered?.userData.anchor){
    holsterWorld=holstered.userData.anchor.getWorldPosition(new THREE.Vector3()).toArray();
    // Sample points along the holstered weapon's own extent and test them against the body's
    // volumes: torso as an ellipsoid from its driven bounds, thighs as hip→knee capsules.
    // Axis-aligned boxes cannot judge a diagonal weapon lying behind the back.
    const local=new THREE.Box3();holstered.updateMatrixWorld(true);
    holstered.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();local.union(o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().copy(holstered.matrixWorld).invert().multiply(o.matrixWorld)));}});
    const samples=[];const size=local.getSize(new THREE.Vector3());const axis=size.x>=size.y&&size.x>=size.z?'x':size.y>=size.z?'y':'z';
    for(let i=0;i<=8;i++){const p=local.min.clone();p[axis]+=size[axis]*i/8;for(const k of ['x','y','z'])if(k!==axis)p[k]=(local.min[k]+local.max[k])/2;samples.push(holstered.localToWorld(p));}
    // Torso volume from the torso's OWN loft geometry in its local frame (the cape and gear hang
    // under the same group and would inflate a world-space box to the whole back).
    const tg=f.parts.torso.geometry;if(!tg.boundingBox)tg.computeBoundingBox();
    // worldToLocal already carries the torso's frame scale; compare in geometry space directly.
    const tc=tg.boundingBox.getCenter(new THREE.Vector3()),th=tg.boundingBox.getSize(new THREE.Vector3()).multiplyScalar(.5);
    const inTorso=p=>{const l=f.parts.torso.worldToLocal(p.clone());return ((l.x-tc.x)/th.x)**2+((l.y-tc.y)/th.y)**2+((l.z-tc.z)/th.z)**2<1;};
    // Thigh radius from the thigh mesh itself under its frame scale, never a constant.
    const thighR=leg=>{const t=leg.userData.thigh;t.geometry.computeBoundingBox();const size=t.geometry.boundingBox.getSize(new THREE.Vector3()),ws=t.getWorldScale(new THREE.Vector3());return Math.max(size.x*ws.x,size.z*ws.z)*.5;};
    const capsules=[f.parts.legL,f.parts.legR].map(leg=>({a:leg.getWorldPosition(new THREE.Vector3()),b:leg.userData.knee.getWorldPosition(new THREE.Vector3()),r:thighR(leg)}));
    const inCapsule=(p,c)=>{const ab=c.b.clone().sub(c.a),t=THREE.MathUtils.clamp(p.clone().sub(c.a).dot(ab)/ab.lengthSq(),0,1);return p.distanceTo(c.a.clone().addScaledVector(ab,t))<c.r;};
    let inside=0;for(const p of samples)if(inTorso(p)||capsules.some(c=>inCapsule(p,c)))inside++;
    holsterDepth=inside/samples.length;holsterPenetrates=inside>1; // one grazing sample at the strap is tolerated
   }
   return {...measureFighter(f),body:bodyId,weapon:m.id,mountedOn:m.equipment.hand,mounted:weapon.parent===hand,gripAtHand:grip.distanceTo(hand.getWorldPosition(new THREE.Vector3())),
    supportError:lastSupport,muzzleDot:muzzleDir?muzzleDir.dot(handDown):null,muzzleWorld:muzzle?muzzle.toArray():null,magazineWorld:findSocket(weapon,'magazine')?.getWorldPosition(new THREE.Vector3()).toArray()||null,
    holsterWorld,holsterPenetrates,holsterDepth,holsterFrom:holstered?.userData.bodySocket?.name||null,hiddenProceduralWeapons:hiddenProcedural.length};
  },
 };
 mount(bodyId);
 stage.dispose=dispose;
 return playback;
}
