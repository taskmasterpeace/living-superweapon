import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/web-flurry-native';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false});
const context=await browser.newContext({viewport:{width:1672,height:941},recordVideo:{dir:out,size:{width:1672,height:941}}});
const page=await context.newPage(),video=page.video(),result={scope:'Normal spawn, Free practice, public Shift+N range and native RMB Spider Flurry. No actor, camera, AI, health or clock overrides.',errors:[],samples:[]};
page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
const read=()=>page.evaluate(()=>{const g=PW.game,f=g.player;return {pos:f.pos.toArray(),combo:f.slots.rmb.combo||0,foe:f.slots.rmb.foe?.id,ki:f.ki,hp:f.hp,slot:f.slots.rmb.def.name,
 dummies:g.entities.filter(x=>x.isDummy).map(x=>({id:x.id,hp:x.hp,pos:x.pos.toArray(),byPlayer:x.lastHitBy===f})),faults:[...(g._errSeen||[])]};});
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=webline');await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady,null,{timeout:60000});
 await page.mouse.click(800,450,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
 await page.keyboard.press('Shift+KeyN');await page.waitForFunction(()=>PW.game.entities.some(f=>f.isDummy));
 result.before=await read();await page.screenshot({path:`${out}/01-before.png`});
 await page.mouse.click(800,450,{button:'right'});
 for(let i=0;i<32;i++){
  await page.waitForTimeout(50);const row=await read();result.samples.push(row);
  if(row.combo>0&&!result.contactShot){result.contactShot=`${out}/02-flurry.png`;await page.screenshot({path:result.contactShot});}
 }
 result.after=await read();await page.screenshot({path:`${out}/03-after.png`});
 assert.equal(result.before.slot,'Spider Flurry');assert.ok(result.samples.some(s=>s.combo>0),'RMB never began a flurry');
 const victim=result.after.dummies.find(d=>d.byPlayer&&d.hp<result.before.dummies.find(b=>b.id===d.id)?.hp);
 assert.ok(victim,'Flurry must inflict native attributed damage');result.damage=result.before.dummies.find(d=>d.id===victim.id).hp-victim.hp;
 assert.ok(result.damage>=50,'Six-hit flurry stopped early on a clear path');assert.equal(result.after.combo,0);assert.ok(!result.after.foe);
 assert.deepEqual(result.errors,[]);assert.deepEqual(result.after.faults,[]);
}catch(e){result.failure=e.stack;process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{await context.close();await video.saveAs(`${out}/web-flurry-native.webm`);await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await browser.close();}
console.log(JSON.stringify(result));
