// Native Studio authoring and deterministic rendered rehearsal. No user storage,
// source kit, game camera or gameplay input is replaced by this isolated context.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {freshPicks,buildDef} from '../src/data/creator.js';
import {profileFromDef} from '../src/tool/studio-profile.js';
import {exportCharacter} from '../src/tool/character-package.js';

const label=process.argv[2]||'review';if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid capture label');
const out=`artifacts/authored-origins/${label}`;await mkdir(`${out}/frames`,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
const page=await context.newPage(),errors=[],checks=[],rows=[];page.setDefaultTimeout(45000);
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const pause=async()=>{await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);if(await page.getByRole('button',{name:'Pause preview',exact:true}).isVisible())await page.getByRole('button',{name:'Pause preview',exact:true}).click();};
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await pause();
 const picks={...freshPicks(),name:'PALM RELAY',budget:'unbound',slots:{lmb:'heatray',rmb:'kibolt',q:'unibeam',e:null,f:null,r:null}};
 const def=buildDef(picks,'cx_palm_relay'),pack=exportCharacter({picks,def},profileFromDef(def));
 await page.getByRole('button',{name:'Import JSON',exact:true}).click();await page.locator('#profile-json').fill(JSON.stringify(pack));
 await page.getByRole('button',{name:'Import profile',exact:true}).click();await page.waitForFunction(()=>STUDIO.preview.fighter.def.name==='PALM RELAY');
 await page.getByRole('tab',{name:'Attacks',exact:true}).click();await page.getByLabel('Attack slot',{exact:true}).selectOption('lmb');
 await page.getByLabel('Motion state',{exact:true}).selectOption('attack');
 for(const origin of ['left','right','paired','chest','eyes']){
  await page.getByLabel('Attack origin',{exact:true}).selectOption(origin);
  assert.equal(await page.getByLabel('Attack origin',{exact:true}).evaluate(el=>el===document.activeElement),true);
  const row=await page.evaluate(origin=>{
   const p=STUDIO.preview;p.seek(2);const f=p.fighter,s=f.slots.lmb,b=s.active;
   return {origin,source:f._combatAim.source,style:f._combatAim.style,castHand:s.def.castHand,emissionAge:b?.emissionAge??0,combined:b?.combinedHands};
  },origin);checks.push(row);assert.ok(row.emissionAge>0,`${origin} UI choice never fired`);
  assert.equal(row.source,origin==='chest'?'chest':origin==='eyes'?'face':'hand');
  assert.equal(row.castHand,origin==='left'?'left':'right');assert.equal(row.combined,origin==='paired');
  await page.screenshot({path:`${out}/editor-${origin}.png`});
 }
 await page.getByLabel('Attack origin',{exact:true}).selectOption('left');
 await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await page.getByLabel('Attack origin',{exact:true}).inputValue(),'eyes');
 await page.getByRole('button',{name:'Redo',exact:true}).click();assert.equal(await page.getByLabel('Attack origin',{exact:true}).inputValue(),'left');
 await page.getByLabel('Attack slot',{exact:true}).selectOption('q');await page.getByLabel('Attack origin',{exact:true}).selectOption('left');
 assert.equal(await page.getByLabel('Chest emitter',{exact:true}).count(),0,'Explicit origin leaves an ignored legacy switch');
 await page.getByRole('button',{name:'Save local',exact:true}).click();const heroId=await page.evaluate(()=>STUDIO.history.value.heroId);
 await page.reload();await pause();await page.locator(`[data-hero="${heroId}"]`).click();await page.getByRole('tab',{name:'Attacks',exact:true}).click();
 for(const slot of ['lmb','q']){await page.getByLabel('Attack slot',{exact:true}).selectOption(slot);assert.equal(await page.getByLabel('Attack origin',{exact:true}).inputValue(),'left');}
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON',exact:true}).click();await (await download).saveAs(`${out}/palm-relay.json`);
 const exported=JSON.parse(await readFile(`${out}/palm-relay.json`,'utf8'));
 assert.equal(exported.profile.attacks.lmb.values.emissionOrigin,'left');assert.equal(exported.profile.attacks.q.values.emissionOrigin,'left');
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:`${out}/editor-mobile.png`,fullPage:true});await page.setViewportSize({width:1280,height:800});
 // Capture real Studio step/slot/contact/pose after authoring through the UI.
 await page.getByLabel('Motion state',{exact:true}).selectOption('attack');
 await page.evaluate(()=>{
  const p=STUDIO.preview;p.playing=false;p.controls.enabled=false;p.view='front';
  document.querySelector('header').style.display='none';document.querySelector('.library').style.display='none';document.querySelector('.inspector').style.display='none';
  document.querySelector('.viewport').style.cssText+=';position:fixed;inset:0;z-index:100;width:100vw;height:100vh;border:0;';p.resize();
 });
 let index=0;
 for(const spec of [{name:'left-beam-ground',slot:'lmb',motion:'ground-right'},{name:'left-charge-air',slot:'q',motion:'air-left'}]){
  await page.evaluate(spec=>{const p=STUDIO.preview;p.combat.slot=spec.slot;p.combat.shooterMotion=spec.motion;p.combat.distance=28;p.combat.elevation=0;p.combat.chargeHold=1.2;p.combat.motion='static';p.seek(0);},spec);
  const chapter=[];
  for(let sample=0;sample<120;sample++){
   const result=await page.evaluate(({sample,spec})=>{
    const p=STUDIO.preview,c=p.combat,f=p.fighter,rows=[];
    for(let n=1;n<=3;n++){
     p.time=(sample*3+n)/60;p.step(1/60,false,false);const s=f.slots[spec.slot],beam=s.active,orb=s.orb;
     const hand=f.parts.armR.children[2],hp=hand.getWorldPosition(f.pos.clone());
     rows.push({chapter:spec.name,frame:sample*3+n,phase:c.phase,pos:f.pos.toArray(),damage:c.damage,beamAge:beam?.emissionAge??0,groundTake:f._groundMotion?.take??null,
      muzzleGap:beam&&!beam.pendingLaunch?beam.muzzle.distanceTo(hp):null,charging:!!orb,orbGap:orb?orb.position.distanceTo(hp.clone().addScaledVector(f.aimWorld.clone().sub(hp).normalize(),orb.scale.x)):null});
    }
    const foe=c.target,center=f.pos.clone().lerp(foe.pos,.4);center.y+=6;
    const offset=sample<40?[.75,.35,.9]:sample<80?[1,.35,.05]:[-.65,.4,-1];
    const fit=(f.pos.distanceTo(foe.pos)*.55+8)/Math.tan(24*Math.PI/180);
    p.camera.position.set(...offset).normalize().multiplyScalar(fit).add(center);p.camera.lookAt(center);p.camera.fov=48;p.camera.updateProjectionMatrix();p.renderer.render(p.scene,p.camera);
    document.querySelector('.view-tag').textContent=spec.name.replaceAll('-',' ').toUpperCase();
    document.querySelector('.attack-phase').textContent=`SEQUENCE / ${c.phase.toUpperCase()}`;
    document.querySelector('.measurements').textContent=`${c.damage.toFixed(1)} actual damage · ${c.contacts} contacts · inspection camera`;
    document.querySelector('.viewport-note').textContent='Production Studio · scripted travel / real attack contacts · inspection camera · procedural casting over source locomotion';
    return {rows,png:p.renderer.domElement.toDataURL('image/png')};
   },{sample,spec});
   rows.push(...result.rows);chapter.push(...result.rows);
   await writeFile(`${out}/frames/${String(index++).padStart(4,'0')}.png`,Buffer.from(result.png.split(',')[1],'base64'));
   if([20,39,79,119].includes(sample))await page.screenshot({path:`${out}/${spec.name}-${sample}.png`});
   if(sample%40===0)console.log(`${spec.name} ${sample}/120`);
  }
  assert.ok(chapter.some(r=>r.damage>0),'The selected source never contacts the target');
  assert.ok(chapter.some(r=>Math.abs(r.pos[0])>4),'The rehearsal never travels');
  if(spec.slot==='lmb'){assert.ok(chapter.some(r=>r.beamAge>0));assert.ok(chapter.filter(r=>r.muzzleGap!==null).every(r=>r.muzzleGap<1e-5));}
  else{assert.ok(chapter.some(r=>r.charging));assert.ok(chapter.filter(r=>r.orbGap!==null).every(r=>r.orbGap<1e-5));assert.ok(chapter.some(r=>r.phase==='in flight'));}
  // Closer anatomical witnesses supplement the unbroken motion chapter. They
  // must not replace its startup, contact, and recovery evidence.
  for(const [view,offset]of [['front',[0,3,24]],['right',[24,3,0]],['left',[-24,3,0]],['rear',[0,3,-24]]]){
   await page.evaluate(({spec,view,offset})=>{
    const p=STUDIO.preview;p.seek(spec.slot==='q'?1.3:2.5);const f=p.fighter;
    const center=f.pos.clone();center.y+=6;p.camera.position.set(...offset).add(center);p.camera.lookAt(center);p.camera.fov=42;p.camera.updateProjectionMatrix();
    document.querySelector('.view-tag').textContent=`${spec.name.replaceAll('-',' ').toUpperCase()} / ${view.toUpperCase()}`;
    document.querySelector('.viewport-note').textContent='Supplementary anatomy still · production pose/emitter · inspection camera';
    p.renderer.render(p.scene,p.camera);
   },{spec,view,offset});
   await page.screenshot({path:`${out}/${spec.name}-close-${view}.png`});
  }
 }
 assert.deepEqual(errors,[]);
 await writeFile(`${out}/results.json`,JSON.stringify({checks,rows,errors,scope:'Isolated Studio UI authoring, Save/reload/export and mobile layout. 60 Hz scripted travel with native attacks; 20 fps batched inspection footage, silent. Not gameplay input, balance or FPS evidence.'},null,2));
 await promisify(execFile)('ffmpeg',['-y','-v','error','-xerror','-threads','1','-framerate','20','-i',`${out}/frames/%04d.png`,'-c:v','libx264','-threads','2','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',`${out}/authored-origins.mp4`]);
 console.log(JSON.stringify({checks,frames:rows.length,errors,video:`${out}/authored-origins.mp4`}));
}catch(e){await page.screenshot({path:`${out}/failure.png`,fullPage:true}).catch(()=>{});throw e;}
finally{await browser.close();}
