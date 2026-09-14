import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createModularWeaponPreview} from '../src/engine/modular-weapon-preview.js';

globalThis.ProgressEvent??=class{constructor(type,data){Object.assign(this,{type},data);}};
test('all shield plates hang upright outside the authored idle fist, with a rear palm grip',async()=>{
  const bytes=await fs.readFile('public/models/modular-hero/modular-hero.glb');
  const {scene:actor,animations}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const preview=createModularWeaponPreview(actor),mixer=new T.AnimationMixer(actor);
  const clip=animations.find(c=>c.name==='Idle_Loop');
  mixer.clipAction(clip).play();
  for(const phase of [0,.25,.5,.75,.99]){
    mixer.setTime(clip.duration*phase);
    for(const style of ['round','kite','riot']){
      preview.set({shield:true,shieldStyle:style});actor.updateMatrixWorld(true);
      const shield=preview.shield,hand=shield.parent;
      const normal=new T.Vector3(0,0,-1).transformDirection(shield.matrixWorld);
      const up=new T.Vector3(0,1,0).transformDirection(shield.matrixWorld);
      assert.ok(normal.x>.8,'shield front faces outward from the actor');
      assert.ok(Math.abs(normal.y)<.35,'plate normal is horizontal, not a tray');
      assert.ok(up.y>.8,'kite point / riot window retain upright orientation');
      const palm=hand.localToWorld(new T.Vector3(0,.075,.028));
      assert.ok(shield.children[0].getWorldPosition(new T.Vector3()).distanceTo(palm)<1e-7);
      const gripAxis=new T.Vector3(0,1,0).transformDirection(shield.children[0].matrixWorld);
      assert.ok(Math.abs(gripAxis.dot(new T.Vector3(0,0,1).transformDirection(hand.matrixWorld)))>.999);
      const plate=style==='round'?shield.children[1]:shield.children[style==='kite'?4:5].children[0];
      const offset=plate.getWorldPosition(new T.Vector3()).sub(palm);
      assert.ok(offset.dot(normal)>.07,'hand stays on the rear of the plate');
      for(const kind of ['sword','bat']){
        assert.deepEqual(preview.weapons[kind].position.toArray(),[0,.075,.028]);
        assert.equal(preview.weapons[kind].rotation.x,Math.PI/2);
      }
    }
  }
  preview.dispose();
});
