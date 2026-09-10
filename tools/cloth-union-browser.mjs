// Production short/broad procedural flight -> seeded ragdoll -> terminal hold.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const label=process.argv[2]||'final',before=process.argv.includes('--before'),capture=process.argv.includes('--frames');
assert.match(label,/^[a-z-]+$/);const out=`artifacts/cloth-union/${label}`;await mkdir(out,{recursive:true});if(capture)await mkdir(`${out}/frames`,{recursive:true});
const sourceFile=before?'artifacts/cloth-union/runtime-before.txt':'src/engine/ragdoll-cape.js';
const runtimeHash=createHash('sha256').update(await readFile(sourceFile)).digest('hex');
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[],rows=[];
let served=false,sourceHash;page.on('pageerror',e=>errors.push(e.message));
await page.route('**/src/engine/ragdoll-cape.js*',async route=>{
 const response=await route.fetch();let body=await response.text();
 if(before){const dependency=body.match(/import \* as THREE from [^;]+;/)?.[0];assert.ok(dependency);body=(await readFile('artifacts/cloth-union/runtime-before.txt','utf8')).replace(/import \* as THREE from [^;]+;/,dependency);}
 sourceHash=createHash('sha256').update(body).digest('hex');served=true;await route.fulfill({response,body});
});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.evaluate(async label=>{
  const p=STUDIO.preview,T=await import('/node_modules/three/build/three.module.js'),{clothFall}=await import('/tools/helpers/cloth-fall.mjs'),{trunkProbe}=await import('/tools/helpers/trunk-probe.mjs');
  // The capture owns stepping and camera updates. A paused Studio still has a
  // render/OrbitControls RAF; stop that duplicate loop for deterministic views.
  p.playing=false;cancelAnimationFrame(p.raf);p.controls.enabled=false;p.combat.reset(p.fighter,true,'idle');p.fighter.obj.visible=false;p.combat.target.obj.visible=false;
  const {f,rag,world}=clothFall({seed:99,frame:{scale:.65,bulk:1.65,head:1.4,neck:1.6,broad:1.6,stance:1.4},cover:[{x:52,z:3,hx:4,hz:4,top:4}]});p.scene.add(f.obj);
  const platform=new T.Mesh(new T.BoxGeometry(8,4,8),new T.MeshStandardMaterial({color:0x686c5e,roughness:.85}));platform.position.set(52,2,3);p.scene.add(platform);
  const bodies=[f.parts.torso,f.parts.pelvis,f.parts.head],probes=bodies.map(trunkProbe),inverses=bodies.map(()=>new T.Matrix4()),sample=new T.Vector3();let tick=0,overlapSteps=0;
  window.clothUnionStep=frame=>{
   const contacts=[];
   if(frame>0)for(let step=0;step<4;step++){
    rag.step(1/120,{world});rag.apply(f);tick++;let bad=0;
    bodies.forEach((b,i)=>inverses[i].copy(b.matrixWorld).invert());
    for(const face of rag.capePose.faces)for(const weights of [[1/3,1/3,1/3],[.5,.5,0],[.5,0,.5],[0,.5,.5]]){
     sample.set(0,0,0);face.forEach((q,i)=>sample.addScaledVector(q.pos,weights[i]));
     for(let i=0;i<bodies.length;i++)if(probes[i](sample,inverses[i]))bad++;
    }
    contacts.push({tick,bad});if(bad)overlapSteps++;
   }else rag.apply(f);
   // Stay east of the platform so the final grounded body remains visible.
   // Identical inspection framing for both source and target sequences.
   const c=rag.P.chest.pos;p.camera.position.copy(c).add(new T.Vector3(10,6,-13));p.camera.fov=38;p.camera.lookAt(c);p.camera.updateProjectionMatrix();
   document.querySelector('.view-tag').textContent=`SOL / SHORT-BROAD FALL / ${label.toUpperCase()}`;
   document.querySelector('.viewport-note').textContent='Native procedural flight → ragdoll, seed99 at120Hz. Silent inspection camera; not gameplay camera or FPS proof.';
   document.querySelector('.measurements').textContent=`${(frame/30).toFixed(2)}s / overlapping steps: ${overlapSteps} / cloth ${rag.capePose.asleep?'asleep':'moving'}`;
   p.renderer.render(p.scene,p.camera);
   const cloth=rag.capePose,bounds=new T.Box3().setFromPoints(cloth.points.map(q=>q.pos));
   const maxStretch=Math.max(...cloth.links.map(link=>cloth.points[link.a].pos.distanceTo(cloth.points[link.b].pos)/link.length));
   return {frame,time:frame/30,chest:c.toArray(),head:rag.P.head.pos.toArray(),pelvis:rag.P.pelvis.pos.toArray(),camera:p.camera.matrixWorld.toArray(),contacts,clothAsleep:cloth.asleep,clothBounds:[bounds.min.toArray(),bounds.max.toArray()],maxStretch};
  };
 },label);
 for(let frame=0;frame<=180;frame++){
  rows.push(await page.evaluate(frame=>clothUnionStep(frame),frame));
  if(capture)await page.locator('.viewport').screenshot({path:`${out}/frames/${String(frame).padStart(4,'0')}.png`});
  if([0,22,45,90,135,180].includes(frame))await page.locator('.viewport').screenshot({path:`${out}/frame-${String(frame).padStart(3,'0')}.png`});
 }
 assert.ok(served);assert.deepEqual(errors,[]);assert.equal(createHash('sha256').update(await readFile(sourceFile)).digest('hex'),runtimeHash,'source changed during capture');const bad=rows.flatMap(r=>r.contacts).filter(r=>r.bad);
 if(!before)assert.equal(bad.length,0,'native cloth samples still penetrate core bodies');
 console.log(JSON.stringify({label,before,sourceHash,runtimeHash,frames:rows.length,physicsSteps:720,overlapSteps:bad.length,firstOverlap:bad[0],errors}));
}finally{await writeFile(`${out}/results.json`,JSON.stringify({label,before,sourceHash,runtimeHash,rows,errors},null,2));await context.close();await browser.close();}
