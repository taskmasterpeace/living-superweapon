// War World soldier firearm review (Mac asset lab) — reproducible close-view captures
// of the ACTUAL runtime soldier holding, aiming, firing and reloading his service rifle,
// across costume modules on the same rig. Native-code rehearsal in Character Studio,
// not mouse-driven gameplay acceptance.
// Usage: PW_URL=http://127.0.0.1:5180 node tools/warworld-soldier-review.mjs [--hero=sarge]
//        [--view=front|left|right|rear|overview] [--costumes=tactical,plated,fitted] [--out=DIR]
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const args=process.argv.slice(2);
const hero=args.find(a=>a.startsWith('--hero='))?.split('=')[1]||'sarge';
const view=args.find(a=>a.startsWith('--view='))?.split('=')[1]||'front';
const costumes=(args.find(a=>a.startsWith('--costumes='))?.split('=')[1]||'tactical').split(',');
const out=args.find(a=>a.startsWith('--out='))?.slice(6)||`artifacts/asset-lab/soldier-rifle-review/${view}`;
const url=process.env.PW_URL||'http://127.0.0.1:5180';
const views={overview:[10,8,12],front:[0,5.5,10.5],left:[-10.5,5.5,0],right:[10.5,5.5,0],rear:[0,5.5,-10.5],closefront:[0,5,6.5],closeright:[6.5,5,0]};
if(!views[view])throw new Error('Unknown view: '+view);
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto(`${url}/studio.html?hero=${encodeURIComponent(hero)}`);
await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
await page.evaluate(async()=>{
 const v=STUDIO.preview;v.playing=false;cancelAnimationFrame(v.raf);v.controls.enabled=false;v.controls.update=()=>{};
 window.requestAnimationFrame=()=>0; // capture owns rendering; the studio loop must not repaint with its own camera
 const {TYPES}=await import('/src/engine/abilities.js');
 const f=v.fighter;f._openSky=true;f.aim.set(0,0,1);f.aim3.copy(f.aim);f.flying=false;f.gait='grounded';f.pos.set(0,0,0);f.vel.set(0,0,0);
 for(let i=0;i<120;i++)f._animate(1/60);
 window.review={v,f,TYPES,results:[]};
 review.measure=()=>{ // frame from the ACTUAL rendered body height (preview world scale is not 1:1)
  f.pos.set(0,0,0);f.obj.position.set(0,0,0);f.obj.updateMatrixWorld(true);
  const V=f.pos.constructor;let minY=1e9,maxY=-1e9;
  f.obj.traverse(o=>{if(!o.isMesh)return;o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;
   for(const c of [[b.min.x,b.min.y,b.min.z],[b.max.x,b.max.y,b.max.z]]){const w=new V(...c).applyMatrix4(o.matrixWorld);minY=Math.min(minY,w.y);maxY=Math.max(maxY,w.y);}});
  const H=maxY-minY;review.frame={H,lookY:minY+H*.55,dist:H*1.05,camY:minY+H*.62};return review.frame;};
 review.measure();
});
const phases=[{name:'ready',frames:30,press:[]},{name:'aim',frames:40,press:[]},{name:'fire',frames:50,press:[5,20,35]},{name:'recover',frames:40,press:[]}];
for(const costume of costumes){
 const applied=await page.evaluate(async costume=>{
  const {v,f}=review;
  const select=document.querySelector('select');
  const costumeSelect=[...document.querySelectorAll('select')].find(s=>[...s.options].some(o=>o.value===costume));
  if(costumeSelect){costumeSelect.value=costume;costumeSelect.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,300));v.playing=false;cancelAnimationFrame(v.raf);review.measure();return "ui:"+costume;}
  return 'no-costume-select';
 },costume).catch(e=>'costume-error:'+e.message);
 let frame=0;
 for(const phase of phases){
  for(let i=0;i<phase.frames;i++){
   const sample=await page.evaluate(({i,phase,cameraOffset})=>{
    const {v,f,TYPES}=review,st=f.slots.lmb;
    f.flying=false;f.gait='grounded';f.pos.set(0,0,0);f.vel.set(0,0,0);
    f.aim.set(0,.05,1).normalize();f.aim3.copy(f.aim);
    const input={dt:1/60};
    if(phase.name==='aim'){input.held=true;st.cd=1;}
    else if(phase.name==='fire'){input.held=true;if(i===0)st.cd=0;}
    let fireError=null;
    try{if((phase.name==='aim'||phase.name==='fire')&&TYPES[st.def.type])TYPES[st.def.type](f,st.def,st,v.combat.game,input);}catch(e){fireError=e.message;}
    f.update(1/60,v.combat.game);
    f.pos.set(0,0,0);f.obj.position.set(0,0,0);f.obj.updateMatrixWorld(true);
    const {lookY,dist,camY}=review.frame,[dx,,dz]=cameraOffset,len=Math.hypot(dx,dz)||1;
    v.camera.position.set(dx/len*dist,camY,dz/len*dist);v.camera.lookAt(0,lookY,0);v.renderer.render(v.scene,v.camera);
    return {phase:phase.name,i,ammo:st.ammo?.loaded??st.def.magazine,state:f.state,fireError};
   },{i,phase:{name:phase.name,press:phase.press},cameraOffset:views[view]}).catch(e=>({error:e.message}));
   if(sample.error){await writeFile(`${out}/error.json`,JSON.stringify({sample,errors},null,2));console.error('SAMPLE ERROR',sample.error);process.exit(1);}
   const key=[[10,'early'],[phase.frames-5,'late']].find(([n])=>i===n);
   if(key){await page.screenshot({path:`${out}/${costume}-${phase.name}-${key[1]}.png`});await page.evaluate(s=>review.results.push(s),{...sample,costume,applied});}
   frame++;
  }
 }
}
await writeFile(`${out}/results.json`,JSON.stringify({url,hero,view,costumes,results:await page.evaluate(()=>review.results),pageErrors:errors},null,2));
await browser.close();
console.log('CAPTURED',out,'errors:',errors.length);
