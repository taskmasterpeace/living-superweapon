// A continuous stream's optical body must not disappear between moving strands.
// Exercise the production GPU shader with the actual rear-view material opacity.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const label=process.argv[2]||'current';assert.match(label,/^[a-z0-9-]+$/);
const out=`artifacts/beam-hollow/${label}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html');await page.waitForFunction(()=>window.STUDIO?.preview);
 const rows=await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js'),{shadeBeamSurface}=await import('/src/engine/beam-surface.js');
  const renderer=new T.WebGLRenderer();renderer.setSize(32,32);renderer.outputColorSpace=T.LinearSRGBColorSpace;renderer.toneMapping=T.NoToneMapping;
  const target=new T.WebGLRenderTarget(32,32,{type:T.FloatType}),scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.1,2000);
  camera.position.z=1000;const rows=[],pixel=new Float32Array(4);
  const material=new T.MeshBasicMaterial({transparent:true,opacity:.95*(1-.64),depthWrite:false}),time=shadeBeamSurface(material,'#34baff'),geometry=new T.PlaneGeometry(2,2);
  geometry.setAttribute('beamArc',new T.Float32BufferAttribute([21,21,21,21],1));geometry.setAttribute('beamTangent',new T.Float32BufferAttribute(new Float32Array(12),3));
  const mesh=new T.Mesh(geometry,material);scene.add(mesh);renderer.setRenderTarget(target);
  try{
   for(const facing of [.05,.2,.5,.95])for(let frame=0;frame<48;frame++){
    const axial=.98,transverse=Math.sqrt(1-axial*axial);time.value=frame/60;
    for(let i=0;i<4;i++){geometry.attributes.normal.setXYZ(i,Math.sqrt(1-facing*facing),-facing*axial,facing*transverse);geometry.attributes.beamTangent.setXYZ(i,0,transverse,axial);}
    geometry.attributes.normal.needsUpdate=true;geometry.attributes.beamTangent.needsUpdate=true;
    const pixels=[];for(const bg of [0,0xffffff]){scene.background=new T.Color(bg);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,16,16,1,1,pixel);pixels.push([...pixel]);}
    const alpha=1-pixels[1].slice(0,3).reduce((sum,v,i)=>sum+v-pixels[0][i],0)/3;
    rows.push({facing,frame,alpha,rgb:pixels[0].slice(0,3)});
   }
  }finally{target.dispose();geometry.dispose();material.dispose();renderer.dispose();}
  return rows;
 });
 const failures=[],core=rows.filter(r=>r.facing===.95),edge=rows.filter(r=>r.facing<=.2);
 if(core.some(r=>r.alpha<.7))failures.push('Rear continuous core goes hollow between surface strands');
 if(Math.max(...core.map(r=>r.alpha))-Math.min(...core.map(r=>r.alpha))>.03)failures.push('Surface flow punches temporal holes into unchanged energy volume');
 if(edge.some(r=>r.alpha>.25))failures.push('Filled energy has an opaque pipe-like silhouette');
 if(core.some(r=>Math.min(...r.rgb)>.4))failures.push('Rear core becomes a white fill over the receiver');
 const result={cases:rows.length,minCore:Math.min(...core.map(r=>r.alpha)),maxCore:Math.max(...core.map(r=>r.alpha)),maxEdge:Math.max(...edge.map(r=>r.alpha)),rows,failures,errors};
 await writeFile(`${out}/density.json`,JSON.stringify(result,null,2));console.log({...result,rows:undefined});assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
}finally{await browser.close();}
