import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const out=process.argv.find(x=>x.startsWith('--out='))?.slice(6)||'artifacts/beam-defense-native';
const attack=process.argv.includes('--attack');
const foe=process.argv.find(x=>x.startsWith('--foe='))?.slice(6)||(attack?'sarge':'kano');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false});
const context=await browser.newContext({viewport:{width:1600,height:900},recordVideo:{dir:out,size:{width:1600,height:900}}});
const page=await context.newPage(),video=page.video();
const result={scope:'Normal Sol versus Kano sparring. Native mouse aim, C guard and W advance; no AI, health, position or time overrides.',errors:[],samples:[]};
if(attack)result.scope=`Normal Kano versus ${foe} sparring. Native repeated charged beams, mouse aim and W advance; no AI, health, position or time overrides.`;
page.on('pageerror',e=>result.errors.push(String(e)));
let mx=800,my=450;
try{
 await page.goto(`http://127.0.0.1:5180/powerworld.html?hero=${attack?'kano':'sol'}`);
 await page.locator('[data-pick="foe"]').click();await page.locator(`.pwc[data-id="${foe}"]`).click();
 await page.locator('[data-ai="1.25"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});
 await page.bringToFront();await page.mouse.click(800,450);await page.waitForFunction(()=>!!document.pointerLockElement);
  await page.keyboard.down('KeyC');
 if(process.argv.includes('--flank')){
  // Walk around the spawn-side compound through public controls before aiming.
  // This is navigation, not relocation or a change to the opponent's behavior.
  await page.keyboard.down('KeyD');await page.waitForTimeout(1600);await page.keyboard.up('KeyD');
  await page.keyboard.down('KeyW');await page.waitForTimeout(2000);await page.keyboard.up('KeyW');
 }
 await page.evaluate(()=>{window.defenseHits=[];const g=PW.game,original=g.onHit;g.onHit=function(t,amount,o,blocked){if(o.beamDelta!=null)defenseHits.push({time:g.time,player:t===g.player,target:t.name,amount,blocked:!!o.beamBlocked,guarding:t.guarding,meter:t.guardMeter,hp:t.hp,pos:t.pos.toArray(),velocity:t.vel.toArray(),src:o.src?.name,dt:o.beamDelta,ai:t.ai?{age:t.ai._threatAge,answered:t.ai._threatAnswered,threat:!!t.ai._threat,incoming:!!g.incomingBeam(t),guardT:t._guardT,forceBeamT:t._forceBeamT,stun:t.stunT,downed:t.downedT,stagger:t.staggerT,blind:t.blindT,reflex:t.ai.reflex}:null});return original.call(this,t,amount,o,blocked);};});
 for(let i=0;i<(attack?200:120);i++){
  const aim=await page.evaluate(()=>{const g=PW.game,w=g.world,t=g.entities.find(f=>f!==g.player&&f.ai&&f.alive);if(!t)return null;const dir=t.center(g.player.pos.clone()).sub(w.camera.position).normalize();const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));return{distance:t.pos.distanceTo(g.player.pos),dx:-wrap(Math.atan2(dir.x,dir.z)-w._lookYaw)/w._lookSens,dy:-(Math.asin(dir.y)-w._lookPitch)/w._lookSens};});
  if(aim){mx+=Math.max(-300,Math.min(300,aim.dx));my+=Math.max(-180,Math.min(180,aim.dy));await page.mouse.move(mx,my);}
  if(attack){
   if(i===5)await page.keyboard.up('KeyC');
   if(i%35===15)await page.mouse.down();
   if(i%35===20)await page.mouse.up();
   if(aim?.distance>65)await page.keyboard.down('KeyW');else await page.keyboard.up('KeyW');
  }
  if(i===25&&!attack)await page.keyboard.down('KeyW');
  if(i===50&&!attack)await page.keyboard.up('KeyW');
  if(i===75)await page.keyboard.up('KeyC');
  if(i===90&&!attack)await page.keyboard.down('KeyC');
  await page.waitForTimeout(120);
  result.samples.push(await page.evaluate(()=>{const g=PW.game,p=g.player;return{time:g.time,hp:p.hp,alive:p.alive,guard:p.guarding,meter:p.guardMeter,pos:p.pos.toArray(),velocity:p.vel.toArray(),hits:defenseHits.length,opponents:g.entities.filter(f=>f.ai).map(f=>({name:f.name,pos:f.pos.toArray(),state:f.state,sees:f.ai._sees,belief:f.ai.belief?{...f.ai.belief}:null,action:f.ai.action?{...f.ai.action}:null,stun:f.stunT,guard:f.guarding,slots:Object.fromEntries(Object.entries(f.slots).map(([k,s])=>[k,{charging:s.charging,chargeT:s.chargeT,active:!!s.active}]))})),beams:g.projectiles.list.filter(b=>b.sustaining!==undefined).map(b=>({source:b.caster?.name,sustaining:b.sustaining,pending:b.pendingLaunch,tip:b.tipDist,length:b._arcLen?.()}))};}));
  if([0,24,49,74,89,119].includes(i))await page.screenshot({path:`${out}/frame-${i}.png`});
  const blocked=await page.evaluate(attack=>defenseHits.filter(h=>h.player!==attack&&h.blocked).length,attack);
  if(blocked&&!result.firstBlockFrame){result.firstBlockFrame=i;await page.screenshot({path:`${out}/first-block.png`});}
 }
 result.hits=await page.evaluate(()=>defenseHits);result.faults=await page.evaluate(()=>[...(PW.game._errSeen||[])]);
 result.opponents=await page.evaluate(()=>{const g=PW.game;return g.entities.filter(f=>f.ai).map(f=>({id:f.def.id,pos:f.pos.toArray(),alive:f.alive,ki:f.ki,guard:f.guarding,visible:!!g.canSee(f,g.player),sees:f.ai._sees,belief:f.ai.belief,slots:Object.fromEntries(Object.entries(f.slots).map(([k,s])=>[k,{type:s.def.type,cd:s.cd,charging:s.charging,active:!!s.active}]))}));});
 assert.ok(result.hits.some(h=>h.player!==attack&&h.blocked&&h.amount>0),attack?'Actual bot guards the player beam':'Real enemy beam reaches raised player guard');
 assert.deepEqual(result.errors,[]);assert.deepEqual(result.faults,[]);result.passed=true;
}catch(e){result.failure=String(e);result.hits=await page.evaluate(()=>window.defenseHits||[]).catch(()=>[]);await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});process.exitCode=1;}
finally{await page.mouse.up().catch(()=>{});await page.keyboard.up('KeyC').catch(()=>{});await page.keyboard.up('KeyW').catch(()=>{});await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await context.close();await video.saveAs(`${out}/native-defense.webm`);await browser.close();console.log(JSON.stringify({passed:result.passed,failure:result.failure,hits:result.hits?.length,blocked:result.hits?.filter(h=>h.player!==attack&&h.blocked).length,errors:result.errors}));}
