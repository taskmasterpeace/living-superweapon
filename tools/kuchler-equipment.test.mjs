import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
import {buildRecipe} from '../authoring/lib/build.js';
import {checkPackage} from '../authoring/lib/package-io.js';
import {createModel,KUCHLER} from '../authoring/recipes/equipment/kuchler-rifle/model.js';

const repo=resolve('.'),catalog=JSON.parse(await readFile('public/authored-assets/catalog.json','utf8'));
const entry=catalog.packages.filter(p=>p.id==='equipment.kuchler-rifle').sort((a,b)=>b.version-a.version)[0],dir=resolve('public/authored-assets',entry.dir);
test('Kuchler donor rebuilds byte-for-byte with full MIT notice and physical action nodes',async()=>{
 const scratch=await mkdtemp(join(tmpdir(),'pw-kuchler-'));
 const built=await buildRecipe('authoring/recipes/equipment/kuchler-rifle/recipe.json',{root:scratch,force:true});
 const checked=await checkPackage(dir);assert.equal(checked.ok,true,JSON.stringify(checked.errors));
 const original=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));
 assert.equal(built.manifest.outputs[0].sha256,original.outputs[0].sha256);
 assert.match(original.provenance.licenseNotice,/Copyright \(c\) 2026 Machine King Labs/);assert.match(original.provenance.licenseNotice,/Permission is hereby granted/);
 const g=createModel(THREE),size=new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());
 assert.ok(Math.abs(size.y*KUCHLER.metersPerUnit-KUCHLER.lengthMeters)<.001);
 for(const name of ['weapon-magazine','weapon-charging-handle','socket-grip','socket-support','socket-muzzle','socket-holster'])assert.ok(g.getObjectByName(name),name);
 assert.equal(original.budgets.measured.triangles,156);assert.equal(original.budgets.measured.drawCalls,4);
 g.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
});

test('native equipment viewer mounts the actual Kuchler GLB on production bodies and records pose fit',async()=>{
 const hooks=registerHooks({resolve(specifier,context,next){if(specifier.startsWith('/src/'))return next(pathToFileURL(resolve(repo,specifier.slice(1))).href,context);return next(specifier,context);}});
 const priorFetch=globalThis.fetch,priorProgress=globalThis.ProgressEvent;
 globalThis.ProgressEvent=class{constructor(type,init){this.type=type;Object.assign(this,init);}};
 globalThis.fetch=async input=>{
  const url=new URL(typeof input==='string'?input:input.url,'http://kuchler.test');
  const path=resolve(repo,'public','.'+decodeURIComponent(url.pathname));
  assert.ok(path.startsWith(resolve(repo,'public')));
  try{const bytes=await readFile(path);return new Response(bytes,{headers:{'Content-Length':String(bytes.length)}});}catch{return new Response('missing',{status:404});}
 };
 let stage;
 try{
  const {loadPackage}=await import('../authoring/viewer/production-bridge.js');
  const manifest=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));
  stage={content:new THREE.Group(),helpers:new THREE.Group(),controls:{target:new THREE.Vector3()},overlays:{},catalog};
  const playback=await loadPackage({manifest,base:`http://kuchler.test/authored-assets/${entry.dir}/`},stage),rows=[];
  for(const body of ['merc-field','superhero-male','lean','heavy']){
   playback.setBody(body);
   for(const id of ['rest','aim-neutral','aim-up','reload','walk-carry']){
    const clip=playback.clips.find(c=>c.id===id);if(!clip)continue;
    playback.apply(clip,clip.duration*.55);const r={...playback.measure(),clip:id};rows.push(r);
    assert.equal(r.mounted,true);assert.ok(r.gripAtHand<1e-5);assert.ok(r.muzzleDot>.95);assert.equal(r.rootDrift,0);
    assert.ok(Number.isFinite(r.supportError));assert.ok(r.magazineWorld.every(Number.isFinite));
   }
  }
  for(const row of rows){row.supportFit=row.supportError<.35?'pass':['aim-neutral','aim-up'].includes(row.clip)?'blocked':'not-a-hold-pose';
   if(row.clip==='reload')assert.equal(row.supportFit,'pass');
   assert.equal(row.holsterPenetrates,false);
  }
  const report={package:`equipment.kuchler-rifle@${entry.version}`,method:'Actual authoring/viewer loadPackage + equipment-bridge + native production Fighter, GLTFLoader and pose solver; WebGL output omitted',summary:{mounts:rows.length,reloadFits:rows.filter(r=>r.clip==='reload'&&r.supportFit==='pass').length,aimBlocked:rows.filter(r=>r.supportFit==='blocked').length},rows};
  await writeFile('D:/lsw/.superpowers/sdd/2026-09-11-gameplay-consolidation/kuchler-viewer-fit.json',JSON.stringify(report,null,2)+'\n');
  assert.ok(rows.length>=12);
 }finally{stage?.dispose?.();globalThis.fetch=priorFetch;globalThis.ProgressEvent=priorProgress;hooks.deregister();}
});
