// Regression: airborne fighters left the ground-centered shadow frustum,
// and their own geometry never received shadows from arms, hair or clothing.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2]||'artifacts/flight-review/lighting';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],rows=[],failures=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(()=>{const g=LSW.game;g.update=()=>{};g.startMode('powerworld',{p1:'kano',p2:'vega'});g.fov=false;g.world.setFogEnabled(false);g.world.qualityOverride=2;g.world._qTier=2;g.world._applyQuality();});
 for(const altitude of [8,220,450]){
  rows.push(await page.evaluate(altitude=>{
   const {game:g,THREE:T}=LSW,w=g.world,p=g.player,f=g.entities.find(e=>e!==p&&!e.isDummy);
   for(const e of g.entities){e.ai=null;e.obj.visible=e===p||e===f;}
   p.pos.set(0,altitude,0);f.pos.set(0,altitude,40);
   for(const e of [p,f]){e.vel.set(0,0,0);e.flying=true;e.gait='airborne';e.animT=0;e._vis=1;}
   p.faceDir(0,1);f.faceDir(0,-1);w._lookYaw=0;w._lookPitch=0;w.snapChase();g.hardLock=f;
   for(let i=0;i<120;i++){p._animate(1/120);f._animate(1/120);w.chase(p,f,1/120);}
   w.render();g.hud.setPlayer(p.def);g.hud.update();
   let cast=0,receive=0;p.parts.body.traverse(o=>{if(o.isMesh&&o.castShadow){cast++;if(o.receiveShadow)receive++;}});
   const shadow=p.center(new T.Vector3()).project(w.sun.shadow.camera);
   return {altitude,shadow:shadow.toArray(),cast,receive,sun:w.sun.intensity,hemi:w.hemi.intensity,ambient:w.amb.intensity};
  },altitude));await page.screenshot({path:`${out}/flight-${altitude}.png`});
 }
 for(const r of rows){if(r.shadow.some(x=>Math.abs(x)>1))failures.push(`${r.altitude}: fighter outside sun shadow coverage`);if(r.receive!==r.cast)failures.push(`${r.altitude}: body cannot receive self-shadow`);}
 const quality=await page.evaluate(()=>{
  const g=LSW.game,w=g.world,p=g.player,rows=[];
  for(const tier of [0,1,2]){
   w._qTier=tier;w._applyQuality();
   for(const open of [false,true,false]){p._openSky=open;w.chase(p,null,1/60);rows.push({tier,open,shadow:w.sun.castShadow});}
  }return rows;
 });
 for(const r of quality)if(r.shadow!==(r.open&&r.tier>0))failures.push(`Shadow ownership not updated for tier ${r.tier}, open=${r.open}`);
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO);
 const studio=await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js'),p=STUDIO.preview,rows=[];p.playing=false;cancelAnimationFrame(p.raf);
  p.setState('beam');p.seek(3);p.setView('orbit');
  for(const state of ['hover','beam','hover']){
   p.setState(state);p.seek(state==='beam'?3:0);p.renderer.render(p.scene,p.camera);
   rows.push({state,shadow:p.fighter.center(new T.Vector3()).project(p.chase.sun.shadow.camera).toArray()});
  }return rows;
 });
 for(const r of studio)if(r.shadow.some(x=>Math.abs(x)>1))failures.push(`Studio ${r.state} shadow coverage lost after view/state change`);
 await writeFile(`${out}/results.json`,JSON.stringify({rows,quality,studio,failures,errors},null,2));console.log({rows,quality,studio,failures,errors});if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
