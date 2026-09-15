import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/highwall/surface-sight';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5193/');
 const result=await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js');
  const {SurfaceSight}=await import('/src/engine/surface-sight.js');
  const renderer=new T.WebGLRenderer();renderer.setSize(128,128);document.body.replaceChildren(renderer.domElement);
  const state={enabled:true,range:96,cos:Math.cos(.96),player:{alive:true,pos:new T.Vector3(0,0,-10),aim3:new T.Vector3(0,0,1)}};
  const sight=new SurfaceSight({renderer},()=>state),scene=new T.Scene();
  const panel=new T.Mesh(new T.PlaneGeometry(4,4),new T.MeshBasicMaterial({color:0xff8000,side:T.DoubleSide}));
  panel.position.set(0,5,10);scene.add(panel);sight.attach(panel);
  const camera=new T.PerspectiveCamera(50,1,.1,100);camera.position.set(0,5,20);camera.lookAt(panel.position);
  const target=new T.WebGLRenderTarget(128,128),pixel=new Uint8Array(4);
  const sample=()=>{sight.render();renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,64,64,1,1,pixel);renderer.setRenderTarget(null);renderer.render(scene,camera);return [...pixel];};
  const wall={x:0,z:0,hx:4,hz:1,bottom:0,top:10};
  sight.replace([wall]);const blocked=sample();
  sight.replace([{...wall,x:20}]);const opening=sample();
  sight.replace([wall]);state.player.pos.y=15;panel.position.y=20;camera.position.y=20;camera.lookAt(panel.position);const above=sample();
  state.player.pos.y=0;panel.position.y=5;camera.position.set(10,10,20);camera.lookAt(panel.position);const orbit=sample();
  // Finite elevated geometry must leave the passage below it open.
  sight.replace([{...wall,bottom:12,top:14}]);const belowRoof=sample();
  state.player.aim3.set(0,0,-1);const behind=sample();
  state.enabled=false;const disabled=sample();
  state.enabled=true;state.range=10000;state.player.aim3.set(0,0,1);state.player.pos.set(0,0,0);
  panel.position.set(0,5,900);camera.position.set(0,5,920);camera.lookAt(panel.position);
  sight.replace([]);const distantClear=sample();sight.replace([{...wall,z:400}]);const distantBlocked=sample();
  const counts={solids:sight.boxes.count,drawCalls:renderer.info.render.calls};
  sight.dispose();target.dispose();panel.geometry.dispose();panel.material.dispose();renderer.dispose();
  return {blocked,opening,above,orbit,belowRoof,behind,disabled,distantClear,distantBlocked,counts};
 });
 for(const key of ['blocked','orbit','behind','distantBlocked'])assert.ok(result[key][0]<20,`${key}: ${result[key]}`);
 for(const key of ['opening','above','belowRoof','disabled','distantClear'])assert.ok(result[key][0]>200,`${key}: ${result[key]}`);
 assert.deepEqual(errors,[]);result.errors=errors;await writeFile(out+'/gpu.json',JSON.stringify(result,null,2));console.log(result);
}finally{await browser.close();}
