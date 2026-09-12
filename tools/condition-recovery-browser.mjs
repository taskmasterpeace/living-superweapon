import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/condition-recovery';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],results=[];
page.on('pageerror',e=>errors.push(String(e)));
try{
 await page.goto('http://127.0.0.1:5182/',{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#hSelect.on');await page.keyboard.press('Enter');
 await page.waitForFunction(()=>window.LSW?.game?.running&&LSW.game.player&&!LSW.game._frontlinePreparing,null,{timeout:120000});
 await page.waitForTimeout(1500);
 // Controlled contact fixture within the normal battlefield. No status setter,
 // alternate update loop, altered resistance or fabricated HUD state is used.
 await page.evaluate(async()=>{
  const g=LSW.game,p=g.player,{Fighter}=await import('/src/engine/entity.js');
  for(const e of [...g.entities])if(e!==p){e.dispose();g.world.scene.remove(e.obj);}
  g.entities=[p];g.mode=null; // Disable encounter spawning, keep production controllers/update.
  const shooter=new Fighter(LSW.ROSTER.find(d=>d.id==='gale'));shooter.team=p.team+1;shooter._game=g;
  window._conditionShooter=shooter;
  window._sendCondition=(payload,damage=5,dtype='energy')=>{
   const pos=p.center().clone();pos.z-=20;
   const vel=p.center().clone().sub(pos).normalize().multiplyScalar(160);
   g.projectiles.spawnProjectile(shooter,{pos,vel,damage,blast:0,dtype,payload,color:'#ffe9b0'});
  };
  window._conditionFrames=[];let last=performance.now();
  function frame(now){window._conditionFrames.push(now-last);last=now;window._conditionRaf=requestAnimationFrame(frame);}
  window._conditionRaf=requestAnimationFrame(frame);
 });
 await page.evaluate(()=>{LSW.game.player.invuln=0;_sendCondition(null,24,'physical');});
 await page.waitForFunction(()=>LSW.game.player._bleed>0);
 await page.keyboard.down('KeyW');await page.waitForTimeout(900);
 assert.match(await page.locator('.ps-effects').innerText(),/Bleeding/);
 const moving=await page.evaluate(()=>({hp:LSW.game.player.hp,speed:LSW.game.player.vel.length(),still:LSW.game.player._bleedStill}));
 assert.ok(moving.speed>8);assert.equal(moving.still,0);
 await page.screenshot({path:`${out}/bleeding-moving.png`});
 await page.keyboard.up('KeyW');
 await page.waitForFunction(()=>LSW.game.player._bleedStill>1);
 assert.match(await page.locator('.ps-effects').innerText(),/Clotting/);
 await page.screenshot({path:`${out}/bleeding-clotting.png`});
 await page.waitForFunction(()=>LSW.game.player._bleed===0,null,{timeout:15000});
 assert.doesNotMatch(await page.locator('.ps-effects').innerText(),/Bleeding/);
 results.push({scenario:'physical projectile → native W movement → release → clot',moving,passed:true});
 await page.evaluate(()=>_sendCondition('sleep'));
 await page.waitForFunction(()=>LSW.game.player.sleepT>0);
 assert.match(await page.locator('.ps-effects').innerText(),/Asleep/);
 await page.screenshot({path:`${out}/sleep.png`});
 await page.waitForTimeout(250);await page.evaluate(()=>_sendCondition(null));
 await page.waitForFunction(()=>LSW.game.player.sleepT===0);
 assert.doesNotMatch(await page.locator('.ps-effects').innerText(),/Asleep/);
 results.push({scenario:'sleep projectile → subsequent damaging projectile → wake',passed:true});
 await page.evaluate(()=>_sendCondition('teargas'));
 await page.waitForFunction(()=>LSW.game.player.blindT>0);
 assert.match(await page.locator('.ps-effects').innerText(),/Blinded/);
 await page.screenshot({path:`${out}/blind.png`});
 await page.waitForFunction(()=>LSW.game.player.blindT<=0,null,{timeout:15000});
 assert.doesNotMatch(await page.locator('.ps-effects').innerText(),/Blinded/);
 results.push({scenario:'teargas projectile → real countdown → sight recovery',passed:true});
 const runtime=await page.evaluate(()=>{
  cancelAnimationFrame(_conditionRaf);_conditionShooter.dispose();
  const a=_conditionFrames.slice(10).sort((a,b)=>a-b);
  return {frames:a.length,medianMs:a[Math.floor(a.length*.5)],p95Ms:a[Math.floor(a.length*.95)],gameErrors:[...(LSW.game._errSeen||[])]};
 });
 assert.deepEqual(errors,[]);assert.deepEqual(runtime.gameErrors,[]);
 await page.screenshot({path:`${out}/recovered.png`});
 await writeFile(`${out}/results.json`,JSON.stringify({scope:'controlled projectile contacts with native player movement and real-time recovery in normal battlefield; encounter spawning disabled',results,runtime,errors},null,2));
 console.log(JSON.stringify({results,runtime,errors}));
}finally{await browser.close();}
