// Rasterize the production shader against black/white to measure optical density.
// An opaque dark edge would turn the energy back into a solid pipe and must fail.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/i.test(m.text()))errors.push(m.text());});
const out='artifacts/flight-review/beam-radiance';await mkdir(out,{recursive:true});
try {
 await page.goto('http://127.0.0.1:5180/studio.html');await page.waitForFunction(()=>window.STUDIO);
 const rows=await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js'),{shadeBeamSurface}=await import('/src/engine/beam-surface.js');
  const renderer=new T.WebGLRenderer();renderer.setSize(32,32);renderer.outputColorSpace=T.LinearSRGBColorSpace;renderer.toneMapping=T.NoToneMapping;
  const target=new T.WebGLRenderTarget(32,32,{type:T.FloatType}),scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.1,2000);
  camera.position.z=1000;const rows=[],pixel=new Float32Array(4);
  const material=new T.MeshBasicMaterial({transparent:true,opacity:1,depthWrite:false});
  const time=shadeBeamSurface(material,'#34baff'),geometry=new T.PlaneGeometry(2,2);
  geometry.setAttribute('beamArc',new T.Float32BufferAttribute([21,21,21,21],1));
  geometry.setAttribute('beamTangent',new T.Float32BufferAttribute(new Float32Array(12),3));
  const mesh=new T.Mesh(geometry,material);scene.add(mesh);renderer.setRenderTarget(target);
  try {
   for(const axial of [0,.98])for(const facing of [.05,.2,.5,.95])for(const phase of [0,.06,.12,.18]) {
    time.value=phase;
    const transverse=Math.sqrt(1-axial*axial);
    for(let i=0;i<4;i++){
     geometry.attributes.normal.setXYZ(i,Math.sqrt(1-facing*facing),-facing*axial,facing*transverse);
     geometry.attributes.beamTangent.setXYZ(i,0,transverse,axial);
    }
    geometry.attributes.normal.needsUpdate=true;
    geometry.attributes.beamTangent.needsUpdate=true;
    const pixels=[];
    for(const bg of [0x000000,0xffffff]){
     scene.background=new T.Color(bg);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,16,16,1,1,pixel);pixels.push([...pixel]);
    }
    const alpha=1-pixels[1].slice(0,3).reduce((sum,v,i)=>sum+v-pixels[0][i],0)/3;
    rows.push({axial,facing,phase,alpha,black:pixels[0],white:pixels[1]});
   }
  }finally{target.dispose();geometry.dispose();material.dispose();renderer.dispose();}
  return rows;
 });
 const failures=[];
 for(const r of rows){
  if(r.facing<=.2&&r.alpha>.25)failures.push(`Opaque energy edge at facing ${r.facing}: ${r.alpha.toFixed(3)}`);
  if(r.facing===.95&&r.alpha<.7)failures.push('Energy core disappears');
  if(r.facing===.95&&r.axial===0&&Math.max(...r.black.slice(0,3))<=1)failures.push('Side spine has no HDR radiance');
  if(r.facing===.95&&r.axial===.98&&Math.min(...r.black.slice(0,3))>.4)failures.push('Axial spine becomes a white fill over the receiver');
 }
 await writeFile(`${out}/${process.argv.includes('--before')?'before':'after'}.json`,JSON.stringify({rows,failures,errors},null,2));
 console.log(JSON.stringify({cases:rows.length,maxEdgeAlpha:Math.max(...rows.filter(r=>r.facing<=.2).map(r=>r.alpha)),minCoreAlpha:Math.min(...rows.filter(r=>r.facing===.95).map(r=>r.alpha)),failures,errors},null,2));if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
