import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const ROOT=resolve('public/authored-assets');
const assetUrl='https://assets.test/';
const fileFetch=async input=>{
  const url=new URL(String(input));
  const path=resolve(ROOT,decodeURIComponent(url.pathname.replace(/^\//,'')));
  try{return new Response(await readFile(path),{status:200});}catch{return new Response('missing',{status:404});}
};
const module=await import('../src/engine/authored-assets.js').catch(()=>({}));

test('catalog resolution uses declared entries and returns deeply immutable metadata',async()=>{
  const loader=module.createAuthoredAssetLoader({fetch:fileFetch,baseUrl:assetUrl});
  const catalog=await loader.loadCatalog();
  assert.equal(catalog.packages.find(p=>p.id==='equipment.carbine').dir,'equipment.carbine/v1');
  assert.ok(Object.isFrozen(catalog)&&Object.isFrozen(catalog.packages)&&Object.isFrozen(catalog.packages[0]));
  const pack=await loader.resolvePackage('equipment.carbine@1','equipment');
  assert.equal(pack.manifest.id,'equipment.carbine');
  assert.equal(pack.baseUrl,'https://assets.test/equipment.carbine/v1/');
  assert.equal(pack.packageHash,'492f111e20cc043615096fa893dd04df33e160ccf7f60b69ddf016b04f3ff251');
});

test('invalid, missing, and wrong-kind references report typed fallback-safe failures',async()=>{
  const loader=module.createAuthoredAssetLoader({fetch:fileFetch,baseUrl:assetUrl});
  for(const [ref,kind,code] of [['../outside@1','equipment','INVALID_REFERENCE'],['missing.package@1','equipment','PACKAGE_UNAVAILABLE'],['body.hero-standard@1','equipment','WRONG_KIND']]){
    await assert.rejects(loader.resolvePackage(ref,kind),error=>error instanceof module.AuthoredAssetError&&error.code===code&&error.fallbackAvailable===true);
  }
});

test('manifest activation rejects non-finite transforms and output traversal',async()=>{
  const catalog=JSON.parse(await readFile(resolve(ROOT,'catalog.json'),'utf8'));
  const original=JSON.parse(await readFile(resolve(ROOT,'equipment.carbine/v1/manifest.json'),'utf8'));
  for(const [mutate,code] of [
    [m=>m.sockets[0].position[0]=null,'INVALID_MANIFEST'],
    [m=>m.outputs[0].path='../model.glb','OUTPUT_TRAVERSAL'],
  ]){
    const manifest=structuredClone(original);mutate(manifest);
    const fetch=async input=>String(input).endsWith('catalog.json')?new Response(JSON.stringify(catalog)):new Response(JSON.stringify(manifest));
    const loader=module.createAuthoredAssetLoader({fetch,baseUrl:assetUrl});
    await assert.rejects(loader.resolvePackage('equipment.carbine@1','equipment'),error=>error.code===code);
  }
});

test('a failed catalog request is retried instead of caching a rejected promise',async()=>{
  let attempts=0;
  const fetch=async input=>{attempts++;return attempts===1?new Response('offline',{status:503}):fileFetch(input);};
  const loader=module.createAuthoredAssetLoader({fetch,baseUrl:assetUrl});
  await assert.rejects(loader.loadCatalog(),error=>error.code==='FETCH_FAILED'&&error.retryable===true);
  assert.equal((await loader.loadCatalog()).format,'pw-asset-catalog');
  assert.equal(attempts,2);
});

test('verified body JSON and pose-bank bytes are available through the browser-safe output API',async()=>{
  const loader=module.createAuthoredAssetLoader({fetch:fileFetch,baseUrl:assetUrl});
  const body=await loader.loadBodyDefinition('body.hero-standard@1');
  assert.equal(body.catalogBody,'superhero-male');assert.ok(Object.isFrozen(body.hitZones[0]));
  const bytes=await loader.readOutput('motion.hero-ual@1','pose-bank',{type:'bytes'});
  assert.equal(bytes.byteLength,649560);
});

test('shipped equipment GLBs parse into exclusive instances with idempotent owned disposal',async()=>{
  const loader=module.createAuthoredAssetLoader({fetch:fileFetch,baseUrl:assetUrl});
  for(const ref of ['equipment.carbine@1','equipment.sidearm@1']){
    const a=await loader.loadEquipmentInstance(ref),b=await loader.loadEquipmentInstance(ref);
    assert.notEqual(a.root,b.root);assert.ok(a.root.children.length>0);
    const aGeometries=new Set(),bGeometries=new Set();a.root.traverse(o=>o.geometry&&aGeometries.add(o.geometry));b.root.traverse(o=>o.geometry&&bGeometries.add(o.geometry));
    assert.ok([...aGeometries].every(g=>!bGeometries.has(g)));
    const geometry=[...aGeometries][0];let disposed=0;geometry.addEventListener('dispose',()=>disposed++);
    a.dispose();a.dispose();assert.equal(disposed,1);assert.equal([...bGeometries][0].attributes.position.count>0,true);
    b.dispose();
  }
});

test('equipment rejects external GLB resources before the injected parser can run',async()=>{
  const json=JSON.stringify({asset:{version:'2.0'},buffers:[{byteLength:4,uri:'https://evil.test/payload.bin'}],scenes:[{nodes:[]}],scene:0});
  const jsonBytes=new TextEncoder().encode(json),padded=(jsonBytes.length+3)&~3,glb=new ArrayBuffer(20+padded),view=new DataView(glb);
  view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,glb.byteLength,true);view.setUint32(12,padded,true);view.setUint32(16,0x4e4f534a,true);
  new Uint8Array(glb,20).fill(0x20);new Uint8Array(glb,20,jsonBytes.length).set(jsonBytes);
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',glb))].map(n=>n.toString(16).padStart(2,'0')).join('');
  const manifest={format:'pw-asset-package',formatVersion:1,id:'equipment.bad',version:1,kind:'equipment',outputs:[{path:'model.glb',role:'glb',sha256:hash,bytes:glb.byteLength}],packageHash:'a'.repeat(64)};
  const catalog={format:'pw-asset-catalog',formatVersion:1,packages:[{id:'equipment.bad',version:1,kind:'equipment',dir:'equipment.bad/v1',packageHash:'a'.repeat(64)}]};
  let parsed=false;const fetch=async input=>new Response(String(input).endsWith('catalog.json')?JSON.stringify(catalog):String(input).endsWith('manifest.json')?JSON.stringify(manifest):glb);
  const loader=module.createAuthoredAssetLoader({fetch,baseUrl:assetUrl,parseGLB:async()=>{parsed=true;}});
  await assert.rejects(loader.loadEquipmentInstance('equipment.bad@1'),error=>error.code==='EXTERNAL_RESOURCE');assert.equal(parsed,false);
});
