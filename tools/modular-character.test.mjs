import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Fighter,buildWeapon} from '../src/engine/entity.js';
import {loadModularCharacter} from '../src/engine/modular-character.js';
import {alignWeaponGrip,WEAPON_GRIP_CENTERS} from '../src/engine/weapon-grip.js';
import {FACE_EXPRESSIONS,setModularMuscle} from '../src/engine/modular-face.js';
import {MODULAR_RECIPES,applyModularRecipe,validateModularRecipe,animateModularCape} from '../src/engine/modular-costume.js';
import {ROSTER} from '../src/data/characters.js';
import {createModularFlightAdapter} from '../src/engine/modular-flight.js';
globalThis.ProgressEvent??=class{constructor(type,data){Object.assign(this,{type},data);}};
async function output(){const bytes=await fs.readFile('public/models/modular-hero/modular-hero.glb');return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');}
async function source(){const j=JSON.parse(await fs.readFile('assets-src/modular-character/source/AnimationLibrary_Godot_Standard.gltf'));j.buffers[0].uri='data:application/octet-stream;base64,'+(await fs.readFile('assets-src/modular-character/source/AnimationLibrary_Godot_Standard.bin')).toString('base64');return new GLTFLoader().parseAsync(JSON.stringify(j),'');}
function pose(g,name,phase){const m=new T.AnimationMixer(g.scene),clip=g.animations.find(c=>c.name===name);assert.ok(clip,name);const a=m.clipAction(clip);a.setLoop(T.LoopOnce,1);a.clampWhenFinished=true;a.play();m.setTime(phase*clip.duration);g.scene.updateMatrixWorld(true);return m;}
test('original punch and sword skeleton motion survives export, including finger tips',async()=>{
 const a=await source(),b=await output();
 for(const clip of ['Punch_Jab','Punch_Cross','Sword_Idle','Sword_Attack'])for(const phase of [0,.25,.5,.75,1]){
  const ma=pose(a,clip,phase),mb=pose(b,clip,phase);
  for(const name of ['DEF-hips','DEF-head','DEF-hand.R','DEF-hand.L','DEF-f_index.03.R','DEF-thumb.03.R']){
   const key=T.PropertyBinding.sanitizeNodeName(name),p=a.scene.getObjectByName(key).getWorldPosition(new T.Vector3()),q=b.scene.getObjectByName(key).getWorldPosition(new T.Vector3());
   assert.ok(p.distanceTo(q)<.002,`${clip} ${phase} ${name}: ${p.distanceTo(q)}`);
  }
  ma.stopAllAction();mb.stopAllAction();
 }
});
test('flight adapter preserves source bone lengths and cannot mutate fighter controls or poses',async()=>{
 const g=await output();pose(g,'A_TPose',0);const f=new Fighter(ROSTER.find(d=>d.id==='vega'));f._openSky=true;f.flying=true;f.gait='airborne';g.scene.scale.setScalar(5.4);
 const adapter=createModularFlightAdapter(g.scene,f),bones=[];g.scene.traverse(o=>{if(o.isBone&&o.name!==T.PropertyBinding.sanitizeNodeName('DEF-hips'))bones.push([o,o.position.length()]);});
 for(const velocity of [[0,0,0],[0,0,70],[0,30,30],[25,-25,80]]){
  f.vel.set(...velocity);for(let i=0;i<30;i++)f._animate(1/60);const state=[...f.vel.toArray(),...f.pos.toArray(),...f.parts.g.quaternion.toArray(),...f.parts.armR.quaternion.toArray()];adapter.update();
  assert.deepEqual([...f.vel.toArray(),...f.pos.toArray(),...f.parts.g.quaternion.toArray(),...f.parts.armR.quaternion.toArray()],state);
  for(const [b,length] of bones){assert.ok(Math.abs(b.position.length()-length)<1e-5,b.name);assert.ok(b.matrixWorld.elements.every(Number.isFinite));}
 }
 f.dispose();
});
test('runtime groups retain modular slots, valid weights and a bounded triangle budget',async()=>{
 const g=await output();let count=0,tris=0;const slots=new Set();g.scene.traverse(o=>{if(!o.isMesh)return;count++;slots.add(o.userData.slot);assert.ok(o.isSkinnedMesh,o.name);tris+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;const w=o.geometry.attributes.skinWeight;for(let i=0;i<w.count;i++)assert.ok(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-5);});assert.ok(count<=48,count);assert.ok(tris<=4500,tris);for(const s of ['hands','torso','cape','hair','emblem'])assert.ok(slots.has(s),s);
});
test('native sword contact geometry follows the authored palm and restores on teardown',async()=>{
 const def=structuredClone(ROSTER.find(d=>d.id==='vega'));def.model={...def.model,body:'faceted-v1'};const f=new Fighter(def);f._animate(0);
 const sword=buildWeapon('sword',{});alignWeaponGrip(sword);f.parts.armR.children[2].add(sword);sword.updateMatrix();const base=sword.matrix.clone();
 const c=await loadModularCharacter(f,{load:output});
 for(const [mstate,mT] of [['startup',.08],['active',.04],['recover',.1]]){
  f.mstate=mstate;f.mId='cross';f.mT=mT;f._meleeMotion={weapon:sword,side:1};c.update();
  const hand=c.actor.getObjectByName(T.PropertyBinding.sanitizeNodeName('DEF-hand.R'));
  const expected=hand.localToWorld(new T.Vector3(0,.075,.028)),actual=sword.localToWorld(new T.Vector3(...WEAPON_GRIP_CENTERS.sword));
  assert.ok(actual.distanceTo(expected)<1e-5,`${mstate} detached blade: ${actual.toArray()} expected ${expected.toArray()} flying=${f.flying} state=${f.state}`);
 }
 c.dispose();sword.updateMatrix();assert.ok(sword.matrix.elements.every((v,i)=>Math.abs(v-base.elements[i])<1e-5));f._modularCharacter=null;f.dispose();
});
test('a late asset load cannot install a body on a disposed fighter',async()=>{
 const def=structuredClone(ROSTER.find(d=>d.id==='vega'));def.model={...def.model,body:'faceted-v1'};const f=new Fighter(def);let resolve;const pending=loadModularCharacter(f,{load:()=>new Promise(r=>resolve=r)});f.dispose();resolve(await output());assert.equal(await pending,undefined);assert.equal(f._modularCharacter,null);
});
test('native animation ticks advance the installed authored body',async()=>{
 const def=structuredClone(ROSTER.find(d=>d.id==='vega'));def.model={...def.model,body:'faceted-v1'};
 const f=new Fighter(def),c=await loadModularCharacter(f,{load:output});
 const hand=c.actor.getObjectByName(T.PropertyBinding.sanitizeNodeName('DEF-hand.R'));
 f.mId='cross';f.mstate='startup';f.mT=.12;f._animate(1/60);
 const before=hand.getWorldPosition(new T.Vector3());
 f.mstate='active';f.mT=.01;f._animate(1/60);
 assert.ok(before.distanceTo(hand.getWorldPosition(new T.Vector3()))>.1,'native tick left authored body frozen');
 f.dispose();
});
test('muscle morphs keep shoulder/elbow seams fixed at scene scale and never rewrite rest vertices',async()=>{
 const g=await output(),meshes=[];g.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});
 const arms=meshes.find(o=>o.userData.slot==='arms'),base=Array.from(arms.geometry.attributes.position.array);
 g.scene.scale.set(4,5,6);g.scene.updateMatrixWorld(true);
 const count=arms.geometry.attributes.position.count,point=i=>arms.getVertexPosition(i,new T.Vector3());
 const before=Array.from({length:count},(_,i)=>point(i));
 setModularMuscle(meshes,1);for(let i=0;i<count;i++)assert.ok(before[i].distanceTo(point(i))<1e-6);
 setModularMuscle(meshes,1.3);
 const delta=arms.geometry.morphAttributes.position[arms.morphTargetDictionary.muscleLarge];let changed=0,pinned=0;
 for(let i=0;i<count;i++){const d=new T.Vector3().fromBufferAttribute(delta,i);if(d.length()<1e-7){pinned++;assert.ok(before[i].distanceTo(point(i))<1e-6,'seam moved');}else if(before[i].distanceTo(point(i))>.001)changed++;}
 assert.ok(pinned>=16,'expected shoulder/elbow seam vertices');assert.ok(changed>16,'muscle must visibly change');
 setModularMuscle(meshes,.8);setModularMuscle(meshes,1);
 assert.deepEqual(Array.from(arms.geometry.attributes.position.array),base);
 for(let i=0;i<count;i++)assert.ok(before[i].distanceTo(point(i))<1e-6);
 assert.deepEqual(Object.keys(FACE_EXPRESSIONS),['neutral','happy','angry','talkA','talkB','surprised','sad']);
});
test('shared recipes swap hair and equipment without changing skeleton or clip identities',async()=>{
 const g=await output(),meshes=[];g.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});const skeleton=meshes[0].skeleton,clips=g.animations.map(c=>c.name);
 for(const preset of Object.values(MODULAR_RECIPES))for(const hair of ['swept','afro','bun','braids','none']){
  const r=applyModularRecipe(meshes,{...preset,hair});
  const visible=meshes.filter(m=>m.userData.slot==='hair'&&m.visible);
  assert.equal(visible.length,hair==='none'?0:1);assert.ok(visible.every(m=>m.userData.variant===hair));
  assert.equal(meshes.find(m=>m.userData.slot==='cape').visible,r.cape);
  assert.equal(meshes.find(m=>m.userData.slot==='vest').visible,r.armor);
  assert.equal(meshes[0].skeleton,skeleton);assert.deepEqual(g.animations.map(c=>c.name),clips);
 }
});
test('portable recipe validates colors, size, attachments and frame before applying',()=>{
 const raw={schema:1,skeleton:'ual-deform-v1',body:'faceted-v1',...MODULAR_RECIPES.scout,eyepatch:true,eyeGlow:true,eyeColor:'#f2ce71',size:.85};
 const r=validateModularRecipe(JSON.parse(JSON.stringify(raw)));assert.equal(r.eyepatch,true);assert.equal(r.frame,'agile');assert.equal(r.eyeColor,'#f2ce71');assert.equal(r.size,.85);
 for(const change of [{frame:'invalid'},{size:NaN},{skin:'not-a-color'},{hair:'unknown'},{muscle:9},{visor:'yes'}])assert.throws(()=>validateModularRecipe({...raw,...change}));
});

