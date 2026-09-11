// Production game physics, actual movement keys, scripted stationary opponent.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2]||'artifacts/flight-review/combat-strafe/motion';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(()=>{
  const g=LSW.game,w=g.world,update=g.update.bind(g),render=w.render.bind(w),end=g.input.endFrame.bind(g.input);
  g.update=()=>{};g.input.endFrame=()=>{};w.render=()=>{};g.controlBot=()=>{};
  // Local factory-built armed variant; never alters the shipped roster file.
  const index=LSW.ROSTER.findIndex(d=>d.id==='kano'),def=LSW.ROSTER[index];
  LSW.ROSTER[index]={...def,build:{...def.build,weaponR:'rifle'}};
  try{g.startMode('powerworld',{p1:'kano',p2:'vega'});}finally{LSW.ROSTER[index]=def;}
  const p=g.player,f=g.entities.find(e=>e!==p&&!e.isDummy);
  g.hud.setPlayer(p.def);
  for(const e of g.entities){e.ai=null;if(e!==p&&e!==f)e.pos.set(800,140,800);}
  p.pos.set(0,140,0);f.pos.set(0,140,40);p.vel.set(0,0,0);f.vel.set(0,0,0);
  p.flying=f.flying=true;p.gait=f.gait='airborne';p.faceDir(0,1);f.faceDir(0,-1);f.hp=f.maxHp=5000;
  g.fov=false;w.setFogEnabled(false);g.hardLock=f;w.snapChase();
  const key=(code,down)=>dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true}));
  for(let i=0;i<60;i++){update(1/60);end();}
  const label=document.createElement('div');label.style.cssText='position:fixed;top:82px;left:24px;background:#211d15dd;color:#fff0ca;padding:10px;font:600 13px system-ui';document.body.append(label);
  window.strafeFrame=frame=>{
   if(frame===10)key('KeyA',true);if(frame===45){key('KeyA',false);key('KeyD',true);}
   if(frame===75)key('KeyD',false);if(frame===95)key('KeyS',true);if(frame===125)key('KeyS',false);
   if(frame===140)key('KeyD',true);if(frame===145){g.input.mouse.left=true;g.input.mouse.leftEdge=true;}
   if(frame===175){g.input.mouse.left=false;g.input.mouse.leftUp=true;key('KeyD',false);}
   for(let i=0;i<3;i++){update(1/60);end();}
   label.textContent=`DIRECTIONAL FLIGHT / ${p._flightPoseState} · actual input · rifle variant · sparring partner`;
   render();
   const gl=w.renderer.getContext(),pixel=new Uint8Array(4);
   gl.readPixels(10,gl.drawingBufferHeight-10,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
   return {frame,pos:p.pos.toArray(),state:p._flightPoseState,speed:p.vel.length(),hp:f.hp,armed:!!p.parts.armR.children[2].userData.gripOccupied,head:p.parts.head.position.toArray(),quality:w._qTier,pixel:[...pixel]};
  };
 });
 const rows=[];for(let frame=0;frame<210;frame++){
  rows.push(await page.evaluate(frame=>strafeFrame(frame),frame));await page.screenshot({path:`${out}/frame-${String(frame).padStart(4,'0')}.png`});
 }
 await writeFile(`${out}/evidence.json`,JSON.stringify({fps:20,scriptedOpponent:true,actualMovementInput:true,rows,errors},null,2));
 if(errors.length||rows.some(r=>!r.armed||!r.pixel.slice(0,3).some(v=>v>20)))throw new Error('Armed motion capture integrity failed: '+errors.join('\n'));console.log({frames:rows.length,states:[...new Set(rows.map(r=>r.state))],quality:[...new Set(rows.map(r=>r.quality))],errors});
} finally {await browser.close();}
