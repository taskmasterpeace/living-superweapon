import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {Ragdoll} from '../src/engine/ragdoll.js';
import {updateHeroSkin} from '../src/engine/hero-skin.js';
import {Game} from '../src/engine/game.js';
import {STRIKES} from '../src/data/martial.js';
import {spawnDuplicates,possess,releasePossession} from '../src/engine/systems2.js';
import {setInvisible,updateInvisible} from '../src/engine/systems.js';
import {HUD} from '../src/engine/hud.js';
import {SpaceFlight} from '../src/engine/spaceflight.js';

function fighter(body='superhero-male',id='sol'){
 const def=structuredClone(ROSTER.find(d=>d.id===id));
 def.model={...def.model,body};def.frame={scale:1,bulk:1,broad:1,head:1,neck:1,stance:1};
 return new Fighter(def);
}
function skinMeshes(f){const out=[];f.obj.traverse(o=>{if(o.isSkinnedMesh)out.push(o);});return out;}
function bounds(mesh){mesh.computeBoundingBox();return mesh.boundingBox.clone().applyMatrix4(mesh.matrixWorld);}
function allBounds(f){
 const b=new THREE.Box3();for(const m of skinMeshes(f))b.union(bounds(m));
 for(const leg of [f.parts.legL,f.parts.legR])if(leg.userData.boot.layers.isEnabled(0))b.union(new THREE.Box3().setFromObject(leg.userData.boot));
 return b;
}

