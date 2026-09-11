import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {FrontlineEncounter} from '../src/engine/frontline-encounter.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot} from '../src/engine/abilities.js';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {loadCloneEquipment} from '../src/engine/clone-equipment.js';
import {requestReload,updateFirearmReload} from '../src/engine/firearm-ammo.js';

function fixture(fps=60,id=null){
 const scene=new THREE.Scene(),world={scene,cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),g=combat.game;g.entities=[];g.player=new Fighter(ROSTER[0]);g.player.pos.set(-40,0,-40);
 g.addFighter=(def,opts)=>{const f=new Fighter(def,opts);scene.add(f.obj);g.entities.push(f);return f;};
 const encounter=new FrontlineEncounter(g),f=id?new Fighter(ROSTER.find(d=>d.id===id)):encounter.soldiers[0];
 if(id)scene.add(f.obj);
 g.audio={...g.audio,gunshot(){}};g.attackRandom=()=>.5;g.muzzleFlash=()=>{};f._game=g;
 f.pos.set(0,0,0);f.obj.position.copy(f.pos);f.gait='grounded';f.facing=0;f.aim.set(0,0,1);f.hasAimWorld=true;f.aimWorld.set(0,7,40);f.aim3.set(0,0,1);f.animT=0;
 const dt=1/fps;
 function step(mode='idle',delta=dt){
  f.vel.set(mode==='idle'?0:12,0,mode==='retreat'?-10:mode==='idle'?0:10);
  f.guarding=mode==='guard';f.poseGuard=mode==='guard'?1:0;
  f.animT+=delta;f.slots.lmb.cd=Math.max(0,f.slots.lmb.cd-delta);f.ki=Math.min(f.maxKi,f.ki+delta*8);
  if(mode==='fire')runSlot(f,'lmb',{pressed:false,held:true,released:false,dt:delta},g);
  f._animate(delta);f.obj.updateMatrixWorld(true);
 }
 return {f,g,world,step,dt,encounter,close(){if(id)f.dispose();encounter.dispose();g.player.dispose();combat.dispose();}};
}
const worldPoint=o=>o.getWorldPosition(new THREE.Vector3());
function contacts(f){
 const gun=f.obj.getObjectByName('weapon-rifle'),support=gun.getObjectByName('weapon-support-grip'),stock=gun.getObjectByName('weapon-stock-contact');
 assert.ok(support&&stock,'rifle needs authored support and stock frames on its actual geometry');
 return {gun,support,stock,gap:worldPoint(support).distanceTo(worldPoint(f.parts.armL.children[2]))};
}

for(const fps of [30,60,120])test(`native clone has continuous rifle support through moving/fire/guard at ${fps} Hz`,()=>{
 const x=fixture(fps),{f,step}=x;
 try{
  assert.ok(!f._openSky,'presentation must not enable superhuman physics');
  for(let i=0;i<fps;i++)step();
  let previous=worldPoint(f.parts.armL.children[2]);
  for(const mode of ['idle','move','fire','guard','retreat','fire','idle'])for(let i=0;i<fps;i++){
   step(mode);const c=contacts(f),current=worldPoint(f.parts.armL.children[2]);
   assert.ok(c.gap<.045,`${mode} frame ${i}: off-hand lost rifle by ${c.gap}`);
   assert.ok(current.distanceTo(previous)<.65,`${mode}: discontinuous support hand`);previous=current;
   assert.ok(f.parts.armL.children[1].matrixWorld.elements.every(Number.isFinite));
  }
 }finally{x.close();}
});

test('shouldered rifle keeps its stock at the upper shoulder and real muzzle on the paid ray',()=>{
 const x=fixture(),{f,g,step}=x;
 try{
  for(let i=0;i<120;i++)step('fire');
  const c=contacts(f),stock=worldPoint(c.stock),shoulder=worldPoint(f.parts.armR);
  assert.ok(stock.distanceTo(shoulder)<1.25,'rifle stock must be supported at the shoulder, not fully extended in a fist');
  const shot=g.projectiles.list.at(-1),target=f.aimWorld.clone();shot.resolveLaunch(g);
  assert.ok(shot.pos.distanceTo(worldPoint(c.gun.getObjectByName('weapon-muzzle')))<1e-5);
  assert.ok(shot.vel.clone().normalize().dot(target.sub(shot.pos).normalize())>.99);
  const ray=new THREE.Vector3(0,-1,0).transformDirection(c.gun.matrixWorld);
  assert.ok(ray.dot(f.aimWorld.clone().sub(shot.pos).normalize())>.999);
 }finally{x.close();}
});

