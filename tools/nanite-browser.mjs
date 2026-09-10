import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';

// Genuine portable recipe through the actual Studio UI. Fixed-step scrub is
// inspection evidence, not player-input or real-time performance approval.
const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5189',koOnly=process.env.LSW_NANITE_KO_ONLY==='1',out=koOnly?'artifacts/nanite-studio-ko':'artifacts/nanite-studio';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),context=await browser.newContext({viewport:{width:1600,height:1050}}),page=await context.newPage();
page.setDefaultTimeout(30000);const errors=[],result={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(`${m.text()} ${m.location().url}`);});
const pause=async()=>{if(await page.evaluate(()=>STUDIO.preview.playing))await page.getByRole('button',{name:'Pause preview',exact:true}).click();};
const seek=async time=>page.evaluate(time=>{const p=STUDIO.preview;p.seek(time);return p.combat.naniteStats();},time);
const importJson=async value=>{await page.getByRole('button',{name:'Import JSON',exact:true}).click();await page.getByLabel('Profile JSON',{exact:true}).fill(JSON.stringify(value));await page.getByRole('button',{name:'Import profile',exact:true}).click();};
const field=key=>page.locator(`input[type="number"][data-attack-key="${key}"]`);
const edit=async(key,value)=>{await field(key).fill(String(value));await field(key).press('Tab');};
const snapshot=async(name,time)=>{const state=await seek(time);await page.screenshot({path:`${out}/${name}.png`});return state;};
try{
 await page.route('**/favicon.ico',route=>route.fulfill({status:204,body:''})); // Existing absent favicon is not an app module failure.
 await page.goto(base+'/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview.fighter);await pause();
 const pack=await page.evaluate(async()=>{
  const {freshPicks,buildDef}=await import('/src/data/creator.js'),{profileFromDef}=await import('/src/tool/studio-profile.js'),{exportCharacter}=await import('/src/tool/character-package.js');
  const picks=freshPicks();Object.assign(picks,{name:'NANITE UI',budget:'unbound',flightTier:3});Object.assign(picks.slots,{lmb:'kibolt',rmb:'heatray',q:'nanite-cannon',e:'nanite-shield'});
  const def=buildDef(picks,'cx_nanite_browser'),profile=profileFromDef(def);profile.model.body='superhero-female';return exportCharacter({picks,def},profile);
 });
 await importJson(pack);await page.waitForFunction(()=>!document.querySelector('dialog').open&&STUDIO.preview.fighter.def.isCustom);
 await pause();result.id=await page.evaluate(()=>STUDIO.preview.def.id);
 if(koOnly){
  await page.getByLabel('Motion state',{exact:true}).selectOption('attack');
  await page.getByLabel('Preview attack',{exact:true}).selectOption('q');await page.getByLabel('Co-fire attack',{exact:true}).selectOption('e');
  await page.getByLabel('Contact test',{exact:true}).selectOption('nanite');
  await page.getByLabel('Nanite incoming sample',{exact:true}).selectOption('shield');
  await page.getByLabel('Fighter motion',{exact:true}).selectOption('ground-left');await page.getByLabel('Target motion',{exact:true}).selectOption('static');
  // Explicit inspection fixture: native incoming contact on a one-HP owner.
  // No saved HP change, direct damage call or ragdoll-physics substitution.
  result.koPose=await page.evaluate(()=>{
   const p=STUDIO.preview;p.setState('attack');
   p.setCombat({slot:'q',secondarySlot:'e',pattern:'nanite',naniteSample:'shield',shooterMotion:'ground-left',motion:'static',distance:32});
   p.setProfile({...p.def,hp:1},p.profile);p.seek(0);
   for(let i=1;i<=180;i++){p.time=i/60;p.step(1/60,false,false);}
   const pose=f=>{f.obj.updateMatrixWorld(true);return [...f.ragdoll.pivots,...f.ragdoll.driven].map(m=>m.matrixWorld.toArray());};
   const clock=f=>JSON.stringify({koT:f.koT,animT:f.animT,points:Object.values(f.ragdoll.P).map(v=>[v.pos.toArray(),v.prev.toArray()])});
   const delta=(a,b)=>Math.max(...a.flatMap((matrix,i)=>matrix.map((v,j)=>Math.abs(v-b[i][j]))));
   window.__naniteKoProof={pose,clock,delta};const f=p.fighter,before=pose(f),time=clock(f),checks=[];
   for(const view of [null,'front','side','rear','orbit']){if(view)p.setView(view);else p.step(0);checks.push({view:view||'zero',matrixError:delta(before,pose(f)),clockUnchanged:time===clock(f)});}
   p.setView('front');document.querySelector('.viewport-note').textContent='Inspection fixture: 1 HP owner · native incoming KO · zero-time front view';
   return {alive:f.alive,hp:f.hp,koT:f.koT,checks};
  });
  assert.equal(result.koPose.alive,false);assert.ok(result.koPose.checks.every(c=>c.matrixError<1e-8&&c.clockUnchanged));
  await page.getByRole('button',{name:'Front view',exact:true}).click();await page.getByLabel('Isolate fighter',{exact:true}).check();
  await page.evaluate(()=>document.querySelector('.viewport-note').textContent='Isolated inspection fixture: 1 HP owner · native incoming KO · zero-time front view');
  await page.screenshot({path:`${out}/ko-front.png`});
  await page.getByRole('button',{name:'Side view',exact:true}).click();await page.screenshot({path:`${out}/ko-side.png`});
  result.seek=await page.evaluate(()=>{const p=STUDIO.preview,{pose,clock,delta}=window.__naniteKoProof;p.seek(3);const f=p.fighter,shown=pose(f),before=clock(f);f.ragdoll.apply(f);f._sync();const error=delta(shown,pose(f));p.setView('front');return {alive:f.alive,matrixError:error,clockUnchanged:before===clock(f)};});
  assert.equal(result.seek.alive,false);assert.ok(result.seek.matrixError<1e-8&&result.seek.clockUnchanged);
  await page.getByRole('button',{name:'Front view',exact:true}).click();
  await page.screenshot({path:`${out}/ko-seek.png`});
  await page.getByLabel('Isolate fighter',{exact:true}).uncheck();
  await page.getByLabel('Fighter motion',{exact:true}).selectOption('hover');await page.getByLabel('Target distance',{exact:true}).fill('12');await page.getByLabel('Target distance',{exact:true}).press('Tab');
  result.deadSource=await page.evaluate(async()=>{
   const p=STUDIO.preview,{setAttackOverride}=await import('/src/data/attack-tuning.js');
   const profile=structuredClone(p.profile);profile.attacks=setAttackOverride(profile.attacks,p.def,'q',{dmgMin:500,dmgMax:600,maxBlast:100});
   p.setProfile({...p.def,hp:106},profile);p.setCombat({shooterMotion:'hover',motion:'static',distance:12});p.seek(3);p.setView('front');
   document.querySelector('.viewport-note').textContent='Inspection fixture: valid high-blast profile · incoming source KO prevents its later sample';
   return {...p.combat.naniteStats(),incomingAlive:p.combat.incoming.alive,label:document.querySelector('#nanite-measurements').textContent};
  });
  assert.equal(result.deadSource.incomingAlive,false);assert.equal(result.deadSource.incomingStatus,'unavailable-ko');assert.equal(result.deadSource.emitted,0);assert.equal(result.deadSource.contacts,0);assert.match(result.deadSource.label,/fixture unavailable: incoming KO/);
  await page.screenshot({path:`${out}/incoming-ko.png`});assert.deepEqual(errors,[]);
  console.log(JSON.stringify({koPose:result.koPose,seek:result.seek,deadSource:{emitted:result.deadSource.emitted,contacts:result.deadSource.contacts,incomingStatus:result.deadSource.incomingStatus},errors},null,2));
 }else{
 await page.getByRole('tab',{name:'Attacks',exact:true}).click();await page.getByLabel('Attack slot',{exact:true}).selectOption('q');
 assert.equal(await page.getByRole('heading',{name:'Formation',exact:true}).count(),1,'Nanite configuration must be visible within Attack inspector');
 assert.equal(await page.getByLabel('Forearm',{exact:true}).inputValue(),'right-forearm');
 assert.equal(await page.locator('[data-attack-key="emissionOrigin"]').count(),0);
 assert.equal(await page.getByRole('button',{name:'Swap forearms',exact:true}).count(),1);
 await edit('naniteRepairDelay',.7);await edit('naniteStage1',.3);
 await page.getByRole('button',{name:'Swap forearms',exact:true}).click();
 assert.equal(await page.getByLabel('Forearm',{exact:true}).inputValue(),'left-forearm');
 assert.equal(await page.evaluate(()=>STUDIO.preview.fighter.parts.nanites.get('q').arm===STUDIO.preview.fighter.parts.armR),true,'Anatomical left, not legacy armL');
 await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await page.getByLabel('Forearm',{exact:true}).inputValue(),'right-forearm');
 await page.getByRole('button',{name:'Redo',exact:true}).click();assert.equal(await page.getByLabel('Forearm',{exact:true}).inputValue(),'left-forearm');
 await page.getByRole('button',{name:'Save local',exact:true}).click();
 const stored=await page.evaluate(()=>JSON.stringify(localStorage)),draft=await page.evaluate(()=>STUDIO.history.value);
 const invalid=structuredClone(draft);invalid.attacks.q.values.naniteAttachment='right-forearm';
 await page.evaluate(()=>{window.__naniteOldActor=STUDIO.preview.fighter;window.__naniteOldDraft=JSON.stringify(STUDIO.history.value);});
 await importJson(invalid);assert.match(await page.locator('#import-error').textContent(),/forearm/i);
 assert.equal(await page.evaluate(()=>STUDIO.preview.fighter===window.__naniteOldActor&&JSON.stringify(STUDIO.history.value)===window.__naniteOldDraft),true);
 assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),stored);await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.getByLabel('Forearm',{exact:true}).selectOption('right-forearm');assert.equal(await page.getByLabel('Forearm',{exact:true}).inputValue(),'left-forearm');
 assert.equal(await page.evaluate(()=>JSON.stringify(STUDIO.history.value)),JSON.stringify(draft));
 // Invalid package must fail before even asking to save a valid unsaved draft.
 await edit('naniteDensity',.6);
 const invalidPackage={...pack,sourceId:result.id,profile:invalid};
 await importJson(invalidPackage);assert.equal(await page.locator('#import-error').count(),1,`Invalid package must reject before draft-save dialog: ${await page.locator('dialog').textContent()}`);assert.match(await page.locator('#import-error').textContent(),/forearm/i);
 await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('button',{name:'Save local',exact:true}).click();
 await page.getByLabel('Motion state',{exact:true}).selectOption('attack');await page.getByLabel('Preview attack',{exact:true}).selectOption('q');
 await page.getByLabel('Co-fire attack',{exact:true}).selectOption('e');await page.getByLabel('Contact test',{exact:true}).selectOption('nanite');
 await page.getByLabel('Nanite incoming sample',{exact:true}).selectOption('shield');
 await page.getByLabel('Fighter motion',{exact:true}).selectOption('ground-left');await page.getByLabel('Target motion',{exact:true}).selectOption('orbit-left');
 await page.getByLabel('Target speed',{exact:true}).fill('10');await page.getByLabel('Target speed',{exact:true}).press('Tab');
 assert.equal(await page.evaluate(()=>STUDIO.preview.duration),8);assert.equal(await page.getByLabel('Charge hold',{exact:true}).isDisabled(),true);
 result.zero=await seek(0);assert.ok(result.zero.modules.every(m=>m.assemblyT===0));
 result.assembly=await snapshot('assembly',.325);result.charge=await snapshot('charge',1.2);result.contact=await snapshot('contact',2.5);
 assert.ok(result.contact.contacts>0);assert.ok(result.contact.modules.some(m=>m.absorbed>0));
 result.repaired=await snapshot('repaired',5.5);assert.ok(result.repaired.launches>0);assert.ok(result.repaired.modules.every(m=>m.intactCells===m.totalCells));
 result.endpoint=await snapshot('endpoint',8);assert.equal(await page.evaluate(()=>STUDIO.preview.combat.game.projectiles.list.length),0);
 // The earlier paid cannon can knock the close attacker out of reach. Select
 // only the shield for an uncontested native punch; do not freeze that recoil.
 await page.getByLabel('Preview attack',{exact:true}).selectOption('e');await page.getByLabel('Co-fire attack',{exact:true}).selectOption('');
 await page.getByLabel('Nanite incoming sample',{exact:true}).selectOption('punch');assert.equal(await page.getByLabel('Fighter motion',{exact:true}).isDisabled(),true);
 result.punch=await snapshot('punch',3);assert.ok(result.punch.events.some(e=>e.kind==='punch'&&e.target==='owner'));
 await page.getByLabel('Nanite incoming sample',{exact:true}).selectOption('shield');await page.getByLabel('Preview attack',{exact:true}).selectOption('q');await page.getByLabel('Co-fire attack',{exact:true}).selectOption('e');
 await page.getByLabel('Playback rate',{exact:true}).selectOption('0.25');
 assert.equal(await page.evaluate(()=>STUDIO.preview.playbackRate),.25);assert.ok(!Object.hasOwn(await page.evaluate(()=>STUDIO.history.value),'playbackRate'));
 await page.getByRole('button',{name:'Sound off',exact:true}).click();await page.getByRole('button',{name:'Sound on',exact:true}).waitFor();
 const audio=await page.evaluate(()=>STUDIO.preview.sound.eventCount);await seek(0);await seek(5.5);assert.equal(await page.evaluate(()=>STUDIO.preview.sound.eventCount),audio);
 await page.getByRole('button',{name:'Sound on',exact:true}).click();
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON',exact:true}).click();
 const download=await downloadPromise;result.exported=JSON.parse(await readFile(await download.path(),'utf8'));
 assert.equal(result.exported.picks.slots.q,'nanite-cannon');assert.equal(result.exported.picks.slots.e,'nanite-shield');assert.equal(result.exported.profile.attacks.q.values.naniteAttachment,'left-forearm');
 await importJson(result.exported);await page.waitForFunction(id=>!document.querySelector('dialog').open&&STUDIO.preview.def.id!==id,result.id);
 result.copyId=await page.evaluate(()=>STUDIO.preview.def.id);assert.notEqual(result.copyId,result.id);
 await page.reload();await page.waitForFunction(()=>window.STUDIO?.preview.fighter);await pause();
 await page.locator(`[data-hero="${result.copyId}"]`).click();await page.getByRole('tab',{name:'Attacks',exact:true}).click();await page.getByLabel('Attack slot',{exact:true}).selectOption('q');
 assert.equal(await page.getByLabel('Forearm',{exact:true}).inputValue(),'left-forearm');assert.equal(await field('naniteRepairDelay').inputValue(),'.7'.replace(/^\./,'0.'));
 await page.getByLabel('Attack slot',{exact:true}).selectOption('e');assert.equal(await page.locator('[data-attack-key="naniteStage1"]').count(),0);assert.equal(await page.getByLabel('Forearm',{exact:true}).inputValue(),'right-forearm');
 await page.getByLabel('Motion state',{exact:true}).selectOption('attack');await page.getByLabel('Preview attack',{exact:true}).selectOption('e');await page.getByLabel('Co-fire attack',{exact:true}).selectOption('q');await page.getByLabel('Contact test',{exact:true}).selectOption('nanite');await page.getByLabel('Nanite incoming sample',{exact:true}).selectOption('shield');
 result.reversed=await snapshot('reverse-selection',2.5);assert.ok(result.reversed.modules.some(m=>m.form==='shield'&&m.absorbed>0));
 const beforeKo=await seek(2.3);assert.ok(beforeKo.alive);result.ko=await page.evaluate(()=>{const p=STUDIO.preview;p.fighter.hp=1;for(let i=139;i<=330;i++){p.time=i/60;p.step(1/60,false,false);}return p.combat.naniteStats();});
 assert.equal(result.ko.alive,false,'Explicit one-HP fixture must retain native KO, not autoheal');
 await seek(2.5);
 await page.screenshot({path:`${out}/formation.png`});await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${out}/mobile.png`,fullPage:true});
 result.mobile=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));assert.ok(result.mobile.scroll<=result.mobile.client+1);
 await page.setViewportSize({width:1280,height:800});
 await page.getByRole('button',{name:'Play Test ↗',exact:true}).click();await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 result.native=await page.evaluate(()=>({id:LSW.game.player.def.id,arms:Object.fromEntries(Object.entries(LSW.game.player.def.abilities).filter(([,a])=>a.naniteForm).map(([slot,a])=>[slot,a.naniteAttachment])),symbols:[...document.querySelectorAll('.attack-icon')].map(e=>e.dataset.symbol)}));
 assert.equal(result.native.id,result.copyId);assert.equal(result.native.arms.q,'left-forearm');assert.equal(result.native.arms.e,'right-forearm');
 assert.ok(result.native.symbols.includes('nanite-cannon'));assert.ok(result.native.symbols.includes('nanite-shield'));
 await page.screenshot({path:`${out}/native-hud.png`});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({id:result.id,copyId:result.copyId,contact:result.contact,repaired:result.repaired,mobile:result.mobile,errors},null,2));
 }
}finally{result.errors=errors;await writeFile(`${out}/result.json`,JSON.stringify(result,null,2));await browser.close();}
