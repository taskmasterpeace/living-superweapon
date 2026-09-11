import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const out='artifacts/blocking';await mkdir(out,{recursive:true});
try {
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.getByLabel('Motion state',{exact:true}).selectOption('melee');
 const choices=await page.locator('#melee-sequence option').evaluateAll(xs=>xs.map(x=>x.value));
 assert.ok(choices.includes('block')&&choices.includes('break'),'Studio exposes actual incoming block and guard-break rehearsals');
 const rows=[];
 for(const sequence of ['block','break']) {
  await page.getByLabel('Melee sequence',{exact:true}).selectOption(sequence);
  const row=await page.evaluate(()=>{
   const p=STUDIO.preview,read=()=>({damage:p.combat.damage,contacts:p.combat.contacts,events:structuredClone(p.combat.meleeEvents),guard:p.fighter.guardMeter});
   p.seek(3);const first=read();p.seek(.1);p.seek(3);return {sequence:p.combat.meleeSequence,first,replay:read()};
  });
  assert.deepEqual(row.first,row.replay,`${sequence}: deterministic real-engine replay`);
  assert.ok(row.first.contacts>0,`${sequence}: incoming attack really connects`);
  assert.ok(row.first.events.some(e=>e.move===(sequence==='block'?'block':'crush')),`${sequence}: expected production outcome`);
  assert.match(await page.locator('.measurements').innerText(),/received/);
  rows.push(row);
 }
 for(const hero of ['sol','vanguard','aurum','sarge']) {
  await page.goto(`http://127.0.0.1:5180/studio.html?hero=${hero}`);await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
  await page.getByRole('button',{name:'Pause preview',exact:true}).click();
  await page.getByLabel('Motion state',{exact:true}).selectOption('melee');
  await page.getByLabel('Melee sequence',{exact:true}).selectOption('block');
  const pose=await page.evaluate(()=>{
   const p=STUDIO.preview;p.seek(.55);const f=p.fighter;
   return {id:f.def.id,guard:f.guarding,bends:[-f.parts.armL.children[1].rotation.x,-f.parts.armR.children[1].rotation.x],body:f.parts.body.rotation.toArray(),root:f.pos.toArray()};
  });
  assert.equal(pose.guard,true);assert.ok(pose.body.slice(0,3).every(Number.isFinite));
  for(const view of ['front','side','rear']) {
   await page.evaluate(({view})=>{
    const p=STUDIO.preview;p.seek(.55);const f=p.fighter;p.combat.target.obj.visible=false;p.controls.enabled=false;
    const c=f.pos.clone();c.y+=5;p.controls.target.copy(c);p.view='front';p.camera.fov=38;p.camera.updateProjectionMatrix();
    p.camera.position.copy(c).add({x:view==='side'?23:0,y:2,z:view==='front'?23:view==='rear'?-23:0});
    p.camera.lookAt(c);p.camera.updateMatrixWorld(true);p.renderer.render(p.scene,p.camera);
   },{view});
   await page.locator('.viewport').screenshot({path:`${out}/${hero}-${view}.png`});
  }
  rows.push(pose);
 }
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);await writeFile(`${out}/studio-results.json`,JSON.stringify({rows,errors},null,2));
 console.log(JSON.stringify({rows,errors},null,2));
} finally {await browser.close();}
