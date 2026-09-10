import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/ground-axial-support/gameplay';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=titan');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();await page.getByRole('tab',{name:'Attacks',exact:true}).click();
 await page.getByLabel('Attack slot',{exact:true}).selectOption('q');
 await page.getByLabel('Attack pose',{exact:true}).selectOption('chest-brace');
 await page.getByRole('button',{name:'Undo',exact:true}).click();await page.getByRole('button',{name:'Redo',exact:true}).click();
 const sourceDefinition=await page.evaluate(()=>structuredClone(STUDIO.preview.fighter.slots.q.def));
 assert.equal(sourceDefinition.castStyle,'chest-brace');assert.ok(sourceDefinition.chest);
 // The shipped chest power is a charged orb. Exercise continuous first-launch
 // readiness with a labeled local hose; do not claim this changes its emitter
 // or power type through Studio's presentation-only authoring controls.
 const definition={...sourceDefinition,type:'beam',name:'Grounded chest test hose',charge:false,
  kiPerSec:1,steer:12,radius:.4,tipSpeed:150,maxLen:500,dps:1};
 await page.screenshot({path:`${out}/studio-authored-chest.png`});
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(definition=>{
  const g=LSW.game,update=g.update.bind(g);g.update=()=>{};g.startMode('powerworld',{p1:'titan',p2:'kano'});g.controlBot=()=>{};g.fov=false;
  const render=g.world.render.bind(g.world);g.world.render=()=>{};
  const f=g.player,endFrame=g.input.endFrame.bind(g.input);g.input.endFrame=()=>{};g.input.keys.clear();endFrame();
  for(const other of g.entities)if(other!==f){other.ai=null;other.pos.set(800,140,800);}
  f.slots.lmb.def=definition;f.level=10;f.energyInfinite=true;f.invuln=100;
  f.pos.set(0,0,-80);f.vel.set(0,0,0);f.flying=false;f.gait='grounded';
  g.hardLock=null;g.world._lookActive=true;g.world._lookYaw=0;g.world._lookPitch=1.38;g.world.snapChase();
  window.groundLiveStep=frames=>{
   const rows=[];
   for(let i=0;i<frames;i++){
    update(1/60);endFrame();const beam=f.slots.lmb.active;
    const ray=f.aim3.clone().set(0,0,1).applyQuaternion(f.parts.torso.getWorldQuaternion(f.parts.torso.quaternion.clone()));
    rows.push({position:f.pos.toArray(),velocity:f.vel.toArray(),flying:f.flying,source:f._groundMotion?.take,
     support:f._groundAimSupport?.rotation.angleTo(f.parts.torso.quaternion.clone().identity())||0,
     beamAge:beam?.emissionAge||0,alignment:beam?.emissionAge>0?ray.dot(beam.dir):null,look:g.world._lookYaw,pitch:g.world._lookPitch});
   }
   render();return rows;
  };
  window.groundCanvas=g.world.renderer.domElement;
 },definition);
 const rows=[];rows.push(...await page.evaluate(()=>groundLiveStep(30)));
 await page.mouse.move(640,400);await page.mouse.down();await page.keyboard.down('d');
 rows.push(...await page.evaluate(()=>groundLiveStep(90)));
 await page.screenshot({path:`${out}/moving-chest.png`});
 const locked=await page.evaluate(()=>document.pointerLockElement===groundCanvas);
 if(locked)await page.evaluate(()=>groundCanvas.dispatchEvent(new MouseEvent('mousemove',{movementX:160,movementY:0,clientX:640,clientY:400,bubbles:true})));
 else await page.mouse.move(800,400);
 rows.push(...await page.evaluate(()=>groundLiveStep(90)));
 await page.screenshot({path:`${out}/aim-while-moving.png`});
 await page.keyboard.up('d');await page.mouse.up();rows.push(...await page.evaluate(()=>groundLiveStep(90)));
 const emitted=rows.filter(r=>r.beamAge>0&&r.alignment!==null),first=rows.findIndex(r=>r.beamAge>0);
 await writeFile(`${out}/results.json`,JSON.stringify({rows,errors,locked,sourceDefinition,definition,scope:'Studio-authored shipped TITAN chest pose, applied to a labeled local test hose; native controller, physics, camera, pose and beam. Real browser D and LMB; synthetic relative mouse event only after pointer lock. Batched renders are not FPS evidence. No saved-kit edits.'},null,2));
 assert.ok(first>=30&&first<66,`Steep first shot did not acquire within .6s: frame ${first}`);
 assert.ok(emitted.length>120&&emitted.every(r=>r.alignment>.99),'Native chest emission did not follow the animated torso');
 assert.ok(emitted.some(r=>r.support>.2),'Actual grounded chest support was never exercised');
 assert.ok(Math.hypot(rows[180].position[0]-rows[0].position[0],rows[180].position[2]-rows[0].position[2])>10,'D input did not produce native travel');
 assert.ok(rows.every(r=>!r.flying&&r.position[1]<.1),'Grounded attack changed flight state or floor contact');
 assert.ok(Math.abs(rows[180].look-rows[0].look)>.1,'Mouse motion did not change gameplay aim');
 assert.ok(rows.at(-1).support<1e-6,'Release kept the pelvis support');assert.deepEqual(errors,[]);
 console.log(JSON.stringify({frames:rows.length,emitted:emitted.length,first,locked,errors}));
}finally{await browser.close();}
