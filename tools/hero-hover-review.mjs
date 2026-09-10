import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/hero-hover';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1440,height:1000}}}),page=await context.newPage(),errors=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js'),{ROSTER}=await import('/src/data/characters.js'),{profileFromDef,resetFlightStyle}=await import('/src/tool/studio-profile.js');
  const p=STUDIO.preview;cancelAnimationFrame(p.raf);
  window.hoverFixture=(hero,style,bulk)=>{
   const def=ROSTER.find(d=>d.id===hero),profile=resetFlightStyle(profileFromDef(def),style);
   if(bulk!==undefined)profile.frame.bulk=bulk;
   p.setProfile(def,profile);p.setState('hover');p.setView('front');p.controls.enabled=false;
  };
  window.hoverCamera=(angle='front')=>{
   const f=p.fighter,center=f.parts.torso.getWorldPosition(new T.Vector3());center.y-=1.2;
   const offsets={front:[0,1,23],left:[-25,1,0],right:[25,1,0],rear:[0,1,-23],threequarter:[16,2,23]};
   p.camera.fov=38;p.camera.position.copy(center).add(new T.Vector3(...offsets[angle]));p.camera.lookAt(center);p.camera.updateProjectionMatrix();p.camera.updateMatrixWorld(true);p.renderer.render(p.scene,p.camera);
   document.querySelector('.view-tag').textContent=`${f.def.name} / ${f.parts.rig.flightStyle} / ${f._flightPoseState} / ${angle}`;
   document.querySelector('.viewport-note').textContent='Procedural flight targets · production rig / apply order · custom inspection camera';
   document.querySelector('.hero-heading').textContent=`${f.def.name} · scripted ${f.parts.rig.flightStyle} fixture`;
   document.querySelector('.measurements').textContent=`${f._flightPoseState} · ${f.vel.length().toFixed(1)} u/s · ${p.time.toFixed(2)} s · 38°`;
   document.querySelector('#state').value=p.state;document.querySelector('.time').textContent=`${p.time.toFixed(2)} s`;document.querySelector('.timeline').value=p.time;
   document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));
  };
  window.hoverSample=()=>{
   const f=p.fighter;p.fighter.obj.updateMatrixWorld(true);
   return {hero:f.def.id,style:f.parts.rig.flightStyle,bulk:f.def.frame.bulk,state:p.state,time:p.time,source:'Original procedural targets: src/data/flight-tuning.js',root:f.pos.toArray(),
    joints:[f.parts.armL,f.parts.armR,f.parts.legL,f.parts.legR].map(o=>o.quaternion.toArray()),
    hands:[f.parts.armL,f.parts.armR].map(a=>({world:a.children[2].getWorldPosition(new T.Vector3()).toArray(),open:a.children[2].morphTargetInfluences[0],occupied:a.children[2].userData.gripOccupied}))};
  };
 });
 // Scripted profiles do not write the actual Studio draft/inspector. Hide that unrelated
 // sidebar from this diagnostic recording rather than display stale selected-profile values.
 await page.evaluate(()=>{document.querySelector('.inspector').style.visibility='hidden';document.querySelector('.library').style.visibility='hidden';});
 for(const [hero,style,bulk] of [['sol','hero'],['majesty','twin'],['kano','martial'],['titan','thruster'],['stormcall','hammer'],['vanguard','glider'],['stormcall','hero'],['gale','hero'],['gale','hero',1.65]]){
  const key=`${hero}-${style}${bulk?'-bulk-'+bulk:''}`;
  await page.evaluate(([h,s,b])=>hoverFixture(h,s,b),[hero,style,bulk]);
  for(const time of [0,2,4,6,7.983333333,8]){
   rows.push(await page.evaluate(t=>{STUDIO.preview.seek(t);hoverCamera('threequarter');return hoverSample();},time));
   await page.locator('.viewport').screenshot({path:`${out}/${key}-${time.toFixed(2)}.png`});
  }
  for(const angle of ['front','left','right','rear']){
   await page.evaluate(a=>{STUDIO.preview.seek(1);hoverCamera(a);},angle);
   await page.locator('.viewport').screenshot({path:`${out}/${key}-${angle}.png`});
  }
 }
 await page.evaluate(()=>hoverFixture('sol','hero'));
 await page.getByRole('button',{name:'Game camera',exact:true}).click();
 await page.evaluate(()=>STUDIO.preview.seek(1));await page.locator('.viewport').screenshot({path:`${out}/sol-game-camera.png`});
 await page.evaluate(async()=>{
  const p=STUDIO.preview;p.setState('cycle');p.setView('front');p.seek(0);
  // Two complete production cycles, including both wraps. Playback is not a still-frame pose override.
  for(let i=0;i<960;i++){p.time=(i/60)%8;p.step(1/60,false,false);hoverCamera(i<480?'threequarter':'right');await new Promise(requestAnimationFrame);}
 });
 for(const hero of ['stormcall','gale'])await page.evaluate(async(hero)=>{
  hoverFixture(hero,'hero',hero==='gale'?1.65:undefined);const p=STUDIO.preview;p.setState('cycle');p.seek(0);
  for(let i=0;i<480;i++){p.time=i/60;p.step(1/60,false,false);hoverCamera('left');await new Promise(requestAnimationFrame);}
 },hero);
 assert.ok(rows.every(r=>r.joints.flat().every(Number.isFinite)));
 for(const row of rows.filter(r=>['stormcall','gale'].includes(r.hero)))for(const hand of row.hands)if(hand.occupied)assert.ok(hand.open<.01);
 assert.deepEqual(errors,[]);await writeFile(`${out}/results.json`,JSON.stringify({rows,errors},null,2));
 console.log(`PASS ${rows.length} procedural samples, 36 inspection angles, calibrated Game camera, two hero cycles and two armed moving cycles`);
}finally{await context.close();await page.video()?.saveAs(`${out}/motion.webm`);await browser.close();}
