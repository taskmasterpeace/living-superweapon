// Energy must have moving, directional surface structure rather than only
// uniform rings. Exercise the shared GPU material, not a JS copy of its shader.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/flight-review/beam-filaments',tag=process.argv.includes('--camera-fixed')?'camera-fixed':process.argv.includes('--static-filaments')?'static-filaments':process.argv.includes('--before')?'before':'after';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html');await page.waitForFunction(()=>window.STUDIO);
 const checks=await page.evaluate(async({cameraFixed,staticFilaments})=>{
  const T=await import('/node_modules/three/build/three.module.js'),{shadeBeamSurface}=await import('/src/engine/beam-surface.js');
  const renderer=new T.WebGLRenderer();renderer.setSize(32,32);renderer.outputColorSpace=T.LinearSRGBColorSpace;renderer.toneMapping=T.NoToneMapping;
  const target=new T.WebGLRenderTarget(32,32,{type:T.FloatType}),scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.1,2000),pixels=new Float32Array(4),rows=[];
  camera.position.z=1000;scene.background=new T.Color(0);renderer.setRenderTarget(target);
  const material=new T.MeshBasicMaterial({transparent:true,opacity:1,depthWrite:false}),time=shadeBeamSurface(material,'#34baff'),geometry=new T.PlaneGeometry(2,2);
  // Counterfactuals prove the checks reject camera-fixed or frozen strands.
  const compile=material.onBeforeCompile;
  material.onBeforeCompile=shader=>{compile(shader);
   if(cameraFixed)shader.vertexShader=shader.vertexShader.replace('inverseTransformDirection(vBeamNormal,viewMatrix)','vBeamNormal');
   if(staticFilaments)shader.fragmentShader=shader.fragmentShader.replace('-beamTime*29.0','-0.0');
  };
  geometry.setAttribute('beamArc',new T.Float32BufferAttribute([21,21,21,21],1));geometry.setAttribute('beamTangent',new T.Float32BufferAttribute([0,1,0,0,1,0,0,1,0,0,1,0],3));
  const mesh=new T.Mesh(geometry,material);scene.add(mesh);
  const rollDifferences=[],flowDifferences=[];
  const sample=(sign,t,roll=0)=>{
   time.value=t;camera.rotation.z=roll;
   for(let i=0;i<4;i++)geometry.attributes.normal.setXYZ(i,sign*Math.sqrt(.75),0,.5);geometry.attributes.normal.needsUpdate=true;
   renderer.render(scene,camera);renderer.readRenderTargetPixels(target,16,16,1,1,pixels);return [...pixels];
  };
  const difference=(a,b)=>Math.max(...a.slice(0,3).map((v,i)=>Math.abs(v-b[i])));
  try{
   for(let frame=0;frame<24;frame++){
    const t=frame/60,pair=[];
    for(const sign of [-1,1]){
     const base=sample(sign,t);pair.push(base);
     for(const roll of [.7,1.8,3.1])rollDifferences.push(difference(base,sample(sign,t,roll)));
     // Repeat the old 26 rad/s ring phase exactly; only strand flow can differ.
     flowDifferences.push(difference(base,sample(sign,t+2*Math.PI/26)));
    }rows.push({time:t,pair,difference:difference(pair[0],pair[1])});
   }
  }finally{geometry.dispose();material.dispose();target.dispose();renderer.dispose();}
  return {rows,rollDifferences,flowDifferences};
 },{cameraFixed:process.argv.includes('--camera-fixed'),staticFilaments:process.argv.includes('--static-filaments')});
 const {rows,rollDifferences,flowDifferences}=checks;
 const differences=rows.map(r=>r.difference),failures=[];
 if(Math.max(...differences)<.12)failures.push('Opposite surface lanes still render as identical uniform bands');
 if(differences.filter(v=>v>.08).length<6)failures.push('Directional structure is absent through most of the flow cycle');
 if(rows.some(r=>r.pair.flat().some(v=>!Number.isFinite(v))))failures.push('Non-finite GPU output');
 if(rollDifferences.some(v=>!Number.isFinite(v)||v>.003))failures.push('Camera roll rotates the energy field');
 if(flowDifferences.some(v=>!Number.isFinite(v))||Math.max(...flowDifferences)<.08)failures.push('Strands do not advance independently of uniform rings');
 const result={...checks,failures,errors};await writeFile(`${out}/${tag}.json`,JSON.stringify(result,null,2));console.log({frames:rows.length,maxDifference:Math.max(...differences),structuredFrames:differences.filter(v=>v>.08).length,maxRollDifference:Math.max(...rollDifferences),maxFlowDifference:Math.max(...flowDifferences),failures,errors});if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
