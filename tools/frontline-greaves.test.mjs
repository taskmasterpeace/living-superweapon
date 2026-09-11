import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {Ragdoll} from '../src/engine/ragdoll.js';
import {updateHeroSkin} from '../src/engine/hero-skin.js';
import {Game} from '../src/engine/game.js';
import {possess,releasePossession} from '../src/engine/systems2.js';

const make=(model={},frame)=>new Fighter({...structuredClone(ROSTER.find(d=>d.id==='vega')),model:{surface:'field',body:'superhero-male',costume:'plated',...model},...(frame?{frame}:{})});
const greaves=f=>['L','R'].map(side=>f.parts['leg'+side].userData.shin.getObjectByName('field-greave_'+side));
const pieces=root=>{const result=[];root.traverse(o=>{if(o.isMesh)result.push(o);});return result;};

test('greaves mount synchronously below existing shin drivers without altering leg or arm contracts',()=>{
 const f=make();try{
  const roots=greaves(f);assert.ok(roots.every(Boolean),'field source-male must equip both authored greaves');
  let triangles=0;for(const [i,leg]of [f.parts.legL,f.parts.legR].entries()){
   const {shin,knee,boot,kneeCap,thigh}=leg.userData,root=roots[i];
   assert.equal(root.parent,shin);assert.equal(shin.parent,knee);assert.equal(boot.parent,knee);assert.equal(kneeCap.parent,knee);assert.equal(thigh.parent,leg);
   assert.equal(root.userData.heroGear,true);assert.deepEqual(root.position.toArray(),[0,0,0]);assert.deepEqual(root.scale.toArray(),[1,1,1]);
   const meshes=pieces(root);assert.equal(meshes.length,3);for(const mesh of meshes){assert.equal(mesh.layers.isEnabled(0),true);assert.ok(mesh.material.isMaterial&&!Array.isArray(mesh.material));assert.ok(mesh.castShadow&&mesh.receiveShadow);triangles+=mesh.geometry.index.count/3;}
   assert.equal(root.material,f.parts.mats.armor);assert.ok(root.geometry.getAttribute('fieldWear'));assert.equal(root.material.defaultAttributeValues.fieldWear[0],1);
  }
  assert.equal(triangles,3952);for(const arm of [f.parts.armL,f.parts.armR])assert.ok(arm.children[2].morphTargetInfluences);
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};roots[0].material.onBeforeCompile(shader);
  assert.equal(shader.uniforms.uRimK,f.parts.mats.armor._rimU.uRimK);assert.equal(shader.uniforms.uCloseAmount,f.parts.foreground.uniforms.uCloseAmount);
 }finally{f.dispose();}
});

test('greaves are field/source-male modules, not an implicit change to standard or other body sources',()=>{
 const current=make();try{assert.ok(greaves(current)[0],'positive gate must exist');}finally{current.dispose();}
 for(const model of [{surface:'standard'},{body:'procedural'},{body:'superhero-female'}]){const f=make(model);try{assert.ok(greaves(f).every(v=>v===undefined));}finally{f.dispose();}}
});

test('owned greave geometry retires once and native decoy/possession materials stay scalar',()=>{
 const caster=make(),victim=make({surface:'standard'});try{
  assert.ok(greaves(caster).every(Boolean));const geometries=greaves(caster).flatMap(pieces).map(o=>o.geometry),materials=new Set(greaves(caster).flatMap(pieces).map(o=>o.material));
  const disposed=new Map();for(const resource of [...geometries,...materials])resource.addEventListener('dispose',()=>disposed.set(resource,(disposed.get(resource)||0)+1));
  const game={scene:new THREE.Scene(),time:0,humans:[{fighter:caster}],player:caster,isHuman:f=>f===caster,vfx:{ring(){},flash(){}},audio:{teleport(){}}};
  const decoy=Game.prototype.spawnDecoy.call(game,caster,.1);let count=0;
  decoy.grp.traverse(o=>{if(o.name.startsWith('field-greave_')){count++;assert.ok(o.material.isMaterial);assert.equal(o.material.opacity,.62);}});assert.equal(count,6);
  Game.prototype.updateDecoys.call(game,.2);assert.equal(possess(caster,victim,.1,game),true);releasePossession(caster,game);assert.equal(caster.parts.mats.armor.opacity,1);
  caster.dispose();for(const resource of [...geometries,...materials])assert.equal(disposed.get(resource),1);
 }finally{caster.dispose();victim.dispose();}
});

