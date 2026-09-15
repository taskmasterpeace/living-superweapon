import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/__terminal_probe__',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><body style="margin:0"></body>'}));
 await page.goto(`${process.env.HIGHWALL_URL||'http://127.0.0.1:5193'}/__terminal_probe__`);
 const result=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/.vite/deps/three.js');const {HighwallInteractables}=await import('/src/engine/highwall-interactables.js');
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x343d35);const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(1280,800);document.body.append(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xfff6df,0x29342f,2.4));const sun=new THREE.DirectionalLight(0xffeed6,3);sun.position.set(-30,45,35);scene.add(sun);
  const floor=new THREE.Mesh(new THREE.BoxGeometry(90,.7,55),new THREE.MeshStandardMaterial({color:0x555b50,roughness:1}));floor.position.y=-.35;scene.add(floor);
  const landmark=new THREE.Mesh(new THREE.BoxGeometry(8,7,8),new THREE.MeshStandardMaterial({color:0x9c3c32}));landmark.position.set(0,3.5,-20);scene.add(landmark);
  const g={scene,world:{renderer,cover:[],surfaceSight:{uniforms:{wwSightOn:{value:1}}}},entities:[]};
  const devices=new HighwallInteractables(g,{door:{x:100,z:100,hx:4,hz:1,bottom:0,top:10},positions:{monitor:{x:-12,z:0},speaker:{x:0,z:0},screen:{x:12,z:0},cameras:[{x:0,y:12,z:-5,look:{x:0,y:3,z:-20},name:'Diagnostic landmark'},{x:30,y:12,z:-10,look:{x:0,y:3,z:-20},name:'Side'}]}});
  devices.renderFeed();const camera=new THREE.PerspectiveCamera(38,1280/800,.1,500);camera.position.set(26,22,48);camera.lookAt(0,4.8,0);renderer.render(scene,camera);
  window.terminalProbe={devices,g,renderer,camera};
  return {screenMapIsLiveTarget:devices.monitor.face.material.map===devices.target.texture,sightUniformRestored:g.world.surfaceSight.uniforms.wwSightOn.value,screenParentIsHousing:devices.monitorFace.parent===devices.monitor.mesh,terminals:devices.items.filter(i=>['monitor','speaker','screen'].includes(i.id)).map(i=>({id:i.id,base:i.mesh.position.toArray(),dimensions:i.mesh.userData.terminal})),scope:'Isolated terminal render and actual surveillance render target, not native bunker approach or audible approval'};
 });
 assert.equal(result.screenMapIsLiveTarget,true);assert.equal(result.sightUniformRestored,1);assert.equal(result.screenParentIsHousing,true);assert.deepEqual(errors,[]);
 await mkdir('artifacts/highwall/terminal',{recursive:true});await page.screenshot({path:'artifacts/highwall/terminal/terminal-family.png'});await writeFile('artifacts/highwall/terminal/result.json',JSON.stringify({...result,errors},null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
