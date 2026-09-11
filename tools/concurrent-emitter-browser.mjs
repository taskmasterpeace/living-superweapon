import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/concurrent-emitter';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1440,height:1000}}}),page=await context.newPage(),errors=[],results=[];
page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('tab',{name:'Attacks',exact:true}).click();await page.getByLabel('Attack slot',{exact:true}).selectOption('lmb');
 await page.getByLabel('Movement while casting value',{exact:true}).fill('.65');await page.getByLabel('Movement while casting value',{exact:true}).press('Tab');
 await page.waitForFunction(()=>STUDIO.preview.fighter.slots.lmb.def.castMoveScale===.65);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();await page.screenshot({path:out+'/studio-casting-mobility.png'});
 await page.getByLabel('Motion state',{exact:true}).selectOption('attack');await page.getByLabel('Preview level',{exact:true}).selectOption('10');
 await page.getByLabel('Co-fire attack',{exact:true}).selectOption('f');await page.getByLabel('Fighter motion',{exact:true}).selectOption('ground-right');
 await page.getByLabel('Preview time',{exact:true}).evaluate(el=>{el.value='1.2';el.dispatchEvent(new Event('input',{bubbles:true}));});
 const cofire=await page.evaluate(()=>({selected:STUDIO.preview.combat.secondarySlot,optic:!!STUDIO.preview.fighter.slots.lmb.active?.sustaining,
  hands:STUDIO.preview.combat.game.projectiles.list.filter(s=>s.handOrigin===-1||s.handOrigin===1).length,pattern:STUDIO.preview.fighter._combatAim.handPattern,
  stats:document.querySelector('.measurements').textContent}));
 assert.equal(cofire.selected,'f');assert.ok(cofire.optic&&cofire.hands>0);assert.equal(cofire.pattern,'alternate');assert.match(cofire.stats,/Combined contact/);
 await page.screenshot({path:out+'/studio-cofire.png'});
 await page.getByLabel('Preview attack',{exact:true}).selectOption('f');assert.equal(await page.getByLabel('Co-fire attack',{exact:true}).inputValue(),'');
 await page.getByLabel('Preview attack',{exact:true}).selectOption('lmb');
 for(const style of ['palm','two-hand'])for(const motion of ['strafe','fly']){
  await page.evaluate(async({style,motion})=>{
   const p=STUDIO.preview,{runSlot}=await import('/src/engine/abilities.js');
   p.playing=false;p.view='front';p.controls.enabled=false;p.combat.clear();
   const f=p.fighter,g=p.combat.game;f._game=g;g.entities=[f];f.level=10;f.energyInfinite=true;
   f.slots={lmb:{def:{type:'beam',name:'Optic channel',faceOrigin:true,castStyle:'optic-focus',cost:1,dps:1,kiPerSec:1,steer:4,color:'#ff6f48',radius:.3},cd:0},
    rmb:{def:{type:'beam',name:'Hand channel',castStyle:style,cost:1,dps:1,kiPerSec:1,steer:12,color:'#ffd85c',radius:style==='two-hand'?.65:.4},cd:0}};
   f._rangedPose=null;f._combatAim.weight=0;f.pos.set(0,0,0);f.obj.position.copy(f.pos);f.flying=motion==='fly';f.gait=f.flying?'airborne':'grounded';f._openSky=true;
   f.hasAimWorld=true;f.aimWorld.set(0,18,100);f.facing=0;f.aim.set(0,0,1);f.aim3.copy(f.aimWorld).sub(f.pos.clone().set(0,7,0)).normalize();
   p.camera.position.set(22,12,28);p.controls.target.set(0,5,0);p.camera.fov=35;p.camera.lookAt(p.controls.target);p.camera.updateProjectionMatrix();
   window.concurrentStep=(frame,dt)=>{
    f.vel.set(14,0,motion==='fly'?36:0);g.time+=dt;
    if(frame===10)for(const key of ['lmb','rmb'])runSlot(f,key,{pressed:true,held:true,released:false,dt},g);
    if(frame===95)runSlot(f,'rmb',{pressed:false,held:false,released:true,dt},g);
    if(frame===130)runSlot(f,'lmb',{pressed:false,held:false,released:true,dt},g);
    if(frame>35&&frame<95){f.aimWorld.x=Math.sin((frame-35)/60)*40;f.facing=Math.atan2(f.aimWorld.x,100);}
    f.advanceActionPose(dt);f.animT+=dt;f._animate(dt);f.obj.updateMatrixWorld(true);g.projectiles.update(dt,g);g.particles.update(dt);g.vfx.update(dt);
    p.renderer.render(p.scene,p.camera);
    const eye=f.slots.lmb.active,beam=f.slots.rmb.active,head=f.parts.head,hand=f.parts.armR.children[2];
    const eyeRay=f.pos.clone().set(0,0,1).applyQuaternion(head.getWorldQuaternion(head.quaternion.clone()));
    const handRay=f.pos.clone().set(0,-1,0).applyQuaternion(hand.getWorldQuaternion(hand.quaternion.clone()));
    const midpoint=f.parts.armL.children[2].getWorldPosition(f.pos.clone()).add(hand.getWorldPosition(f.pos.clone())).multiplyScalar(.5);
    return {eye:eye?.sustaining?eyeRay.dot(eye.dir):null,hand:beam?.sustaining?handRay.dot(beam.dir):null,midpoint:style==='two-hand'&&beam?.sustaining?midpoint.distanceTo(beam.muzzle):null,
     speed:f.vel.length(),take:f._groundMotion?.take,weight:f._groundMotion?.weight,phase:frame<10?'base':frame<95?'both':frame<130?'eyes':'recovery'};
   };
   for(let i=0;i<90;i++)concurrentStep(-1,1/60);
   document.querySelector('.view-tag').textContent=`EYES + ${style.toUpperCase()} / ${motion.toUpperCase()}`;
   document.querySelector('.viewport-note').textContent='Two live production powers. Independent head/hand steering on source locomotion. Fixed-position inspection camera.';
  },{style,motion});
  const samples=[];
  for(const [from,to,phase]of [[0,44,'entry'],[44,90,'sustain'],[90,128,'eyes-only'],[128,200,'recovery']]){
   samples.push(...await page.evaluate(async({from,to})=>{const rows=[];for(let i=from;i<to;i++){rows.push({frame:i,...concurrentStep(i,1/30)});await new Promise(requestAnimationFrame);}return rows;},{from,to}));
   await page.locator('.viewport').screenshot({path:`${out}/${style}-${motion}-${phase}.png`});
  }
  const active=samples.filter(s=>s.frame>=50&&s.frame<95);
  assert.ok(active.every(s=>s.eye>.985&&s.hand>.985));assert.ok(active.every(s=>s.midpoint===null||s.midpoint<.001));
  assert.ok(samples.every(s=>s.speed>13.9));if(motion==='strafe')assert.ok(active.every(s=>s.weight>.9));
  results.push({style,motion,minEye:Math.min(...active.map(s=>s.eye)),minHand:Math.min(...active.map(s=>s.hand)),maxMidpointError:Math.max(0,...active.map(s=>s.midpoint||0)),samples});
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/results.json',JSON.stringify({cofire,results,errors},null,2));console.log(JSON.stringify({cofire,results:results.map(({samples,...r})=>r),errors}));
}catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}
finally{await context.close();await page.video()?.saveAs(out+'/concurrent-powers.webm');await browser.close();}