function surfaceTriangles(f,shin,side){
 const mesh=f.parts.skin.meshes.find(m=>m.name==='hero-skin-body'),g=mesh.geometry,inv=shin.matrixWorld.clone().invert(),points=[];mesh.skeleton.update();
 for(let i=0;i<g.attributes.position.count;i++)points.push(mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld).applyMatrix4(inv));
 const triangles=[];for(let i=0;i<g.index.count;i+=3){const ids=[g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)];if(ids.every(j=>g.attributes.position.getX(j)*(side==='L'?-1:1)>0&&g.attributes.position.getY(j)>.12&&g.attributes.position.getY(j)<.55))triangles.push(ids.map(j=>points[j]));}return triangles;
}
function shellTriangles(root){const g=root.geometry,p=g.attributes.position;return Array.from({length:g.index.count/3},(_,i)=>[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(p,g.index.getX(i*3+k))));}
function intersections(ray,triangles){const p=new THREE.Vector3(),distances=[];for(const [a,b,c]of triangles){if(ray.origin.y<Math.min(a.y,b.y,c.y)-1e-6||ray.origin.y>Math.max(a.y,b.y,c.y)+1e-6)continue;if(ray.intersectTriangle(a,b,c,false,p)){const d=ray.origin.distanceTo(p);if(d<1.1)distances.push(d);}}return distances;}
function fit(f){
 const result={penetration:0,gap:0,samples:0};f.obj.updateMatrixWorld(true);
 for(const side of ['L','R']){const shin=f.parts['leg'+side].userData.shin,root=greaves(f)[side==='L'?0:1],body=surfaceTriangles(f,shin,side),shell=shellTriangles(root);
  for(const y of [-.4,0,.4])for(const degrees of [-140,-100,-60,-20,20,60,100,140]){
   const angle=degrees*Math.PI/180,ray=new THREE.Ray(new THREE.Vector3(side==='L'?-.06:.06,y,-.1),new THREE.Vector3(Math.sin(angle),0,Math.cos(angle))),bodyHits=intersections(ray,body),armorHits=intersections(ray,shell);
   if(!bodyHits.length||!armorHits.length)continue;
   const skin=Math.min(...bodyHits),outer=Math.max(...armorHits),inner=Math.min(...armorHits);result.penetration=Math.max(result.penetration,skin-outer);result.gap=Math.max(result.gap,inner-skin);result.samples++;
  }
 }return result;
}

test('actual source calves stay inside seated greave plates through native poses and supported frame extremes',t=>{
 let seed=271828;t.mock.method(Math,'random',()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;});
 const frames=[{scale:1,bulk:1,broad:1,head:1,neck:1,stance:1},{scale:.65,bulk:.65,broad:.7,head:.65,neck:.6,stance:.7},{scale:1.5,bulk:1.65,broad:1.6,head:1.4,neck:1.6,stance:1.4},{scale:1.5,bulk:.65,broad:1.6,head:.65,neck:1.6,stance:.7},{scale:.65,bulk:1.65,broad:.7,head:1.4,neck:.6,stance:1.4}];
 const reports=[];
 for(const frame of frames){const f=make({},frame);try{
  assert.ok(greaves(f).every(Boolean),'authored pieces must exist before fit testing');
  const identities=[f.parts.legL.userData.shin,f.parts.legR.userData.shin,...greaves(f)];
  for(const pose of ['standing','cruise','hover','guard','deep-knee','ragdoll']){
   f.flying=pose!=='standing';f._openSky=true;f.pos.y=pose==='standing'?0:80;f.vel.set(0,0,pose==='cruise'?60:0);f.guarding=pose==='guard';
   for(let i=0;i<90;i++)f._animate(1/60);
   if(pose==='deep-knee')for(const leg of [f.parts.legL,f.parts.legR]){leg.rotation.x=-.4;leg.userData.knee.rotation.x=2.1;}
   if(pose==='ragdoll'){f.ragdoll=new Ragdoll(f);const game={world:{cover:[],heightAt:()=>0,ARENA:240},onRagdollImpact(){}};for(let i=0;i<180;i++){f.ragdoll.step(1/60,game);f.ragdoll.apply(f);}}
   updateHeroSkin(f.parts);f._sync();const measured=fit(f);reports.push({frame,pose,...measured});
   assert.ok(measured.samples>=40,`Insufficient calf coverage samples: ${JSON.stringify(reports.at(-1))}`);
   assert.ok(measured.penetration<=.03,`Garment through ceramic: ${JSON.stringify(reports.at(-1))}`);
   assert.ok(measured.gap<=.08,`Floating contact band: ${JSON.stringify(reports.at(-1))}`);
   assert.deepEqual([f.parts.legL.userData.shin,f.parts.legR.userData.shin,...greaves(f)],identities);
   for(const root of greaves(f)){assert.ok(root.matrixWorld.elements.every(Number.isFinite));assert.ok(root.matrixWorld.determinant()>0);}
   if(f.ragdoll){f.ragdoll.restore();f.ragdoll=null;}
  }
 }finally{f.ragdoll?.restore();f.dispose();}}
 console.log('GREAVE_FIT',JSON.stringify({poses:reports.length,samples:reports.reduce((s,r)=>s+r.samples,0),maxPenetration:Math.max(...reports.map(r=>r.penetration)),maxGap:Math.max(...reports.map(r=>r.gap))}));
});
