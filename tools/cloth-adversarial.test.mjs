import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {clothFall} from './helpers/cloth-fall.mjs';
import {trunkProbe} from './helpers/trunk-probe.mjs';

for(const spec of [
 {name:'stock seed31',hz:60,seed:31},
 {name:'short broad seed99 platform',hz:30,seed:99,frame:{scale:.65,bulk:1.65,head:1.4,neck:1.6,broad:1.6,stance:1.4},cover:[{x:52,z:3,hx:4,hz:4,top:4}]},
])test(`${spec.name}: every rendered fall frame clears actual core surfaces`,()=>{
 const {f,rag,world}=clothFall(spec);try{
  const cape=f.parts.cape,index=cape.geometry.index,meshes=[f.parts.torso,f.parts.pelvis,f.parts.head],probes=meshes.map(trunkProbe);
  const inspect=frame=>{
   f.obj.updateMatrixWorld(true);
   const a=cape.geometry.attributes.position,v=Array.from({length:a.count},(_,i)=>new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(cape.matrixWorld)),inverses=meshes.map(m=>m.matrixWorld.clone().invert());
   for(let i=0;i<index.count;i+=3){
    const points=[0,1,2].map(k=>v[index.getX(i+k)]);
    for(const w of [[1/3,1/3,1/3],[.5,.5,0],[.5,0,.5],[0,.5,.5]]){
     const p=new T.Vector3();for(let k=0;k<3;k++)p.addScaledVector(points[k],w[k]);
     for(let k=0;k<meshes.length;k++)assert.ok(!probes[k](p,inverses[k]),`${spec.name}: face ${i/3} intersects ${['torso','pelvis','head'][k]} at ${frame}`);
    }
   }
  };
  inspect('entry');
  for(let frame=0;frame<spec.hz*6;frame++){rag.step(1/spec.hz,{world});rag.apply(f);inspect(frame);}
 }finally{f.dispose();}
});

test('stock seed31 at120Hz: contact cycling cannot keep landed cloth awake',()=>{
 const {f,rag,world}=clothFall({seed:31});try{
  for(let i=0;i<120*15;i++){rag.step(1/120,{world});rag.apply(f);}
  assert.ok(rag.asleep,'fixture body is not at rest');
  assert.ok(rag.capePose.asleep,'rotated head/trunk contacts keep settled cloth solving');
  const version=f.parts.cape.geometry.attributes.position.version;
  for(let i=0;i<120;i++){rag.step(1/120,{world});rag.apply(f);}
  assert.equal(f.parts.cape.geometry.attributes.position.version,version);
 }finally{f.dispose();}
});
