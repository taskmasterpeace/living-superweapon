// Diagnostic only: isolate production layers in the real HDR/comic pipeline.
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {PNG}=createRequire(import.meta.url)('../node_modules/playwright-core/lib/utilsBundle.js');
const out=process.argv.find((v,i)=>i>1&&!v.startsWith('--'))||'artifacts/flight-review/beam-layer-probe';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const source=await readFile(new URL('../src/engine/beam-surface.js',import.meta.url),'utf8');
const expectedShader=source.match(/vec3 view=[\s\S]+?(?=`\);)/)[0].replaceAll('\r\n','\n');
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(expectedShader=>{
  const {game:g,THREE:T}=LSW;g.update=()=>{};g.startMode('powerworld',{p1:'kano',p2:'vega'});
  const p=g.player,f=g.entities.find(e=>e!==p&&!e.isDummy),w=g.world;g.fov=false;w.setFogEnabled(false);
  for(const e of g.entities){e.ai=null;e.obj.visible=e===p||e===f;}
  for(const e of [p,f]){e.vel.set(0,0,0);e.flying=true;e.gait='airborne';e.animT=0;e._vis=1;}
  p.pos.set(0,140,0);f.pos.set(0,140,100);p.faceDir(0,1);f.faceDir(0,-1);f.hp=f.maxHp=50000;
  p.hasAimWorld=true;f.center(p.aimWorld);p.aim3.copy(p.aimWorld).sub(p.center(new T.Vector3())).normalize();
  const b=g.spawnBeamFor(p,p.slots.lmb.def,2.4);p.slots.lmb.active=b;
  for(let i=0;i<180;i++){
   const dt=1/120;g.time+=dt;p.ki=p.maxKi;p.update(dt,g);f.vel.set(0,0,0);f._animate(dt);b.update(dt,g);g.particles.update(dt);g.vfx.update(dt);
  }
  g.hardLock=f;w.snapChase();for(let i=0;i<120;i++)w.chase(p,f,1/120);
  g.hud.setPlayer(p.def);g.hud.update();g.particles.points.visible=false;
  const callbacks=[b.core,b.glow,b.tip,b.detail].filter(Boolean).map(m=>[m,m.onBeforeRender]);
  window.beamLayer=mode=>{
   for(const [m,callback] of callbacks){m.visible=true;m.onBeforeRender=callback;}
   if(mode==='core-only')for(const m of [b.glow,b.tip,b.detail])if(m)m.visible=false;
   if(mode==='sheath-only')for(const m of [b.core,b.tip,b.detail])if(m)m.visible=false;
   if(mode==='no-axial-fade')for(const [m] of callbacks){m.onBeforeRender=()=>{};m.material.opacity=m.userData.beamOpacity;}
   w.render();
   const program=w.renderer.properties.get(b.core.material).currentProgram;
   const fragment=program?w.renderer.getContext().getShaderSource(program.fragmentShader):'';
   return {mode,cameraFov:w.camera.fov,radius:b.radius,build:b.build,shader:{key:b.core.material.customProgramCacheKey(),fresh:fragment?.replaceAll('\r\n','\n').includes(expectedShader),time:b._surfaceTime?.value},alpha:callbacks.map(([m])=>({name:m===b.core?'core':m===b.glow?'sheath':m===b.tip?'tip':'detail',alpha:m.material.opacity,base:m.userData.beamOpacity,color:m.material.color.getHexString()})),fog:w.scene.fog?.density};
  };
  window.beamEnergyFrame=frame=>{
   b.grp.visible=frame>=0;b._surfaceTime.value=g.time+Math.max(0,frame)/60;w.render();w.camera.updateMatrixWorld(true);
   const point=new T.Vector3().fromArray(b.path,30).project(w.camera);
   return {x:Math.round((point.x+1)*640)-10,y:Math.round((1-point.y)*360)-10,width:20,height:20};
  };
 },expectedShader);
 const rows=[];for(const mode of ['full','core-only','sheath-only','no-axial-fade']){
  rows.push(await page.evaluate(mode=>beamLayer(mode),mode));await page.screenshot({path:`${out}/${mode}.png`});
 }
 const flow=[];await page.evaluate(()=>beamLayer('full'));
 const crop=await page.evaluate(()=>beamEnergyFrame(-1)),background=PNG.sync.read(await page.screenshot({clip:crop})).data;
 for(let frame=0;frame<24;frame++){
  await page.evaluate(frame=>beamEnergyFrame(frame),frame);
  const pixels=PNG.sync.read(await page.screenshot({clip:crop})).data;let vivid=0,maxChroma=0,maxContrast=0;
  for(let i=0;i<pixels.length;i+=4){
   const rgb=[pixels[i],pixels[i+1],pixels[i+2]],chroma=Math.max(...rgb)-Math.min(...rgb);
   const contrast=rgb.reduce((sum,v,c)=>sum+Math.abs(v-background[i+c]),0);
   maxChroma=Math.max(maxChroma,chroma);maxContrast=Math.max(maxContrast,contrast);
   if(chroma>65&&contrast>60)vivid++;
  }
  flow.push({frame,vividFraction:vivid/400,maxChroma,maxContrast});
 }
 const peakVividFraction=Math.max(...flow.map(r=>r.vividFraction)),meanVividFraction=flow.reduce((s,r)=>s+r.vividFraction,0)/flow.length;
 const failures=[];
 if(rows.some(r=>!r.shader.fresh))failures.push('Live compiled beam shader does not match workspace source; restart the stale dev server');
 if(process.argv.includes('--check')&&(peakVividFraction<.25||meanVividFraction<.06))failures.push('Rear beam has no sustained, strongly colored energy strands through the production compositor');
 await page.evaluate(()=>beamEnergyFrame(12));await page.screenshot({path:`${out}/flow.png`});
 await writeFile(`${out}/layers.json`,JSON.stringify({rows,crop,flow,peakVividFraction,meanVividFraction,failures,errors},null,2));console.log({rows,crop,peakVividFraction,meanVividFraction,failures,errors});
 if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
