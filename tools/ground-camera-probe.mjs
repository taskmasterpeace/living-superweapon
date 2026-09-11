import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/ground-camera/probe';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(()=>{const g=LSW.game;g.update=()=>{};g.fov=false;g.world.setFogEnabled(false);for(const e of g.entities)if(e!==g.player)e.obj.visible=false;});
 const rows=[];
 for(const pitch of [0,30,45,60,79,89])for(const kind of ['native','trace-hypothesis','head-anchor','raised-trace','lateral-trace']){
  rows.push(await page.evaluate(({pitch,kind})=>{
   const {game:g,THREE:T}=LSW,w=g.world,f=g.player;
   f.pos.set(0,0,-80);f.vel.set(0,0,0);f.flying=false;f.gait='grounded';f.facing=0;f.animT=0;
   f.aim.set(0,0,1);f.aim3.set(0,Math.sin(pitch*Math.PI/180),Math.cos(pitch*Math.PI/180));f.hasAimWorld=true;
   f.aimWorld.copy(f.pos).addScaledVector(f.aim3,1000);for(let i=0;i<60;i++){f.animT+=1/60;f._animate(1/60);}
   w._lookActive=true;w._lookYaw=0;w._lookPitch=pitch*Math.PI/180;w._shake=0;w.snapChase();w.chase(f,null,1/60);
   const c=w.camera,forward=c.getWorldDirection(new T.Vector3()),up=new T.Vector3(0,1,0).applyQuaternion(c.quaternion);
   const anchor=f.pos.clone().add(new T.Vector3(0,5.4,0)),desired=anchor.clone().addScaledVector(forward,-25.5).addScaledVector(up,9);
   const pad=c.near*Math.sqrt(1+Math.tan(c.fov*Math.PI/360)**2*(1+c.aspect**2))*1.35;
   if(kind!=='native'&&desired.y<pad){
    if(kind==='head-anchor')anchor.y=f.parts.head.getWorldPosition(new T.Vector3()).y;
    const t=(anchor.y-pad)/(anchor.y-desired.y);c.position.copy(anchor).lerp(desired,t);if(kind==='raised-trace')c.position.y+=(1-t)*4.6;if(kind==='lateral-trace')c.position.x-=(1-t)*6;c.lookAt(c.position.clone().add(forward));
   }
   c.updateMatrixWorld(true);f.obj.updateMatrixWorld(true);
   const projected={};for(const name of ['head','torso','pelvis'])projected[name]=f.parts[name].getWorldPosition(new T.Vector3()).project(c).toArray();
   w.render();return {pitch,kind,player:f.def.id,openSky:f._openSky,ground:w.heightAt(c.position.x,c.position.z),pad,camera:c.position.toArray(),desired:desired.toArray(),projected};
  },{pitch,kind}));
  await page.screenshot({path:`${out}/${pitch}-${kind}.png`});
 }
 await writeFile(`${out}/results.json`,JSON.stringify({rows,errors},null,2));console.log(JSON.stringify({rows,errors},null,2));
}finally{await browser.close();}
