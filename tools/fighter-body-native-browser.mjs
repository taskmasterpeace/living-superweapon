import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const out=process.argv.find(a=>a.startsWith('--output='))?.slice(9)||'artifacts/fighter-body-native';
const practice=process.argv.includes('--practice');
await mkdir(out,{recursive:true});
const result={kind:'Native normal-spawn Clone Recovery; keyboard flight/approach/attack; read-only collision instrumentation. No actor, AI, health, camera or simulation state overrides.',errors:[],actions:[]};
if(practice)result.kind='Native normal-spawn Free practice, N-deployed passive training target, keyboard flight/approach/attack. Read-only collision instrumentation; not a hostile combat witness.';
const browser=await chromium.launch({channel:'chromium',headless:false});
const page=await browser.newPage({viewport:{width:1672,height:941},recordVideo:{dir:out+'/video',size:{width:1672,height:941}}});
page.on('pageerror',e=>result.errors.push(e.stack));let held=new Set();
async function keys(next=[]){const want=new Set(next);for(const k of held)if(!want.has(k))await page.keyboard.up(k);for(const k of want)if(!held.has(k))await page.keyboard.down(k);held=want;}
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=vega');
 await page.locator(`[data-encounter="${practice?'practice':'frontline'}"]`).click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:60000});
 await page.bringToFront();
 if(practice)await page.keyboard.press('KeyN');
 await page.evaluate(()=>{
  const g=PW.game;window.bodyWitness={contacts:[],samples:[],faults:[],cost:[]};
  const old=g.resolveBodies.bind(g),report=g.reportError.bind(g);
  g.reportError=(e,c)=>{bodyWitness.faults.push(String(e));return report(e,c);};
  g.resolveBodies=()=>{
   const p=g.player,pre=p.pos.clone(),velocity=p.vel.clone(),started=performance.now();old();bodyWitness.cost.push(performance.now()-started);
   if(p.pos.distanceToSquared(pre)>.00001){
    const bounds=f=>{
     f.obj.updateMatrixWorld(true);const box=f.parts.torso.geometry.boundingBox.clone().makeEmpty();
     const parts=['torso','head','pelvis'].map(k=>f.parts[k]);
     for(const leg of [f.parts.legL,f.parts.legR])for(const key of ['thigh','shin','boot'])parts.push(leg.userData[key]);
     for(const part of parts){if(!part?.geometry)continue;if(!part.geometry.boundingBox)part.geometry.computeBoundingBox();box.union(part.geometry.boundingBox.clone().applyMatrix4(part.matrixWorld));}return box;
    };
    const pb=bounds(p);
    bodyWitness.contacts.push({time:g.time,pre:pre.toArray(),post:p.pos.toArray(),velocity:velocity.toArray(),afterVelocity:p.vel.toArray(),airborne:p.airborne,flying:p.flying,phase:p._abilityMeleePose?.elapsed,targets:g.entities.filter(f=>f!==p&&f.alive&&f.pos.distanceTo(p.pos)<30).map(f=>{
     const fb=bounds(f),depth=['x','y','z'].map(k=>Math.min(pb.max[k],fb.max[k])-Math.max(pb.min[k],fb.min[k]));
     return {name:f.name,pos:f.pos.toArray(),airborne:f.airborne,penetration:Math.max(0,Math.min(...depth))};
    })});
   }
  };
 });
 await page.screenshot({path:out+'/01-native-spawn.png'});
 await keys(['Space']);await page.waitForTimeout(130);await keys();
 const started=Date.now();let saved=false;
 while(Date.now()-started<18000){
  const s=await page.evaluate(()=>{
   const g=PW.game,p=g.player,foes=g.entities.filter(f=>f!==p&&f.alive&&f.team!==p.team).sort((a,b)=>a.pos.distanceToSquared(p.pos)-b.pos.distanceToSquared(p.pos));
   const cameraDirection=p.vel.clone();g.world.camera.getWorldDirection(cameraDirection);
   return {pos:p.pos.toArray(),hp:p.hp,alive:p.alive,aim:[cameraDirection.x,cameraDirection.z],foe:foes[0]?.pos.toArray(),flying:p.flying,contacts:bodyWitness.contacts.length};
  });
  assert.ok(s.alive,'Player survived the native approach');if(!s.foe)break;
  const dx=s.foe[0]-s.pos[0],dz=s.foe[2]-s.pos[2],length=Math.hypot(...s.aim)||1,fx=s.aim[0]/length,fz=s.aim[1]/length;
  const forward=dx*fx+dz*fz,right=-dx*fz+dz*fx,dy=s.foe[1]+5-s.pos[1],next=[];
  if(Math.abs(forward)>.3)next.push(forward>0?'KeyW':'KeyS');if(Math.abs(right)>.3)next.push(right>0?'KeyD':'KeyA');
  if(dy>2||!s.flying)next.push('Space');else if(dy< -2)next.push('ControlLeft');
  await keys(next);result.actions.push({elapsed:Date.now()-started,keys:next,...s});
  if(s.contacts&&!saved){await page.screenshot({path:out+'/02-native-body-contact.png'});saved=true;}
  // Melee is triggered through the user's key after the ordinary contact witness.
  if(s.contacts&&Date.now()-started>7000){await page.keyboard.press('KeyE');await page.waitForTimeout(800);break;}
  await page.waitForTimeout(75);
 }
 await keys();await page.waitForTimeout(700);await page.screenshot({path:out+'/03-native-recovery.png'});
 result.witness=await page.evaluate(()=>bodyWitness);
 result.end=await page.evaluate(()=>({url:location.href,hero:PW.game.player.def.id,alive:PW.game.player.alive,clones:PW.game.ms.frontline?.soldiers.length||0,visible:document.visibilityState,focused:document.hasFocus()}));
 assert.ok(result.witness.contacts.some(c=>c.flying&&c.targets.length),'At least one real airborne body interception');
 assert.ok(result.witness.contacts.every(c=>c.targets.every(t=>t.penetration<.03)),'Observed core and leg volumes must stay separated');
 assert.deepEqual(result.witness.faults,[]);assert.deepEqual(result.errors,[]);
 const times=result.witness.cost.toSorted((a,b)=>a-b);result.bodySolverTiming={samples:times.length,mean:times.reduce((a,b)=>a+b,0)/times.length,p95:times[Math.floor(times.length*.95)],scope:'Body resolver only during this encounter; not a frame-rate benchmark'};
 result.status='PASS';
}catch(e){result.status='FAIL';result.failure=e.stack;process.exitCode=1;}
finally{
 if(!result.witness)result.witness=await page.evaluate(()=>window.bodyWitness).catch(()=>null);
 await keys();const video=page.video();await page.context().close();await video.saveAs(out+'/native-contact.webm');await browser.close();
 await writeFile(out+'/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify({status:result.status,failure:result.failure,contacts:result.witness?.contacts.length,timing:result.bodySolverTiming,end:result.end,errors:result.errors},null,2));
}