for(const id of ['sarge','merc'])test(`${id} stows inactive off-hand gear and supports the actual rifle`,()=>{
 const x=fixture(60,id);
 try{
  for(let i=0;i<90;i++)x.step('fire');
  assert.ok(x.f._riflePose?.active,'inactive sword/shield/pistol must not block rifle support');
  assert.equal(x.f.parts.armL.children[2].userData.gripOccupied,false);
  assert.ok(contacts(x.f).gap<.045,'support hand must contact the actual rifle grip');
 }finally{x.close();}
});

for(const id of ['sandra'])test(`${id} keeps occupied off-hand and existing one-hand ownership`,()=>{
 const x=fixture(60,id);
 try{
  for(let i=0;i<90;i++)x.step('fire');
  assert.ok(!x.f._riflePose?.active,'sword/shield/dual pistols must never be stolen for rifle support');
  assert.ok(x.f.parts.armL.children[2].userData.gripOccupied);
 }finally{x.close();}
});

test('rifle presentation is idempotent and retires through native form replacement',()=>{
 const x=fixture(),{f,step}=x;
 try{
  for(let i=0;i<120;i++)step('fire');contacts(f);
  const a=[f.parts.armL,f.parts.armR].flatMap(a=>[...a.quaternion,...a.children[1].position,...a.children[2].quaternion]);
  step('fire',0);
  const b=[f.parts.armL,f.parts.armR].flatMap(a=>[...a.quaternion,...a.children[1].position,...a.children[2].quaternion]);
  assert.ok(a.every((v,i)=>Math.abs(v-b[i])<1e-6),'zero-time evaluation accumulates rifle pose');
  f.applyForm({frame:{scale:1.1}});for(let i=0;i<90;i++)step('fire');assert.ok(contacts(f).gap<.045);
 }finally{x.close();}
});

function renderedFaces(mesh,region=null){
 const {position,skinIndex,skinWeight}=mesh.geometry.attributes,ix=mesh.geometry.index;
 const vertices=Array.from({length:position.count},(_,i)=>(mesh.isSkinnedMesh?mesh.getVertexPosition(i,new THREE.Vector3()):new THREE.Vector3().fromBufferAttribute(position,i)).applyMatrix4(mesh.matrixWorld));
 const weight=i=>{if(!region)return 1;let w=0;for(let k=0;k<4;k++)if(region.test(mesh.skeleton.bones[skinIndex.getComponent(i,k)].name))w+=skinWeight.getComponent(i,k);return w;};
 const faces=[];for(let i=0;i<(ix?ix.count:position.count);i+=3){const ids=[0,1,2].map(k=>ix?ix.getX(i+k):i+k);if(ids.every(id=>weight(id)>.8))faces.push(ids.map(id=>vertices[id]));}return faces;
}
function crossings(a,b){
 const ray=new THREE.Ray(),d=new THREE.Vector3(),hit=new THREE.Vector3();let n=0;
 const edge=(p,q,face)=>{d.subVectors(q,p);const length=d.length();if(length<1e-8)return false;ray.set(p,d.multiplyScalar(1/length));return !!ray.intersectTriangle(...face,false,hit)&&hit.distanceTo(p)<length-1e-5&&hit.distanceTo(p)>1e-5;};
 const boxes=b.map(face=>new THREE.Box3().setFromPoints(face));
 for(const face of a){const box=new THREE.Box3().setFromPoints(face);for(let i=0;i<b.length;i++)if(box.intersectsBox(boxes[i])){
  const other=b[i];if([0,1,2].some(j=>edge(face[j],face[(j+1)%3],other)||edge(other[j],other[(j+1)%3],face)))n++;
 }}return n;
}
test('actual skinned forearms and visible field gauntlets clear the source trunk through rifle motion',()=>{
 const x=fixture(),{f,step}=x;
 try{
  const body=f.parts.skin.meshes.find(m=>m.name==='hero-skin-body');assert.ok(body.isSkinnedMesh);
  for(const mode of ['idle','move','fire','guard','retreat'])for(let frame=0;frame<120;frame++){
   step(mode);if(frame%30!==0)continue;
   const trunk=renderedFaces(body,/^(root|pelvis|spine_)/),limbs=renderedFaces(body,/^lowerarm_/);
   assert.ok(trunk.length>100&&limbs.length>100,'test must sample actual skin regions');
   for(const arm of [f.parts.armL,f.parts.armR])arm.children[1].traverse(m=>{if(m.isMesh&&(m.layers.mask&1))limbs.push(...renderedFaces(m));});
   assert.equal(crossings(limbs,trunk),0,`${mode} phase ${frame/120}: rendered forearm/gauntlet intersects trunk`);
  }
 }finally{x.close();}
});

