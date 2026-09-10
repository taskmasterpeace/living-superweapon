import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/ground-air-handoff';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],frames=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(()=>{
  const g=LSW.game,f=g.player,update=g.update.bind(g),render=g.world.render.bind(g.world);
  g.update=()=>{};g.world.render=()=>{};g.controlBot=()=>{};
  for(const actor of g.entities)if(actor!==f){actor.ai=null;actor.pos.set(300,50,300);}
  g.input.keys.clear();g.input.endFrame();g.hardLock=null;g.world._lookYaw=0;g.world._lookPitch=0;
  f.pos.set(0,0,-80);f.vel.set(0,0,0);f.flying=false;f.gait='grounded';f.invuln=30;
  const key=(code,on)=>{if(on&&g._tapT)g._tapT[code]=-9;dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code,bubbles:true}));};
  const step=()=>{update(1/60);g.input.endFrame();};
  for(let i=0;i<30;i++)step();key('KeyW',true);for(let i=0;i<102;i++)step();
  window.jumpHarness={g,f,step,key,render};
  const note=document.createElement('div');note.id='jump-proof-note';note.style.cssText='position:fixed;left:20px;top:90px;color:white;background:#171c18dd;padding:10px;z-index:10000;font:14px system-ui';note.textContent='Native W + short Space tap · controller and physics · inspection camera';document.body.append(note);
 });
 for(let i=0;i<108;i++){
  frames.push(await page.evaluate(frame=>{
   const {g,f,key,step,render}=jumpHarness;
   const parts=[f.parts.legL,f.parts.legR,f.parts.legL.userData.knee,f.parts.legR.userData.knee],before=parts.map(p=>p.quaternion.clone());
   if(frame===0)key('Space',true);if(frame===4)key('Space',false);if(frame===75)key('KeyW',false);
   step();const camera=g.world.camera;
   // The game owns all input/physics. Only this labeled inspection lens is placed here.
   camera.position.set(f.pos.x+19,f.pos.y+10,f.pos.z+23);camera.lookAt(f.pos.x,f.pos.y+5,f.pos.z);
   render();
   return {frame,y:f.pos.y,gait:f.gait,flying:f.flying,remaining:f._groundTransition?.remaining||0,
    angles:parts.map((p,j)=>p.quaternion.angleTo(before[j])),position:f.pos.toArray()};
  },i));
  if(i%2===0)await page.screenshot({path:`${out}/inspection-${String(i/2).padStart(3,'0')}.png`});
 }
 assert.ok(frames.some(f=>f.y>4)&&frames.every(f=>!f.flying),'Short Space tap must jump without entering powered flight');
 assert.ok(frames.at(-1).y<.1&&frames.at(-1).gait==='grounded','Jump returns to ground');
 assert.ok(Math.max(...frames[0].angles)<.5,'Native jump first frame must not snap');
 assert.ok(frames.at(-1).remaining===0,'Transition cannot stay active');
 await page.evaluate(()=>{const {g,f,render}=jumpHarness;document.querySelector('#jump-proof-note').textContent='Native short jump completed · restored game camera';g.world.snapChase();g.world.chase(f,null,1/60);render();});
 await page.screenshot({path:`${out}/game-camera.png`});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({apex:Math.max(...frames.map(f=>f.y)),firstFrameDegrees:frames[0].angles.map(a=>a*180/Math.PI),landed:frames.at(-1),errors},null,2));
}finally{await writeFile(`${out}/results.json`,JSON.stringify({frames,errors},null,2));await browser.close();}
