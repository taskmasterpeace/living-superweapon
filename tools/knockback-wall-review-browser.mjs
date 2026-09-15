import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/knockback-wall-review';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:900}});const report={errors:[],samples:[]};page.on('pageerror',e=>report.errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5193/');await page.waitForFunction(()=>window.LSW?.game,null,{timeout:60000});
 await page.evaluate(()=>{const g=LSW.game;g.startMode('training',{p1:'sol'});g.modeId='powerworld';g.player._openSky=true;for(const node of document.querySelectorAll('#hSelect,#hTitle,#hSquad'))node.classList.remove('on');});
 await page.evaluate(async()=>{
  const g=window.LSW.game,p=g.player,T=await import('/node_modules/three/build/three.module.js');
  g.mode=null;for(const e of [...g.entities])if(e!==p){e.dispose();g.world.scene.remove(e.obj);}g.entities=[p];g.humans=[{fighter:p,scheme:'kbm'}];g.ms.chaseCam=true;g.mapCam=false;g.hud.titleOpen=false;g.hardLock=null;
  const y=g.world.heightAt(p.pos.x,p.pos.z);p.pos.y=y;p.vel.set(0,0,0);p.flying=p.flyHeld=false;p.facing=0;g.world._lookYaw=0;g.world._lookPitch=0;g.world.snapChase();
  const wall={x:p.pos.x,z:p.pos.z-7,hx:60,hz:2,h:50,top:y+50,hp:1e8,maxHp:1e8};g.world.cover.push(wall);
  const mesh=new T.Mesh(new T.BoxGeometry(120,50,4),new T.MeshStandardMaterial({color:'#596679'}));mesh.position.set(wall.x,y+25,wall.z);g.world.scene.add(mesh);
  window._wallReview={wall,mesh,T};window._hitWallReview=()=>{p.invuln=0;p._stunImmune=0;p.takeDamage(35,{src:{pos:p.pos.clone().add(new T.Vector3(0,0,15)),team:p.team+1},kb:new T.Vector3(0,0,-90),launch:16,dtype:'physical',strike:true});};
 });
 const sample=async label=>{const data=await page.evaluate(()=>{const g=window.LSW.game,p=g.player,T=_wallReview.T,c=g.world.camera;return {modular:!!p._modularCharacter,humans:g.humans.length,view:g.world.camMode,pos:p.pos.toArray(),ground:p.groundY,vel:p.vel.toArray(),flying:p.flying,grounded:p.grounded,state:p.state,stun:p.stunT,stagger:p.staggerT,launch:p.launchT,gait:p.gait,body:p.parts.body?.rotation.toArray(),obj:p.obj.rotation.toArray(),torso:p.parts.torso.rotation.toArray(),recovery:p._impactRecovery,lost:p._lostControlPose&&{time:p._lostControlPose.time,weight:p._lostControlPose.weight},camera:c.position.toArray(),pitch:g.world._lookPitch,distance:c.position.distanceTo(p.center(new T.Vector3())),head:p.parts.head.getWorldPosition(new T.Vector3()).project(c).toArray()};});report.samples.push({label,...data});await page.screenshot({path:`${out}/${label}.png`});};
 await page.waitForTimeout(700);await sample('before');await page.evaluate(()=>_hitWallReview());
 for(const [label,ms]of [['impact',120],['stunned',500],['recover',900],['standing',2000]]){await page.waitForTimeout(ms);await sample(label);}
}catch(error){report.failure=String(error);report.page=await page.evaluate(()=>({text:document.body.innerText.slice(-1500),game:!!window.LSW?.game,mode:window.LSW?.game?.modeId})).catch(()=>null);await page.screenshot({path:out+'/failure.png'});process.exitCode=1;}finally{await writeFile(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();}
