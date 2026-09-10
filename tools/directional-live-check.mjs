import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const rows=await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW,update=g.update.bind(g);g.update=()=>{};g.world.render=()=>{};g.controlBot=()=>{};
  const rows=[];
  for(const hero of ['sol','sarge']){
   g.startMode('powerworld',{p1:hero,p2:'kano'});const f=g.player;
   for(const other of g.entities)if(other!==f){other.ai=null;other.pos.set(300,50,300);}
   g.input.keys.clear();g.input.endFrame();g.input.pointerLock=false;g.hardLock=null;g.world._lookYaw=0;g.world._lookPitch=0;
   f.pos.set(0,0,-80);f.vel.set(0,0,0);f.flying=false;f.gait='grounded';f.invuln=30;f.energyInfinite=true;
   if(g._tapT)g._tapT.KeyD=-9;
   dispatchEvent(new KeyboardEvent('keydown',{code:'KeyD',bubbles:true}));
   g.world.renderer.domElement.dispatchEvent(new MouseEvent('mousedown',{button:0,clientX:720,clientY:450,bubbles:true}));
   const start=f.pos.clone(),samples=[];
   for(let i=0;i<90;i++){
    update(1/60);g.input.endFrame();if(i<30)continue;
    const slot=f.slots.lmb,head=f.parts.head.getWorldPosition(new T.Vector3()),hand=f.parts.armR.children[2];
    const source=hero==='sol'?f.parts.head:hand;
    const heading=new T.Vector3(0,hero==='sol'?0:-1,hero==='sol'?1:0).applyQuaternion(source.getWorldQuaternion(new T.Quaternion()));
    const origin=hero==='sol'?head:hand.getWorldPosition(new T.Vector3());
    const ray=slot.active?.dir||f.aimWorld.clone().sub(origin).normalize();
    samples.push({take:f._groundMotion?.take,weight:f._groundMotion?.weight,source:f._combatAim?.source,
     alignment:heading.dot(ray),yaw:f.obj.rotation.y,facing:f.facing,beam:!!slot.active?.sustaining,cd:slot.cd});
   }
   dispatchEvent(new MouseEvent('mouseup',{button:0,bubbles:true}));dispatchEvent(new KeyboardEvent('keyup',{code:'KeyD',bubbles:true}));
   for(let i=0;i<90;i++){update(1/60);g.input.endFrame();}
   rows.push({hero,distance:f.pos.distanceTo(start),samples,recovered:f._combatAim.weight<.001});
  }
  return rows;
 });
 await mkdir('artifacts/directional-motion',{recursive:true});await writeFile('artifacts/directional-motion/live-results.json',JSON.stringify({rows,errors},null,2));
 for(const row of rows){
  assert.ok(row.distance>10,'Real movement input must move the actor');
  assert.ok(row.samples.every(s=>s.weight>.9&&s.take),'Actual controller shooting must retain source gait');
  assert.ok(row.samples.every(s=>s.alignment>.96),'Rendered emitter must align with the actual shot');
  assert.ok(row.samples.some(s=>Math.abs(Math.sin(s.yaw-s.facing))>.7),'Travel heading must separate from attack heading');
  assert.ok(row.samples.some(s=>s.beam||s.cd>0),'Real input must fire the actual power');assert.ok(row.recovered);
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({rows:rows.map(({samples,...r})=>({...r,minAlignment:Math.min(...samples.map(s=>s.alignment))})),errors},null,2));
}finally{await browser.close();}
