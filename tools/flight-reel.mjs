// Deterministic 24fps motion evidence from real inputs and the real chase camera.
// Frame time is simulation time, not the headless browser's throttled wall clock.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const path=process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'artifacts/flight-review/reel';await mkdir(path,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}});
try {
  await page.goto('http://127.0.0.1:5180/powerworld.html');
  await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
  await page.evaluate(()=>{
    const g=LSW.game;g._reelUpdate=g.update.bind(g);g.update=()=>{};
    g._reelRender=g.world.render.bind(g.world);g.world.render=()=>{};
    g.controlBot=()=>{};for(const f of g.entities)if(f!==g.player){f.ai=null;f.pos.set(400,70,400);}
    const label=document.createElement('div');label.id='reel-label';
    label.style.cssText='position:fixed;left:24px;top:24px;color:#ffcf70;font:600 18px system-ui;letter-spacing:.1em;text-shadow:0 2px 8px #000;pointer-events:none';
    document.body.append(label);
  });
  for(let frame=0;frame<192;frame++) {
    await page.evaluate(frame=>{
      const g=LSW.game;const key=(code,down)=>dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true}));
      const events={0:['Space',true],36:['Space',false],54:['KeyW',true],78:['ShiftLeft',true],108:['KeyD',true],126:['KeyD',false],132:['KeyW',false],133:['ShiftLeft',false]};
      if(events[frame])key(...events[frame]);
      for(let s=0;s<5;s++){g._reelUpdate(1/120);g.input.endFrame();}
      const title=frame<36?'01  /  TAKEOFF':frame<54?'02  /  HOVER':frame<78?'03  /  ACCELERATE':frame<108?'04  /  BOOST':frame<132?'05  /  BANK':'06  /  BRAKE → HOVER';
      document.querySelector('#reel-label').textContent=title;
      g._reelRender();
    },frame);
    await page.screenshot({path:`${path}/frame-${String(frame).padStart(4,'0')}.png`});
    if(frame%48===0)console.log('Captured',frame,'/192');
  }
}finally{await browser.close();}
