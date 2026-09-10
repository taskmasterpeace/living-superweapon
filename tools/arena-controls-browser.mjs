import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/arena-controls';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const rows=await page.evaluate(()=>{
  const {game:g,THREE:T,SETTINGS}=LSW;g.update=()=>{};SETTINGS.scheme='arena';const rows=[];
  const key=(code,down)=>dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true}));
  for(const hz of [30,60,120]){
   g.startMode('powerworld',{p1:'sol',p2:'kano'});const a=g.player,b=g.entities.find(e=>e!==a&&!e.isDummy);
   for(const f of g.entities){f.ai=null;if(f!==a&&f!==b)f.pos.set(900,900,900);}
   for(const f of [a,b]){f.pos.set(0,140,f===a?0:5);f.vel.set(0,0,0);f.flying=true;f.gait='airborne';f.invuln=0;f.hp=f.maxHp=1000;}
   a.faceDir(0,1);b.faceDir(0,-1);g.hardLock=b;g.fov=false;g.world._lookYaw=0;g.world._lookPitch=0;g.world._lookActive=true;g.input.keys.clear();g.input.endFrame();
   const step=n=>{for(let i=0;i<n;i++){g.time+=1/hz;g.controlPlayer(1/hz);a.update(1/hz,g);b.move(new T.Vector3(),1/hz);b.update(1/hz,g);g.resolveBodies();g.cameraDrive(1/hz);g.input.endFrame();}};
   key('KeyV',true);step(1);key('KeyV',false);step(1);const selected=a._selSlot;
   const m=g.input.mouse;m.left=true;m.leftEdge=true;step(1);m.left=false;m.leftUp=true;step(Math.ceil(hz*.65));
   const light=1000-b.hp,leakedPowers=g.projectiles.list.length;
   key('KeyC',true);step(2);const blocked=a.guarding;key('KeyC',false);step(1);
   // Reset separation after the actual jab. The same mouse input now seizes,
   // hits the held opponent, and releases into a real aimed throw.
   a.pos.set(0,140,0);b.pos.set(0,140,5);a.vel.set(0,0,0);b.vel.set(0,0,0);a.strikeCd=0;a.mstate=null;b.staggerT=0;b.hitstop=0;a.hitstop=0;
   m.right=true;m.rightEdge=true;step(1);m.right=false;m.rightUp=true;step(Math.ceil(hz*.4));const seized=a.grabbing===b;
   const hp=b.hp;m.left=true;m.leftEdge=true;step(1);m.left=false;m.leftUp=true;step(Math.ceil(hz*.15));const body=hp-b.hp;
   m.right=true;m.rightEdge=true;step(1);m.right=false;m.rightUp=true;step(Math.ceil(hz*.5));
   rows.push({hz,selected,light,leakedPowers,blocked,seized,body,released:!a.grabbing&&!b.grabbedBy,throwDistance:b.pos.distanceTo(a.pos)});
  }
  return rows;
 });
 // Real Options persistence and canvas wheel/mouse events, separate from the
 // deterministic combat clock above. Do not modify the user's localhost save.
 await page.evaluate(()=>LSW.hud.showOptions());await page.locator('[data-scheme="arena"]').click();await page.locator('#hOptions .odone').click();
 await page.reload();await page.waitForFunction(()=>window.LSW?.game);assert.equal(await page.evaluate(()=>LSW.SETTINGS.scheme),'arena');await page.locator('#pwGo').click();
 await page.evaluate(()=>{
  const g=LSW.game;for(const f of g.entities)f.ai=null;
  g.player.pos.set(0,140,0);g.player.flying=true;g.player.gait='airborne';g.hardLock=null;
  g.update=dt=>{if(g.running){g.controlPlayer(dt);g.player.update(dt,g);g.cameraDrive(dt);}g.world.render();};LSW.hud.hintFull(false);
 });
 await page.keyboard.press('KeyV');await page.waitForFunction(()=>LSW.game.player._selSlot==='melee');
 await page.mouse.move(850,400);await page.mouse.wheel(0,100);await page.waitForFunction(()=>LSW.game.player._selSlot==='lmb');
 await page.keyboard.press('KeyV');await page.waitForFunction(()=>LSW.game.player._selSlot==='melee');
 await page.mouse.down();await page.waitForFunction(()=>!!LSW.game.player.meleeCharge);await page.mouse.wheel(0,100);
 // Wait for the boot loop to consume the wheel, not an arbitrary timeout.
 await page.waitForFunction(()=>LSW.input.wheel===0);assert.equal(await page.evaluate(()=>LSW.game.player._selSlot),'melee');
 await page.evaluate(()=>dispatchEvent(new Event('blur')));await page.mouse.up();await page.waitForFunction(()=>!LSW.game.player.meleeCharge);
 assert.equal(await page.evaluate(()=>LSW.game.running),false);await page.keyboard.press('Escape');await page.waitForFunction(()=>LSW.game.running);
 await page.waitForFunction(()=>!LSW.game.player.mstate);await page.mouse.wheel(0,100);await page.waitForFunction(()=>LSW.game.player._selSlot==='lmb');
 if(await page.evaluate(()=>!!document.pointerLockElement))await page.evaluate(()=>document.exitPointerLock());
 await page.screenshot({path:`${out}/live-controls.png`});
 const ui={schemePersisted:true,wheelSelects:true,heldWheelIgnored:true,blurReleased:true};
 console.log(JSON.stringify({rows,ui,errors},null,2));await writeFile(`${out}/results.json`,JSON.stringify({rows,ui,errors},null,2));
 assert.deepEqual(errors,[]);assert.ok(rows.every(r=>r.selected==='melee'&&r.light>0&&r.leakedPowers===0&&r.blocked&&r.seized&&r.body>0&&r.released&&r.throwDistance>10),'mouse-selected melee must strike, block, seize, body-blow and throw without firing a power');
}catch(error){
 console.error(await page.evaluate(()=>({selected:LSW.game.player?._selSlot,charge:LSW.game.player?.meleeCharge,queued:LSW.game.player?._meleeQueuedHeld,mstate:LSW.game.player?.mstate,grabbing:!!LSW.game.player?.grabbing,grabState:LSW.game.player?.grabState,mouse:LSW.input.mouse,wheel:LSW.input.wheel,over:document.elementFromPoint(640,360)?.outerHTML?.slice(0,500),errors:LSW.game._errors})));
 await page.screenshot({path:`${out}/failure.png`});throw error;
}finally{await browser.close();}