test('Vegas stays bald and capeless; female insignia and robe modules preserve fitted surfaces',async()=>{
 const g=await output(),meshes=[];g.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});
 applyModularRecipe(meshes,MODULAR_RECIPES.vegas);
 assert.equal(MODULAR_RECIPES.vegas.hair,'none');assert.equal(MODULAR_RECIPES.vegas.cape,false);
 assert.ok(meshes.filter(m=>['hair','cape'].includes(m.userData.slot)).every(m=>!m.visible));
 applyModularRecipe(meshes,MODULAR_RECIPES.mage);
 for(const slot of ['robe','sleeves','collar'])assert.ok(meshes.some(m=>m.userData.slot===slot&&m.visible),slot);
 assert.ok(meshes.filter(m=>m.userData.slot==='gauntlets').every(m=>!m.visible),'sleeves replace overlapping gauntlets');
 const patch=meshes.find(m=>m.userData.slot==='emblem');assert.equal(patch.morphTargetInfluences[patch.morphTargetDictionary.waistNarrow],1);
 for(const source of [MODULAR_RECIPES.mage,MODULAR_RECIPES.vegas]){const r=validateModularRecipe({schema:1,skeleton:'ual-deform-v1',body:'faceted-v1',...source});assert.equal(r.cape,source.cape);assert.equal(r.hair,source.hair);}
});
test('base anatomy has no compulsory gear; glove styles and body-wide muscle are independent',async()=>{
 const g=await output(),meshes=[];g.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});applyModularRecipe(meshes,MODULAR_RECIPES.base);
 for(const slot of ['cape','gauntlets','knees','belt','shoulders','backpack'])assert.ok(meshes.filter(m=>m.userData.slot===slot).every(m=>!m.visible),slot);
 for(const glove of ['bare','full','fingerless']){applyModularRecipe(meshes,{...MODULAR_RECIPES.base,gloves:glove,gloveColor:'#123456'});for(const m of meshes.filter(m=>['hands','handTips'].includes(m.userData.slot)))assert.equal('#'+m.material.color.getHexString(),glove==='bare'||(glove==='fingerless'&&m.userData.slot==='handTips')?MODULAR_RECIPES.base.skin:'#123456');}
 setModularMuscle(meshes,1.3);for(const slot of ['torso','deltoids','arms'])assert.ok(meshes.filter(m=>m.userData.slot===slot).some(m=>m.morphTargetInfluences[m.morphTargetDictionary.muscleLarge]>.99),slot);
 const cape=meshes.find(m=>m.userData.slot==='cape');for(const speed of [0,80,999]){animateModularCape(meshes,3,speed);assert.ok(cape.morphTargetInfluences[cape.morphTargetDictionary.capeBend]<=.4);}
});

