import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/spine-envelope/gameplay';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();await page.getByRole('tab',{name:'Attacks',exact:true}).click();
 await page.getByLabel('Attack slot',{exact:true}).selectOption('lmb');
 await page.getByLabel('Beam pose',{exact:true}).selectOption('optic-focus');
 const definition=await page.evaluate(()=>structuredClone(STUDIO.preview.fighter.slots.lmb.def));
 assert.ok(definition.faceOrigin);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await page.getByRole('button',{name:'Redo',exact:true}).click();
 assert.equal(await page.evaluate(()=>STUDIO.preview.fighter.slots.lmb.def.castStyle),'optic-focus');
 await page.screenshot({path:`${out}/studio-authored-optic.png`});
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(definition=>{
  const g=LSW.game,update=g.update.bind(g);g.update=()=>{};g.startMode('powerworld',{p1:'sol',p2:'kano'});g.controlBot=()=>{};g.fov=false;
  // Advance the complete simulation, but submit one render per inspected batch.
  // Thousands of background GPU submissions are not gameplay-FPS evidence.
  const render=g.world.render.bind(g.world);g.world.render=()=>{};
  const f=g.player,endFrame=g.input.endFrame.bind(g.input);g.input.endFrame=()=>{};g.input.keys.clear();endFrame();
  for(const other of g.entities)if(other!==f){other.ai=null;other.pos.set(800,140,800);}
  f.slots.lmb.def=definition;f.level=10;f.energyInfinite=true;f.invuln=100;
  f.pos.set(0,120,0);f.vel.set(0,0,0);f.flying=true;f.gait='airborne';
  g.hardLock=null;g.world._lookActive=true;g.world._lookYaw=0;g.world._lookPitch=0;g.world.snapChase();
  window.spineLiveStep=frames=>{
   const rows=[];
   for(let i=0;i<frames;i++){
    update(1/60);endFrame();const beam=f.slots.lmb.active;
    const q=f.parts.pelvis.quaternion.clone().invert().multiply(f.parts.torso.quaternion),a=f.parts.torso.rotation.clone();a.order='YXZ';a.setFromQuaternion(q);
    const ray=f.aim3.clone().set(0,0,1).applyQuaternion(f.parts.head.getWorldQuaternion(f.parts.head.quaternion.clone()));
    rows.push({position:f.pos.toArray(),velocity:f.vel.toArray(),yaw:a.y,flying:f.flying,beamAge:beam?.emissionAge||0,alignment:beam?.emissionAge>0?ray.dot(beam.dir):null,look:g.world._lookYaw});
   }
   render();return rows;
  };
  window.spineCanvas=g.world.renderer.domElement;
 },definition);
 const rows=[];rows.push(...await page.evaluate(()=>spineLiveStep(30)));
 await page.mouse.move(640,400);await page.mouse.down();await page.keyboard.down('d');
 rows.push(...await page.evaluate(()=>spineLiveStep(90)));
 await page.screenshot({path:`${out}/moving-optic.png`});
 const locked=await page.evaluate(()=>document.pointerLockElement===spineCanvas);
 if(locked)await page.evaluate(()=>spineCanvas.dispatchEvent(new MouseEvent('mousemove',{movementX:160,movementY:-30,clientX:640,clientY:400,bubbles:true})));
 else await page.mouse.move(840,310);
 rows.push(...await page.evaluate(()=>spineLiveStep(90)));
 await page.screenshot({path:`${out}/aim-while-moving.png`});
 await page.keyboard.up('d');await page.mouse.up();rows.push(...await page.evaluate(()=>spineLiveStep(90)));
 const emitted=rows.filter(r=>r.beamAge>0&&r.alignment!==null);
 assert.ok(emitted.length>90,'Mouse-held attack did not sustain');
 assert.ok(emitted.every(r=>r.alignment>.985),'Native animated eye emitter detached in integrated gameplay');
 assert.ok(emitted.every(r=>Math.abs(r.yaw)<=1.2+1e-5),'Native spine exceeded its final budget');
 assert.ok(Math.hypot(rows[180].position[0]-rows[0].position[0],rows[180].position[2]-rows[0].position[2])>10,'D input did not move the player');
 assert.ok(rows.every(r=>r.flying),'Flight was lost');assert.deepEqual(errors,[]);
 assert.ok(Math.abs(rows[180].look-rows[0].look)>.1,'Mouse motion did not change gameplay aim');
 await writeFile(`${out}/results.json`,JSON.stringify({rows,errors,locked,definition,scope:'Studio-authored local test power, browser key/mouse input, native controller/physics/camera/pose/beam updates. Synthetic relative mouse event only when pointer lock acquired.'},null,2));
 console.log(JSON.stringify({frames:rows.length,emitted:emitted.length,locked,errors}));
}finally{await browser.close();}
