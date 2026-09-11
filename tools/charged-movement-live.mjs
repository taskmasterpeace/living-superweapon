import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const rows=await page.evaluate(()=>{
  const g=LSW.game,update=g.update.bind(g);g.update=()=>{};g.world.render=()=>{};g.controlBot=()=>{};
  const rows=[];
  for(const charge of [false,true]){
   g.startMode('powerworld',{p1:'vega',p2:'kano'});const f=g.player;
   for(const foe of g.entities)if(foe!==f){foe.ai=null;foe.pos.set(300,50,300);}
   g.input.keys.clear();g.input.endFrame();g.input.pointerLock=false;g.hardLock=null;g.world._lookYaw=0;g.world._lookPitch=0;
   f.pos.set(0,0,-80);f.vel.set(0,0,0);f.flying=false;f.gait='grounded';f.invuln=30;f.energyInfinite=true;f.level=10;
   if(g._tapT)g._tapT.KeyD=-9;
   dispatchEvent(new KeyboardEvent('keydown',{code:'KeyD',bubbles:true}));
   if(charge)dispatchEvent(new KeyboardEvent('keydown',{code:'KeyQ',bubbles:true}));
   const start=f.pos.clone(),samples=[];
   for(let i=0;i<90;i++){
    update(1/60);g.input.endFrame();samples.push({charge:f.slots.q.charging,orb:!!f.slots.q.orb,weight:f._groundMotion?.weight,position:f.pos.toArray()});
   }
   const distance=f.pos.distanceTo(start),stored=f.slots.q.chargeT||0;
   dispatchEvent(new KeyboardEvent('keyup',{code:'KeyQ',bubbles:true}));dispatchEvent(new KeyboardEvent('keyup',{code:'KeyD',bubbles:true}));
   for(let i=0;i<90;i++){update(1/60);g.input.endFrame();}
   rows.push({charge,distance,stored,samples,recovered:!f.slots.q.charging&&!f.slots.q.orb&&f._combatAim.weight<.001});
  }
  return rows;
 });
 const ratio=rows[1].distance/rows[0].distance;
 await mkdir('artifacts/charged-emission',{recursive:true});await writeFile('artifacts/charged-emission/live-movement.json',JSON.stringify({rows,ratio,errors},null,2));
 assert.ok(rows[0].distance>15&&ratio>.98&&ratio<1.02,`charged/unarmed real movement ratio ${ratio}`);
 assert.ok(rows[1].samples.slice(15).every(s=>s.charge&&s.orb&&s.weight>.9),'real keyboard charge must retain the source gait');
 assert.ok(rows.every(r=>r.recovered));assert.deepEqual(errors,[]);
 console.log(JSON.stringify({rows:rows.map(({samples,...r})=>r),ratio,errors}));
}finally{await browser.close();}
