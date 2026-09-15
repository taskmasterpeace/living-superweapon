import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:5193',out='artifacts/beam-material-families';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),page=await browser.newPage({viewport:{width:1440,height:900}});
const result={kind:'Native renderer/BeamHose isolated visual fixture after application boot; not a gameplay acceptance test',errors:[],rows:[]};
page.on('pageerror',e=>result.errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/i.test(m.text()))result.errors.push(m.text());});
try{
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.PW?.game,{},{timeout:60000});
 await page.evaluate(()=>{const g=PW.game;g.update=()=>{};g.world.setCameraMode('chase');for(const f of g.entities)f.obj.visible=false;for(const node of document.body.children)if(node.tagName!=='CANVAS'&&node.tagName!=='SCRIPT')node.style.display='none';});
 for(const id of ['torch','kano','rime','sol']){
  const row=await page.evaluate(async id=>{
   const {ROSTER}=await import('/src/data/characters.js');const T=PW.THREE,g=PW.game;
   for(const p of g.projectiles.list)p._dispose?.(g);g.projectiles.list=[];
   if(g._materialReviewActor){g._materialReviewActor.obj.removeFromParent();g._materialReviewActor.dispose();}
   const f=g.addFighter(structuredClone(ROSTER.find(d=>d.id===id)),{team:0,x:0,z:0});g._materialReviewActor=f;
   f._openSky=true;f.pos.set(0,1000,0);f.ai=null;f.energyInfinite=true;f.flying=true;f.gait='airborne';f.aim3.set(0,0,1);f.aim.set(0,0,1);f.hasAimWorld=false;
   g.entities=[f];g.player=f;g.time=0;
   for(let i=0;i<60;i++){f.advanceActionPose(1/60);f._animate(1/60);}
   const entry=Object.entries(f.slots).find(([,s])=>s.def.type==='beam');if(!entry)throw Error('No beam '+id);
   const beam=g.spawnBeamFor(f,entry[1].def);entry[1].active=beam;
   for(let i=0;i<120;i++){g.time+=1/60;f.advanceActionPose(1/60);f._animate(1/60);g.projectiles.update(1/60,g);g.particles.update(1/60);}
   g.world.camera.fov=58;g.world.camera.updateProjectionMatrix();g.world.camera.position.set(100,1022,60);g.world.camera.lookAt(new T.Vector3(0,1008,60));g.world.render();
   return {id,name:entry[1].def.name,family:beam.visualFamily,core:beam.core.material.customProgramCacheKey(),tip:beam.tipDist,nodes:beam.pn,finite:[...beam.path,...beam.core.geometry.attributes.position.array].every(Number.isFinite)};
  },id);result.rows.push(row);
  await page.screenshot({path:`${out}/${id}.png`});
 }
 const cone=await page.evaluate(async()=>{
  const {TYPES}=await import('/src/engine/abilities.js'),{ROSTER}=await import('/src/data/characters.js'),g=PW.game,T=PW.THREE;
  for(const p of g.projectiles.list)p._dispose?.(g);g.projectiles.list=[];
  const old=g._materialReviewActor;old.obj.removeFromParent();old.dispose();
  const f=g.addFighter(structuredClone(ROSTER.find(d=>d.id==='torch')),{team:0,x:0,z:0});
  g.entities=[f];g.player=f;f.pos.set(0,1000,0);f._openSky=true;f.ai=null;f._game=g;f.aim3.set(0,0,1);f.aim.set(0,0,1);f.flying=true;f.gait='airborne';
  const slot=f.slots.rmb;
  for(let i=0;i<120;i++){f.ki=f.maxKi;g.time+=1/60;f.advanceActionPose(1/60);f._animate(1/60);TYPES.cone(f,slot.def,slot,g,{held:true,dt:1/60});g.particles.update(1/60);}
  g.world.camera.position.set(36,1017,15);g.world.camera.lookAt(new T.Vector3(0,1007,14));g.world.render();
  return {id:'torch-cone',name:slot.def.name,flameParticles:Array.from(g.particles.shape.slice(0,g.particles.n)).filter((n,i)=>n===1&&g.particles.life[i]>0).length,finite:g.particles.pos.every(Number.isFinite)};
 });result.rows.push(cone);await page.screenshot({path:`${out}/torch-cone.png`});
}catch(e){result.error=String(e);}finally{await writeFile(`${out}/result.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();}
if(result.error||result.errors.length||result.rows.some(r=>!r.finite))process.exitCode=1;
