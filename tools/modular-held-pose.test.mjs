import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {solveModularArm,modularHoldTarget,animateModularHeldGrip} from '../src/engine/modular-held-pose.js';
globalThis.ProgressEvent??=class{};
async function rig(scale=5){const b=await fs.readFile('public/models/modular-hero/modular-hero.glb'),g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');g.scene.scale.setScalar(scale);g.scene.updateMatrixWorld(true);return g.scene;}
const wp=(a,n)=>a.getObjectByName(n).getWorldPosition(new T.Vector3());
test('real modular arm reaches targets without changing bone lengths or root at production scales',async()=>{
 for(const scale of [4,5,6])for(const side of ['L','R']){const a=await rig(scale),s=wp(a,'DEF-upper_arm'+side),e=wp(a,'DEF-forearm'+side),w=wp(a,'DEF-hand'+side),lengths=[s.distanceTo(e),e.distanceTo(w)],root=a.position.clone();
 for(const fraction of [.25,.5,.75,1]){const target=s.clone().add(new T.Vector3(side==='L'?.15:-.15,.08,.3+fraction*.1).multiplyScalar(scale));const result=solveModularArm(a,side,target);assert.ok(result.gap<1e-5);assert.ok(Math.abs(wp(a,'DEF-upper_arm'+side).distanceTo(wp(a,'DEF-forearm'+side))-lengths[0])<1e-5);assert.ok(Math.abs(wp(a,'DEF-forearm'+side).distanceTo(wp(a,'DEF-hand'+side))-lengths[1])<1e-5);assert.ok(a.position.equals(root));}
 const far=s.clone().add(new T.Vector3(0,0,100));assert.equal(solveModularArm(a,side,far).reachable,false);
 }
});
test('rear hold preserves free hand and contacts actual receiver neck; friendly targets underarms',async()=>{
 const a=await rig(),b=await rig();b.position.z=1;b.updateMatrixWorld(true);const v={_modularCharacter:{actor:b}},f={grabbing:v,grabState:'clinch',grabMode:'back'};v.grabbedBy=f;
 f._clinchPunch={t:.1};const free=a.getObjectByName('DEF-upper_armL').quaternion.clone();animateModularHeldGrip(f,a);assert.ok(a.getObjectByName('DEF-upper_armL').quaternion.equals(free));delete f._clinchPunch;
 const neck=wp(b,'DEF-neck'),n=modularHoldTarget(v,'R',false);assert.ok(n.distanceTo(neck)<.55);
 const armpit=modularHoldTarget(v,'R',true),shoulder=wp(b,'DEF-upper_armR');assert.ok(armpit.y<shoulder.y);assert.ok(armpit.distanceTo(shoulder)<.4);
 f._combatAim={armChannels:[{weight:1}]};const q=a.getObjectByName('DEF-upper_armR').quaternion.clone();animateModularHeldGrip(f,a);assert.ok(a.getObjectByName('DEF-upper_armR').quaternion.equals(q));
});
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {loadModularCharacter} from '../src/engine/modular-character.js';
import {heldPairDistance} from '../src/engine/person-carry.js';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
const coreBounds=f=>{const box=new T.Box3();f._modularCharacter.actor.traverse(o=>{if(o.isSkinnedMesh&&/moduletorso|modulewaist/.test(o.name)){o.skeleton.update();for(let i=0;i<o.geometry.attributes.position.count;i++)box.expandByPoint(o.getVertexPosition(i,new T.Vector3()).applyMatrix4(o.matrixWorld));}});assert.ok(!box.isEmpty(),'core clearance test needs rendered torso/waist vertices');return box;};
for(const partner of ['merc','vega','rage'])test(`native pair ${partner} closes modular contacts without intersecting core bodies`,async()=>{
 const x=mainCombatFixture({mode:'powerworld',hero:'vega'});
 try{const v=new Fighter(structuredClone(ROSTER.find(d=>d.id===partner))),f=x.p;x.g.entities.push(v);x.g.scene.add(v.obj);v._game=x.g;f.grabbing=v;v.grabbedBy=f;f.grabState='clinch';f.grabMode='back';f.poseGrab=1;
 const load=async()=>{const b=await fs.readFile('public/models/modular-hero/modular-hero.glb');return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
 for(const actor of [v,f]){actor.def={...actor.def,model:{...actor.def.model,body:'faceted-v1'}};await loadModularCharacter(actor,{load});}
 for(const mode of ['back','friendly','front'])for(const time of [0,.25,.5,.75,1]){
  f.grabMode=mode;v.pos.set(0,mode==='friendly'?1.8:0,heldPairDistance(f,v));v.faceDir(0,mode==='front'?-1:1);f.animT=v.animT=time;
  const a=f.pos.clone(),b=v.pos.clone();f._animate(0);v._animate(0);f._modularCharacter.syncHeldContact();
  const target=modularHoldTarget(v,'R',mode==='friendly',new T.Vector3(),mode==='back');
  const hand=wp(f._modularCharacter.actor,'DEF-handR'),shoulder=wp(f._modularCharacter.actor,'DEF-upper_armR'),elbow=wp(f._modularCharacter.actor,'DEF-forearmR');
  assert.ok(hand.distanceTo(target)<.05,`${partner} ${mode} ${time}: contact gap ${hand.distanceTo(target)}`);
  assert.ok(!coreBounds(f).intersectsBox(coreBounds(v)),`${partner} ${mode} ${time}: core bodies overlap`);
  assert.ok(f.pos.equals(a)&&v.pos.equals(b),'contact pose moved collision roots');
 }
 v.stunT=1;f.grabMode='back';v._animate(0);
 const neckY=wp(v._modularCharacter.actor,'DEF-neck').y;
 for(const side of ['L','R'])assert.ok(wp(v._modularCharacter.actor,'DEF-hand'+side).y<neckY-.8,'stunned receiver must not pry at the neck');
 }finally{x.close();}
});
