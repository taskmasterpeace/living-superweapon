import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

const turn=()=>new Promise(resolve=>setImmediate(resolve));
let serial=0;
async function fixture(run){
 const previous=globalThis.document,images=[];
 class Image extends EventTarget{
  constructor(){super();this.decoded=new Promise((resolve,reject)=>{this.decodeOK=resolve;this.decodeFail=reject;});}
  decode(){return this.decoded;}
  load(){this.dispatchEvent(new Event('load'));}
  fail(){this.dispatchEvent(new Event('error'));}
 }
 globalThis.document={createElementNS(_ns,tag){assert.equal(tag,'img');const image=new Image();images.push(image);return image;}};
 const api=await import(`../src/engine/hero-materials.js?readiness-test=${++serial}`),textures=new Set(),materials=[];
 const make=(body='superhero-male',surface='field')=>{
  const mats=Object.fromEntries(['suit','suit2','armor'].map(name=>[name,new THREE.MeshStandardMaterial()]));
  materials.push(...Object.values(mats));api.applyHeroSurface(mats,{body,surface});
  const root=new THREE.Group();for(const mat of Object.values(mats)){root.add(new THREE.Mesh(new THREE.BufferGeometry(),mat));for(const key of ['map','normalMap','roughnessMap','bumpMap'])if(mat[key])textures.add(mat[key]);}
  return {root,mats};
 };
 try{assert.equal(typeof api.prepareHeroSurfaces,'function','Character image loads need an explicitly awaitable readiness API');await run({api,images,make});}
 finally{for(const texture of textures)texture.dispose();for(const material of materials)material.dispose();if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
}
const complete=images=>{for(const image of images){image.load();image.decodeOK();}};

test('preparation waits for decoded images before publishing the canonical material texture',()=>fixture(async({api,images,make})=>{
 const {root,mats}=make(),texture=mats.suit.normalMap;let ready=false;
 const pending=api.prepareHeroSurfaces([root]).then(()=>{ready=true;});
 images.forEach(image=>image.load());await turn();assert.equal(ready,false);assert.equal(texture.image,null);
 images.forEach(image=>image.decodeOK());await pending;
 assert.equal(ready,true);assert.equal(texture.image,images[1]);assert.ok(texture.version>0);
 assert.equal(mats.suit.normalMap,texture);assert.equal(texture.flipY,false);assert.equal(texture.colorSpace,THREE.NoColorSpace);
}));

test('concurrent fighters and readiness calls share one load per URL',()=>fixture(async({api,images,make})=>{
 const a=make(),b=make();assert.equal(a.mats.suit.map,b.mats.suit.map);assert.equal(images.length,3);
 const first=api.prepareHeroSurfaces([a.root,b.root]),second=api.prepareHeroSurfaces([a.root],{retry:true});
 assert.equal(images.length,3,'Retry must not duplicate a pending request');complete(images);await Promise.all([first,second]);
 await api.prepareHeroSurfaces([a.root],{retry:true});assert.equal(images.length,3,'Ready textures must remain cached');
}));

test('background errors are handled and retry updates the same mounted texture in place',()=>fixture(async({api,images,make})=>{
 const {root,mats}=make(),texture=mats.suit.map,unhandled=[];const onError=e=>unhandled.push(e);process.on('unhandledRejection',onError);
 try{
  images[0].fail();complete(images.slice(1));await turn();assert.deepEqual(unhandled,[]);
  await assert.rejects(api.prepareHeroSurfaces([root]),/garment-neutral-albedo/);
  assert.equal(images.length,3,'Failure stays cached until explicitly retried');
  const pending=api.prepareHeroSurfaces([root],{retry:true});assert.equal(images.length,4);complete(images.slice(3));await pending;
  assert.equal(mats.suit.map,texture);assert.equal(texture.image,images[3]);assert.deepEqual(unhandled,[]);
 }finally{process.removeListener('unhandledRejection',onError);}
}));

test('failed unrelated profile maps and unmanaged textures cannot block selected roots',()=>fixture(async({api,images,make})=>{
 make();images.forEach(image=>image.fail());const field=make('procedural'),plain=make('procedural','standard');
 plain.mats.suit.map=new THREE.Texture();const pending=api.prepareHeroSurfaces([field.root,plain.root]);
 complete(images.slice(3));await pending;assert.equal(field.mats.suit.map.name,'technical-weave-v1');
 assert.deepEqual(field.mats.suit.map.repeat.toArray(),[16,16]);assert.equal(images.length,4);plain.mats.suit.map.dispose();
}));

test('decode failure remains actionable and can be retried',()=>fixture(async({api,images,make})=>{
 const {root}=make('procedural'),pending=api.prepareHeroSurfaces([root]);
 images[0].load();images[0].decodeFail(Error('bad image'));
 await assert.rejects(pending,/technical-weave-v1/);
 const retry=api.prepareHeroSurfaces([root],{retry:true});complete(images.slice(1));await retry;
}));

test('a concurrent retry cannot turn an already-failed preparation into premature readiness',()=>fixture(async({api,images,make})=>{
 const {root}=make('procedural'),first=api.prepareHeroSurfaces([root]);images[0].fail();
 const second=api.prepareHeroSurfaces([root],{retry:true});second.catch(()=>{});
 await assert.rejects(first,/technical-weave-v1/);
 complete(images.slice(1));await second;
}));

test('dispose during loading settles waiters and late callbacks cannot resurrect the texture',()=>fixture(async({api,images,make})=>{
 const a=make('procedural'),texture=a.mats.suit.map,pending=api.prepareHeroSurfaces([a.root]);
 texture.dispose();await assert.rejects(pending,/dispos/i);
 const b=make('procedural');assert.notEqual(b.mats.suit.map,texture);assert.equal(images.length,2);
 complete(images);await api.prepareHeroSurfaces([b.root]);await turn();assert.equal(texture.image,null);assert.equal(texture.version,0);
 await assert.rejects(api.prepareHeroSurfaces([a.root],{retry:true}),/dispos/i);
}));

test('dispose during decode prevents stale assignment into a replacement cache entry',()=>fixture(async({api,images,make})=>{
 const a=make('procedural'),old=a.mats.suit.map,pending=api.prepareHeroSurfaces([a.root]);images[0].load();await turn();
 old.dispose();await assert.rejects(pending,/dispos/i);const b=make('procedural');complete(images.slice(1));
 await api.prepareHeroSurfaces([b.root]);images[0].decodeOK();await turn();assert.equal(old.image,null);assert.equal(b.mats.suit.map.image,images[1]);
}));

test('CPU-only construction is awaitable without introducing a DOM or image network dependency',async()=>{
 const api=await import(`../src/engine/hero-materials.js?readiness-test=${++serial}`);
 assert.equal(typeof api.prepareHeroSurfaces,'function');
 const mats=Object.fromEntries(['suit','suit2','armor'].map(name=>[name,new THREE.MeshStandardMaterial()]));
 api.applyHeroSurface(mats,{body:'superhero-male',surface:'field'});const root=new THREE.Mesh(new THREE.BufferGeometry(),mats.suit);
 await api.prepareHeroSurfaces([root]);assert.equal(mats.suit.map.image,null);
 for(const texture of new Set([mats.suit.map,mats.suit.normalMap,mats.suit.roughnessMap]))texture.dispose();
 root.geometry.dispose();Object.values(mats).forEach(mat=>mat.dispose());
});
