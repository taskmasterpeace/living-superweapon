// Drives authored packages through the PRODUCTION rig, read-only. A humanoid-motion package is
// played with the engine's own samplePoseFrame/applyAuthoredPose on a real Fighter built by the
// real Studio profile path; the skinned body follows through updateHeroSkin. Nothing here is a
// second animation player: the overlay restores the rig's base pose before every application,
// exactly as src/engine/ground-motion.js does, and never writes the physics root.
import * as THREE from 'three';
import {Fighter} from '/src/engine/entity.js';
import {ROSTER} from '/src/data/characters.js';
import {profileFromDef,applyProfile} from '/src/tool/studio-profile.js';
import {authoredParts,samplePoseFrame,applyAuthoredPose} from '/src/engine/authored-pose.js';
import {updateHeroSkin} from '/src/engine/hero-skin.js';
import {animateCape,syncHeadCover} from '/src/engine/hero-rig.js';
import {loadEquipmentPreview} from './equipment-bridge.js';
import {loadGlbPreview} from './glb-bridge.js';

// A body package on the stage: the catalog body under the package's frame, at rest, with its
// derived sockets drawn where the runtime would attach them.
async function loadBody(pkg,stage){
 const m=pkg.manifest;
 const spec={hero:m.rig.hero||'sol',body:m.rig.catalogBody,frame:m.frame};
 const body=await (await fetch(pkg.base+'body.json',{cache:'no-store'})).json();
 const f=makeFighter({hero:body.hero,body:body.catalogBody,frame:body.frame});stage.content.add(f.obj);
 stage.controls.target.set(0,f.parts.rig.pivotHeight,0);
 const overlays=buildOverlays(stage,f,m);
 const anchors=new THREE.Group();stage.helpers.add(anchors);
 const parents={pelvis:f.parts.pelvis,chest:f.parts.torso,rightHand:f.parts.rig.sockets.rightHand,leftHand:f.parts.rig.sockets.leftHand};
 for(const s of m.sockets){const parent=parents[s.parent];if(!parent)continue;const a=new THREE.Object3D();a.position.fromArray(s.position);a.quaternion.fromArray(s.rotation);parent.add(a);const mk=new THREE.Mesh(new THREE.OctahedronGeometry(.26),new THREE.MeshBasicMaterial({color:'#e0a15f',depthTest:false}));mk.renderOrder=14;mk.userData.anchor=a;anchors.add(mk);}
 const refresh=()=>{f.obj.updateMatrixWorld(true);updateHeroSkin(f.parts);overlays.refresh();for(const mk of anchors.children)mk.userData.anchor.getWorldPosition(mk.position);};
 refresh();
 stage.dispose=()=>{stage.content.remove(f.obj);overlays.dispose();stage.helpers.remove(anchors);f.dispose();};
 return {clips:[{id:'rest',take:'(rig rest)',duration:1,loop:true,events:[]}],bodies:[],get fighter(){return f;},apply(){refresh();},refreshOverlays:refresh,measure(){return {...measureFighter(f),sockets:m.sockets.map(s=>s.name)};}};
}

