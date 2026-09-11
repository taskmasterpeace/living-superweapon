import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=process.env.LSW_BASE_URL||'http://127.0.0.1:5180';
const out='artifacts/attack-authoring';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const errors=[];

async function openStudio(context,hero='sol') {
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(`[console.error] ${message.text()}`);});
  await page.goto(`${base}/studio.html?hero=${hero}`);
  await page.waitForFunction(()=>window.STUDIO?.preview?.fighter,{timeout:15000});
  return page;
}

async function commitNumber(page,label,value) {
  const field=page.getByLabel(`${label} value`,{exact:true});
  await field.fill(String(value));
  await field.press('Tab');
}

async function selectAttack(page,slot) {
  await page.getByRole('tab',{name:'Attacks',exact:true}).click();
  await page.getByLabel('Attack slot',{exact:true}).selectOption(slot);
}

async function previewSnapshot(page,time) {
  return page.evaluate(time=>{
    const p=STUDIO.preview;
    p.seek(time);
    return {
      damage:p.combat.damage,
      contacts:p.combat.contacts,
      nominal:p.combat.nominalDamage,
      nominalUnit:p.combat.nominalUnit,
      phase:p.combat.phase,
      remoteDetonations:p.combat.remoteDetonations,
      ki:p.fighter.ki,
      projectiles:p.combat.game.projectiles.list.map(projectile=>projectile.constructor.name),
      shots:p.combat.game.projectiles.list.map(projectile=>({
        type:projectile.constructor.name,pos:projectile.pos?.toArray(),damage:projectile.damage,
        blast:projectile.blast,speed:projectile.vel?.length(),homing:projectile.homing,remoteDetonate:projectile.remoteDetonate,
      })),
      splitChildren:p.combat.splitChildren,
      liveSplitChildren:p.combat.liveSplitChildren,
      slot:{
        cd:p.fighter.slots[p.combat.slot]?.cd,
        charging:!!p.fighter.slots[p.combat.slot]?.charging,
        active:!!p.fighter.slots[p.combat.slot]?.active,
      },
      target:{hp:p.combat.target.hp,maxHp:p.combat.target.maxHp,state:p.combat.target.state},
    };
  },time);
}

