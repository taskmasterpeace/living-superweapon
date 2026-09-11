import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

// Missing target wiring, a fabricated beam, stale seek state, or profile-only camera updates
// must fail against the actual editor, not a stand-alone pose mock.
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const navigation=[];page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigation.push(frame.url());});
const out='artifacts/flight-review/studio-combat';await mkdir(out,{recursive:true});
try {
  await page.goto('http://127.0.0.1:5180/studio.html');
  await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
  const available=await page.locator('#state option').evaluateAll(xs=>xs.map(x=>x.value));
  assert(available.includes('beam'),'Studio must expose a beam sequence against an opponent');
  await page.getByRole('button',{name:'Pause preview',exact:true}).click();
  await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
  await page.getByRole('button',{name:'Game camera',exact:true}).click();
  const pausedCamera=await page.evaluate(()=>{STUDIO.preview.seek(3);return STUDIO.preview.camera.quaternion.toArray();});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.deepEqual(await page.evaluate(()=>STUDIO.preview.camera.quaternion.toArray()),pausedCamera,'paused game camera must not be overwritten by orbit controls');
  const actionPose=await page.evaluate(()=>{const p=STUDIO.preview;p.seek(3);const cast=p.fighter.castPose;p.seek(7);return {cast,recovered:p.combat.target.state};});
  assert(actionPose.cast>.99,'preview must advance the production base casting pose');
  assert.equal(actionPose.recovered,'idle','target must recover from contact state');
  const rows=[];
  for(const hero of ['sol','kano','vega']) {
    await page.locator(`[data-hero="${hero}"]`).click();
    for(const elevation of [-60,0,60]) {
      await page.getByLabel('Target elevation',{exact:true}).fill(String(elevation));
      await page.getByLabel('Target elevation',{exact:true}).press('Tab');
      const row=await page.evaluate(async()=>{
        const p=STUDIO.preview;
        p.seek(3);
        const snapshot=()=>({body:p.fighter.parts.body.quaternion.toArray(),camera:p.camera.position.toArray(),
          aim:p.fighter.aimWorld.toArray(),energy:p.fighter.ki,damage:p.combat.damage,
          path:Array.from(p.combat.game.projectiles.list.find(x=>x.constructor.name==='BeamHose')?.path||[])});
        const first=snapshot(),beam=p.combat.game.projectiles.list.find(x=>x.constructor.name==='BeamHose');
        const target=p.combat.target.pos.clone().add({x:0,y:5.2,z:0}).project(p.camera);
        const emission=beam?.muzzle.distanceTo(p.fighter.muzzle(p.fighter.pos.clone(),beam.faceOrigin?1.1:undefined,beam.faceOrigin?8.3:undefined));
        p.seek(7);const recovered=p.combat.game.projectiles.list.length===0&&p.fighter._combatAim.weight<.001;
        p.seek(3);const second=snapshot();
        return {first,second,realBeam:!!beam&&p.combat.game.projectiles.constructor.name==='Projectiles',emission,target:target.toArray(),recovered};
      });
      assert(row.realBeam,`${hero}: production BeamHose exists`);
      assert(row.first.damage>0,`${hero}: actual beam contact applies damage`);
      assert(row.emission<.2,`${hero}: rendered emitter remains on rig`);
      assert(row.target.every(Number.isFinite)&&Math.abs(row.target[0])<.92&&Math.abs(row.target[1])<.92&&Math.abs(row.target[2])<1,`${hero}: target inside game camera`);
      assert(row.recovered,`${hero}: release clears beam and recovers body`);
      assert.deepEqual(row.first,row.second,`${hero}: seek must not retain spring/beam/damage history`);
      rows.push({hero,elevation,...row});
      if(hero==='kano')await page.screenshot({path:`${out}/kano-${elevation}.png`});
    }
  }
  // Preview settings are session inspection state, never silently saved into a hero profile.
  assert.equal(await page.evaluate(()=>STUDIO.history.dirty),false);
  const catalogue=await page.evaluate(async()=>{
    const {ROSTER}=await import('/src/data/characters.js'),{profileFromDef}=await import('/src/tool/studio-profile.js');
    const p=STUDIO.preview,rows=[];
    for(const def of ROSTER.filter(d=>Object.values(d.abilities||{}).some(s=>s.type==='beam'))){
      p.setProfile(def,profileFromDef(def));p.setState('beam');
      for(const [slot] of p.combat.slots){
        p.setCombat({slot,elevation:0,distance:24});p.seek(2.6);
        const state={hero:def.id,slot,damage:p.combat.damage,live:p.combat.game.projectiles.list.length,energy:p.fighter.ki};
        p.seek(7);state.remaining=p.combat.game.projectiles.list.length;rows.push(state);
      }
    }
    return rows;
  });
  for(const row of catalogue){assert(row.damage>0&&row.live>0,`${row.hero}/${row.slot}: beam slot contact`);assert.equal(row.remaining,0);assert(Number.isFinite(row.energy)&&row.energy>=0);}
  // Return UI and preview to the same selected hero before checking normal editor navigation.
  console.log('Catalogue navigation diagnostics',await page.evaluate(()=>({
    sol:document.querySelector('[data-hero="sol"]')?.outerHTML,
    selected:document.querySelector('[data-hero][aria-pressed="true"]')?.dataset.hero,
    playing:STUDIO.preview.playing,view:STUDIO.preview.view,
    materials:STUDIO.preview.renderer.info.memory,programs:STUDIO.preview.renderer.info.programs.length,
  })));
  await page.locator('[data-hero="sol"]').click();
  await page.locator('[data-hero="kano"]').click();
  await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
  const playback=await page.evaluate(()=>{
    const p=STUDIO.preview;p.seek(3);const expected={ki:p.fighter.ki,damage:p.combat.damage,body:p.fighter.parts.body.quaternion.toArray()};
    p.seek(0);
    // Same integration steps as ordinary playback, including floating point clock accumulation.
    for(let i=0;i<180;i++){p.time+=1/60;p.step(1/60,false,false);}
    return {expected,actual:{ki:p.fighter.ki,damage:p.combat.damage,body:p.fighter.parts.body.quaternion.toArray()}};
  });
  assert(Math.abs(playback.expected.ki-playback.actual.ki)<1e-8&&Math.abs(playback.expected.damage-playback.actual.damage)<1e-8,'playback and scrub must agree on input-edge timing');
  await page.getByRole('tab',{name:'Pose',exact:true}).click();
  assert(await page.getByLabel('Left shoulder pitch value',{exact:true}).isVisible(),'combat mode does not index a nonexistent flight pose');
  await page.getByLabel('Motion state',{exact:true}).selectOption('hover');
  assert.equal(await page.evaluate(()=>STUDIO.preview.combat.target.obj.visible),false);
  assert.equal(await page.evaluate(()=>STUDIO.preview.combat.game.projectiles.list.length),0);
  await page.locator('[data-hero="gale"]').click();
  assert.equal(await page.locator('#state option[value="beam"]').isDisabled(),true,'no invented beam for a beamless kit');
  assert.deepEqual(errors,[]);
  await writeFile(`${out}/results.json`,JSON.stringify({rows,catalogue,errors},null,2));
  console.log('PASS 9 real beam/elevation/seek/recovery cases, unsupported kit and editor state; 0 page errors');
}catch(error){
  await writeFile(`${out}/failure.json`,JSON.stringify({message:error.message,url:page.url(),navigation,errors,
    body:await page.locator('body').innerText().catch(()=>'<unavailable>')},null,2));
  await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw error;
}finally{await browser.close();}
