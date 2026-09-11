import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const result=await page.evaluate(()=>{
  const g=LSW.game,f=g.player,update=g.update.bind(g),render=g.world.render.bind(g.world);
  g.update=()=>{};g.world.render=()=>{};g.controlBot=()=>{};
  for(const other of g.entities)if(other!==f){other.ai=null;other.pos.set(300,50,300);}
  g.input.keys.clear();g.input.endFrame();g.hardLock=null;g.world._lookYaw=0;g.world._lookPitch=0;
  // Keep the complete sequence in a clear lane; the old origin ran into cover
  // at z=115 after the added aerial lunge, correctly switching to sideways gait.
  f.pos.set(0,0,-80);f.vel.set(0,0,0);f.flying=false;f.gait='grounded';f.invuln=30;
  const key=(code,down)=>{
   // Simulated seconds run faster than performance.now(). These are separate
   // presses, not double taps; evade timing has its own real-time input tests.
   if(down&&g._tapT)g._tapT[code]=-9;
   dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true}));
  };
  const step=s=>{for(let i=0;i<Math.round(s*60);i++){update(1/60);g.input.endFrame();}};
  const read=()=>({take:f._groundMotion?.take??null,weight:f._groundMotion?.weight??0,phase:f._groundMotion?.phase??0,gait:f.gait,guarding:f.guarding,flying:f.flying,pos:f.pos.toArray(),speed:Math.hypot(f.vel.x,f.vel.z)});
  // Catch missing punch playback and stale strike overlays after recovery using
  // real key edges and the complete controller/physics/animation apply order.
  const punches=[];
  const punch=(stage,heavy)=>{
   key('KeyV',true);step(heavy?.85:1/60);key('KeyV',false);
   const samples=[];
   for(let i=0;i<90;i++){
    step(1/60);
    samples.push({state:f.mstate,take:f._authoredStrike?.take??null,
     arm:f.parts.armR.quaternion.toArray(),elbow:f.parts.armR.children[1].rotation.x,
     body:f.parts.body.quaternion.toArray(),ground:f._groundMotion?.weight??0});
   }
   punches.push({stage,heavy,samples,recovered:!f.mstate&&!f._authoredStrike?.applied});
  };
  step(.5);const start=read();key('KeyW',true);step(1.2);const moving=read();render();
  key('KeyC',true);step(.5);const guard=read();key('KeyC',false);step(.7);const resumed=read();
  key('KeyW',false);step(.5);punch('grounded',false);punch('grounded',true);
  key('KeyW',false);key('Space',true);step(1);key('Space',false);step(.3);const air=read();
  punch('airborne',false);punch('airborne',true);
  key('ControlLeft',true);step(3);key('ControlLeft',false);step(.5);const landed=read();
  key('KeyW',true);step(1);const afterLanding=read();key('KeyW',false);step(.5);
  key('KeyW',true);f.def.model={...f.def.model,locomotion:'procedural'};f.flying=false;f.gait='grounded';f.pos.set(0,0,0);f.vel.set(0,0,0);step(1.2);const procedural=read();key('KeyW',false);
  return {start,moving,guard,resumed,air,landed,afterLanding,punches,procedural};
 });
 await mkdir('artifacts/locomotion',{recursive:true});await writeFile('artifacts/locomotion/live-results.json',JSON.stringify({result,errors},null,2));
 console.log(JSON.stringify({...result,punches:result.punches.map(({samples,...p})=>({...p,takes:[...new Set(samples.map(s=>s.take).filter(Boolean))],states:[...new Set(samples.map(s=>s.state))]})),errors},null,2));
 assert.ok(result.moving.take&&result.moving.weight>.9&&result.moving.speed>5,'real W input must drive the production authored channel');
 assert.ok(Math.hypot(result.moving.pos[0]-result.start.pos[0],result.moving.pos[2]-result.start.pos[2])>5,'movement cannot be a posed fixture');
 assert.ok(result.guard.guarding&&result.guard.weight===0,'held block must own the moving body');
 assert.ok(result.resumed.take&&result.resumed.weight>.9,'releasing guard must restore the moving clip');
 assert.ok(result.air.flying&&result.air.pos[1]>10&&result.air.weight===0,'Space must transition to actual flight with no ground overlay');
 assert.ok(!result.landed.flying&&result.landed.gait==='grounded'&&result.landed.pos[1]<.1,'descending must restore actual floor contact');
 assert.ok(result.afterLanding.take&&result.afterLanding.weight>.9,'landing must restore authored ground movement');
 for(const punch of result.punches){
  const active=punch.samples.filter(s=>s.take);
  assert.ok(active.length>2,`${punch.stage} ${punch.heavy?'heavy':'light'} punch must play a source sequence`);
  assert.ok(active.some(s=>s.state==='active')&&active.some(s=>s.state==='recover'),'punch must include contact and recovery');
  assert.ok(active.some(s=>s.arm.some((v,i)=>Math.abs(v-active[0].arm[i])>.1)),'punching shoulder must actually articulate over time');
  assert.ok(punch.recovered,'completed punch must release the body back to locomotion/flight');
  assert.ok(active.every(s=>s.ground===0),'ground running cannot overwrite a punch');
 }
 assert.ok(result.procedural.speed>5&&!result.procedural.take,'procedural fallback must remain playable');
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
