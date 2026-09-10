import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/beam-startup/hand-bracing';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const results=[];
 for(const kind of ['chest','palm','two-hand']){
 const result=await page.evaluate(async kind=>{
  const {game:g,hud,SETTINGS}=LSW,{runSlot}=await import('/src/engine/abilities.js');
  SETTINGS.scheme='classic';g.startMode('powerworld',{p1:kind==='two-hand'?'kano':'sol',p2:'kano'});g.update=()=>{};
  const f=g.player;for(const e of g.entities)e.ai=null;
  g.projectiles.clear?.();for(const shot of g.projectiles.list)shot._dispose(g);g.projectiles.list.length=0;
  f.slots.lmb.def={type:'beam',name:`${kind} Startup`,chest:kind==='chest',castStyle:kind==='chest'?'chest-brace':kind,cost:3,kiPerSec:12,dps:1,steer:1,color:'#ffc54a'};
  Object.assign(f,{animT:0,_openSky:true,hasAimWorld:true,energyInfinite:true,level:10,flying:true,gait:'airborne',_selSlot:'lmb'});
  f.pos.set(0,80,0);f.vel.set(0,0,0);hud.setPlayer(f.def);
  const aim=degrees=>{f.facing=degrees*Math.PI/180;f.aim.set(Math.sin(f.facing),0,Math.cos(f.facing));f.aimWorld.copy(f.pos).addScaledVector(f.aim,100);f.aimWorld.y+=30;f.aim3.copy(f.aimWorld).sub(f.pos).normalize();};
  const step=()=>{f.animT+=1/60;f.advanceActionPose(1/60);f._animate(1/60);g.projectiles.update(1/60,g);hud.update();};
  aim(0);for(let i=0;i<60;i++)step();aim(170);runSlot(f,'lmb',{pressed:true,held:true,released:false,dt:1/60},g);step();
  const b=f.slots.lmb.active,status=()=>hud.triggerEls.primary.querySelector('.trigger-status').textContent;
  const pending={status:status(),pending:b.pendingLaunch,packets:b.pn};
  let frames=1;while(b.pendingLaunch&&frames<18){step();frames++;}
  const firing={status:status(),pending:b.pendingLaunch,packets:b.pn,age:b.emissionAge};
  runSlot(f,'lmb',{pressed:false,held:false,released:true,dt:1/60},g);f.slots.lmb.cd=0;
  aim(0);runSlot(f,'lmb',{pressed:true,held:true,released:false,dt:1/60},g);step();
  const interrupted=f.slots.lmb.active,wasPending=interrupted.pendingLaunch;f.frozenT=1;step();
  const canceled={wasPending,dead:interrupted.dead,status:status()};
  return {kind,pending,firing,frames,canceled};
 },kind);
 assert.ok(result.pending.pending&&result.pending.packets===0);assert.equal(result.pending.status,'ALIGNING');
 assert.ok(!result.firing.pending&&result.firing.age>0);assert.equal(result.firing.status,'FIRING');
 assert.ok(result.canceled.wasPending&&result.canceled.dead);assert.ok(!['ALIGNING','FIRING'].includes(result.canceled.status),'HUD advertises a canceled emitter while frozen');
 results.push(result);await page.screenshot({path:`${out}/hud-${kind}.png`});
 }
 assert.deepEqual(errors,[]);
 await writeFile(`${out}/results.json`,JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));
}finally{await browser.close();}
