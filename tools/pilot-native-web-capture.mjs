import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const out=process.argv[2]||'artifacts/power-pilot/web-native';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false});
const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}});
const page=await context.newPage(),video=page.video(),report={scope:'Native normal-practice WEBLINE. Public Shift+N training targets. Camera aimed by mouse movement; Q fires the real selected Web Darts. No actor, pose, health, status, energy or simulation overrides.',errors:[],samples:[]};
report.revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
report.url='http://127.0.0.1:5182/powerworld.html?hero=webline';
report.audio='Video contains no audio; sound lifecycle is tested separately.';
page.on('pageerror',e=>report.errors.push(e.message));
const read=()=>page.evaluate(()=>{const g=PW.game;return {time:g.time,ki:g.player.ki,shot:g.player.slots.q.def.name,targets:g.entities.filter(f=>f.isDummy).map(f=>({id:f.id,hp:f.hp,web:!!f._webControl,remaining:f._webControl?.t,wrap:!!f._webControl?.wrap?.parent,immune:f._webControlImmune,grabbed:!!f.grabbedBy})),faults:[...(g._errSeen||[])]};});
try{
 await page.goto(report.url);await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});
 await page.bringToFront();await page.mouse.click(720,450,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
 await page.keyboard.press('Shift+KeyN');await page.waitForTimeout(1700);
 let mx=720,my=450;
 for(let i=0;i<6;i++){
  const aim=await page.evaluate(()=>{const g=PW.game,w=g.world,t=g.entities.find(f=>f.isDummy),p=t.center(g.player.pos.clone()).project(w.camera);return{x:p.x*720,y:-p.y*450,fov:w.camera.fov,sens:w._lookSens};});
  const focal=450/Math.tan(aim.fov*Math.PI/360);
  mx+=Math.atan2(aim.x,focal)/aim.sens;my+=Math.atan2(aim.y,focal)/aim.sens;
  await page.mouse.move(mx,my);await page.waitForTimeout(150);
 }
 report.before=await read();await page.screenshot({path:`${out}/web-ready.png`});
 await page.keyboard.press('KeyQ');
 for(let i=0;i<16;i++){
  await page.waitForTimeout(55);const row=await read();report.samples.push(row);
  if(!report.wrapShot&&row.targets.some(t=>t.web&&t.wrap)){report.wrapShot=`${out}/web-contact.png`;await page.screenshot({path:report.wrapShot});}
 }
 await page.waitForTimeout(1500);report.after=await read();await page.screenshot({path:`${out}/web-recovered.png`});
 assert.ok(report.wrapShot,'Native Q must visibly wrap the target');
 assert.ok(report.samples.some(r=>r.targets.some(t=>t.hp<report.before.targets.find(b=>b.id===t.id).hp)),'Direct impact must damage');
 assert.ok(report.after.targets.every(t=>!t.web&&!t.grabbed),'Control must expire without grab ownership');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.after.faults,[]);report.passed=true;
}catch(e){report.failure=String(e);process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{await writeFile(`${out}/results.json`,JSON.stringify(report,null,2));await context.close();await video.saveAs(`${out}/native-web.webm`);await browser.close();console.log(JSON.stringify(report));}
