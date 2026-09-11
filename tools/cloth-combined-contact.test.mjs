import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {clothFall} from './helpers/cloth-fall.mjs';
import {trunkProbe} from './helpers/trunk-probe.mjs';

// Inspect body and cover in the SAME frame. Separate surface suites can each
// pass while a correction for one obstacle invalidates the other.
const wall={x:45,z:0,hx:.15,hz:30,top:80};
const platform={x:52,z:3,hx:4,hz:4,top:4};
const broad=scale=>({scale,bulk:1.65,head:1.4,neck:1.6,broad:1.6,stance:1.4});
const fixtures=[];
for(const hz of [30,60,120]){
 for(const [name,frame] of [['stock',undefined],['tall',broad(1.5)]])for(const [obstacle,cover] of [['wall',wall],['platform',platform]])fixtures.push({name:`${name} fixed ${obstacle}${hz}`,seed:null,hz,frame,cover:[cover]});
 fixtures.push({name:`stock31 platform${hz}`,seed:31,hz,cover:[platform]},{name:`short99 platform${hz}`,seed:99,hz,frame:broad(.65),cover:[platform]});
}
for(const spec of fixtures)test(`${spec.name}: cloth samples clear actual body and cover together on every frame`,()=>{
 const {f,rag,world}=clothFall(spec);try{
  const cape=f.parts.cape,index=cape.geometry.index,meshes=[f.parts.torso,f.parts.pelvis,f.parts.head],probes=meshes.map(trunkProbe);
  const boxes=spec.cover.map(c=>new T.Box3(new T.Vector3(c.x-c.hx,0,c.z-c.hz),new T.Vector3(c.x+c.hx,c.top,c.z+c.hz)));
  const a=cape.geometry.attributes.position,vertices=Array.from({length:a.count},()=>new T.Vector3()),inverses=meshes.map(()=>new T.Matrix4()),sample=new T.Vector3();
  for(let frame=0;frame<spec.hz*5;frame++){
   rag.step(1/spec.hz,{world});rag.apply(f);f.obj.updateMatrixWorld(true);
   for(let i=0;i<a.count;i++)vertices[i].fromBufferAttribute(a,i).applyMatrix4(cape.matrixWorld);
   for(let i=0;i<meshes.length;i++)inverses[i].copy(meshes[i].matrixWorld).invert();
   for(let i=0;i<index.count;i+=3){
    const v=[0,1,2].map(k=>vertices[index.getX(i+k)]);
    for(const w of [[1/3,1/3,1/3],[.5,.5,0],[.5,0,.5],[0,.5,.5]]){
     sample.set(0,0,0);for(let k=0;k<3;k++)sample.addScaledVector(v[k],w[k]);
     for(let k=0;k<meshes.length;k++)assert.ok(!probes[k](sample,inverses[k]),`frame ${frame} face ${i/3} inside ${['torso','pelvis','head'][k]}`);
     for(const box of boxes)assert.ok(!box.containsPoint(sample),`frame ${frame} face ${i/3} inside cover`);
    }
   }
  }
 }finally{f.dispose();}
});
