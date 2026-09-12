import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const hero=process.argv[2]||'rage',scenario=process.argv[3]||'combo';
const out=`artifacts/marketing/combat-pass-2026-09-12/02-${hero}-${scenario}${process.argv[4]?'-'+process.argv[4]:''}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),ctx=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}}),page=await ctx.newPage(),video=page.video();
const result={hero,scenario,kind:'Native practice selection, N training target, ordinary browser input. Passive target trial, not adversarial AI proof. Silent video.',errors:[],rows:[]};page.on('pageerror',e=>result.errors.push(e.message));let mx=720,my=450,locked=false;
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.keyboard.press('Escape');await page.locator('#pwRoster [data-id="'+hero+'"]').click();await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();await page.waitForFunction(()=>PW.game.running&&PW.game.time>.5,null,{timeout:90000});await page.mouse.click(mx,my,{button:'middle'});await page.keyboard.press('n');
 await page.evaluate(()=>{const g=PW.game,old=g.onHit;window.__hits=[];window.__releases=[];const release=g.melee.release;g.melee.release=function(f){window.__releases.push({time:g.time,who:f.id,carry:!!f._personCarry,grab:!!f.grabbing,remaining:f.grabT,version:g.input.cancelVersion,saved:f._personCarry?.cancelVersion,stack:new Error().stack});return release.call(this,f);};g.onHit=function(...args){window.__hits.push({time:g.time,target:args[0]?.id,amount:args[1],move:args[2]?.meleeMove,finisher:args[2]?.finisher,src:args[2]?.src?.id,air:args[2]?.src?.flying,attackerY:args[2]?.src?.pos.y,targetY:args[0]?.pos.y,index:args[2]?.src?.strikeIdx,velocity:args[0]?.vel.toArray()});return old.apply(this,args);};});
 for(let i=0;i<65;i++){
  const s=await page.evaluate(()=>{const g=PW.game,p=g.player,v=g.entities.find(e=>e.isDummy&&e.alive);return {time:g.time,id:p.id,p:p.pos.toArray(),v:v?.pos.toArray(),hp:v?.hp,camera:g.world.camera.position.toArray(),yaw:g.world._lookYaw,pitch:g.world._lookPitch,sens:g.world._lookSens,grab:!!p.grabbing,carry:!!p._personCarry,state:p.mstate,idx:p.strikeIdx,faults:[...(g._errSeen||[])]};});result.rows.push(s);if(!s.v)break;
  const dx=s.v[0]-s.camera[0],dz=s.v[2]-s.camera[2],yaw=Math.atan2(dx,dz),pitch=Math.atan2(s.v[1]+5.6-s.camera[1],Math.hypot(dx,dz));if(!locked){mx-=Math.atan2(Math.sin(yaw-s.yaw),Math.cos(yaw-s.yaw))/s.sens;my+=(s.pitch-pitch)/s.sens;await page.mouse.move(mx,my);await page.keyboard.press('t');locked=await page.evaluate(()=>!!PW.game.hardLock);}
  const d=Math.hypot(s.p[0]-s.v[0],s.p[2]-s.v[2]);
  if(d>24)await page.keyboard.down('w');else await page.keyboard.up('w');
  if(scenario==='grab'){
   if(s.grab){await page.keyboard.down('w');await page.waitForTimeout(150);await page.keyboard.up('w');
    if(process.argv[4]?.startsWith('menu-carry')){
     await page.keyboard.press('i');await page.getByRole('dialog',{name:'Inventory',exact:true}).waitFor();await page.waitForTimeout(200);
     await page.getByRole('button',{name:'Return to game',exact:true}).click();await page.waitForTimeout(150);
     const retained=await page.evaluate(()=>!!PW.game.player._personCarry&&!!PW.game.player.grabbing);result.menuCarryRetained=retained;if(!retained)throw Error('Menu released carried victim');
    }
    await page.keyboard.press('f');await page.keyboard.down('Space');await page.waitForTimeout(600);await page.keyboard.up('Space');await page.keyboard.press('e');
    const t=await page.evaluate(()=>{const g=PW.game,v=g.entities.find(e=>e.isDummy&&e.alive),c=g.world.camera.position;return {dx:v.pos.x-c.x,dz:v.pos.z-c.z,dy:v.pos.y+5.6-c.y,yaw:g.world._lookYaw,pitch:g.world._lookPitch,sens:g.world._lookSens};});
    mx-=Math.atan2(Math.sin(Math.atan2(t.dx,t.dz)-t.yaw),Math.cos(Math.atan2(t.dx,t.dz)-t.yaw))/t.sens;my+=(t.pitch-Math.atan2(t.dy,Math.hypot(t.dx,t.dz)))/t.sens;await page.mouse.move(mx,my);await page.keyboard.press('t');
    result.airAttempts=[];
    for(let j=0;j<5;j++){
     await page.keyboard.down('v');await page.waitForTimeout(45);await page.keyboard.up('v');await page.waitForTimeout(125);
     result.airAttempts.push(await page.evaluate(()=>{const g=PW.game,p=g.player,v=g.entities.find(e=>e.isDummy&&e.alive);return {time:g.time,p:p.pos.toArray(),target:v?.pos.toArray(),flying:p.flying,airborne:p.airborne,lock:g.hardLock?.id,state:p.mstate,grab:p.grabState,charge:p.meleeCharge,step:p._meleeMotion?.step?.toArray(),stun:p.stunT,stagger:p.staggerT};}));
    }
    await page.screenshot({path:out+'/air-strike.png'});await page.waitForTimeout(400);break;}
   if(d>6)await page.keyboard.down('w');else {await page.keyboard.up('w');await page.keyboard.press('e');}
  }else if(d<30){await page.keyboard.down('v');await page.waitForTimeout(40);await page.keyboard.up('v');}
  if(i%12===0)await page.screenshot({path:out+`/frame-${i}.png`});await page.waitForTimeout(160);
 }
 result.hits=await page.evaluate(()=>window.__hits);result.faults=await page.evaluate(()=>[...(PW.game._errSeen||[])]);result.passed=result.hits.some(h=>h.move&&h.src===result.rows[0]?.id&&h.air)&&!result.errors.length&&!result.faults.length;
}catch(e){result.failure=String(e);process.exitCode=1;}
finally{await page.screenshot({path:out+'/final.png'}).catch(()=>{});result.releases=await page.evaluate(()=>window.__releases).catch(()=>[]);await writeFile(out+'/result.json',JSON.stringify(result,null,2));await ctx.close();await video.saveAs(out+'/native-combat.webm');await browser.close();console.log(JSON.stringify({hero,scenario,passed:result.passed,failure:result.failure,errors:result.errors,hits:result.hits,faults:result.faults}));}
