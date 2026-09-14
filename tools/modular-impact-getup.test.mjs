import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';import {loadModularCharacter} from '../src/engine/modular-character.js';import {beginImpactRecovery,poseImpactRecovery} from '../src/engine/impact-recovery.js';
globalThis.ProgressEvent??=class{};
test('actual modular recovery plants source hand, raises hips, preserves root and blends to native end',async()=>{
 const x=mainCombatFixture({hero:'sol',mode:'powerworld'});try{
 const f=x.p,bytes=await fs.readFile('public/models/modular-hero/modular-hero.glb');f.def={...f.def,model:{...f.def.model,body:'faceted-v1'}};
 const c=await loadModularCharacter(f,{load:()=>new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')});beginImpactRecovery(f);
 const root=f.pos.clone(),rotation=f.obj.quaternion.clone(),samples=[];
 f.stunT=1;f._impactRecovery.contactAge=.2;poseImpactRecovery(f);c.update();
 const heldHead=c.actor.getObjectByName('DEF-head').getWorldPosition(new T.Vector3());
 f.stunT=0;f._impactRecovery.elapsed=.1;poseImpactRecovery(f);c.update();
 assert.ok(c.actor.getObjectByName('DEF-head').getWorldPosition(new T.Vector3()).distanceTo(heldHead)<1e-5,'status release reversed the supported source pose');

 for(const u of [0,.25,.5,.75,1]){f._impactRecovery.elapsed=.25+.85*u;f._impactRecovery.contactAge=.25+.85*u;poseImpactRecovery(f);c.update();const at=n=>c.actor.getObjectByName(T.PropertyBinding.sanitizeNodeName(n)).getWorldPosition(new T.Vector3());samples.push({hip:at('DEF-hips'),hand:at('DEF-hand.L')});assert.ok(f.pos.equals(root));assert.ok(f.obj.quaternion.equals(rotation));}
 const scale=c.actor.scale.y;assert.ok(samples[0].hand.y-f.pos.y<.1*scale,'initial hand not on ground');assert.ok(samples[1].hand.y-f.pos.y<.1*scale,'support hand leaves ground too soon');assert.ok(samples[2].hip.y>samples[0].hip.y+.2*scale,'hips never lift from planted support');
 const end=[];c.actor.traverse(o=>{if(o.isBone)end.push([o,o.position.clone(),o.quaternion.clone()]);});f._impactRecovery=null;c.update();for(const [o,p,q]of end){assert.ok(o.position.distanceTo(p)<1e-5);assert.ok(o.quaternion.clone().normalize().angleTo(q.clone().normalize())<1e-5,o.name+' end snaps '+o.quaternion.angleTo(q));}
 }finally{x.close();}
});
