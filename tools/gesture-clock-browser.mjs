import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const result=await page.evaluate(()=>{
  const {game:g}=LSW,step=g.update.bind(g);g.update=()=>{};g.world.render=()=>{};g.news.enabled=false;
  g.startMode('powerworld',{p1:'sol',p2:'kano'});for(const f of g.entities)f.ai=null;
  const p=g.player;p.pos.set(0,120,0);p.flying=true;p.gait='airborne';p.invuln=999;p._selSecondary='lmb';
  g._slowT=10;g._slowMul=.1;g.input.endFrame();g.input.mouse.right=true;g.input.mouse.rightEdge=true;
  for(let i=0;i<5;i++){step(.05);g.input.endFrame();}
  return {age:p._mouseCombat.age,firing:!!p.slots.lmb.active?.sustaining};
 });
 assert.ok(result.firing,'A 250ms physical hold must fire during 0.1x combat slow motion');assert.deepEqual(errors,[]);console.log({gestureClock:result,errors});
}finally{await browser.close();}
