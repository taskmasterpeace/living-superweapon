// Hand-derived clipping fixture for our occupancy projection. At 90deg FOV,
// a +/-1 cube cut at z=-1 reaches all four screen edges; its surviving z=-2.5
// corners alone cover only 40% of the viewport and are not a valid reservation.
import {chromium} from 'playwright';
const b=await chromium.launch(),page=await b.newPage();
try{
 await page.goto('http://127.0.0.1:5180/studio.html');await page.waitForFunction(()=>window.STUDIO);
 const rows=await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js'),{Comic}=await import('/src/engine/comic.js');
  const camera=new T.PerspectiveCamera(90,1,1,100);camera.updateMatrixWorld(true);
  const obj=new T.Group(),head=new T.Mesh(new T.BoxGeometry(2,2,2),new T.MeshBasicMaterial());obj.add(head);
  const f={alive:true,isPlayer:true,obj,parts:{head,armL:new T.Group(),armR:new T.Group(),legL:new T.Group(),legR:new T.Group()}};
  const c=new Comic({world:{camera},entities:[f]}),rows=[];
  for(const z of [-1.5,4]){
   head.position.z=z;const boxes=[];c._combatOccupancy(boxes);rows.push({z,boxes:boxes.map(({fighter,...box})=>box),width:innerWidth,height:innerHeight});
  }
  head.geometry.dispose();head.material.dispose();return rows;
 });
 const r=rows[0],box=r.boxes[0],failures=[];
 if(!box||box.x>0||box.y>0||box.x+box.w<r.width||box.y+box.h<r.height)failures.push('Near-plane clipped body is under-reserved');
 if(rows[1].boxes.length)failures.push('Fully behind-camera actor occupies the screen');
 console.log(JSON.stringify({rows,failures},null,2));if(failures.length)process.exitCode=1;
}finally{await b.close();}
