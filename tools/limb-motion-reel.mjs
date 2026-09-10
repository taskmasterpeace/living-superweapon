// Production Fighter + Ragdoll on Studio's neutral floor. Scripted velocity, not player input.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2]||'artifacts/flight-review/limb-surfaces/motion';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.evaluate(async()=>{
  const {Ragdoll}=await import('/src/engine/ragdoll.js'),T=await import('/node_modules/three/build/three.module.js');
  const p=STUDIO.preview;p.setProfile({...p.def,build:{weaponR:'rifle'}},p.profile);p.setState('hover');p.setView('side');
  cancelAnimationFrame(p.raf);p.controls.enabled=false;
  let rag=null;
  window.limbFrame=frame=>{
   const f=p.fighter;
   if(frame===60)rag=new Ragdoll(f,new T.Vector3(5,6,2));
   if(frame===150){rag.restore();rag=null;f.pos.set(0,8,0);p.setState('hover');cancelAnimationFrame(p.raf);}
   for(let i=0;i<3;i++){
    if(rag){rag.step(1/60,null);rag.apply(f);}
    else{const speed=frame<40?Math.max(0,(frame-12)/28)*60:frame<60?100:0;f.vel.set(0,0,speed);f.cruiseHeld=frame>=40&&frame<60;f.animT+=1/60;f._animate(1/60);}
   }
   f.obj.updateMatrixWorld(true);const center=f.parts.pelvis.getWorldPosition(new T.Vector3());
   const phase=frame<40?'Hover → cruise':frame<60?'Boost':frame<150?'Ragdoll / floor contact':'Rig recovery';
   document.querySelector('.view-tag').textContent='SCRIPTED RIG REVIEW / THREE-QUARTER';
   document.querySelector('.measurements').textContent=`${phase} · ${(frame/20).toFixed(2)} s`;
   document.querySelector('.viewport-note').textContent='Production Fighter + Ragdoll · scripted velocity · right-hand rifle';
   p.camera.position.copy(center).add(new T.Vector3(19,7,22));p.camera.lookAt(center.clone().add(new T.Vector3(0,1,0)));p.camera.updateMatrixWorld(true);
   p.renderer.render(p.scene,p.camera);
   return {frame,phase:frame<40?'hover-to-cruise':frame<60?'boost':frame<150?'ragdoll':'recovery',pelvis:center.toArray(),sleeping:rag?.asleep||false,
    finite:[...f.parts.rig.limbSurfaces,...f.parts.rig.shoulderSurfaces||[]].every(s=>Array.from(s.mesh.geometry.attributes.position.array).every(Number.isFinite)),armed:f.parts.armR.children[2].userData.gripOccupied};
  };
 });
 const rows=[];
 for(let frame=0;frame<180;frame++){
  rows.push(await page.evaluate(frame=>limbFrame(frame),frame));
  await page.locator('.viewport canvas').first().screenshot({path:`${out}/frame-${String(frame).padStart(4,'0')}.png`});
 }
 await writeFile(`${out}/evidence.json`,JSON.stringify({procedural:true,scriptedVelocity:true,fps:20,frames:180,rows,errors},null,2));
 if(errors.length||rows.some(r=>!r.finite||!r.armed))throw new Error('Motion review failed integrity checks');
 console.log({out,frames:rows.length,errors});
}finally{await browser.close();}
