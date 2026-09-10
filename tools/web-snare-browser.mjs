import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/web-snare-native';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false});
const context=await browser.newContext({viewport:{width:1672,height:941},recordVideo:{dir:out,size:{width:1672,height:941}}});
const page=await context.newPage(),video=page.video(),result={kind:'Normal spawn Free practice; public Shift+N training targets, native LMB Web Snare; no actor/camera/AI/timer overrides',errors:[],samples:[]};
page.on('pageerror',e=>result.errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=webline');await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady,null,{timeout:60000});
 await page.mouse.click(800,450,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
 await page.keyboard.press('Shift+KeyN');await page.waitForFunction(()=>PW.game.entities.some(f=>f.isDummy));
 const read=()=>page.evaluate(()=>{const g=PW.game,f=g.player;return {hero:f.def.id,slot:f.slots.lmb.def.name,pos:f.pos.toArray(),phase:f._webSnare?.phase,
  line:!!f._webSnare?.line?.visible,tip:f._webSnare?.tip.toArray(),dummies:g.entities.filter(x=>x.isDummy).map(x=>({id:x.id,hp:x.hp,pos:x.pos.toArray(),grabbed:x.grabbedBy===f,byPlayer:x.lastHitBy===f})),faults:[...(g._errSeen||[])]};});
 result.before=await read();await page.mouse.down({button:'left'});
 for(let i=0;i<18;i++){
  await page.waitForTimeout(50);const row=await read();result.samples.push(row);
  if(row.phase==='hold'&&!result.holdShot){result.holdShot=`${out}/web-hold.png`;await page.screenshot({path:result.holdShot});}
 }
 await page.mouse.up({button:'left'});await page.waitForTimeout(300);result.after=await read();await page.screenshot({path:`${out}/web-release.png`});
 assert.ok(result.samples.some(s=>s.phase==='reach'&&s.line),'Traveling wrist line never appeared');
 assert.ok(result.samples.some(s=>s.dummies.some(f=>f.grabbed)),'No native target was snared');
 assert.ok(result.after.dummies.some(f=>f.byPlayer&&f.hp<result.before.dummies.find(b=>b.id===f.id).hp),'No real attributed web impact');
 assert.ok(result.after.dummies.every(f=>!f.grabbed),'Web left a target restrained');assert.deepEqual(result.errors,[]);assert.deepEqual(result.after.faults,[]);
}catch(error){result.failure=error.stack;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw error;}
finally{await context.close();await video.saveAs(`${out}/web-snare-native.webm`);await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await browser.close();}
console.log(JSON.stringify(result));
