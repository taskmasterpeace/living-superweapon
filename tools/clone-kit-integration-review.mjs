// CPU-only independent integration witness. Uses the shipped GLB and production
// loadCloneEquipment, Fighter poses, KO and disposal. No runtime source writes.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Fighter} from '../src/engine/entity.js';
import {FrontlineEncounter} from '../src/engine/frontline-encounter.js';
import {loadCloneEquipment} from '../src/engine/clone-equipment.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {ROSTER} from '../src/data/characters.js';
import {runSlot} from '../src/engine/abilities.js';
import {updateHeroSkin} from '../src/engine/hero-skin.js';
const candidate=process.argv.includes('--v3'),asset=candidate?'assets-src/frontline-clone-kit/v3/clone-kit.glb':'public/models/frontline/clone-kit.glb';
const outputArg=process.argv.find(a=>a.startsWith('--output='));
const out=outputArg?outputArg.slice(9):'assets-src/frontline-clone-kit/'+(candidate?'v3/':'')+'integration-review';await mkdir(out,{recursive:true});
const bytes=await readFile(asset);if(!candidate)assert.deepEqual(bytes,await readFile('assets-src/frontline-clone-kit/v3/clone-kit.glb'));
const load=()=>new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const scene=new T.Scene(),world={scene,cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){},waterAt:()=>null};
const combat=new StudioCombat(scene,world),g=combat.game;g.entities=[];g.player=new Fighter(ROSTER[0]);g.player.pos.set(-40,0,-40);
g.addFighter=(def,opts)=>{const f=new Fighter(def,opts);g.entities.push(f);scene.add(f.obj);return f;};
const encounter=new FrontlineEncounter(g);await loadCloneEquipment(encounter,{loader:{loadAsync:load}});const f=encounter.soldiers[0];f._game=g;
const report={kind:'Independent CPU integration review; staged simulation/pose fixtures, not live play',candidate,asset,assetSha256:createHash('sha256').update(bytes).digest('hex'),poses:[],lifecycle:{},snapshots:[]};
const kit=f=>[f.parts.head.getObjectByName('clone_helmet_head'),f.parts.torso.getObjectByName('clone_vest_torso')];
const resources=f=>{const set=new Set();for(const root of kit(f))root.traverse(o=>{if(o.isMesh){assert.ok(!Array.isArray(o.material));set.add(o.geometry);set.add(o.material);}});return set;};
const own=resources(f),other=resources(encounter.soldiers[1]);assert.ok([...own].every(r=>!other.has(r)));let disposed=0;for(const r of own)r.addEventListener('dispose',()=>disposed++);
report.support=kit(f).map(root=>({name:root.name,hullVertices:(root.userData.ragdollSupport?.length||0)/3}));
assert.ok(report.support.every(r=>r.hullVertices>0),'Production loader caches actual attachment hulls');
report.maxHullSupportError=0;
for(const root of kit(f)){
 root.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert(),vertices=[],hull=[];
 root.traverse(m=>{if(m.isMesh)for(let i=0;i<m.geometry.attributes.position.count;i++)vertices.push(new T.Vector3().fromBufferAttribute(m.geometry.attributes.position,i).applyMatrix4(m.matrixWorld).applyMatrix4(inverse));});
 for(let i=0;i<root.userData.ragdollSupport.length;i+=3)hull.push(new T.Vector3().fromArray(root.userData.ragdollSupport,i));
 for(let i=0;i<96;i++){const direction=new T.Vector3(Math.sin(i*1.31),Math.cos(i*.79),Math.sin(i*.47+.3)).normalize();
  const error=Math.abs(Math.max(...vertices.map(p=>p.dot(direction)))-Math.max(...hull.map(p=>p.dot(direction))));report.maxHullSupportError=Math.max(report.maxHullSupportError,error);
 }
}
assert.ok(report.maxHullSupportError<1e-5,'Cached convex vertices preserve actual rendered directional support');
function step(mode,dt=1/60){g.time+=dt;f.animT+=dt;f.slots.lmb.cd=Math.max(0,f.slots.lmb.cd-dt);f.ki=Math.min(f.maxKi,f.ki+dt*8);f.guarding=mode==='guard';f.poseGuard=f.guarding?1:0;f.vel.set(mode==='idle'?0:8,0,mode==='idle'?0:8);if(mode==='fire')runSlot(f,'lmb',{pressed:false,held:true,released:false,dt},g);f.advanceActionPose(dt);f._animate(dt);f.obj.updateMatrixWorld(true);}
f.pos.set(0,0,0);f.obj.position.copy(f.pos);f.gait='grounded';f.hasAimWorld=true;f.animT=0;
const point=new T.Vector3();
function snapshot(name){
 const record={name,meshes:[],head:f.parts.head.matrixWorld.toArray(),torso:f.parts.torso.matrixWorld.toArray(),rifleActive:!!f._riflePose?.active,headParent:kit(f)[0].parent===f.parts.head,torsoParent:kit(f)[1].parent===f.parts.torso,cowlVisible:f.parts.cowl.visible,hairVisible:f.parts.head.getObjectByName('hair-back')?.visible,harnessVisible:f.parts.torso.getObjectByName('field-torso_harness')?.visible};
 const chosen=[],seen=new Set(),add=(m,group)=>{if(!m?.isMesh||seen.has(m))return;seen.add(m);chosen.push({m,group});};
 for(const m of f.parts.skin.meshes)add(m,'body');
 for(const root of kit(f))root.traverse(m=>add(m,root.name));
 for(const side of ['L','R'])f.parts['arm'+side].children[1].traverse(m=>{if(m.layers.mask&1)add(m,'forearm');});f.obj.getObjectByName('weapon-rifle').traverse(m=>add(m,'rifle'));
 for(const {m,group}of chosen){const old=Array.from(m.geometry.index?.array||Array.from({length:m.geometry.attributes.position.count},(_,i)=>i)),used=[...new Set(old)],map=new Map(used.map((n,i)=>[n,i])),position=[],trunk=[],arm=[];
  for(const i of used){m.getVertexPosition(i,point).applyMatrix4(m.matrixWorld);position.push(...point.toArray().map(v=>+v.toFixed(6)));let weight=0,armWeight=0;if(m.isSkinnedMesh)for(let j=0;j<4;j++){const name=m.skeleton.bones[m.geometry.attributes.skinIndex.getComponent(i,j)].name,w=m.geometry.attributes.skinWeight.getComponent(i,j);if(/root|pelvis|spine|clavicle/.test(name))weight+=w;if(/upperarm|lowerarm|hand|index|middle|ring|pinky|thumb/.test(name))armWeight+=w;}trunk.push(+weight.toFixed(4));arm.push(+armWeight.toFixed(4));}
  record.meshes.push({name:m.name,group,position,index:old.map(i=>map.get(i)),trunk,arm});
 }
 record.kitFloorMin=Math.min(...record.meshes.filter(m=>m.group.startsWith('clone_')).flatMap(m=>m.position.filter((_,i)=>i%3===1)));
 report.snapshots.push(record);report.poses.push(Object.fromEntries(Object.entries(record).filter(([k])=>k!=='meshes')));
}
for(const target of [[0,7,40],[0,80,15],[0,0,12],[20,12,18],[-20,18,18]]){
 f.aimWorld.fromArray(target);f.aim3.copy(f.aimWorld).sub(f.pos).normalize();f.facing=Math.atan2(target[0],target[2]);f.aim.set(Math.sin(f.facing),0,Math.cos(f.facing));
 for(let i=0;i<90;i++)step('fire');snapshot('aim-'+target.join(','));
}
f.aimWorld.set(0,7,40);f.aim3.set(0,0,1);f.facing=0;f.aim.set(0,0,1);for(let i=0;i<60;i++)step('fire');
for(const mode of ['guard','idle']){for(let i=0;i<60;i++)step(mode);snapshot(mode);}
f.staggerT=.7;for(let i=0;i<15;i++)step('idle');snapshot('stagger');f.staggerT=0;for(let i=0;i<60;i++)step('fire');snapshot('recovery');
// Seeded native death/physics. Randomness is local to this CPU fixture only.
const random=Math.random;let seed=1701;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
try{f.vel.set(14,3,22);f._ko();for(let i=0;i<240;i++){f.ragdoll.step(1/60,g);f.ragdoll.apply(f);updateHeroSkin(f.parts);f.obj.updateMatrixWorld(true);if([0,14,59,119,239].includes(i))snapshot('ragdoll-'+i);}}finally{Math.random=random;}
assert.ok(report.poses.every(p=>p.headParent&&p.torsoParent&&!p.cowlVisible&&!p.hairVisible&&!p.harnessVisible));
report.lifecycle.resources=own.size;f.obj.removeFromParent();f.dispose();report.lifecycle.disposed=disposed;assert.equal(disposed,own.size);assert.equal(encounter.soldiers[1]._formDisposed,false);
report.lifecycle.perFighterResources=true;report.lifecycle.shippingBytesMatch=!candidate;
await writeFile(out+'/snapshots.json',JSON.stringify(report.snapshots));delete report.snapshots;await writeFile(out+'/integration.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
encounter.dispose();g.player.dispose();combat.dispose();
