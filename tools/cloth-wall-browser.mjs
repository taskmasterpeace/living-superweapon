// Native procedural flight -> ragdoll near thin cover. No gameplay/profile writes.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const label=process.argv[2]||'substep-final',baseline=process.argv.includes('--before'),capture=process.argv.includes('--frames');
assert.match(label,/^[a-z-]+$/);const out=`artifacts/cloth-wall/${label}`;await mkdir(out,{recursive:true});
if(capture)await mkdir(`${out}/frames`,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[],rows=[];
let served=false,sourceHash;
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/src/engine/ragdoll-cape.js*',async route=>{
 const response=await route.fetch();let body=await response.text();
 if(baseline){const dependency=body.match(/import \* as THREE from [^;]+;/)?.[0];assert.ok(dependency);body=(await readFile('artifacts/cloth-local/runtime-before.txt','utf8')).replace(/import \* as THREE from [^;]+;/,dependency);}
 sourceHash=createHash('sha256').update(body).digest('hex');served=true;await route.fulfill({response,body});
});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.evaluate(async label=>{
  const p=STUDIO.preview,T=await import('/node_modules/three/build/three.module.js'),{Fighter}=await import('/src/engine/entity.js'),{ROSTER}=await import('/src/data/characters.js'),{Ragdoll}=await import('/src/engine/ragdoll.js');
  p.playing=false;p.controls.enabled=false;p.combat.reset(p.fighter,true,'idle');p.fighter.obj.visible=false;p.combat.target.obj.visible=false;
  const f=new Fighter({...ROSTER.find(d=>d.id==='sol'),frame:{scale:1.5,bulk:1.65,head:1.4,neck:1.6,broad:1.6,stance:1.4}});p.scene.add(f.obj);
  Object.assign(f,{animT:0,_openSky:true,flying:true,gait:'airborne',facing:.9,hasAimWorld:true});f.pos.set(20,50,-15);f.vel.set(14,0,45);f.aimWorld.set(65,25,90);
  for(let i=0;i<90;i++){f.animT+=1/60;f._animate(1/60);}f.obj.updateMatrixWorld(true);
  const world={ARENA:240,heightAt:()=>0,cover:[{x:45,z:0,hx:.15,hz:30,top:80}]};
  const obstacle=new T.Mesh(new T.BoxGeometry(.3,80,60),new T.MeshStandardMaterial({color:0x686c5e,roughness:.85}));obstacle.position.set(45,40,0);p.scene.add(obstacle);
  const random=Math.random;let rag;try{Math.random=()=>.5;rag=new Ragdoll(f,new T.Vector3(35,25,18));}finally{Math.random=random;}
  const box=new T.Box3(new T.Vector3(44.85,0,-30),new T.Vector3(45.15,80,30)),sample=new T.Vector3();let tick=0;
  window.clothWallStep=frame=>{
   const contacts=[];
   if(frame>0)for(let step=0;step<4;step++){
    rag.step(1/120,{world});rag.apply(f);tick++;
    let bad=0;
    for(const face of rag.capePose.faces)for(const w of [[1/3,1/3,1/3],[.5,.5,0],[.5,0,.5],[0,.5,.5]]){
     sample.set(0,0,0);face.forEach((q,i)=>sample.addScaledVector(q.pos,w[i]));if(box.containsPoint(sample))bad++;
    }
    contacts.push({tick,bad});
   }else rag.apply(f);
   const c=rag.P.chest.pos;p.camera.position.copy(c).add(new T.Vector3(-20,10,-22));p.camera.fov=40;p.camera.lookAt(c);p.camera.updateProjectionMatrix();
   document.querySelector('.view-tag').textContent=`SOL / THIN-WALL FALL / ${label.toUpperCase()}`;
   document.querySelector('.viewport-note').textContent='Native procedural flight + 120 Hz ragdoll. Thin-wall fixture; silent inspection camera, not live gameplay/FPS evidence.';
   document.querySelector('.measurements').textContent=`${(frame/30).toFixed(2)}s / cloth-wall overlap samples: ${contacts.at(-1)?.bad||0}`;
   p.renderer.render(p.scene,p.camera);
   return {frame,time:frame/30,chest:c.toArray(),contacts,clothAsleep:rag.capePose.asleep};
  };
 },label);
 for(let frame=0;frame<=180;frame++){
  rows.push(await page.evaluate(frame=>clothWallStep(frame),frame));
  if(capture)await page.locator('.viewport').screenshot({path:`${out}/frames/${String(frame).padStart(4,'0')}.png`});
  if([0,15,24,33,60,120,180].includes(frame))await page.locator('.viewport').screenshot({path:`${out}/frame-${String(frame).padStart(3,'0')}.png`});
 }
 assert.ok(served,'runtime interception never ran');assert.deepEqual(errors,[]);
 const bad=rows.flatMap(r=>r.contacts).filter(r=>r.bad);if(!baseline)assert.equal(bad.length,0,'wall samples still penetrate during native fall');
 console.log(JSON.stringify({label,baseline,sourceHash,frames:rows.length,physicsSteps:rows.at(-1).contacts.at(-1).tick,overlapFrames:bad.length,firstOverlap:bad[0],errors}));
}finally{await writeFile(`${out}/results.json`,JSON.stringify({label,baseline,sourceHash,rows,errors},null,2));await context.close();await browser.close();}