test('skin follows ancestor/root changes and portrait arm poses without a second animation call',()=>{
 const f=fighter(),holder=new THREE.Group();holder.add(f.obj);
 try{
  const mesh=skinMeshes(f)[0],point=mesh.getVertexPosition(0,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
  f.pos.set(20,50,-30);f.obj.rotation.y=1;holder.position.set(12,15,25);holder.scale.setScalar(.9);holder.updateMatrixWorld(true);
  const expected=point.clone().applyMatrix4(f.obj.matrixWorld),actual=mesh.getVertexPosition(0,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
  assert.ok(actual.distanceTo(expected)<1e-5,'ancestor movement was cancelled by stale world-space bones');
  f.parts.armL.rotation.set(.06,0,.15);f.parts.armR.rotation.set(.06,0,-.15);holder.updateMatrixWorld(true);
  for(const [name,arm] of [['hand_r',f.parts.armL],['hand_l',f.parts.armR]]){
   const bone=f.parts.skin.skeleton.bones.find(b=>b.name===name),socket=arm.children[2].getWorldPosition(new THREE.Vector3());
   assert.ok(new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld).distanceTo(socket)<.3,'portrait skin arm ignored its authoritative driver');
  }
 }finally{f.dispose();}
});

test('post-animation body separation transports the rendered source surface in the same frame',()=>{
 const a=fighter(),b=fighter(),game={entities:[a,b]};try{
  a.pos.set(0,80,0);b.pos.set(1,80,0);for(const f of [a,b])f._animate(1/60);
  const mesh=skinMeshes(a)[0],before=mesh.getVertexPosition(0,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld),root=a.pos.clone();
  Game.prototype.resolveBodies.call(game);a.obj.updateMatrixWorld(true);
  const correction=a.pos.clone().sub(root),actual=mesh.getVertexPosition(0,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld).sub(before);
  assert.ok(correction.length()>.5);assert.ok(actual.distanceTo(correction)<1e-5,'source skin was left behind after resolveBodies');
 }finally{a.dispose();b.dispose();}
});

for(const consumer of ['portrait','spaceflight'])test(`${consumer} cleanup releases a direct figure skeleton once`,()=>{
 const f=fighter(),scene=new THREE.Scene();scene.add(f.obj);const skin=f.parts.skin.skeleton;skin.computeBoneTexture();let released=0;skin.boneTexture.addEventListener('dispose',()=>released++);
 const previousWindow=globalThis.window;
 try{
  if(consumer==='portrait')HUD.prototype._selDispose(f.obj);
  else {globalThis.window={removeEventListener(){}};SpaceFlight.prototype.finish.call({scene,g:{world:{}},_mats:[]});}
  assert.equal(released,1,'direct figure consumer leaked its bone texture');
 }finally{if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;}
});

for(const body of ['superhero-male','superhero-female'])test(`${body} uses closed boot modules and removes hidden source toes from all passes`,()=>{
 const f=fighter(body);try{
  for(const leg of [f.parts.legL,f.parts.legR])assert.equal(leg.userData.boot.layers.isEnabled(0),true,'hero needs solid boots, not painted bare toes');
  const mesh=skinMeshes(f).find(m=>m.name==='hero-skin-body'),p=mesh.geometry.attributes.position;
  const foot=f.parts.skin.sourceFootCut;
  assert.ok(Number.isFinite(foot));for(let i=0;i<p.count;i++)assert.ok(p.getY(i)>=foot-1e-6,'hidden foot geometry would still cast a bare-toe shadow');
  assert.equal(f.parts.emblem.layers.isEnabled(0),true);
  const {skinWeight,skinIndex,normal}=mesh.geometry.attributes;
  for(let i=0;i<p.count;i++){
   const weights=Array.from({length:4},(_,j)=>skinWeight.array[i*4+j]);assert.ok(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<1e-6);
   for(let j=0;j<4;j++)assert.ok(skinIndex.array[i*4+j]<f.parts.skin.skeleton.bones.length);
   assert.ok(Math.abs(new THREE.Vector3().fromBufferAttribute(normal,i).length()-1)<1e-5);
  }
 }finally{f.dispose();}
});

for(const hz of [30,60,120])for(const body of ['superhero-male','superhero-female'])test(`${body} keeps final strike drivers, geometry and optic sockets at ${hz}Hz`,()=>{
 const f=fighter(body),plain=fighter('procedural');try{
  for(const actor of [f,plain])Object.assign(actor,{_openSky:true,flying:false,gait:'grounded',poseStrike:1,_meleeMotion:{side:1,point:new THREE.Vector3(.3,7,5)}});
  for(const move of ['jab','cross','power'])for(const state of ['startup','active','recover'])for(let i=0;i<=6;i++){
   for(const actor of [f,plain]){actor.vel.set(0,0,14);actor.mId=move;actor.mstate=state;actor.mT=STRIKES[move][state]*(1-i/6);actor.animT=i/hz;actor._animate(1/hz);}
   assert.deepEqual(f.pos.toArray(),plain.pos.toArray());assert.deepEqual(f.vel.toArray(),plain.vel.toArray());
   for(const key of ['torso','head','armL','armR','legL','legR'])assert.deepEqual(f.parts[key].matrixWorld.toArray(),plain.parts[key].matrixWorld.toArray(),`${key} driven differently by body choice`);
   for(const mesh of skinMeshes(f)){
    const b=bounds(mesh);assert.ok([...b.min.toArray(),...b.max.toArray()].every(Number.isFinite));
    assert.ok(b.getSize(new THREE.Vector3()).length()<30,'skin explodes during contact');
   }
  }
  const eyeMesh=skinMeshes(f).find(m=>m.name==='hero-skin-eyes'),position=eyeMesh.geometry.attributes.position;
  for(const [sign,socket] of [[-1,f.parts.eyeL],[1,f.parts.eyeR]]){
   const box=new THREE.Box3();
   for(let i=0;i<position.count;i++)if(position.getX(i)*sign>0){const v=eyeMesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(eyeMesh.matrixWorld);f.parts.head.worldToLocal(v);box.expandByPoint(v);}
   const front=box.getCenter(new THREE.Vector3()).setZ(box.max.z);assert.ok(front.distanceTo(socket.position)<1e-5,'eye beam socket is not on the rendered eye');
  }
 }finally{f.dispose();plain.dispose();}
});

for(const id of ['titan','kraken','rift','sarge'])test(`${id} keeps signature gear and head-cover choice on source anatomy`,()=>{
 const f=fighter('superhero-male',id),plain=fighter('procedural',id);try{
  assert.equal(f.parts.cowl.visible,plain.parts.cowl.visible,'source choice must not exchange helmet or hood for generic hair');
  const gear=[];f.obj.traverse(o=>{if(o.userData.heroGear)gear.push(o);});assert.ok(gear.length>=2,'signature gear must have explicit ownership');
  for(const root of gear)root.traverse(o=>{if(o.isMesh)assert.equal(o.layers.isEnabled(0),true,`${id} signature gear was hidden`);});
 }finally{f.dispose();plain.dispose();}
});

test('source suit keeps each live palette region and its own glow',()=>{
 const f=fighter();try{
  const p=f.parts,shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
  p.skin.materials.body.onBeforeCompile(shader);
  assert.equal(shader.uniforms.uRimK,p.mats.suit._rimU.uRimK,'source suit lost the production rim-light control');
  p.mats.suit.emissive.set('#ff3300');p.mats.suit.emissiveIntensity=2;
  p.mats.suit2.emissive.set('#003399');p.mats.suit2.emissiveIntensity=.2;
  updateHeroSkin(p);
  assert.deepEqual(shader.uniforms.skinEmissionLegs?.value.toArray(),p.mats.suit2.emissive.clone().multiplyScalar(.2).toArray(),'chest glow must not tint blue legs purple');
  assert.deepEqual(shader.uniforms.skinEmissionFace?.value.toArray(),[0,0,0]);
  p.mats.suit2.color.set('#20c6e0');assert.equal(shader.uniforms.skinLegs.value.getHexString(),'20c6e0','palette editing must not require recompilation');
 }finally{f.dispose();}
});

test('live duplicates retain their own tracked skin material and shader',()=>{
 const f=fighter(),scene=new THREE.Scene(),copies=[];
 const game={scene,addFighter:(def,opts)=>{const d=new Fighter(def,opts);copies.push(d);scene.add(d.obj);return d;},vfx:{ring(){}},audio:{teleport(){}}};
 try{
  const [d]=spawnDuplicates(f,1,4,game),body=skinMeshes(d).find(m=>m.name==='hero-skin-body');
  assert.equal(body.material,d.parts.skin.materials.body,'duplicate draws an untracked replacement material');
  assert.ok(body.material.heroPalette,'duplicate lost its source suit shader');assert.notEqual(body.material,f.parts.skin.materials.body);
  d._animate(1/60);assert.equal(body.material.opacity,.92);
  d.parts.mats.suit2.color.set('#44cfff');assert.equal(body.material.heroPalette.skinLegs.value.getHexString(),'44cfff');
 }finally{for(const d of copies)d.dispose();f.dispose();}
});

test('source skin follows invisibility through a form change and restores opacity',()=>{
 const f=fighter(),game={scene:new THREE.Scene(),vfx:{ring(){}},audio:{teleport(){}},isHuman:()=>false};game.scene.add(f.obj);f._game=game;
 try{
  setInvisible(f,5,game);updateInvisible(f,.1,game);f._animate(1/60);
  assert.ok(f.parts.skin.materials.body.opacity<.1);
  f.applyForm({model:{body:'superhero-female'}});updateInvisible(f,.1,game);f._animate(1/60);
  assert.ok(skinMeshes(f).every(m=>m.material.opacity<.1));
  f._invis.t=.01;updateInvisible(f,.02,game);f._animate(1/60);
  assert.ok(skinMeshes(f).every(m=>m.material.opacity===1));
 }finally{f.dispose();}
});

test('possession snapshot owns static skin geometry and releases it on return',()=>{
 const f=fighter(),victim=fighter('procedural'),scene=new THREE.Scene();scene.add(f.obj,victim.obj);
 const game={scene,humans:[],isHuman:()=>false,vfx:{ring(){}},audio:{teleport(){}}};
 try{
  assert.equal(possess(f,victim,2,game),true);const skins=[];f._possessing.spectral.traverse(o=>{if(o.name.startsWith('hero-skin-'))skins.push(o);});
  assert.equal(skins.length,3);let disposed=0;
  for(const m of skins){assert.equal(m.isSkinnedMesh,undefined);m.geometry.addEventListener('dispose',()=>disposed++);}
  releasePossession(f,game);assert.equal(disposed,3);assert.equal(f.obj.visible,true);
 }finally{f.dispose();victim.dispose();}
});

test('source skin resources stay alive while a raw scene copy borrows them',()=>{
 const f=fighter(),scene=new THREE.Scene();scene.add(f.obj);f._game={scene};
 try{
  const skin=f.parts.skin,copy=f.obj.clone(true);scene.add(copy);skin.skeleton.computeBoneTexture();
  let released=0;skin.skeleton.boneTexture.addEventListener('dispose',()=>released++);
  f.applyForm({model:{body:'procedural'}});assert.equal(released,0,'live copied skeleton freed early');
  scene.remove(copy);assert.equal(released,1);
 }finally{f.dispose();}
});

test('real decoy freezes source surface rather than following live bones',()=>{
 const f=fighter(),scene=new THREE.Scene();scene.add(f.obj);
 const game={scene,time:0,vfx:{ring(){},flash(){}},audio:{teleport(){}}};f._game=game;
 try{
  f.pos.set(12,80,-20);f._animate(1/60);
  const live=skinMeshes(f)[0],index=live.geometry.index.getX(0),before=live.getVertexPosition(index,new THREE.Vector3());
  const d=Game.prototype.spawnDecoy.call(game,f,.5);let snapshot;d.grp.traverse(o=>{if(o.name===live.name)snapshot=o;});
  assert.equal(snapshot?.isSkinnedMesh,undefined,'decoy must own a static posed surface');
  assert.ok(new THREE.Vector3().fromBufferAttribute(snapshot.geometry.attributes.position,index).distanceTo(before)<1e-5);
  d.grp.updateMatrixWorld(true);
  const liveWorld=before.clone().applyMatrix4(live.matrixWorld),copyWorld=new THREE.Vector3().fromBufferAttribute(snapshot.geometry.attributes.position,index).applyMatrix4(snapshot.matrixWorld);
  assert.ok(liveWorld.distanceTo(copyWorld)<1e-5,'decoy must not apply the caster world transform twice');
  const positions=snapshot.geometry.attributes.position.array.slice();let disposed=0;snapshot.geometry.addEventListener('dispose',()=>disposed++);
  f.pos.x+=40;f.poseGuard=1;f._animate(1/60);f.applyForm({model:{body:'superhero-female'}});
  assert.deepEqual(snapshot.geometry.attributes.position.array,positions);assert.equal(disposed,0);
  Game.prototype.updateDecoys.call(game,1);assert.equal(disposed,1);
 }finally{f.dispose();}
});

test('decoy hover is bounded around its spawn height rather than integrating a sine wave',()=>{
 const f=fighter(),scene=new THREE.Scene(),game={scene,time:0,vfx:{ring(){},flash(){}},audio:{teleport(){}}};f.pos.y=80;
 try{
  const d=Game.prototype.spawnDecoy.call(game,f,5);
  for(let i=0;i<299;i++){
   game.time=i/60;Game.prototype.updateDecoys.call(game,1/60);
   assert.ok(Math.abs(d.grp.position.y-80)<=.061,`decoy drifted ${d.grp.position.y-80}u from its intended ±.06 bob`);
  }
  Game.prototype.updateDecoys.call(game,1);
 }finally{f.dispose();}
});

for(const body of ['superhero-male','superhero-female'])test(`${body} replaces rendered anatomy without replacing physical drivers`,()=>{
 const f=fighter(body),plain=fighter('procedural');
 try{
  const skins=skinMeshes(f);assert.ok(skins.length>0,'asset body must be a real SkinnedMesh');
  assert.ok(skins.some(m=>m.geometry.attributes.position.count>5000),'source-authored anatomy is missing');
  assert.ok(f.parts.skin.source.license==='CC0-1.0');
  assert.deepEqual(f.pos.toArray(),plain.pos.toArray());assert.deepEqual(f.obj.scale.toArray(),[1,1,1]);assert.equal(f.obj.rotation.order,'YXZ');
  for(const part of ['armL','armR','legL','legR'])assert.deepEqual(f.parts[part].position.toArray(),plain.parts[part].position.toArray());
  assert.equal(f.parts.armL.children.length,plain.parts.armL.children.length);
  assert.equal(f.parts.torso.layers.isEnabled(0),false,'superseded chest must not render over the skin');
  assert.equal(f.parts.cape.layers.isEnabled(0),true,'cape must survive the body replacement');
  f.obj.updateMatrixWorld(true);const b=allBounds(f),size=b.getSize(new THREE.Vector3());
  assert.ok(b.min.y>-.45&&b.min.y<.8,`rest soles ${b.min.y}`);
  assert.ok(size.y>8&&size.y<11,`body height ${size.y}`);assert.ok(size.x>3&&size.x<8,`body width ${size.x}`);
 }finally{f.dispose();plain.dispose();}
});

for(const hz of [30,60,120])test(`final-pose skin follows hover and guard without moving root at ${hz}Hz`,()=>{
 const f=fighter();try{
  Object.assign(f,{_openSky:true,flying:true,gait:'airborne',_flyPose:1});f.pos.set(12,80,-20);
  const root=f.pos.toArray();let previous;
  for(let i=0;i<hz*3;i++){
   f.animT=i/hz;f.guarding=i>hz;f.poseGuard=THREE.MathUtils.damp(f.poseGuard,f.guarding?1:0,14,1/hz);
   f._animate(1/hz);f._sync();f.obj.updateMatrixWorld(true);
   assert.deepEqual(f.pos.toArray(),root);
   const p=f.parts,skin=p.skin;assert.ok(skin,'final skin layer missing');
   for(const [joint,hand] of [['hand_r',p.armL.children[2]],['hand_l',p.armR.children[2]]]){
    const bone=skin.skeleton.bones.find(b=>b.name===joint);
    const point=new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld),socket=hand.getWorldPosition(new THREE.Vector3());
    assert.ok(point.distanceTo(socket)<.3,`skin wrist detached: ${point.distanceTo(socket)}`);
   }
   if(i%Math.max(1,hz/5)===0){const b=allBounds(f);assert.ok([...b.min.toArray(),...b.max.toArray()].every(Number.isFinite));
    const c=b.getCenter(new THREE.Vector3());if(previous)assert.ok(c.distanceTo(previous)<4,'skin snaps to source bind');previous=c;
   }
  }
 }finally{f.dispose();}
});

