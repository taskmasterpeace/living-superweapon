// Real browser mouse edges -> Input -> controlPlayer -> runSlot -> traveling
// beam. Simulation stepping is deterministic; no attack function is invoked by
// the test in place of player control.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/remote-playtest';await mkdir(out,{recursive:true});
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
try{
  await page.goto('http://127.0.0.1:5180/powerworld.html');
  await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
  await page.evaluate(()=>{
    const g=LSW.game,w=g.world,update=g.update.bind(g),render=w.render.bind(w),endFrame=g.input.endFrame.bind(g.input);
    g.update=()=>{};g.startMode('powerworld',{p1:'kano',p2:'vega'});
    // The page RAF normally clears edges after update. Own both halves of the
    // frame while stepping, otherwise RAF can erase a real click between awaits.
    g.input.endFrame=()=>{};
    g.controlBot=()=>{};w.render=()=>{};g.fov=false;w.setFogEnabled(false);
    const p=g.player;
    g.hud?.setPlayer(p.def);
    for(const e of g.entities)if(e!==p){e.ai=null;e.pos.set(800,140,800);}
    p.pos.set(0,140,0);p.vel.set(0,0,0);p.flying=true;p.gait='airborne';p.faceDir(0,1);
    p.slots.lmb.def={...p.slots.lmb.def,remoteDetonate:true,detonateRadius:18,detonateDamage:55,maxCharge:2};
    w._lookActive=true;w._lookYaw=0;w._lookPitch=0;w.snapChase();
    let denied=0;const deny=g.onNoKi.bind(g);g.onNoKi=(...args)=>{denied++;return deny(...args);};
    window.remoteTick=(n=1)=>{for(let i=0;i<n;i++){update(1/60);endFrame();}return {charging:!!p.slots.lmb.charging,sustaining:!!p.slots.lmb.active?.sustaining,shots:g.projectiles.list.length,denied,ki:p.ki};};
    window.remoteRender=()=>render();
    endFrame();remoteTick(60);
  });
  await page.mouse.move(640,340);await page.mouse.down();
  const charging=await page.evaluate(()=>remoteTick(30));
  assert.equal(charging.charging,true);
  await page.mouse.up();
  const launched=await page.evaluate(()=>remoteTick(1));assert.equal(launched.sustaining,true);assert.equal(launched.charging,false);
  const released=await page.evaluate(()=>remoteTick(12));assert.equal(released.sustaining,true,'released mouse must leave remote beam traveling');
  await page.evaluate(()=>{LSW.game.player.ki=0;LSW.game.player.slots.lmb.cd=0;});
  await page.mouse.down();
  const detonated=await page.evaluate(()=>remoteTick(1));
  assert.equal(detonated.shots,0);assert.equal(detonated.sustaining,false);assert.equal(detonated.denied,0);
  await page.mouse.up();await page.evaluate(()=>{remoteTick(1);remoteRender();});
  await page.screenshot({path:`${out}/second-press-burst.png`});
  for(const [name,steps] of [['burst-100ms',4],['burst-200ms',6],['burst-350ms',9]]){
    await page.evaluate(n=>{remoteTick(n);remoteRender();},steps);
    await page.screenshot({path:`${out}/${name}.png`});
  }
  assert.deepEqual(errors,[]);
  await writeFile(`${out}/results.json`,JSON.stringify({charging,launched,released,detonated,errors},null,2));
  console.log('PASS real mouse charge → release → flight → zero-ki second-press detonation, 0 page errors');
}finally{await browser.close();}
