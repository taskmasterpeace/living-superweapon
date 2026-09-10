import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/flight-split-aim/studio';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
 const saved=await page.evaluate(()=>JSON.stringify(STUDIO.history.value));
 for(const motion of ['air-left','air-right','air-forward']){
  await page.getByLabel('Fighter motion',{exact:true}).selectOption(motion);
  await page.locator('#target-elevation').fill('-20');await page.locator('#target-elevation').dispatchEvent('change');
  const row=await page.evaluate(async motion=>{
   const p=STUDIO.preview,T=await import('/node_modules/three/build/three.module.js');p.seek(1.2);
   const f=p.fighter,front=o=>new T.Vector3(0,0,1).applyQuaternion(o.getWorldQuaternion(new T.Quaternion()));
   const before={position:f.pos.toArray(),target:p.combat.target.pos.toArray()};p.step(0);
   return {motion,selected:p.combat.shooterMotion,flying:f.flying,grounded:f.grounded,position:f.pos.toArray(),velocity:f.vel.toArray(),beam:!!f.slots.lmb.active?.sustaining,eyeError:front(f.parts.head).angleTo(f.slots.lmb.active.dir),before,min:document.querySelector('#target-elevation').min,elevation:p.combat.elevation,unchanged:JSON.stringify(STUDIO.history.value)};
  },motion);rows.push(row);
  assert.equal(row.selected,motion);assert.equal(row.flying,true);assert.equal(row.grounded,false);assert.equal(row.position[1],80);assert.equal(row.min,'-75');assert.equal(row.elevation,-20);assert.ok(row.beam&&row.eyeError<.18);assert.equal(row.unchanged,saved);assert.deepEqual(row.position,row.before.position);
  await page.locator('.viewport').screenshot({path:`${out}/${motion}.png`});
 }
 await page.getByLabel('Fighter motion',{exact:true}).selectOption('ground-left');
 assert.equal(await page.locator('#target-elevation').inputValue(),'0');assert.equal(await page.locator('#target-elevation').getAttribute('min'),'0');
 assert.equal(await page.evaluate(()=>STUDIO.preview.combat.elevation),0);
 await page.getByLabel('Fighter motion',{exact:true}).selectOption('hover');
 assert.equal(await page.evaluate(()=>STUDIO.preview.fighter.flying),true);
 assert.equal(await page.evaluate(()=>JSON.stringify(STUDIO.history.value)),saved);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({rehearsals:rows.map(({unchanged,before,...r})=>r),errors}));
}finally{await writeFile(`${out}/results.json`,JSON.stringify({rows,errors},null,2));await browser.close();}
