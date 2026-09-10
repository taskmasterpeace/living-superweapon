// Executes the actual material's normal fragment, not a JavaScript math mirror.
import {chromium} from 'playwright';import {mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const out='artifacts/frontline-ground-normal-'+(process.env.LSW_NORMAL_VARIANT||'candidate');await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),page=await browser.newPage(),errors=[];let result;
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.route('**/__normal-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Ground normal GPU contract</title>'}));await page.goto('http://127.0.0.1:5180/__normal-fixture');
 result=await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js'),surface=await import('/src/engine/frontline-surface.js');
  const texture=value=>{const t=new T.DataTexture(new Float32Array([...value,1]),1,1,T.RGBAFormat,T.FloatType);t.needsUpdate=true;return t;};
  const stone=texture([.8,.5,.9]),flat=texture([.5,.5,1]),white=texture([1,1,1]);
  const original=new T.MeshStandardMaterial();surface.applyGroundSurface(original,{albedo:white,normal:flat,stone:{albedo:white,normal:stone,rough:white,pbr:white},geology:white});
  const compiled={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};original.onBeforeCompile(compiled);
  const fragment=compiled.fragmentShader.split('#include <normal_fragment_maps>')[1].split('#include <clearcoat_normal_fragment_begin>')[0];
  const renderer=new T.WebGLRenderer(),target=new T.WebGLRenderTarget(8,8),scene=new T.Scene(),camera=new T.Camera();renderer.setSize(8,8);renderer.setRenderTarget(target);
  const material=new T.ShaderMaterial({uniforms:{vTerrainNormal:{value:new T.Vector3()},uGroundStoneNormal:{value:stone},uGravelNormal:{value:flat}},
   vertexShader:'void main(){gl_Position=vec4(position.xy,0.0,1.0);}',
   fragmentShader:`uniform vec3 vTerrainNormal;uniform sampler2D uGroundStoneNormal;uniform sampler2D uGravelNormal;${surface.GROUND_NORMAL_GLSL||''}
    void main(){vec2 groundP=vec2(0.0);vec3 groundStoneP=vec3(0.0);vec2 stoneUVX=vec2(0.0),stoneUVY=vec2(0.0),stoneUVZ=vec2(0.0);vec3 groundBaseN=normalize(vTerrainNormal);vec3 groundStoneW=pow(abs(groundBaseN),vec3(4.0));groundStoneW/=dot(groundStoneW,vec3(1.0));float exposedRock=1.0,gravelPatch=0.0;vec3 normal=groundBaseN;${fragment}gl_FragColor=vec4(normal*.5+.5,1.0);}`});
  scene.add(new T.Mesh(new T.PlaneGeometry(2,2),material));const pixel=new Uint8Array(4),rows=[];
  // Last expected vector is hand-derived: rotate X's (.8,0,-.6) by36.87°,
  // rotate Y's (.6,.8,0) by−53.13°, then blend with .8^4/.6^4 weights.
  const cases=[[[1,0,0],[.8,0,-.6]],[[-1,0,0],[-.8,0,.6]],[[0,1,0],[.6,.8,0]],[[0,-1,0],[.6,-.8,0]],[[0,0,1],[.6,0,.8]],[[0,0,-1],[-.6,0,-.8]],[[.8,.6,0],[.77957493,.39125211,-.48906514]]];
  for(const [base,want] of cases){material.uniforms.vTerrainNormal.value.fromArray(base);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,4,4,1,1,pixel);const got=Array.from(pixel.slice(0,3),v=>v/255*2-1);rows.push({base,want,got,error:Math.max(...want.map((v,i)=>Math.abs(v-got[i])))});}
  material.uniforms.uGroundStoneNormal.value=flat;
  for(const base of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],[.8,.6,0],[-.6,.8,0]]){material.uniforms.vTerrainNormal.value.fromArray(base);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,4,4,1,1,pixel);const got=Array.from(pixel.slice(0,3),v=>v/255*2-1);rows.push({neutral:true,base,got,error:Math.max(...base.map((v,i)=>Math.abs(v-got[i])))});}
  renderer.dispose();target.dispose();return rows;
 });
 assert.deepEqual(errors,[]);assert.ok(result.every(r=>r.error<.012),'Signed projection or neutral-normal contract failed: '+JSON.stringify(result.filter(r=>r.error>=.012)));
 console.log(JSON.stringify({cases:result.length,worst:Math.max(...result.map(r=>r.error)),errors}));
}finally{await writeFile(out+'/results.json',JSON.stringify({result,errors},null,2));await browser.close();}
