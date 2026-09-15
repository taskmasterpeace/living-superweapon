import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {checkoutIdentity,assertSameCheckout} from './playtest/identity.mjs';
const base='http://127.0.0.1:5193',out='artifacts/integration-20260915/combat';await mkdir(out,{recursive:true});
const identity=await(await fetch(base+'/__pw_playtest_identity')).json();assertSameCheckout(await checkoutIdentity(process.cwd()),identity);
const result={identity,method:'Native menu entry; built-in scripted Threat Room demonstrations; native V key charge releases',errors:[],demos:[]};
const browser=await chromium.launch({headless:false});const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>result.errors.push(e.message));
try {
 await page.goto(base+'/powerworld.html?hero=sol',{waitUntil:'domcontentloaded'});await page.locator('#hSelect.on').waitFor({timeout:60000});await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).click();await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',null,{timeout:90000});
 for(const kind of ['grab','stun']){
  await page.evaluate(async kind=>{const g=PW.game,t=g.ms.threatLab.meleeTrial;t.prepareAerialDemo(kind);await Promise.all([g.player._modularReady,t.target._modularReady]);window.__combatSamples=[];t.demo.start();},kind);
  let prior='';for(let i=0;i<70;i++){
   await page.waitForTimeout(200);const row=await page.evaluate(()=>{const g=PW.game,t=g.ms.threatLab.meleeTrial,v=t.target;return {active:t.demo.active,phase:t.demo.phase,summary:t.demo.summary(),holderModel:!!g.player._modularCharacter,targetModel:!!v._modularCharacter,held:g.player.grabbing===v,position:v.pos.toArray(),velocity:v.vel.toArray(),recovery:v._impactRecovery?{elapsed:v._impactRecovery.elapsed}:null,canAct:g.melee.canAct(v)}});
   if(row.phase!==prior){await page.screenshot({path:`${out}/${kind}-${row.phase}.png`});prior=row.phase;}
   await page.evaluate(row=>window.__combatSamples.push(row),row);if(!row.active)break;
  }
  const demo=await page.evaluate(()=>({kind:PW.game.ms.threatLab.meleeTrial.demo.summary(),samples:window.__combatSamples}));result.demos.push(demo);
  assert.equal(demo.kind.outcome,'complete',JSON.stringify(demo.kind));assert.ok(demo.samples.every(s=>s.holderModel&&s.targetModel));
 }
 await page.evaluate(async()=>{const g=PW.game,t=g.ms.threatLab.meleeTrial;t.startBag('passive');await t.target._modularReady;const p=g.player;p.flying=false;p.flyHeld=false;p.pos.copy(t.origin);p.pos.z-=12;p.pos.y=g.world.heightAt(p.pos.x,p.pos.z);p.vel.set(0,0,0);p.faceDir(0,1);p.aim3.set(0,0,1);g.world._lookYaw=0;g.world._lookPitch=0;});
 for(const ms of [90,310,800]){await page.keyboard.down('v');await page.waitForTimeout(ms);await page.keyboard.up('v');await page.waitForTimeout(1800);}
 result.charge=await page.evaluate(()=>({hero:PW.game.player.def.id,records:PW.game.ms.threatLab.meleeTrial.records,events:PW.game.ms.threatLab.meleeTrial.recording.events.filter(e=>e.kind==='charge-region')}));await page.screenshot({path:out+'/charge-results.png'});
 assert.deepEqual(result.charge.records.filter(r=>r.releaseChoice).map(r=>r.releaseChoice),['combo','cross','power']);
 assert.ok(result.charge.records.filter(r=>r.releaseChoice).every(r=>r.contacts>0),'Each region must actually hit the dummy');
 assert.deepEqual(result.errors,[]);
}catch(e){result.error=String(e);process.exitCode=1;}finally{await writeFile(out+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify({error:result.error,demos:result.demos.map(d=>d.kind),charge:result.charge,errors:result.errors}));await browser.close();}
