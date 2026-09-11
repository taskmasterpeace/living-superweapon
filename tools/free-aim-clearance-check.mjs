import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/flight-review/free-aim-clearance';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}});
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const rows=await page.evaluate(async()=>{
  const {Fighter}=await import('/src/engine/entity.js'),{game:g,THREE:T,ROSTER}=LSW,w=g.world;g.update=()=>{};const rows=[];
  for(const def of ROSTER){
   const p=new Fighter(def);p._game=g;p._openSky=true;p.pos.set(0,140,0);p.flying=true;p.gait='airborne';p._flyPose=1;p.faceDir(0,1);
   for(const state of ['hover','boost'])for(const pitch of [-60,0,60]){
    p.vel.set(0,0,state==='boost'?100:0);p.cruiseHeld=state==='boost';
    w._lookActive=true;w._lookYaw=0;w._lookPitch=pitch*Math.PI/180;w._shake=0;w.clearFrameClaims();w.snapChase();
    for(let i=0;i<90;i++){p._animate(1/60);w.chase(p,null,1/60);}p.obj.updateMatrixWorld(true);w.camera.updateMatrixWorld(true);
    const dir=w.camera.getWorldDirection(new T.Vector3()),ray=new T.Raycaster(w.camera.position,dir,0,100);
    const blocked=ray.intersectObject(p.parts.body,true).some(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return h.object.material&&!h.object.material.transparent;});
    const head=p.parts.head.getWorldPosition(new T.Vector3()).project(w.camera);
    rows.push({id:def.id,state,pitch,blocked,head:head.toArray()});
   }p.dispose();
  }return rows;
 });
 const failures=rows.filter(r=>r.blocked);await writeFile(`${out}/checks.json`,JSON.stringify({rows,failures},null,2));console.log(JSON.stringify({tested:rows.length,failures},null,2));if(failures.length)process.exitCode=1;
}finally{await browser.close();}
