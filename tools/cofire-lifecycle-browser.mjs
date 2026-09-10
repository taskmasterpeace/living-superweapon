import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/concurrent-emitter';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=vega');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.getByLabel('Preview level',{exact:true}).selectOption('10');await page.getByLabel('Motion state',{exact:true}).selectOption('attack');
 await page.getByLabel('Co-fire attack',{exact:true}).selectOption('q');assert.equal(await page.getByLabel('Charge hold',{exact:true}).isEnabled(),true);
 await page.getByLabel('Charge hold',{exact:true}).fill('10');await page.getByLabel('Charge hold',{exact:true}).press('Tab');
 assert.equal(Number(await page.getByLabel('Preview time',{exact:true}).getAttribute('max')),16.6);
 // Enough energy for the long timing fixture; the production loop/slots are unchanged.
 const long=await page.evaluate(()=>{
  const p=STUDIO.preview;p.seek(0);p.fighter.energyInfinite=true;let launched=false;
  for(let i=1;i<=996;i++){p.combat.step(i/60,1/60);launched ||= p.combat.game.projectiles.list.some(s=>s.remoteDetonate||s.radius>2);}
  p.time=16.6;p.renderer.render(p.scene,p.camera);
  return {duration:p.duration,secondary:p.combat.secondarySlot,charging:p.fighter.slots.q.charging,launched,recovered:p.fighter._combatAim.weight<.001};
 });
 assert.ok(long.launched&&!long.charging&&long.recovered);await page.screenshot({path:out+'/studio-long-cofire.png'});
 assert.deepEqual(errors,[]);await writeFile(out+'/cofire-lifecycle.json',JSON.stringify({long,errors},null,2));console.log(JSON.stringify({long,errors}));
}finally{await browser.close();}
