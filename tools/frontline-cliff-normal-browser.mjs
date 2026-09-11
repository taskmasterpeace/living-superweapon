// Production cliff normal fragment on real GPU pixels. No JavaScript mirror of
// the implementation and no terrain geometry replacement in this isolated test.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/frontline-cliff-normal-'+(process.env.LSW_NORMAL_VARIANT||'candidate');await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),page=await browser.newPage(),errors=[];let result;
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.route('**/__cliff-normal-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Cliff projected-normal GPU contract</title>'}));
 await page.goto('http://127.0.0.1:5180/__cliff-normal-fixture');
 result=await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js'),surface=await import('/src/engine/frontline-surface.js');
  const texture=v=>{const t=new T.DataTexture(new Float32Array([...v,1]),1,1,T.RGBAFormat,T.FloatType);t.needsUpdate=true;return t;};
  const tilted=texture([.8,.5,.9]),flat=texture([.5,.5,1]),white=texture([1,1,1]);
  const original=new T.MeshStandardMaterial();surface.applySandstoneSurface(original,{albedo:white,normal:tilted,rough:white});
  const compiled={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};original.onBeforeCompile(compiled);
  const actual=compiled.fragmentShader.split('#include <normal_fragment_maps>')[1].split('#include <clearcoat_normal_fragment_begin>')[0];
  const material=new T.ShaderMaterial({uniforms:{vTerrainNormal:{value:new T.Vector3()},uStoneNormal:{value:tilted}},
   vertexShader:'void main(){gl_Position=vec4(position.xy,0,1);}',
   fragmentShader:`uniform vec3 vTerrainNormal;uniform sampler2D uStoneNormal;${surface.GROUND_NORMAL_GLSL||''}
   void main(){vec3 stoneP=vec3(0);vec2 stoneUVX=vec2(0),stoneUVY=vec2(0),stoneUVZ=vec2(0);vec3 stoneN=normalize(vTerrainNormal);vec3 stoneW=pow(abs(stoneN),vec3(4));stoneW/=dot(stoneW,vec3(1));vec3 normal=stoneN;${actual}gl_FragColor=vec4(normal*.5+.5,1);}`});
  const renderer=new T.WebGLRenderer(),target=new T.WebGLRenderTarget(8,8),scene=new T.Scene(),camera=new T.Camera();renderer.setSize(8,8);renderer.setRenderTarget(target);
  const geometry=new T.PlaneGeometry(2,2);scene.add(new T.Mesh(geometry,material));const pixel=new Uint8Array(4),rows=[];
  // Cliff strength remains .75. The decoded (.6,0,.8) becomes (.45,0,.8),
  // normalized to (.490261,.0,.871576). Literal expected vectors follow the
  // six signed UV frames; the final slope uses a hand-derived Rodrigues turn.
  const cases=[
   [[1,0,0],[.871575537,0,-.490261240]],
   [[-1,0,0],[-.871575537,0,.490261240]],
   [[0,1,0],[.490261240,.871575537,0]],
   [[0,-1,0],[.490261240,-.871575537,0]],
   [[0,0,1],[.490261240,0,.871575537]],
   [[0,0,-1],[-.490261240,0,-.871575537]],
   [[.8,.6,0],[.804059534,.448824644,-.389929102]]
  ];
  for(const [base,want]of cases){
   material.uniforms.vTerrainNormal.value.fromArray(base);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,4,4,1,1,pixel);
   const got=Array.from(pixel.slice(0,3),v=>v/255*2-1);rows.push({base,want,got,error:Math.max(...want.map((v,i)=>Math.abs(v-got[i])))});
  }
  material.uniforms.uStoneNormal.value=flat;
  for(const base of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],[.8,.6,0],[-.6,.8,0]]){
   material.uniforms.vTerrainNormal.value.fromArray(base);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,4,4,1,1,pixel);
   const got=Array.from(pixel.slice(0,3),v=>v/255*2-1);rows.push({neutral:true,base,got,error:Math.max(...base.map((v,i)=>Math.abs(v-got[i])))});
  }
  geometry.dispose();material.dispose();original.dispose();tilted.dispose();flat.dispose();white.dispose();target.dispose();renderer.dispose();return rows;
 });
 assert.deepEqual(errors,[]);assert.ok(result.every(r=>r.error<.012),'Cliff signed-normal contract failed: '+JSON.stringify(result.filter(r=>r.error>=.012)));
 console.log(JSON.stringify({cases:result.length,worst:Math.max(...result.map(r=>r.error)),errors}));
}finally{await writeFile(out+'/results.json',JSON.stringify({result,errors},null,2));await browser.close();}