let activePage=null;
try {
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  const page=activePage=await openStudio(context);
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
  await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);

  // The first assertion is the intentional RED gate. It catches the missing
  // production inspector before any implementation is allowed to exist.
  assert.equal(await page.getByRole('tab',{name:'Attacks',exact:true}).count(),1,
    'Studio must expose an Attacks inspector tab');

  const tabs=page.getByRole('tab');
  assert.equal(await tabs.count(),6,'Studio exposes model, pose, camera, flight, attacks and progression');
  await page.getByRole('tab',{name:'Model',exact:true}).focus();
  await page.keyboard.press('End');
  assert.equal(await page.getByRole('tab',{name:'Progression',exact:true}).getAttribute('aria-selected'),'true');
  assert.equal(await page.getByRole('tab',{name:'Progression',exact:true}).evaluate(el=>el===document.activeElement),true,
    'dynamic tab navigation keeps visible focus');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.getByRole('tab',{name:'Model',exact:true}).getAttribute('aria-selected'),'true');
  await page.keyboard.press('ArrowLeft');

  await selectAttack(page,'lmb');
  assert.match(await page.locator('.attack-identity').innerText(),/Heat Ray[\s\S]*beam/i);
  assert.match(await page.locator('.attack-authorship').innerText(),/shipped default/i);
  assert.match(await page.locator('.attack-balance-note').innerText(),/outside.*ORIGIN.*point/i);
  assert.equal(await page.getByLabel('Damage / sec value',{exact:true}).inputValue(),'60');
  assert.equal(await page.getByLabel('Steering value',{exact:true}).getAttribute('step'),'any',
    'typed values must not inherit HTML step-base rejection from .001 minima');

  await commitNumber(page,'Damage / sec',91);
  assert.equal(await page.getByLabel('Detonation damage value',{exact:true}).inputValue(),'72.8',
    'derived detonation damage must refresh immediately when DPS changes');
  await commitNumber(page,'Width',2);
  assert.equal(await page.getByLabel('Detonation radius value',{exact:true}).inputValue(),'16',
    'derived detonation radius must refresh immediately when width changes');
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  await commitNumber(page,'Steering',1.6);
  assert.deepEqual(await page.evaluate(()=>({
    profile:STUDIO.history.value.attacks.lmb.values,
    live:{dps:STUDIO.preview.fighter.slots.lmb.def.dps,steer:STUDIO.preview.fighter.slots.lmb.def.steer},
  })),{profile:{dps:91,steer:1.6},live:{dps:91,steer:1.6}},
  'committed controls rebuild the real Fighter slot');
  assert.match(await page.locator('.attack-authorship').innerText(),/authored/i);

  await page.getByRole('button',{name:'Undo',exact:true}).click();
  assert.equal(await page.evaluate(()=>STUDIO.preview.fighter.slots.lmb.def.steer),13);
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  assert.equal(await page.evaluate(()=>STUDIO.preview.fighter.slots.lmb.def.dps),60);
  await page.getByRole('button',{name:'Redo',exact:true}).click();
  await page.getByRole('button',{name:'Redo',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>[STUDIO.preview.fighter.slots.lmb.def.dps,STUDIO.preview.fighter.slots.lmb.def.steer]),[91,1.6]);

  await page.getByRole('button',{name:'Reset attack slot',exact:true}).click();
  assert.equal(await page.evaluate(()=>STUDIO.history.value.attacks.lmb),undefined);
  assert.deepEqual(await page.evaluate(()=>[STUDIO.preview.fighter.slots.lmb.def.dps,STUDIO.preview.fighter.slots.lmb.def.steer]),[60,13]);
  await page.getByLabel('Motion state',{exact:true}).selectOption('attack');
  await page.getByLabel('Preview attack',{exact:true}).selectOption('lmb');
  const defaultBeamContact=(await previewSnapshot(page,3)).damage;
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>[STUDIO.preview.fighter.slots.lmb.def.dps,STUDIO.preview.fighter.slots.lmb.def.steer]),[91,1.6]);
  const authoredBeamContact=(await previewSnapshot(page,3)).damage;
  assert(authoredBeamContact>defaultBeamContact*1.4,
    'authored beam damage must change measured production contact, not only displayed metadata');
  await page.getByLabel('Second press detonates',{exact:true}).check();
  await commitNumber(page,'Detonation radius',48);
  await commitNumber(page,'Detonation damage',120);
  await page.getByLabel('Target distance',{exact:true}).fill('60');
  await page.getByLabel('Target distance',{exact:true}).press('Tab');
  const armedBeam=await previewSnapshot(page,.75);
  assert(armedBeam.projectiles.includes('BeamHose')&&armedBeam.contacts===0&&armedBeam.phase==='armed',
    'remote beam must be visibly armed before ordinary target contact');
  const burstBeam=await previewSnapshot(page,.95);
  assert(burstBeam.remoteDetonations===1&&burstBeam.contacts>0&&burstBeam.projectiles.length===0&&burstBeam.phase==='detonated',
    'second press must detonate the real beam early and retire its resources');
  assert.equal(burstBeam.nominal,120,'remote burst must report the armed production shot payload');
  assert.equal(burstBeam.nominalUnit,'hp/burst','a detonated beam is not nominal hp/s');
  assert.match(await page.locator('.measurements').innerText(),/Nominal 120\.0 hp\/burst/i);
  assert.equal(burstBeam.target.hp,burstBeam.target.maxHp);
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'Undo',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>STUDIO.history.value.attacks.lmb.values),{dps:91,steer:1.6});
  await commitNumber(page,'Entry cost',1000);
  const deniedBeam=await previewSnapshot(page,.8);
  assert.equal(deniedBeam.phase,'resource-denied','unaffordable authored attacks need a truthful denial phase');
  assert.equal(deniedBeam.projectiles.length,0,'a denied preview must not imply a shot launched');
  assert.match(await page.locator('.attack-phase').innerText(),/RESOURCE DENIED/i);
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  await page.getByLabel('Target distance',{exact:true}).fill('32');await page.getByLabel('Target distance',{exact:true}).press('Tab');

  await selectAttack(page,'rmb');
  assert.match(await page.locator('.attack-unsupported').innerText(),/Arctic Breath.*cone.*not tunable/i);
  assert.equal(await page.locator('.attack-fields input').count(),0,'unsupported attacks must not expose fake controls');

  // A paired-range error rejects the whole edit, restores both UI controls and
  // retains the previously valid history value.
  await page.locator('[data-hero="vega"]').click();
  await page.getByRole('button',{name:'Save & continue',exact:true}).click();
  await selectAttack(page,'q');
  const beforeInvalid=await page.evaluate(()=>STUDIO.history.value);
  await commitNumber(page,'Minimum radius',7);
  assert.match(await page.locator('#status').innerText(),/minR.*maxR|minimum radius.*maximum radius/i);
  assert.deepEqual(await page.evaluate(()=>STUDIO.history.value),beforeInvalid);
  assert.equal(await page.getByLabel('Minimum radius value',{exact:true}).inputValue(),'1.3');
  assert.equal(await page.getByLabel('Minimum radius',{exact:true}).inputValue(),'1.3');
  assert.equal(await page.getByLabel('Minimum radius value',{exact:true}).getAttribute('aria-invalid'),'true');
  assert.equal(await page.getByLabel('Minimum radius value',{exact:true}).evaluate(el=>el===document.activeElement),true,
    'a rejected edit restores and focuses its number field');
  assert.match(await page.getByLabel('Minimum radius value',{exact:true}).locator('xpath=ancestor::div[contains(@class,"attack-property")]').innerText(),/minimum radius.*maximum radius/i,
    'paired validation must be shown inline beside the edited field');

  // Attack preview owns all four supported types. Legacy Beam sequence remains
  // available and beam-only while the new sequence uses the selected real slot.
  const stateOptions=await page.getByLabel('Motion state',{exact:true}).locator('option').evaluateAll(options=>options.map(o=>o.value));
  assert(stateOptions.includes('beam'),'legacy Beam sequence must remain available');
  assert(stateOptions.includes('attack'),'Studio must expose the unified Attack sequence');
  await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
  assert(await page.evaluate(()=>STUDIO.preview.combat.slots.every(([,state])=>state.def.type==='beam')),
    'legacy beam mode cannot broaden combat.slots');

  await page.getByLabel('Motion state',{exact:true}).selectOption('attack');
  await page.getByLabel('Preview attack',{exact:true}).selectOption('q');
  const charge=await previewSnapshot(page,4);
  assert(charge.damage>0&&charge.contacts>0,'production charge projectile must make actual contact');
  assert(charge.nominal>0,'nominal authored damage is reported separately');
  assert.equal(charge.target.hp,charge.target.maxHp,'the measurement target is explicitly inexhaustible');
  assert.match(await page.locator('.measurements').innerText(),/Contact.*Nominal/i);
  const chargeRepeat=await previewSnapshot(page,4);
  assert.deepEqual(chargeRepeat,charge,'charge seek must start from a clean deterministic input timeline');
  const chargeCleared=await previewSnapshot(page,7);
  assert.equal(chargeCleared.projectiles.length,0,'charge projectile resources are gone after recovery');
  assert.equal(chargeCleared.slot.charging,false,'charge input must not restart after its release edge');

  // The schema deliberately accepts long authored charges. The Attack sequence
  // must expand to make a low-cost 30s shot real instead of capping it at 3.5s/8s.
  await page.getByRole('tab',{name:'Attacks',exact:true}).click();
  await commitNumber(page,'Charge time',30);
  await commitNumber(page,'Entry cost',0);
  await commitNumber(page,'Charge cost / sec',.001);
  assert.equal(await page.getByLabel('Charge hold',{exact:true}).getAttribute('max'),'30');
  await page.getByLabel('Charge hold',{exact:true}).fill('30');await page.getByLabel('Charge hold',{exact:true}).press('Tab');
  assert(Number(await page.locator('.timeline').getAttribute('max'))>=36.6,
    'Attack transport duration must include the long hold and useful recovery');
  const longCharge=await previewSnapshot(page,31.5);
  assert(longCharge.damage>0&&longCharge.contacts>0&&longCharge.slot.charging===false,
    'a valid 30s authored charge must launch and contact through production code');
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'Undo',exact:true}).click();
  await page.getByLabel('Charge hold',{exact:true}).fill('1.8');await page.getByLabel('Charge hold',{exact:true}).press('Tab');

  await page.getByRole('tab',{name:'Attacks',exact:true}).click();
  await page.getByLabel('Second press detonates',{exact:true}).check();
  await commitNumber(page,'Maximum blast',80);
  await commitNumber(page,'Charge time',.5);
  await page.getByLabel('Target distance',{exact:true}).fill('60');await page.getByLabel('Target distance',{exact:true}).press('Tab');
  const shortMaxArmed=await previewSnapshot(page,2.5);
  assert(shortMaxArmed.projectiles.includes('Projectile')&&shortMaxArmed.phase==='armed',
    'a short authored maximum still arms only after the real release edge');
  const shortMaxBurst=await previewSnapshot(page,2.8);
  assert(shortMaxBurst.remoteDetonations===1&&shortMaxBurst.phase==='detonated',
    'short-maximum charge must receive its second press after launch, not while still charging');
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  const armedCharge=await previewSnapshot(page,2.5);
  assert(armedCharge.projectiles.includes('Projectile')&&armedCharge.contacts===0&&armedCharge.phase==='armed');
  const burstCharge=await previewSnapshot(page,2.8);
  assert(burstCharge.remoteDetonations===1&&burstCharge.contacts>0&&burstCharge.projectiles.length===0&&burstCharge.phase==='detonated',
    'charged shot receives one real second-press detonation and cleans up');
  await page.getByRole('button',{name:'Undo',exact:true}).click();await page.getByRole('button',{name:'Undo',exact:true}).click();
  await page.getByLabel('Target distance',{exact:true}).fill('32');await page.getByLabel('Target distance',{exact:true}).press('Tab');

  // A charged beam's remote payload is the actual spawned BeamHose value, including
  // charge power. It is a burst amount, not the sustained definition's hp/s.
  await selectAttack(page,'rmb');
  await page.getByLabel('Second press detonates',{exact:true}).check();
  await commitNumber(page,'Detonation radius',48);
  await commitNumber(page,'Detonation damage',90);
  await page.getByLabel('Motion state',{exact:true}).selectOption('attack');
  await page.getByLabel('Preview attack',{exact:true}).selectOption('rmb');
  await page.getByLabel('Charge hold',{exact:true}).fill('1');await page.getByLabel('Charge hold',{exact:true}).press('Tab');
  await page.getByLabel('Target distance',{exact:true}).fill('60');await page.getByLabel('Target distance',{exact:true}).press('Tab');
  const chargedBeamBurst=await previewSnapshot(page,2);
  assert(chargedBeamBurst.remoteDetonations===1&&chargedBeamBurst.contacts>0);
  assert(chargedBeamBurst.nominal>135&&chargedBeamBurst.nominalUnit==='hp/burst',
    'charged beam burst nominal must come from the charge-scaled armed BeamHose payload');
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'Undo',exact:true}).click();
  await page.getByLabel('Charge hold',{exact:true}).fill('1.8');await page.getByLabel('Charge hold',{exact:true}).press('Tab');
  await page.getByLabel('Target distance',{exact:true}).fill('32');await page.getByLabel('Target distance',{exact:true}).press('Tab');

  await page.locator('[data-hero="sol"]').click();
  await selectAttack(page,'e');
  await page.getByLabel('Motion state',{exact:true}).selectOption('attack');
  await page.getByLabel('Preview attack',{exact:true}).selectOption('e');
  const projectile=await previewSnapshot(page,2);
  assert(projectile.damage>0&&projectile.contacts>0,'production projectile must make actual contact');
  const projectileCleared=await previewSnapshot(page,7);
  assert.equal(projectileCleared.projectiles.length,0,'projectile resources are disposed after recovery');
  await page.getByLabel('Second press detonates',{exact:true}).check();
  await commitNumber(page,'Blast radius',48);
  await page.getByLabel('Target distance',{exact:true}).fill('60');await page.getByLabel('Target distance',{exact:true}).press('Tab');
  const armedProjectile=await previewSnapshot(page,.75);
  assert(armedProjectile.projectiles.includes('Projectile')&&armedProjectile.contacts===0&&armedProjectile.phase==='armed');
  const burstProjectile=await previewSnapshot(page,.95);
  assert(burstProjectile.remoteDetonations===1&&burstProjectile.contacts>0&&burstProjectile.projectiles.length===0&&burstProjectile.phase==='detonated',
    'projectile remote trigger uses the production second pressed edge before direct collision');
  // A split is a remote transformation, not a damage burst. The preview must
  // retain and measure the actual ordinary children after the parent retires.
  await page.getByLabel('Target distance',{exact:true}).fill('40');await page.getByLabel('Target distance',{exact:true}).press('Tab');
  await commitNumber(page,'Split children (0 = off)',4);
  await commitNumber(page,'Split cone angle',.55);
  await commitNumber(page,'Child speed',90);
  await commitNumber(page,'Child homing',3);
  if(await page.evaluate(()=>STUDIO.preview.playing))await page.getByRole('button',{name:'Pause preview',exact:true}).click();
  const splitEarly=await previewSnapshot(page,.95);
  assert.equal(splitEarly.remoteDetonations,1);
  assert.equal(splitEarly.splitChildren,4,'the production remote activation must create the authored child count');
  assert.equal(splitEarly.liveSplitChildren,4);
  assert.equal(splitEarly.contacts,0,'splitting the parent cannot be mislabeled as damage contact');
  assert.equal(splitEarly.phase,'split-children');
  assert.equal(splitEarly.nominalUnit,'hp/child','split payload must not be reported as hp/burst');
  assert(splitEarly.shots.every(shot=>shot.type==='Projectile'&&shot.remoteDetonate!==true),
    'split children must be ordinary, nonrecursive production projectiles');
  assert(splitEarly.shots.every(shot=>shot.homing===3&&Math.abs(shot.speed-90)<1e-6),
    'child travel must consume the authored homing and speed values');
  await page.screenshot({path:`${out}/studio-split-children.png`,fullPage:true});
  const splitTravel=await previewSnapshot(page,1.1);
  assert.notDeepEqual(splitTravel.shots.map(shot=>shot.pos),splitEarly.shots.map(shot=>shot.pos),
    'split children must visibly travel from the parent current position');
  const splitTimeline=[];
  for(const time of [1.25,1.5,2,2.5,3,3.5,4.5])splitTimeline.push({time,snapshot:await previewSnapshot(page,time)});
  const splitContact=splitTimeline.find(frame=>frame.snapshot.contacts>0);
  assert(splitContact?.snapshot.damage>0,'default split travel must contact the visible target within the children\'s real lifetime');
  const splitTelemetry=await page.locator('.measurements').innerText();
  assert.match(splitTelemetry,/Measured .*splash\/defenses.*damage events.*Split 4 children.*Nominal direct .*hp\/child/i);
  assert.doesNotMatch(splitTelemetry,/\bhits?\b/i,'direct and splash callbacks are damage events, not a child hit count');
  await previewSnapshot(page,splitContact.time);
  await page.screenshot({path:`${out}/studio-split-contact.png`,fullPage:true});
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'Undo',exact:true}).click();
  await page.getByLabel('Target distance',{exact:true}).fill('32');await page.getByLabel('Target distance',{exact:true}).press('Tab');

  await page.getByLabel('Preview attack',{exact:true}).selectOption('f');
  const volley=await previewSnapshot(page,2.4);
  assert(volley.damage>0&&volley.contacts>1,'held volley must tick real cooldowns and produce repeated contacts');
  const volleyReplay=await page.evaluate(()=>{
    const p=STUDIO.preview;
    p.seek(0);
    for(let i=1;i<=144;i++){p.time=i/60;p.step(1/60,false,false);}
    return {damage:p.combat.damage,contacts:p.combat.contacts,ki:p.fighter.ki,
      projectiles:p.combat.game.projectiles.list.map(projectile=>projectile.constructor.name)};
  });
  assert.deepEqual(volleyReplay,{damage:volley.damage,contacts:volley.contacts,ki:volley.ki,projectiles:volley.projectiles},
    'playback and scrub share the same fixed-step attack sequence');
  await page.getByLabel('Motion state',{exact:true}).selectOption('hover');
  assert.equal(await page.evaluate(()=>STUDIO.preview.combat.game.projectiles.list.length),0);
  assert.equal(await page.evaluate(()=>STUDIO.preview.combat.target.obj.visible),false);

  // Build one custom package through ORIGIN, tune it through the real inspector,
  // prove a compatible recipe edit keeps tuning, then replace the attack with a
  // different beam of the same type and prove stale identity is dropped visibly.
  await page.getByRole('button',{name:'New character',exact:true}).click();
  await page.locator('#oName').fill('ATTACK LAB');
  const cards=page.locator('#origin .pcard');
  await cards.filter({has:page.locator('b',{hasText:/^Energy Beam$/})}).click();
  await page.locator('#origin [data-s="rmb"]').click();
  await cards.filter({has:page.locator('b',{hasText:/^Energy Bolt$/})}).click();
  await page.locator('#oSave').click();
  await page.waitForFunction(()=>STUDIO.preview.fighter.def.name==='ATTACK LAB');
  const customId=await page.evaluate(()=>STUDIO.history.value.heroId);
  await selectAttack(page,'lmb');
  await commitNumber(page,'Damage / sec',91);
  await page.getByRole('button',{name:'Save local',exact:true}).click();
  await page.getByRole('button',{name:'Edit power kit',exact:true}).click();
  await page.locator('#oTitle').fill('Compatible recipe edit');
  await page.locator('#oSave').click();
  assert.equal(await page.evaluate(()=>STUDIO.preview.fighter.slots.lmb.def.dps),91,
    'compatible ORIGIN edits retain attack tuning');

  await page.getByRole('button',{name:'Edit power kit',exact:true}).click();
  await page.locator('#origin [data-s="lmb"]').click();
  await cards.filter({has:page.locator('b',{hasText:/^Frost Beam$/})}).click();
  await page.locator('#oSave').click();
  assert.equal(await page.evaluate(()=>STUDIO.preview.fighter.slots.lmb.def.name),'Frost Beam');
  assert.equal(await page.evaluate(()=>STUDIO.history.value.attacks.lmb),undefined,
    'same-type replacement cannot inherit a different attack identity');
  assert.match(await page.locator('#status').innerText(),/stale|dropped|changed attack/i,
    'identity reconciliation must be visible');

  // Re-author the replacement and prove the portable package survives a fresh
  // browser context, reload and actual PowerWorld fighter construction.
  await selectAttack(page,'lmb');
  await commitNumber(page,'Damage / sec',73);
  await commitNumber(page,'Steering',1.6);
  await page.getByLabel('Second press detonates',{exact:true}).check();
  await commitNumber(page,'Detonation radius',44);
  await commitNumber(page,'Detonation damage',90);
  await selectAttack(page,'rmb');
  await page.getByLabel('Second press detonates',{exact:true}).check();
  await commitNumber(page,'Split children (0 = off)',4);
  await commitNumber(page,'Split cone angle',.7);
  await commitNumber(page,'Child speed',110);
  await commitNumber(page,'Child homing',20);
  await page.getByRole('button',{name:'Save local',exact:true}).click();
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export JSON',exact:true}).click();
  const download=await downloadPromise;
  const packagePath=`${out}/attack-lab-character.json`;
  await download.saveAs(packagePath);
  const pack=JSON.parse(await readFile(packagePath,'utf8'));
  assert.deepEqual(pack.profile.attacks.lmb.values,{dps:73,steer:1.6,remoteDetonate:true,detonateRadius:44,detonateDamage:90});
  assert.deepEqual(pack.profile.attacks.rmb.values,{remoteDetonate:true,splitCount:4,splitSpread:.7,splitSpeed:110,splitHoming:20});

  const fresh=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  const importedPage=activePage=await openStudio(fresh);
  await importedPage.evaluate(()=>localStorage.clear());
  await importedPage.reload();
  await importedPage.waitForFunction(()=>window.STUDIO);
  await importedPage.getByRole('button',{name:'Import JSON',exact:true}).click();
  await importedPage.getByLabel('Profile JSON',{exact:true}).fill(JSON.stringify(pack));
  await importedPage.getByRole('button',{name:'Import profile',exact:true}).click();
  await importedPage.waitForFunction(()=>STUDIO.preview.fighter.def.name==='ATTACK LAB');
  const importedId=await importedPage.evaluate(()=>STUDIO.history.value.heroId);
  assert.notEqual(importedId,customId,'package import installs a fresh local identity');
  assert.deepEqual(await importedPage.evaluate(()=>({
    profile:STUDIO.history.value.attacks.lmb.values,
    live:{dps:STUDIO.preview.fighter.slots.lmb.def.dps,steer:STUDIO.preview.fighter.slots.lmb.def.steer},
  })),{profile:{dps:73,steer:1.6,remoteDetonate:true,detonateRadius:44,detonateDamage:90},live:{dps:73,steer:1.6}});
  await importedPage.reload();
  await importedPage.waitForFunction(()=>window.STUDIO);
  await importedPage.locator(`[data-hero="${importedId}"]`).click();
  assert.deepEqual(await importedPage.evaluate(()=>[STUDIO.preview.fighter.slots.lmb.def.dps,STUDIO.preview.fighter.slots.lmb.def.steer,STUDIO.preview.fighter.slots.lmb.def.remoteDetonate,STUDIO.preview.fighter.slots.lmb.def.detonateRadius,STUDIO.preview.fighter.slots.lmb.def.detonateDamage]),[73,1.6,true,44,90]);
  assert.deepEqual(await importedPage.evaluate(()=>[STUDIO.preview.fighter.slots.rmb.def.remoteDetonate,STUDIO.preview.fighter.slots.rmb.def.splitCount,STUDIO.preview.fighter.slots.rmb.def.splitSpread,STUDIO.preview.fighter.slots.rmb.def.splitSpeed,STUDIO.preview.fighter.slots.rmb.def.splitHoming]),[true,4,.7,110,20]);

  await importedPage.getByRole('tab',{name:'Attacks',exact:true}).click();
  await importedPage.getByLabel('Attack slot',{exact:true}).selectOption('rmb');
  await importedPage.getByLabel('Motion state',{exact:true}).selectOption('attack');
  await importedPage.getByLabel('Preview attack',{exact:true}).selectOption('rmb');
  await importedPage.getByLabel('Target distance',{exact:true}).fill('60');await importedPage.getByLabel('Target distance',{exact:true}).press('Tab');
  const importedSplit=await importedPage.evaluate(()=>{STUDIO.preview.seek(.95);return {count:STUDIO.preview.combat.splitChildren,unit:STUDIO.preview.combat.nominalUnit};});
  assert.deepEqual(importedSplit,{count:4,unit:'hp/child'},'fresh-context package must launch the actual split preview');
  await importedPage.evaluate(()=>STUDIO.preview.seek(2));
  assert(await importedPage.evaluate(()=>STUDIO.preview.combat.contacts>0));

  await importedPage.getByRole('tab',{name:'Attacks',exact:true}).click();
  await importedPage.getByLabel('Attack slot',{exact:true}).selectOption('lmb');
  await importedPage.getByLabel('Motion state',{exact:true}).selectOption('attack');
  await importedPage.getByLabel('Preview attack',{exact:true}).selectOption('lmb');
  await importedPage.getByLabel('Target distance',{exact:true}).fill('60');await importedPage.getByLabel('Target distance',{exact:true}).press('Tab');
  await importedPage.getByRole('button',{name:'Pause preview',exact:true}).click();
  await importedPage.evaluate(()=>STUDIO.preview.seek(.95));
  assert.equal(await importedPage.evaluate(()=>STUDIO.preview.combat.remoteDetonations),1);
  await importedPage.screenshot({path:`${out}/studio-desktop.png`,fullPage:true});
  await importedPage.setViewportSize({width:390,height:844});
  assert.equal(await importedPage.locator('.save-state').isVisible(),true,'mobile keeps Saved/Unsaved state beside Save');
  const telemetryLayout=await importedPage.evaluate(()=>{
    const tag=document.querySelector('.view-tag').getBoundingClientRect();
    const telemetry=document.querySelector('.measurements').getBoundingClientRect();
    return {separate:telemetry.top>=tag.bottom+4,width:telemetry.width,right:telemetry.right};
  });
  assert(telemetryLayout.separate&&telemetryLayout.right<=390&&telemetryLayout.width>200,
    '390px reserves a wrapping telemetry row below the live-engine badge');
  await importedPage.screenshot({path:`${out}/studio-mobile.png`,fullPage:true});
  assert.equal(await importedPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,
    'attack inspector must not overflow the 390px layout');

  await importedPage.setViewportSize({width:1440,height:1000});
  await importedPage.getByRole('button',{name:'Play Test ↗',exact:true}).click();
  await importedPage.waitForFunction(()=>window.LSW?.game);
  await importedPage.locator('#pwGo').click();
  assert.deepEqual(await importedPage.evaluate(()=>[LSW.game.player.def.abilities.lmb.dps,LSW.game.player.def.abilities.lmb.steer,LSW.game.player.def.abilities.lmb.remoteDetonate,LSW.game.player.def.abilities.lmb.detonateRadius,LSW.game.player.def.abilities.lmb.detonateDamage]),[73,1.6,true,44,90],
    'PowerWorld must consume the packaged authored values');
  assert.deepEqual(await importedPage.evaluate(()=>[LSW.game.player.def.abilities.rmb.remoteDetonate,LSW.game.player.def.abilities.rmb.splitCount,LSW.game.player.def.abilities.rmb.splitSpread,LSW.game.player.def.abilities.rmb.splitSpeed,LSW.game.player.def.abilities.rmb.splitHoming]),[true,4,.7,110,20],
    'PowerWorld must receive the packaged split projectile values');

  assert.deepEqual(errors,[],'Studio and PowerWorld must have zero uncaught page errors');
  await writeFile(`${out}/results.json`,JSON.stringify({errors,customId,importedId},null,2));
  console.log('PASS attack inspector, split children + four real attack previews, identity reconciliation, package reload/runtime, 390px layout, 0 page errors');
} catch(error) {
  await writeFile(`${out}/failure.json`,JSON.stringify({message:error.message,stack:error.stack,errors},null,2));
  if(activePage)await activePage.screenshot({path:`${out}/failure.png`,fullPage:true}).catch(()=>{});
  throw error;
} finally {
  await browser.close();
}
