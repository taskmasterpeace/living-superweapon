import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const out='artifacts/melee-depth';await mkdir(out,{recursive:true});
try {
  await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
  const options=await page.locator('#state option').evaluateAll(xs=>xs.map(x=>x.value));
  assert.ok(options.includes('melee'),'Studio exposes production melee sequences');
  await page.getByRole('button',{name:'Pause preview',exact:true}).click();
  await page.getByLabel('Motion state',{exact:true}).selectOption('melee');
  assert.equal(await page.evaluate(()=>STUDIO.preview.fighter._chaseKb===true&&STUDIO.preview.combat.target._chaseKb===true),true,'Studio melee uses the same PowerWorld knockback regime as Play Test');
  const rows=[];
  for(const sequence of ['combo','heavy','crush','body','throw','slam']) {
    await page.getByLabel('Melee sequence',{exact:true}).selectOption(sequence);
    const row=await page.evaluate(()=>{
      const p=STUDIO.preview,read=()=>({damage:p.combat.damage,contacts:p.combat.contacts,pos:p.combat.target.pos.toArray(),state:p.fighter.mstate??null,grab:!!p.fighter.grabbing,projectiles:p.combat.game.projectiles.list.length,mode:p.combat.mode,events:structuredClone(p.combat.meleeEvents)});
      p.seek(4);const first=read();p.seek(.4);p.seek(4);return {sequence:p.combat.meleeSequence,first,replay:read()};
    });
    assert.deepEqual(row.first,row.replay,`${sequence} replay must be deterministic`);
    assert.ok(row.first.contacts>0,`${sequence} must physically connect`);
    assert.ok(row.first.contacts<20,`${sequence} has discrete impacts, not a substituted sustained beam`);
    assert.equal(row.first.projectiles,0);assert.equal(row.first.mode,'melee');
    const kind={combo:'light',heavy:'heavy',crush:'crush',body:'body',throw:'throw',slam:'slam-release'}[sequence];
    assert.ok(row.first.events.some(e=>e.move===kind),`${sequence} needs its own production contact event, not a different attack`);
    if(sequence==='slam')assert.ok(row.first.pos[1]<20,'slam really reaches the floor');
    if(sequence==='throw')assert.ok(row.first.pos[2]>15,'throw has actual ballistic travel');
    assert.equal(row.first.grab,false,`${sequence} must release both fighters`);
    rows.push(row);
  }
  await page.getByLabel('Melee sequence',{exact:true}).selectOption('slam');
  await page.getByRole('button',{name:'Side view',exact:true}).click();
  for(const time of [.25,.65,1.3,1.65,2.2,3.5]) {
    await page.evaluate(t=>STUDIO.preview.seek(t),time);
    const framed=await page.evaluate(()=>{const p=STUDIO.preview;p.camera.updateMatrixWorld(true);return [p.fighter,p.combat.target].flatMap(f=>[f.pos.clone(),f.parts.head.getWorldPosition(f.pos.clone())]).map(v=>v.project(p.camera).toArray());});
    assert.ok(framed.every(v=>Math.abs(v[0])<.98&&Math.abs(v[1])<.98&&Math.abs(v[2])<1),`slam@${time}: both bodies stay inside the inspection frame`);
    await page.screenshot({path:`${out}/slam-${time}.png`});
  }
  await page.locator('[data-view="orbit"]').click();await page.evaluate(()=>STUDIO.preview.seek(.65));
  const canvas=await page.locator('.viewport canvas').first().boundingBox();
  await page.mouse.move(canvas.x+canvas.width/2,canvas.y+canvas.height/2);
  await page.mouse.wheel(0,180);
  await page.waitForFunction(()=>Math.abs(STUDIO.preview._meleeZoom-1)>.01);
  const zoom=await page.evaluate(()=>{const p=STUDIO.preview,before=p._meleeZoom;p.seek(1.3);return {before,after:p._meleeZoom,ratio:p.camera.position.distanceTo(p.controls.target)/p._meleeFit};});
  assert.equal(zoom.after,zoom.before);assert.ok(Math.abs(zoom.ratio-zoom.before)<.01,'Orbit retains deliberate zoom as the pair moves');
  await page.getByLabel('Melee sequence',{exact:true}).selectOption('body');
  await page.evaluate(()=>STUDIO.preview.seek(.76));await page.screenshot({path:`${out}/body-contact.png`});
  await page.getByLabel('Motion state',{exact:true}).selectOption('hover');
  assert.equal(await page.evaluate(()=>STUDIO.preview.combat.game.entities.length),0,'leaving melee clears the fixture');
  await page.setViewportSize({width:390,height:844});await page.getByLabel('Motion state',{exact:true}).selectOption('melee');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'mobile editor does not overflow');
  await page.screenshot({path:`${out}/studio-mobile.png`,fullPage:true});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({rows,errors},null,2));
  await writeFile(`${out}/studio-results.json`,JSON.stringify({rows,errors},null,2));
}finally{await browser.close();}
