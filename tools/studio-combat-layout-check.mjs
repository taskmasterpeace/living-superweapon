import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const out='artifacts/flight-review/studio-combat';await mkdir(out,{recursive:true});
try {
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
 for(const width of [1440,790,390]){
  await page.setViewportSize({width,height:960});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  for(const view of ['front','side','rear','game']){
   await page.locator(`[data-view="${view}"]`).click();
   const result=await page.evaluate(()=>{
    const p=STUDIO.preview;p.seek(3);const box=document.querySelector('.viewport').getBoundingClientRect();
    const points=[p.fighter,p.combat.target].map(f=>f.pos.clone().add({x:0,y:5.2,z:0}).project(p.camera).toArray());
    return {overflow:document.documentElement.scrollWidth>innerWidth,points,box:{width:box.width,height:box.height}};
   });
   assert(!result.overflow,`${width}/${view}: controls overflow viewport`);
   assert(result.box.width>=300&&result.box.height>=350,`${width}/${view}: stage remains usable`);
   for(const point of result.points)assert(point.every(Number.isFinite)&&point.every(v=>Math.abs(v)<1),`${width}/${view}: both actors in frame`);
   if(view==='game')await page.screenshot({path:`${out}/layout-${width}.png`,fullPage:true});
  }
 }
 assert.deepEqual(errors,[]);console.log('PASS 12 desktop/narrow/mobile camera-view layouts; 0 page errors');
}finally{await browser.close();}
