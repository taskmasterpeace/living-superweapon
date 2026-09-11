// Real figure material, rasterized at controlled view angles. Catches a hard
// silhouette (the outlined egg), body-obscuring fill, frozen energy and no aura.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/i.test(m.text()))errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html');await page.waitForFunction(()=>window.STUDIO);
 const rows=await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js');
  const {Fighter}=await import('/src/engine/entity.js'),{ROSTER}=await import('/src/data/characters.js');
  const fighter=new Fighter(ROSTER.find(d=>d.id==='kano'));
  const p=fighter.parts,m=p.aura.material;
  const renderer=new T.WebGLRenderer();renderer.setSize(32,32);
  renderer.outputColorSpace=T.LinearSRGBColorSpace;renderer.toneMapping=T.NoToneMapping;
  const target=new T.WebGLRenderTarget(32,32,{type:T.FloatType}),scene=new T.Scene();
  const camera=new T.OrthographicCamera(-1,1,1,-1,.1,2000);camera.position.z=1000;
  const geometry=new T.PlaneGeometry(2,2),mesh=new T.Mesh(geometry,m);scene.add(mesh);
  scene.background=new T.Color(0);renderer.setRenderTarget(target);
  const pixels=new Float32Array(32*32*4),rows=[];
  try{
   for(const color of ['#34baff','#ffd24a','#ffffff'])for(const facing of [.02,.4,.99])for(const phase of [0,.2,.4,.6]){
    // Exercise the production clock bridge, not a test-written shader uniform.
    fighter.animT=phase;fighter._animate(1/60);m.color.set(color);m.opacity=.5;
    for(let i=0;i<4;i++)geometry.attributes.normal.setXYZ(i,Math.sqrt(1-facing*facing),0,facing);
    geometry.attributes.normal.needsUpdate=true;renderer.render(scene,camera);
    renderer.readRenderTargetPixels(target,0,0,32,32,pixels);
    const signal=[],rgb=[0,0,0];for(let i=0;i<pixels.length;i+=4){signal.push(Math.max(pixels[i],pixels[i+1],pixels[i+2]));for(let c=0;c<3;c++)rgb[c]+=pixels[i+c]/1024;}
    rows.push({color,facing,phase,rgb,mean:signal.reduce((a,b)=>a+b,0)/signal.length,max:Math.max(...signal),signal});
   }
   m.opacity=0;renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,32,32,pixels);
   rows.push({off:true,max:Math.max(...pixels.filter((_,i)=>i%4!==3))});
   for(let i=0;i<4;i++)geometry.attributes.normal.setXYZ(i,Math.sqrt(.84),0,.4);
   geometry.attributes.normal.needsUpdate=true;
   for(const state of ['idle','charge','tier2','tier4']){
    fighter.tier=state==='tier2'?2:state==='tier4'?4:1;
    fighter.slots.lmb.charging=state==='charge';fighter.animT=.2;
    // Real state-driven opacity/color, no material overrides in this block.
    for(let i=0;i<180;i++)fighter._animate(1/60);
    renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,32,32,pixels);
    const rgb=[0,0,0];for(let i=0;i<pixels.length;i+=4)for(let c=0;c<3;c++)rgb[c]+=pixels[i+c]/1024;
    rows.push({state,rgb});
   }
  }finally{
   target.dispose();geometry.dispose();renderer.dispose();
   p.g.traverse(o=>{o.geometry?.dispose();for(const mat of Array.isArray(o.material)?o.material:[o.material])mat?.dispose();});
  }
  return rows;
 });
 const failures=[];
 for(const r of rows){
  if(r.facing===.02&&r.max>.02)failures.push(`Hard outer shell: ${r.color} at ${r.phase}, ${r.max.toFixed(3)}`);
  if(r.facing===.99&&r.max>.01)failures.push('Aura fills the body-facing center');
  if(r.facing===.4&&r.max<.025)failures.push('Energy disappears inside the soft boundary');
  if(r.off&&r.max>.0001)failures.push('Inactive aura still contributes light');
  if(r.facing===.4){
   if(r.color==='#34baff'&&r.rgb[2]<r.rgb[0]*2)failures.push('Blue aura loses its hue');
   if(r.color==='#ffd24a'&&r.rgb[0]<r.rgb[2]*2)failures.push('Gold aura loses its hue');
   if(r.color==='#ffffff'&&Math.max(...r.rgb)-Math.min(...r.rgb)>.001)failures.push('White-hot aura is tinted');
  }
  if(r.state==='idle'&&Math.max(...r.rgb)>.0001)failures.push('Idle fighter retains an active aura');
  if(r.state&&r.state!=='idle'&&Math.max(...r.rgb)<.002)failures.push(`${r.state} fails to activate energy`);
  if(r.state==='tier2'&&r.rgb[0]<r.rgb[2]*2)failures.push('Tier II fails to turn gold');
  if(r.state==='tier4'&&Math.max(...r.rgb)-Math.min(...r.rgb)>.001)failures.push('MAX tier fails to turn white-hot');
 }
 for(const color of ['#34baff','#ffd24a','#ffffff']){
  const r=rows.filter(r=>r.color===color&&r.facing===.4);
  const change=r[0].signal.reduce((sum,v,i)=>sum+Math.abs(v-r[1].signal[i]),0)/r[0].signal.length;
  if(change<.005)failures.push(`Frozen energy for ${color}: ${change}`);
 }
 const out='artifacts/flight-review/aura';await mkdir(out,{recursive:true});
 await writeFile(`${out}/${process.argv.includes('--before')?'before':'after'}.json`,JSON.stringify({rows:rows.map(({signal,...r})=>r),failures,errors},null,2));
 console.log(JSON.stringify({cases:rows.length,failures,errors},null,2));if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