test('a disjoint paid off-hand attack releases support without changing its original channel',()=>{
 const x=fixture(),{f,g,step}=x;
 try{
  for(let i=0;i<90;i++)step('fire');assert.ok(contacts(f).gap<.045);
  f.slots.q={def:{type:'volley',name:'Offhand',pattern:'left',handPattern:'left',castHand:'left',cost:0,count:1,damage:1},cd:0};
  runSlot(f,'q',{pressed:true,held:true,released:false,dt:1/60},g);step('move');
  assert.ok(!f._riflePose.active,'off-hand attack must retain its paid hand');
 }finally{x.close();}
});

for(const at of [[0,80,15],[0,0,12],[20,12,18],[-20,18,18]])test(`ground rifle preserves source-body clearance when aiming at ${at}`,()=>{
 const x=fixture(),{f,step}=x;
 try{
  f.aimWorld.fromArray(at);f.facing=Math.atan2(at[0],at[2]);f.aim3.copy(f.aimWorld).sub(new THREE.Vector3(0,7,0)).normalize();f.aim.set(Math.sin(f.facing),0,Math.cos(f.facing));
  for(let i=0;i<150;i++){
   step('fire');if(i<60||i%30)continue;
   assert.ok(contacts(f).gap<.045,`offhand separation=${contacts(f).gap}`);
   const body=f.parts.skin.meshes.find(m=>m.name==='hero-skin-body'),trunk=renderedFaces(body,/^(root|pelvis|spine_)/);
   const forearms=renderedFaces(body,/^lowerarm_/);for(const arm of [f.parts.armL,f.parts.armR])arm.children[1].traverse(m=>{if(m.isMesh&&(m.layers.mask&1))forearms.push(...renderedFaces(m));});
   assert.equal(crossings(forearms,trunk),0,'full forearm/gauntlet surfaces must clear the trunk');
   const gunFaces=[];contacts(f).gun.traverse(m=>{if(m.isMesh)gunFaces.push(...renderedFaces(m));});
   assert.equal(crossings(gunFaces,trunk),0,'rifle stock/barrel must not cut through the trunk');
  }
 }finally{x.close();}
});

test('stun and death release rifle pose ownership without restoring a pre-hit pose into the ragdoll',()=>{
 const x=fixture(),{f,step}=x;
 try{
  for(let i=0;i<60;i++)step('fire');assert.ok(f._riflePose.active);
  f.stunT=.5;step('move');assert.equal(f._riflePose.active,false);f.stunT=0;
  for(let i=0;i<60;i++)step('fire');assert.ok(contacts(f).gap<.045);
  f._ko();assert.equal(f._riflePose,null);assert.ok(f.ragdoll);
 }finally{x.close();}
});

for(const fps of [30,60,120])test(`clone rifle remains attached outside a thin wall through approach/retreat at ${fps} Hz`,()=>{
 const x=fixture(fps),{f,world,step}=x;
 try{
  world.cover.push({x:0,z:3,hx:15,hz:.12,bottom:0,top:20});
  f.aimWorld.set(0,7,30);
  for(let i=0;i<fps*3;i++){
   f.pos.z=-5+5*Math.sin(i/(fps*3)*Math.PI);f.obj.position.copy(f.pos);step(i<fps*2?'fire':'move');
   assert.ok(contacts(f).gap<.045,`frame ${i}: support contact lost at cover`);
   const gun=contacts(f).gun;
   gun.traverse(m=>{if(!m.isMesh)return;const a=m.geometry.attributes.position;for(let j=0;j<a.count;j++){
    const v=new THREE.Vector3().fromBufferAttribute(a,j).applyMatrix4(m.matrixWorld);
    assert.ok(v.z<2.88+1e-4||v.z>3.12-1e-4,`frame ${i}: gun enters wall at ${v.toArray()}`);
   }});
  }
 }finally{x.close();}
});

