// Diagnostic parameter sweep through the production camera; not an acceptance test.
import {chromium} from 'playwright';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}});
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 console.log(await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW;g.update=()=>{};g.startMode('powerworld',{p1:'sol',p2:'kano'});
  const p=g.player,foe=g.entities.find(e=>e!==p&&!e.isDummy),w=g.world,rows=[];
  p.pos.set(0,140,0);foe.pos.set(0,140,40);p.vel.set(0,0,0);p.flying=true;p.gait='airborne';p._flyPose=1;p.faceDir(0,1);
  for(let i=0;i<120;i++)p._animate(1/120);p.obj.updateMatrixWorld(true);
  for(const range of [28,30,32,34,36,38])for(const height of [9,9.5,10,10.5,11,11.5,12]){
   p.def={...p.def,model:{...p.def.model,camera:{range,height}}};w._lookActive=true;w._lookYaw=0;w._lookPitch=0;w.snapChase();w.chase(p,null,1/60);w.camera.updateMatrixWorld(true);
   const feet=[];for(const mesh of [p.parts.legL.userData.boot,p.parts.legR.userData.boot]){
    mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox;
    for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])feet.push((1-new T.Vector3(x,y,z).applyMatrix4(mesh.matrixWorld).project(w.camera).y)/2);
   }
   const center=foe.center(new T.Vector3()),ray=new T.Raycaster(w.camera.position,center.clone().sub(w.camera.position).normalize(),0,w.camera.position.distanceTo(center)-.1);
   const blocked=ray.intersectObject(p.parts.body,true).some(h=>h.object.visible&&!h.object.material.transparent);
   const head=(1-p.parts.head.getWorldPosition(new T.Vector3()).project(w.camera).y)/2,bottom=Math.max(...feet);
   rows.push({range,height,head,bottom,blocked});
  }
  return rows.filter(r=>!r.blocked&&r.bottom<.94&&r.head>=.59&&r.head<.7);
 }));
}finally{await browser.close();}
