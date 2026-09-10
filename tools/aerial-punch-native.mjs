// Real keyboard Rush Combo in the live game. Only encounter setup positions
// actors/initial camera; no pose, contact, damage, timers, or update overrides.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/aerial-punch-native';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const result={kind:'positioned encounter, real KeyW/KeyE input, native update/physics/chase camera'};
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=vega');await page.locator('[data-encounter="frontline"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>window.LSW?.game?.pwStage?.frontlineReady,null,{timeout:60000});
 await page.evaluate(async()=>{
  const {renderedHandContact}=await import('/tools/helpers/rendered-hand-contact.mjs');
  const g=LSW.game,a=g.player,b=g.spawnRival('kano');window.punchWitness={samples:[],hits:[],actor:a,victim:b};
  for(const f of [a,b]){f.pos.set(0,180,f===a?0:18);f.vel.set(0,0,0);f.flying=true;f.gait='airborne';f.ai=null;f.invuln=0;}
  a.faceDir(0,1);b.faceDir(0,-1);g.world._lookYaw=0;g.world._lookPitch=0;g.world._lookActive=true;g.world._chaseSnap=true;
  const onHit=g.onHit.bind(g);g.onHit=(target,amount,opts,blocked)=>{if(opts.src===a&&opts.strike)punchWitness.hits.push({amount,target:target.def.id,at:performance.now(),point:a._abilityMeleePose?.contactPoint?.toArray(),phase:a._abilityMeleePose?.elapsed,rendered:renderedHandContact(a,target)});onHit(target,amount,opts,blocked);};
  const collect=()=>{const f=punchWitness.actor;punchWitness.samples.push({at:performance.now(),phase:f._abilityMeleePose?.elapsed??null,pitch:f.parts.g.rotation.x,pos:f.pos.toArray(),flight:f.flying});if(punchWitness.samples.length<150)requestAnimationFrame(collect);};requestAnimationFrame(collect);
 });
 await page.keyboard.down('KeyW');await page.waitForTimeout(200);await page.keyboard.press('KeyE');await page.waitForTimeout(160);await page.screenshot({path:`${out}/native-contact.png`});
 await page.waitForTimeout(650);await page.keyboard.up('KeyW');
 result.state=await page.evaluate(()=>({samples:punchWitness.samples,hits:punchWitness.hits,hero:punchWitness.actor.def.id,slot:punchWitness.actor.slots.e.def.name,faults:[...(LSW.game._errSeen||[])]}));
 result.errors=errors;assert.equal(result.state.hero,'vega');assert.ok(result.state.samples.some(s=>s.phase!==null),'KeyE did not activate the native ability');assert.ok(result.state.hits.some(h=>h.target==='kano'),'keyboard ability did not make physical contact');assert.ok(result.state.hits.filter(h=>h.target==='kano').every(h=>h.rendered.handVertices>0&&h.rendered.distance<.65),'native visible source hand did not contact the target body');assert.deepEqual(result.state.faults,[]);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({...result,state:{...result.state,samples:result.state.samples.length}},null,2));
}catch(error){result.error=error.stack;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw error;}
finally{await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await context.close();await browser.close();}
