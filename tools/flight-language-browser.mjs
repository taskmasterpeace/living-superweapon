import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[],out='artifacts/flight-review/languages';await mkdir(out,{recursive:true});
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO);
 const choices=await page.locator('select[data-path="model.flightStyle"] option').evaluateAll(es=>es.map(e=>e.value));
 assert.ok(choices.includes('twin')&&choices.includes('hammer')&&choices.includes('glider'),'New flight languages are not in Studio');
 await page.getByRole('tab',{name:'Flight',exact:true}).click();assert.ok(await page.getByLabel('Trail width value',{exact:true}).isVisible());
 const rows=[];
 for(const style of ['hero','twin','martial','thruster','hammer','glider']){
  await page.getByRole('tab',{name:'Model',exact:true}).click();await page.locator('select[data-path="model.flightStyle"]').selectOption(style);
  await page.getByRole('button',{name:'Replace pose family',exact:true}).click();
  await page.getByLabel('Motion state',{exact:true}).selectOption('forward');
  const row=await page.evaluate(()=>{const p=STUDIO.preview;p.playing=false;p.seek(1.2);return {style:p.fighter.parts.rig.flightStyle,wake:p.wake?.n||0,position:p.fighter.pos.toArray()};});
  assert.ok(row.wake>25,`${style} preview has no traveled wake`);rows.push(row);
  await page.screenshot({path:`${out}/${style}-rear.png`});
  await page.getByRole('button',{name:'Side view',exact:true}).click();await page.screenshot({path:`${out}/${style}-side.png`});
  const seeks=await page.evaluate(()=>{const p=STUDIO.preview;p.seek(1.2);const a=p.camera.position.toArray();p.seek(1.2);return {a,b:p.camera.position.toArray()};});
  assert.ok(seeks.a.every((v,i)=>Math.abs(v-seeks.b[i])<.01),'Repeated seek drifts the inspection camera');
  await page.getByRole('button',{name:'Game camera',exact:true}).click();
 }
 await page.getByLabel('Motion state',{exact:true}).selectOption('cycle');
 for(const t of [0,2,3.5,5,7.9]){await page.evaluate(t=>STUDIO.preview.seek(t),t);await page.screenshot({path:`${out}/transition-${t}.png`});}
 await page.getByLabel('Motion state',{exact:true}).selectOption('forward');
 await page.getByRole('button',{name:'Orbit',exact:true}).click();
 await page.evaluate(()=>{const p=STUDIO.preview;p.seek(1.2);window.wakeBefore=Array.from(p.wake.mesh.geometry.attributes.position.array);p.camera.position.x+=25;p.camera.lookAt(p.controls.target);});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.ok(await page.evaluate(()=>STUDIO.preview.wake.mesh.geometry.attributes.position.array.some((v,i)=>Math.abs(v-wakeBefore[i])>.01)),'Paused orbit leaves trail geometry edge-on');
 assert.deepEqual(errors,[]);await writeFile(out+'/results.json',JSON.stringify({rows,errors},null,2));console.log('PASS six production styles, traveled Studio wakes, 12 angles and five transition phases');
}finally{await browser.close();}
