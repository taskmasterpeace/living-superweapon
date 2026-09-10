import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
const out='artifacts/locomotion';await mkdir(out,{recursive:true});page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 const choices=await page.locator('#state option').evaluateAll(xs=>xs.map(x=>x.value));
 assert.ok(choices.includes('groundWalk')&&choices.includes('groundJog')&&choices.includes('groundSprint'),'Studio must expose authored ground states');
 const rows=[];
 for(const [state,take]of Object.entries({groundWalk:'Walk_Loop',groundJog:'Jog_Fwd_Loop',groundSprint:'Sprint_Loop'})){
  await page.getByLabel('Motion state',{exact:true}).selectOption(state);
  const row=await page.evaluate(()=>{
   const p=STUDIO.preview,read=()=>({phase:p.fighter._groundMotion.phase,body:p.fighter.parts.body.position.toArray(),arm:p.fighter.parts.armR.quaternion.toArray(),pos:p.fighter.pos.toArray(),take:p.fighter._groundMotion.take});
   p.seek(1.4);const first=read();p.seek(.2);p.seek(1.4);return {state:p.state,first,replay:read()};
  });
  assert.deepEqual(row.first,row.replay);assert.equal(row.first.take,take);assert.equal(row.first.pos[1],0);
  assert.match(await page.locator('.measurements').innerText(),new RegExp(take));rows.push(row);
  const seam=await page.evaluate(()=>{const p=STUDIO.preview;p.seek(0);const start=p.fighter.parts.body.quaternion.clone(),duration=p.fighter._groundMotion.duration;p.seek(duration*2);return start.angleTo(p.fighter.parts.body.quaternion);});
  assert.ok(seam<.025,`${state}: initial scrub frame must match the same phase after two cycles, got ${seam}`);
 }
 await page.getByLabel('Ground locomotion',{exact:true}).selectOption('procedural');
 assert.equal(await page.evaluate(()=>STUDIO.preview.fighter.def.model.locomotion),'procedural');
 await page.getByRole('button',{name:'Undo',exact:true}).click();
 assert.equal(await page.getByLabel('Ground locomotion',{exact:true}).inputValue(),'authored');
 await page.getByRole('button',{name:'Save local',exact:true}).click();
 await page.reload();await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 assert.equal(await page.getByLabel('Ground locomotion',{exact:true}).inputValue(),'authored');
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);await writeFile(`${out}/studio-results.json`,JSON.stringify({rows,errors},null,2));console.log(JSON.stringify({rows,errors},null,2));
}finally{await browser.close();}
