import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2]||'artifacts/marketing/prone-desert-recheck-2026-09-12';await mkdir(out,{recursive:true});
const viewport=process.argv.includes('--portrait')?{width:900,height:1600}:{width:1600,height:900};
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport,recordVideo:{dir:out,size:viewport}}),page=await context.newPage(),video=page.video();
const result={scope:'Native SARGE Practice, Z prone, W crawl with LMB fire, R reload, Z stand. Controlled portal staging only; native prone/crawl/fire/reload.',viewport,errors:[],phases:[]};page.on('pageerror',e=>result.errors.push(String(e)));
const shot=async name=>{const state=await page.evaluate(()=>{const g=PW.game,f=g.player;return{prone:f.prone,weight:f._pronePose?.weight,pos:f.pos.toArray(),cameraY:g.world.camera.position.y,pitch:g.world._lookPitch,yaw:g.world._lookYaw,lock:g.hardLock?.id,anchor:g.world._flightAnchor?.toArray(),ammo:f.slots.lmb.ammo.loaded,foot:f.onFoot,faults:[...(g._errSeen||[])]};});result.phases.push({name,...state});await page.screenshot({path:`${out}/${name}.png`});};
try{
 await page.goto('http://127.0.0.1:5184/powerworld.html?hero=sarge');await page.waitForTimeout(2500);await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).click();await page.waitForFunction(()=>PW.game._threatRoom?.active,null,{timeout:90000});await page.evaluate(()=>{const g=PW.game;g.player.pos.copy(g.ms.threatLab.origin).add({x:0,y:0,z:18});g.player.vel.set(0,0,0);g.world._lookYaw=Math.PI;g.world._lookPitch=0;g.world._chaseSnap=true;});await page.waitForTimeout(250);await page.keyboard.press('e');await page.waitForFunction(()=>PW.game.ms.threatLab.state==='deploying');await page.keyboard.down('w');await page.waitForFunction(()=>PW.game.ms.threatLab.state==='field',null,{timeout:10000});await page.keyboard.up('w');await page.bringToFront();await page.mouse.click(viewport.width/2,viewport.height/2);await page.waitForFunction(()=>!!document.pointerLockElement);await page.waitForTimeout(500);
 await shot('standing');await page.keyboard.press('KeyZ');await page.waitForTimeout(200);await shot('lowering');await page.waitForTimeout(900);await shot('prone');
 await page.keyboard.down('KeyW');await page.mouse.down();await page.waitForTimeout(700);await shot('crawl-fire');await page.mouse.up();await page.keyboard.up('KeyW');
 await page.keyboard.press('KeyR');await page.waitForTimeout(750);await shot('reload');await page.waitForTimeout(2100);await shot('reload-complete');
 await page.keyboard.press('KeyZ');await page.waitForTimeout(1200);await shot('standing-again');
 const p=name=>result.phases.find(p=>p.name===name);assert.ok(p('prone').weight>.95&&p('prone').prone);assert.ok(p('prone').cameraY<p('standing').cameraY-1);
 assert.ok(p('crawl-fire').ammo<30);assert.equal(p('reload-complete').ammo,30);assert.equal(p('standing-again').prone,false);assert.ok(p('standing-again').weight<.001);
 assert.ok(Math.hypot(p('crawl-fire').pos[0]-p('prone').pos[0],p('crawl-fire').pos[2]-p('prone').pos[2])>1,'native crawl must move');
 assert.ok(result.phases.every(p=>p.faults.length===0));assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.failure=String(e);process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await context.close();await video.saveAs(`${out}/native-prone.webm`);await browser.close();console.log(JSON.stringify(result));}


