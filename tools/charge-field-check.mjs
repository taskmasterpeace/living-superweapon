// Exercise charge VFX through real ability slots, including their resource lifetime.
import {chromium} from 'playwright';
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const result=await page.evaluate(async()=>{
  const {runSlot,clearSlotFx}=await import('/src/engine/abilities.js');
  const {game:g}=LSW;g.update=()=>{};const failures=[],rows=[];
  for(const fps of [30,120]){
   g.startMode('powerworld',{p1:'kano',p2:'vega'});const f=g.player;
   for(let i=0;i<fps/2;i++){f.ki=f.maxKi;runSlot(f,'lmb',{pressed:i===0,held:true,released:false,dt:1/fps},g);}
   const s=f.slots.lmb,field=s.orb?.getObjectByName('charge-gather');
   if(!field?.isLineSegments){failures.push(`${fps}Hz charge lacks directional gathering streaks`);clearSlotFx(f);continue;}
   const pos=Array.from(field.geometry.attributes.position.array);
   for(let i=0;i<pos.length;i+=6)if(Math.hypot(...pos.slice(i+3,i+6))>=Math.hypot(...pos.slice(i,i+3)))failures.push('streak does not point inward');
   if(pos.some(v=>!Number.isFinite(v)))failures.push('invalid streak coordinates');
   rows.push({fps,segments:pos.length/6,positions:pos});
   let geometryDisposed=0,materialDisposed=0;
   field.geometry.addEventListener('dispose',()=>geometryDisposed++);field.material.addEventListener('dispose',()=>materialDisposed++);
   const orb=s.orb;
   if(fps===30)runSlot(f,'lmb',{pressed:false,held:false,released:true,dt:1/fps},g);
   else f._ko();
   if(orb.parent||s.orb||geometryDisposed!==1||materialDisposed!==1)failures.push(`${fps}Hz release/KO did not clean up charge resources`);
   clearSlotFx(f); // Assert the real exit first; the fallback must not mask a leak.
   if(geometryDisposed!==1||materialDisposed!==1)failures.push(`${fps}Hz repeated cleanup double-disposed charge resources`);
  }
  if(rows.length===2&&rows[0].positions.some((v,i)=>Math.abs(v-rows[1].positions[i])>1e-4))failures.push('charge motion changes with simulation rate');
  return {rows:rows.map(({positions,...r})=>r),failures};
 });
 console.log(JSON.stringify({...result,errors},null,2));if(result.failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
