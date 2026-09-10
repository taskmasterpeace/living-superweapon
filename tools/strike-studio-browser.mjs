import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 assert.equal(await page.getByLabel('Light strike animation',{exact:true}).count(),1,'Studio must expose the real strike source choice');
 await page.getByLabel('Motion state',{exact:true}).selectOption('melee');
 await page.getByLabel('Melee stage',{exact:true}).selectOption('grounded');
 const row=await page.evaluate(()=>{
  const p=STUDIO.preview,read=()=>({damage:p.combat.damage,events:structuredClone(p.combat.meleeEvents),position:p.fighter.pos.toArray(),target:p.combat.target.pos.toArray()});
  p.seek(2);const first=read();p.seek(.2);p.seek(2);const replay=read();p.seek(.4);return {first,replay,take:p.fighter._authoredStrike?.take,grounded:!p.fighter.flying};
 });
 assert.deepEqual(row.first,row.replay);assert.ok(row.first.damage>0&&row.grounded);assert.equal(row.take,'Punch_Jab');
 assert.match(await page.locator('.measurements').innerText(),/Punch_Jab/);
 await page.getByLabel('Light strike animation',{exact:true}).selectOption('procedural');
 await page.evaluate(()=>STUDIO.preview.seek(.4));assert.equal(await page.evaluate(()=>STUDIO.preview.fighter._authoredStrike?.take??null),null);
 await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await page.getByLabel('Light strike animation',{exact:true}).inputValue(),'authored');
 await page.getByRole('button',{name:'Save local',exact:true}).click();await page.reload();await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 assert.equal(await page.getByLabel('Light strike animation',{exact:true}).inputValue(),'authored');
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await mkdir('artifacts/strikes',{recursive:true});await writeFile('artifacts/strikes/studio-results.json',JSON.stringify({row,errors},null,2));assert.deepEqual(errors,[]);console.log(JSON.stringify({row,errors},null,2));
}finally{await browser.close();}
