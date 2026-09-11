import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2]||'artifacts/hand-startup-native';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1600,height:900},recordVideo:{dir:out,size:{width:1600,height:900}}}),page=await context.newPage();
const result={scope:'Native KANO Practice: take off, travel, aim upward, strafe during paired beam, release and recover. No pose/entity/resource changes; not a hostile target or full performance test.',errors:[],samples:[]};let mx=800,my=450;
page.on('pageerror',e=>result.errors.push(String(e)));
async function sample(label){const row=await page.evaluate(()=>{const g=PW.game,f=g.player,b=f.slots.lmb.active;return {time:g.time,hero:f.def.id,pos:f.pos.toArray(),vel:f.vel.toArray(),flying:f.flying,ki:f.ki,charging:!!f.slots.lmb.charging,preparing:b?.pendingLaunch,emissionAge:b?.emissionAge||0,pitch:g.world._lookPitch,beams:g.projectiles.list.filter(b=>b.caster===f&&b.path).map(b=>({age:b.emissionAge,live:b.sustaining,dir:b.dir.toArray()})),faults:[...(g._errSeen||[])]};});result.samples.push({label,...row});await page.screenshot({path:`${out}/${label}.png`});return row;}
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=kano');await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});await page.bringToFront();await page.waitForTimeout(600);
 await page.mouse.click(mx,my);await page.waitForFunction(()=>!!document.pointerLockElement);
 // Pointer-lock acquisition can also be an attack press. Cancel it using the
 // actual guard control before measuring the deliberately aimed release.
 await page.keyboard.down('KeyC');await page.waitForTimeout(150);await page.keyboard.up('KeyC');await page.waitForTimeout(700);
 const start=await sample('00-start');assert.equal(start.beams.filter(b=>b.live).length,0);
 await page.keyboard.down('Space');await page.waitForTimeout(1400);await page.keyboard.up('Space');
 await page.keyboard.down('KeyW');await page.waitForTimeout(650);await sample('01-flight');await page.keyboard.up('KeyW');
 for(let i=0;i<12;i++){const dy=await page.evaluate(()=>-(70*Math.PI/180-PW.game.world._lookPitch)/PW.game.world._lookSens);my+=Math.max(-160,Math.min(160,dy));await page.mouse.move(mx,my);await page.waitForTimeout(60);}
 await page.keyboard.down('KeyA');await page.mouse.down();await sample('02-trigger');
 for(let i=0;i<7;i++){await page.waitForTimeout(300);await sample(`03-fire-${i}`);}
 await page.mouse.up();await page.waitForTimeout(600);await sample('04-release');await page.keyboard.up('KeyA');await page.waitForTimeout(700);await sample('05-recover');
 assert.ok(result.samples.some(s=>s.flying&&Math.hypot(s.vel[0],s.vel[2])>8&&s.beams.some(b=>b.live&&b.age>0&&b.dir[1]>.7)),'No upward paid paired beam during actual horizontal flight');
 result.skyWashout=await page.evaluate(async()=>{
  PW.game.world.render(); // Read in the render task before WebGL clears its drawing buffer.
  const src=PW.game.world.renderer.domElement,im=new Image();im.src=src.toDataURL();await im.decode();
  const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);
  const data=ctx.getImageData(0,0,c.width,c.height).data;let white=0,visible=0;
  for(let i=0;i<data.length;i+=4){if(data[i+3]>0)visible++;if(data[i]>235&&data[i+1]>235&&data[i+2]>235)white++;}
  if(visible<c.width*c.height*.9)throw Error('Invalid cleared WebGL readback');
  return white/(c.width*c.height);
 });
 assert.ok(result.skyWashout<.25,`Looking upward whites out ${(result.skyWashout*100).toFixed(1)}% of the game canvas after the beam ends`);
 assert.deepEqual(result.errors,[]);assert.ok(result.samples.every(s=>s.faults.length===0));result.passed=true;
}catch(e){result.failure=String(e);process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{await page.mouse.up().catch(()=>{});for(const key of ['KeyA','KeyD','KeyW','Space'])await page.keyboard.up(key).catch(()=>{});await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await context.close();await page.video().saveAs(`${out}/native-flight-release.webm`);await browser.close();console.log(JSON.stringify(result));}