test('continuous aimed elevation changes do not detach the support grip or snap its carrier',()=>{
 const x=fixture(),{f,step}=x;
 try{
  for(let i=0;i<60;i++)step('fire');let previous=worldPoint(f.parts.armL.children[2]);
  for(let i=0;i<240;i++){
   f.aimWorld.set(0,7+60*Math.sin(i/240*Math.PI*2),25);step('fire');const c=contacts(f),point=worldPoint(f.parts.armL.children[2]);
   assert.ok(c.gap<.045,`frame ${i}: support gap ${c.gap}`);
   assert.ok(point.distanceTo(previous)<.45,`frame ${i}: ${point.distanceTo(previous)}u hand jump`);previous=point;
  }
 }finally{x.close();}
});

for(const hz of [30,60,120])test(`manual reload lowers a steep aimed rifle continuously and recovers its grip at ${hz} Hz`,()=>{
 const x=fixture(hz),{f,g,step,dt}=x;
 try{
  f.aimWorld.set(0,55,25);
  for(let i=0;i<hz;i++)step('fire');
  assert.ok(requestReload(f,'lmb',g));
  let previous=worldPoint(f.parts.armL.children[2]);
  for(let i=0;i<hz*4;i++){
   updateFirearmReload(f,dt,g);step(i<hz*3?'move':'fire');
   const c=contacts(f),current=worldPoint(f.parts.armL.children[2]);
   // During the authored reload this hand intentionally leaves the fore-end.
   // It must instead follow the physical magazine during removal/insertion.
   const r=f._firearmReload,t=r?r.elapsed/r.duration:1;
   if(!r)assert.ok(c.gap<.045,`frame ${i}: recovered support gap ${c.gap}`);
   else if(t>.22&&t<.63)assert.ok(current.distanceTo(worldPoint(c.gun.getObjectByName('magazine-grip')))<.06,'Reload magazine contact');
   assert.ok(current.distanceTo(previous)<27*dt,`frame ${i}: reload carrier jumps ${current.distanceTo(previous)}`);
   previous=current;
  }
  assert.ok(!f._firearmReload&&f.slots.lmb.ammo.loaded>0);
 }finally{x.close();}
});

test('both visible source-skin hands meet rifle surfaces, not only hidden driver sockets',()=>{
 const x=fixture(),{f,step}=x;
 try{
  for(let i=0;i<120;i++)step('fire');const gunFaces=[];contacts(f).gun.traverse(m=>{if(m.isMesh)gunFaces.push(...renderedFaces(m));});
  const body=f.parts.skin.meshes.find(m=>m.name==='hero-skin-body');
  for(const side of ['r','l']){
   const handFaces=renderedFaces(body,new RegExp('^(hand|index_[0-9]+|middle_[0-9]+|ring_[0-9]+|pinky_[0-9]+|thumb_[0-9]+)_'+side+'$'));
   assert.ok(handFaces.length>30,'visible hand region is required');let closest=Infinity;
   for(const face of handFaces)for(const point of face)for(const gunFace of gunFaces)closest=Math.min(closest,new THREE.Triangle(...gunFace).closestPointToPoint(point,new THREE.Vector3()).distanceTo(point));
   assert.ok(closest<.08,`${side}: rendered hand floats ${closest}u from rifle`);
  }
 }finally{x.close();}
});

test('coincident rifle aim keeps finite unit transforms and releases an infeasible two-hand hold',()=>{
 const x=fixture(),{f,step}=x;
 try{
  for(let i=0;i<90;i++)step('fire');
  for(const name of ['weapon-stock-contact','weapon-muzzle']){
   f.aimWorld.copy(worldPoint(contacts(f).gun.getObjectByName(name)));step('fire');
   for(const arm of [f.parts.armL,f.parts.armR])assert.ok(Math.abs(arm.quaternion.length()-1)<1e-6&&Math.abs(arm.children[2].quaternion.length()-1)<1e-6);
   assert.ok(!f._riflePose.active,'inside-stock aim must fall back, not draw a floating support hand');
  }
 }finally{x.close();}
});

test('ground rifle cannot take over a concurrent head-emitter carrier',()=>{
 const x=fixture(),{f,step}=x;
 try{
  for(let i=0;i<90;i++)step('fire');
  f.slots.q={def:{type:'volley',faceOrigin:true,name:'Optic',cost:1},_poseUntil:f.animT+1};step('fire');
  assert.ok(!f._riflePose.active,'other body emitters retain their final calibrated carrier');
 }finally{x.close();}
});

