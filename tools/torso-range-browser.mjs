import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const label=process.argv[2]||'before';assert.match(label,/^[a-z-]+$/);
const out=`artifacts/torso-range/${label}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1440,height:1000}}}),page=await context.newPage(),errors=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.evaluate(async()=>{
  const p=STUDIO.preview,f=p.fighter,T=await import('/node_modules/three/build/three.module.js'),{runSlot}=await import('/src/engine/abilities.js');
  p.playing=false;p.combat.clear();f._game=p.combat.game;p.controls.enabled=false;
  Object.assign(f,{animT:0,_openSky:true,hasAimWorld:true,energyInfinite:true,level:10,flying:false,gait:'grounded'});f.pos.set(0,0,0);f.vel.set(14,0,0);
  f.slots.lmb.def={type:'beam',castStyle:'palm',name:'Palm turning probe',cost:1,kiPerSec:1,dps:1,steer:8,color:'#ffc54a'};
  const aim=(yaw,height)=>{f.facing=yaw*Math.PI/180;f.aim.set(Math.sin(f.facing),0,Math.cos(f.facing));f.aimWorld.copy(f.pos).addScaledVector(f.aim,100);f.aimWorld.y+=8+height;f.aim3.copy(f.aimWorld).sub(f.pos).normalize();};
  const step=()=>{f.animT+=1/60;f.advanceActionPose(1/60);f._animate(1/60);f._game.projectiles.update(1/60,f._game);f.obj.updateMatrixWorld(true);};
  aim(0,0);for(let i=0;i<60;i++)step();runSlot(f,'lmb',{pressed:true,held:true,released:false,dt:1/60},f._game);for(let i=0;i<60;i++)step();
  const pq=new T.Quaternion(),tq=new T.Quaternion(),rel=new T.Quaternion();
  window.torsoStep=i=>{
   if(i%60===0){const [yaw,h]=[[170,25],[-100,-30],[5,60],[-170,-80],[90,80],[180,0]][i/60];aim(yaw,h);}step();
   f.parts.pelvis.getWorldQuaternion(pq);f.parts.torso.getWorldQuaternion(tq);rel.copy(pq).invert().multiply(tq);
   const turn=rel.angleTo(new T.Quaternion())*180/Math.PI;
   p.camera.position.set(18,12,24);p.controls.target.set(0,5,0);p.camera.fov=38;p.camera.lookAt(p.controls.target);p.camera.updateProjectionMatrix();
   document.querySelector('.view-tag').textContent='SOL / PROCEDURAL PALM / SOURCE GAIT / TORSO INSPECTION';
   document.querySelector('.viewport-note').textContent='Final torso/pelvis measurement. Fixed-velocity articulation; not integrated movement, gameplay camera or FPS evidence.';
   document.querySelector('.measurements').textContent=`Torso / pelvis ${turn.toFixed(1)}° · frame ${i}`;
   p.renderer.render(p.scene,p.camera);return {frame:i,turn};
  };
 });
 for(const [start,end,name]of [[0,60,'first-turn'],[60,120,'second-turn'],[120,180,'upward'],[180,194,'rearward-peak'],[194,240,'rearward-settled'],[240,300,'across'],[300,360,'retreat']]){
  rows.push(...await page.evaluate(async({start,end})=>{const result=[];for(let i=start;i<end;i++){result.push(torsoStep(i));await new Promise(requestAnimationFrame);}return result;},{start,end}));
  await page.locator('.viewport').screenshot({path:`${out}/${name}.png`});
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({label,frames:rows.length,maxTurn:Math.max(...rows.map(r=>r.turn)),errors}));
}finally{await writeFile(`${out}/results.json`,JSON.stringify({rows,errors},null,2));await context.close();await page.video()?.saveAs(`${out}/torso-range.webm`);await browser.close();}
