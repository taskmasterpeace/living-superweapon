// Production KANO charge/stream against a moving Studio target. This is a
// silent authoring inspection, not a gameplay-camera or frame-rate benchmark.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const out='artifacts/beam-bend/kano-final';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1440,height:1000}}});
const page=await context.newPage(),errors=[],rows=[];page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
 await page.getByLabel('Fighter motion',{exact:true}).selectOption('air-right');
 await page.evaluate(()=>{
  const p=STUDIO.preview;p.playing=false;p.controls.enabled=false;p.view='front';
  Object.assign(p.combat,{motion:'orbit-left',targetSpeed:50,distance:32,elevation:15});p.seek(0);
  window.bendStep=frame=>{
   p.time=frame/60;p.step(1/60,false,false);
   const f=p.fighter,b=p.combat.game.projectiles.list.find(shot=>shot._curve);
   p.camera.position.set(f.pos.x+42,f.pos.y+26,52);p.camera.lookAt(f.pos.x+8,f.pos.y+8,22);p.camera.fov=45;p.camera.updateProjectionMatrix();
   document.querySelector('.view-tag').textContent='KANO / NATIVE WAVE CANNON / MOVING AIRBORNE TARGET';
   document.querySelector('.viewport-note').textContent='Production charge, pose and traveling stream. Silent Studio inspection; not gameplay camera or FPS evidence.';
   document.querySelector('.measurements').textContent=`${p.time.toFixed(2)}s / ${p.combat.phase} / ${p.combat.damage.toFixed(1)} measured damage`;
   p.renderer.render(p.scene,p.camera);
   return {frame,time:p.time,phase:p.combat.phase,damage:p.combat.damage,liveRings:b?b._curve.count:0,reservedRings:b?b._curve.capacity:0,triangles:b?b._coreGeo.drawRange.count/3:0,radius:b?.radius??0};
  };
 });
 for(const [start,end,label]of [[1,120,'charge-release'],[120,180,'turn'],[180,240,'wide-turn'],[240,280,'late-turn'],[280,321,'released']]){
  rows.push(...await page.evaluate(async({start,end})=>{const result=[];for(let frame=start;frame<end;frame++){result.push(bendStep(frame));await new Promise(requestAnimationFrame);}return result;},{start,end}));
  await page.locator('.viewport').screenshot({path:`${out}/${label}.png`});
 }
 assert.deepEqual(errors,[]);assert.ok(rows.filter(row=>row.liveRings>1).length>90,'native beam did not sustain');assert.ok(rows.some(row=>row.damage>0),'native beam never contacted the real measurement target');
 console.log(JSON.stringify({frames:rows.length,maxLiveRings:Math.max(...rows.map(r=>r.liveRings)),maxRadius:Math.max(...rows.map(r=>r.radius)),damage:rows.at(-1).damage,errors}));
}finally{await writeFile(`${out}/results.json`,JSON.stringify({rows,errors},null,2));await context.close();await page.video()?.saveAs(`${out}/beam-bend.webm`);await browser.close();}
