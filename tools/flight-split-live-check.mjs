import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/flight-split-aim/live';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const rows=await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW,update=g.update.bind(g);g.update=()=>{};g.world.render=()=>{};g.controlBot=()=>{};
  const rows=[];
  for(const hz of [30,60,120]){
   g.startMode('powerworld',{p1:'sol',p2:'kano'});const f=g.player;
   for(const other of g.entities)if(other!==f){other.ai=null;other.pos.set(300,50,300);}
   g.input.keys.clear();g.input.endFrame();g.input.pointerLock=false;g.hardLock=null;g.world._lookYaw=0;g.world._lookPitch=0;
   f.pos.set(0,60,-80);f.vel.set(0,0,0);f.flying=false;f.gait='airborne';f.invuln=30;f.energyInfinite=true;
   const key=(code,type)=>dispatchEvent(new KeyboardEvent(type,{code,bubbles:true}));
   key('KeyF','keydown');update(1/hz);g.input.endFrame();key('KeyF','keyup');
   const toggled=f.flying,start=f.pos.clone(),samples=[];if(g._tapT)g._tapT.KeyD=-9;
   key('KeyD','keydown');g.world.renderer.domElement.dispatchEvent(new MouseEvent('mousedown',{button:0,clientX:720,clientY:450,bubbles:true}));
   for(let i=0;i<hz*2;i++){
    update(1/hz);g.input.endFrame();if(i<hz)continue;f.obj.updateMatrixWorld(true);
    const head=new T.Vector3(0,0,1).applyQuaternion(f.parts.head.getWorldQuaternion(new T.Quaternion()));
    const pelvis=new T.Vector3(0,0,1).applyQuaternion(f.parts.pelvis.getWorldQuaternion(new T.Quaternion())).setY(0).normalize();
    const travel=f.vel.clone().setY(0).normalize();
    samples.push({airborne:f.airborne,flying:f.flying,alignment:f.slots.lmb.active?head.dot(f.slots.lmb.active.dir):0,travel:pelvis.dot(travel),separation:pelvis.angleTo(head),speed:f.vel.length()});
   }
   dispatchEvent(new MouseEvent('mouseup',{button:0,bubbles:true}));key('KeyD','keyup');
   for(let i=0;i<hz;i++){update(1/hz);g.input.endFrame();}
   rows.push({hz,toggled,distance:f.pos.distanceTo(start),samples,recovered:f._combatAim.weight<.001,remainingSpeed:f.vel.length()});
  }
  return rows;
 });
 await writeFile(`${out}/results.json`,JSON.stringify({rows,errors},null,2));
 for(const row of rows){
  assert.ok(row.toggled,'real F input must enter flight');assert.ok(row.distance>20,'real D input must translate the flyer');
  assert.ok(row.samples.every(s=>s.flying&&s.airborne&&s.speed>10&&s.travel>.85),'actual flight travel must retain its lower-body direction');
  assert.ok(row.samples.every(s=>s.alignment>.985&&s.separation>.6),'actual mouse input must aim eyes independently of flying legs');
  assert.ok(row.recovered&&row.remainingSpeed<1,'release must stop casting and brake');
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({rows:rows.map(({samples,...r})=>({...r,minAlignment:Math.min(...samples.map(s=>s.alignment)),minTravel:Math.min(...samples.map(s=>s.travel))})),errors}));
}finally{await browser.close();}
