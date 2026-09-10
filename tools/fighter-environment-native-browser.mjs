import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv.find(a=>a.startsWith('--output='))?.slice(9)||'artifacts/fighter-environment-native';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false});
const context=await browser.newContext({viewport:{width:1672,height:941},recordVideo:{dir:out+'/video',size:{width:1672,height:941}}});
const page=await context.newPage(),result={scope:'Normal-spawn Free practice; keyboard flight into existing environment cover. Read-only contact instrumentation, no position/health/AI overrides.',errors:[],actions:[]};
page.on('pageerror',e=>result.errors.push(String(e)));let held=new Set();
async function keys(next=[]){const want=new Set(next);for(const k of held)if(!want.has(k))await page.keyboard.up(k);for(const k of want)if(!held.has(k))await page.keyboard.down(k);held=want;}
async function read(){return page.evaluate(()=>{const g=PW.game,p=g.player,d=p.vel.clone();g.world.camera.getWorldDirection(d);return {pos:p.pos.toArray(),speed:p.vel.length(),alive:p.alive,airborne:p.airborne,dir:d.toArray(),contacts:environmentWitness.contacts.length};});}
async function travel(target,duration,boost=false){
 const start=Date.now();while(Date.now()-start<duration){
  const s=await read();assert.ok(s.alive,'Survived native navigation');
  const dx=target[0]-s.pos[0],dy=target[1]-s.pos[1],dz=target[2]-s.pos[2],len=Math.hypot(s.dir[0],s.dir[2])||1,fx=s.dir[0]/len,fz=s.dir[2]/len;
  if(Math.hypot(dx,dy,dz)<3)break;
  const forward=dx*fx+dz*fz,right=-dx*fz+dz*fx,next=[];
  if(Math.abs(forward)>2)next.push(forward>0?'KeyW':'KeyS');if(Math.abs(right)>2)next.push(right>0?'KeyD':'KeyA');
  if(dy>2)next.push('Space');else if(dy< -2)next.push('ControlLeft');if(boost)next.push('ShiftLeft');
  await keys(next);result.actions.push({target,...s,keys:next});await page.waitForTimeout(80);
  if(boost&&s.contacts)break;
 }await keys();
}
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=vega');
 await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:60000});await page.bringToFront();
 result.route=await page.evaluate(()=>{
  const g=PW.game,p=g.player,w=g.world;window.environmentWitness={contacts:[],faults:[]};
  const old=p._wallContact.bind(p),report=g.reportError.bind(g);
  p._wallContact=(game,c,speed)=>{environmentWitness.contacts.push({speed,airborne:p.airborne,pos:p.pos.toArray(),cover:c?{x:c.x,z:c.z,hx:c.hx??c.r,hz:c.hz??c.r,top:c.top??c.h,hp:c.hp}:null,radius:p.radius});return old(game,c,speed);};
  g.reportError=(e,c)=>{environmentWitness.faults.push(String(e));return report(e,c);};
  const candidates=w.cover.filter(c=>!c.frontlineVehicle&&!c.frontlineAircraft&&!c.destroyed&&(c.top??c.h)>w.heightAt(c.x,c.z)+20)
   .sort((a,b)=>Math.hypot(a.x-p.pos.x,a.z-p.pos.z)-Math.hypot(b.x-p.pos.x,b.z-p.pos.z));
  const c=candidates[0];if(!c)throw Error('No reachable cover candidate');
  const top=c.top??c.h,y=top-8,hx=c.hx??c.r,hz=c.hz??c.r;
  const axis=Math.abs(p.pos.x-c.x)-hx>Math.abs(p.pos.z-c.z)-hz?'x':'z',sign=Math.sign(p.pos[axis]-c[axis])||1;
  const approach=[c.x,y,c.z];approach[axis==='x'?0:2]+=sign*((axis==='x'?hx:hz)+180);
  return {spawn:p.pos.toArray(),approach,target:[c.x,y,c.z],cover:{x:c.x,z:c.z,hx,hz,top}};
 });
 await page.screenshot({path:out+'/01-spawn.png'});
 await travel([result.route.spawn[0],result.route.approach[1],result.route.spawn[2]],10000);
 await travel(result.route.approach,14000);await page.screenshot({path:out+'/02-approach.png'});
 await travel(result.route.target,6000,true);await page.waitForTimeout(150);await page.screenshot({path:out+'/03-contact.png'});
 await keys(['KeyS','Space']);await page.waitForTimeout(700);await keys();await page.screenshot({path:out+'/04-recovery.png'});
 result.witness=await page.evaluate(()=>environmentWitness);result.end=await read();
 assert.ok(result.witness.contacts.some(c=>c.airborne&&c.speed>70&&c.cover),'Native fast flight contacted real cover');
 assert.ok(result.witness.contacts.filter(c=>c.cover).every(c=>Math.abs(c.pos[0]-c.cover.x)>=c.cover.hx+c.radius-.001||Math.abs(c.pos[2]-c.cover.z)>=c.cover.hz+c.radius-.001),'All recorded side contacts remain outside expanded cover');
 assert.deepEqual(result.errors,[]);assert.deepEqual(result.witness.faults,[]);result.status='PASS';
}catch(e){result.status='FAIL';result.failure=e.stack;process.exitCode=1;}
finally{
 await keys();result.witness??=await page.evaluate(()=>window.environmentWitness).catch(()=>null);
 const video=page.video();await context.close();await video.saveAs(out+'/native-environment-contact.webm');await browser.close();
 await writeFile(out+'/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify({status:result.status,failure:result.failure,route:result.route,contacts:result.witness?.contacts,errors:result.errors},null,2));
}
