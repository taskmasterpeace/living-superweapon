import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

// Normal spawn -> walking -> boarding -> keyboard flight. Read-only telemetry.
const out=process.argv.find(a=>a.startsWith('--output='))?.slice(9)||'artifacts/jet-controls-native';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false});
const context=await browser.newContext({viewport:{width:1672,height:941},recordVideo:{dir:out,size:{width:1672,height:941}}});
const page=await context.newPage(),video=page.video(),result={scope:'Native practice jet boarding and separate pitch/bank/rudder/throttle; not combat or landing acceptance',samples:[],errors:[]};
page.on('pageerror',e=>result.errors.push(e.stack));
let held=new Set();
async function keys(next=[]){const wanted=new Set(next);for(const k of held)if(!wanted.has(k))await page.keyboard.up(k);for(const k of wanted)if(!held.has(k))await page.keyboard.down(k);held=wanted;}
async function read(){return page.evaluate(()=>{const g=PW.game,p=g.player,a=g.pwStage.aircraft.actors.find(a=>a.pilotable&&a.kind==='jet');return {pos:p.pos.toArray(),alive:p.alive,seated:p._aircraftVehicle?.kind,aim:[p.aim3.x,p.aim3.z],faults:[...(g._errSeen||[])],jet:{pos:a.wrapper.position.toArray(),radius:a.bodyRadius,speed:a.speed||0,pitch:a.pitch||0,roll:a.roll||0,yaw:a.yaw||0,parked:a.parked,destroyed:!!a.destroyed}};});}
async function sample(label){const s=await read();result.samples.push({label,...s});return s;}
async function walkTo(x,z){let best=Infinity,progress=Date.now();const start=Date.now();while(Date.now()-start<30000){const s=await read(),dx=x-s.pos[0],dz=z-s.pos[2],d=Math.hypot(dx,dz);assert.ok(s.alive);if(d<4.5){await keys();await page.waitForTimeout(250);return;}if(d<best-1){best=d;progress=Date.now();}assert.ok(Date.now()-progress<4500,`Navigation blocked at ${s.pos}`);const n=Math.hypot(...s.aim)||1,fx=s.aim[0]/n,fz=s.aim[1]/n,f=dx*fx+dz*fz,r=-dx*fz+dz*fx,next=[];if(Math.abs(f)>2.5)next.push(f>0?'KeyW':'KeyS');if(Math.abs(r)>2.5)next.push(r>0?'KeyD':'KeyA');await keys(next);await page.waitForTimeout(120);}throw Error('Native walk timeout');}
async function pulse(label,key,ms=250){const before=await sample(`${label}-before`);await keys([key]);await page.waitForTimeout(ms);const after=await sample(label);await page.screenshot({path:`${out}/${label}.png`});await keys();assert.equal(after.seated,'jet');assert.equal(after.jet.destroyed,false);return {before:before.jet,after:after.jet};}
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=sarge');await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&PW.game.pwStage.aircraft?.ready,null,{timeout:60000});
 const start=await sample('spawn'),a=start.jet;
 await walkTo(a.pos[0]+a.radius+7,a.pos[2]-65);await walkTo(a.pos[0]+a.radius+4,a.pos[2]);
 await page.keyboard.press('KeyJ');await page.waitForFunction(()=>PW.game.player._aircraftVehicle?.kind==='jet',null,{timeout:5000});await sample('boarded');
 await keys(['KeyR','KeyS']);await page.waitForTimeout(4500);await keys();const takeoff=await sample('takeoff');
 assert.equal(takeoff.seated,'jet');assert.ok(takeoff.jet.pos[1]>a.pos[1]+20);assert.equal(takeoff.jet.parked,false);
 await page.screenshot({path:`${out}/01-takeoff.png`});
 let pair=await pulse('02-nose-down','KeyW');assert.ok(pair.after.pitch<pair.before.pitch);
 pair=await pulse('03-nose-up','KeyS');assert.ok(pair.after.pitch>pair.before.pitch);
 pair=await pulse('04-bank-right','KeyD');assert.ok(pair.after.roll>pair.before.roll);assert.ok(pair.after.yaw<pair.before.yaw);
 pair=await pulse('05-bank-left','KeyA',500);assert.ok(pair.after.roll<0);
 await keys();await page.waitForTimeout(1800);
 pair=await pulse('06-rudder-left','KeyQ');assert.ok(pair.after.yaw>pair.before.yaw);
 pair=await pulse('07-rudder-right','KeyE');assert.ok(pair.after.yaw<pair.before.yaw);
 pair=await pulse('08-accelerate','KeyR',500);assert.ok(pair.after.speed>pair.before.speed);
 pair=await pulse('09-brake','KeyF',500);assert.ok(pair.after.speed<pair.before.speed);
 assert.deepEqual(result.errors,[]);assert.ok(result.samples.every(s=>s.faults.length===0));result.ok=true;
}catch(error){result.error=error.stack;result.last=await read().catch(()=>null);await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});process.exitCode=1;}
finally{await keys().catch(()=>{});await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await context.close();await video.saveAs(`${out}/jet-controls.webm`);await browser.close();console.log(JSON.stringify(result));}