test('modular body preserves native interaction and jump owners instead of replacing them with idle',async()=>{
 const def=structuredClone(ROSTER.find(d=>d.id==='vega'));const f=new Fighter(def);f._animate(0);
 const c=await loadModularCharacter(f,{load:output});
 const arm=c.actor.getObjectByName(T.PropertyBinding.sanitizeNodeName('DEF-upper_arm.L'));
 for(const state of [{_firearmReload:{elapsed:.5}},{_throwAction:{elapsed:.2}}, {hanging:{}},{_grapple:{zip:true}},{_carry:{}},{_jumpMotion:{applied:true,mode:'fall'}},{meleeCharge:.5},{crouching:true}]){
  Object.assign(f,state);f.parts.armR.rotation.x=-1.2;f.obj.updateMatrixWorld(true);c.update();const first=arm.quaternion.clone();
  f.parts.armR.rotation.x=-2;f.obj.updateMatrixWorld(true);c.update();assert.ok(first.angleTo(arm.quaternion)>.4,JSON.stringify(state)+' discarded native pose');
  for(const key of Object.keys(state))f[key]=null;
 }
 f.dispose();
});

test('hollow infection changes exposed skin, preserves complexion differences and reverses cleanly',async()=>{
 const g=await output(),meshes=[];g.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});
 const head=meshes.find(m=>m.userData.slot==='head'&&m.material.name==='skin');assert.ok(head);
 const recipe={...MODULAR_RECIPES.base,skin:'#633b28',infection:'none'};
 applyModularRecipe(meshes,recipe);const normal=head.material.color.clone();
 applyModularRecipe(meshes,{...recipe,infection:'hollow'});const infected=head.material.color.clone();assert.notEqual(normal.getHex(),infected.getHex());
 applyModularRecipe(meshes,{...recipe,skin:'#e0b895',infection:'hollow'});assert.notEqual(head.material.color.getHex(),infected.getHex());
 applyModularRecipe(meshes,recipe);assert.equal(head.material.color.getHex(),normal.getHex());
});

test('contact-driven strikes retain selected native arm through ground and air phases',async()=>{
 const def=structuredClone(ROSTER.find(d=>d.id==='vega'));const f=new Fighter(def);f._animate(0);
 const c=await loadModularCharacter(f,{load:output});
 const arm=c.actor.getObjectByName(T.PropertyBinding.sanitizeNodeName('DEF-upper_arm.L'));
 for(const flying of [false,true])for(const id of ['jab','cross','power'])for(const phase of ['startup','active','recover']){
  f.flying=flying;f.mId=id;f.mstate=phase;f.mT=.04;f._meleeMotion={side:1,point:new T.Vector3(0,5,8)};
  f.parts.armR.rotation.x=-1.2;f.obj.updateMatrixWorld(true);c.update();const first=arm.quaternion.clone();
  f.parts.armR.rotation.x=-2;f.obj.updateMatrixWorld(true);c.update();
  assert.ok(first.angleTo(arm.quaternion)>.4,`${flying?'air':'ground'} ${id} ${phase} discarded contact arm`);
 }
 f.dispose();
});
