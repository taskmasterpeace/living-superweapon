import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const out='artifacts/flight-review/studio-encounters';await mkdir(out,{recursive:true});
try {
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
 assert.equal(await page.getByLabel('Target motion',{exact:true}).count(),1,'Studio needs moving attack encounters, not only a static target');
 await page.getByLabel('Target motion',{exact:true}).selectOption('pass-left');
 for(const [label,bad,good] of [['Target speed','','70'],['Target distance','999','32'],['Target elevation','','0']]) {
  const field=page.getByLabel(label,{exact:true});await field.fill(bad);await field.press('Tab');
  await page.getByLabel('Target motion',{exact:true}).selectOption('orbit-left');
  assert.equal(await page.getByLabel('Target motion',{exact:true}).inputValue(),'pass-left',`${label}: rejected cross-field edit must restore the active motion label`);
  assert.equal(await page.evaluate(()=>STUDIO.preview.combat.motion),'pass-left');
  assert.match(await page.locator('#encounter-note').textContent(),/Pass left/);
  await field.fill(good);await field.press('Tab');
  assert.equal(await page.locator('.statusbar').evaluate(el=>el.classList.contains('error')),false,'correction clears stale error feedback');
 }
 const rows=[];
 for(const motion of ['pass-left','pass-right','orbit-left','orbit-right']) {
  await page.getByLabel('Target motion',{exact:true}).selectOption(motion);
  const row=await page.evaluate(()=>{
   const p=STUDIO.preview;
   const snapshot=()=>({target:p.combat.target.pos.toArray(),camera:p.camera.position.toArray(),body:p.fighter.parts.body.quaternion.toArray(),damage:p.combat.damage,
    path:Array.from(p.combat.game.projectiles.list.find(x=>x.constructor.name==='BeamHose')?.path||[])});
   p.seek(2);const start=snapshot();p.seek(2.4);const first=snapshot();
   p.seek(6);p.seek(2.4);const repeat=snapshot();
   p.seek(0);for(let i=1;i<=144;i++){p.time=i/60;p.step(1/60,false,false);}const played=snapshot();
   return {start,first,repeat,played,motion:p.combat.motion};
  });
  assert.notDeepEqual(row.start.target,row.first.target,`${motion}: target must actually travel`);
  assert(row.first.path.length&&row.first.damage>0,`${motion}: production beam and damage must remain live`);
  assert.deepEqual(row.first,row.repeat,`${motion}: backward seek clears encounter history`);
  assert.deepEqual(row.first,row.played,`${motion}: playback and scrub produce identical encounter`);
  rows.push(row);
 }
 assert.equal(await page.evaluate(()=>STUDIO.history.dirty),false,'encounter selection must not dirty saved character data');
 await page.getByLabel('Target speed',{exact:true}).fill('210');await page.getByLabel('Target speed',{exact:true}).press('Tab');
 assert.equal(await page.evaluate(()=>STUDIO.preview.combat.targetSpeed),210);
 const unchanged=await page.evaluate(()=>{const p=STUDIO.preview;p.setCombat({motion:'invalid',targetSpeed:999});return {motion:p.combat.motion,speed:p.combat.targetSpeed};});
 assert.deepEqual(unchanged,{motion:'orbit-right',speed:210});
 await page.getByLabel('Target motion',{exact:true}).selectOption('static');
 assert(await page.getByLabel('Target speed',{exact:true}).isDisabled(),'speed is irrelevant for a stationary target');
 for(const width of [1440,790,390]) {
  await page.setViewportSize({width,height:960});await page.getByLabel('Target motion',{exact:true}).selectOption('pass-left');
  await page.evaluate(()=>{STUDIO.preview.seek(2.4);});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}: editor must not overflow`);
  await page.screenshot({path:`${out}/studio-${width}.png`,fullPage:true});
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/evidence.json`,JSON.stringify({rows,errors},null,2));
 console.log('PASS 4 moving encounters; deterministic seek/playback; validation; 3 layouts; no profile mutations or page errors');
}finally{await browser.close();}