test('body replacement preserves armed sockets and releases its skeleton on form replacement',()=>{
 const f=fighter('superhero-male','gale');try{
  const hand=f.parts.armL.children[2],gear=[...hand.children],skin=f.parts.skin;
  assert.ok(skin);assert.ok(gear.length>0);
  for(const g of gear)g.traverse(o=>{if(o.isMesh)assert.equal(o.layers.isEnabled(0),true,'weapon was hidden with the hand');});
  skin.skeleton.computeBoneTexture();let released=0;skin.skeleton.boneTexture.addEventListener('dispose',()=>released++);
  f.applyForm({model:{body:'superhero-female'}});f._sync();
  assert.equal(released,1);assert.ok(skinMeshes(f).length>0);assert.equal(f.parts.skin.id,'superhero-female');
  f.applyForm({model:{body:'procedural'}});assert.equal(skinMeshes(f).length,0);assert.equal(f.parts.torso.layers.isEnabled(0),true);
 }finally{f.dispose();}
});

test('ragdoll skin follows driven chest and limbs, then restores live pose',()=>{
 const f=fighter();try{
  const game={world:{cover:[],heightAt:()=>0,ARENA:240},onRagdollImpact:()=>{}};
  f.pos.set(0,20,0);f.vel.set(30,10,8);f.obj.updateMatrixWorld(true);f.ragdoll=new Ragdoll(f);
  for(let i=0;i<180;i++){f.ragdoll.step(1/60,game);f.ragdoll.apply(f);f._sync();}
  const skin=f.parts.skin;assert.ok(skin);const body=allBounds(f);
  assert.ok(body.max.y-body.min.y<7,'skin remains standing during ragdoll');
  assert.ok(body.min.y>-.8&&body.min.y<1,'skin corpse does not reach the floor');
  f.ragdoll.restore();f.ragdoll=null;f._animate(1/60);f._sync();
  assert.ok(allBounds(f).getSize(new THREE.Vector3()).y>7,'skin did not recover with restored rig');
 }finally{f.ragdoll?.restore();f.dispose();}
});
