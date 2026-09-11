// Multi-view review of the real Studio rig, factory weapon, and live beam pose.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2]||'artifacts/flight-review/shoulder-surface/armed';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.evaluate(()=>{const p=STUDIO.preview;p.setProfile({...p.def,build:{...p.def.build,weaponR:'rifle'}},p.profile);cancelAnimationFrame(p.raf);});
 const rows=[];
 for(const state of ['hover','forward','boost','strafeLeft','strafeRight','beam'])for(const view of ['front','left','right','rear']){
  const row=await page.evaluate(async({state,view})=>{
   const T=await import('/node_modules/three/build/three.module.js'),p=STUDIO.preview;
   p.setState(state);p.seek(state==='beam'?3:2);p.setView('orbit');p.controls.enabled=false;
   const center=p.fighter.parts.torso.getWorldPosition(new T.Vector3());
   const offset={front:[0,1,20],left:[-20,1,0],right:[20,1,0],rear:[0,1,-20]}[view];
   p.camera.position.copy(center).add(new T.Vector3(...offset));p.camera.lookAt(center);p.camera.updateMatrixWorld(true);
   document.querySelector('.view-tag').textContent=`PROCEDURAL / ${state} / ${view}`;
   document.querySelector('.measurements').textContent='KANO · factory rifle variant · final production pose';
   p.renderer.render(p.scene,p.camera);
   return {state,view,armed:p.fighter.parts.armR.children[2].userData.gripOccupied,shoulders:p.fighter.parts.rig.shoulderSurfaces.length,calls:p.renderer.info.render.calls};
  },{state,view});rows.push(row);
  await page.locator('.viewport canvas').first().screenshot({path:`${out}/${state}-${view}.png`});
 }
 await writeFile(`${out}/evidence.json`,JSON.stringify({rows,errors},null,2));
 if(errors.length||rows.some(r=>!r.armed||r.shoulders!==2))throw new Error('Shoulder review integrity failed');console.log({views:rows.length,errors});
}finally{await browser.close();}
