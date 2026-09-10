// Real-time authoring playback of the production Fighter/FlightWake; not an FPS benchmark.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/flight-review/languages',browser=await chromium.launch();await mkdir(out,{recursive:true});
const context=await browser.newContext({viewport:{width:1440,height:960},recordVideo:{dir:out+'/recording',size:{width:1440,height:960}}});
const page=await context.newPage(),errors=[],rows=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);await page.bringToFront();
 for(const [hero,style] of [['kano','martial'],['sol','hero'],['majesty','twin'],['ironclad','thruster'],['stormcall','hammer'],['vanguard','glider']]){
  await page.locator('.search').fill(hero);await page.locator(`[data-hero="${hero}"]`).click();
  await page.getByLabel('Motion state',{exact:true}).selectOption('cycle');await page.getByRole('button',{name:'Game camera',exact:true}).click();
  await page.evaluate(()=>{const p=STUDIO.preview;p.playing=false;p.seek(0);p.playing=true;});
  assert.equal(await page.evaluate(()=>STUDIO.preview.fighter.parts.rig.flightStyle),style);
  await page.waitForFunction(()=>{const p=STUDIO.preview;if(p.time<1.9)return false;p.playing=false;return true;});await page.screenshot({path:`${out}/${hero}-cruise.png`});
  await page.getByRole('button',{name:'Side view',exact:true}).click();
  await page.evaluate(()=>STUDIO.preview.playing=true);
  await page.waitForFunction(()=>{const p=STUDIO.preview;if(p.time<2.9)return false;p.playing=false;return true;});await page.screenshot({path:`${out}/${hero}-boost-side.png`});
  await page.evaluate(()=>STUDIO.preview.playing=true);
  await page.waitForFunction(()=>{const p=STUDIO.preview;if(p.time<3.7)return false;p.playing=false;return true;});await page.screenshot({path:`${out}/${hero}-brake-side.png`});
  await page.getByRole('button',{name:'Game camera',exact:true}).click();
  await page.evaluate(()=>STUDIO.preview.playing=true);
  await page.waitForFunction(()=>STUDIO.preview.time>=7.8);
  rows.push(await page.evaluate(()=>{const p=STUDIO.preview;p.playing=false;return {hero:p.def.id,style:p.fighter.parts.rig.flightStyle,time:p.time,position:p.fighter.pos.toArray()};}));
  console.log('Reviewed motion cycle:',hero,style);
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/reel-results.json',JSON.stringify({rows,errors},null,2));
}finally{await context.close();await page.video().saveAs(out+'/flight-languages.webm');await browser.close();}
