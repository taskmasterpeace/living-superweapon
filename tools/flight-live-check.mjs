import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const output='artifacts/flight-review';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto('http://127.0.0.1:5180/powerworld.html');
  await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
  await page.evaluate(()=>{
    const g=LSW.game;g._reviewUpdate=g.update.bind(g);g.update=()=>{};
    g._reviewRender=g.world.render.bind(g.world);g.world.render=()=>{};
    g.controlBot=()=>{};
    for(const f of g.entities)if(f!==g.player){f.ai=null;f.pos.set(300,50,300);}
    window.reviewStep=(seconds)=>{for(let i=0;i<Math.round(seconds*60);i++){g._reviewUpdate(1/60);g.input.endFrame();}};
    window.reviewKey=(code,down)=>dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true}));
  });
  const checks=[];
  const result=await page.evaluate(()=>{
    const f=LSW.game.player, floor=f.pos.y;
    reviewKey('Space',true);reviewStep(1.5);reviewKey('Space',false);reviewStep(.7);
    return {height:f.pos.y-floor,verticalSpeed:f.vel.y,flying:f.flying,gait:f.gait};
  });
  checks.push({name:'hold Space takes off through real input and release holds altitude',pass:result.height>20&&Math.abs(result.verticalSpeed)<3&&result.flying,measured:result});
  for(const beat of [
    {name:'01-hover',seconds:.5},
    {name:'02-accelerate',down:'KeyW',seconds:.18},
    {name:'03-cruise',seconds:.7},
    {name:'04-boost',down:'ShiftLeft',seconds:1.2},
    {name:'05-bank',down:'KeyD',seconds:.35},
    {name:'06-brake',up:['KeyW','KeyD','ShiftLeft'],seconds:.2},
    {name:'07-hover',seconds:1.0},
    {name:'08-cast',down:'KeyQ',seconds:.2},
  ]){
    const sample=await page.evaluate(beat=>{
      if(beat.down)reviewKey(beat.down,true);for(const key of beat.up||[])reviewKey(key,false);
      reviewStep(beat.seconds);LSW.game._reviewRender();
      const f=LSW.game.player;
      return {speed:f.vel.length(),position:f.pos.toArray(),pitch:f.obj.rotation.x,bank:f.obj.rotation.z};
    },beat);
    console.log(beat.name,sample);
    await page.screenshot({path:`${output}/${beat.name}.png`});
  }
  const integrity=await page.evaluate(async()=>{
    const {game:g,THREE:T,ROSTER}=LSW;
    const {Fighter}=await import('/src/engine/entity.js');
    const {Ragdoll}=await import('/src/engine/ragdoll.js');
    const bad=[];let tested=0;
    for(const def of ROSTER) {
      // Use the real factory/rig and animation; every silhouette must keep finite sockets and
      // its current pose on KO. No WebGL render is needed for this geometric contract.
      const f=new Fighter(def);f.pos.set(0,80,0);
      f._openSky=true;f.flying=true;f.gait='airborne';f.vel.set(0,0,60);
      f._game=g;
      for(let i=0;i<60;i++){f.animT+=1/60;f._animate(1/60);}
      f.obj.updateMatrixWorld(true);
      const hand=f.parts.armR.children[2].getWorldPosition(new T.Vector3());
      const rd=new Ragdoll(f,new T.Vector3(10,2,20));
      if(rd.P.haR.pos.distanceTo(hand)>.01)bad.push(def.id+': KO hand jumps');
      rd.apply(f);f.obj.updateMatrixWorld(true);
      if(f.parts.armR.children[2].getWorldPosition(new T.Vector3()).distanceTo(hand)>.01)bad.push(def.id+': body-root KO transform');
      rd.restore();
      f.flying=false;f.gait='grounded';f.vel.set(0,0,0);
      for(let i=0;i<60;i++)f._animate(1/60);
      for(const [name,m] of Object.entries(f.parts.rig.sockets)){
        const v=m.getWorldPosition(new T.Vector3());
        if(!Number.isFinite(v.x+v.y+v.z))bad.push(def.id+': '+name+' NaN');
      }
      f.dispose();tested++;
    }
    return {tested,bad};
  });
  checks.push({name:'all roster rigs preserve sockets across flight / KO / recovery',pass:integrity.bad.length===0,measured:integrity});
  console.log(JSON.stringify({checks,errors},null,2));
  await writeFile(`${output}/live-checks.json`,JSON.stringify({checks,errors},null,2));
  if(checks.some(c=>!c.pass)||errors.length)process.exitCode=1;
} finally {await browser.close();}
