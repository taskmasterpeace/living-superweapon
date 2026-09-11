import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 await page.goto(`${process.env.LSW_BASE_URL||'http://127.0.0.1:5182'}/powerworld.html`);
 await page.waitForFunction(()=>window.LSW?.stageAbility);
 await page.evaluate(()=>{
  LSW.enter({mode:'training',p1:'sol'});
  // This regression tests live HUD state, not WebGL performance or animation.
  LSW.game.world.render=()=>{};
 });
 for(const id of ['apex','sol','vanguard','webline','decibel','sol','talon','moses']){
  const result=await page.evaluate(async id=>{
   await LSW.stageAbility(id,'lmb',{resume:true});
   LSW.hud.update();
   const p=LSW.game.player;
   return {id:p.def.id,slots:Object.keys(p.slots).sort(),shown:Object.keys(LSW.hud.slotEls).filter(k=>k!=='melee').sort()};
  },id);
  assert.equal(result.id,id);assert.deepEqual(result.shown,result.slots);
 }
 console.log('PASS: live HUD follows full and curated roster slot transitions');
}finally{await browser.close();}
