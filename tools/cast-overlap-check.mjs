// A beam's actual emission lifetime owns its kick, not first-slot selection or
// pose interruption. Exercise real BeamHose instances and Fighter apply order.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/flight-review/cast-bracing',tag=process.argv.includes('--before')?'overlap-before':'overlap-after';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const result=await page.evaluate(async()=>{
  const {runSlot}=await import('/src/engine/abilities.js'),g=LSW.game,dt=1/120;g.update=()=>{};
  const setup=()=>{
   g.startMode('powerworld',{p1:'vega',p2:'kano'});const f=g.player;
   for(const e of g.entities)if(e!==f)e.pos.set(800,300,800);
   f.pos.set(0,300,0);f.vel.set(0,0,0);f.flying=true;f.gait='airborne';f.faceDir(0,1);f.hasAimWorld=true;f.aimWorld.set(0,305.2,90);f.aim3.set(0,0,1);
   const step=(seconds)=>{const rows=[];for(let i=0;i<Math.round(seconds/dt);i++){g.time+=dt;f.ki=f.maxKi;f.update(dt,g);g.projectiles.update(dt,g);rows.push(f.parts.body.rotation.x);}return rows;};
   const emit=key=>{const b=g.spawnBeamFor(f,f.slots[key].def,1);f.slots[key].active=b;return b;};
   step(.6);return {f,step,emit};
  };
  const onset=[];
  for(const charging of [false,true]){
   const samples=[];
   for(const second of [false,true]){
    const {f,step,emit}=setup();
    if(charging)runSlot(f,'rmb',{pressed:true,held:true,dt},g);else emit('rmb');
    step(1);if(second)emit('r');samples.push(step(.35));
   }
   onset.push({charging,delta:Math.max(...samples[0].map((v,i)=>v-samples[1][i]))});
  }
  const overlap=setup();const first=overlap.emit('rmb');overlap.emit('r');overlap.step(1.5);first.end();const switched=overlap.step(.4);
  const interrupted=setup();const continuing=interrupted.emit('rmb');interrupted.step(.025);interrupted.f.staggerT=.9;interrupted.step(.8);
  interrupted.f.staggerT=0;const resumed=interrupted.step(.4);
  const failures=[];
  for(const r of onset)if(r.delta<.07)failures.push(`A secondary beam has no release response while primary is ${r.charging?'charging':'emitting'}`);
  if(Math.min(...switched)<-.07)failures.push('Ending primary replays a kick for an already-emitting secondary beam');
  if(Math.min(...resumed)<-.07)failures.push('Interruption delays and replays the original release kick');
  if(!continuing.sustaining)failures.push('Interruption fixture did not retain its real beam');
  if([...switched,...resumed,...onset.map(r=>r.delta)].some(v=>!Number.isFinite(v)))failures.push('Non-finite body pose');
  return {onset,minSwitched:Math.min(...switched),minResumed:Math.min(...resumed),failures};
 });
 await writeFile(`${out}/${tag}.json`,JSON.stringify({...result,errors},null,2));console.log({...result,errors});if(result.failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
