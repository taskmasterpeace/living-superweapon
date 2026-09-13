import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createModularWeaponPreview} from '../src/engine/modular-weapon-preview.js';
globalThis.ProgressEvent??=class{constructor(type,data){Object.assign(this,{type},data);}};
test('props follow the real authored palms throughout sword clips without changing hands',async()=>{
  const bytes=await fs.readFile('public/models/modular-hero/modular-hero.glb');
  const g=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const actor=g.scene,preview=createModularWeaponPreview(actor),mixer=new T.AnimationMixer(actor);
  actor.scale.setScalar(3);
  for(const name of ['Sword_Idle','Sword_Attack']){
    const clip=g.animations.find(c=>c.name===name);assert.ok(clip);
    mixer.stopAllAction();const action=mixer.clipAction(clip).setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();
    for(const phase of [0,.25,.5,.75,1]){
      mixer.setTime(clip.duration*phase);
      const bones=[];actor.traverse(o=>{if(o.isBone)bones.push([o,o.quaternion.toArray(),o.position.toArray()]);});
      for(const weapon of ['sword','bat','axe']){
        preview.set({weapon,shield:true});actor.updateMatrixWorld(true);
        for(const [prop,side] of [[preview.weapons[weapon],'R'],[preview.shield,'L']]){
          const palm=actor.getObjectByName(T.PropertyBinding.sanitizeNodeName(`DEF-hand.${side}`));
          assert.equal(prop.parent,palm);
          assert.ok(prop.getWorldPosition(new T.Vector3()).distanceTo(palm.localToWorld(new T.Vector3(0,.075,.028)))<1e-7);
          prop.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));
        }
        for(const [bone,q,p] of bones){assert.deepEqual(bone.quaternion.toArray(),q);assert.deepEqual(bone.position.toArray(),p);}
      }
    }
  }
  preview.set({weapon:'none',shield:false});assert.ok(Object.values(preview.weapons).every(w=>!w.visible));assert.equal(preview.shield.visible,false);
  const resources=new Set();for(const group of [...Object.values(preview.weapons),preview.shield])group.traverse(o=>{if(o.isMesh){resources.add(o.geometry);resources.add(o.material);}});
  let disposed=0;for(const r of resources)r.addEventListener('dispose',()=>disposed++);
  preview.dispose();preview.dispose();assert.equal(disposed,resources.size);assert.ok(Object.values(preview.weapons).every(w=>!w.parent));assert.equal(preview.shield.parent,null);
  assert.throws(()=>preview.set({weapon:'sword'}),/disposed/);
});
test('unavailable dedicated and two-handed sources are declared explicitly',()=>{
  const actor=new T.Group();for(const side of ['R','L']){const hand=new T.Bone();hand.name=T.PropertyBinding.sanitizeNodeName(`DEF-hand.${side}`);actor.add(hand);}
  const p=createModularWeaponPreview(actor);
  for(const kind of ['bat','axe']){assert.deepEqual(p.clipFamilies[kind].clips,['Sword_Idle','Sword_Attack']);assert.equal(p.clipFamilies[kind].gaps.length,2);}
  assert.throws(()=>p.set({weapon:'unknown'}),/Unknown/);assert.equal(p.state.weapon,'none');p.dispose();
});