for(const fps of [30,60,120])for(const at of [[0,80,15],[0,0,12]])test(`soldier frame keeps full rifle contact and rendered clearance from entry at ${fps} Hz aiming ${at}`,()=>{
 const x=fixture(fps),{f,step}=x;
 try{
  f.aimWorld.fromArray(at);f.aim3.copy(f.aimWorld).sub(new THREE.Vector3(0,7,0)).normalize();
  const phases=new Set([0,Math.floor(fps*.25),Math.floor(fps*.5),Math.floor(fps*.75),fps]);
  for(let i=0;i<=fps;i++){
   step('fire');assert.ok(contacts(f).gap<.045,`${i}/${fps}: support must not fall back on reachable elevation`);
   if(!phases.has(i))continue;
   const body=f.parts.skin.meshes.find(m=>m.name==='hero-skin-body'),trunk=renderedFaces(body,/^(root|pelvis|spine_)/),forearms=renderedFaces(body,/^lowerarm_/),gun=[];
   for(const arm of [f.parts.armL,f.parts.armR])arm.children[1].traverse(m=>{if(m.isMesh&&(m.layers.mask&1))forearms.push(...renderedFaces(m));});
   contacts(f).gun.traverse(m=>{if(m.isMesh)gun.push(...renderedFaces(m));});
   assert.equal(crossings(forearms,trunk),0,`${i}/${fps}: forearm surface enters torso`);
   assert.equal(crossings(gun,trunk),0,`${i}/${fps}: gun enters torso`);
  }
 }finally{x.close();}
});

for(const at of [[0,7,40],[0,80,15],[0,0,12],[20,12,18],[-20,18,18]])test(`shipped carrier clears rifle and support forearms while aiming ${at}`,async()=>{
 const x=fixture(),{f,step}=x;
 try{
  const bytes=await readFile(new URL('../public/models/frontline/clone-kit.glb',import.meta.url));
  await loadCloneEquipment(x.encounter,{loader:{loadAsync:()=>new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')}});
  const vest=f.parts.torso.getObjectByName('clone_vest_torso');assert.ok(vest,'actual shipped carrier is required');
  f.aimWorld.fromArray(at);f.facing=Math.atan2(at[0],at[2]);f.aim3.copy(f.aimWorld).sub(new THREE.Vector3(0,7,0)).normalize();f.aim.set(Math.sin(f.facing),0,Math.cos(f.facing));
  for(let i=0;i<120;i++){
   step('fire');if(i%30)continue;
   assert.ok(contacts(f).gap<.045,'loaded equipment must not cause support fallback');
   const body=f.parts.skin.meshes.find(m=>m.name==='hero-skin-body'),forearms=renderedFaces(body,/^lowerarm_/),gun=[],gear=[];
   for(const arm of [f.parts.armL,f.parts.armR])arm.children[1].traverse(m=>{if(m.isMesh&&(m.layers.mask&1))forearms.push(...renderedFaces(m));});
   contacts(f).gun.traverse(m=>{if(m.isMesh)gun.push(...renderedFaces(m));});
   vest.traverse(m=>{if(m.isMesh)gear.push(...renderedFaces(m));});
   assert.equal(crossings(forearms,gear),0,`frame ${i}: forearm/gauntlet enters shipped carrier`);
   assert.equal(crossings(gun,gear),0,`frame ${i}: rifle enters shipped carrier`);
  }
 }finally{x.close();}
});

for(const id of ['sarge','merc'])for(const fps of [30,60,120])test(`native third-person ${id} keeps ready grip through independent-heading run cycles at ${fps} Hz`,()=>{
 const x=fixture(fps,id),{f,step}=x;
 try{
  f._openSky=true;
  for(let i=0;i<fps*4;i++){
   step('move');
   assert.ok(f._riflePose?.active,`run frame ${i}: ready hold fell back; ${JSON.stringify({pose:!!f._riflePose,grip:f.parts.armL.children[2].userData.gripOccupied,shield:!!f.parts.armL.userData.shield,air:f.airborne,gait:f.gait})}`);
   assert.ok(contacts(f).gap<.045,`run frame ${i}: support grip detached`);
  }
 }finally{x.close();}
});