const frame=new Float64Array(45),box=new THREE.Box3(),tmp=new THREE.Vector3();
export const BODIES=[
 {id:'superhero-male',label:'SOL · Quaternius superhero male',hero:'sol',body:'superhero-male'},
 {id:'superhero-female',label:'SOL · Quaternius superhero female',hero:'sol',body:'superhero-female'},
 {id:'procedural',label:'SOL · procedural modules',hero:'sol',body:'procedural'},
 {id:'merc-field',label:'MERC · field body (rifle + pistol)',hero:'merc',body:'superhero-male'},
 {id:'lean',label:'SOL · lean frame ×0.8 (superhero female)',hero:'sol',body:'superhero-female',frame:{scale:.8,bulk:.75,broad:.85}},
 {id:'heavy',label:'SOL · heavy frame ×1.3 (superhero male)',hero:'sol',body:'superhero-male',frame:{scale:1.3,bulk:1.45,broad:1.35}},
];
export function makeFighter(spec){
 const def=ROSTER.find(d=>d.id===spec.hero);if(!def)throw new Error(`hero ${spec.hero} not in roster`);
 const profile=profileFromDef(def);profile.model.body=spec.body;if(spec.frame)Object.assign(profile.frame,spec.frame);
 const effective=applyProfile(def,profile);
 const f=new Fighter(effective,{rimK:.14});
 f.pos.set(0,0,0);f.obj.position.set(0,0,0);f.facing=0;f.parts.groundRig.visible=false;f.aim3.set(0,0,1);
 f.obj.updateMatrixWorld(true);
 return f;
}
function snapshotBase(f){
 const p=f.parts;
 return {parts:authoredParts(p).map(part=>({part,position:part.position.clone(),quaternion:part.quaternion.clone()})),body:p.body.position.clone()};
}
function restoreBase(f,base){for(const b of base.parts){b.part.position.copy(b.position);b.part.quaternion.copy(b.quaternion);}f.parts.body.position.copy(base.body);}
export function jointPoints(f){
 const p=f.parts,w=o=>o.getWorldPosition(new THREE.Vector3());
 const j={pelvis:w(p.pelvis),chest:w(p.torso),head:w(p.head)};
 for(const [side,arm,leg] of [['L',p.armL,p.legL],['R',p.armR,p.legR]]){
  j['shoulder'+side]=w(arm);j['elbow'+side]=w(arm.children[1]);j['hand'+side]=w(arm.children[2]);
  j['hip'+side]=w(leg);j['knee'+side]=w(leg.userData.knee);j['foot'+side]=w(leg.userData.boot);
 }
 return j;
}
const BONES=[['pelvis','chest'],['chest','head'],['chest','shoulderL'],['shoulderL','elbowL'],['elbowL','handL'],['chest','shoulderR'],['shoulderR','elbowR'],['elbowR','handR'],['pelvis','hipL'],['hipL','kneeL'],['kneeL','footL'],['pelvis','hipR'],['hipR','kneeR'],['kneeR','footR']];
export function buildOverlays(stage,f,manifest){
 const g=new THREE.Group();g.name='overlays';
 const skel=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(BONES.length*6),3)),new THREE.LineBasicMaterial({color:'#f5b21a',depthTest:false}));
 skel.renderOrder=10;skel.frustumCulled=false;g.add(skel);
 const jointMat=new THREE.MeshBasicMaterial({color:'#ffe08a',depthTest:false}),jointGeo=new THREE.SphereGeometry(.16,10,8),joints=new THREE.Group();
 for(let i=0;i<15;i++){const m=new THREE.Mesh(jointGeo,jointMat);m.renderOrder=11;joints.add(m);}g.add(joints);
 const sockets=new THREE.Group();const socketGeo=new THREE.OctahedronGeometry(.28),socketMat=new THREE.MeshBasicMaterial({color:'#5fb7e0',depthTest:false});
 for(const [name,obj] of Object.entries(f.parts.rig?.sockets||{})){const m=new THREE.Mesh(socketGeo,socketMat);m.name='socket:'+name;m.renderOrder=12;m.userData.target=obj;sockets.add(m);}
 g.add(sockets);
 const zones=new THREE.Group();
 for(const z of manifest.hitZones||[]){
  const mesh=z.shape==='box'?new THREE.Mesh(new THREE.BoxGeometry(...z.halfExtents.map(h=>h*2)),new THREE.MeshBasicMaterial({color:'#ff5a4d',wireframe:true,depthTest:false})):new THREE.Mesh(new THREE.SphereGeometry(z.radius,12,10),new THREE.MeshBasicMaterial({color:'#ff5a4d',wireframe:true,depthTest:false}));
  mesh.userData.zone=z;mesh.renderOrder=13;zones.add(mesh);
 }
 g.add(zones);
 stage.helpers.add(g);
 const socketOf=name=>{const s=f.parts.rig?.sockets||{};return {head:s.head,chest:s.chest,pelvis:s.pelvis,'hand.left':s.leftHand,'hand.right':s.rightHand,'foot.left':s.leftFoot,'foot.right':s.rightFoot}[name]||f.parts[name];};
 return {
  refresh(){
   const j=jointPoints(f),arr=skel.geometry.attributes.position.array;
   BONES.forEach(([a,b],i)=>{arr.set(j[a].toArray(),i*6);arr.set(j[b].toArray(),i*6+3);});
   skel.geometry.attributes.position.needsUpdate=true;
   Object.values(j).forEach((v,i)=>joints.children[i]?.position.copy(v));
   for(const m of sockets.children)m.userData.target.getWorldPosition(m.position);
   for(const m of zones.children){const z=m.userData.zone,host=socketOf(z.attach);if(host){host.getWorldPosition(m.position);tmp.fromArray(z.center);host.getWorldQuaternion(m.quaternion);m.position.add(tmp.applyQuaternion(m.quaternion));}}
   skel.visible=joints.visible=!!stage.overlays.skeleton;sockets.visible=!!stage.overlays.sockets;zones.visible=!!stage.overlays.zones;
  },
  dispose(){stage.helpers.remove(g);},
 };
}
export function measureFighter(f){
 const p=f.parts;f.obj.updateMatrixWorld(true);
 let low=Infinity;for(const leg of [p.legL,p.legR]){box.setFromObject(leg.userData.boot);low=Math.min(low,box.min.y);}
 // Segment lengths are fixed by construction (bendArm keeps upper/fore lengths); what a pose may
 // change is the reach, which can never exceed their sum nor fall under their difference.
 const reach=arm=>({reach:arm.children[2].position.length(),max:arm.userData.upperLength+arm.userData.foreLength,min:Math.abs(arm.userData.upperLength-arm.userData.foreLength)});
 return {rootDrift:f.obj.position.length(),rootY:f.obj.position.y,lowestFoot:low,armL:reach(p.armL),armR:reach(p.armR),pivotHeight:p.rig.pivotHeight,
  skinned:!!p.skin&&!p.skin.disposed,skinId:p.skin?.id??null,frameScale:f.def.frame?.scale??1,heroId:f.def.id,
  hasWeaponR:p.armR.children[2].children.some(c=>c.userData.weaponKind),hasWeaponL:p.armL.children[2].children.some(c=>c.userData.weaponKind)};
}
export async function loadPackage(pkg,stage){
 const m=pkg.manifest;
 if(m.kind==='humanoid-motion')return loadMotion(pkg,stage);
 if(m.kind==='equipment')return loadEquipmentPreview(pkg,stage,{makeFighter,BODIES,buildOverlays,measureFighter,snapshotBase,restoreBase});
 if(m.kind==='prop'||m.kind==='creature')return loadGlbPreview(pkg,stage);
 if(m.kind==='humanoid-body')return loadBody(pkg,stage);
 return {clips:[],bodies:[]};
}
async function loadMotion(pkg,stage){
 const bank=await (await fetch(pkg.base+'pose-bank.json',{cache:'no-store'})).json();
 const m=pkg.manifest;
 let f=null,base=null,overlays=null,bodyId=BODIES[0].id;
 const mount=id=>{
  if(f){stage.content.remove(f.obj);overlays?.dispose();f.dispose();}
  bodyId=id;const spec=BODIES.find(b=>b.id===id)||BODIES[0];
  f=makeFighter(spec);stage.content.add(f.obj);base=snapshotBase(f);overlays=buildOverlays(stage,f,m);
  stage.controls.target.set(0,f.parts.rig.pivotHeight,0);
 };
 mount(bodyId);
 const playback={
  clips:m.clips.map(c=>({id:c.id,take:c.take,duration:c.duration,loop:c.loop,events:c.events||[]})),
  bodies:BODIES.map(b=>({id:b.id,label:b.label})),
  get fighter(){return f;},
  apply(clip,time){
   const source=bank.clips[clip.id];if(!source)return;
   const phase=clip.duration?time/clip.duration:0;
   restoreBase(f,base);
   samplePoseFrame(source,phase,frame,clip.loop);
   applyAuthoredPose(f,frame,1,{hips:true});
   // Garment and head cover follow the posed carrier through the engine's own helpers.
   syncHeadCover(f.parts);animateCape(f.parts,time,0,null);
   f.obj.updateMatrixWorld(true);updateHeroSkin(f.parts);
   overlays.refresh();
  },
  setBody(id){mount(id);if(stage.clip)playback.apply(stage.clip,stage.time);},
  refreshOverlays(){overlays.refresh();},
  measure(){return {...measureFighter(f),body:bodyId};},
 };
 stage.dispose=()=>{if(f){stage.content.remove(f.obj);overlays?.dispose();f.dispose();f=null;}};
 return playback;
}
