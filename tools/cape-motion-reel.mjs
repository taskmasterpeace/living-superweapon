// Procedural production Fighter animation; authored velocity sweep, fixed root and review camera.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const tag=process.argv.includes('--before')?'before':'after',out=`artifacts/flight-review/cape/${tag}`;
await mkdir(out,{recursive:true});const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(()=>{const g=LSW.game;g.update=()=>{};g.startMode('powerworld',{p1:'sol',p2:'kano'});g.fov=false;g.world.setFogEnabled(false);for(const f of g.entities)if(f!==g.player){f.ai=null;f.pos.set(800,0,800);}const f=g.player;f.pos.set(0,160,0);f.flying=true;f.gait='airborne';f.faceDir(0,1);f.invuln=0;f._flyPose=1;g.comic.clear();});
 await page.addStyleTag({content:'body > :not(canvas) { visibility:hidden !important; }'});
 const rows=[];
 for(let frame=0;frame<160;frame++){
  rows.push(await page.evaluate(frame=>{const {game:g,THREE:T}=LSW,f=g.player,w=g.world,t=frame/20;
   const ramp=Math.min(1,Math.max(0,(t-1)/1.5)),brake=Math.min(1,Math.max(0,(t-5)/1.2)),speed=110*ramp*(1-brake),turn=Math.sin(Math.max(0,Math.min(1,(t-3)/2))*Math.PI)*.7;
   f.vel.set(Math.sin(turn)*speed,0,Math.cos(turn)*speed);f.cruiseHeld=t>2&&t<5;f._flightBrake=t>=5&&t<6.2?1:0;
   for(let i=0;i<6;i++){f.animT=(frame*6+i)/120;f._animate(1/120);}f.obj.updateMatrixWorld(true);
   const center=f.parts.pelvis.getWorldPosition(new T.Vector3());w.camera.position.copy(center).add(new T.Vector3(17,6,-24));w.camera.lookAt(center.clone().add(new T.Vector3(0,1,0)));w._shake=0;w.render();
   const cape=f.parts.cape,a=cape.geometry.attributes.position,r=cape.userData.rest,top=new T.Vector3(),tail=new T.Vector3();let nt=0,nb=0;
   for(let i=0;i<a.count;i++){const v=new T.Vector3().fromBufferAttribute(a,i);cape.localToWorld(v);if(r[i*3+1]>2.59){top.add(v);nt++;}if(r[i*3+1]<-2.59){tail.add(v);nb++;}}
   return {frame,time:t,velocity:f.vel.toArray(),tail:tail.divideScalar(nb).sub(top.divideScalar(nt)).toArray(),vertices:Array.from(a.array),root:f.pos.toArray()};
  },frame));
  if(!process.argv.includes('--stills')||[0,40,80,120,159].includes(frame))await page.screenshot({path:`${out}/${String(frame).padStart(4,'0')}.png`});
 }
 await writeFile(`${out}/evidence.json`,JSON.stringify({procedural:true,scriptedVelocity:true,fixedReviewRoot:true,fps:20,frames:160,rows,errors}));console.log({out,errors});if(errors.length)process.exitCode=1;
}finally{await browser.close();}
