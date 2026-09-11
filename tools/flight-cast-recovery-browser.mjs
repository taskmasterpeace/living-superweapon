// Exact rendered-volume regression: SOL's optic + paired release into cruise.
// Fixed-position articulation only; this is not a gameplay camera/FPS capture.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/flight-cast-recovery';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.evaluate(async()=>{
  const p=STUDIO.preview,{runSlot}=await import('/src/engine/abilities.js');p.playing=false;p.controls.enabled=false;p.combat.clear();
  const f=p.fighter,g=p.combat.game;f._game=g;g.entities=[f];
  Object.assign(f,{animT:4.4688715047124985,_openSky:true,hasAimWorld:true,energyInfinite:true,level:10,flying:true,gait:'airborne'});
  f.pos.set(0,50,0);f.vel.set(14,0,36);f.facing=0;f.aim.set(0,0,1);f.aimWorld.set(0,68,100);f.aim3.copy(f.aimWorld).sub(f.pos).normalize();
  f.slots={lmb:{cd:0,def:{type:'beam',faceOrigin:true,castStyle:'optic-focus',cost:1,dps:1,kiPerSec:1,steer:4,color:'#ff6249'}},
   rmb:{cd:0,def:{type:'beam',castStyle:'two-hand',cost:1,dps:1,kiPerSec:1,steer:12,color:'#ffd64a'}}};
  const step=()=>{f.advanceActionPose(1/60);f.animT+=1/60;f._animate(1/60);f.obj.updateMatrixWorld(true);g.projectiles.update(1/60,g);};
  for(let i=0;i<90;i++)step();let at=-1;
  window.recoveryFrame=end=>{
   while(at<end){at++;if(at===12)for(const key of ['lmb','rmb'])runSlot(f,key,{pressed:true,held:true,released:false,dt:1/60},g);
    if(at===100||at===155)runSlot(f,at===100?'rmb':'lmb',{pressed:false,held:false,released:true,dt:1/60},g);step();}
   return {frame:at,cast:f.castPose,overlay:f._combatAim.weight,source:f._combatAim.source,flight:f._flightPoseState,position:f.pos.toArray(),velocity:f.vel.toArray()};
  };
  window.recoveryView=angle=>{
   p.camera.position.set(Math.sin(angle)*22,60,Math.cos(angle)*22);p.camera.lookAt(0,55,0);p.camera.fov=30;p.camera.updateProjectionMatrix();
   document.querySelector('.view-tag').textContent='SOL / OPTIC + TWO-HAND → FLIGHT RECOVERY';
   document.querySelector('.measurements').textContent=`Regression phase 4.4688715 · frame ${at}`;
   document.querySelector('.viewport-note').textContent='Production rig + real powers. Fixed-position articulation; not gameplay travel, camera or performance evidence.';
   p.renderer.render(p.scene,p.camera);
  };
 });
 for(const frame of [154,174,177,180,200,239]){
  rows.push(await page.evaluate(frame=>recoveryFrame(frame),frame));
  for(const [angle,view]of [[0,'front'],[-Math.PI/2,'left'],[Math.PI,'rear']]){
   await page.evaluate(angle=>recoveryView(angle),angle);await page.locator('.viewport').screenshot({path:`${out}/${frame}-${view}.png`});
  }
 }
 assert.deepEqual(errors,[]);assert.ok(rows.every(r=>JSON.stringify(r.velocity)==='[14,0,36]'));assert.ok(rows.at(-1).overlay<.0001);
 await writeFile(`${out}/results.json`,JSON.stringify({scope:'Exact fixed-position flight-recovery articulation regression',rows,errors},null,2));console.log(JSON.stringify({rows,errors}));
}finally{await browser.close();}
