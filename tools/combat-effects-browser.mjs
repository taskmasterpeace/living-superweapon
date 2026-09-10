import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/combat-effects';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],results={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=aurum');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.getByRole('tab',{name:'Effects',exact:true}).click();
 await page.getByRole('button',{name:'Preview constructs',exact:true}).click();
 await page.waitForFunction(()=>STUDIO.preview.state==='attack',{timeout:3000});
 await page.getByLabel('Preview attack',{exact:true}).selectOption('q');
 await page.getByRole('button',{name:'Orbit',exact:true}).click();
 for(const [name,time] of [['construct-forming',.9],['construct-solid',1.8]]){
  results[name]=await page.evaluate(time=>{const p=STUDIO.preview;p.playing=false;p.seek(time);p.renderer.render(p.scene,p.camera);return {time,constructs:p.combat.game.constructs.length,cover:p.combat.game.world.cover.length,phase:p.combat.phase};},time);
  await page.screenshot({path:`${out}/${name}.png`});assert.equal(results[name].constructs,1);
 }
 await page.getByLabel('Construct assembly time value',{exact:true}).fill('1.10');await page.getByLabel('Construct assembly time value',{exact:true}).press('Tab');
 await page.getByRole('button',{name:'Save local',exact:true}).click();
 results.saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('lsw.studio.profiles.v1')).aurum.effects);
 assert.equal(results.saved.construct.assemblyTime,1.1);
 const downloadWait=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON',exact:true}).click();
 const download=await downloadWait;await download.saveAs(`${out}/aurum-effects.json`);
 await page.getByRole('button',{name:'Import JSON',exact:true}).click();
 await page.getByLabel('Profile JSON',{exact:true}).fill(await readFile(`${out}/aurum-effects.json`,'utf8'));
 await page.getByRole('button',{name:'Import profile',exact:true}).click();
 await page.getByRole('button',{name:'Save local',exact:true}).click();
 await page.getByRole('button',{name:'Preview shield hits',exact:true}).click();
 await page.getByRole('button',{name:'Orbit',exact:true}).click();
 results.shield=await page.evaluate(()=>{const p=STUDIO.preview;p.playing=false;p.seek(1.04);p.renderer.render(p.scene,p.camera);const m=p.fighter.parts.guardArc.material;return {hits:m.hits?.filter(h=>h.w>=0).length,damage:p.combat.damage};});
 await page.screenshot({path:`${out}/shield-hit.png`});assert.ok(results.shield.hits>0);assert.ok(results.shield.damage>0);
 await page.reload();await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 assert.equal(await page.evaluate(()=>STUDIO.preview.fighter.def.effects.construct.assemblyTime),1.1);
 await page.getByRole('button',{name:'Play Test',exact:false}).click();await page.waitForFunction(()=>window.LSW?.game);
 await page.locator('#pwGo').click();
 results.game=await page.evaluate(async()=>{
  const {runSlot}=await import('/src/engine/abilities.js'),g=LSW.game,f=g.player;
  g.update=()=>{};g.aimPoint.copy(f.pos).add({x:14,y:0,z:20});
  runSlot(f,'q',{pressed:true,held:true,released:false,dt:1/60},g);
  const c=g.constructs.find(c=>c.owner===f);if(!c)throw Error('Native gameplay construct was not created');
  c.update(.8,g);g.world.render();
  return {hero:f.def.id,effects:f.def.effects,assemblyTime:c.surfaceFx.assemblyTime,particles:c.surfaceFx.geometry?.attributes.position.count};
 });
 assert.equal(results.game.hero,'aurum');assert.equal(results.game.assemblyTime,1.1);assert.ok(results.game.particles>0);
 await page.screenshot({path:`${out}/gameplay-construct.png`});
 results.errors=errors;assert.deepEqual(errors,[]);console.log(JSON.stringify(results,null,2));
}finally{await writeFile(`${out}/results.json`,JSON.stringify({...results,errors},null,2));await browser.close();}
